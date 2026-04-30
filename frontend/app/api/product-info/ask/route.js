import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";

const NOT_FOUND_ANSWER = "Diese Information konnte ich in der Produktinformation nicht finden.";
const NO_INFO_ANSWER = "Für dieses Produkt ist noch keine Produktinformation verfügbar.";
const MAX_QUESTION_LENGTH = 500;
const MAX_ITEM_IDS = 10;
const MAX_CONTEXT_CHARS = 7000;
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

function parseAssistantJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const answer = String(parsed?.answer || "").trim();
    const found = parsed?.found === true && answer && answer !== NOT_FOUND_ANSWER;
    return {
      answer: found ? answer : NOT_FOUND_ANSWER,
      found,
    };
  } catch {
    return {
      answer: NOT_FOUND_ANSWER,
      found: false,
    };
  }
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`product-info-ask:${clientIp}`, {
      limit: 40,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || "").trim();
    const itemIds = normalizeItemIds(body?.itemIds);

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
      return NextResponse.json({ answer: NO_INFO_ANSWER, found: false });
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
      "The customer may ask in English or German; always answer in German.",
      "If the customer asks for the product name, model, type, or what the product is, use only the explicit product name, model, type, code, summary, or key facts from the provided product information.",
      `If the answer is not clearly supported by the provided product information, answer exactly: "${NOT_FOUND_ANSWER}"`,
      "Keep answers short, clear, customer-friendly, and in German.",
      'Return only valid JSON with this shape: {"answer":"string","found":boolean}.',
      `Set found to false whenever the answer is "${NOT_FOUND_ANSWER}".`,
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
          max_output_tokens: 220,
        }),
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        return jsonError("Product info assistant timed out. Please try again.", 504);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text().catch(() => "");
      console.error("OpenAI product info request failed:", openAiResponse.status, errorText);
      return jsonError("Product info assistant is temporarily unavailable.", 503);
    }

    const responsePayload = await openAiResponse.json();
    const parsed = parseAssistantJson(extractResponseText(responsePayload));

    return NextResponse.json(parsed);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error("Product info assistant failed:", error);
    return jsonError(status === 429 ? error.message : "Product info assistant failed.", status);
  }
}
