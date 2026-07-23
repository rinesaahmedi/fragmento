UPDATE "CatalogArticle"
SET "productInfoPdfPath" = CASE
  WHEN "productInfoPdfPath" IN (
    '/product-info/dishwasher-product-info.pdf',
    '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  ) THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN "productInfoPdfPath" IN (
    '/product-info/fridge-product-info.pdf',
    '/product-info/kgc-15495-s-product-info-eco21.pdf',
    '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
    '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  ) THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" IN (
  '/product-info/dishwasher-product-info.pdf',
  '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf',
  '/product-info/fridge-product-info.pdf',
  '/product-info/kgc-15495-s-product-info-eco21.pdf',
  '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
  '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
);

UPDATE "KitchenClaimPart"
SET "productInfoPdfPath" = CASE
  WHEN "productInfoPdfPath" IN (
    '/product-info/dishwasher-product-info.pdf',
    '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  ) THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN "productInfoPdfPath" IN (
    '/product-info/fridge-product-info.pdf',
    '/product-info/kgc-15495-s-product-info-eco21.pdf',
    '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
    '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  ) THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" IN (
  '/product-info/dishwasher-product-info.pdf',
  '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf',
  '/product-info/fridge-product-info.pdf',
  '/product-info/kgc-15495-s-product-info-eco21.pdf',
  '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
  '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
);

UPDATE "KitchenItem"
SET "productInfoPdfPath" = CASE
  WHEN "productInfoPdfPath" IN (
    '/product-info/dishwasher-product-info.pdf',
    '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  ) THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN "productInfoPdfPath" IN (
    '/product-info/fridge-product-info.pdf',
    '/product-info/kgc-15495-s-product-info-eco21.pdf',
    '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
    '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  ) THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" IN (
  '/product-info/dishwasher-product-info.pdf',
  '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf',
  '/product-info/fridge-product-info.pdf',
  '/product-info/kgc-15495-s-product-info-eco21.pdf',
  '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf',
  '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
);
