-- H9002 is EUR 203 before its EUR 35 HPK2002 filler panel.
-- AB 109873 draws the 90 cm cabinet as two adjacent 45 cm fronts; keep one
-- commercial kitchen item and retire both legacy H4502 rows for this kitchen.

INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "description",
  "widthMm", "heightMm", "depthMm", "price", "itemType",
  "isFixedPricePackage", "isActive", "updatedAt"
)
VALUES (
  'catalog-article-h9002',
  'H9002',
  'Upper Cabinet 90 cm',
  'Oberschrank 90 cm',
  '90 cm upper cabinet',
  900,
  723,
  NULL,
  203.00,
  'COMPONENT'::"ItemType",
  false,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("articleNumber") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "widthMm" = EXCLUDED."widthMm",
  "heightMm" = EXCLUDED."heightMm",
  "price" = EXCLUDED."price",
  "itemType" = EXCLUDED."itemType",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- Reuse the first legacy row when the seed has not already created H9002.
UPDATE "KitchenItem" AS item
SET
  "code" = 'CAB-WALL-AB109873-H9002-HPK2002-R',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" = 'CAB-WALL-AB109873-H4502-1'
  AND NOT EXISTS (
    SELECT 1
    FROM "KitchenItem" AS existing
    WHERE existing."kitchenId" = item."kitchenId"
      AND existing."code" = 'CAB-WALL-AB109873-H9002-HPK2002-R'
  );

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "price" = article."price" + blende."price",
  "widthMm" = 900,
  "heightMm" = 723,
  "depthMm" = 340,
  "infoText" = 'H9002 upper cabinet with right HPK2002 filler panel',
  "componentKey" = 'wall-cabinet-5',
  "sortOrder" = 120,
  "blendeCode" = blende."code",
  "blendeLabel" = 'HPK2002 35 cm',
  "blendePrice" = blende."price",
  "catalogArticleId" = article."id",
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "isLocked" = false,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" = 'CAB-WALL-AB109873-H9002-HPK2002-R'
  AND article."articleNumber" = 'H9002'
  AND blende."code" = 'HPK2002';

UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" IN (
    'CAB-WALL-AB109873-H4502-1',
    'CAB-WALL-AB109873-H4502-HPK2002-R'
  );
