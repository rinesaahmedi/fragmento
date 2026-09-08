-- Correct the active 45 cm dishwasher assignments that were linked to the
-- 60 cm catalog article by older seed definitions. The four AB 105747-layout
-- kitchens were already linked correctly and are intentionally not updated.

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "price" = COALESCE(program_price."price", article."price"),
  "widthMm" = 450,
  "heightMm" = article."heightMm",
  "depthMm" = article."depthMm",
  "productImagePath" = article."productImagePath",
  "productInfoPdfPath" = article."productInfoPdfPath",
  "productInfoSummary" = article."productInfoSummary",
  "productInfoKeyFacts" = article."productInfoKeyFacts",
  "productInfoExtractedText" = article."productInfoExtractedText",
  "productInfoUpdatedAt" = article."productInfoUpdatedAt",
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
LEFT JOIN "CatalogArticleProgramPrice" AS program_price
  ON program_price."catalogArticleId" = article."id"
  AND program_price."programmId" = kitchen."programmId"
  AND program_price."isActive" = true
WHERE item."kitchenId" = kitchen."id"
  AND item."isActive" = true
  AND item."articleNumber" = 'A-EGSPV597210 + TGV60'
  AND article."articleNumber" = 'A-EGSPV587915 + TGV45'
  AND kitchen."slug" IN (
    'ab-105745', 'ab-105748', 'ab-105751', 'ab-105754',
    'ab-105845', 'ab-105848', 'ab-105851', 'ab-105854',
    'ab-105857', 'ab-105860',
    'ab-105847', 'ab-105850', 'ab-105853', 'ab-105856',
    'ab-105859', 'ab-105862'
  );
