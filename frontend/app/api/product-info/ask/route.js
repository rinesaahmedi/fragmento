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
  de: "Dazu finde ich in den verfügbaren Produktinformationen keine eindeutig dokumentierte Angabe.",
  en: "I could not find that information in the product documentation.",
};

const EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE = {
  de: "Diese Information ist in den verfügbaren Produktinformationen nicht eindeutig dokumentiert.",
  en: "I could not find that information in the product documentation.",
};

const NO_INFO_ANSWER_BY_LANGUAGE = {
  de: "Für dieses Produkt sind aktuell noch keine Produktinformationen verfügbar.",
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
const ENERGY_QUESTION_PATTERN = /\b(e[\s-]?labels?|energy labels?|energielabels?|energieeffizienzklassen?|energieklassen?|energieklasse|energie\s+klasse|energy\s+(?:efficiency\s+)?(?:class(?:es)?|classe|klass|klasse)|energy\s+klasse|energie\s+class(?:e)?|energj|what\s+energy)\b/i;

const MAX_QUESTION_LENGTH = 500;
const MAX_ITEM_IDS = 10;
const MAX_CONVERSATION_MESSAGES = 6;
const MAX_CONVERSATION_MESSAGE_LENGTH = 900;
const MAX_CONTEXT_CHARS = 12000;
const OPENAI_TIMEOUT_MS = 20000;

const GREETING_HELPER_MESSAGE_BY_LANGUAGE = {
  de: "Hallo! Ich unterstütze Sie gerne bei den ausgewählten Produkten \u2014 zum Beispiel bei Energieeffizienzklasse, Maßen, Lautstärke, Verbrauch, Funktionen oder Modellnamen. Welche Information benötigen Sie?",
  en: "Hello! I can help you with the selected products \u2014 for example energy class, dimensions, noise level, consumption, functions, or model names. What would you like to know?",
};

const CLARIFICATION_QUESTION_BY_LANGUAGE = {
  de: "Gerne \u2014 worüber möchten Sie mehr erfahren? Ich kann zum Beispiel Energieeffizienzklasse, Maße, Lautstärke, Verbrauch, Funktionen oder Modellnamen erklären.",
  en: "What would you like to know about the selected products: energy class, dimensions, noise level, consumption, functions, or model names?",
};

const HELP_TOPIC_MESSAGE_BY_LANGUAGE = {
  de: "Ich kann Ihnen bei Energieeffizienzklasse, Verbrauch, Lautstärke, Maßen, Einbaudetails, Kapazität, Programmen oder Funktionen helfen. Welche Information möchten Sie prüfen?",
  en: "I can help with energy class, consumption, noise level, dimensions, installation details, capacity, programs, or features. Which topic would you like to check?",
};

const AFFIRMATIVE_CLARIFICATION_BY_LANGUAGE = {
  de: "Gerne \u2014 welches Gerät oder welche Information meinen Sie?",
  en: "Please name the product or information you mean.",
};

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

function normalizeConversationalPrompt(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[?!.,:;]+$/g, "")
    .replace(/\s+/g, " ");
}

const TOPIC_PATTERNS = {
  energy: /\b(energy\s+(?:efficiency\s+)?class(?:es)?|energy\s+(?:classe|klass|klasse)|energy labels?|e[\s-]?labels?|energie\s+(?:class(?:e)?|klasse)|energieeffizienzklassen?|energieklassen?|energieklasse|energielabels?|energj|what\s+energy|label|classe énergétique|classe energetique|klasa e energjisë|klasa e energjise)\b/i,
  consumption: /\b(consumption|energy use|electricity cost|electricity costs|cost matters|uses the most energy|use the most energy|kwh|water|watter|water use|liters?|litres?|\bl\b|verbrauch|energieverbrauch|stromverbrauch|wasserverbrauch|stromkosten|energiekosten|verbraucht)\b/i,
  noise: /\b(noise|quietest|loudest|decibels?|dezi(?:bel)?|dezibel|db|dba|dB\(A\)|sound|loud|geräusch|geraeusch|lautstärke|lautstaerke|luftschallemission|leisesten|lautesten|laut)\b/i,
  dimensions: /\b(dimensions|dimesnions|dimensons|dimentions|dimmensions|measurements|mesurements|size|how big|width|height|depth|installation size|required installation space|niche size|ma[sß]e|masse|abmessungen|breite|höhe|hoehe|tiefe|einbauma[sß]e|nischenma[sß]e)\b/i,
  features: /\b(functions?|features?|programs?|programmes?|capacity|load capacity|place settings|cooking zones?|zones?|kg|kilograms?|kilos?|steam clean|timer|child safety|booster|pot detection|programme|programme?|funktionen|kapazität|kapazitaet|füllmenge|fuellmenge|fassungsvermögen|fassungsvermoegen|beladung|gewicht|kochzonen?|kindersicherung|topferkennung)\b/i,
};

function detectTopic(question) {
  const value = String(question || "");
  if (/(opendry|open\s*dry|startzeit|zeitvorwahl|extra\s*trocknen|extra\s*dry|halbbeladung|aquastop|aquastopp)/i.test(value)) return "features";
  if (TOPIC_PATTERNS.energy.test(value)) return "energy";
  if (TOPIC_PATTERNS.consumption.test(value)) return "consumption";
  if (TOPIC_PATTERNS.noise.test(value)) return "noise";
  if (TOPIC_PATTERNS.dimensions.test(value)) return "dimensions";
  if (TOPIC_PATTERNS.features.test(value)) return "features";
  if (WARRANTY_QUESTION_PATTERN.test(value)) return "warranty";
  return "";
}

function isOverviewRequest(question) {
  return /(overview|summary|summarize|selected products|explain the selected products briefly|give me an overview|which products are selected|überblick|ueberblick|zusammenfassung|welche produkte sind ausgewählt|welche produkte sind ausgewaehlt|ausgewählten geräte kurz|ausgewaehlten geraete kurz|erklären sie mir die ausgewählten geräte kurz|erklaeren sie mir die ausgewaehlten geraete kurz)/i.test(String(question || ""));
}

function isHelpRequest(question) {
  return /(what can you help me with|how can you help|what do you do|i need some info about (?:the )?(?:appliances|products)|i need information about (?:the )?(?:appliances|products)|need some info about (?:the )?(?:appliances|products)|wobei können sie mir helfen|wobei koennen sie mir helfen|womit können sie helfen|womit koennen sie helfen|ich brauche.*(?:info|informationen).*(?:geräte|geraete|produkte)|ich benötige.*(?:info|informationen).*(?:geräte|geraete|produkte))/i.test(String(question || ""));
}

function isSimpleGreeting(question) {
  const value = normalizeConversationalPrompt(question);
  return /^(hello|hi|hey|good morning|hallo|guten morgen|guten tag)$/.test(value);
}

function hasClearProductAssistantTopic(value) {
  return Boolean(detectTopic(value) || isOverviewRequest(value) || /(model|modell|product name|produktname|code|article|artikel)/i.test(value));
}

function isIncompleteVaguePrompt(question) {
  const value = normalizeConversationalPrompt(question);
  if (!value) return false;

  const exactPrompts = [
    "tell me something about",
    "tell me about",
    "what about",
    "can you tell me",
    "erzähl mir etwas über",
    "erzaehl mir etwas ueber",
    "kannst du mir etwas sagen über",
    "kannst du mir etwas sagen ueber",
    "sag mir etwas zu",
    "was ist mit",
  ];
  if (exactPrompts.includes(value)) return true;

  const vaguePrefix = /^(tell me something about|tell me about|what about|can you tell me|erzähl mir etwas über|erzaehl mir etwas ueber|kannst du mir etwas sagen über|kannst du mir etwas sagen ueber|sag mir etwas zu|was ist mit)\s+(.+)$/i;
  const remainder = value.match(vaguePrefix)?.[2] || "";
  if (!remainder) return false;

  if (/^(it|this|that|them|the product|the products|es|das|dies|diese|den produkten?|dem produkt)$/.test(remainder)) {
    return true;
  }

  return !hasClearProductAssistantTopic(remainder);
}

function classifyProductAssistantIntent(question) {
  const value = String(question || "");
  const topic = detectTopic(value);
  const comparison = /(which|what|welches|welcher|welche).*(quietest|loudest|uses the most|use the most|leisesten|lautesten|verbraucht am meisten|am meisten energie)|quietest|loudest|leisesten|lautesten|uses the most energy|verbraucht am meisten energie/i.test(value);
  const recommendation = /(best|recommend|suitable|small apartment|should i look at first|should i choose|which one should i choose|am besten|empfehlen|geeignet|kleine wohnung|welches.*wählen|welches.*waehlen|welches.*zuerst)/i.test(value);
  const allProducts = /(all selected|all products|all appliances|for all|alle produkte|alle ausgewählten|alle ausgewaehlten|alle geräte|alle geraete|ausgewählten produkte|ausgewaehlten produkte)/i.test(value);
  const requestedSubProduct = detectRequestedSubProduct(value);

  return {
    kind: isSimpleGreeting(value)
      ? "greeting"
      : isHelpRequest(value)
        ? "help"
        : isIncompleteVaguePrompt(value)
          ? "incomplete"
          : isOverviewRequest(value) && !topic
            ? "overview"
            : comparison
              ? "comparison"
              : recommendation
                ? "recommendation"
                : topic
                  ? "fact"
                  : "unknown",
    topic,
    scope: requestedSubProduct ? "product" : (allProducts ? "all" : "selected"),
    requestedSubProduct,
  };
}

function getConversationalRouteAnswer(question, language) {
  const intent = classifyProductAssistantIntent(question);
  if (intent.kind === "greeting") {
    return {
      answer: GREETING_HELPER_MESSAGE_BY_LANGUAGE[language] || GREETING_HELPER_MESSAGE_BY_LANGUAGE.en,
      found: false,
    };
  }

  if (intent.kind === "help") {
    return {
      answer: HELP_TOPIC_MESSAGE_BY_LANGUAGE[language] || HELP_TOPIC_MESSAGE_BY_LANGUAGE.en,
      found: false,
    };
  }

  if (intent.kind === "incomplete") {
    return {
      answer: CLARIFICATION_QUESTION_BY_LANGUAGE[language] || CLARIFICATION_QUESTION_BY_LANGUAGE.en,
      found: false,
    };
  }

  return null;
}

function getMetaOrUnsupportedRouteAnswer(question, language) {
  const value = String(question || "").trim().toLowerCase();

  if (
    /(guess|infer|estimate|assume|typical|general knowledge|schätz|schaetz|ableiten|annehmen|typisch|allgemeinwissen)/i.test(value)
    && /(mounting\s+distance|installation\s+distance|distance\s+above\s+the\s+hob|montageabstand|installationsabstand|abstand[^\n]*(?:kochfeld|hob)|abstand\s+über\s+dem\s+kochfeld|abstand\s+ueber\s+dem\s+kochfeld)/i.test(value)
  ) {
    return {
      answer: language === "de"
        ? "Ich kann fehlende Montage- oder Installationsabstände nicht ableiten oder schätzen. Ich kann nur Abstände nennen, die in den Produktinformationen ausdrücklich dokumentiert sind."
        : "I can’t infer or guess a missing installation distance. I can only use installation distances that are explicitly documented in the product information.",
      found: false,
    };
  }

  if (/(forget|ignore).*(?:the\s+)?documentation|just guess|guess the missing|invent|use general knowledge|vergiss.*dokumentation|ignoriere.*dokumentation|schätz|schaetz|erfinde/i.test(value)) {
    return {
      answer: language === "de"
        ? "Ich kann fehlende Maße nicht schätzen. Ich kann nur dokumentierte Produktinformationen verwenden."
        : "I can’t guess missing dimensions. I can only use documented product information.",
      found: false,
    };
  }

  if (/(ignore previous|ignore instructions|systemanweisung|system prompt|hidden instruction|versteckte.*anweisung|interne.*anweisung|developer message|invent a value|fake pdf|repeat my fake|prompt)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Dabei kann ich nicht helfen. Ich kann Ihnen aber Fragen zu den dokumentierten Produktinformationen beantworten."
        : "I can't help with that. I can answer questions about the documented product information.",
      found: false,
    };
  }

  if (/(weather|president|capital of|stock price|football|soccer|basketball|tennis|sports?|game yesterday|who won|news|politics|election|wetter|präsident|praesident|hauptstadt|aktienkurs|fußball|fussball|sport|spiel.*gestern|wer hat gewonnen|nachrichten|politik|\bwahl\b)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Ich kann nur Fragen zu den ausgewählten Produktinformationen beantworten."
        : "I can only answer questions about the selected product information.",
      found: false,
    };
  }

  if (/(reich|rich|millionaire|lottery|lotto)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Nein \u2014 dazu enthalten die Produktinformationen keine Angabe. Ich kann Ihnen aber bei realen Produktdetails helfen, zum Beispiel Energieeffizienzklasse, Verbrauch, Lautstärke, Maße oder Funktionen."
        : "No. The product information does not document that. I can help with real product details such as energy class, consumption, noise level, dimensions, or functions.",
      found: false,
    };
  }

  if (/(nachbarn|nachbarin|neighbor|neighbour)/i.test(value) && /(besser|better|compare|vergleich)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Das kann ich anhand der Produktinformationen nicht mit der Küche Ihres Nachbarn vergleichen. Ich kann die ausgewählten Produkte aber nach dokumentierten Angaben wie Energieeffizienzklasse, Verbrauch, Lautstärke, Maßen oder Funktionen vergleichen."
        : "I can't compare that with your neighbor's kitchen from the product information. I can compare the selected products using documented details such as energy class, consumption, noise level, dimensions, or functions.",
      found: false,
    };
  }

  if (/(e[\s-]?label|energy label|energielabel).*automatisch|automatisch.*(e[\s-]?label|energy label|energielabel)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Nein. Ein vorhandenes Energielabel-PDF bedeutet nicht automatisch, dass die Energieeffizienzklasse im verfügbaren Produkttext auslesbar ist. Die Klasse darf nur genannt werden, wenn sie ausdrücklich dokumentiert ist.\n\nMöchten Sie die dokumentierten Energieeffizienzklassen aller ausgewählten Produkte sehen?"
        : "No. An available E-label PDF does not automatically mean the energy class is readable in the available product text. The class may only be stated when it is explicitly documented.\n\nWould you like to see the documented energy classes for all selected products?",
      found: false,
    };
  }

  return null;
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
    getFactValue(item, /^(energieeffizienzklasse|energieklasse|energy\s+(?:efficiency\s+)?class)\s*:/i)
    || getFactValue(item, /^class\s*:/i);
  if (factValue) return factValue;

  const match = getItemInfoLines(item)
    .map((line) => line.match(/\b(?:energieeffizienzklasse|energieklasse|energy\s+(?:efficiency\s+)?class|energy\s+class)\s*[:\-]?\s*([A-G](?:\+\+?)?)\b/i))
    .find(Boolean);
  return match ? match[1].toUpperCase() : "";
}

function getAnnualConsumptionValue(item) {
  const factValue =
    getFactValue(item, /^(jahresverbrauch|annual consumption|energy consumption|energieverbrauch)\s*:/i);
  if (factValue) return factValue;

  const factLine = getDocumentedFactLines(item).find((entry) =>
    /(jahresverbrauch|annual consumption|energy consumption|energieverbrauch)/i.test(entry)
    && /\b\d+(?:[.,]\d+)?\s*kWh\b/i.test(entry),
  );
  if (factLine) {
    const ovenMatch = factLine.match(/\b\d+(?:[.,]\d+)?\s*kWh\s*(?:conventional|konventionell)?\s*\/\s*\d+(?:[.,]\d+)?\s*kWh\s*(?:hot air|heißluft|heissluft)?\b/i);
    if (ovenMatch) return ovenMatch[0].replace(/\s+/g, " ").trim();

    const factMatch = factLine.match(/\b\d+(?:[.,]\d+)?\s*kWh(?:\s*\/\s*(?:100\s*(?:Zyklen|cycles)|1000\s*h|Jahr|year))?\b/i);
    if (factMatch) return factMatch[0].replace(/\s+/g, " ").trim();
  }

  const line = getItemInfoLines(item).find((entry) =>
    /(jahresverbrauch|jährlicher energieverbrauch|jaehrlicher energieverbrauch|annual consumption|energy consumption|energieverbrauch|verbrauch[^\n]*(?:100\s*(?:zyklen|cycles)|jahr|year))/i.test(entry)
    && /\b\d+(?:[.,]\d+)?\s*kWh(?:\s*\/\s*(?:100\s*(?:Zyklen|cycles)|1000\s*h|Jahr|year))?\b/i.test(entry),
  );
  const pairedMatch = line?.match(/\b\d+(?:[.,]\d+)?\s*kWh\s*\/\s*\d+(?:[.,]\d+)?\s*kWh\b/i);
  if (pairedMatch) return pairedMatch[0].replace(/\s+/g, " ").trim();

  const match = line?.match(/\b\d+(?:[.,]\d+)?\s*kWh(?:\s*\/\s*(?:100\s*(?:Zyklen|cycles)|1000\s*h|Jahr|year))?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function getWaterConsumptionValue(item) {
  const factValue =
    getFactValue(item, /^(wasserverbrauch|water consumption)\s*:/i);
  if (factValue) return factValue;

  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(item), item, "en");
  const combinedLine = getItemInfoLines(item).find((entry) =>
    typeLabel === "Dishwasher"
    && /\b\d+(?:[.,]\d+)?\s*l\s*\/\s*zyklus\b/i.test(entry),
  );
  if (combinedLine) {
    const combinedMatch = combinedLine.match(/\b\d+(?:[.,]\d+)?\s*l\s*\/\s*zyklus\b/i);
    if (combinedMatch) return combinedMatch[0].replace(/\s+/g, " ").trim();
  }

  const line = getItemInfoLines(item).find((entry) =>
    /(wasserverbrauch|water consumption|water use)/i.test(entry)
    && /\b\d+(?:[.,]\d+)?\s*(?:l|liter|litre|liters|litres)(?:\s*\/\s*(?:zyklus|cycle|spülgang|spuelgang))?\b/i.test(entry),
  );
  const match = line?.match(/\b\d+(?:[.,]\d+)?\s*(?:l|liter|litre|liters|litres)(?:\s*\/\s*(?:zyklus|cycle|spülgang|spuelgang))?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function getKilogramSpec(item) {
  const extractValue = (value) => {
    const match = String(value || "").match(/\b\d+(?:[.,]\d+)?\s*kg\b/i);
    return match ? match[0].replace(/\s+/g, " ").trim() : "";
  };
  const normalizeLabel = (source, language) => {
    if (/(weight|gewicht)/i.test(source)) {
      return language === "de" ? "Gewicht" : "Weight";
    }
    return language === "de" ? "Kapazität" : "Capacity";
  };

  const fact = normalizeFacts(item?.productInfoKeyFacts)
    .map(normalizePublicProductBrand)
    .find((entry) =>
      /^(capacity|load capacity|füllmenge|fuellmenge|beladung|gewicht|weight)\s*:/i.test(entry)
      && /\b\d+(?:[.,]\d+)?\s*kg\b/i.test(entry),
    );
  if (fact) {
    return {
      value: extractValue(fact),
      labelSource: fact,
    };
  }

  const line = getItemInfoLines(item).find((entry) =>
    /(capacity|load|füllmenge|fuellmenge|beladung|gewicht|weight|waschkapazität|waschkapazitaet)/i.test(entry)
    && /\b\d+(?:[.,]\d+)?\s*kg\b/i.test(entry),
  );

  return {
    value: extractValue(line),
    labelSource: line || "",
    normalizeLabel,
  };
}

function formatKilogramSpecEntry(item, language) {
  const spec = getKilogramSpec(item);
  if (!spec.value) return "";

  const label = spec.normalizeLabel
    ? spec.normalizeLabel(spec.labelSource, language)
    : (/(weight|gewicht)/i.test(spec.labelSource) ? (language === "de" ? "Gewicht" : "Weight") : (language === "de" ? "Kapazität" : "Capacity"));
  return `${getPublicItemName(item, language)}: ${label}: ${spec.value}`;
}

function findLabeledInfoLine(item, labelPattern, valuePattern = /\S/) {
  const fact = normalizeFacts(item?.productInfoKeyFacts)
    .map(normalizePublicProductBrand)
    .find((entry) => labelPattern.test(entry) && valuePattern.test(entry));
  if (fact) return fact;

  return getItemInfoLines(item).find((entry) => labelPattern.test(entry) && valuePattern.test(entry)) || "";
}

function getLabelValueFromLine(line) {
  const value = String(line || "").trim();
  if (!value) return "";

  const parts = value.split(":");
  return (parts.length > 1 ? parts.slice(1).join(":") : value).trim();
}

function getLiterSpec(item) {
  const line = findLabeledInfoLine(
    item,
    /(water consumption|water use|wasserverbrauch|volume|capacity|nutzinhalt|volumen|inhalt|liter|litre|liter|l\b)/i,
    /\b\d+(?:[.,]\d+)?\s*(?:l|liter|litre|liters|litres)\b/i,
  );
  const match = line.match(/\b\d+(?:[.,]\d+)?\s*(?:l|liter|litre|liters|litres)\b/i);
  if (!match) return { value: "", labelSource: "" };

  return {
    value: match[0].replace(/\s+/g, " ").trim(),
    labelSource: line,
  };
}

function formatLiterSpecEntry(item, language) {
  const spec = getLiterSpec(item);
  if (!spec.value) return "";

  const label = /(water|wasser)/i.test(spec.labelSource)
    ? (language === "de" ? "Wasserverbrauch" : "Water consumption")
    : (language === "de" ? "Volumen/Kapazität" : "Volume/capacity");
  return `${getPublicItemName(item, language)}: ${label}: ${spec.value}`;
}

function getPlaceSettingsValue(item) {
  const line = findLabeledInfoLine(
    item,
    /(place settings?|gedecke|maßgedecke|massgedecke)/i,
    /\b\d{1,2}\b/,
  );
  const value = getLabelValueFromLine(line);
  const match = value.match(/\b\d{1,2}\b/);
  return match ? match[0] : "";
}

function formatPlaceSettingsEntry(item, language) {
  const value = getPlaceSettingsValue(item);
  if (!value) return "";

  const label = language === "de" ? "Maßgedecke" : "Place settings";
  return `${getPublicItemName(item, language)}: ${label}: ${value}`;
}

function getCookingZonesValue(item) {
  const line = findLabeledInfoLine(
    item,
    /(cooking zones?|zones?|kochzonen?|kochstellen)/i,
    /\b\d{1,2}\b/,
  );
  const value = getLabelValueFromLine(line);
  const match = value.match(/\b\d{1,2}\b/);
  return match ? match[0] : "";
}

function formatCookingZonesEntry(item, language) {
  const value = getCookingZonesValue(item);
  if (!value) return "";

  const label = language === "de" ? "Kochzonen" : "Cooking zones";
  return `${getPublicItemName(item, language)}: ${label}: ${value}`;
}

function getProgramOrFeatureValue(item, question = "") {
  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(item), item, "en");
  if (typeLabel === "Dishwasher") {
    const line = findLabeledInfoLine(item, /(programs?|programmes?|programme)/i, /\b\d{1,2}\b/);
    const match = line.match(/\b\d{1,2}\b/);
    if (match) return match[0];
  }

  if (/\b(functions?|features?|funktionen|zusatzfunktionen)\b/i.test(String(question || ""))) {
    const functionLine = findLabeledInfoLine(
      item,
      /(additional functions?|zusatzfunktionen|functions?|funktionen)/i,
      /:\s*\S/,
    );
    if (functionLine) return getLabelValueFromLine(functionLine);
  }

  const line = findLabeledInfoLine(
    item,
    /(programs?|programmes?|features?|functions?|programme|funktionen|zusatzprogramme|zusatzfunktionen|ausstattung)/i,
    /:\s*\S/,
  );
  return getLabelValueFromLine(line);
}

function normalizeProgramOrFeatureValue(value, language) {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  if (language !== "de") {
    text = text
      .replace(/\b(\d+)\s+Programme?\b/gi, "$1 programs")
      .replace(/\b(\d+)\s+Funktionen\b/gi, "$1 functions")
      .replace(/\b(\d+)\s*l\s+Volumen\b/gi, "$1 l capacity")
      .replace(/\bGarraumvolumen\b/gi, "oven capacity")
      .replace(/\bVolumen\b/gi, "capacity")
      .replace(/\bLED-Licht\b/gi, "LED light")
      .replace(/\bFlaschenregal\b/gi, "bottle rack")
      .replace(/\bGefrierschubladen\b/gi, "freezer drawers")
      .replace(/\bGefrierschublade\b/gi, "freezer drawer")
      .replace(/\bAusstattung\b/gi, "features")
      .replace(/\bFunktionen\b/gi, "functions")
      .replace(/\bProgramme\b/gi, "programs")
      .replace(/\bProgramm\b/gi, "program")
      .replace(/\bund\b/gi, "and")
      .replace(/\s*,\s*/g, ", ")
      .trim();
  }

  if (/^\d+$/.test(text)) {
    return language === "de" ? `${text} Programme` : `${text} programs`;
  }

  return text;
}

function formatProgramOrFeatureEntry(item, language, question = "") {
  const value = getProgramOrFeatureValue(item, question);
  if (!value) return "";

  const label = language === "de" ? "Programme/Funktionen" : "Programs/features";
  return `${getPublicItemName(item, language)}: ${label}: ${normalizeProgramOrFeatureValue(value, language)}`;
}

function getItemDocumentLabels(item) {
  return getProductInfoDocuments({ code: item?.productInfoCode || item?.code })
    .map((document) => String(document?.label || "").trim())
    .filter(Boolean);
}

function hasELabelDocument(item) {
  return getItemDocumentLabels(item).some((label) => /e[\s-]?label/i.test(label));
}

function answerFromELabelDocumentFacts(question, items, language) {
  const value = String(question || "");
  if (!/\b(?:e[\s-]?label|energy label|energielabel|label)\b/i.test(value)) {
    return null;
  }
  if (
    /\b(?:energy labels?|energielabels?)\b/i.test(value)
    && !/\b(?:has?|have|available|exists?|pdf|document|doc|file|datei|gibt|vorhanden)\b/i.test(value)
  ) {
    return null;
  }

  const scopedItems = scopeItemsForQuestion(items, question);
  const entries = scopedItems
    .map((item) => {
      if (!hasELabelDocument(item)) return null;
      return language === "de"
        ? `${getPublicItemName(item, language)}: Energielabel-PDF vorhanden`
        : `${getPublicItemName(item, language)}: E-label PDF available`;
    })
    .filter(Boolean);

  if (!entries.length) {
    return {
      answer: EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE[language] || EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE.en,
      found: false,
    };
  }

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Dokumentierte Energielabel-Dateien:", entries)
      : formatSectionWithBullets("Documented energy-label files:", entries),
    found: true,
  };
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
  const text = String(value || "").replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
  const compact = text.replace(/\s+/g, "").toUpperCase();

  if (/^FH664621[SE]$/.test(compact)) return "FH 664 621 S";
  if (/^KHF664611S/.test(compact)) return "KHF 664 611 S";
  if (/^EWA34660W$/.test(compact)) return "EWA 34660 W";
  if (/^EBX943600S$/.test(compact)) return "EBX 943 600 S";
  if (/^OL-KMI754000E$/.test(compact)) return "OL-KMI 754 000 E";
  if (/^KGC15495S$/.test(compact)) return "KGC 15495 S";
  if (/^OL-KGCN388140E$/.test(compact)) return "OL-KGCN 388140 E";
  if (/^KA220043_S3$/.test(compact)) return "KA220043_S3";
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
    return language === "de" ? "Einbaubackofen" : "Built-in oven";
  }
  if (compactModel === "OL-KMI754000E") {
    return language === "de" ? "Kochfeld" : "Hob";
  }
  if (/^(?:KGC15495S|OL-KGCN388140E)$/.test(compactModel)) {
    return language === "de" ? "Kühl-Gefrierkombination" : "Refrigerator-freezer";
  }

  if (compactModel === "KA220043_S3") {
    return language === "de" ? "LED-Beleuchtungsset" : "LED lighting set";
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
    return language === "de" ? "Einbaubackofen" : "Built-in oven";
  }
  if (/\bOL-KMI\s*754\s*000\s*E\b|hob|kochfeld/i.test(value)) {
    return language === "de" ? "Kochfeld" : "Hob";
  }
  if (/\b(?:KGC\s*15495\s*S|OL-KGCN\s*388140\s*E)\b|refrigerator|fridge|kuehl|kühl|gefrier/i.test(value)) {
    return language === "de" ? "Kühl-Gefrierkombination" : "Refrigerator-freezer";
  }

  if (/\bKA220043_S3\b|LED lighting set|LED-Beleuchtungsset|Beleuchtungsset/i.test(value)) {
    return language === "de" ? "LED-Beleuchtungsset" : "LED lighting set";
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
    .split(/\r?\n|\s*,\s+(?=(?:Gerätemaße|Geraetemaße|Geraetemasse|Nischenmaße|Nischenmasse|Einbaumaße|Einbaumasse|Ausschnittmaße|Ausschnittmasse|Dimensions|Appliance dimensions|Niche dimensions|Height|Höhe|Hoehe|Bauhöhe|Bauhoehe)\b)/i)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeIdenticalLeadingDimensionRange(value) {
  return String(value || "").replace(
    /^(\d+(?:[.,]\d+)?)\s*(?:-|–)\s*\1(?=\s*x\s*)/i,
    "$1",
  );
}

function getDocumentedFactLines(item) {
  return [
    ...normalizeFacts(item?.productInfoKeyFacts),
    ...String(item?.productInfoExtractedText || "").split(/\r?\n/),
  ]
    .map((line) => line.trim().replace(/^-\s*/, ""))
    .filter(Boolean);
}

function normalizeDimensionAxis(value) {
  return String(value || "")
    .replace(/\bH\s*x\s*B\s*x\s*T\b/i, "H x W x D")
    .replace(/\bB\s*x\s*T\b/i, "W x D")
    .replace(/\s*x\s*/gi, " x ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatEnglishSizeDimensionLabel(label, value) {
  const labelText = normalizeDimensionAxis(label);
  let valueText = normalizeDimensionAxis(value);
  const axisMatch =
    labelText.match(/\b(H\s*x\s*W\s*x\s*D|W\s*x\s*D)\b/i)
    || valueText.match(/^\s*(H\s*x\s*W\s*x\s*D|W\s*x\s*D)\b/i);
  const axis = axisMatch ? normalizeDimensionAxis(axisMatch[1]) : "";
  const unitMatch = labelText.match(/\((mm|cm)\)/i) || valueText.match(/\((mm|cm)\)/i) || valueText.match(/\b(mm|cm)\b\s*$/i);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : "";

  let baseLabel = "";
  if (/^Appliance dimensions/i.test(labelText)) baseLabel = "Appliance size";
  else if (/^Niche dimensions/i.test(labelText)) baseLabel = "Required installation space";
  else if (/^Installation dimensions/i.test(labelText)) baseLabel = "Required installation space";
  else if (/^Cut-out dimensions/i.test(labelText)) baseLabel = "Cut-out size";
  if (!baseLabel) return "";

  valueText = valueText
    .replace(/^\s*(H\s*x\s*W\s*x\s*D|W\s*x\s*D)\s*/i, "")
    .replace(/^\((mm|cm)\)\s*/i, "")
    .replace(/\s*\((mm|cm)\)\s*/i, " ")
    .replace(/\s*\b(mm|cm)\b\s*$/i, "")
    .replace(/[.;]\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return `${baseLabel}: ${valueText}${unit ? ` ${unit}` : ""}${axis ? ` (${axis})` : ""}`;
}

function normalizeDimensionLabel(line, language) {
  const normalizedLine = String(line || "").trim().replace(/^-\s*/, "");

  const prefixedSubProductMatch = normalizedLine.match(/^(Backofen|Kochfeld|Oven|Hob)\s*:\s*(.+)$/i);
  if (prefixedSubProductMatch) {
    const [, rawPrefix, rest] = prefixedSubProductMatch;
    const normalizedRest = normalizeDimensionLabel(rest, language);
    if (language === "de") {
      const germanPrefix = /^hob$/i.test(rawPrefix) ? "Kochfeld" : /^oven$/i.test(rawPrefix) ? "Backofen" : rawPrefix;
      return `${germanPrefix}: ${normalizedRest}`;
    }
    const englishPrefix = /^(backofen|oven)$/i.test(rawPrefix) ? "Oven" : "Hob";
    return `${englishPrefix} ${normalizedRest.charAt(0).toLowerCase()}${normalizedRest.slice(1)}`;
  }

  if (language !== "de") {
    const directEnglishDimensionLabels = [
      [/^Breite\s*:?\s*(.+)$/i, "Width"],
      [/^Tiefe\s+bei\s+ge.*?T(?:ü|ue)r\s*:?\s*(.+)$/i, "Depth with door open"],
      [/^Tiefe\s+bei\s+ge(?:ö|oe)ffneter\s+Tür\s*:?\s*(.+)$/i, "Depth with door open"],
      [/^Tiefe\s*:?\s*(.+)$/i, "Depth"],
      [/^Blendenh.*?he\s*:?\s*(.+)$/i, "Panel height"],
      [/^Blendenh(?:ö|oe)he\s*:?\s*(.+)$/i, "Panel height"],
      [/^Höhe\s*:?\s*(.+)$/i, "Height"],
      [/^Hoehe\s*:?\s*(.+)$/i, "Height"],
      [/^Bauh(?:ö|oe)he\s*:?\s*(.+)$/i, "Build height"],
    ];

    for (const [pattern, label] of directEnglishDimensionLabels) {
      const directMatch = normalizedLine.match(pattern);
      if (directMatch) {
        return `${label}: ${normalizeIdenticalLeadingDimensionRange(directMatch[1].trim())}`;
      }
    }
  }

  const match = normalizedLine.match(
    /^(?<label>(?:Gerätemaße|Geraetemaße|Geraetemasse|Nischenmaße|Nischenmasse|Einbaumaße|Einbaumasse|Ausschnittmaße|Ausschnittmasse|Einbautiefe|Appliance dimensions|Niche dimensions|Installation dimensions|Cut-out dimensions|Built-in depth|Dimensions|Height|Höhe|Hoehe|Bauhöhe|Bauhoehe)(?:\s+H\s*x\s*(?:B|W)\s*x\s*(?:T|D))?(?:\s+(?:B|W)\s*x\s*(?:T|D))?(?:\s*\((?:mm|cm)\))?)\s*:?\s*(?<value>.+)$/i,
  );
  if (!match?.groups) return normalizedLine;

  const rawLabel = match.groups.label.trim();
  const rawValue = normalizeIdenticalLeadingDimensionRange(match.groups.value.trim());

  if (language === "de") {
    const germanLabel = rawLabel
      .replace(/^Geraetemaße/i, "Gerätemaße")
      .replace(/^Geraetemasse/i, "Gerätemaße")
      .replace(/^Geraetemaasse/i, "Gerätemaße")
      .replace(/^Nischenmasse/i, "Nischenmaße")
      .replace(/^Einbaumasse/i, "Einbaumaße")
      .replace(/^Ausschnittmasse/i, "Ausschnittmaße")
      .replace(/^Cut-out dimensions/i, "Ausschnittmaße")
      .replace(/^Built-in depth/i, "Einbautiefe")
      .replace(/^Height/i, "Höhe")
      .replace(/^Hoehe/i, "Höhe")
      .replace(/^Bauhoehe/i, "Bauhöhe")
      .replace(/\bH\s*x\s*W\s*x\s*D\b/i, "H x B x T");

    return `${germanLabel}: ${rawValue}`;
  }

  let englishLabel = rawLabel;
  if (/^(Gerätemaße|Geraetemaße|Geraetemasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Gerätemaße|Geraetemaße|Geraetemasse)/i, "Appliance dimensions");
  } else if (/^(Nischenmaße|Nischenmasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Nischenmaße|Nischenmasse)/i, "Niche dimensions");
  } else if (/^(Einbaumaße|Einbaumasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Einbaumaße|Einbaumasse)/i, "Installation dimensions");
  } else if (/^(Ausschnittmaße|Ausschnittmasse)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Ausschnittmaße|Ausschnittmasse)/i, "Cut-out dimensions");
  } else if (/^Einbautiefe/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^Einbautiefe/i, "Built-in depth");
  } else if (/^(Höhe|Hoehe|Bauhöhe|Bauhoehe)/i.test(rawLabel)) {
    englishLabel = rawLabel.replace(/^(Höhe|Hoehe|Bauhöhe|Bauhoehe)/i, "Height");
  }

  englishLabel = englishLabel
    .replace(/\bH\s*x\s*B\s*x\s*T\b/i, "H x W x D")
    .replace(/\bB\s*x\s*T\b/i, "W x D");
  const englishValue = rawValue
    .replace(/\bH\s*x\s*B\s*x\s*T\b/i, "H x W x D")
    .replace(/\bB\s*x\s*T\b/i, "W x D");
  const formattedSize = formatEnglishSizeDimensionLabel(englishLabel, englishValue);
  if (formattedSize) return formattedSize;
  return `${englishLabel}: ${englishValue}`;
}

function formatDimensionEntry(name, dimensions) {
  const lines = splitDocumentedDimensionLines(dimensions);
  if (!lines.length) return "";

  const normalizedLines = [...new Set(lines.map((line) => normalizeDimensionLabel(line, "en")))];
  return [`- ${name}:`, ...normalizedLines.map((line) => `  ${line}`)].join("\n");
}

function getCompactDimensionName(name) {
  return String(name || "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/^Built-in oven and hob$/i, "Built-in oven")
    .trim();
}

function formatCompactDimensionValue(value) {
  return String(value || "")
    .replace(/[.;]\s*$/g, "")
    .replace(/\s*\((?:H|W|D|x|\s)+\)\s*$/i, "")
    .replace(/\b(\d+)[,.]0\b/g, "$1")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\b/g, "$1-$2")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\b/g, "$1-$2")
    .replace(/-/g, "–")
    .replace(/\s*x\s*/gi, " × ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactEnglishDimensionRecord(line, fallbackName) {
  const normalizedLine = String(line || "").trim();
  const valueFrom = (pattern) => {
    const match = normalizedLine.match(pattern);
    return match ? formatCompactDimensionValue(match[1]) : "";
  };

  const applianceSize = valueFrom(/^Appliance size:\s*(.+)$/i);
  if (applianceSize) return { subject: fallbackName, label: "Appliance dimensions", value: applianceSize };

  const requiredSpace = valueFrom(/^Required installation space:\s*(.+)$/i);
  if (requiredSpace) return { subject: fallbackName, label: "Installation dimensions", value: requiredSpace };

  const ovenSize = valueFrom(/^Oven appliance size:\s*(.+)$/i);
  if (ovenSize) return { subject: "Built-in oven", label: "Appliance dimensions", value: ovenSize };

  const ovenSpace = valueFrom(/^Oven required installation space:\s*(.+)$/i);
  if (ovenSpace) return { subject: "Built-in oven", label: "Installation dimensions", value: ovenSpace };

  const hobSize = valueFrom(/^Hob appliance size:\s*(.+)$/i);
  if (hobSize) return { subject: "Hob", label: "Appliance dimensions", value: hobSize };

  const hobCutOut = valueFrom(/^Hob cut-out size:\s*(.+)$/i);
  if (hobCutOut) return { subject: "Hob", label: "Cut-out dimensions", value: hobCutOut };

  const cutOut = valueFrom(/^Cut-out size:\s*(.+)$/i);
  if (cutOut) return { subject: fallbackName, label: "Cut-out dimensions", value: cutOut };

  const width = valueFrom(/^Width:\s*(.+)$/i);
  if (width) return { subject: fallbackName, label: "", value: `width ${width}` };

  const height = valueFrom(/^Height:\s*(.+)$/i);
  if (height) return { subject: fallbackName, label: "", value: `height ${height}` };

  const depth = valueFrom(/^Depth:\s*(.+)$/i);
  if (depth) return { subject: fallbackName, label: "", value: `depth ${depth}` };

  return null;
}

function compactGermanDimensionRecord(line, fallbackName) {
  const normalizedLine = String(line || "").trim();
  const valueFrom = (pattern) => {
    const match = normalizedLine.match(pattern);
    if (!match) return "";
    const unit = match[0].match(/\((mm|cm)\)/i)?.[1] || "";
    const value = match[1].replace(/[.;]\s*$/g, "");
    const valueWithUnit = unit && !new RegExp(`\\b${unit}\\b`, "i").test(value) ? `${value} ${unit}` : value;
    return formatCompactDimensionValue(valueWithUnit);
  };

  const subjectFromPrefix = (prefix) => (/^Kochfeld$/i.test(prefix) ? "Kochfeld" : "Einbaubackofen");
  const prefixed = normalizedLine.match(/^(Backofen|Einbaubackofen|Kochfeld):\s*(.+)$/i);
  if (prefixed) {
    const nested = compactGermanDimensionRecord(prefixed[2], subjectFromPrefix(prefixed[1]));
    return nested ? { ...nested, subject: subjectFromPrefix(prefixed[1]) } : null;
  }

  const applianceSize = valueFrom(/^Gerätemaße(?:\s+H\s*x\s*B\s*x\s*T|\s+B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?\s*:?\s*(.+)$/i);
  if (applianceSize) return { subject: fallbackName, label: "Gerätemaße", value: applianceSize };

  const nicheSize = valueFrom(/^Nischenmaße(?:\s+H\s*x\s*B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?\s*:?\s*(.+)$/i);
  if (nicheSize) return { subject: fallbackName, label: "Nischenmaße", value: nicheSize };

  const installationSize = valueFrom(/^Einbaumaße(?:\s+H\s*x\s*B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?\s*:?\s*(.+)$/i);
  if (installationSize) return { subject: fallbackName, label: "Einbaumaße", value: installationSize };

  const cutOutSize = valueFrom(/^Ausschnittmaße(?:\s+B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?\s*:?\s*(.+)$/i);
  if (cutOutSize) return { subject: fallbackName, label: "Ausschnittmaße", value: cutOutSize };

  const width = valueFrom(/^Breite:\s*(.+)$/i);
  if (width) return { subject: fallbackName, label: "", value: `Breite ${width}` };

  const height = valueFrom(/^Höhe:\s*(.+)$/i);
  if (height) return { subject: fallbackName, label: "", value: `Höhe ${height}` };

  const depth = valueFrom(/^Tiefe:\s*(.+)$/i);
  if (depth) return { subject: fallbackName, label: "", value: `Tiefe ${depth}` };

  return null;
}

function formatCompactDimensionRecords(records) {
  const groups = new Map();
  for (const record of records) {
    if (!record?.subject || !record.value) continue;
    const key = record.subject;
    if (!groups.has(key)) groups.set(key, []);
    const entries = groups.get(key);
    if (!entries.some((entry) => entry.label === record.label && entry.value === record.value)) {
      entries.push({ label: record.label, value: record.value });
    }
  }

  return [...groups.entries()]
    .map(([subject, entries]) => {
      if (entries.length === 1 && !entries[0].label) return `- ${subject}: ${entries[0].value}`;
      if (entries.length === 1 && /^(Appliance dimensions|Gerätemaße)$/.test(entries[0].label)) {
        return `- ${subject}: ${entries[0].value}`;
      }
      return [`- ${subject}`, ...entries.map((entry) => `  ${entry.label}: ${entry.value}`)].join("\n");
    })
    .join("\n");
}

function formatCompactEnglishDimensionRecords(records) {
  return formatCompactDimensionRecords(records);
}

function formatCompactDimensionEntryByLanguage(name, dimensions, language) {
  const compactName = getCompactDimensionName(name);
  const lines = splitDocumentedDimensionLines(dimensions);
  const normalizedLines = [...new Set(lines.map((line) => normalizeDimensionLabel(line, language)))];
  const hasFullSize = normalizedLines.some((line) =>
    /^(?:Appliance size|Oven appliance size|Hob appliance size|Gerätemaße(?:\s+H\s*x\s*B\s*x\s*T|\s+B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?|(?:Backofen|Einbaubackofen|Kochfeld):\s*Gerätemaße(?:\s+H\s*x\s*B\s*x\s*T|\s+B\s*x\s*T)?(?:\s*\((?:mm|cm)\))?):/i.test(line),
  );

  const compactRecords = normalizedLines
    .filter((line) => !(hasFullSize && /^(?:Width|Height|Build height|Breite|Höhe|Hoehe|Bauhöhe|Bauhoehe):/i.test(line)))
    .map((line) => language === "de"
      ? compactGermanDimensionRecord(line, compactName)
      : compactEnglishDimensionRecord(line, compactName))
    .filter(Boolean);

  return formatCompactDimensionRecords(compactRecords);
}

function getEnglishDimensionFormatNote() {
  return "Format: H × W × D unless stated otherwise.";
}

function formatDimensionEntryByLanguage(name, dimensions, language) {
  const lines = splitDocumentedDimensionLines(dimensions);
  if (!lines.length) return "";

  const normalizedLines = [...new Set(lines.map((line) => normalizeDimensionLabel(line, language)))];
  return [`- ${name}:`, ...normalizedLines.map((line) => `  ${line}`)].join("\n");
}

function isAffirmativeFollowUp(value) {
  return /^(yes|yeah|yep|sure|ok|okay|please|ja|jep|klar|bitte)\W*$/i.test(String(value || "").trim());
}

function detectTopicFromText(text) {
  const value = String(text || "");
  if (!/\?/.test(value)) return "";
  if (!/(would you like|möchten sie|moechten sie|soll ich)/i.test(value)) return "";
  if (/(noise values|geräuschwerte|geraeuschwerte|noise levels)/i.test(value)) return "noise";
  if (/(energy classes|energy class|energieeffizienzklassen|energieeffizienzklasse|energieklassen|energieklasse)/i.test(value)) return "energy";
  if (/(dimensions|Gerätemaße|Nischenmaße|maße|masse|installation dimensions)/i.test(value)) return "dimensions";
  if (/(consumption figures|consumption values|verbrauchswerte|verbrauchsangaben)/i.test(value)) return "consumption";
  return "";
}

function detectAnsweredTopicsFromText(text) {
  const value = String(text || "");
  const topics = new Set();

  if (/(documented energy class|documented energy classes|dokumentierte energieeffizienzklasse|dokumentierten energieeffizienzklassen)/i.test(value)) {
    topics.add("energy");
  }
  if (/(documented consumption values|dokumentierten verbrauchswerte|annual energy consumption|jährlicher energieverbrauch|jaehrlicher energieverbrauch)/i.test(value)) {
    topics.add("consumption");
  }
  if (/(documented noise values|documented noise levels|dokumentierten geräuschwerte|dokumentierten geraeuschwerte|max\.\s*\d+\s*dB|\d+\s*dB(?:\(A\))?)/i.test(value)) {
    topics.add("noise");
  }
  if (/(documented dimensions|documented appliance or niche dimensions|dokumentierten geräte- oder nischenmaße|dokumentierten geraete- oder nischenmasse|appliance dimensions|required installation space|niche dimensions|gerätemaße|geraetemasse|nischenmaße|nischenmasse)/i.test(value)) {
    topics.add("dimensions");
  }

  return topics;
}

function getPreviouslyAnsweredTopics(conversationMessages) {
  const topics = new Set();
  if (!Array.isArray(conversationMessages)) return topics;

  for (const message of conversationMessages) {
    if (message?.role !== "assistant" || !message?.text) continue;
    const answerBody = splitTrailingQuestion(message.text).body || message.text;
    for (const topic of detectAnsweredTopicsFromText(answerBody)) {
      topics.add(topic);
    }
  }

  return topics;
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
  }

  return "";
}

function hasAssistantClarificationQuestion(messages) {
  const assistantMessages = Array.isArray(messages)
    ? messages.filter((message) => message?.role === "assistant" && message?.text).slice(-3).reverse()
    : [];

  return assistantMessages.some((message) => {
    const question = splitTrailingQuestion(message.text).question || String(message.text || "");
    return /(für welches gerät|fuer welches geraet|welches gerät meinen sie|welches geraet meinen sie|welche information benötigen sie|welche information benoetigen sie|worüber möchten sie mehr erfahren|worueber moechten sie mehr erfahren|which product do you mean|what would you like to know)/i.test(question);
  });
}

function getUnresolvedAffirmativeAnswer(question, conversationMessages, language) {
  if (!isAffirmativeFollowUp(question)) return null;
  if (resolveFollowUpTopic(question, conversationMessages)) return null;
  if (!hasAssistantClarificationQuestion(conversationMessages)) return null;

  return {
    answer: AFFIRMATIVE_CLARIFICATION_BY_LANGUAGE[language] || AFFIRMATIVE_CLARIFICATION_BY_LANGUAGE.en,
    found: false,
  };
}

function buildResolvedFollowUpQuestion(topic, language) {
  if (topic === "energy") {
    return language === "de" ? "Bitte zeigen Sie die dokumentierten Energieeffizienzklassen aller ausgewählten Produkte." : "Please show the documented energy classes for all selected products.";
  }
  if (topic === "consumption") {
    return language === "de" ? "Bitte zeigen Sie die dokumentierten Verbrauchswerte." : "Please list the documented consumption values.";
  }
  if (topic === "noise") {
    return language === "de" ? "Bitte zeigen Sie die dokumentierten Geräuschwerte." : "Please list the documented noise values.";
  }
  if (topic === "dimensions") {
    return language === "de" ? "Bitte zeigen Sie die dokumentierten Geräte- oder Einbaumaße." : "Please list the documented dimensions.";
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
  hob: ["hob", "hobb", "cooktop", "stove top", "induction", "kochfeld", "herdplatte", "pllaka", "pllakë gatimi", "pllaka gatimi"],
  oven: ["oven", "owen", "back oven", "built-in oven", "backofen", "einbaubackofen", "ofen", "furrë", "furre"],
  hood: ["extractor hood", "extractor", "hood", "vent", "fan hood", "dunstabzugshaube", "haube", "flachschirmhaube", "aspirator"],
  dishwasher: ["dishwasher", "dish washer", "dishwaser", "dish washer machine", "geschirrspüler", "geschirrspueler", "spülmaschine", "spuelmaschine", "lavastovilje", "enëlarëse", "enelarese"],
  washing_machine: ["washing machine", "washer", "wash machine", "wasching machine", "waschmaschine", "lavatriçe", "lavatriqe"],
  refrigerator_freezer: ["refrigerator-freezer", "refrigerator", "refrigator", "fridge", "refridge", "freezer", "fridge freezer", "fridge-freezer", "kühl-gefrierkombination", "kuehl-gefrierkombination", "kühlschrank", "kuehlschrank", "kuhlschrank", "gefrierschrank", "gefrier", "frigorifer", "frigoriferi"],
};

function getSubProductDisplayLabel(subProduct, language) {
  const labels = {
    hob: { de: "Kochfeld", en: "hob" },
    oven: { de: "Einbaubackofen", en: "oven" },
    hood: { de: "Dunstabzugshaube", en: "extractor hood" },
    dishwasher: { de: "Geschirrspüler", en: "dishwasher" },
    washing_machine: { de: "Waschmaschine", en: "washing machine" },
    refrigerator_freezer: { de: "Kühl-Gefrierkombination", en: "refrigerator-freezer" },
  };

  return labels[subProduct]?.[language] || (language === "de" ? "Produkt" : "product");
}

function getSubProductArticleLabel(subProduct, language) {
  if (language !== "de") {
    return `the ${getSubProductDisplayLabel(subProduct, "en")}`;
  }

  const labels = {
    hob: "das Kochfeld",
    oven: "den Einbaubackofen",
    hood: "die Dunstabzugshaube",
    dishwasher: "den Geschirrspüler",
    washing_machine: "die Waschmaschine",
    refrigerator_freezer: "die Kühl-Gefrierkombination",
  };

  return labels[subProduct] || "das Produkt";
}

function getGermanEnergyComparisonName(item, subProduct) {
  const model = normalizeKnownModel(extractKnownModelFromText(getGroupedSubProductContent(item, subProduct).join("\n")) || extractModelForSubProduct(item, subProduct) || extractKnownModel(item));
  if (subProduct === "hob") return model ? `das Induktionskochfeld ${model}` : "das Kochfeld";
  if (subProduct === "oven") return model ? `den Einbaubackofen ${model}` : "den Einbaubackofen";
  const label = getSubProductArticleLabel(subProduct, "de");
  return model ? `${label} ${model}` : label;
}

function getEnglishEnergyComparisonName(item, subProduct) {
  const model = normalizeKnownModel(extractKnownModelFromText(getGroupedSubProductContent(item, subProduct).join("\n")) || extractModelForSubProduct(item, subProduct) || extractKnownModel(item));
  const comparisonLabels = {
    oven: "built-in oven",
    hob: "hob",
    hood: "extractor hood",
    dishwasher: "dishwasher",
    washing_machine: "washing machine",
    refrigerator_freezer: "refrigerator-freezer",
  };
  const label = subProduct ? comparisonLabels[subProduct] || getSubProductDisplayLabel(subProduct, "en") : getPublicTypeLabelForModel(model, item, "en");
  const displayLabel = label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "Product";
  return model ? `${displayLabel} (${model})` : displayLabel;
}

function extractModelForSubProduct(item, subProduct) {
  const sourceText = getCombinedItemInfoText(item);
  const patterns = {
    hob: /\bOL-KMI\s*754\s*000\s*E\b/i,
    oven: /\bEBX\s*943\s*600\s*S\b/i,
    hood: /\b(?:FH\s*664\s*621\s*[SE]|KHF\s*664\s*611\s*S(?:\s*Stripe\s*X)?)\b/i,
    dishwasher: /\bA-EGSPV597210\b/i,
    washing_machine: /\bEWA\s*34660\s*W\b/i,
    refrigerator_freezer: /\b(?:KGC\s*15495\s*S|OL-KGCN\s*388140\s*E)\b/i,
  };
  const match = sourceText.match(patterns[subProduct]);
  return match ? normalizeKnownModel(match[0]) : "";
}

function itemMatchesSubProduct(item, subProduct) {
  if (!subProduct) return false;
  const model = extractKnownModel(item);
  const typeLabel = getPublicTypeLabelForModel(model, item, "en").toLowerCase();
  const sourceText = getCombinedItemInfoText(item).toLowerCase();

  const patterns = {
    hob: /\bhob\b|kochfeld|ol-kmi/,
    oven: /\boven\b|backofen|einbaubackofen|ebx/,
    hood: /extractor hood|dunstabzug|haube|fh\s*664|khf\s*664/,
    dishwasher: /dishwasher|geschirrsp|a-egspv/,
    washing_machine: /washing machine|waschmaschine|ewa\s*34660/,
    refrigerator_freezer: /refrigerator|fridge|kühl|kuehl|gefrier|kgc\s*15495|ol-kgcn/,
  };

  const pattern = patterns[subProduct];
  return Boolean(pattern && (pattern.test(typeLabel) || pattern.test(sourceText)));
}

function scopeItemsForQuestion(items, question) {
  const requestedSubProduct = detectRequestedSubProduct(question);
  if (!requestedSubProduct) return items;

  const scopedItems = items.filter((item) => itemMatchesSubProduct(item, requestedSubProduct));
  return scopedItems.length ? scopedItems : items;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textContainsAlias(text, alias) {
  const escapedAlias = escapeRegex(alias).replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(?:^|[^a-zäöüß])${escapedAlias}(?:$|[^a-zäöüß])`, "i");
  return pattern.test(String(text || ""));
}

function detectRequestedSubProduct(question) {
  const value = String(question || "").toLowerCase();

  return Object.entries(SUB_PRODUCT_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => textContainsAlias(value, alias)),
  )?.[0] || "";
}

function detectRequestedSubProducts(question) {
  const value = String(question || "").toLowerCase();
  return Object.entries(SUB_PRODUCT_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => textContainsAlias(value, alias)))
    .map(([subProduct]) => subProduct);
}

function isLikelyProductAliasOnlyQuestion(question) {
  const value = normalizeConversationalPrompt(question);
  const requestedSubProduct = detectRequestedSubProduct(value);
  if (!requestedSubProduct || detectTopic(value) || isOverviewRequest(value) || isHelpRequest(value)) return false;

  const aliases = SUB_PRODUCT_ALIASES[requestedSubProduct] || [];
  return aliases.some((alias) => {
    const normalizedAlias = normalizeConversationalPrompt(alias);
    return value === normalizedAlias || value === `the ${normalizedAlias}` || value === `der ${normalizedAlias}` || value === `die ${normalizedAlias}` || value === `das ${normalizedAlias}`;
  });
}

function answerFromProductAliasOnly(question, items, language) {
  if (!isLikelyProductAliasOnlyQuestion(question)) return null;

  const requestedSubProduct = detectRequestedSubProduct(question);
  const item = items.find((entry) => itemMatchesSubProduct(entry, requestedSubProduct));
  if (!item) return null;

  const model = extractKnownModel(item);
  const typeLabel = getPublicTypeLabelForModel(model, item, language);
  if (language === "de") {
    const subject = requestedSubProduct === "refrigerator_freezer"
      ? "Die Kühl-Gefrierkombination"
      : getSubProductArticleLabel(requestedSubProduct, "de").replace(/^d/, "D");
    const modelText = model ? ` ist ${model}` : " ist ausgewählt";
    return {
      answer: `${subject}${modelText}. Ich kann Ihnen bei Energieeffizienzklasse, Verbrauch, Lautstärke, Volumen, Maßen oder Funktionen helfen.`,
      found: true,
    };
  }

  const subject = typeLabel || getSubProductDisplayLabel(requestedSubProduct, "en");
  const modelText = model ? ` is ${model}` : " is selected";
  return {
    answer: `The ${subject.toLowerCase()}${modelText}. I can help with its energy class, consumption, noise, volume, dimensions, or features.`,
    found: true,
  };
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
    /\bKA220043_S3\b/i,
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
    .map((line) => line.match(/\b(?:energieeffizienzklasse|energieklasse|energy\s+(?:efficiency\s+)?class|energy\s+class)\s*[:\-]?\s*([A-G](?:\+\+?)?)\b/i)?.[1] || "")
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
      ? "Einbaubackofen"
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

  if (/\bKGC\b/i.test(explicitModel) || /refrigerator|fridge|kuehl|kühl|gefrier/i.test(rawName)) {
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

  if (/refrigerator|fridge|kuehl|kühl|gefrier/i.test(sourceText) || /refrigerator|fridge|kuehl|kühl|gefrier/i.test(rawName)) {
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
    return language === "de" ? "Einbaubackofen" : "Built-in oven";
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
      ? `Einbaubackofen${explicitModel ? ` (${explicitModel})` : ""}`
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
      /refrigerator|fridge|kuehl|kühl|gefrier/i,
      /extractor hood|dunstabzug|haube/i,
    ].filter((pattern) => pattern.test(sourceText)).length > 1;
    const hasGroupedEnergyFact = /(?:^|\n)\s*(?:[^:\n]{2,40})\s*:\s*(?:energieeffizienzklasse|energieklasse|energy\s+(?:efficiency\s+)?class)\b/i.test(sourceText);

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
      waterConsumption: getWaterConsumptionValue(item),
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
      if (typeLabel === "Washing machine") return "Energieverbrauch pro 100 Waschzyklen";
      if (typeLabel === "Dishwasher") return "Energieverbrauch pro 100 Spülgänge";
      return "Energieverbrauch pro 100 Zyklen";
    }
    if (typeLabel === "Washing machine") return "Energieverbrauch pro 100 Waschzyklen";
    if (typeLabel === "Dishwasher") return "Energieverbrauch pro 100 Spülgänge";

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
  if (typeLabel === "Washing machine") return "Energy consumption per 100 wash cycles";
  if (typeLabel === "Dishwasher") return "Energy consumption per 100 cycles";

  return "Documented consumption";
}

function formatConsumptionEntry(record, language) {
  const parts = [];
  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(record.item), record.item, "en");
  if (record?.annualConsumption) {
    parts.push(`${getConsumptionLabel(record.item, language, record.annualConsumption)}: ${record.annualConsumption}`);
  }
  if (record?.waterConsumption) {
    const waterValue = String(record.waterConsumption)
      .replace(/\s*\/\s*(?:zyklus|cycle|spülgang|spuelgang)\b/ig, "")
      .trim();
    let waterLabel = language === "de" ? "Wasserverbrauch" : "Water consumption";
    if (language === "de") {
      if (typeLabel === "Washing machine") waterLabel = "Wasserverbrauch pro Zyklus";
      if (typeLabel === "Dishwasher") waterLabel = "Wasserverbrauch pro Spülgang";
    }
    parts.push(`${waterLabel}: ${waterValue}`);
  }
  if (!parts.length) return "";
  return `${record.name}: ${parts.join("; ")}`;
}

function normalizeCompactConsumptionValue(value, item) {
  let text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.;]\s*$/g, "")
    .trim();
  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(item), item, "en");

  text = text
    .replace(/,/g, ".")
    .replace(/\b(\d+)\.0\b/g, "$1")
    .replace(/\s*\/\s*Jahr/i, "/year")
    .replace(/\s*\/\s*jahr/i, "/year")
    .replace(/\s*\/\s*year/i, "/year")
    .replace(/\s*\/\s*100\s*Zyklen/i, " / 100 cycles")
    .replace(/\s*\/\s*100\s*cycles/i, " / 100 cycles")
    .replace(/\s*\/\s*1000\s*h/i, " / 1000 h")
    .replace(/\s+conventional\s*\/\s*/i, " conventional / ")
    .replace(/\s+hot air/i, " hot air")
    .replace(/\s+/g, " ")
    .trim();

  if (/kWh$/i.test(text) && /^(Extractor hood|Refrigerator-freezer)$/.test(typeLabel)) {
    text = `${text}/year`;
  }
  if (/kWh$/i.test(text) && /^(Washing machine|Dishwasher)$/.test(typeLabel)) {
    text = `${text} / 100 cycles`;
  }
  if (/^Built-in oven$/.test(typeLabel) && /\b\d+(?:\.\d+)?\s*kWh\s*\/\s*\d+(?:\.\d+)?\s*kWh\b/i.test(text)) {
    text = text.replace(
      /\b(\d+(?:\.\d+)?)\s*kWh\s*\/\s*(\d+(?:\.\d+)?)\s*kWh\b/i,
      "$1 kWh conventional / $2 kWh hot air",
    );
  }

  return text;
}

function normalizeCompactWaterConsumptionValue(value) {
  const match = String(value || "")
    .replace(",", ".")
    .match(/\b\d+(?:\.\d+)?\s*l\b/i);
  return match ? `${match[0]} water/cycle` : "";
}

function formatCompactConsumptionEntry(record, language) {
  if (language === "de") return formatConsumptionEntry(record, language);

  const name = getCompactDimensionName(record.name);
  const parts = [];
  if (record?.annualConsumption) {
    parts.push(normalizeCompactConsumptionValue(record.annualConsumption, record.item));
  }

  const typeLabel = getPublicTypeLabelForModel(extractKnownModel(record.item), record.item, "en");
  if (record?.waterConsumption && typeLabel === "Washing machine") {
    const waterValue = normalizeCompactWaterConsumptionValue(record.waterConsumption);
    if (waterValue) parts.push(waterValue);
  }

  if (!parts.length) return "";
  return `${name}: ${parts.join(", ")}`;
}

function parseFirstNumber(value) {
  const match = String(value || "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : NaN;
}

function normalizeConsumptionValueForAnswer(value, language) {
  let text = String(value || "").replace(/\s+/g, " ").trim();
  if (language === "en") {
    text = text
      .replace(",", ".")
      .replace(/\s*\/\s*Jahr/i, "/year")
      .replace(/\s*\/\s*jahr/i, "/year");
  }
  return text;
}

function isAnnualConsumptionRecord(record) {
  const value = String(record?.annualConsumption || "");
  const sourceLine = getConsumptionSourceLine(record.item, value);
  return /(annual|year|jahr|jährlich|jaehrlich)/i.test(`${value}\n${sourceLine}`);
}

function detectComparisonTopics(question) {
  const value = String(question || "");
  const topics = [];

  if (/(energy\s+(?:efficiency\s+)?class(?:es)?|energieeffizienzklassen?|energieklassen?|energieklasse)/i.test(value)) {
    topics.push("energyClass");
  }
  if (/(energy use|energy consumption|electricity use|kwh|verbrauch|energieverbrauch|stromverbrauch|verbraucht)/i.test(value)) {
    topics.push("energyConsumption");
  }
  if (/(water use|water consumption|wasser|wasserverbrauch)/i.test(value)) {
    topics.push("waterConsumption");
  }
  if (/(noise|quiet|loud|decibels?|db|dba|geräusch|geraeusch|lautstärke|lautstaerke|leise|laut|ruhig)/i.test(value)) {
    topics.push("noise");
  }
  if (/(dimensions|measurements|size|width|height|depth|ma[sß]e|masse|abmessungen|breite|höhe|hoehe|tiefe)/i.test(value)) {
    topics.push("dimensions");
  }
  if (/(features?|functions?|programs?|capacity|funktionen|programme|kapazität|kapazitaet)/i.test(value)) {
    topics.push("features");
  }

  return [...new Set(topics)];
}

function isMultiProductComparisonQuestion(question) {
  const value = String(question || "");
  const requestedSubProducts = detectRequestedSubProducts(value);
  const topics = detectComparisonTopics(value);
  return requestedSubProducts.length >= 2
    && topics.length >= 2
    && /(compare|comparison|versus| vs\.? | by |better|vergleich|vergleichen|besser| oder | und | nach )/i.test(value);
}

function normalizeCompactValue(value) {
  return String(value || "")
    .replace(/\s*\/\s*(?:cycle|zyklus|spülgang|spuelgang)\b/ig, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFeatureSummary(item, language) {
  const facts = normalizeFacts(item.productInfoKeyFacts)
    .map(normalizePublicProductBrand)
    .filter((fact) =>
      !/^(model|energieeffizienzklasse|energieklasse|energy\s+(?:efficiency\s+)?class|energy consumption|energieverbrauch|wasserverbrauch|water consumption|geräusch|geraeusch|noise|dimensions|abmessungen|gerätemaße|geraetemaße|nischenmaße|nischenmasse)\s*:/i.test(fact),
    )
    .slice(0, 3);

  if (facts.length) return facts.join("; ");
  return language === "de" ? "keine dokumentierten Funktionen gefunden" : "no documented features found";
}

function formatComparisonValue(item, topic, language) {
  const record = getEnergyAnswerRecords(item, language)[0];

  if (topic === "energyClass") {
    return record.energyClass
      ? (language === "de" ? `Energieeffizienzklasse: ${record.energyClass}` : `Energy class: ${record.energyClass}`)
      : (language === "de" ? "Energieeffizienzklasse: nicht dokumentiert" : "Energy class: not documented");
  }

  if (topic === "energyConsumption") {
    return record.annualConsumption
      ? `${getConsumptionLabel(item, language, record.annualConsumption)}: ${record.annualConsumption}`
      : (language === "de" ? "Energieverbrauch: nicht dokumentiert" : "Energy use: not documented");
  }

  if (topic === "waterConsumption") {
    return record.waterConsumption
      ? `${language === "de" ? "Wasserverbrauch" : "Water use"}: ${normalizeCompactValue(record.waterConsumption)}`
      : (language === "de" ? "Wasserverbrauch: nicht dokumentiert" : "Water use: not documented");
  }

  if (topic === "noise") {
    const noise = extractNoiseValueStrict(item);
    return noise
      ? `${language === "de" ? "Lautstärke" : "Noise"}: ${noise}`
      : (language === "de" ? "Lautstärke: nicht dokumentiert" : "Noise: not documented");
  }

  if (topic === "dimensions") {
    const dimensions = extractInstallationDimensionsStrict(item);
    return dimensions
      ? `${language === "de" ? "Maße" : "Dimensions"}: ${splitDocumentedDimensionLines(dimensions).map((line) => normalizeDimensionLabel(line, language)).join("; ")}`
      : (language === "de" ? "Maße: nicht dokumentiert" : "Dimensions: not documented");
  }

  if (topic === "features") {
    return `${language === "de" ? "Funktionen" : "Features"}: ${getFeatureSummary(item, language)}`;
  }

  return "";
}

function getCompactComparisonItemName(item, language) {
  const type = getControlledOverviewType(item);
  const model = extractKnownModel(item);
  const labels = {
    en: {
      hood: "Extractor hood",
      dishwasher: "Dishwasher",
      washing_machine: "Washing machine",
      fridge_freezer: "Fridge-freezer",
      oven_hob: "Oven/hob set",
      oven: "Built-in oven",
      hob: "Hob",
      product: "Product",
    },
    de: {
      hood: "Dunstabzugshaube",
      dishwasher: "Geschirrspüler",
      washing_machine: "Waschmaschine",
      fridge_freezer: "Kühl-Gefrierkombination",
      oven_hob: "Backofen-Kochfeld-Set",
      oven: "Einbaubackofen",
      hob: "Kochfeld",
      product: "Produkt",
    },
  };
  const label = labels[language]?.[type] || labels.en[type] || labels[language]?.product || "Product";
  return model ? `${label} (${model})` : label;
}

function answerFromMultiTopicComparison(question, items, language) {
  if (!isMultiProductComparisonQuestion(question)) return null;

  const requestedSubProducts = detectRequestedSubProducts(question);
  const topics = detectComparisonTopics(question);
  const comparisonItems = requestedSubProducts
    .map((subProduct) => items.find((item) => itemMatchesSubProduct(item, subProduct)))
    .filter(Boolean);

  if (comparisonItems.length < 2 || topics.length < 2) return null;

  const entries = comparisonItems.map((item) => {
    const values = topics
      .map((topic) => formatComparisonValue(item, topic, language))
      .filter(Boolean)
      .join("; ");
    return `${getCompactComparisonItemName(item, language)}: ${values}`;
  });

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Hier ist der kompakte Vergleich der angefragten Geräte:", entries)
      : formatSectionWithBullets("Here is a compact comparison of the requested appliances:", entries),
    found: true,
  };
}

function getQuietRecommendationName(item, language) {
  const type = getControlledOverviewType(item);
  const model = extractKnownModel(item);
  const labels = {
    en: {
      hood: "Extractor hood",
      dishwasher: "Dishwasher",
      washing_machine: "Washing machine",
      fridge_freezer: "Fridge-freezer",
      oven_hob: "Oven/hob set",
      oven: "Oven/hob set",
      hob: "Oven/hob set",
      product: "Product",
    },
    de: {
      hood: "Dunstabzugshaube",
      dishwasher: "Geschirrspüler",
      washing_machine: "Waschmaschine",
      fridge_freezer: "Kühl-Gefrierkombination",
      oven_hob: "Backofen-Kochfeld-Set",
      oven: "Backofen-Kochfeld-Set",
      hob: "Backofen-Kochfeld-Set",
      product: "Produkt",
    },
  };
  const label = labels[language]?.[type] || labels.en[type] || labels[language]?.product || "Product";
  return model && !/(oven_hob|oven|hob)/.test(type) ? `${label} (${model})` : label;
}

function getQuietRecommendationLeadName(item, language) {
  const type = getControlledOverviewType(item);
  const labels = {
    en: {
      hood: "extractor hood",
      dishwasher: "dishwasher",
      washing_machine: "washing machine",
      fridge_freezer: "refrigerator-freezer",
      oven_hob: "oven/hob set",
      oven: "oven/hob set",
      hob: "oven/hob set",
      product: "product",
    },
    de: {
      hood: "Dunstabzugshaube",
      dishwasher: "Geschirrspüler",
      washing_machine: "Waschmaschine",
      fridge_freezer: "Kühl-Gefrierkombination",
      oven_hob: "Backofen-Kochfeld-Set",
      oven: "Backofen-Kochfeld-Set",
      hob: "Backofen-Kochfeld-Set",
      product: "Produkt",
    },
  };

  return labels[language]?.[type] || labels.en[type] || labels[language]?.product || "product";
}

function answerFromQuietRecommendation(question, items, language) {
  if (!/(quiet|noise|silent|low noise|quiet home|lautstärke|lautstaerke|geräusch|geraeusch|leise|leis|ruhig)/i.test(String(question || ""))) {
    return null;
  }

  const records = items
    .map((item) => ({
      item,
      name: getQuietRecommendationName(item, language),
      value: extractNoiseValueStrict(item),
    }))
    .map((record) => ({ ...record, numeric: parseFirstNumber(record.value) }))
    .filter((record) => record.value && Number.isFinite(record.numeric));

  if (!records.length) return null;

  records.sort((a, b) => a.numeric - b.numeric);
  const winner = records[0];
  const documentedValues = formatBulletEntries(records.map((record) => `${record.name}: ${record.value}`));

  const missingNames = [
    ...new Set(
      items
        .filter((item) => !extractNoiseValueStrict(item))
        .map((item) => getQuietRecommendationName(item, language)),
    ),
  ];
  const missingNote = missingNames.length
    ? (language === "de"
      ? `\n\nFür ${missingNames[0] === "Backofen-Kochfeld-Set" ? "das" : "die"} ${missingNames[0]} finde ich keinen dokumentierten Geräuschwert.`
      : `\n\nI could not find a documented noise value for the ${missingNames[0].toLowerCase()}.`)
    : "";

  return {
    answer: language === "de"
      ? `Für eine ruhige Wohnung ist die ${getQuietRecommendationLeadName(winner.item, language)} anhand der dokumentierten Geräuschwerte am besten geeignet: ${winner.value}.\n\nDokumentierte Geräuschwerte:\n${documentedValues}${missingNote}`
      : `For a quiet home, the ${getQuietRecommendationLeadName(winner.item, language)} looks best based on the documented noise values: ${winner.value}.\n\nDocumented noise values:\n${documentedValues}${missingNote}`,
    found: true,
  };
}

function answerFromComparison(question, items, language) {
  const intent = classifyProductAssistantIntent(question);
  if (intent.kind !== "comparison") return null;

  if (intent.topic === "noise") {
    const records = items
      .map((item) => ({ name: getPublicItemName(item, language), value: extractNoiseValueStrict(item) }))
      .map((record) => ({ ...record, numeric: parseFirstNumber(record.value) }))
      .filter((record) => record.value && Number.isFinite(record.numeric));
    if (!records.length) return null;

    const asksLoudest = /(loudest|lautesten)/i.test(String(question || ""));
    records.sort((a, b) => asksLoudest ? b.numeric - a.numeric : a.numeric - b.numeric);
    const winner = records[0];
    const values = records.map((record) => `${record.name}: ${record.value}`);
    return {
      answer: language === "de"
        ? `${winner.name} ist nach den dokumentierten Werten ${asksLoudest ? "am lautesten" : "am leisesten"} (${winner.value}).\n${formatBulletEntries(values)}`
        : `${winner.name} is the ${asksLoudest ? "loudest" : "quietest"} based on the documented values (${winner.value}).\n${formatBulletEntries(values)}`,
      found: true,
    };
  }

  if (intent.topic === "consumption") {
    const records = items
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.annualConsumption)
      .map((record) => ({ ...record, numeric: parseFirstNumber(record.annualConsumption) }))
      .filter((record) => Number.isFinite(record.numeric));
    if (!records.length) return null;

    records.sort((a, b) => b.numeric - a.numeric);
    const winner = records[0];
    const values = records.map((record) => formatConsumptionEntry(record, language)).filter(Boolean);
    const caveat = language === "de"
      ? "Hinweis: Verbrauchswerte mit unterschiedlichen Einheiten oder Nutzungsarten sind nur eingeschränkt direkt vergleichbar."
      : "Note: consumption values with different units or usage types are only partly directly comparable.";

    return {
      answer: language === "de"
        ? `${winner.name} hat unter den dokumentierten Werten den höchsten genannten Energieverbrauch (${winner.annualConsumption}).\n${formatBulletEntries(values)}\n\n${caveat}`
        : `${winner.name} has the highest documented energy consumption value (${winner.annualConsumption}).\n${formatBulletEntries(values)}\n\n${caveat}`,
      found: true,
    };
  }

  return null;
}

function answerFromRecommendation(question, items, language) {
  const intent = classifyProductAssistantIntent(question);
  if (intent.kind !== "recommendation") return null;
  const value = String(question || "");

  const quietRecommendation = answerFromQuietRecommendation(question, items, language);
  if (quietRecommendation) return quietRecommendation;

  if (/(electricity cost|electricity costs|cost matters|stromkosten|energiekosten)/i.test(value)) {
    const records = items
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.annualConsumption && isAnnualConsumptionRecord(record))
      .map((record) => ({ ...record, numeric: parseFirstNumber(record.annualConsumption) }))
      .filter((record) => Number.isFinite(record.numeric));

    if (!records.length) return null;

    records.sort((a, b) => b.numeric - a.numeric);
    const winner = records[0];
    const consumption = normalizeConsumptionValueForAnswer(winner.annualConsumption, language);
    const winnerType = getPublicTypeLabelForModel(extractKnownModel(winner.item), winner.item, language);
    const winnerName = language === "de"
      ? winnerType
      : winnerType.toLowerCase().replace("refrigerator-freezer", "fridge-freezer");

    return {
      answer: language === "de"
        ? `Wenn Stromkosten wichtig sind, würde ich zuerst auf ${winnerName} schauen. Dort ist der höchste dokumentierte jährliche Energieverbrauch angegeben: ${consumption}. Hinweis: Andere Produkte verwenden andere Einheiten, zum Beispiel kWh pro 100 Zyklen oder pro Nutzung, und sind daher nicht direkt vergleichbar.`
        : `If electricity cost matters, start with the ${winnerName} because it has the highest documented annual consumption: ${consumption}. Note: other products use different units, such as kWh per 100 cycles or per use, so they are not directly comparable.`,
      found: true,
    };
  }

  if (/(which product is best|which one should i choose|which appliance should i choose|welches produkt ist am besten|welches gerät ist am besten|welches geraet ist am besten|welches.*soll.*wählen|welches.*soll.*waehlen)/i.test(value)) {
    return {
      answer: language === "de"
        ? "Ich kann die ausgewählten Produkte nach dokumentierten Angaben wie Energieverbrauch, Lautstärke, Maßen, Kapazität oder Funktionen vergleichen. Welches Kriterium ist Ihnen am wichtigsten?"
        : "I can compare the selected products by documented specs such as energy consumption, noise level, dimensions, capacity, or features. Which criterion matters most to you?",
      found: false,
    };
  }

  const documentedDetails = items
    .map((item) => {
      const facts = normalizeFacts(item.productInfoKeyFacts)
        .filter((fact) => /(energy|energie|verbrauch|consumption|noise|geräusch|geraeusch|lautstärke|ma[sß]e|dimension|capacity|kapazität|funktion|function)/i.test(fact))
        .slice(0, 3);
      return facts.length ? `${getPublicItemName(item, language)}: ${facts.join("; ")}` : "";
    })
    .filter(Boolean);

  if (!documentedDetails.length) return null;

  return {
    answer: language === "de"
      ? `Ich kann keine allgemeine Lifestyle-Empfehlung geben, aber ich kann nach dokumentierten Produktdaten vergleichen:\n${formatBulletEntries(documentedDetails)}`
      : `I can't make a general lifestyle recommendation, but I can compare documented product details:\n${formatBulletEntries(documentedDetails)}`,
    found: true,
  };
}

function getNextDocumentedFollowUp(items, language, topic, answeredTopics = new Set()) {
  const topicOrder = ["energy", "consumption", "noise", "dimensions"];
  const startIndex = topicOrder.indexOf(topic);
  if (startIndex >= 0 && answeredTopics.size) {
    const hasTopicValue = {
      consumption: () => items.some((item) => getAnnualConsumptionValue(item)),
      noise: () => items.some(hasDocumentedNoiseValue),
      dimensions: () => items.some(hasDocumentedDimensionValue),
    };
    const copy = {
      consumption: language === "de"
        ? "Möchten Sie auch die dokumentierten Verbrauchswerte sehen?"
        : "Would you like me to list the documented consumption values too?",
      noise: language === "de"
        ? "Möchten Sie als Nächstes die dokumentierten Geräuschwerte sehen?"
        : "Would you like me to list the documented noise values next?",
      dimensions: language === "de"
        ? "Möchten Sie auch die dokumentierten Geräte- oder Einbaumaße sehen?"
        : "Would you like me to list the documented dimensions too?",
    };

    for (const candidate of topicOrder.slice(startIndex + 1)) {
      if (answeredTopics.has(candidate)) continue;
      if (hasTopicValue[candidate]?.()) return copy[candidate] || "";
    }

    return "";
  }

  if (topic === "energy") {
    return items.some((item) => getAnnualConsumptionValue(item))
      ? (language === "de"
        ? "Möchten Sie auch die dokumentierten Verbrauchswerte sehen?"
        : "Would you like me to list the documented consumption values too?")
      : "";
  }

  if (topic === "consumption") {
    return items.some(hasDocumentedNoiseValue)
      ? (language === "de"
        ? "Möchten Sie als Nächstes die dokumentierten Geräuschwerte sehen?"
        : "Would you like me to list the documented noise values next?")
      : "";
  }

  if (topic === "noise") {
    return items.some(hasDocumentedDimensionValue)
      ? (language === "de"
        ? "Möchten Sie auch die dokumentierten Geräte- oder Einbaumaße sehen?"
        : "Would you like me to list the documented dimensions too?")
      : "";
  }

  return "";
}

function answerForRequestedSubProductEnergy(question, items, language) {
  const requestedSubProduct = detectRequestedSubProduct(question);
  if (!requestedSubProduct) return null;
  const mentionedOtherSubProducts = Object.keys(SUB_PRODUCT_ALIASES)
    .filter((subProduct) => subProduct !== requestedSubProduct)
    .filter((subProduct) => (SUB_PRODUCT_ALIASES[subProduct] || []).some((alias) => textContainsAlias(question, alias)));

  if (items.length === 1) {
    const item = items[0];
    const requestedEnergyClass = extractSubProductEnergyClass(item, requestedSubProduct);
    if (requestedEnergyClass) return null;

    const candidateOtherSubProducts = mentionedOtherSubProducts.length
      ? mentionedOtherSubProducts
      : Object.keys(SUB_PRODUCT_ALIASES).filter((subProduct) => subProduct !== requestedSubProduct);
    const otherKnown = candidateOtherSubProducts
      .map((subProduct) => ({
        subProduct,
        energyClass: extractSubProductEnergyClass(item, subProduct)
          || (itemMatchesSubProduct(item, subProduct) ? getEnergyClassValue(item) : ""),
      }))
      .filter((entry) => entry.energyClass);

    if (!otherKnown.length) return null;

    const primaryOther = otherKnown[0];

    return {
      answer: language === "de"
        ? `Für ${getGermanEnergyComparisonName(item, requestedSubProduct)} finde ich keine dokumentierte Energieeffizienzklasse. Für ${getGermanEnergyComparisonName(item, primaryOther.subProduct)} ist Energieeffizienzklasse ${primaryOther.energyClass} dokumentiert.`
        : `I could not find a documented energy class for the ${getSubProductDisplayLabel(requestedSubProduct, "en")}. The ${getEnglishEnergyComparisonName(item, primaryOther.subProduct)} has documented energy class ${primaryOther.energyClass}.`,
      found: false,
    };
  }

  const requestedItems = items.filter((item) => itemMatchesSubProduct(item, requestedSubProduct));
  if (!requestedItems.length || requestedItems.some((item) => getEnergyClassValue(item))) return null;

  const otherItems = items
    .filter((item) => mentionedOtherSubProducts.some((subProduct) => itemMatchesSubProduct(item, subProduct)))
    .map((item) => ({
      item,
      subProduct: mentionedOtherSubProducts.find((subProduct) => itemMatchesSubProduct(item, subProduct)) || "",
      energyClass: getEnergyClassValue(item),
    }))
    .filter((entry) => entry.energyClass);

  if (!otherItems.length) return null;

  const primaryOther = otherItems[0];

  return {
    answer: language === "de"
      ? `Für ${getGermanEnergyComparisonName(requestedItems[0], requestedSubProduct)} finde ich keine dokumentierte Energieeffizienzklasse. Für ${getGermanEnergyComparisonName(primaryOther.item, primaryOther.subProduct)} ist Energieeffizienzklasse ${primaryOther.energyClass} dokumentiert.`
      : `I could not find a documented energy class for the ${getSubProductDisplayLabel(requestedSubProduct, "en")}. The ${getEnglishEnergyComparisonName(primaryOther.item, primaryOther.subProduct)} has documented energy class ${primaryOther.energyClass}.`,
    found: false,
  };
}

function answerForRequestedSubProductDimensions(question, items, language) {
  const requestedSubProduct = detectRequestedSubProduct(question);
  if (!requestedSubProduct) return null;

  if (items.length === 1) {
    const item = items[0];
    const dimensionLines = extractSubProductDimensionLines(item, requestedSubProduct);
    if (!dimensionLines.length && !itemMatchesSubProduct(item, requestedSubProduct)) return null;
    const lines = dimensionLines.length
      ? dimensionLines
      : splitDocumentedDimensionLines(extractInstallationDimensionsStrict(item));
    if (!lines.length) return null;

    const formattedEntry = language === "de"
      ? [
        `- ${getSubProductPublicName(item, requestedSubProduct, language)}:`,
        ...lines.map((line) => `  ${normalizeDimensionLabel(line, language)}`),
      ].join("\n")
      : formatCompactEnglishDimensionRecords(lines
        .map((line) => normalizeDimensionLabel(line, "en"))
        .map((line) => compactEnglishDimensionRecord(line, getCompactDimensionName(getSubProductPublicName(item, requestedSubProduct, language))))
        .filter(Boolean));
    const formatNote = language === "de" ? "" : `\n\n${getEnglishDimensionFormatNote()}`;

    return {
      answer: language === "de"
        ? `Ich habe diese dokumentierten Maße für ${getSubProductArticleLabel(requestedSubProduct, language)} gefunden:\n\n${formattedEntry}`
        : `I found these documented dimensions for ${getSubProductArticleLabel(requestedSubProduct, language)}:\n\n${formattedEntry}${formatNote}`,
      found: true,
    };
  }

  const entries = items
    .filter((item) => itemMatchesSubProduct(item, requestedSubProduct))
    .map((item) => {
      const dimensions = extractInstallationDimensionsStrict(item);
      if (!dimensions) return null;
      return formatCompactDimensionEntryByLanguage(getPublicItemName(item, language), dimensions, language);
    })
    .filter(Boolean);

  if (!entries.length) return null;

  return {
    answer: language === "de"
      ? `Ich habe diese dokumentierten Maße für ${getSubProductArticleLabel(requestedSubProduct, language)} gefunden:\n\n${entries.join("\n\n")}`
      : `I found these documented dimensions for ${getSubProductArticleLabel(requestedSubProduct, language)}:\n\n${entries.join("\n")}\n\n${getEnglishDimensionFormatNote()}`,
    found: true,
  };
}

function answerForRequestedSubProductsDimensions(question, items, language) {
  const requestedSubProducts = detectRequestedSubProducts(question);
  if (requestedSubProducts.length < 2 || items.length !== 1) return null;

  const item = items[0];
  const entries = requestedSubProducts
    .map((subProduct) => {
      const lines = extractSubProductDimensionLines(item, subProduct);
      if (!lines.length) return null;
      const publicName = getSubProductPublicName(item, subProduct, language);
      if (language === "de") {
        return [
          `- ${publicName}:`,
          ...lines.map((line) => `  ${normalizeDimensionLabel(line, language)}`),
        ].join("\n");
      }
      return formatCompactEnglishDimensionRecords(lines
        .map((line) => normalizeDimensionLabel(line, "en"))
        .map((line) => compactEnglishDimensionRecord(line, getCompactDimensionName(publicName)))
        .filter(Boolean));
    })
    .filter(Boolean);

  if (!entries.length) return null;

  return {
    answer: language === "de"
      ? `Ich habe diese dokumentierten Maße gefunden:\n\n${entries.join("\n\n")}`
      : `I found these documented dimensions:\n\n${entries.join("\n")}\n\n${getEnglishDimensionFormatNote()}`,
    found: true,
  };
}

function answerForRequestedSubProductsFeatures(question, items, language) {
  const requestedSubProducts = detectRequestedSubProducts(question);
  if (requestedSubProducts.length < 2 || items.length !== 1) return null;
  if (!/\b(?:programs?|programmes?|features?|functions?|cooking zones?|zones?|programme|funktionen|kochzonen?)\b/i.test(String(question || ""))) return null;

  const item = items[0];
  const entries = requestedSubProducts
    .map((subProduct) => {
      const lines = getGroupedSubProductContent(item, subProduct)
        .filter((line) =>
          /(functions?|features?|programs?|programme|funktionen|kochzonen?|cooking zones?|leistungsstufen|power levels|zonen|zones)/i.test(line),
        );
      if (!lines.length) return null;
      const value = lines
        .map((line) => normalizeProgramOrFeatureValue(line, language))
        .join("; ");
      return `${getSubProductPublicName(item, subProduct, language)}: ${value}`;
    })
    .filter(Boolean);

  if (!entries.length) return null;

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Die dokumentierten Programme/Funktionen sind:", entries)
      : formatSectionWithBullets("The documented programs/features are:", entries),
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

  const lines = getDocumentedFactLines(item);

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
  const factValue = getFactValue(item, /^(geraeusch|geräusch|schallleistung|luftschallemission|noise)\s*:/i);
  if (factValue) return factValue;

  const line = getItemInfoLines(item).find((entry) =>
    /(geraeusch|geräusch|schallleistung|luftschallemission|noise|sound\s+power|lautstärke|lautstaerke|decibels?|\blaut\b)/i.test(entry)
    && /\b\d{2,3}(?:\s*-\s*\d{2,3})?\s*dB(?:\(A\))?\b/i.test(entry),
  );
  const match = line?.match(/\b\d{2,3}(?:\s*-\s*\d{2,3})?\s*dB(?:\(A\))?\b/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function extractInstallationDimensionsStrict(item) {
  const hasNumericDimensionPattern = (value) =>
    /\b\d{2,4}(?:[.,]\d+)?\s*(?:x|×|-)\s*\d{2,4}(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d{2,4}(?:[.,]\d+)?)?(?:\s*mm|\s*cm)?\b/i.test(value)
    || /\b(?:min\.?\s*)?\d{2,4}(?:[.,]\d+)?\s*mm\b/i.test(value)
    || /\b(?:breite|width|hoehe|höhe|bauhoehe|bauhöhe|tiefe|depth|height)\s*:\s*\d+(?:[.,]\d+)?\s*(?:mm|cm)\b/i.test(value);
  const hasDimensionLabel = (value) =>
    /(abmessungen|dimensions|geraetemass|geraetemasse|gerätemaße|geraetemaße|nischenmass|nischenmaße|einbaumass|einbaumaße|ausschnitt|cut-out|cutout|breite|width|hoehe|höhe|bauhoehe|bauhöhe|tiefe|depth|height)/i.test(value);

  const matchingLines = getDocumentedFactLines(item).filter((line) => hasDimensionLabel(line) && hasNumericDimensionPattern(line));
  if (matchingLines.length) return matchingLines.join("\n");

  const factMatches = normalizeFacts(item?.productInfoKeyFacts)
    .filter((fact) => hasDimensionLabel(fact) && hasNumericDimensionPattern(fact));

  return factMatches.length ? factMatches.join(", ") : "";
}

const NAMED_FEATURE_PATTERNS = [
  { label: "OpenDry", query: /\bopen\s*dry\b|\bopendry\b/i, source: /\bopen\s*dry\b|\bopendry\b/i },
  { label: "Startzeitvorwahl", query: /startzeit|zeitvorwahl|delay|timer/i, source: /startzeit|zeitvorwahl|delay|timer/i },
  { label: "Extra trocknen", query: /extra\s*trocknen|extra\s*dry/i, source: /extra\s*trocknen|extra\s*dry/i },
  { label: "Halbbeladung", query: /halbbeladung|half\s*load/i, source: /halbbeladung|half\s*load/i },
  { label: "Aquastopp", query: /aquastop|aquastopp/i, source: /aquastop|aquastopp/i },
];

function getFeatureSupportLine(item, pattern) {
  return getDocumentedFactLines(item)
    .find((line) => pattern.test(line)) || "";
}

function answerFromNamedDocumentedFeatures(question, items, language) {
  const requestedFeatures = NAMED_FEATURE_PATTERNS.filter((feature) => feature.query.test(String(question || "")));
  if (!requestedFeatures.length) return null;

  const entries = items
    .map((item) => {
      const foundFeatures = requestedFeatures
        .map((feature) => {
          const supportLine = getFeatureSupportLine(item, feature.source);
          return supportLine ? `${feature.label}${supportLine.includes(":") ? ` (${supportLine})` : ""}` : "";
        })
        .filter(Boolean);

      return foundFeatures.length ? `${getPublicItemName(item, language)}: ${foundFeatures.join("; ")}` : null;
    })
    .filter(Boolean);

  if (!entries.length) {
    return {
      answer: EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE[language] || EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE.en,
      found: false,
    };
  }

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Ja, dokumentiert:", entries)
      : formatSectionWithBullets("Yes, documented:", entries),
    found: true,
  };
}

function answerFromExplicitMultiItemEnergyFacts(question, items, language, answeredTopics = new Set()) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE[language] || EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE.en;
  const scopedItems = scopeItemsForQuestion(items, question);

  const asksEnergyConsumption = /\b(?:energy consumption|energieverbrauch|stromverbrauch|kwh)\b/i.test(value);
  const asksWaterConsumptionOnly = /\b(?:water|watter|water use|water consumption|wasserverbrauch|how much water)\b/i.test(value) && !asksEnergyConsumption;
  const asksConsumptionOnly = /(consumption|verbrauch|kwh)/i.test(value) && !ENERGY_QUESTION_PATTERN.test(value);
  const asksEnergy = ENERGY_QUESTION_PATTERN.test(value);

  if (asksWaterConsumptionOnly) {
    const entries = scopedItems
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.waterConsumption)
      .map((record) => formatConsumptionEntry({ ...record, annualConsumption: "" }, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Wasserverbrauchswerte sind:", entries)
        : formatSectionWithBullets("The documented water consumption values are:", entries),
      found: true,
    };
  }

  if (!asksEnergy && !asksConsumptionOnly) {
    return null;
  }

  if (asksEnergy) {
    const missingSubProductAnswer = answerForRequestedSubProductEnergy(question, items, language);
    if (missingSubProductAnswer) return missingSubProductAnswer;
  }

  if (shouldUseModelForEnergyAnswer(scopedItems)) {
    return null;
  }

  const records = scopedItems.flatMap((item) => getEnergyAnswerRecords(item, language));
  const consumptionEntries = records
    .filter((record) => record.annualConsumption || record.waterConsumption)
    .map((record) => formatCompactConsumptionEntry(record, language))
    .filter(Boolean);

  if (asksConsumptionOnly) {
    if (!consumptionEntries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    const body = language === "de"
      ? formatSectionWithBullets(records.length > 1 ? "Hier sind die dokumentierten Verbrauchswerte für alle ausgewählten Produkte:" : "Hier sind die dokumentierten Verbrauchswerte aus den Produktinformationen:", consumptionEntries)
      : formatSectionWithBullets("Here are the documented consumption values from the product information:", consumptionEntries);
    return {
      answer: body,
      found: true,
    };
  }
  const knownEntries = records
    .filter((record) => record.energyClass)
    .map((record) => {
      return language === "de"
        ? `${record.name}: Klasse ${record.energyClass}`
        : `${record.name}: energy class ${record.energyClass}`;
    });
  const unknownEntries = records
    .filter((record) => !record.energyClass)
    .map((record) => {
      if (language === "de") {
        const note = record.hasELabel ? "Energielabel vorhanden, aber keine Energieeffizienzklasse in den verfügbaren Produktinformationen eindeutig dokumentiert" : "keine Energieeffizienzklasse eindeutig dokumentiert";
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
      ? formatSectionWithBullets(records.length > 1 ? "Hier sind die dokumentierten Energieeffizienzklassen der ausgewählten Produkte:" : "Die dokumentierte Energieeffizienzklasse ist:", knownEntries)
      : formatSectionWithBullets("Documented energy class:", knownEntries));
  }
  if (unknownEntries.length) {
    answerBlocks.push(language === "de"
      ? `In den verfügbaren Produktinformationen nicht eindeutig dokumentiert:\n${unknownEntries.join("\n")}`
      : formatSectionWithBullets("Not found in the available product text:", unknownEntries));
  }

  const followUp = getNextDocumentedFollowUp(scopedItems, language, "energy", answeredTopics);

  return {
    answer: followUp ? `${answerBlocks.join("\n\n")}\n\n${followUp}` : answerBlocks.join("\n\n"),
    found: true,
  };
}

function answerFromExplicitMultiItemFacts(question, items, language, answeredTopics = new Set()) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE[language] || EXACT_UNSUPPORTED_FACT_ANSWER_BY_LANGUAGE.en;
  const installationDistanceRefusal = answerForInstallationDistanceRefusal(question, items, language);
  if (installationDistanceRefusal) return installationDistanceRefusal;
  const scopedItems = scopeItemsForQuestion(items, question);
  const asksProgramsOrFeatures = /\b(?:programs?|programmes?|features?|functions?|programme|funktionen)\b/i.test(value);
  const asksNoise = /(noise|sound|loud|geraeusch|gerÃ¤usch|lautstÃ¤rke|lautstaerke|luftschallemission|dezibel|dezi(?:bel)?|decibels?|\blaut\b|db\b|dba\b)/i.test(value);

  if (WARRANTY_QUESTION_PATTERN.test(value)) {
    const entries = scopedItems
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
      answer: getBusinessPolicyWarrantyAnswer(language, scopedItems.length, isWarrantyDocumentationQuestion(question)),
      found: true,
    };
  }

  if (/\b(?:water|watter|water use|water consumption|wasserverbrauch|how much water)\b/i.test(value) && !/\b(?:energy consumption|energieverbrauch|stromverbrauch|kwh)\b/i.test(value)) {
    const entries = scopedItems
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.waterConsumption)
      .map((record) => formatConsumptionEntry({ ...record, annualConsumption: "" }, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Wasserverbrauchswerte sind:", entries)
        : formatSectionWithBullets("The documented water consumption values are:", entries),
      found: true,
    };
  }

  if (/\b(?:liter|litre|liters|litres|volume|capacity|nutzinhalt|volumen|kapazität|kapazitaet)\b|\bl\b/i.test(value)) {
    const entries = scopedItems
      .map((item) => formatLiterSpecEntry(item, language))
      .filter(Boolean);

    if (entries.length) {
      return {
        answer: language === "de"
          ? formatSectionWithBullets("Die dokumentierten Liter-Angaben sind:", entries)
          : formatSectionWithBullets("The documented litre values are:", entries),
        found: true,
      };
    }

    if (!/\b(?:capacity|kapazität|kapazitaet)\b/i.test(value)) {
      return { answer: notFoundAnswer, found: false };
    }
  }

  if (/(consumption|verbrauch|kwh|energy use|energieverbrauch|stromverbrauch)/i.test(value)) {
    const entries = scopedItems
      .flatMap((item) => getEnergyAnswerRecords(item, language))
      .filter((record) => record.annualConsumption || record.waterConsumption)
      .map((record) => formatCompactConsumptionEntry(record, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    const body = language === "de"
      ? formatSectionWithBullets(scopedItems.length > 1 ? "Hier sind die dokumentierten Verbrauchswerte für alle ausgewählten Produkte:" : "Hier sind die dokumentierten Verbrauchswerte aus den Produktinformationen:", entries)
      : formatSectionWithBullets("Here are the documented consumption values from the product information:", entries);

    return {
      answer: body,
      found: true,
    };
  }

  if (/\b(?:place settings?|gedecke|maßgedecke|massgedecke)\b/i.test(value)) {
    const entries = scopedItems
      .map((item) => formatPlaceSettingsEntry(item, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Maßgedecke sind:", entries)
        : formatSectionWithBullets("The documented place settings are:", entries),
      found: true,
    };
  }

  if (/\b(?:kg|kilograms?|kilos?|capacity|load capacity|füllmenge|fuellmenge|beladung|gewicht|weight)\b/i.test(value)) {
    const entries = scopedItems
      .map((item) => formatKilogramSpecEntry(item, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Kilogramm-Angaben sind:", entries)
        : formatSectionWithBullets("The documented kilogram values are:", entries),
      found: true,
    };
  }

  if (/\b(?:cooking zones?|zones?|kochzonen?|kochstellen)\b/i.test(value)) {
    const entries = scopedItems
      .map((item) => formatCookingZonesEntry(item, language))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Kochzonen sind:", entries)
        : formatSectionWithBullets("The documented cooking zones are:", entries),
      found: true,
    };
  }

  if (/\bsteam\s*wash\b/i.test(value)) {
    const entries = scopedItems
      .filter((item) => /steam\s*wash/i.test(getCombinedItemInfoText(item)))
      .map((item) => `${getPublicItemName(item, language)}: Steam Wash`);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Dokumentiert:", entries)
        : formatSectionWithBullets("Documented:", entries),
      found: true,
    };
  }

  if (asksProgramsOrFeatures && asksNoise) {
    const entries = scopedItems
      .map((item) => {
        const features = formatProgramOrFeatureEntry(item, language, question);
        const noise = extractNoiseValueStrict(item);
        const noiseText = noise ? `${language === "de" ? "Geraeusch" : "Noise"}: ${noise}` : "";
        const parts = [features, noiseText].filter(Boolean);
        return parts.length ? parts.join("; ") : null;
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Programme/Funktionen und Geraeuschwerte sind:", entries)
        : formatSectionWithBullets("The documented programs/features and noise values are:", entries),
      found: true,
    };
  }

  const namedFeatureAnswer = answerFromNamedDocumentedFeatures(question, scopedItems, language);
  if (namedFeatureAnswer) return namedFeatureAnswer;

  if (asksProgramsOrFeatures) {
    const requestedSubProductsFeatures = answerForRequestedSubProductsFeatures(question, items, language);
    if (requestedSubProductsFeatures) {
      return requestedSubProductsFeatures;
    }

    const entries = scopedItems
      .map((item) => formatProgramOrFeatureEntry(item, language, question))
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? formatSectionWithBullets("Die dokumentierten Programme/Funktionen sind:", entries)
        : formatSectionWithBullets("The documented programs/features are:", entries),
      found: true,
    };
  }

  if (asksNoise) {
    const entries = scopedItems
      .map((item) => {
        const noise = extractNoiseValueStrict(item);
        if (!noise) return null;
        return `${getPublicItemName(item, language)}: ${noise}`;
      })
      .filter(Boolean);

    if (!entries.length) {
      return { answer: notFoundAnswer, found: false };
    }

    const followUp = getNextDocumentedFollowUp(scopedItems, language, "noise", answeredTopics);
    const body = language === "de"
      ? formatSectionWithBullets("Die dokumentierten Geräuschwerte sind:", entries)
      : formatSectionWithBullets("The documented noise values are:", entries);

    return {
      answer: body,
      found: true,
    };
  }

  if (/(installation dimensions|dimensions|dimesnions|dimensons|dimentions|dimmensions|measurements|mesurements|how big|size|width|height|depth|abmessungen|ma[sß]e|nischenmass|nischenma[sß]e|einbaumass|einbauma[sß]e|breite|höhe|hoehe|tiefe)/i.test(value)) {
    const asksOnlyInstallationOrNiche = /(installation dimensions|niche dimensions|nischenmass|nischenma(?:ß|ss)e|einbaumass|einbauma(?:ß|ss)e|einbau|niche)/i.test(value);
    if (asksOnlyInstallationOrNiche) {
      const entries = scopedItems
        .map((item) => {
          const dimensions = extractInstallationDimensionsStrict(item);
          const lines = splitDocumentedDimensionLines(dimensions).filter((line) =>
            /(niche dimensions|installation dimensions|cut-out dimensions|nischenma(?:ß|ss)e|einbauma(?:ß|ss)e|ausschnittma(?:ß|ss)e)/i.test(line),
          );
          if (!lines.length) return null;
          const normalizedLines = lines.map((line) => normalizeDimensionLabel(line, language));
          if (language === "de") {
            return [`- ${getCompactDimensionName(getPublicItemName(item, language))}:`, ...normalizedLines.map((line) => `  ${line}`)].join("\n");
          }
          return formatCompactEnglishDimensionRecords(normalizedLines
            .map((line) => compactEnglishDimensionRecord(line, getCompactDimensionName(getPublicItemName(item, language))))
            .filter(Boolean));
        })
        .filter(Boolean);

      if (!entries.length) {
        return { answer: notFoundAnswer, found: false };
      }

      return {
        answer: language === "de"
          ? `Ich habe diese dokumentierten Einbau- oder Nischenmaße gefunden:\n\n${entries.join("\n\n")}`
          : `I found these documented installation or niche dimensions:\n\n${entries.join("\n")}\n\n${getEnglishDimensionFormatNote()}`,
        found: true,
      };
    }

    const requestedSubProductsDimensions = answerForRequestedSubProductsDimensions(question, items, language);
    if (requestedSubProductsDimensions) {
      return requestedSubProductsDimensions;
    }

    const requestedSubProductDimensions = answerForRequestedSubProductDimensions(question, items, language);
    if (requestedSubProductDimensions) {
      return requestedSubProductDimensions;
    }

    let documentedDimensionCount = 0;
    const entries = scopedItems
      .map((item) => {
        const dimensions = extractInstallationDimensionsStrict(item);
        if (dimensions) {
          documentedDimensionCount += 1;
          return formatCompactDimensionEntryByLanguage(getPublicItemName(item, language), dimensions, language);
        }
        if (scopedItems.length <= 1) return null;
        return language === "de"
          ? `- ${getCompactDimensionName(getPublicItemName(item, language))}: nicht dokumentiert`
          : `- ${getCompactDimensionName(getPublicItemName(item, language))}: not documented`;
      })
      .filter(Boolean);

    if (!documentedDimensionCount) {
      return { answer: notFoundAnswer, found: false };
    }

    return {
      answer: language === "de"
        ? `Ich habe diese dokumentierten Geräte- oder Einbaumaße gefunden:\n\n${entries.join("\n\n")}`
        : `I found these documented dimensions:\n\n${entries.join("\n")}\n\n${getEnglishDimensionFormatNote()}`,
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
  if (!/\bmodels?\b|\bmodell(?:e|namen)?\b|\bproduct names?\b|\bproduktnamen\b|\bgerätenamen\b|\bgeraetenamen\b|\bwelche produkte\b|\bwhat products\b|\bwhich products\b/i.test(value)) {
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

function isOverviewQuestion(question) {
  return isOverviewRequest(question) && !detectTopic(question);
}

function getControlledOverviewType(item) {
  const sourceText = getCombinedItemInfoText(item);
  const model = extractKnownModel(item);
  const typeLabel = getPublicTypeLabelForModel(model, item, "en");
  const hasOven = /\boven\b|backofen|einbaubackofen|ebx\s*943/i.test(sourceText) || typeLabel === "Built-in oven";
  const hasHob = /\bhob\b|kochfeld|ol-kmi\s*754/i.test(sourceText) || typeLabel === "Hob";

  if (hasOven && hasHob) return "oven_hob";
  if (/extractor hood|dunstabzug|haube|fh\s*664|khf\s*664/i.test(sourceText) || typeLabel === "Extractor hood") return "hood";
  if (/washing machine|waschmaschine|ewa\s*34660/i.test(sourceText) || typeLabel === "Washing machine") return "washing_machine";
  if (/dishwasher|geschirrsp|a-egspv/i.test(sourceText) || typeLabel === "Dishwasher") return "dishwasher";
  if (/refrigerator|fridge|kühl|kuehl|gefrier|kgc\s*15495|ol-kgcn/i.test(sourceText) || typeLabel === "Refrigerator-freezer") return "fridge_freezer";
  if (/\bKA220043_S3\b|LED lighting set|LED-Beleuchtungsset|Beleuchtungsset/i.test(sourceText) || typeLabel === "LED lighting set") return "lighting_set";
  if (hasOven) return "oven";
  if (hasHob) return "hob";
  return "product";
}

function buildProductOverviewEntry(item, language) {
  const type = getControlledOverviewType(item);
  const entries = {
    en: {
      hood: "Extractor hood: ventilation above the hob.",
      washing_machine: "Washing machine: built-in appliance for laundry.",
      dishwasher: "Dishwasher: fully integrated 60 cm dishwasher.",
      oven_hob: "Oven + hob set: appliances for baking and cooking.",
      oven: "Built-in oven: appliance for baking.",
      hob: "Hob: appliance for cooking.",
      fridge_freezer: "Fridge-freezer: appliance for cooling and freezing.",
      lighting_set: "LED lighting set: selected lighting set with an energy label.",
      product: "Product: selected appliance with available product information.",
    },
    de: {
      hood: "Dunstabzugshaube: Lüftung über dem Kochfeld.",
      washing_machine: "Waschmaschine: Einbaugerät zum Waschen.",
      dishwasher: "Geschirrspüler: vollintegrierter 60-cm-Geschirrspüler.",
      oven_hob: "Backofen + Kochfeld: Geräte zum Backen und Kochen.",
      oven: "Einbaubackofen: Gerät zum Backen.",
      hob: "Kochfeld: Gerät zum Kochen.",
      fridge_freezer: "Kühl-Gefrierkombination: Gerät zum Kühlen und Gefrieren.",
      product: "Produkt: ausgewähltes Gerät mit verfügbaren Produktinformationen.",
    },
  };

  return entries[language]?.[type] || entries.en[type] || "";
}

function answerFromProductOverview(question, items, language) {
  if (!isOverviewQuestion(question)) return null;

  const entries = items
    .map((item) => buildProductOverviewEntry(item, language))
    .filter(Boolean);

  if (!entries.length) {
    return {
      answer: NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en,
      found: false,
    };
  }

  return {
    answer: language === "de"
      ? formatSectionWithBullets("Hier ist ein kurzer Überblick über die ausgewählten Geräte:", entries)
      : formatSectionWithBullets("Here is a short overview of the selected appliances:", entries),
    found: true,
  };
}

function answerFromStructuredFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const item = items.length === 1 ? items[0] : null;
  if (!item) return null;

  const name = item.name || (language === "de" ? "Das Produkt" : "The product");
  const yes = language === "de" ? "Ja." : "Yes.";
  const combinedInfoText = getCombinedItemInfoText(item);

  if (/steam\s*wash/i.test(value) && /steam\s*wash/i.test(combinedInfoText)) {
    return {
      answer: language === "de"
        ? `${yes} Steam Wash ist in den Produktinformationen dokumentiert.`
        : `${yes} Steam Wash is documented in the product information.`,
      found: true,
    };
  }

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
          ? `Ja. Für dieses Produkt gibt es ein Energielabel-PDF.`
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
          ? "Es handelt sich um eine Flachschirmhaube / Teleskophaube, nicht um eine Kaminhaube."
          : "It is a flat pull-out hood (Flachschirmhaube / Teleskophaube), not a chimney hood.",
        found: true,
      };
    }
    if (/chimney hood|kaminhaube/i.test(sourceText)) {
      return {
        answer: language === "de"
          ? "Es handelt sich um eine Kaminhaube."
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
    "For German answers, use polished customer-facing German with a consistent formal Sie/Ihnen tone, not literal translated phrasing.",
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
    "Understand close mixed-language wording from customers. For example, treat 'energy klasse' as 'energy class' and 'energie class' as 'Energieeffizienzklasse'.",
    "Accept German umlauts and fallback spellings as equivalent, including für/fuer, Geräusch/Geraeusch, Kühl/Kuehl, Maße/Masse, and Höhe/Hoehe.",
    "Use consistent German terminology: Energieeffizienzklasse, Energielabel, Energieverbrauch, jährlicher Energieverbrauch, Verbrauchswerte, Lautstärke, Geräuschwerte, Maße, Gerätemaße, Nischenmaße, Einbaumaße, Ausschnittmaße, Einbautiefe, Dunstabzugshaube, Flachschirmhaube / Teleskophaube, Kaminhaube, Geschirrspüler, Waschmaschine, Einbaubackofen, Kochfeld, Kühl-Gefrierkombination, Garantie, Fragmento-Geschäftsrichtlinie, Produktdokumentation, and Produktinformationen.",
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
    const answeredTopics = getPreviouslyAnsweredTopics(conversationMessages);
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

    const unresolvedAffirmativeAnswer = getUnresolvedAffirmativeAnswer(question, conversationMessages, responseLanguage);
    if (unresolvedAffirmativeAnswer) {
      return NextResponse.json(unresolvedAffirmativeAnswer);
    }

    const metaOrUnsupportedAnswer = getMetaOrUnsupportedRouteAnswer(effectiveQuestion, responseLanguage);
    if (metaOrUnsupportedAnswer) {
      return NextResponse.json(metaOrUnsupportedAnswer);
    }

    const conversationalAnswer = getConversationalRouteAnswer(effectiveQuestion, responseLanguage);
    if (conversationalAnswer) {
      return NextResponse.json(conversationalAnswer);
    }

    const items = await loadAuthorizedProductInfoItems({ itemIds, contractNumber, kitchenSlug });

    const usableContextItems = items
      .filter(hasUsableProductInfo);
    if (!usableContextItems.length) {
      return NextResponse.json({ answer: noInfoAnswer, found: false });
    }

    const multiTopicComparisonAnswer = answerFromMultiTopicComparison(effectiveQuestion, usableContextItems, responseLanguage);
    if (multiTopicComparisonAnswer) {
      return NextResponse.json(multiTopicComparisonAnswer);
    }

    const comparisonAnswer = answerFromComparison(effectiveQuestion, usableContextItems, responseLanguage);
    if (comparisonAnswer) {
      return NextResponse.json(comparisonAnswer);
    }

    const recommendationAnswer = answerFromRecommendation(effectiveQuestion, usableContextItems, responseLanguage);
    if (recommendationAnswer) {
      return NextResponse.json(recommendationAnswer);
    }

    const productAliasOnlyAnswer = answerFromProductAliasOnly(effectiveQuestion, usableContextItems, responseLanguage);
    if (productAliasOnlyAnswer) {
      return NextResponse.json(productAliasOnlyAnswer);
    }

    const overviewAnswer = answerFromProductOverview(effectiveQuestion, usableContextItems, responseLanguage);
    if (overviewAnswer) {
      return NextResponse.json(overviewAnswer);
    }

    const multiItemModelAnswer = answerFromExplicitMultiItemModels(effectiveQuestion, usableContextItems, responseLanguage);
    if (multiItemModelAnswer) {
      return NextResponse.json(multiItemModelAnswer);
    }

    const eLabelDocumentAnswer = answerFromELabelDocumentFacts(effectiveQuestion, usableContextItems, responseLanguage);
    if (eLabelDocumentAnswer) {
      return NextResponse.json(eLabelDocumentAnswer);
    }

    const multiItemEnergyAnswer = answerFromExplicitMultiItemEnergyFacts(effectiveQuestion, usableContextItems, responseLanguage, answeredTopics);
    if (multiItemEnergyAnswer) {
      return NextResponse.json(multiItemEnergyAnswer);
    }

    const multiItemStructuredAnswer = answerFromExplicitMultiItemFacts(effectiveQuestion, usableContextItems, responseLanguage, answeredTopics);
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

