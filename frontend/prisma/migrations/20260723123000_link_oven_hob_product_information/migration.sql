INSERT INTO "CatalogArticle" (
  "id",
  "articleNumber",
  "name",
  "nameDe",
  "description",
  "widthMm",
  "price",
  "itemType",
  "productImagePath",
  "productInfoPdfPath",
  "productInfoSummary",
  "productInfoKeyFacts",
  "productInfoExtractedText",
  "productInfoUpdatedAt",
  "isFixedPricePackage",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'catalog-oven-hob-ebx943600s-olkmi754000e',
  'EBX943600S + OL-KMI754000E',
  'Built-in oven and induction hob',
  'Einbaubackofen und Induktionskochfeld',
  'Included appliance set: AMICA EBX 943 600 S oven and OL-KMI 754 000 E induction hob.',
  600,
  0,
  'COMPONENT'::"ItemType",
  source."productImagePath",
  source."productInfoPdfPath",
  source."productInfoSummary",
  source."productInfoKeyFacts",
  source."productInfoExtractedText",
  source."productInfoUpdatedAt",
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    item."productImagePath",
    item."productInfoPdfPath",
    item."productInfoSummary",
    item."productInfoKeyFacts",
    item."productInfoExtractedText",
    item."productInfoUpdatedAt"
  FROM "KitchenItem" AS item
  WHERE item."code" = 'OVEN-B-600-HOB'
    AND item."productInfoPdfPath" IS NOT NULL
  ORDER BY item."productInfoUpdatedAt" DESC NULLS LAST, item."updatedAt" DESC
  LIMIT 1
) AS source
ON CONFLICT ("articleNumber") DO UPDATE
SET
  "productImagePath" = EXCLUDED."productImagePath",
  "productInfoPdfPath" = EXCLUDED."productInfoPdfPath",
  "productInfoSummary" = EXCLUDED."productInfoSummary",
  "productInfoKeyFacts" = EXCLUDED."productInfoKeyFacts",
  "productInfoExtractedText" = EXCLUDED."productInfoExtractedText",
  "productInfoUpdatedAt" = EXCLUDED."productInfoUpdatedAt",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "KitchenItem" AS item
SET
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "CatalogArticle" AS article
WHERE article."articleNumber" = 'EBX943600S + OL-KMI754000E'
  AND item."code" = 'OVEN-B-600-HOB'
  AND item."catalogArticleId" IS NULL;
