import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";
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
  de: "Fuer dieses Produkt ist noch keine Produktinformation verfuegbar.",
  en: "No product information is available for this product yet.",
};

const TIMEOUT_ERROR_BY_LANGUAGE = {
  de: "Die Anfrage dauert zu lange. Bitte versuchen Sie es erneut.",
  en: "The request is taking too long. Please try again.",
};

const UNAVAILABLE_ERROR_BY_LANGUAGE = {
  de: "Der Produktassistent ist voruebergehend nicht verfuegbar.",
  en: "The product assistant is temporarily unavailable.",
};

const FAILED_ERROR_BY_LANGUAGE = {
  de: "Die Produktfrage konnte nicht beantwortet werden.",
  en: "The product question could not be answered.",
};

const DEFAULT_WARRANTY_FACT = "Warranty: 24-month (2-year)";
const WARRANTY_QUESTION_PATTERN = /\b(warranty|warranties|guarantee|guarantees|garantie|garantien)\b/i;

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

function withDefaultWarrantyFact(item) {
  const facts = normalizeFacts(item?.productInfoKeyFacts);
  const hasWarrantyFact = facts.some((fact) => /^(warranty|garantie)\s*:/i.test(fact));

  return {
    ...item,
    productInfoKeyFacts: hasWarrantyFact ? facts : [...facts, DEFAULT_WARRANTY_FACT],
  };
}

function normalizeContextItems(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_ITEM_IDS)
    .map((item) => ({
      name: String(item?.name || "").trim(),
      code: String(item?.code || "").trim(),
      productInfoCode: String(item?.productInfoCode || item?.code || "").trim(),
      productInfoSummary: String(item?.productInfoSummary || "").trim(),
      productInfoKeyFacts: normalizeFacts(item?.productInfoKeyFacts),
      productInfoExtractedText: String(item?.productInfoExtractedText || "").trim(),
    }))
    .filter(
      (item) =>
        item.name
        && (
          item.productInfoSummary
          || item.productInfoKeyFacts.length
          || item.productInfoExtractedText
        ),
    );
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

function getWarrantyValue(item) {
  return getFactValue(item, /^(warranty|garantie)\s*:/i) || "24-month (2-year)";
}

function getEnergyClassValue(item) {
  const factValue =
    getFactValue(item, /^(energieklasse|energy\s+(?:efficiency\s+)?class)\s*:/i)
    || getFactValue(item, /^class\s*:/i);
  if (factValue) return factValue;

  const sourceText = getCombinedItemInfoText(item);
  const match = sourceText.match(
    /\b(?:energieklasse|energy\s+(?:efficiency\s+)?class)\s*[:\-]?\s*([A-G](?:\+\+?)?)\b/i,
  );
  return match ? match[1].toUpperCase() : "";
}

function getAnnualConsumptionValue(item) {
  const sourceText = getCombinedItemInfoText(item);
  const factValue =
    getFactValue(item, /^(jahresverbrauch|annual consumption)\s*:/i)
    || getFactValue(item, /^energy consumption\s*:/i);
  if (factValue) return factValue;

  const perCycleMatch = sourceText.match(/\b\d+(?:[.,]\d+)?\s*kWh\s*\/\s*100\s*(?:Zyklen|cycles)\b/i);
  if (perCycleMatch) {
    return perCycleMatch[0].replace(/\s+/g, " ").trim();
  }

  const annualMatch = sourceText.match(/\b\d+(?:[.,]\d+)?\s*kWh\b/i);
  return annualMatch ? annualMatch[0].replace(/\s+/g, " ").trim() : "";
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

function hasExplicitMountingDistanceInfo(item) {
  const sourceText = getCombinedItemInfoText(item);
  const mentionsMountingDistance =
    /(mounting\s+distance|required\s+distance|distance\s+above\s+the\s+hob|mindestabstand|montageabstand|abstand[^\n]*(?:kochfeld|hob|herd|gas|elektro))/i.test(sourceText)
    || /(?:kochfeld|hob|herd|gas|elektro)[^\n]*abstand/i.test(sourceText);
  const hasNumericDistance = /\b\d{2,4}(?:[.,]\d+)?\s*(?:mm|cm)\b/i.test(sourceText);

  return mentionsMountingDistance && hasNumericDistance;
}

function hasExplicitDimensionInfo(item) {
  return Boolean(extractInstallationDimensions(item));
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

  if (/(noise|geraeusch|geräusch|db\b|dba\b)/i.test(value) && !items.some(extractNoiseValue)) {
    return true;
  }

  if (/(energy|energie|verbrauch|consumption|kwh)/i.test(value) && !items.some((item) => getEnergyClassValue(item) || getAnnualConsumptionValue(item))) {
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

function getPublicItemName(item, language) {
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
      ? "Geschirrspueler"
      : "Dishwasher";
  }

  if (/\bKGC\b/i.test(explicitModel) || /refrigerator|fridge|kuehl|kÃƒÂ¼hl|gefrier/i.test(rawName)) {
    return language === "de"
      ? "Kuehl-Gefrierkombination"
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
      ? "Geschirrspueler"
      : "Dishwasher";
  }

  if (/refrigerator|fridge|kuehl|kÃ¼hl|gefrier/i.test(sourceText) || /refrigerator|fridge|kuehl|kÃ¼hl|gefrier/i.test(rawName)) {
    return language === "de"
      ? "Kuehl-Gefrierkombination"
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
  const sourceText = getCombinedItemInfoText(item);
  const explicitModel = extractKnownModel(item);

  if (/washing machine|waschmaschine/i.test(sourceText)) {
    return language === "de"
      ? `Waschmaschine${explicitModel ? ` (${explicitModel})` : ""}`
      : `Washing machine${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (/dishwasher|geschirrsp/i.test(sourceText)) {
    return language === "de"
      ? `Geschirrspueler${explicitModel ? ` (${explicitModel})` : ""}`
      : `Dishwasher${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (/refrigerator|fridge|kuehl|kühl|gefrier/i.test(sourceText)) {
    return language === "de"
      ? `Kuehl-Gefrierkombination${explicitModel ? ` (${explicitModel})` : ""}`
      : `Refrigerator${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  if (isExtractorHoodItem(item)) {
    return formatExtractorHoodAnswerName(item, language, explicitModel);
  }

  if (/oven and hob|backofen|oven|kochfeld|hob/i.test(sourceText)) {
    return language === "de"
      ? `Backofen${explicitModel ? ` (${explicitModel})` : ""}`
      : `Built-in oven${explicitModel ? ` (${explicitModel})` : ""}`;
  }

  return getPublicItemName(item, language);
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

function answerFromExplicitMultiItemEnergyFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;

  if (!/(e[\s-]?label|energy label|energielabel|energieklasse|energy\s+(?:efficiency\s+)?class)/i.test(value)) {
    return null;
  }

  const includeConsumption = /(consumption|verbrauch|kwh)/i.test(value);
  const entries = items
    .map((item) => {
      const name = getEnergyAnswerItemName(item, language);
      const hasELabel = hasELabelDocument(item);
      const energyClass = getEnergyClassValue(item);
      const annualConsumption = getAnnualConsumptionValue(item);

      if (!hasELabel && !energyClass) return null;

      if (language === "de") {
        const details = [];
        details.push(hasELabel ? "E-Label verfuegbar" : "kein E-Label gefunden");
        details.push(energyClass ? `Energieklasse ${energyClass}` : "keine dokumentierte Energieklasse gefunden");
        if (includeConsumption && annualConsumption) {
          details.push(`Verbrauch ${annualConsumption}`);
        }
        return `- ${name}: ${details.join(", ")}`;
      }

      const details = [];
      details.push(hasELabel ? "E-label available" : "no E-label found");
      details.push(energyClass ? `energy class ${energyClass}` : "no documented energy class found");
      if (includeConsumption && annualConsumption) {
        details.push(`consumption ${annualConsumption}`);
      }
      return `- ${name}: ${details.join(", ")}`;
    })
    .filter(Boolean);

  if (!entries.length) {
    return { answer: notFoundAnswer, found: false };
  }

  return {
    answer: language === "de"
      ? `Ja, bei den ausgewaehlten Produkten habe ich folgende Energiedaten gefunden:\n${entries.join("\n")}\nMoechtest du, dass ich dir auch den Verbrauch pro Produkt dazuschreibe?`
      : `Yes, here is the documented energy information for the selected products:\n${entries.join("\n")}\nWould you like me to add the consumption figures for each product as well?`,
    found: true,
  };
}

function answerFromExplicitMultiItemFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;

  if (WARRANTY_QUESTION_PATTERN.test(value)) {
    const entries = items
      .map((item) => `${getWarrantyAnswerItemName(item, language)}: ${getWarrantyValue(item)}`)
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `Die dokumentierte Garantie fuer die ausgewaehlten Produkte ist:\n- ${entries.join("\n- ")}`
        : `The documented warranty for the selected products is:\n- ${entries.join("\n- ")}`,
      found: true,
    };
  }

  if (/(noise|geraeusch|geräusch|db\b|dba\b)/i.test(value)) {
    const entries = items
      .map((item) => {
        const noise = extractNoiseValue(item);
        if (!noise) return null;
        return `${getPublicItemName(item, language)}: ${noise}`;
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `Die dokumentierten Geraeuschwerte sind: ${entries.join(" ; ")}.`
        : `The documented noise values are: ${entries.join(" ; ")}.`,
      found: true,
    };
  }

  if (/(installation dimensions|dimensions|measurements|size|abmessungen|ma[sß]e|nischenmass|nischenma[sß]e|einbaumass|einbauma[sß]e)/i.test(value)) {
    const entries = items
      .map((item) => {
        const dimensions = extractInstallationDimensions(item);
        if (!dimensions) return null;
        return `${getPublicItemName(item, language)}: ${dimensions}`;
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `Ich habe nur folgende dokumentierte Geraete- oder Nischenmasse gefunden: ${entries.join(" ; ")}.`
        : `I found only these documented appliance or niche dimensions: ${entries.join(" ; ")}.`,
      found: true,
    };
  }

  return null;
}

function extractKnownModel(item) {
  const explicitModel = getFactValue(item, /^model\s*:/i);
  if (explicitModel) return explicitModel;

  const sourceText = getCombinedItemInfoText(item);
  const patterns = [
    /\bKHF\s*664\s*611\s*S(?:\s*Stripe\s*X)?\b/i,
    /\bFH\s*664\s*621\s*S\b/i,
    /\bEBX\s*943\s*600\s*S\b/i,
    /\bOL-KMI\s*754\s*000\s*E\b/i,
    /\bKGC\s*15495\s*S\b/i,
    /\bA-EGSPV597210\b/i,
  ];

  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match) {
      return match[0].replace(/\s+/g, " ").trim();
    }
  }

  const productNameLine = String(item?.productInfoExtractedText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(produktname|product name|modell|model):/i.test(line));

  if (!productNameLine) return "";

  return productNameLine.replace(/^(produktname|product name|modell|model):\s*/i, "").trim();
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
      return `- ${getModelAnswerItemName(item, language)}: ${model}`;
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
      ? `Hier sind alle Modelle aus den verfuegbaren Produktinformationen:\n${entries.join("\n")}`
      : `Here are all the models listed in the available product information:\n${entries.join("\n")}`,
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
          ? `Ja. Fuer dieses Produkt gibt es ein E-Label PDF.`
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
    const warranty = getWarrantyValue(item);
    return {
      answer: language === "de"
        ? `Die Garantie betraegt ${warranty}.`
        : `The warranty is ${warranty}.`,
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
    const answer = String(parsed?.answer || "").trim();
    const found = parsed?.found === true && answer && answer !== notFoundAnswer;
    return {
      answer: found ? answer : notFoundAnswer,
      found,
    };
  } catch {
    if (cleaned && cleaned !== notFoundAnswer) {
      return {
        answer: cleaned.replace(/^answer:\s*/i, "").trim(),
        found: true,
      };
    }
    return {
      answer: notFoundAnswer,
      found: false,
    };
  }
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
    responseLanguage = normalizeLanguage(body?.language);
    const itemIds = normalizeItemIds(body?.itemIds);
    const contextItems = normalizeContextItems(body?.contextItems);
    const conversationMessages = normalizeConversationMessages(body?.conversationMessages);
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

    const items = contextItems.length
      ? contextItems
      : await prisma.kitchenItem.findMany({
        where: { id: { in: itemIds }, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          productInfoSummary: true,
          productInfoKeyFacts: true,
          productInfoExtractedText: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });

    const usableContextItems = items
      .map(withDefaultWarrantyFact)
      .filter(hasUsableProductInfo);
    if (!usableContextItems.length) {
      return NextResponse.json({ answer: noInfoAnswer, found: false });
    }

    const multiItemModelAnswer = answerFromExplicitMultiItemModels(question, usableContextItems, responseLanguage);
    if (multiItemModelAnswer) {
      return NextResponse.json(multiItemModelAnswer);
    }

    const multiItemEnergyAnswer = answerFromExplicitMultiItemEnergyFacts(question, usableContextItems, responseLanguage);
    if (multiItemEnergyAnswer) {
      return NextResponse.json(multiItemEnergyAnswer);
    }

    const multiItemStructuredAnswer = answerFromExplicitMultiItemFacts(question, usableContextItems, responseLanguage);
    if (multiItemStructuredAnswer) {
      return NextResponse.json(multiItemStructuredAnswer);
    }

    const structuredAnswer = answerFromStructuredFacts(question, usableContextItems, responseLanguage);
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
    const instructions = [
      "You are a product information assistant for Fragmento kitchen orders.",
      "Answer only using the provided product information.",
      "Recent chat messages may be used only to understand follow-up wording, pronouns, and the product/topic the customer is referring to.",
      "Do not treat recent chat messages as product facts; product facts must come from the provided product information.",
      "Do not use general knowledge.",
      "Do not guess.",
      "Do not infer dimensions, measurements, niche sizes, or noise levels from catalog names, UI labels, or codes.",
      "Use dimensions, measurements, installation sizes, and noise values only when they are explicitly present in the provided summary, key facts, or PDF text.",
      `The customer interface language is ${LANGUAGE_LABELS[responseLanguage] || LANGUAGE_LABELS.en}; answer in that language.`,
      "Prefer natural product names in answers. Do not mention internal product codes unless the customer explicitly asks for a code, model, or article number.",
      "If the customer asks for the product name, model, type, or what the product is, use only the explicit product name, model, type, code, summary, or key facts from the provided product information.",
      "If the customer asks whether a product has a feature, capability, function, or mode, answer yes when that feature is explicitly listed in the summary, key facts, or PDF text, and then briefly cite the matching detail.",
      "Treat close wording matches as valid support. For example, if the documentation mentions a timer, Steam Clean, child safety lock, booster, pot detection, or similar feature wording, answer based on that explicit mention.",
      "When the answer is available, give a direct answer first and include the most relevant concrete specifications or features from the provided information.",
      "For yes/no questions, start with a direct yes or no, then add one short supporting sentence from the provided information.",
      "If multiple relevant specs are present, prefer dimensions, capacity, energy class, controls, functions, and included parts.",
      "If the context includes multiple products, answer for the product that best matches the question and name that product clearly when useful.",
      "When mentioning multiple products, models, or several specifications, format the answer with line breaks so each product or major point appears on its own line.",
      "Use short readable blocks instead of one long paragraph. Lists may use hyphens or plain line breaks.",
      "Write like a helpful sales advisor: natural, warm, and concise, but never pushy or verbose.",
      "When the answer is found, end with one short relevant follow-up question or suggestion that helps continue the conversation.",
      "Only offer a follow-up topic when the provided product information contains explicit support for that topic.",
      "Do not offer mounting distances, installation distances, dimensions, noise values, or energy data unless those exact details are present in the provided product information.",
      "Keep that follow-up to a single short sentence, and do not add it when the answer is not found or when the customer only asks for a code or model number.",
      `If the answer is not clearly supported by the provided product information, answer exactly: "${notFoundAnswer}"`,
      `Keep answers concise but substantive, customer-friendly, and in ${LANGUAGE_LABELS[responseLanguage] || LANGUAGE_LABELS.en}.`,
      'Return only valid JSON with this shape: {"answer":"string","found":boolean}.',
      `Set found to false whenever the answer is "${notFoundAnswer}".`,
    ].join("\n");

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
                    `Kundenfrage: ${question}`,
                  ].join("\n"),
                },
              ],
            },
          ],
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
    const sanitizedAnswer = parsed.found
      ? sanitizeUnsupportedFollowUps(parsed.answer, usableContextItems, responseLanguage)
      : parsed.answer;

    return NextResponse.json({ ...parsed, answer: sanitizedAnswer || parsed.answer });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const failedError = FAILED_ERROR_BY_LANGUAGE[responseLanguage] || FAILED_ERROR_BY_LANGUAGE.en;
    console.error("Product info assistant failed:", error);
    return jsonError(status === 429 ? error.message : failedError, status);
  }
}
