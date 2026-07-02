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

export const DEFAULT_CUTLERY_ARTICLE_NUMBER = "ZB60SG";

function normalizeArticleNumber(articleNumber) {
  return String(articleNumber || "").trim().toUpperCase();
}

function inferCutleryWidthCm(articleNumber, fallbackName = "") {
  const articleMatch = normalizeArticleNumber(articleNumber).match(/^ZB(\d{2,3})SG$/);
  if (articleMatch) return Number(articleMatch[1]);

  const nameMatch = String(fallbackName || "").match(/\b(\d{2,3})\s*cm\b/i);
  return nameMatch ? Number(nameMatch[1]) : null;
}

export function normalizeCutleryVariants(variants = []) {
  const merged = new Map();

  for (const variant of [...CUTLERY_VARIANTS, ...variants]) {
    const articleNumber = normalizeArticleNumber(variant?.articleNumber);
    if (!articleNumber) continue;

    const widthCm = Number(variant?.widthCm || inferCutleryWidthCm(articleNumber, variant?.name || variant?.nameDe));
    if (!Number.isFinite(widthCm) || widthCm <= 0) continue;

    merged.set(articleNumber, {
      ...variant,
      articleNumber,
      widthCm,
      price: Number(variant?.price || 0),
      name: String(variant?.name || `Cutlery insert ${widthCm} cm`).trim(),
      nameDe: String(variant?.nameDe || `Besteckeinsatz ${widthCm} cm`).trim(),
    });
  }

  return [...merged.values()].sort((left, right) => left.widthCm - right.widthCm);
}

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

export function getCutleryVariant(articleNumber, variants = CUTLERY_VARIANTS) {
  const normalizedArticleNumber = normalizeArticleNumber(articleNumber);
  return normalizeCutleryVariants(variants).find((variant) => variant.articleNumber === normalizedArticleNumber) || null;
}

export function getCutleryVariantLabel(variant, translate, language = "en") {
  if (!variant) return "";
  const catalogName = String(language === "de" && variant.nameDe ? variant.nameDe : variant.name || "").trim();
  if (catalogName) return catalogName;

  const key = `configurator.cutleryInsert${variant.widthCm}`;
  const fallbackEn = `Cutlery insert ${variant.widthCm} cm`;
  const fallbackDe = `Besteckeinsatz ${variant.widthCm} cm`;
  return translate(key, language === "de" ? fallbackDe : fallbackEn);
}

export function createCutleryLineId(articleNumber) {
  return `cutlery-${normalizeArticleNumber(articleNumber)}`;
}

export function normalizeCutleryLines(lines = [], variants = CUTLERY_VARIANTS) {
  const merged = new Map();
  const normalizedVariants = normalizeCutleryVariants(variants);

  for (const line of lines) {
    const articleNumber = normalizeArticleNumber(line?.articleNumber);
    const variant = getCutleryVariant(articleNumber, normalizedVariants);
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

  return normalizedVariants
    .map((variant) => merged.get(variant.articleNumber))
    .filter(Boolean);
}

export function buildCutleryLineItems(baseItem, lines, translate, language = "en", variants = CUTLERY_VARIANTS) {
  if (!baseItem) return [];

  return normalizeCutleryLines(lines, variants).map((line) => {
    const variant = getCutleryVariant(line.articleNumber, variants);
    const name = getCutleryVariantLabel(variant, translate, language);

    return {
      ...baseItem,
      id: line.id,
      selectionKey: line.id,
      articleNumber: line.articleNumber,
      name,
      nameDe: getCutleryVariantLabel(variant, translate, "de"),
      widthMm: variant?.widthCm ? variant.widthCm * 10 : baseItem.widthMm,
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
  const articleNumber = normalizeArticleNumber(orderItem?.articleNumber);
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
