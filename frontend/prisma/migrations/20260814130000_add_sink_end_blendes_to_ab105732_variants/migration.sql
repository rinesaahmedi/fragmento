-- AB 105735, 105738, and 105741 use the AB 105732 plan. The exposed right
-- sink-end UPK20 panel must be an independent optional component, rather than
-- a non-selectable part of the fixed sink cabinet.
WITH sink_kitchens AS (
  SELECT "id", "slug"
  FROM "Kitchen"
  WHERE "slug" IN ('ab-105735', 'ab-105738', 'ab-105741')
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
WHERE kitchen."slug" IN ('ab-105735', 'ab-105738', 'ab-105741')
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
