import { getSerialNumberHelpApplianceType } from "./serial-number-help.js";

export const CONTRACT_APPLIANCE_TYPES = [
  { type: "dishwasher", labelKey: "applianceDishwasher", label: "Dishwasher" },
  { type: "fridge", labelKey: "applianceFridge", label: "Fridge / freezer" },
  { type: "oven", labelKey: "applianceOven", label: "Oven" },
  { type: "hob", labelKey: "applianceHob", label: "Cooktop / hob" },
  { type: "extractor_hood", labelKey: "applianceExtractorHood", label: "Extractor hood" },
];

export const CONTRACT_APPLIANCE_BRANDS = [
  { value: "amica", label: "Amica" },
  { value: "bosch", label: "BOSCH" },
  { value: "aeg", label: "AEG" },
];

const APPLIANCE_TYPE_SET = new Set(CONTRACT_APPLIANCE_TYPES.map((entry) => entry.type));
const APPLIANCE_BRAND_SET = new Set(CONTRACT_APPLIANCE_BRANDS.map((entry) => entry.value));

export function normalizeContractApplianceType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "freezer") return "fridge";
  if (normalized === "cooktop") return "hob";
  return APPLIANCE_TYPE_SET.has(normalized) ? normalized : "";
}

export function normalizeContractApplianceBrand(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return APPLIANCE_BRAND_SET.has(normalized) ? normalized : "";
}

export function getContractApplianceBrandLabel(value) {
  const normalized = normalizeContractApplianceBrand(value);
  return CONTRACT_APPLIANCE_BRANDS.find((entry) => entry.value === normalized)?.label || "";
}

export function parseContractAppliances(formData) {
  return CONTRACT_APPLIANCE_TYPES.flatMap(({ type }) => {
    const presence = formData.get(`appliancePresent:${type}`);
    if (presence != null && !["true", "false"].includes(presence)) {
      throw new Error("Invalid appliance presence.");
    }
    const rawBrand = String(formData.get(`applianceBrand:${type}`) || "").trim();
    const brand = normalizeContractApplianceBrand(formData.get(`applianceBrand:${type}`));
    if (rawBrand && !brand) throw new Error("Choose Amica, BOSCH or AEG.");
    const articleNumber = String(formData.get(`applianceArticleNumber:${type}`) || "").trim();
    if (articleNumber.length > 120) throw new Error("Appliance article number is too long.");
    if (presence == null && !brand && !articleNumber) return [];

    return [{
      applianceType: type,
      brand: brand || null,
      articleNumber: articleNumber || null,
      serialHelpProfile: brand || null,
      source: "MANUAL",
      isPresent: presence !== "false",
    }];
  });
}

// A claim part identifies the physical appliance more precisely than its parent
// cabinet. Never classify fronts, filters or oven drawers as appliances.
export function getInventoryApplianceTypes(component = {}) {
  if (component.claimPartKey) {
    const type = normalizeContractApplianceType(component.claimPartKey);
    return type ? [type] : [];
  }
  const key = String(component.componentKey || component.componentId || "").toLowerCase();
  if (/blende|drawer|furniture-front|filter|light/.test(key)) return [];
  if (/oven-(?:module|hob)|oven_hob/.test(key)) return ["oven", "hob"];
  // Bare furniture slots are not evidence of an installed electrical appliance.
  if (/cabinet|base-module|sink|worktop/.test(key)) return [];
  const type = normalizeContractApplianceType(getSerialNumberHelpApplianceType(component));
  return type ? [type] : [];
}

export function inferApplianceBrand(product = {}) {
  product = product || {};
  const text = [product.brand, product.manufacturer, product.name, product.nameDe,
    product.nameSnapshot, product.productInfoSummary, product.productInfoExtractedText,
    ...(Array.isArray(product.productInfoKeyFacts) ? product.productInfoKeyFacts : []),
  ].filter(Boolean).join(" ");
  return normalizeContractApplianceBrand(text.match(/\b(amica|bosch|aeg)\b/i)?.[1]);
}

export function deriveKitchenAppliances({ selectableComponents = [], items = [], confirmedItems = [] } = {}) {
  const byType = new Map();
  // Prefer separately identified claim parts over their bundled cabinet row.
  for (const component of [...selectableComponents].sort((a, b) => Number(!!b.claimPartKey) - Number(!!a.claimPartKey))) {
    const item = items.find((entry) => entry.code === (component.sourceKitchenItemCode || component.code))
      || items.find((entry) => entry.componentKey === component.componentKey)
      || items.find((entry) => String(entry.articleNumber || entry.catalogArticle?.articleNumber || "")
        .split("+").some((part) => part.trim() === component.articleCode));
    const orderItem = confirmedItems.find((entry) =>
      (item?.id && entry.kitchenItemId === item.id) || entry.code === (item?.code || component.code));
    for (const applianceType of getInventoryApplianceTypes(component)) {
      if (byType.has(applianceType)) continue;
      const brand = inferApplianceBrand(orderItem) || inferApplianceBrand(component)
        || inferApplianceBrand(item?.catalogArticle) || inferApplianceBrand(item);
      byType.set(applianceType, {
        applianceType,
        brand: brand || null,
        articleNumber: (orderItem?.articleNumberSnapshot && !component.claimPartKey
          ? orderItem.articleNumberSnapshot : component.articleCode) || item?.articleNumber || null,
        serialHelpProfile: brand || null,
        source: orderItem ? "ORDER" : "KITCHEN_ITEM",
        isPresent: true,
        sourceKitchenItemId: item?.id || null,
        sourceComponentId: component.componentId,
        sourceOrderId: orderItem?.sourceOrderId || null,
        sharesOvenSerial: applianceType === "hob" && /EH92364(?:0E|E-A).*\+.*9EC744100C/i.test(item?.articleNumber || item?.catalogArticle?.articleNumber || ""),
      });
    }
  }
  return CONTRACT_APPLIANCE_TYPES.flatMap(({ type }) => byType.has(type) ? [byType.get(type)] : []);
}

export function resolveContractAppliances({ automatic = [], saved = [], manual = false, configured = false } = {}) {
  const base = manual
    ? CONTRACT_APPLIANCE_TYPES.map(({ type }) => ({ applianceType: type, isPresent: !configured, source: "MANUAL" }))
    : automatic;
  const entries = base.map((entry) => {
    const override = findContractAppliance(saved, entry.applianceType);
    if (!override) return entry;
    const brand = override.brand || entry.brand || null;
    const conflictingBrand = !!(override.brand && entry.brand && override.brand !== entry.brand);
    return {
      ...entry,
      brand,
      articleNumber: override.articleNumber || (conflictingBrand ? null : entry.articleNumber) || null,
      serialHelpProfile: brand,
      isPresent: manual ? override.isPresent !== false : true,
      source: override.brand || override.articleNumber || manual ? "MANUAL" : entry.source,
      conflictingBrand,
      sharesOvenSerial: !conflictingBrand && !override.articleNumber && entry.sharesOvenSerial === true,
      overrideBrand: override.brand || "",
      overrideArticleNumber: override.articleNumber || "",
    };
  });
  return { manual, configured: !manual || configured, entries, appliances: entries.filter((entry) => entry.isPresent) };
}

export function validateReferenceAppliances(issues, inventory) {
  return issues.map((issue) => {
    if (!issue.componentId.startsWith("reference-electrical-")) return issue;
    const type = normalizeContractApplianceType(issue.applianceType);
    const appliance = findContractAppliance(inventory.appliances, type);
    if (!type || !appliance || appliance.isPresent === false) {
      throw new Error("This appliance is no longer available for this contract. Reload the kitchen and select an installed appliance.");
    }
    const label = CONTRACT_APPLIANCE_TYPES.find((entry) => entry.type === type).label;
    return { ...issue, applianceType: type, name: label,
      ...(appliance.articleNumber ? { articleCode: appliance.articleNumber } : {}) };
  });
}

export function findContractAppliance(appliances, applianceType) {
  const normalizedType = normalizeContractApplianceType(applianceType);
  if (!normalizedType) return null;
  return (appliances || []).find(
    (entry) => normalizeContractApplianceType(entry?.applianceType) === normalizedType,
  ) || null;
}
