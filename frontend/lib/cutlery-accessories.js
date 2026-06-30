export const CUTLERY_VARIANTS = [
  { articleNumber: "ZB30SG", widthCm: 30, price: 19 },
  { articleNumber: "ZB40SG", widthCm: 40, price: 19 },
  { articleNumber: "ZB45SG", widthCm: 45, price: 22 },
  { articleNumber: "ZB50SG", widthCm: 50, price: 22 },
  { articleNumber: "ZB60SG", widthCm: 60, price: 25 },
  { articleNumber: "ZB80SG", widthCm: 80, price: 31 },
  { articleNumber: "ZB90SG", widthCm: 90, price: 31 },
  { articleNumber: "ZB100SG", widthCm: 100, price: 36 },
];

const CUTLERY_VARIANT_BY_ARTICLE = new Map(
  CUTLERY_VARIANTS.map((variant) => [variant.articleNumber, variant]),
);

export const DEFAULT_CUTLERY_ARTICLE_NUMBER = "ZB60SG";

export function isCutleryAccessoryCode(code) {
  return String(code || "").trim().toUpperCase().startsWith("ACC-CUTLERY");
}

export function isCutleryAccessoryItem(item) {
  if (!item) return false;
  return item.iconKey === "cutlery_insert" || isCutleryAccessoryCode(item.code);
}

export function getCutleryBaseItem(accessories = []) {
  return accessories.find((item) => isCutleryAccessoryItem(item)) || null;
}

export function getCutleryVariant(articleNumber) {
  return CUTLERY_VARIANT_BY_ARTICLE.get(String(articleNumber || "").trim().toUpperCase()) || null;
}

export function getCutleryVariantLabel(variant, translate, language = "en") {
  if (!variant) return "";
  const key = `configurator.cutleryInsert${variant.widthCm}`;
  const fallbackEn = `Cutlery insert ${variant.widthCm} cm`;
  const fallbackDe = `Besteckeinsatz ${variant.widthCm} cm`;
  return translate(key, language === "de" ? fallbackDe : fallbackEn);
}

export function createCutleryLineId(articleNumber) {
  return `cutlery-${String(articleNumber || "").trim().toUpperCase()}`;
}

export function normalizeCutleryLines(lines = []) {
  const merged = new Map();

  for (const line of lines) {
    const articleNumber = String(line?.articleNumber || "").trim().toUpperCase();
    const variant = getCutleryVariant(articleNumber);
    if (!variant) continue;

    const quantity = Math.max(1, Math.min(99, Math.floor(Number(line?.quantity || 1))));
    const existing = merged.get(articleNumber);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
      continue;
    }

    merged.set(articleNumber, {
      id: createCutleryLineId(articleNumber),
      articleNumber,
      quantity,
    });
  }

  return CUTLERY_VARIANTS
    .map((variant) => merged.get(variant.articleNumber))
    .filter(Boolean);
}

export function buildCutleryLineItems(baseItem, lines, translate, language = "en") {
  if (!baseItem) return [];

  return normalizeCutleryLines(lines).map((line) => {
    const variant = getCutleryVariant(line.articleNumber);
    const name = getCutleryVariantLabel(variant, translate, language);

    return {
      ...baseItem,
      id: line.id,
      selectionKey: line.id,
      articleNumber: line.articleNumber,
      name,
      nameDe: getCutleryVariantLabel(variant, translate, "de"),
      price: variant?.price ?? Number(baseItem.price || 0),
      quantity: line.quantity,
      isCutleryLine: true,
    };
  });
}

export function parseCutleryLineFromOrderItem(orderItem) {
  const code = String(orderItem?.code || "").trim();
  if (!isCutleryAccessoryCode(code)) return null;

  const quantity = Math.max(1, Math.floor(Number(orderItem?.quantity || 1)));
  const articleNumber = String(orderItem?.articleNumber || "").trim().toUpperCase();
  if (articleNumber && getCutleryVariant(articleNumber)) {
    return { articleNumber, quantity };
  }

  const name = String(orderItem?.name || orderItem?.nameSnapshot || "");
  const matchedVariant = CUTLERY_VARIANTS.find((variant) => {
    const pattern = new RegExp(`\\b${variant.widthCm}\\s*cm\\b`, "i");
    return pattern.test(name) || name.toUpperCase().includes(variant.articleNumber);
  });

  if (!matchedVariant) {
    return { articleNumber: DEFAULT_CUTLERY_ARTICLE_NUMBER, quantity };
  }

  return { articleNumber: matchedVariant.articleNumber, quantity };
}

export function buildInitialCutleryLines({ initialOrder, draft, accessoryCodes = [] }) {
  const orderAccessoryItems = (initialOrder?.items || initialOrder?.accessories || [])
    .filter((item) => String(item?.itemType || "").toLowerCase() === "accessory");
  const fromOrder = orderAccessoryItems
    .map(parseCutleryLineFromOrderItem)
    .filter(Boolean);
  if (fromOrder.length) {
    return normalizeCutleryLines(fromOrder);
  }

  if (Array.isArray(draft?.cutleryLines) && draft.cutleryLines.length) {
    return normalizeCutleryLines(draft.cutleryLines);
  }

  if (accessoryCodes.some((code) => isCutleryAccessoryCode(code))) {
    return normalizeCutleryLines([{ articleNumber: DEFAULT_CUTLERY_ARTICLE_NUMBER, quantity: 1 }]);
  }

  return [];
}
