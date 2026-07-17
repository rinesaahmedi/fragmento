const DEFAULT_SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
  { src: "/img/AMICA%20FRIDGE.webp", altKey: "serialNumberHelpAlt2" },
];

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

export function getSerialNumberHelpImages(product) {
  const productKeys = [
    product?.articleCode,
    product?.articleNumber,
    product?.code,
  ].map(normalizeProductKey).filter(Boolean);

  for (const productKey of productKeys) {
    const images = SERIAL_NUMBER_HELP_IMAGES_BY_PRODUCT[productKey];
    if (Array.isArray(images) && images.length) {
      return images;
    }
  }

  return DEFAULT_SERIAL_NUMBER_HELP_IMAGES;
}
