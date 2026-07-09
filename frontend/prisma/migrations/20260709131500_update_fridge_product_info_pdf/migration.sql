UPDATE "KitchenItem"
SET "productInfoPdfPath" = '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf',
    "productInfoUpdatedAt" = NOW()
WHERE (
    "code" IN (
      'REF-B-545-1800-700',
      'REF-C-545-1800-700'
    )
    OR "code" LIKE 'REF-AB%-KGCN388140E'
    OR "articleNumber" = 'OL-KGCN388140E'
  )
  AND COALESCE("productInfoPdfPath", '') <> '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf';

UPDATE "KitchenItem"
SET "productInfoPdfPath" = '/product-info/fh-664-621-s-product-info.pdf',
    "productInfoUpdatedAt" = NOW()
WHERE (
    "articleNumber" IN (
      'FH664621E + FWK124 + HD6002',
      'FH664621E + HD6002',
      'FH 664 621 S'
    )
    OR "code" = 'HOOD-B-FH664621E'
    OR "code" = 'HOOD-LS-FH664621E'
    OR "code" LIKE 'HOOD-AB%-FH664621E'
    OR "code" LIKE 'CAB-HOOD-%'
  )
  AND COALESCE("productInfoPdfPath", '') <> '/product-info/fh-664-621-s-product-info.pdf';
