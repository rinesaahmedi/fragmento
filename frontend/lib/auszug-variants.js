export const AUSZUG_VARIANT_KEY = "auszug";

export function normalizeArticleNumber(value) {
  return String(value || "").trim().toUpperCase();
}

export function getAuszugVariantArticleNumber(articleNumber) {
  const match = normalizeArticleNumber(articleNumber).match(/^US(\d+)$/);
  return match ? `US2A${match[1]}` : "";
}

function toMoneyNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function articlePayload(article) {
  if (!article) return null;
  return {
    articleNumber: article.articleNumber || "",
    name: article.name || "",
    nameDe: article.nameDe || "",
    price: toMoneyNumber(article.price),
    widthMm: article.widthMm ?? null,
    heightMm: article.heightMm ?? null,
    depthMm: article.depthMm ?? null,
  };
}

export function buildAuszugVariantMetadata(item, variantArticles = []) {
  const baseArticleNumber = normalizeArticleNumber(item?.catalogArticle?.articleNumber || item?.articleNumber);
  const variantArticleNumber = getAuszugVariantArticleNumber(baseArticleNumber);
  if (!variantArticleNumber) return null;

  const variantArticle = variantArticles.find(
    (article) => normalizeArticleNumber(article?.articleNumber) === variantArticleNumber,
  );
  if (!variantArticle) return null;

  const blendeQuantity = item?.catalogBlendeId
    ? Math.max(1, Number.parseInt(String(item?.catalogBlendeQuantity || 1), 10) || 1)
    : 0;
  const blendeUnitPrice = item?.catalogBlende?.price != null
    ? toMoneyNumber(item.catalogBlende.price)
    : item?.blendePrice != null
      ? toMoneyNumber(item.blendePrice)
      : 0;
  const blendeTotal = blendeUnitPrice * blendeQuantity;
  const baseArticle = item?.catalogArticle
    ? articlePayload(item.catalogArticle)
    : {
        articleNumber: baseArticleNumber,
        name: item?.name || "",
        nameDe: item?.nameDe || "",
        price: Math.max(0, toMoneyNumber(item?.price) - blendeTotal),
        widthMm: item?.widthMm ?? null,
        heightMm: item?.heightMm ?? null,
        depthMm: item?.depthMm ?? null,
      };
  const variantPayload = articlePayload(variantArticle);

  if (!baseArticle || !variantPayload) return null;

  return {
    key: AUSZUG_VARIANT_KEY,
    baseArticleNumber,
    variantArticleNumber,
    options: [
      {
        key: "no",
        label: "No",
        ...baseArticle,
        price: baseArticle.price + blendeTotal,
        articleBasePrice: baseArticle.price,
      },
      {
        key: "yes",
        label: "Yes",
        ...variantPayload,
        price: variantPayload.price + blendeTotal,
        articleBasePrice: variantPayload.price,
      },
    ],
  };
}

export function findAuszugVariantOption(item, articleNumber) {
  const normalizedArticleNumber = normalizeArticleNumber(articleNumber);
  const options = item?.articleVariants?.[AUSZUG_VARIANT_KEY]?.options || [];
  if (!normalizedArticleNumber) {
    return options.find((option) => option.key === "no") || null;
  }
  return options.find((option) => normalizeArticleNumber(option.articleNumber) === normalizedArticleNumber) || null;
}

export function applyArticleVariantSelection(item, articleNumber) {
  const selectedOption = findAuszugVariantOption(item, articleNumber);
  if (!selectedOption || selectedOption.key === "no") {
    return item;
  }

  return {
    ...item,
    articleNumber: selectedOption.articleNumber || item.articleNumber,
    name: selectedOption.name || item.name,
    nameDe: selectedOption.nameDe || item.nameDe || "",
    price: selectedOption.price,
    widthMm: selectedOption.widthMm ?? item.widthMm ?? null,
    heightMm: selectedOption.heightMm ?? item.heightMm ?? null,
    depthMm: selectedOption.depthMm ?? item.depthMm ?? null,
    selectedArticleVariantKey: AUSZUG_VARIANT_KEY,
    selectedArticleVariantOptionKey: selectedOption.key,
  };
}

export function applyArticleVariantSelectionForDisplay(item, articleNumber) {
  const selectedItem = applyArticleVariantSelection(item, articleNumber);
  if (selectedItem === item) {
    return item;
  }

  return {
    ...selectedItem,
    name: item?.name || selectedItem.name,
    nameDe: item?.nameDe || selectedItem.nameDe || "",
  };
}

export function isValidAuszugVariantSelection(item, articleNumber) {
  const option = findAuszugVariantOption(item, articleNumber);
  return Boolean(option && option.key === "yes");
}

export function resolveAuszugVariantSelection(item, submittedArticleNumber, variantArticles = []) {
  const normalizedSubmittedArticleNumber = normalizeArticleNumber(submittedArticleNumber);
  const matchedArticleNumber = normalizeArticleNumber(item?.catalogArticle?.articleNumber || item?.articleNumber);
  if (!normalizedSubmittedArticleNumber || normalizedSubmittedArticleNumber === matchedArticleNumber) {
    return { status: "base", article: item?.catalogArticle || null };
  }

  const metadata = buildAuszugVariantMetadata(item, variantArticles);
  const option = metadata?.options?.find(
    (candidate) => normalizeArticleNumber(candidate.articleNumber) === normalizedSubmittedArticleNumber && candidate.key === "yes",
  );
  if (!option) {
    return { status: "invalid", article: null };
  }

  return {
    status: "variant",
    article: {
      articleNumber: option.articleNumber,
      name: option.name,
      nameDe: option.nameDe,
      price: option.articleBasePrice,
      widthMm: option.widthMm,
      heightMm: option.heightMm,
      depthMm: option.depthMm,
    },
  };
}
