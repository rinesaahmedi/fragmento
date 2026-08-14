-- Fixed end sinks remain part of the default kitchen. Their UPK20 filler
-- panels are independent optional components, selected only by the customer.
WITH sink_kitchens AS (
  SELECT "id", "slug"
  FROM "Kitchen"
  WHERE "slug" IN (
    'ab-105758',
    'ab-105732', 'ab-105746', 'ab-105749', 'ab-105752', 'ab-105755',
    'ab-105823', 'ab-105826', 'ab-105829', 'ab-105832'
  )
)
UPDATE "KitchenItem" AS item
SET
  "price" = 0,
  "infoText" = 'Default sink base cabinet',
  "blendeCode" = NULL,
  "blendeLabel" = NULL,
  "blendePrice" = NULL,
  "catalogBlendeId" = NULL,
  "catalogBlendeQuantity" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM sink_kitchens AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND item."componentKey" = 'sink-base'
  AND item."isLocked" = true;

INSERT INTO "KitchenItem" (
  "id", "kitchenId", "itemType", "code", "articleNumber", "name", "nameDe",
  "price", "widthMm", "infoText", "iconKey", "colorKey", "componentKey",
  "isLocked", "isActive", "sortOrder", "updatedAt"
)
SELECT
  CONCAT('sink-end-blende-', kitchen."id"),
  kitchen."id",
  'COMPONENT'::"ItemType",
  CONCAT('BLENDE-AB', REPLACE(kitchen."slug", 'ab-', ''), '-SINK-END'),
  'UPK20',
  'Filler Panel up to 20 cm',
  'Passblende bis 20 cm',
  blende."price",
  200,
  'Optional UPK20 filler panel for the fixed end sink',
  'blende',
  '#f0a500',
  'sink-end-blende',
  false,
  true,
  35,
  CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
JOIN "CatalogBlende" AS blende ON blende."code" = 'UPK20'
WHERE kitchen."slug" IN (
  'ab-105758',
  'ab-105732', 'ab-105746', 'ab-105749', 'ab-105752', 'ab-105755',
  'ab-105823', 'ab-105826', 'ab-105829', 'ab-105832'
)
ON CONFLICT ("kitchenId", "code") DO UPDATE SET
  "articleNumber" = EXCLUDED."articleNumber",
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "price" = EXCLUDED."price",
  "widthMm" = EXCLUDED."widthMm",
  "infoText" = EXCLUDED."infoText",
  "iconKey" = EXCLUDED."iconKey",
  "colorKey" = EXCLUDED."colorKey",
  "componentKey" = EXCLUDED."componentKey",
  "isLocked" = false,
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "blendeCode" = NULL,
  "blendeLabel" = NULL,
  "blendePrice" = NULL,
  "catalogBlendeId" = NULL,
  "catalogBlendeQuantity" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;
