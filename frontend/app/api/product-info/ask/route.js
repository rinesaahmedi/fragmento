import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";
import { getKitchenContractForAccess } from "../../../../lib/kitchen-contracts";
import { getProductInfoDocuments } from "../../../../components/kitchen-selection-utils";

const LANGUAGE_LABELS = {
  de: "German",
  en: "English",
};

const NOT_FOUND_ANSWER_BY_LANGUAGE = {
  de: "Diese Information konnte ich in der Produktinformation nicht finden.",
  en: "I could not find that information in the product documentation.",
};

const NO_INFO_ANSWER_BY_LANGUAGE = {
  de: "Für dieses Produkt ist noch keine Produktinformation verfügbar.",
  en: "No product information is available for this product yet.",
};

const TIMEOUT_ERROR_BY_LANGUAGE = {
  de: "Die Anfrage dauert zu lange. Bitte versuchen Sie es erneut.",
  en: "The request is taking too long. Please try again.",
};

const UNAVAILABLE_ERROR_BY_LANGUAGE = {
  de: "Der Produktassistent ist vorübergehend nicht verfügbar.",
  en: "The product assistant is temporarily unavailable.",
};

const FAILED_ERROR_BY_LANGUAGE = {
  de: "Die Produktfrage konnte nicht beantwortet werden.",
  en: "The product question could not be answered.",
};

const BUSINESS_POLICY = {
  warranty: {
    de: "5 Jahre",
    en: "5-year",
  },
};
const WARRANTY_QUESTION_PATTERN = /\b(warranty|warranties|guarantee|guarantees|garantie|garantien)\b/i;
const ENERGY_QUESTION_PATTERN = /\b(e[\s-]?label|energy label|energielabel|energieklasse|energy\s+(?:efficiency\s+)?(?:class(?:es)?|klasse)|energy\s+klasse|energie\s+class)\b/i;

const MAX_QUESTION_LENGTH = 500;
const MAX_ITEM_IDS = 10;
const MAX_CONVERSATION_MESSAGES = 6;
const MAX_CONVERSATION_MESSAGE_LENGTH = 900;
const MAX_CONTEXT_CHARS = 12000;
const OPENAI_TIMEOUT_MS = 20000;

function jsonError(message, status) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeItemIds(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_ITEM_IDS);
}

function normalizeFacts(value) {
  if (!Array.isArray(value)) return [];
  return value.map((fact) => String(fact || "").trim()).filter(Boolean);
}

function normalizeConversationMessages(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_CONVERSATION_MESSAGES)
    .map((message) => {
      const role = String(message?.role || "").trim().toLowerCase() === "user" ? "user" : "assistant";
      const text = String(message?.text || "")
        .trim()
        .slice(0, MAX_CONVERSATION_MESSAGE_LENGTH);
      return { role, text };
    })
    .filter((message) => message.text);
}

function buildConversationContext(messages) {
  return messages
    .map((message) => `${message.role === "user" ? "Customer" : "Assistant"}: ${message.text}`)
    .join("\n");
}

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "de" ? "de" : "en";
}

function normalizeRequiredString(value) {
  return String(value || "").trim();
}

function routeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizePublicProductBrand(value) {
  return String(value || "")
    .replace(/\bArchitecto\s*\/\s*AMICA\b/gi, "Architecto")
    .replace(/\bAMICA\b/gi, "Architecto");
}

function sanitizeProductContextName(value) {
  return String(value || "")
    .replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)?\s*mm\s*\)\s*$/i, "")
    .trim();
}

function truncateProductContextText(value, maxLength) {
  const text = String(value || "").trim();
  if (!text || text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(0, maxLength)).trim()}\n[PDF text shortened]`;
}

function buildProductContext(items) {
  const usableItems = Array.isArray(items) ? items : [];
  const perItemTextLimit = usableItems.length > 1
    ? Math.max(900, Math.floor(MAX_CONTEXT_CHARS / usableItems.length) - 650)
    : MAX_CONTEXT_CHARS;

  const context = usableItems
    .map((item, index) => {
      const facts = normalizeFacts(item.productInfoKeyFacts).map(normalizePublicProductBrand);
      const pdfText = truncateProductContextText(
        normalizePublicProductBrand(item.productInfoExtractedText),
        perItemTextLimit,
      );

      return [
        `Produkt ${index + 1}: ${normalizePublicProductBrand(sanitizeProductContextName(item.name))}`,
        item.code ? `Code: ${item.code}` : "",
        item.productInfoSummary ? `Kurzfassung: ${normalizePublicProductBrand(item.productInfoSummary)}` : "",
        facts.length ? `Wichtige Punkte:\n${facts.map((fact) => `- ${fact}`).join("\n")}` : "",
        pdfText ? `PDF-Text:\n${pdfText}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return context.length <= MAX_CONTEXT_CHARS ? context : context.slice(0, MAX_CONTEXT_CHARS);
}

function hasUsableProductInfo(item) {
  return Boolean(
    String(item.productInfoExtractedText || "").trim() ||
      String(item.productInfoSummary || "").trim() ||
      normalizeFacts(item.productInfoKeyFacts).length,
  );
}

function getFactValue(item, labelPattern) {
  const fact = normalizeFacts(item.productInfoKeyFacts).map(normalizePublicProductBrand).find((entry) => labelPattern.test(entry));
  if (!fact) return "";

  const parts = fact.split(":");
  return parts.length > 1 ? parts.slice(1).join(":").trim() : fact.trim();
}

function getDocumentedWarrantyValue(item) {
  return getFactValue(item, /^(warranty|garantie)\s*:/i);
}

function getEnergyClassValue(item) {
  const factValue =
    getFactValue(item, /^(energieklasse|energy\s+(?:efficiency\s+)?class)\s*:/i)
    || getFactValue(item, /^class\s*:/i);
  if (factValue) return factValue;

  const match = getItemInfoLines(item)
    .map((line) => line.match(/\b(?:energieklasse|energy\s+(?:efficiency\s+)?class|energy\s+class)\s*[:\-]?\s*([A-G](?:\+\+?)?)\b/i))
    .find(Boolean);
  return match ? match[1].toUpperCase() : "";
}

function getAnnualConsumptionValue(item) {
  const factValue =
    getFactValue(item, /^(jahresverbrauch|annual consumption|energy consumption|energieverbrauch)\s*:/i);
  if (factValue) return factValue;

  const line = getItemInfoLines(item).find((entry) =>
    /(jahresverbrauch|annual consumption|energy consumption|energieverbrauch|verbrauch[^\n]*(?:100\s*(?:zyklen|cycles)|jahr|year))/i.test(entry)
    && /\b\d+(?:[.,]\d+)?\s*kWh(?:\s*\/\s*(?:100\s*(?:Zyklen|cycles)|Jahr|year))?\b/i.test(entry),
  );
  const match = line?.match(/\b\d+(?:[.,]\d+)?\s*kWh(?:\s*\/\s*(?:100\s*(?:Zyklen|cycles)|Jahr|year))?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function getItemDocumentLabels(item) {
  return getProductInfoDocuments({ code: item?.productInfoCode || item?.code })
    .map((document) => String(document?.label || "").trim())
    .filter(Boolean);
}

function hasELabelDocument(item) {
  return getItemDocumentLabels(item).some((label) => /e[\s-]?label/i.test(label));
}

function getCombinedItemInfoText(item) {
  return [
    sanitizeProductContextName(item?.name || ""),
    item?.productInfoSummary || "",
    ...normalizeFacts(item?.productInfoKeyFacts),
    item?.productInfoExtractedText || "",
  ]
    .map(normalizePublicProductBrand)
    .join("\n");
}

function getItemInfoLines(item) {
  return getCombinedItemInfoText(item)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasExplicitMountingDistanceInfo(item) {
  const sourceText = getCombinedItemInfoText(item);
  const mentionsMountingDistance =
    /(mounting\s+distance|required\s+distance|distance\s+above\s+the\s+hob|mindestabstand|montageabstand|abstand[^\n]*(?:kochfeld|hob|herd|gas|elektro))/i.test(sourceText)
    || /(?:kochfeld|hob|herd|gas|elektro)[^\n]*abstand/i.test(sourceText);
  const hasNumericDistance = /\b\d{2,4}(?:[.,]\d+)?\s*(?:mm|cm)\b/i.test(sourceText);

  return mentionsMountingDistance && hasNumericDistance;
}

function hasExplicitDimensionInfo(item) {
  return Boolean(extractInstallationDimensionsStrict(item));
}

function hasExplicitDuctConnectionInfo(item) {
  const sourceText = getCombinedItemInfoText(item);
  return /(duct\s+connection|exhaust\s+(?:connection|hose)|abluftstutzen|anschlussstutzen|anschluss\s*:?|ø|Ø|diameter|durchmesser)[^\n]*\b\d{2,4}(?:[.,]\d+)?\s*(?:mm|cm)?\b/i.test(sourceText);
}

function splitTrailingQuestion(answer) {
  const value = String(answer || "").trim();
  const match = value.match(/([\s\S]*?)(?:\n\s*)?([^\n?]*\?)\s*$/);
  if (!match) return { body: value, question: "" };

  return {
    body: match[1].trim(),
    question: match[2].trim(),
  };
}

function isUnsupportedFollowUpQuestion(question, items) {
  const value = String(question || "");
  if (!value) return false;

  if (
    /(mounting\s+distance|required\s+mounting\s+distance|required\s+distance|distance\s+above\s+the\s+hob|installation\s+distance|mindestabstand|montageabstand|abstand[^\n?]*(?:kochfeld|hob|herd))/i.test(value)
    && !items.some(hasExplicitMountingDistanceInfo)
  ) {
    return true;
  }

  if (/(dimension|measurement|size|h\s*x\s*w\s*x\s*d|abmessung|mass|maße|masse|hoehe|höhe|breite|tiefe)/i.test(value) && !items.some(hasExplicitDimensionInfo)) {
    return true;
  }

  if (/(duct|exhaust\s+(?:connection|hose)|connection\s+size|anschluss|abluft|durchmesser|diameter|ø|Ø)/i.test(value) && !items.some(hasExplicitDuctConnectionInfo)) {
    return true;
  }

  if (/(noise|geraeusch|geräusch|db\b|dba\b)/i.test(value) && !items.some(extractNoiseValueStrict)) {
    return true;
  }

  if (/(energy|energie|klasse|class|verbrauch|consumption|kwh)/i.test(value) && !items.some((item) => getEnergyClassValue(item) || getAnnualConsumptionValue(item))) {
    return true;
  }

  return false;
}

function sanitizeUnsupportedFollowUps(answer, items, language) {
  const value = String(answer || "").trim();
  if (!value) return value;

  const mountingDistanceQuestionPattern =
    /(?:^|\n)\s*[^\n?]*(?:mounting\s+distance|required\s+mounting\s+distance|required\s+distance|distance\s+above\s+the\s+hob|installation\s+distance|mindestabstand|montageabstand|abstand[^\n?]*(?:kochfeld|hob|herd))[^\n?]*\?/gi;
  const withoutUnsupportedMountingDistance = items.some(hasExplicitMountingDistanceInfo)
    ? value
    : value.replace(mountingDistanceQuestionPattern, "").trim();

  const trailingQuestion = splitTrailingQuestion(withoutUnsupportedMountingDistance);
  if (isUnsupportedFollowUpQuestion(trailingQuestion.question, items)) {
    return trailingQuestion.body;
  }

  return withoutUnsupportedMountingDistance;
}

function normalizeKnownModel(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const compact = text.replace(/\s+/g, "").toUpperCase();

  if (/^FH664621[SE]$/.test(compact)) return "FH 664 621 S";
  if (/^KHF664611S/.test(compact)) return "KHF 664 611 S";
  if (/^EWA34660W$/.test(compact)) return "EWA 34660 W";
  if (/^EBX943600S$/.test(compact)) return "EBX 943 600 S";
  if (/^OL-KMI754000E$/.test(compact)) return "OL-KMI 754 000 E";
  if (/^KGC15495S$/.test(compact)) return "KGC 15495 S";
  if (/^OL-KGCN388140E$/.test(compact)) return "OL-KGCN 388140 E";
  if (/^A-EGSPV597210$/.test(compact)) return "A-EGSPV597210";

  return text;
}

function getPublicTypeLabelForModel(model, item, language) {
  const sourceText = getCombinedItemInfoText(item);
  const value = `${model}\n${sourceText}`;
  const compactModel = String(model || "").replace(/\s+/g, "").toUpperCase();

  if (/^(?:FH664621S|KHF664611S)/.test(compactModel)) {
    return language === "de" ? "Dunstabzugshaube" : "Extractor hood";
  }
  if (compactModel === "EWA34660W") {
    return language === "de" ? "Waschmaschine" : "Washing machine";
  }
  if (compactModel === "A-EGSPV597210") {
    return language === "de" ? "Geschirrspüler" : "Dishwasher";
  }
  if (compactModel === "EBX943600S") {
    return language === "de" ? "Backofen" : "Built-in oven";
  }
  if (compactModel === "OL-KMI754000E") {
    return language === "de" ? "Kochfeld" : "Hob";
  }
  if (/^(?:KGC15495S|OL-KGCN388140E)$/.test(compactModel)) {
    return language === "de" ? "Kühl-Gefrierkombination" : "Refrigerator-freezer";
  }

  if (/\b(?:FH|KHF)\b|FH\s*664\s*621|KHF\s*664\s*611|extractor hood|dunstabzug|haube/i.test(value)) {
    return language === "de" ? "Dunstabzugshaube" : "Extractor hood";
  }
  if (/\bEWA\s*34660\s*W\b|washing machine|waschmaschine/i.test(value)) {
    return language === "de" ? "Waschmaschine" : "Washing machine";
  }
  if (/\bA-EGSPV597210\b|dishwasher|geschirrsp/i.test(value)) {
    return language === "de" ? "Geschirrspüler" : "Dishwasher";
  }
  if (/\bEBX\s*943\s*600\s*S\b|oven|backofen/i.test(value)) {
    return language === "de" ? "Backofen" : "Built-in oven";
  }
  if (/\bOL-KMI\s*754\s*000\s*E\b|hob|kochfeld/i.test(value)) {
    return language === "de" ? "Kochfeld" : "Hob";
  }
  if (/\b(?:KGC\s*15495\s*S|OL-KGCN\s*388140\s*E)\b|refrigerator|fridge|kuehl|kühl|gefrier/i.test(value)) {
    return language === "de" ? "Kühl-Gefrierkombination" : "Refrigerator-freezer";
  }

  return language === "de" ? "Produkt" : "Product";
}

function getStandardPublicItemName(item, language) {
  const model = extractKnownModel(item);
  if (!model) return "";

  return `${getPublicTypeLabelForModel(model, item, language)} (${model})`;
}

function formatBulletEntries(entries) {
  return entries.map((entry) => `- ${entry}`).join("\n");
}

function formatSectionWithBullets(title, entries) {
  return `${title}\n${formatBulletEntries(entries)}`;
}

function splitDocumentedDimensionLines(value) {
  return String(value || "")
    .split(/\r?\n|\s*,\s+(?=(?:Gerätemaße|Geraetemaße|Nischenmaße|Nischenmasse|Einbaumaße|Einbaumasse|Dimensions|Appliance dimensions|Niche dimensions)\b)/i)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeIdenticalLeadingDimensionRange(value) {
  return String(value || "").replace(
    /^(\d+(?:[.,]\d+)?)\s*(?:-|–)\s*\1(?=\s*x\s*)/i,
    "$1",
  );
}

function normalizeDimensionLabel(line, language) {
  const match = String(line || "").trim().match(
    /^(?<label>(?:Gerätemaße|Geraetemaße|Nischenmaße|Nischenmasse|Einbaumaße|Einbaumasse|Ausschnittmaße|Einbautiefe|Appliance dimensions|Niche dimensions|Installation dimensions|Cut-out dimensions|Built-in depth|Dimensions)(?:\s+H\s*x\s*(?:B|W)\s*x\s*(?:T|D))?(?:\s+W\s*x\s*D)?(?:\s*\((?:mm|cm)\))?)\s*:?\s*(?<value>.+)$/i,
  );
  if (!match?.groups) return String(line || "").trim();

  const rawLabel = match.groups.label.trim();
  const rawValue = normalizeIdenticalLeadingDimensionRange(match.groups.value.trim());

  if (language === "de") {
    const germanLabel = rawLabel
      .replace(/^Geraetemaße/i, "Gerätemaße")
      .replace(/^Geraetemaasse/i, "Gerätemaße")
      .replace(/^Nischenmasse/i, "Nischenmaße")
      .replace(/^Einbaumasse/i, "Einbaumaße")
      .replace(/^Cut-out dimensions/i, "Ausschnittmaße")
      .replace(/^Built-in depth/i, "Einbautiefe")
      .replace(/\bH\s*x\s*W\s*x\s*D\b/i, "H x B x T");

    return `${germanLabel}: ${rawValue}`;
  }

  let englishLabel = rawLabel;
  if (/^(Gerätemaße|Geraetemaße)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Gerätemaße|Geraetemaße)/i, "Appliance dimensions");
  } else if (/^(Nischenmaße|Nischenmasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Nischenmaße|Nischenmasse)/i, "Niche dimensions");
  } else if (/^(Einbaumaße|Einbaumasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Einbaumaße|Einbaumasse)/i, "Installation dimensions");
  } else if (/^Ausschnittmaße/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^Ausschnittmaße/i, "Cut-out dimensions");
  } else if (/^Einbautiefe/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^Einbautiefe/i, "Built-in depth");
  }

  englishLabel = englishLabel.replace(/\bH\s*x\s*B\s*x\s*T\b/i, "H x W x D");
  return `${englishLabel}: ${rawValue}`;
}

function formatDimensionEntry(name, dimensions) {
  const lines = splitDocumentedDimensionLines(dimensions);
  if (!lines.length) return "";

  return [`- ${name}:`, ...lines.map((line) => `  ${normalizeDimensionLabel(line, "en")}`)].join("\n");
}

function formatDimensionEntryByLanguage(name, dimensions, language) {
  const lines = splitDocumentedDimensionLines(dimensions);
  if (!lines.length) return "";

  return [`- ${name}:`, ...lines.map((line) => `  ${normalizeDimensionLabel(line, language)}`)].join("\n");
}

function isAffirmativeFollowUp(value) {
  return /^(yes|yeah|yep|sure|ok|okay|please|ja|jep|klar|bitte)\W*$/i.test(String(value || "").trim());
}

function detectTopicFromText(text) {
  const value = String(text || "");
  if (/(noise values|geräuschwerte|geraeuschwerte|noise levels)/i.test(value)) return "noise";
  if (/(dimensions|Gerätemaße|Nischenmaße|maße|masse|installation dimensions)/i.test(value)) return "dimensions";
  if (/(consumption figures|consumption values|verbrauchswerte|verbrauchsangaben)/i.test(value)) return "consumption";
  return "";
}

function resolveFollowUpTopic(question, conversationMessages) {
  if (!isAffirmativeFollowUp(question)) return "";

  const assistantMessages = Array.isArray(conversationMessages)
    ? conversationMessages.filter((message) => message?.role === "assistant" && message?.text).slice(-3).reverse()
    : [];

  for (const message of assistantMessages) {
    const text = String(message.text || "");
    const trailingQuestion = splitTrailingQuestion(text).question;
    const trailingTopic = detectTopicFromText(trailingQuestion);
    if (trailingTopic) return trailingTopic;

    const fullTopic = detectTopicFromText(text);
    if (fullTopic) return fullTopic;
  }

  return "";
}

function buildResolvedFollowUpQuestion(topic, language) {
  if (topic === "consumption") {
    return language === "de" ? "Bitte liste die dokumentierten Verbrauchswerte auf." : "Please list the documented consumption values.";
  }
  if (topic === "noise") {
    return language === "de" ? "Bitte liste die dokumentierten Geräuschwerte auf." : "Please list the documented noise values.";
  }
  if (topic === "dimensions") {
    return language === "de" ? "Bitte liste die dokumentierten Geräte- oder Nischenmaße auf." : "Please list the documented appliance or niche dimensions.";
  }

  return "";
}

function resolveEffectiveQuestion(question, conversationMessages, language) {
  const topic = resolveFollowUpTopic(question, conversationMessages);
  return topic ? buildResolvedFollowUpQuestion(topic, language) : question;
}

function stripAffirmativeLead(answer, question) {
  const value = String(answer || "").trim();
  if (!isAffirmativeFollowUp(question)) return value;
  return value.replace(/^(?:yes|yeah|yep|sure|ok|okay|ja|klar)\s*[—\-:,]?\s*/i, "").trim();
}

const SUB_PRODUCT_ALIASES = {
  hob: ["hob", "kochfeld"],
  oven: ["oven", "built-in oven", "backofen", "einbaubackofen"],
  hood: ["extractor hood", "hood", "dunstabzugshaube", "haube"],
  dishwasher: ["dishwasher", "geschirrspüler", "geschirrspueler"],
  washing_machine: ["washing machine", "washer", "waschmaschine"],
  refrigerator_freezer: ["refrigerator-freezer", "refrigerator", "fridge", "kühl-gefrierkombination", "kuehl-gefrierkombination", "kühlschrank", "gefrier"],
};

function getSubProductDisplayLabel(subProduct, language) {
  const labels = {
    hob: { de: "Kochfeld", en: "hob" },
    oven: { de: "Backofen", en: "oven" },
    hood: { de: "Dunstabzugshaube", en: "extractor hood" },
    dishwasher: { de: "Geschirrspüler", en: "dishwasher" },
    washing_machine: { de: "Waschmaschine", en: "washing machine" },
    refrigerator_freezer: { de: "Kühl-Gefrierkombination", en: "refrigerator-freezer" },
  };

  return labels[subProduct]?.[language] || (language === "de" ? "Produkt" : "product");
}

function detectRequestedSubProduct(question) {
  const value = String(question || "").toLowerCase();

  return Object.entries(SUB_PRODUCT_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => value.includes(alias.toLowerCase())),
  )?.[0] || "";
}

function getGroupedSubProductContent(item, subProduct) {
  const aliases = SUB_PRODUCT_ALIASES[subProduct] || [];
  if (!aliases.length) return [];

  const prefixPattern = aliases
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|");
  const regex = new RegExp(`^(?:${prefixPattern})\\s*:\\s*(.+)$`, "i");

  return getItemInfoLines(item)
    .map((line) => line.match(regex)?.[1]?.trim() || "")
    .filter(Boolean);
}

function extractKnownModelFromText(value) {
  const text = String(value || "");
  const patterns = [
    /\bKHF\s*664\s*611\s*S(?:\s*Stripe\s*X)?\b/i,
    /\bFH\s*664\s*621\s*[SE]\b/i,
    /\bEWA\s*34660\s*W\b/i,
    /\bEBX\s*943\s*600\s*S\b/i,
    /\bOL-KMI\s*754\s*000\s*E\b/i,
    /\bKGC\s*15495\s*S\b/i,
    /\bOL-KGCN\s*388140\s*E\b/i,
    /\bA-EGSPV597210\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return normalizeKnownModel(match[0]);
  }

  return "";
}

function getSubProductPublicName(item, subProduct, language) {
  const groupedContent = getGroupedSubProductContent(item, subProduct).join("\n");
  const explicitModelLine = groupedContent.match(/\bmodel\s*:\s*([^\n]+)/i);
  const model = normalizeKnownModel(explicitModelLine?.[1] || extractKnownModelFromText(groupedContent));
  const label = getSubProductDisplayLabel(subProduct, language);
  const displayLabel = language === "de" ? label : `${label.charAt(0).toUpperCase()}${label.slice(1)}`;

  return model ? `${displayLabel} (${model})` : displayLabel;
}

function extractSubProductEnergyClass(item, subProduct) {
  return getGroupedSubProductContent(item, subProduct)
    .map((line) => line.match(/\b(?:energieklasse|energy\s+(?:efficiency\s+)?class|energy\s+class)\s*[:\-]?\s*([A-G](?:\+\+?)?)\b/i)?.[1] || "")
    .find(Boolean)
    ?.toUpperCase() || "";
}

function extractSubProductDimensionLines(item, subProduct) {
  return getGroupedSubProductContent(item, subProduct)
    .filter((line) =>
      /(dimensions|abmessungen|maße|masse|Gerätemaße|Nischenmaße|Einbaumaße|cut-out|cutout|ausschnitt|built-in depth|einbautiefe)/i.test(line)
      && /\d/.test(line),
    );
}

function summarizeRelatedSpecsForSubProduct(item, subProduct, language) {
  const lines = extractSubProductDimensionLines(item, subProduct)
    .map((line) => normalizeDimensionLabel(line, language));
  const labels = [];

  if (lines.some((line) => /Appliance dimensions|Gerätemaße/i.test(line))) labels.push(language === "de" ? "Gerätemaße" : "appliance size");
  if (lines.some((line) => /Niche dimensions|Installation dimensions|Nischenmaße|Einbaumaße|cut-out/i.test(line))) labels.push(language === "de" ? "Ausschnittmaße" : "cut-out size");
  if (lines.some((line) => /built-in depth|Einbautiefe/i.test(line))) labels.push(language === "de" ? "Einbautiefe" : "built-in depth");

  return labels;
}

function joinReadableList(values, language) {
  const entries = values.filter(Boolean);
  if (!entries.length) return "";
  if (entries.length === 1) return entries[0];
  if (entries.length === 2) return language === "de" ? `${entries[0]} und ${entries[1]}` : `${entries[0]} and ${entries[1]}`;
  const last = entries[entries.length - 1];
  const rest = entries.slice(0, -1).join(", ");
  return language === "de" ? `${rest} und ${last}` : `${rest}, and ${last}`;
}

function getPublicItemName(item, language) {
  const standardName = getStandardPublicItemName(item, language);
  if (standardName) return standardName;

  const sourceText = getCombinedItemInfoText(item);
  const productNameLine = String(item?.productInfoExtractedText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(produktname|product name):/i.test(line));

  if (productNameLine) {
    return productNameLine.replace(/^(produktname|product name):\s*/i, "").trim();
  }

  const explicitModel = extractKnownModel(item);
  if (isExtractorHoodItem(item)) {
    return formatExtractorHoodAnswerName(item, language, explicitModel);
  }

  return sanitizeProductContextName(item?.name || item?.code || (language === "de" ? "Das Produkt" : "The product"));
}

function getModelAnswerItemName(item, language) {
  const explicitModel = extractKnownModel(item);
  if (explicitModel) {
    return getPublicTypeLabelForModel(explicitModel, item, language);
  }

  const rawName = sanitizeProductContextName(item?.name || "");
  const sourceText = getCombinedItemInfoText(item);

  if (/\bEBX\b/i.test(explicitModel) || /\boven\b|backofen/i.test(rawName)) {
    return language === "de"
      ? "Backofen"
      : "Built-in oven";
  }

  if (/\bOL-KMI\b/i.test(explicitModel) || /\bhob\b|kochfeld/i.test(rawName)) {
    return language === "de"
      ? "Kochfeld"
      : "Hob";
  }

  if (/\bEWA\b/i.test(explicitModel) || /washing machine|waschmaschine/i.test(rawName)) {
    return language === "de"
      ? "Waschmaschine"
      : "Washing machine";
  }

  if (/\bA-EGSPV\b/i.test(explicitModel) || /dishwasher|geschirrsp/i.test(rawName)) {
    return language === "de"
      ? "Geschirrspüler"
      : "Dishwasher";
  }

  if (/\bKGC\b/i.test(explicitModel) || /refrigerator|fridge|kuehl|kÃƒÂ¼hl|gefrier/i.test(rawName)) {
    return language === "de"
      ? "Kühl-Gefrierkombination"
      : "Refrigerator";
  }

  if (/\b(?:FH|KHF)\b/i.test(explicitModel) || isExtractorHoodItem(item)) {
    return language === "de" ? "Dunstabzugshaube" : "Extractor hood";
  }

  if (/washing machine|waschmaschine/i.test(sourceText) || /washing machine|waschmaschine/i.test(rawName)) {
    return language === "de"
      ? "Waschmaschine"
      : "Washing machine";
  }

  if (/dishwasher|geschirrsp/i.test(sourceText) || /dishwasher|geschirrsp/i.test(rawName)) {
    return language === "de"
      ? "Geschirrspüler"
      : "Dishwasher";
  }

  if (/refrigerator|fridge|kuehl|kÃ¼hl|gefrier/i.test(sourceText) || /refrigerator|fridge|kuehl|kÃ¼hl|gefrier/i.test(rawName)) {
    return language === "de"
      ? "Kühl-Gefrierkombination"
      : "Refrigerator";
  }

  if (isExtractorHoodItem(item)) {
    return language === "de" ? "Dunstabzugshaube" : "Extractor hood";
  }

  if (/\bhob\b|kochfeld/i.test(sourceText) || /\bhob\b|kochfeld/i.test(rawName)) {
    return language === "de" ? "Kochfeld" : "Hob";
  }

  if (/\boven\b|backofen/i.test(sourceText) || /\boven\b|backofen/i.test(rawName)) {
    return language === "de" ? "Backofen" : "Built-in oven";
  }

  if (explicitModel) {
    return language === "de" ? "Produkt" : "Product";
  }

  return getPublicItemName(item, language);
}

function getWarrantyAnswerItemName(item, language) {
  const typeLabel = getModelAnswerItemName(item, language);
  const model = extractKnownModel(item);
  return model ? `${typeLabel} (${model})` : typeLabel;
}

function isWarrantyDocumentationQuestion(question) {
  return WARRANTY_QUESTION_PATTERN.test(String(question || ""))
    && /(written|documented|documentation|product documentation|pdf|produktdokumentation|produktinformation|dokumentiert|steht|schriftlich)/i.test(String(question || ""));
}

function getBusinessPolicyWarrantyAnswer(language, itemCount = 1, asksDocumentation = false) {
  if (asksDocumentation) {
    return language === "de"
      ? `Nein. Die ${BUSINESS_POLICY.warranty.de} Garantie ist Fragmento-Geschäftsrichtlinie, nicht Produktdokumentation.`
      : `No. The ${BUSINESS_POLICY.warranty.en} warranty is Fragmento business policy, not product documentation.`;
  }

  if (language === "de") {
    return itemCount > 1
      ? `Nach Fragmento-Geschäftsrichtlinie haben die ausgewählten Produkte eine Garantie von ${BUSINESS_POLICY.warranty.de}. Diese Angabe stammt nicht aus der Produktdokumentation.`
      : `Nach Fragmento-Geschäftsrichtlinie hat dieses Produkt eine Garantie von ${BUSINESS_POLICY.warranty.de}. Diese Angabe stammt nicht aus der Produktdokumentation.`;
  }

  return itemCount > 1
    ? `Under Fragmento business policy, the selected products have a ${BUSINESS_POLICY.warranty.en} warranty. This information is not from the product documentation.`
    : `Under Fragmento business policy, this product has a ${BUSINESS_POLICY.warranty.en} warranty. This information is not from the product documentation.`;
}

function isExtractorHoodItem(item) {
  const sourceText = getCombinedItemInfoText(item);
  return /flachschirmhaube|teleskophaube|kaminhaube|chimney hood|extractor hood/i.test(sourceText)
    || String(item?.productInfoCode || item?.code || "").toUpperCase().startsWith("HOOD-");
}

function formatExtractorHoodAnswerName(item, language, explicitModel = "") {
  const model = explicitModel || extractKnownModel(item);
  const baseLabel = language === "de" ? "Dunstabzugshaube" : "Extractor hood";
  return model ? `${baseLabel} (${model})` : baseLabel;
}

function getEnergyAnswerItemName(item, language) {
  const standardName = getStandardPublicItemName(item, language);
  if (standardName) return standardName;

  const sourceText = getCombinedItemInfoText(item);
  const explicitModel = extractKnownModel(item);

  if (/washing machine|waschmaschine/i.test(sourceText)) {
    return language === "de"
      ? `Waschmaschine${explicitModel ? ` (${explicitModel})` : ""}`
      : `Washing machine${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (/dishwasher|geschirrsp/i.test(sourceText)) {
    return language === "de"
      ? `Geschirrspüler${explicitModel ? ` (${explicitModel})` : ""}`
      : `Dishwasher${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (/refrigerator|fridge|kuehl|kühl|gefrier/i.test(sourceText)) {
    return language === "de"
      ? `Kühl-Gefrierkombination${explicitModel ? ` (${explicitModel})` : ""}`
      : `Refrigerator${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (isExtractorHoodItem(item)) {
    return formatExtractorHoodAnswerName(item, language, explicitModel);
  }

  if (/(?:oven|backofen)[\s\S]{0,80}(?:hob|kochfeld)|(?:hob|kochfeld)[\s\S]{0,80}(?:oven|backofen)/i.test(sourceText)) {
    return getPublicItemName(item, language);
  }

  if (/oven and hob|backofen|oven|kochfeld|hob/i.test(sourceText)) {
    return language === "de"
      ? `Backofen${explicitModel ? ` (${explicitModel})` : ""}`
      : `Built-in oven${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  return getPublicItemName(item, language);
}

function shouldUseModelForEnergyAnswer(items) {
  return items.some((item) => {
    const sourceText = getCombinedItemInfoText(item);
    const hasMultipleProductTypes = [
      /oven|backofen/i,
      /hob|kochfeld/i,
      /washing machine|waschmaschine/i,
      /dishwasher|geschirrsp/i,
      /refrigerator|fridge|kuehl|kÃ¼hl|gefrier/i,
      /extractor hood|dunstabzug|haube/i,
    ].filter((pattern) => pattern.test(sourceText)).length > 1;
    const hasGroupedEnergyFact = /(?:^|\n)\s*(?:[^:\n]{2,40})\s*:\s*(?:energieklasse|energy\s+(?:efficiency\s+)?class)\b/i.test(sourceText);

    return hasMultipleProductTypes && hasGroupedEnergyFact;
  });
}

function getEnergyAnswerRecords(item, language) {
  return [
    {
      item,
      name: getEnergyAnswerItemName(item, language),
      hasELabel: hasELabelDocument(item),
      energyClass: getEnergyClassValue(item),
      annualConsumption: getAnnualConsumptionValue(item),
    },
  ];
}

function hasDocumentedNoiseValue(item) {
  return Boolean(extractNoiseValueStrict(item));
}

function hasDocumentedDimensionValue(item) {
  return Boolean(extractInstallationDimensionsStrict(item));
}

function getConsumptionSourceLine(item, value) {
  const normalizedValue = String(value || "").trim();
  return getItemInfoLines(item).find((line) =>
    line.includes(normalizedValue)
    && /(verbrauch|consumption|kwh|year|jahr|wash cycles|cycles|conventional|hot air|heißluft)/i.test(line),
  ) || "";
}

function getConsumptionLabel(item, language, value) {
  const normalizedValue = String(value || "").trim();
  const isPerHundredCycles = /100\s*(zyklen|cycles)/i.test(normalizedValue);
  const sourceLine = getConsumptionSourceLine(item, value);
  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(item), item, "en");

  if (language === "de") {
    if (/(jahr|annual|year)/i.test(sourceLine)) {
      return "Jährlicher Energieverbrauch";
    }
    if (/(conventional|konventionell).*(hot air|heißluft)|(hot air|heißluft).*(conventional|konventionell)/i.test(sourceLine)) {
      return "Energieverbrauch konventionell / Heißluft";
    }
    if (isPerHundredCycles) {
      return typeLabel === "Washing machine"
        ? "Energieverbrauch pro 100 Waschzyklen"
        : "Energieverbrauch pro 100 Zyklen";
    }

    return "Dokumentierter Verbrauch";
  }

  if (/(year|annual|jahr)/i.test(sourceLine)) {
    return "Annual energy consumption";
  }
  if (/(conventional|konventionell).*(hot air|heißluft)|(hot air|heißluft).*(conventional|konventionell)/i.test(sourceLine)) {
    return "Energy consumption conventional / hot air";
  }
  if (isPerHundredCycles) {
    return typeLabel === "Washing machine"
      ? "Energy consumption per 100 wash cycles"
      : "Energy consumption per 100 cycles";
  }

  return "Documented consumption";
}

function formatConsumptionEntry(record, language) {
  if (!record?.annualConsumption) return "";
  return `${record.name}: ${getConsumptionLabel(record.item, language, record.annualConsumption)}: ${record.annualConsumption}`;
}

function getNextDocumentedFollowUp(items, language, topic) {
  if (topic === "energy") {
    return items.some((item) => getAnnualConsumptionValue(item))
      ? (language === "de"
        ? "Soll ich auch die dokumentierten Verbrauchswerte auflisten?"
        : "Would you like me to list the documented consumption values too?")
      : "";
  }

  if (topic === "consumption") {
    return items.some(hasDocumentedNoiseValue)
      ? (language === "de"
        ? "Soll ich als Nächstes auch die dokumentierten Geräuschwerte auflisten?"
        : "Would you like me to list the documented noise values next?")
      : "";
  }

  if (topic === "noise") {
    return items.some(hasDocumentedDimensionValue)
      ? (language === "de"
        ? "Soll ich auch die dokumentierten Geräte- oder Nischenmaße auflisten?"
        : "Would you like me to list the documented appliance or niche dimensions too?")
      : "";
  }

  return "";
}

function answerForRequestedSubProductEnergy(question, items, language) {
  const requestedSubProduct = detectRequestedSubProduct(question);
  if (!requestedSubProduct || items.length !== 1) return null;

  const item = items[0];
  const requestedEnergyClass = extractSubProductEnergyClass(item, requestedSubProduct);
  if (requestedEnergyClass) return null;

  const otherKnown = Object.keys(SUB_PRODUCT_ALIASES)
    .filter((subProduct) => subProduct !== requestedSubProduct)
    .map((subProduct) => ({
      subProduct,
      energyClass: extractSubProductEnergyClass(item, subProduct),
    }))
    .filter((entry) => entry.energyClass);

  if (!otherKnown.length) return null;

  const requestedLabel = getSubProductDisplayLabel(requestedSubProduct, language);
  const primaryOther = otherKnown[0];
  const otherLabel = getSubProductDisplayLabel(primaryOther.subProduct, language);

  return {
    answer: language === "de"
      ? `Ich konnte keine dokumentierte Energieklasse für das ${requestedLabel} finden. Für das ${otherLabel} ist eine dokumentierte Energieeffizienzklasse angegeben, aber für das ${requestedLabel} ist keine Energieklasse aufgeführt.`
      : `I could not find a documented energy class for the ${requestedLabel}. The ${otherLabel} has a documented energy efficiency class, but no energy class is listed for the ${requestedLabel}.`,
    found: false,
  };
}

function answerForRequestedSubProductDimensions(question, items, language) {
  const requestedSubProduct = detectRequestedSubProduct(question);
  if (!requestedSubProduct || items.length !== 1) return null;

  const item = items[0];
  const dimensionLines = extractSubProductDimensionLines(item, requestedSubProduct);
  if (!dimensionLines.length) return null;

  const formattedEntry = [
    `- ${getSubProductPublicName(item, requestedSubProduct, language)}:`,
    ...dimensionLines.map((line) => `  ${normalizeDimensionLabel(line, language)}`),
  ].join("\n");

  return {
    answer: language === "de"
      ? `Ich habe diese dokumentierten Maße gefunden:\n\n${formattedEntry}`
      : `I found these documented dimensions:\n\n${formattedEntry}`,
    found: true,
  };
}

function answerForInstallationDistanceRefusal(question, items, language) {
  if (!/(mounting\s+distance|required\s+distance|distance\s+above\s+the\s+hob|installation\s+distance|mindestabstand|montageabstand|abstand)/i.test(String(question || ""))) {
    return null;
  }
  if (!/(estimate|guess|if it is not written|wenn.*nicht.*steht|schätzen|estimate it)/i.test(String(question || ""))) {
    return null;
  }
  if (items.some(hasExplicitMountingDistanceInfo)) {
    return null;
  }

  const requestedSubProduct = detectRequestedSubProduct(question) || "hob";
  const relatedSpecs = items.flatMap((item) => summarizeRelatedSpecsForSubProduct(item, requestedSubProduct, language));
  const relatedList = joinReadableList([...new Set(relatedSpecs)], language);
  const relatedSummary = relatedSpecs.length
    ? (language === "de"
      ? ` Die Dokumentation nennt ${relatedList}, aber nicht den erforderlichen Abstand über dem Kochfeld.`
      : ` The ${getSubProductDisplayLabel(requestedSubProduct, "en")} documentation lists ${relatedList}, but not the required distance above the ${getSubProductDisplayLabel(requestedSubProduct, "en")}.`)
    : "";

  return {
    answer: language === "de"
      ? `Ich konnte keinen dokumentierten Montage- oder Installationsabstand über dem Kochfeld finden und kann ihn deshalb nicht schätzen.${relatedSummary}`
      : `I could not find a documented mounting or installation distance above the hob, so I cannot estimate it.${relatedSummary}`,
    found: false,
  };
}

function extractNoiseValue(item) {
  const factValue = getFactValue(item, /^geraeusch\s*:/i) || getFactValue(item, /^noise\s*:/i);
  if (factValue) return factValue;

  const sourceText = getCombinedItemInfoText(item);
  const rangeMatch = sourceText.match(/\b\d{2,3}\s*-\s*\d{2,3}\s*dB(?:\(A\))?\b/i);
  if (rangeMatch) return rangeMatch[0].replace(/\s+/g, " ").trim();

  const singleMatch = sourceText.match(/\b\d{2,3}\s*dB(?:\(A\))?\b/i);
  return singleMatch ? singleMatch[0].replace(/\s+/g, " ").trim() : "";
}

function extractInstallationDimensions(item) {
  const hasNumericDimensionPattern = (value) =>
    /\b\d{2,4}(?:[.,]\d+)?\s*(?:x|×|-)\s*\d{2,4}(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d{2,4}(?:[.,]\d+)?)?(?:\s*mm|\s*cm)?\b/i.test(value)
    || /\b(?:min\.?\s*)?\d{2,4}(?:[.,]\d+)?\s*mm\b/i.test(value)
    || /\b(?:breite|width|hoehe|höhe|tiefe|depth)\s*:\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)\b/i.test(value);

  const lines = String(item?.productInfoExtractedText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const matchingLines = lines.filter((line) =>
    /(abmessungen|dimensions|geraetemass|geraetemasse|geraetema[sß]e|nischenmass|nischenma[sß]e|einbaumass|einbauma[sß]e)/i.test(line)
    && hasNumericDimensionPattern(line),
  );

  if (matchingLines.length) {
    return matchingLines.join(" ");
  }

  const factMatches = normalizeFacts(item?.productInfoKeyFacts).filter((fact) =>
    /(abmessungen|dimensions|geraetemass|geraetemasse|geraetema[sß]e|nischenmass|nischenma[sß]e|einbaumass|einbauma[sß]e)/i.test(fact)
    && hasNumericDimensionPattern(fact),
  );

  return factMatches.length ? factMatches.join(", ") : "";
}

function extractNoiseValueStrict(item) {
  const factValue = getFactValue(item, /^(geraeusch|geräusch|schallleistung|noise)\s*:/i);
  if (factValue) return factValue;

  const line = getItemInfoLines(item).find((entry) =>
    /(geraeusch|geräusch|schallleistung|noise|sound\s+power|lautstärke)/i.test(entry)
    && /\b\d{2,3}(?:\s*-\s*\d{2,3})?\s*dB(?:\(A\))?\b/i.test(entry),
  );
  const match = line?.match(/\b\d{2,3}(?:\s*-\s*\d{2,3})?\s*dB(?:\(A\))?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function extractInstallationDimensionsStrict(item) {
  const hasNumericDimensionPattern = (value) =>
    /\b\d{2,4}(?:[.,]\d+)?\s*(?:x|×|-)\s*\d{2,4}(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d{2,4}(?:[.,]\d+)?)?(?:\s*mm|\s*cm)?\b/i.test(value)
    || /\b(?:min\.?\s*)?\d{2,4}(?:[.,]\d+)?\s*mm\b/i.test(value)
    || /\b(?:breite|width|hoehe|höhe|tiefe|depth)\s*:\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)\b/i.test(value);
  const hasDimensionLabel = (value) =>
    /(abmessungen|dimensions|geraetemass|geraetemasse|gerätemaße|geraetemaße|nischenmass|nischenmaße|einbaumass|einbaumaße)/i.test(value);

  const matchingLines = getItemInfoLines(item).filter((line) => hasDimensionLabel(line) && hasNumericDimensionPattern(line));
  if (matchingLines.length) return matchingLines.join("\n");

  const factMatches = normalizeFacts(item?.productInfoKeyFacts)
    .filter((fact) => hasDimensionLabel(fact) && hasNumericDimensionPattern(fact));

  return factMatches.length ? factMatches.join(", ") : "";
}

function answerFromExplicitMultiItemEnergyFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;
  const missingSubProductAnswer = answerForRequestedSubProductEnergy(question, items, language);
  if (missingSubProductAnswer) return missingSubProductAnswer;

  const asksConsumptionOnly = /(consumption|verbrauch|kwh)/i.test(value) && !ENERGY_QUESTION_PATTERN.test(value);

  if (!ENERGY_QUESTION_PATTERN.test(value) && !asksConsumptionOnly) {
    return null;
  }

  if (shouldUseModelForEnergyAnswer(items)) {
    return null;
  }

  const records = items.flatMap((item) => getEnergyAnswerRecords(item, language));
  const consumptionEntries = records
    .filter((record) => record.annualConsumption)
    .map((record) => formatConsumptionEntry(record, language))
    .filter(Boolean);

  if (asksConsumptionOnly) {
    if (!consumptionEntries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    const body = language === "de"
      ? formatSectionWithBullets("Hier sind die dokumentierten Verbrauchswerte aus der Produktinformation:", consumptionEntries)
      : formatSectionWithBullets("Here are the documented consumption values from the product information:", consumptionEntries);
    const followUp = getNextDocumentedFollowUp(items, language, "consumption");

    return {
      answer: followUp ? `${body}\n\n${followUp}` : body,
      found: true,
    };
  }
  const knownEntries = records
    .filter((record) => record.energyClass)
    .map((record) => {
      return language === "de"
        ? `${record.name}: Energieklasse ${record.energyClass}`
        : `${record.name}: energy class ${record.energyClass}`;
    });
  const unknownEntries = records
    .filter((record) => !record.energyClass)
    .map((record) => {
      if (language === "de") {
        const note = record.hasELabel ? "E-Label vorhanden, aber keine Energieklasse im verfügbaren Produkttext gefunden" : "keine dokumentierte Energieklasse gefunden";
        return `- ${record.name}: ${note}`;
      }

      const note = record.hasELabel ? "E-label exists, but no energy class was found in the available product text" : "no documented energy class found";
      return `- ${record.name}: ${note}`;
    });

  if (!knownEntries.length && !unknownEntries.length) {
    return { answer: notFoundAnswer, found: false };
  }

  const answerBlocks = [];
  if (knownEntries.length) {
    answerBlocks.push(language === "de"
      ? formatSectionWithBullets("Dokumentierte Energieklasse:", knownEntries)
      : formatSectionWithBullets("Documented energy class:", knownEntries));
  }
  if (unknownEntries.length) {
    answerBlocks.push(language === "de"
      ? `Nicht im verfügbaren Produkttext gefunden:\n${unknownEntries.join("\n")}`
      : formatSectionWithBullets("Not found in the available product text:", unknownEntries));
  }

  const followUp = getNextDocumentedFollowUp(items, language, "energy");

  return {
    answer: followUp ? `${answerBlocks.join("\n\n")}\n\n${followUp}` : answerBlocks.join("\n\n"),
    found: true,
  };
}

function answerFromExplicitMultiItemFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;
  const installationDistanceRefusal = answerForInstallationDistanceRefusal(question, items, language);
  if (installationDistanceRefusal) return installationDistanceRefusal;

  if (WARRANTY_QUESTION_PATTERN.test(value)) {
    const entries = items
      .map((item) => {
        const warranty = getDocumentedWarrantyValue(item);
        return warranty ? `${getWarrantyAnswerItemName(item, language)}: ${warranty}` : null;
      })
      .filter(Boolean);

    if (entries.length) {
      return {
        answer: language === "de"
          ? formatSectionWithBullets("Die dokumentierte Garantie für die ausgewählten Produkte ist:", entries)
          : formatSectionWithBullets("The documented warranty for the selected products is:", entries),
        found: true,
      };
    }

    return {
      answer: getBusinessPolicyWarrantyAnswer(language, items.length, isWarrantyDocumentationQuestion(question)),
      found: true,
    };
  }

  if (/(consumption|verbrauch|kwh)/i.test(value)) {
    const entries = items
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.annualConsumption)
      .map((record) => formatConsumptionEntry(record, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    const followUp = getNextDocumentedFollowUp(items, language, "consumption");
    const body = language === "de"
      ? formatSectionWithBullets("Hier sind die dokumentierten Verbrauchswerte aus der Produktinformation:", entries)
      : formatSectionWithBullets("Here are the documented consumption values from the product information:", entries);

    return {
      answer: followUp ? `${body}\n\n${followUp}` : body,
      found: true,
    };
  }

  if (/(noise|geraeusch|geräusch|db\b|dba\b)/i.test(value)) {
    const entries = items
      .map((item) => {
        const noise = extractNoiseValueStrict(item);
        if (!noise) return null;
        return `${getPublicItemName(item, language)}: ${noise}`;
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `${formatSectionWithBullets("Die dokumentierten Geräuschwerte sind:", entries)}${getNextDocumentedFollowUp(items, language, "noise") ? `\n\n${getNextDocumentedFollowUp(items, language, "noise")}` : ""}`
        : `${formatSectionWithBullets("The documented noise values are:", entries)}${getNextDocumentedFollowUp(items, language, "noise") ? `\n\n${getNextDocumentedFollowUp(items, language, "noise")}` : ""}`,
      found: true,
    };
  }

  if (/(installation dimensions|dimensions|measurements|size|abmessungen|ma[sß]e|nischenmass|nischenma[sß]e|einbaumass|einbauma[sß]e)/i.test(value)) {
    const requestedSubProductDimensions = answerForRequestedSubProductDimensions(question, items, language);
    if (requestedSubProductDimensions) {
      return requestedSubProductDimensions;
    }

    const entries = items
      .map((item) => {
        const dimensions = extractInstallationDimensionsStrict(item);
        if (!dimensions) return null;
        return formatDimensionEntryByLanguage(getPublicItemName(item, language), dimensions, language);
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `Ich habe diese dokumentierten Geräte- oder Nischenmaße gefunden:\n\n${entries.join("\n\n")}`
        : `I found these documented appliance or niche dimensions:\n\n${entries.join("\n\n")}`,
      found: true,
    };
  }

  return null;
}

function extractKnownModel(item) {
  const explicitModel = getFactValue(item, /^model\s*:/i);
  if (explicitModel) return normalizeKnownModel(explicitModel);

  const sourceText = getCombinedItemInfoText(item);
  const patterns = [
    /\bKHF\s*664\s*611\s*S(?:\s*Stripe\s*X)?\b/i,
    /\bFH\s*664\s*621\s*[SE]\b/i,
    /\bEWA\s*34660\s*W\b/i,
    /\bEBX\s*943\s*600\s*S\b/i,
    /\bOL-KMI\s*754\s*000\s*E\b/i,
    /\bKGC\s*15495\s*S\b/i,
    /\bOL-KGCN\s*388140\s*E\b/i,
    /\bA-EGSPV597210\b/i,
  ];

  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match) {
      return normalizeKnownModel(match[0]);
    }
  }

  const productNameLine = String(item?.productInfoExtractedText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(produktname|product name|modell|model):/i.test(line));

  if (!productNameLine) return "";

  return normalizeKnownModel(productNameLine.replace(/^(produktname|product name|modell|model):\s*/i, "").trim());
}

function answerFromExplicitMultiItemModels(question, items, language) {
  if (!Array.isArray(items) || items.length < 2) return null;

  const value = String(question || "").toLowerCase();
  if (!/(all|alle|list|show|send|which|welche|what)\b/.test(value) && !/\bmodels?\b|\bmodell(?:e)?\b/.test(value)) {
    return null;
  }

  if (!/\bmodels?\b|\bmodell(?:e)?\b|\bproduct names?\b|\bprodukt(?:e|namen)?\b/.test(value)) {
    return null;
  }

  const entries = items
    .map((item) => {
      const model = extractKnownModel(item);
      if (!model) return null;
      return `${getPublicTypeLabelForModel(model, item, language)} (${model})`;
    })
    .filter(Boolean);

  if (!entries.length) {
    return {
      answer: NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en,
      found: false,
    };
  }

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Hier sind alle Modelle aus den verfügbaren Produktinformationen:", entries)
      : formatSectionWithBullets("Here are all the models listed in the available product information:", entries),
    found: true,
  };
}

function answerFromStructuredFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const item = items.length === 1 ? items[0] : null;
  if (!item) return null;

  const name = item.name || (language === "de" ? "Das Produkt" : "The product");
  const yes = language === "de" ? "Ja." : "Yes.";

  const checks = [
    {
      question: /\bsteam\s*clean\b/i,
      fact: /^steam\s*clean\s*:/i,
      en: `${yes} ${name} has Steam Clean.`,
      de: `${yes} ${name} hat Steam Clean.`,
    },
    {
      question: /\btimer\b/i,
      fact: /^timer\s*:/i,
      en: `${yes} ${name} has a timer.`,
      de: `${yes} ${name} hat einen Timer.`,
    },
    {
      question: /child safety|safety lock|kindersicherung|kindersicher/i,
      fact: /^child safety lock\s*:/i,
      en: `${yes} ${name} has a child safety lock.`,
      de: `${yes} ${name} hat eine Kindersicherung.`,
    },
    {
      question: /booster/i,
      fact: /^booster\s*:/i,
      en: `${yes} ${name} has a booster function.`,
      de: `${yes} ${name} hat eine Booster-Funktion.`,
    },
    {
      question: /pot detection|topferkennung/i,
      fact: /^pot detection\s*:/i,
      en: `${yes} ${name} has pot detection.`,
      de: `${yes} ${name} hat Topferkennung.`,
    },
  ];

  for (const check of checks) {
    if (check.question.test(value) && /^yes$/i.test(getFactValue(item, check.fact))) {
      return { answer: language === "de" ? check.de : check.en, found: true };
    }
  }

  if (/(e[\s-]?label|energy label|energielabel)/i.test(value) && /\b(pdf|document|doc|datei)\b/i.test(value)) {
    const documentLabels = getItemDocumentLabels(item);
    const hasELabelPdf = documentLabels.some((label) => /e[\s-]?label/i.test(label));
    if (hasELabelPdf) {
      return {
        answer: language === "de"
          ? `Ja. Für dieses Produkt gibt es ein E-Label PDF.`
          : `Yes. There is an E-label PDF for this product.`,
        found: true,
      };
    }
  }

  if (/(flat pull[- ]out|pull[- ]out hood|flachschirmhaube|teleskophaube|chimney hood|kaminhaube)/i.test(value)) {
    const sourceText = getCombinedItemInfoText(item);
    if (/flachschirmhaube|teleskophaube/i.test(sourceText)) {
      return {
        answer: language === "de"
          ? "Es ist eine Flachschirmhaube beziehungsweise Teleskophaube, keine Kaminhaube."
          : "It is a flat pull-out hood (Flachschirmhaube / Teleskophaube), not a chimney hood.",
        found: true,
      };
    }
    if (/chimney hood|kaminhaube/i.test(sourceText)) {
      return {
        answer: language === "de"
          ? "Es ist eine Kaminhaube."
          : "It is a chimney hood.",
        found: true,
      };
    }
  }

  if (/model|modell|exact.*name|product name|produktname/.test(value)) {
    const model = extractKnownModel(item);
    if (model) {
      return {
        answer: language === "de" ? `Das Modell ist ${model}.` : `The model is ${model}.`,
        found: true,
      };
    }
  }

  if (WARRANTY_QUESTION_PATTERN.test(value)) {
    const warranty = getDocumentedWarrantyValue(item);
    if (!warranty) {
      return {
        answer: getBusinessPolicyWarrantyAnswer(language, 1, isWarrantyDocumentationQuestion(question)),
        found: true,
      };
    }

    return {
      answer: language === "de"
        ? `Die dokumentierte Garantie beträgt ${warranty}.`
        : `The warranty documented for this product is ${warranty}.`,
      found: true,
    };
  }

  return null;
}

function extractResponseText(responsePayload) {
  if (typeof responsePayload?.output_text === "string") {
    return responsePayload.output_text;
  }

  const output = Array.isArray(responsePayload?.output) ? responsePayload.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((content) => content?.text || "")
    .join("")
    .trim();
}

function detectQuestionLanguage(question) {
  const value = String(question || "").trim().toLowerCase();
  if (!value) return "en";

  const germanSignals = [
    /\b(der|die|das|und|oder|mit|fuer|für|ist|sind|hat|haben|welche|welcher|welches|was|wie|kann|gibt|breite|hoehe|höhe)\b/,
    /[äöüß]/,
  ];
  const englishSignals = [
    /\b(the|and|or|with|is|are|does|do|what|which|how|can|width|height|noise|energy)\b/,
  ];

  if (germanSignals.some((pattern) => pattern.test(value))) return "de";
  if (englishSignals.some((pattern) => pattern.test(value))) return "en";
  return "en";
}

function parseAssistantJson(text, language) {
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.answer !== "string" || typeof parsed?.found !== "boolean") {
      return { answer: notFoundAnswer, found: false };
    }

    const answer = parsed.answer.trim();
    const found = parsed.found === true && Boolean(answer) && answer !== notFoundAnswer;
    return {
      answer: found ? answer : notFoundAnswer,
      found,
    };
  } catch {
    return {
      answer: notFoundAnswer,
      found: false,
    };
  }
}

async function loadAuthorizedProductInfoItems({ itemIds, contractNumber, kitchenSlug }) {
  const normalizedContractNumber = normalizeRequiredString(contractNumber);
  if (!normalizedContractNumber) {
    throw routeError("Contract number is required.", 400);
  }

  const contract = await getKitchenContractForAccess(normalizedContractNumber);
  const normalizedKitchenSlug = normalizeRequiredString(kitchenSlug).toLowerCase();
  if (normalizedKitchenSlug && String(contract.kitchen?.slug || "").toLowerCase() !== normalizedKitchenSlug) {
    throw routeError("Contract number does not match the selected kitchen.", 403);
  }

  const items = await prisma.kitchenItem.findMany({
    where: {
      id: { in: itemIds },
      isActive: true,
      kitchenId: contract.kitchenId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      productInfoPdfPath: true,
      productInfoSummary: true,
      productInfoKeyFacts: true,
      productInfoExtractedText: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  if (!items.length) {
    throw routeError("No authorized active product items were found.", 404);
  }

  return items;
}

function buildRoleInstructions() {
  return [
    "You are a product information assistant for Fragmento kitchen orders.",
    "Write like a helpful sales advisor: natural, warm, and concise, but never pushy or verbose.",
  ];
}

function buildGroundingInstructions({ notFoundAnswer }) {
  return [
    "Answer only using the provided server-side product information.",
    "Do not use general knowledge.",
    "Do not guess.",
    "If the answer is not clearly supported by the provided product information or explicitly labeled business policy, answer exactly: " + JSON.stringify(notFoundAnswer),
  ];
}

function buildConversationInstructions() {
  return [
    "Recent chat messages may be used only to understand follow-up wording, pronouns, and the product/topic the customer is referring to.",
    "Do not treat recent chat messages as product facts; product facts must come from the provided product information.",
  ];
}

function buildProductFactInstructions() {
  return [
    "Understand close mixed-language wording from customers. For example, treat 'energy klasse' as 'energy class' and 'energie class' as 'Energieklasse'.",
    "Do not infer dimensions, measurements, niche sizes, or noise levels from catalog names, UI labels, or codes.",
    "Use dimensions, measurements, installation sizes, energy classes, consumption values, and noise values only when explicitly present in the provided summary, key facts, or PDF text.",
    "Business policy may be used only when it is explicitly labeled as business policy; never describe business policy as PDF or product documentation.",
    "Prefer natural product names in answers. Do not mention internal product codes unless the customer explicitly asks for a code, model, or article number.",
    "Do not confuse document availability with the requested specification. An E-label PDF being available does not mean the energy class is known unless the class itself is present in the provided product information.",
    "If the customer asks for the product name, model, type, or what the product is, use only the explicit product name, model, type, code, summary, or key facts from the provided product information.",
    "If the customer asks whether a product has a feature, capability, function, or mode, answer yes when that feature is explicitly listed in the summary, key facts, or PDF text, and briefly cite the matching detail.",
    "For bundles or sets with several sub-products, keep facts attached to the sub-product named in the documentation.",
  ];
}

function buildUnsupportedAnswerInstructions() {
  return [
    "When the customer asks for one fact across multiple products, separate products with documented values from products where that exact value is not documented.",
    "If a sub-product in a bundle has no documented value for the requested fact, say that the value is not documented for that sub-product.",
    "Only offer a follow-up topic when the provided product information contains explicit support for that topic.",
    "Do not offer mounting distances, installation distances, dimensions, noise values, or energy data unless those exact details are present in the provided product information.",
  ];
}

function buildFormattingInstructions(language) {
  const languageLabel = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.en;
  return [
    `The customer interface language is ${languageLabel}; answer in that language.`,
    "When the answer is available, give a direct answer first and include the most relevant concrete specifications or features from the provided information.",
    "For yes/no questions, start with a direct yes or no, then add one short supporting sentence from the provided information.",
    "If the customer replies with a simple affirmative to your prior follow-up question, continue naturally and do not start the new answer with 'Yes'.",
    "When mentioning multiple products, models, or several specifications, format the answer with line breaks so each product or major point appears on its own line.",
    "Use short readable blocks instead of one long paragraph. Lists may use hyphens or plain line breaks.",
    "When the answer is found, end with one short relevant follow-up question or suggestion that helps continue the conversation.",
    "Do not ask whether the customer wants one specific appliance or the full set when the answer already covers the full set.",
    "Keep that follow-up to a single short sentence, and do not add it when the answer is not found or when the customer only asks for a code or model number.",
    `Keep answers concise but substantive, customer-friendly, and in ${languageLabel}.`,
  ];
}

function buildOutputJsonInstructions({ notFoundAnswer }) {
  return [
    'Return only valid JSON with this shape: {"answer":"string","found":boolean}.',
    `Set found to false whenever the answer is ${JSON.stringify(notFoundAnswer)}.`,
  ];
}

function buildProductAssistantInstructions({ language, notFoundAnswer }) {
  return [
    ...buildRoleInstructions(),
    ...buildGroundingInstructions({ notFoundAnswer }),
    ...buildConversationInstructions(),
    ...buildProductFactInstructions(),
    ...buildUnsupportedAnswerInstructions(),
    ...buildFormattingInstructions(language),
    ...buildOutputJsonInstructions({ notFoundAnswer }),
  ].join("\n");
}

export async function POST(request) {
  let responseLanguage = "en";
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`product-info-ask:${clientIp}`, {
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || "").trim();
    responseLanguage = body?.language ? normalizeLanguage(body.language) : detectQuestionLanguage(question);
    const itemIds = normalizeItemIds(body?.itemIds);
    const contractNumber = normalizeRequiredString(body?.contractNumber);
    const kitchenSlug = normalizeRequiredString(body?.kitchenSlug);
    const conversationMessages = normalizeConversationMessages(body?.conversationMessages);
    const effectiveQuestion = resolveEffectiveQuestion(question, conversationMessages, responseLanguage);
    const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[responseLanguage] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;
    const noInfoAnswer = NO_INFO_ANSWER_BY_LANGUAGE[responseLanguage] || NO_INFO_ANSWER_BY_LANGUAGE.en;
    const timeoutError = TIMEOUT_ERROR_BY_LANGUAGE[responseLanguage] || TIMEOUT_ERROR_BY_LANGUAGE.en;
    const unavailableError = UNAVAILABLE_ERROR_BY_LANGUAGE[responseLanguage] || UNAVAILABLE_ERROR_BY_LANGUAGE.en;

    if (!question) {
      return jsonError("Question is required.", 400);
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return jsonError(`Question must be ${MAX_QUESTION_LENGTH} characters or fewer.`, 400);
    }

    if (!itemIds.length) {
      return jsonError("At least one product item is required.", 400);
    }

    const items = await loadAuthorizedProductInfoItems({ itemIds, contractNumber, kitchenSlug });

    const usableContextItems = items
      .filter(hasUsableProductInfo);
    if (!usableContextItems.length) {
      return NextResponse.json({ answer: noInfoAnswer, found: false });
    }

    const multiItemModelAnswer = answerFromExplicitMultiItemModels(effectiveQuestion, usableContextItems, responseLanguage);
    if (multiItemModelAnswer) {
      return NextResponse.json(multiItemModelAnswer);
    }

    const multiItemEnergyAnswer = answerFromExplicitMultiItemEnergyFacts(effectiveQuestion, usableContextItems, responseLanguage);
    if (multiItemEnergyAnswer) {
      return NextResponse.json(multiItemEnergyAnswer);
    }

    const multiItemStructuredAnswer = answerFromExplicitMultiItemFacts(effectiveQuestion, usableContextItems, responseLanguage);
    if (multiItemStructuredAnswer) {
      return NextResponse.json(multiItemStructuredAnswer);
    }

    const structuredAnswer = answerFromStructuredFacts(effectiveQuestion, usableContextItems, responseLanguage);
    if (structuredAnswer) {
      return NextResponse.json(structuredAnswer);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("Product info assistant is not configured.", 503);
    }

    const context = buildProductContext(usableContextItems);
    const conversationContext = buildConversationContext(conversationMessages);
    const model = process.env.OPENAI_PRODUCT_INFO_MODEL || "gpt-5.2";
    const instructions = buildProductAssistantInstructions({ language: responseLanguage, notFoundAnswer });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    let openAiResponse;

    try {
      openAiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    "Produktinformationen:",
                    context,
                    conversationContext ? "\nBisheriger Chatverlauf zur Referenz:" : "",
                    conversationContext,
                    "",
                    `Kundenfrage: ${effectiveQuestion}`,
                  ].join("\n"),
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "product_info_answer",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  answer: { type: "string" },
                  found: { type: "boolean" },
                },
                required: ["answer", "found"],
              },
            },
          },
          max_output_tokens: 360,
        }),
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return jsonError(timeoutError, 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text().catch(() => "");
      console.error("OpenAI product info request failed:", openAiResponse.status, errorText);
      return jsonError(unavailableError, 503);
    }

    const responsePayload = await openAiResponse.json();
    const parsed = parseAssistantJson(extractResponseText(responsePayload), responseLanguage);
    const normalizedAnswer = stripAffirmativeLead(parsed.answer, question);
    const sanitizedAnswer = parsed.found
      ? sanitizeUnsupportedFollowUps(normalizedAnswer, usableContextItems, responseLanguage)
      : normalizedAnswer;

    return NextResponse.json({ ...parsed, answer: sanitizedAnswer || parsed.answer });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const failedError = FAILED_ERROR_BY_LANGUAGE[responseLanguage] || FAILED_ERROR_BY_LANGUAGE.en;
    console.error("Product info assistant failed:", error);
    return jsonError(status === 429 ? error.message : failedError, status);
  }
}
