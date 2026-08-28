export const BURGER_103898_SLUG = "burger-103898";

const DISHWASHER = {
  productImagePaths: [
    "/product-images/gallery/burger-103898/dishwasher/a-egspv597210-01.jpg",
  ],
  productInfoPdfPath:
    "/product-info/burger-103898/dishwashers/a-egspv597210-product-info.pdf",
};

const EXTRACTOR_HOOD = {
  productImagePaths: [
    "/product-images/gallery/burger-103898/extractor-hood/fh664621e-01.jpg",
  ],
  productInfoPdfPath:
    "/product-info/burger-103898/extractor-hoods/fh664621e-product-info.pdf",
};

const REFRIGERATOR = {
  productImagePaths: [
    "/product-images/gallery/burger-103898/fridge/ol-kgcn388140e-01.jpg",
    "/product-images/gallery/burger-103898/fridge/ol-kgcn388140e-02.jpg",
  ],
  productInfoPdfPath:
    "/product-info/burger-103898/refrigerators/ol-kgcn388140e-product-info.pdf",
};

const LEDS = {
  productImagePaths: [
    "/product-images/gallery/burger-103898/leds/led-spots-01.jpg",
  ],
  productInfoPdfPath:
    "/product-info/burger-103898/lighting/led-spots-product-info.pdf",
};

const WASTE_COLLECTOR = {
  productImagePaths: [
    "/product-images/gallery/burger-103898/waste-collector/blanco-517467-01.jpg",
  ],
  productInfoPdfPath:
    "/product-info/burger-103898/waste-collectors/blanco-517467-product-info.pdf",
};

export const BURGER_103898_PRODUCT_INFO_BY_ITEM_CODE = Object.freeze({
  "DISH-BURGER103898-600": DISHWASHER,
  "CAB-HOOD-BURGER103898-HFLH6072": EXTRACTOR_HOOD,
  "HOOD-BURGER103898-FH664621E": EXTRACTOR_HOOD,
  "REF-BURGER103898-KGCN388140E": REFRIGERATOR,
  "ACC-LIGHT-003": LEDS,
  "ACC-WASTE-001": WASTE_COLLECTOR,
});

export function getBurger103898ProductInfo(kitchenSlug, itemCode) {
  if (String(kitchenSlug || "").trim().toLowerCase() !== BURGER_103898_SLUG) {
    return null;
  }

  return BURGER_103898_PRODUCT_INFO_BY_ITEM_CODE[
    String(itemCode || "").trim().toUpperCase()
  ] || null;
}

