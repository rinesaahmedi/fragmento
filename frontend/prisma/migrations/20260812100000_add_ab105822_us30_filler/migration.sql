-- AB 105822's left US30 lower cabinet has a separately supplied UPK20 filler panel.
-- Keep this correction scoped to that one cabinet and preserve the base cabinet price.
WITH upk20 AS (
  SELECT "id", "code", "name", "nameDe", "price"
  FROM "CatalogBlende"
  WHERE "code" = 'UPK20'
)
UPDATE "KitchenItem" AS item
SET
  "price" = item."price" + upk20."price",
  "blendeCode" = upk20."code",
  "blendeLabel" = COALESCE(upk20."nameDe", upk20."name"),
  "blendePrice" = upk20."price",
  "catalogBlendeId" = upk20."id",
  "catalogBlendeQuantity" = 1
FROM upk20, "Kitchen" AS kitchen
WHERE kitchen."id" = item."kitchenId"
  AND kitchen."slug" = 'ab-105822'
  AND item."code" = 'CAB-BASE-AB105822-US30-R'
  AND item."articleNumber" = 'US30'
  AND item."catalogBlendeId" IS NULL
  AND item."blendeCode" IS NULL;
