export const CATALOG_PRICE_SYNC_MODES = {
  AUTO: "AUTO",
  MANUAL: "MANUAL",
  LOCKED_INCLUDED: "LOCKED_INCLUDED",
  TEST_DATA: "TEST_DATA",
};

export const TEST_KITCHEN_SLUG = "test-3d-kitchen";

export function moneyToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

export function getCatalogProgramPrice(catalogRecord) {
  return catalogRecord?.programPrices?.[0]?.price ?? catalogRecord?.price ?? null;
}

export function centsToMoney(cents) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export function getBlendeQuantity(item) {
  return Math.max(1, Number.parseInt(String(item?.catalogBlendeQuantity || 1), 10) || 1);
}

export function getBlendeTotalCents(item, blendePrice = item?.blendePrice) {
  if (blendePrice == null || !item?.catalogBlendeId) return 0;
  return moneyToCents(blendePrice) * getBlendeQuantity(item);
}

export function isDefaultIncludedKitchenItem(item) {
  const code = String(item?.code || "").toUpperCase();
  const iconKey = String(item?.iconKey || "").toLowerCase();
  const componentKey = String(item?.componentKey || "").toLowerCase();

  return Boolean(item?.isLocked) && (
    code === "OVEN-B-600-HOB"
    || code === "SINKBASE-B-600"
    || code === "SINK-WORKTOP"
    || code.startsWith("TOP-")
    || iconKey === "worktop"
    || componentKey === "worktop"
  );
}

export function getCatalogExpectedPriceCents(item) {
  if (item?.catalogService) {
    return moneyToCents(item.catalogServiceProgramPrice?.price ?? item.catalogService.price);
  }

  if (!item?.catalogArticle) {
    return null;
  }

  const articlePrice = item.catalogArticleProgramPrice?.price ?? item.catalogArticle.price;
  const blendePrice = item.catalogBlendeProgramPrice?.price ?? item.catalogBlende?.price;

  return moneyToCents(articlePrice)
    + (item.catalogBlende && blendePrice != null ? moneyToCents(blendePrice) * getBlendeQuantity(item) : 0);
}

export function getKitchenItemBasePriceCents(item, fallbackBlendePrice = item?.blendePrice) {
  if (item?.catalogArticle) {
    return moneyToCents(item.catalogArticleProgramPrice?.price ?? item.catalogArticle.price);
  }

  return Math.max(0, moneyToCents(item?.price) - getBlendeTotalCents(item, fallbackBlendePrice));
}

export function buildKitchenItemPriceWithBlende(item, nextBlendePrice = item?.blendePrice) {
  return centsToMoney(getKitchenItemBasePriceCents(item) + getBlendeTotalCents(item, nextBlendePrice));
}

export function shouldSyncKitchenItemPrice(item, options = {}) {
  if (!item) return false;
  if (item.kitchen?.slug === TEST_KITCHEN_SLUG && !options.includeTestKitchens) return false;
  if (isDefaultIncludedKitchenItem(item)) return false;
  if (item.catalogPriceSyncMode === CATALOG_PRICE_SYNC_MODES.MANUAL) return false;
  if (item.catalogPriceSyncMode === CATALOG_PRICE_SYNC_MODES.LOCKED_INCLUDED) return false;
  if (item.catalogPriceSyncMode === CATALOG_PRICE_SYNC_MODES.TEST_DATA && !options.includeTestKitchens) return false;
  if (item.isLocked && !options.includeLocked) return false;
  if (options.requireMatched !== false && item.catalogLinkStatus !== "MATCHED") return false;
  return Boolean(item.catalogArticle || item.catalogService);
}

export function buildSyncedKitchenItemPrice(item) {
  const expectedPriceCents = getCatalogExpectedPriceCents(item);
  return expectedPriceCents == null ? null : centsToMoney(expectedPriceCents);
}
