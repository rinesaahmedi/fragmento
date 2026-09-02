-- AB 105831 has two adjacent inside-corner panels. The right UPEF65 remains
-- bundled with the US60 cabinet; add only the left UPK20 as an independent
-- customer selection.

INSERT INTO "KitchenItem" (
  "id", "kitchenId", "itemType", "code", "articleNumber", "name", "nameDe",
  "price", "widthMm", "infoText", "iconKey", "colorKey", "componentKey",
  "isLocked", "isActive", "sortOrder", "catalogBlendeId",
  "catalogBlendeQuantity", "catalogLinkStatus", "updatedAt"
)
SELECT
  CONCAT('corner-blende-', kitchen."id"),
  kitchen."id",
  'COMPONENT'::"ItemType",
  'BLENDE-AB105831-CORNER-LEFT',
  blende."code",
  blende."name",
  blende."nameDe",
  blende."price",
  200,
  'Separate left UPK20 filler panel at the inside corner',
  'blende',
  '#f0a500',
  'corner-blende',
  false,
  true,
  65,
  blende."id",
  1,
  'MATCHED',
  CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
JOIN "CatalogBlende" AS blende ON blende."code" = 'UPK20'
WHERE kitchen."slug" = 'ab-105831'
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
  "catalogArticleId" = NULL,
  "catalogBlendeId" = EXCLUDED."catalogBlendeId",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP;
