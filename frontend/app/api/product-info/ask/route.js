import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";

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

function normalizeLanguage(value) {
  return String(value || "").trim().toLowerCase() === "de" ? "de" : "en";
}

function buildProductContext(items) {
  return items
    .map((item, index) => {
      const facts = normalizeFacts(item.productInfoKeyFacts);
      return [
        `Produkt ${index + 1}: ${item.name}`,
        item.code ? `Code: ${item.code}` : "",
        item.productInfoSummary ? `Kurzfassung: ${item.productInfoSummary}` : "",
        facts.length ? `Wichtige Punkte:\n${facts.map((fact) => `- ${fact}`).join("\n")}` : "",
        item.productInfoExtractedText ? `PDF-Text:\n${item.productInfoExtractedText}` : "",
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

    const items = await prisma.kitchenItem.findMany({
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

    const contextItems = items.filter(hasUsableProductInfo);
    if (!contextItems.length) {
      return NextResponse.json({ answer: noInfoAnswer, found: false });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("Product info assistant is not configured.", 503);
    }

    const context = buildProductContext(contextItems);
    const model = process.env.OPENAI_PRODUCT_INFO_MODEL || "gpt-5.2";
    const instructions = [
      "You are a product information assistant for Fragmento kitchen orders.",
      "Answer only using the provided product information.",
      "Do not use general knowledge.",
      "Do not guess.",
      `The customer interface language is ${LANGUAGE_LABELS[responseLanguage] || LANGUAGE_LABELS.en}; answer in that language.`,
      "If the customer asks for the product name, model, type, or what the product is, use only the explicit product name, model, type, code, summary, or key facts from the provided product information.",
      "When the answer is available, give a direct answer first and include the most relevant concrete specifications or features from the provided information.",
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
