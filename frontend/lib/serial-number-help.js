const DEFAULT_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png", altKey: "serialNumberHelpAlt1" },
  { src: "/serial%20nr%20img/amica/fridge/Amica%20fridge%20ARROW.png", altKey: "serialNumberHelpAlt2" },
];

const GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png", altKey: "serialNumberHelpAlt1" },
];

const DISHWASHER_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/dishwasher/Amica%20dishwasher%20ARROW.png", alt: "Amica dishwasher serial number location" },
];

const FRIDGE_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/fridge/Amica%20fridge%20ARROW.png", alt: "Amica fridge serial number location" },
];

const OVEN_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png", alt: "Amica oven serial number location" },
];

const EXTRACTOR_HOOD_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/extractor-hood/filter-location.jpeg", alt: "Amica extractor hood filter covering the serial number label location" },
  { src: "/serial%20nr%20img/amica/extractor-hood/rating-plate.jpeg", alt: "Amica extractor hood serial number on the rating plate behind the filter" },
];

const AMICA_HOB_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/amica/cooktop/Amica%20oven%20ARROW.png", alt: "Amica cooktop serial number location" },
];

const BOSCH_DISHWASHER_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/bosch/dishwasher/BOSCH%20dishwasher%20ARROW.png", alt: "BOSCH dishwasher serial number location" },
];

const BOSCH_FRIDGE_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/bosch/fridge/BOSCH%20fridge%20ARROW.png", alt: "BOSCH fridge serial number location" },
];

const BOSCH_OVEN_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/bosch/oven/BOSCH%20oven%20ARROW.png", alt: "BOSCH oven serial number location" },
];

const BOSCH_EXTRACTOR_HOOD_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/bosch/extractor-hood/WhatsApp%20Image%202026-08-07%20at%2009.04.57.jpeg", alt: "BOSCH extractor hood serial number location" },
  { src: "/serial%20nr%20img/bosch/extractor-hood/WhatsApp%20Image%202026-08-07%20at%2009.04.57%20(1).jpeg", alt: "BOSCH extractor hood rating plate location" },
];

const AEG_DISHWASHER_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/aeg/dishwasher/AEG%20dishwasher%20ARROW.png", alt: "AEG dishwasher serial number location" },
];

const AEG_FRIDGE_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/aeg/fridge/AEG%20fridge%201%20ARROW.png", alt: "AEG fridge serial number location" },
  { src: "/serial%20nr%20img/aeg/fridge/AEG%20fridge%202%20ARROW.png", alt: "AEG fridge rating plate location" },
];

const AEG_OVEN_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/aeg/oven/AEG%20OVEN%201%20ARROW.png", alt: "AEG oven serial number location" },
  { src: "/serial%20nr%20img/aeg/oven/AEG%20OVEN%202%20ARROW.png", alt: "AEG oven rating plate location" },
];

// Files live in /public/serial nr img/<brand>/<appliance>/.
// Add each supplied photo to its brand/type entry here. Empty entries mean
// photos are not available yet; never substitute a different brand.
// The internal hob key uses the cooktop folder; washing_machine is reserved
// for future kitchens and is deliberately absent from the appliance chooser.
export const SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE = {
  amica: {
    dishwasher: DISHWASHER_SERIAL_NUMBER_HELP_IMAGES,
    extractor_hood: EXTRACTOR_HOOD_SERIAL_NUMBER_HELP_IMAGES,
    fridge: FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
    hob: AMICA_HOB_SERIAL_NUMBER_HELP_IMAGES,
    oven: OVEN_SERIAL_NUMBER_HELP_IMAGES,
    washing_machine: [],
  },
  bosch: {
    dishwasher: BOSCH_DISHWASHER_SERIAL_NUMBER_HELP_IMAGES,
    extractor_hood: BOSCH_EXTRACTOR_HOOD_SERIAL_NUMBER_HELP_IMAGES,
    fridge: BOSCH_FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
    oven: BOSCH_OVEN_SERIAL_NUMBER_HELP_IMAGES,
    hob: [],
    washing_machine: [],
  },
  aeg: {
    dishwasher: AEG_DISHWASHER_SERIAL_NUMBER_HELP_IMAGES,
    extractor_hood: [],
    fridge: AEG_FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
    oven: AEG_OVEN_SERIAL_NUMBER_HELP_IMAGES,
    hob: [],
    washing_machine: [],
  },
};

export const SERIAL_NUMBER_HELP_IMAGES_BY_APPLIANCE_TYPE = {
  dishwasher: DISHWASHER_SERIAL_NUMBER_HELP_IMAGES,
  extractor_hood: EXTRACTOR_HOOD_SERIAL_NUMBER_HELP_IMAGES,
  fridge: FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
  freezer: FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
  hob: OVEN_SERIAL_NUMBER_HELP_IMAGES,
  oven: OVEN_SERIAL_NUMBER_HELP_IMAGES,
  washing_machine: GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES,
};

export const SERIAL_NUMBER_HELP_APPLIANCES = [
  { type: "dishwasher", labelKey: "serialNumberApplianceDishwasher" },
  { type: "fridge", labelKey: "serialNumberApplianceFridge" },
  { type: "oven", labelKey: "serialNumberApplianceOven" },
  { type: "hob", labelKey: "serialNumberApplianceHob" },
  { type: "extractor_hood", labelKey: "serialNumberApplianceExtractorHood" },
];

// Add product-specific help photos here when they arrive. Use the product's
// article number as the key and place the files in its brand/appliance folder.
// Example:
// "9EC744100C": [
//   { src: "/serial%20nr%20img/amica/cooktop/9EC744100C.webp", alt: "Serial number location" },
// ],
export const SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT = {};
// Register the manufacturer alongside a product-specific photo set so an
// explicit installed-brand override can never select another brand's photos.
export const SERIAL_NUMBER_HELP_PRODUCT_BRANDS = {};

function normalizeProductKey(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function inferSerialHelpProfileFromProduct(product) {
  const text = normalizeText([
    product?.brand,
    product?.manufacturer,
    product?.resolvedLabel,
    product?.label,
    product?.name,
  ].filter(Boolean).join(" "));
  return text.match(/\b(amica|bosch|aeg)\b/)?.[1] || "";
}

export function getSerialNumberHelpApplianceType(product = {}) {
  product = product || {};
  const claimPartKey = normalizeText(product.claimPartKey);
  if (claimPartKey === "cooktop") return "hob";
  if (SERIAL_NUMBER_HELP_IMAGES_BY_APPLIANCE_TYPE[claimPartKey]) {
    return claimPartKey;
  }

  const componentId = normalizeText(product.componentId || product.rowComponentId);
  if (componentId.includes("dishwasher")) return "dishwasher";
  if (componentId.includes("extractor-hood") || componentId.includes("hood")) return "extractor_hood";
  if (componentId.includes("refrigerator") || componentId.includes("fridge")) return "fridge";
  if (componentId.includes("wm-base") || componentId.includes("washing")) return "washing_machine";
  if (componentId.includes("cooktop") || componentId.includes("hob")) return "hob";
  if (componentId.includes("oven")) return "oven";

  const text = normalizeText([
    product.resolvedLabel,
    product.label,
    product.name,
    product.code,
    product.articleCode,
    product.articleNumber,
  ].filter(Boolean).join(" "));
  if (/\b(?:dishwasher|geschirrsp)/.test(text) || /\ba-?egspv/.test(text)) return "dishwasher";
  if (/\b(?:extractor hood|range hood|hood|dunstabzug|abzugshaube)\b/.test(text)) return "extractor_hood";
  if (/\b(?:fridge|refrigerator|freezer|kuehl|kuhl|gefrier|kgc)/.test(text)) return "fridge";
  if (/\b(?:washing machine|washer|waschmaschine|ewa)/.test(text)) return "washing_machine";
  if (/\b(?:cooktop|hob|kochfeld|kmi|ec744)\b/.test(text)) return "hob";
  if (/\b(?:oven|backofen|eh923|ebx943)\b/.test(text)) return "oven";

  return "";
}

function getConfiguredAppliance(appliances, applianceType) {
  const normalizedType = applianceType === "freezer" ? "fridge" : applianceType;
  return (appliances || []).find((entry) => {
    const entryType = normalizeText(entry?.applianceType);
    return (entryType === "freezer" ? "fridge" : entryType) === normalizedType;
  }) || null;
}

export function getSerialNumberHelpImages(product, appliances = []) {
  const applianceType = getSerialNumberHelpApplianceType(product);
  const configuredAppliance = getConfiguredAppliance(appliances, applianceType);
  if (configuredAppliance?.isPresent === false) return [];
  const serialHelpProfile = (configuredAppliance
    ? normalizeText(configuredAppliance.brand || configuredAppliance.serialHelpProfile)
    : inferSerialHelpProfileFromProduct(product)) || "amica";
  // A contract override must not reuse an old kitchen product's help images.
  const productKeys = (configuredAppliance ? [configuredAppliance.articleNumber] : [
    product?.articleCode,
    product?.articleNumber,
    product?.code,
    product?.resolvedArticleCode,
  ]).map(normalizeProductKey).filter(Boolean);

  for (const productKey of productKeys) {
    const images = SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT[productKey];
    const matchesBrand = !serialHelpProfile
      || normalizeText(SERIAL_NUMBER_HELP_PRODUCT_BRANDS[productKey]) === serialHelpProfile;
    if (matchesBrand && Array.isArray(images) && images.length) {
      return images;
    }
  }

  if (serialHelpProfile) {
    const profile = SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE[serialHelpProfile];
    if (!applianceType) return DEFAULT_SERIAL_NUMBER_HELP_IMAGES;
    const profileImages = profile?.[applianceType === "freezer" ? "fridge" : applianceType];
    if (Array.isArray(profileImages) && profileImages.length) return profileImages;
    // A dedicated cooktop photo takes precedence. Only a documented combined
    // oven/cooktop set may use its same-brand oven photo instead.
    if (applianceType === "hob" && configuredAppliance?.sharesOvenSerial) {
      return profile?.oven || [];
    }
    return Array.isArray(profileImages) ? profileImages : [];
  }

  const typeImages = SERIAL_NUMBER_HELP_IMAGES_BY_APPLIANCE_TYPE[applianceType];
  if (Array.isArray(typeImages) && typeImages.length) {
    return typeImages;
  }

  return DEFAULT_SERIAL_NUMBER_HELP_IMAGES;
}
