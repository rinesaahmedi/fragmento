UPDATE "CatalogArticle"
SET "productInfoPdfPath" = CASE "productInfoPdfPath"
  WHEN '/product-info/a-egspv597210-product-info-eco21.pdf' THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN '/product-info/dishwasher-product-info.pdf' THEN '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  WHEN '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf' THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  WHEN '/product-info/fridge-product-info.pdf' THEN '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf'
  WHEN '/product-info/kgc-15495-s-product-info-eco21.pdf' THEN '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  WHEN '/product-info/extractor-hood-flat-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf'
  WHEN '/product-info/fh-664-621-s-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf'
  WHEN '/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf' THEN '/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf'
  WHEN '/product-info/ewa-34660-w-product-info.pdf' THEN '/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf'
  WHEN '/product-info/ebx-943-600-s-product-info.pdf' THEN '/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf'
  WHEN '/product-info/ol-kmi-754-000-e-product-info.pdf' THEN '/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf'
  WHEN '/product-info/led-lighting-set-elabel.pdf' THEN '/product-info/lighting/led-set/led-lighting-set-elabel.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" LIKE '/product-info/%';

UPDATE "KitchenClaimPart"
SET "productInfoPdfPath" = CASE "productInfoPdfPath"
  WHEN '/product-info/a-egspv597210-product-info-eco21.pdf' THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN '/product-info/dishwasher-product-info.pdf' THEN '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  WHEN '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf' THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  WHEN '/product-info/fridge-product-info.pdf' THEN '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf'
  WHEN '/product-info/kgc-15495-s-product-info-eco21.pdf' THEN '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  WHEN '/product-info/extractor-hood-flat-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf'
  WHEN '/product-info/fh-664-621-s-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf'
  WHEN '/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf' THEN '/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf'
  WHEN '/product-info/ewa-34660-w-product-info.pdf' THEN '/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf'
  WHEN '/product-info/ebx-943-600-s-product-info.pdf' THEN '/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf'
  WHEN '/product-info/ol-kmi-754-000-e-product-info.pdf' THEN '/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf'
  WHEN '/product-info/led-lighting-set-elabel.pdf' THEN '/product-info/lighting/led-set/led-lighting-set-elabel.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" LIKE '/product-info/%';

UPDATE "KitchenItem"
SET "productInfoPdfPath" = CASE "productInfoPdfPath"
  WHEN '/product-info/a-egspv597210-product-info-eco21.pdf' THEN '/product-info/dishwashers/a-egspv597210/a-egspv597210-product-info-eco21.pdf'
  WHEN '/product-info/dishwasher-product-info.pdf' THEN '/product-info/dishwashers/a-egspv597210/dishwasher-product-info.pdf'
  WHEN '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf' THEN '/product-info/refrigerators/kgcn388140e/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf'
  WHEN '/product-info/fridge-product-info.pdf' THEN '/product-info/refrigerators/kgc15495s/fridge-product-info.pdf'
  WHEN '/product-info/kgc-15495-s-product-info-eco21.pdf' THEN '/product-info/refrigerators/kgc15495s/kgc-15495-s-product-info-eco21.pdf'
  WHEN '/product-info/extractor-hood-flat-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/extractor-hood-flat-product-info.pdf'
  WHEN '/product-info/fh-664-621-s-product-info.pdf' THEN '/product-info/extractor-hoods/fh664621s/fh-664-621-s-product-info.pdf'
  WHEN '/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf' THEN '/product-info/extractor-hoods/khf664611s/khf-664-611-s-chimney-extractor-hood-product-info.pdf'
  WHEN '/product-info/ewa-34660-w-product-info.pdf' THEN '/product-info/washing-machines/ewa34660w/ewa-34660-w-product-info.pdf'
  WHEN '/product-info/ebx-943-600-s-product-info.pdf' THEN '/product-info/ovens/ebx943600s/ebx-943-600-s-product-info.pdf'
  WHEN '/product-info/ol-kmi-754-000-e-product-info.pdf' THEN '/product-info/hobs/ol-kmi754000e/ol-kmi-754-000-e-product-info.pdf'
  WHEN '/product-info/led-lighting-set-elabel.pdf' THEN '/product-info/lighting/led-set/led-lighting-set-elabel.pdf'
  ELSE "productInfoPdfPath"
END
WHERE "productInfoPdfPath" LIKE '/product-info/%';
