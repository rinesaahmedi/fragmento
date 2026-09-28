const AB_105762_LAYOUT_SLUGS = new Set([
  "ab-105762",
  "ab-105766",
  "ab-105770",
  "ab-105774",
]);

const AB_105762_HOOD_ITEM_CODE = "CAB-HOOD-AB105762-600";
const AB_105762_HOOD_ARTICLE_NUMBER = "FH664621E + FWK124 + HD6002";

export function getNotificationArticleNumber({
  kitchenSlug,
  item,
  kitchenItem,
  catalogArticle,
  cutleryArticleNumber,
  burgerCutleryArticleNumber,
}) {
  if (
    AB_105762_LAYOUT_SLUGS.has(kitchenSlug)
    && item.code === AB_105762_HOOD_ITEM_CODE
  ) {
    // Orders created before the catalog correction contain the incomplete
    // snapshot "FH664621E + FWK124". Always render the complete package in
    // confirmations and PDFs, including when an old order is resent.
    return AB_105762_HOOD_ARTICLE_NUMBER;
  }

  return burgerCutleryArticleNumber
    || cutleryArticleNumber
    || item.articleNumberSnapshot
    || catalogArticle?.articleNumber
    || kitchenItem?.articleNumber
    || item.articleNumber
    || "";
}
