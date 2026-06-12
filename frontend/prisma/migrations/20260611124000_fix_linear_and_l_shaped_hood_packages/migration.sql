UPDATE "KitchenItem" AS item
SET
  "name" = 'Flat Screen Extractor Hood + Cabinet + Filter',
  "articleNumber" = 'FH664621E + HD6002',
  "price" = 349,
  "widthMm" = 600,
  "heightMm" = 720,
  "depthMm" = 340,
  "infoText" = 'HD6002, light hood setup',
  "productImagePath" = hood."productImagePath",
  "productInfoPdfPath" = hood."productInfoPdfPath",
  "productInfoSummary" = hood."productInfoSummary",
  "productInfoKeyFacts" = hood."productInfoKeyFacts",
  "productInfoExtractedText" = hood."productInfoExtractedText",
  "productInfoUpdatedAt" = hood."productInfoUpdatedAt",
  "isActive" = true,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen,
"KitchenItem" AS hood
WHERE kitchen."id" = item."kitchenId"
  AND hood."kitchenId" = kitchen."id"
  AND (
    (kitchen."slug" = 'kitchen-model-b' AND item."code" = 'CAB-HOOD-B-600' AND hood."code" = 'HOOD-B-FH664621E')
    OR
    (kitchen."slug" = 'l-shaped-kitchen' AND item."code" = 'CAB-HOOD-LS-600' AND hood."code" = 'HOOD-LS-FH664621E')
  );

UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."id" = item."kitchenId"
  AND (
    (kitchen."slug" = 'kitchen-model-b' AND item."code" = 'HOOD-B-FH664621E')
    OR
    (kitchen."slug" = 'l-shaped-kitchen' AND item."code" = 'HOOD-LS-FH664621E')
  );
