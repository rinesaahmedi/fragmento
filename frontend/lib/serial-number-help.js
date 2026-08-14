const DEFAULT_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
  { src: "/img/AMICA%20FRIDGE.webp", altKey: "serialNumberHelpAlt2" },
];

const GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
];

const DISHWASHER_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/dishwasher/Amica%20dishwasher%20ARROW.png", alt: "Dishwasher serial number location" },
];

const FRIDGE_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/fridge/Amica%20fridge%20ARROW.png", alt: "Fridge serial number location" },
];

const OVEN_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/serial%20nr%20img/oven/Amica%20oven%20ARROW.png", alt: "Oven serial number location" },
];

export const SERIAL_NUMBER_HELP_IMAGES_BY_APPLIANCE_TYPE = {
  dishwasher: DISHWASHER_SERIAL_NUMBER_HELP_IMAGES,
  extractor_hood: GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES,
  fridge: FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
  freezer: FRIDGE_SERIAL_NUMBER_HELP_IMAGES,
  hob: GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES,
  oven: OVEN_SERIAL_NUMBER_HELP_IMAGES,
  washing_machine: GENERIC_AMICA_SERIAL_NUMBER_HELP_IMAGES,
};

// Add product-specific help photos here when they arrive. Use the product's
// article number as the key and place the files below /public/help/serial-number/.
// Example:
// "9EC744100C": [
//   { src: "/help/serial-number/9EC744100C/location.webp", alt: "Serial number location" },
// ],
export const SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT = {};

function normalizeProductKey(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function detectApplianceType(product = {}) {
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

export function getSerialNumberHelpImages(product) {
  const productKeys = [
    product?.articleCode,
    product?.articleNumber,
    product?.code,
    product?.resolvedArticleCode,
  ].map(normalizeProductKey).filter(Boolean);

  for (const productKey of productKeys) {
    const images = SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT[productKey];
    if (Array.isArray(images) && images.length) {
      return images;
    }
  }

  const applianceType = detectApplianceType(product);
  const typeImages = SERIAL_NUMBER_HELP_IMAGES_BY_APPLIANCE_TYPE[applianceType];
  if (Array.isArray(typeImages) && typeImages.length) {
    return typeImages;
  }

  return DEFAULT_SERIAL_NUMBER_HELP_IMAGES;
}
