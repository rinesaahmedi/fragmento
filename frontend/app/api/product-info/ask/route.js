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

const MAX_QUESTION_LENGTH = 500;
const MAX_ITEM_IDS = 10;
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

function buildProductContext(items) {
  return items
    .map((item, index) => {
      const facts = normalizeFacts(item.productInfoKeyFacts).map(normalizePublicProductBrand);
      return [
        `Produkt ${index + 1}: ${normalizePublicProductBrand(sanitizeProductContextName(item.name))}`,
        item.code ? `Code: ${item.code}` : "",
        item.productInfoSummary ? `Kurzfassung: ${normalizePublicProductBrand(item.productInfoSummary)}` : "",
        facts.length ? `Wichtige Punkte:\n${facts.map((fact) => `- ${fact}`).join("\n")}` : "",
        item.productInfoExtractedText ? `PDF-Text:\n${normalizePublicProductBrand(item.productInfoExtractedText)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_CONTEXT_CHARS);
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

function getItemDocumentLabels(item) {
  return getProductInfoDocuments({ code: item?.productInfoCode || item?.code })
    .map((document) => String(document?.label || "").trim())
    .filter(Boolean);
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
  if (/flachschirmhaube|teleskophaube|kaminhaube|chimney hood/i.test(sourceText)) {
    const typeLabel = /kaminhaube|chimney hood/i.test(sourceText)
      ? (language === "de" ? "Kaminhaube" : "chimney hood")
      : (language === "de" ? "Flachschirmhaube" : "flat pull-out hood");
    return explicitModel ? `${explicitModel} ${typeLabel}` : typeLabel;
  }

  return sanitizeProductContextName(item?.name || item?.code || (language === "de" ? "Das Produkt" : "The product"));
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

function answerFromExplicitMultiItemFacts(question, items, language) {
  const value = String(question || "").toLowerCase();
  const notFoundAnswer = NOT_FOUND_ANSWER_BY_LANGUAGE[language] || NOT_FOUND_ANSWER_BY_LANGUAGE.en;

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

    const usableContextItems = items.filter(hasUsableProductInfo);
    if (!usableContextItems.length) {
      return NextResponse.json({ answer: noInfoAnswer, found: false });
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
    const model = process.env.OPENAI_PRODUCT_INFO_MODEL || "gpt-5.2";
    const instructions = [
      "You are a product information assistant for Fragmento kitchen orders.",
      "Answer only using the provided product information.",
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

    return NextResponse.json(parsed);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const failedError = FAILED_ERROR_BY_LANGUAGE[responseLanguage] || FAILED_ERROR_BY_LANGUAGE.en;
    console.error("Product info assistant failed:", error);
    return jsonError(status === 429 ? error.message : failedError, status);
  }
}
