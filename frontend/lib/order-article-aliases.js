const KITCHEN_ARTICLE_NUMBER_ALIAS_SLUGS = new Set([
  "burger-103898",
  "ab-105762",
  "ab-105766",
  "ab-105770",
  "ab-105774",
  "ab-105775",
  "ab-105776",
]);

export function allowsKitchenArticleNumberAlias(kitchenSlug) {
  return KITCHEN_ARTICLE_NUMBER_ALIAS_SLUGS.has(
    String(kitchenSlug || "").trim().toLowerCase(),
  );
}

export function matchesConfiguredArticleNumber({
  submittedArticleNumber,
  catalogArticleNumber,
  kitchenArticleNumber,
  allowKitchenArticleNumberAlias = false,
}) {
  if (!submittedArticleNumber) return false;

  return submittedArticleNumber === (catalogArticleNumber || kitchenArticleNumber)
    || (
      allowKitchenArticleNumberAlias
      && submittedArticleNumber === kitchenArticleNumber
    );
}
