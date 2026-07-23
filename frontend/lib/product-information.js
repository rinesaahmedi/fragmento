export const CATALOG_PRODUCT_INFORMATION_SELECT = {
  productImagePath: true,
  productInfoPdfPath: true,
  productInfoSummary: true,
  productInfoKeyFacts: true,
  productInfoExtractedText: true,
  productInfoUpdatedAt: true,
};

function asKeyFacts(value) {
  return Array.isArray(value)
    ? value.map((fact) => String(fact || "").trim()).filter(Boolean)
    : [];
}

function resolveClaimProductInformation(claimProducts = []) {
  const products = (Array.isArray(claimProducts) ? claimProducts : [])
    .filter((product) => (
      product?.productInfoPdfPath
      || product?.productInfoSummary
      || asKeyFacts(product?.productInfoKeyFacts).length
      || product?.productInfoExtractedText
    ))
    .sort((left, right) => Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0));

  if (!products.length) return null;

  const updatedDates = products
    .map((product) => product?.productInfoUpdatedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  return {
    productImagePath: products.find((product) => product?.productImagePath)?.productImagePath || "",
    productInfoPdfPath: products.find((product) => product?.productInfoPdfPath)?.productInfoPdfPath || "",
    productInfoSummary: products.map((product) => product?.productInfoSummary).filter(Boolean).join("\n\n"),
    productInfoKeyFacts: products.flatMap((product) => asKeyFacts(product?.productInfoKeyFacts)),
    productInfoExtractedText: products.map((product) => product?.productInfoExtractedText).filter(Boolean).join("\n\n---\n\n"),
    productInfoUpdatedAt: updatedDates.length
      ? new Date(Math.max(...updatedDates.map((value) => value.getTime())))
      : null,
    source: "claim-products",
  };
}

export function resolveProductInformation(item = {}) {
  const catalogArticle = item?.catalogArticleId ? item?.catalogArticle : null;
  const claimProductInformation = resolveClaimProductInformation(item?.claimProducts);

  if (claimProductInformation) {
    return claimProductInformation;
  }

  return {
    productImagePath: catalogArticle?.productImagePath || item?.productImagePath || "",
    productInfoPdfPath: catalogArticle?.productInfoPdfPath || item?.productInfoPdfPath || "",
    productInfoSummary: catalogArticle?.productInfoSummary || item?.productInfoSummary || "",
    productInfoKeyFacts: asKeyFacts(catalogArticle?.productInfoKeyFacts).length
      ? asKeyFacts(catalogArticle.productInfoKeyFacts)
      : asKeyFacts(item?.productInfoKeyFacts),
    productInfoExtractedText:
      catalogArticle?.productInfoExtractedText || item?.productInfoExtractedText || "",
    productInfoUpdatedAt:
      catalogArticle?.productInfoUpdatedAt || item?.productInfoUpdatedAt || null,
    source: catalogArticle?.productInfoPdfPath
      || catalogArticle?.productInfoSummary
      || asKeyFacts(catalogArticle?.productInfoKeyFacts).length
      || catalogArticle?.productInfoExtractedText
      ? "catalog"
      : "kitchen-item",
  };
}
