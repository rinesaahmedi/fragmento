-- AB 109873 draws the US90 lower cabinet as two adjacent 45 cm fronts.
-- Store it as one locked commercial article and retire the obsolete second row.

INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "description",
  "widthMm", "heightMm", "depthMm", "price", "itemType",
  "isFixedPricePackage", "isActive", "updatedAt"
)
VALUES (
  'catalog-article-us90',
  'US90',
  'Lower Cabinet with Drawer 90 cm',
  'Unterschrank mit Schublade 90 cm',
  '90 cm lower cabinet with drawer',
  900,
  NULL,
  NULL,
  339.00,
  'COMPONENT'::"ItemType",
  false,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("articleNumber") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "widthMm" = EXCLUDED."widthMm",
  "itemType" = EXCLUDED."itemType",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- Reuse the first legacy row when the seed has not already created US90.
UPDATE "KitchenItem" AS item
SET
  "code" = 'CAB-BASE-AB109873-US90',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" = 'CAB-BASE-AB109873-DEFAULT-2'
  AND NOT EXISTS (
    SELECT 1
    FROM "KitchenItem" AS existing
    WHERE existing."kitchenId" = item."kitchenId"
      AND existing."code" = 'CAB-BASE-AB109873-US90'
  );

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "price" = article."price" + blende."price",
  "widthMm" = 900,
  "heightMm" = 878,
  "depthMm" = 600,
  "infoText" = 'Included US90 lower cabinet with right UPK20 filler panel',
  "blendeCode" = blende."code",
  "blendeLabel" = 'UPK20 20 cm',
  "blendePrice" = blende."price",
  "catalogArticleId" = article."id",
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" = 'CAB-BASE-AB109873-US90'
  AND article."articleNumber" = 'US90'
  AND blende."code" = 'UPK20';

UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" IN (
    'CAB-BASE-AB109873-DEFAULT-2',
    'CAB-BASE-AB109873-DEFAULT-UPK20-R'
  );
