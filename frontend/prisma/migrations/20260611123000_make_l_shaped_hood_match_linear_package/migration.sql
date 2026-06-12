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
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen,
"KitchenItem" AS hood
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND hood."kitchenId" = kitchen."id"
  AND hood."code" = 'HOOD-LS-FH664621E'
  AND item."code" = 'CAB-HOOD-LS-600';

UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'HOOD-LS-FH664621E';
