import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";
import {
  NOT_FOUND_ANSWER_BY_LANGUAGE,
  NO_INFO_ANSWER_BY_LANGUAGE,
  TIMEOUT_ERROR_BY_LANGUAGE,
  UNAVAILABLE_ERROR_BY_LANGUAGE,
  FAILED_ERROR_BY_LANGUAGE,
  MAX_QUESTION_LENGTH,
  OPENAI_TIMEOUT_MS,
  jsonError,
  normalizeItemIds,
  normalizeConversationMessages,
  buildConversationContext,
  normalizeLanguage,
  getConversationalRouteAnswer,
  getMetaOrUnsupportedRouteAnswer,
  normalizeRequiredString,
  buildProductContext,
  hasUsableProductInfo,
  sanitizeUnsupportedFollowUps,
  getPreviouslyAnsweredTopics,
  getUnresolvedAffirmativeAnswer,
  resolveEffectiveQuestion,
  stripAffirmativeLead,
  answerFromProductAliasOnly,
  answerFromMultiTopicComparison,
  answerFromComparison,
  answerFromRecommendation,
  answerFromExplicitMultiItemEnergyFacts,
  answerFromExplicitMultiItemFacts,
  answerFromExplicitMultiItemModels,
  answerFromProductOverview,
  answerFromStructuredFacts,
  answerFromELabelDocumentFacts,
  extractResponseText,
  detectQuestionLanguage,
  parseAssistantJson,
  loadAuthorizedProductInfoItems,
  buildProductAssistantInstructions
} from "../../../../lib/product-info-ask";

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

