-- AB 105750, AB 105753 and AB 105756 use two UPEF65 corner filler panels
-- on their US30 return cabinet. Only convert untouched legacy UPK20 data:
-- an Admin-saved Blende selection must never be overwritten by deployment.
WITH upef65 AS (
  SELECT "id", "price", "name", "nameDe"
  FROM "CatalogBlende"
  WHERE "code" = 'UPEF65'
)
UPDATE "KitchenItem" item
SET
  "price" = item."price" - (
    COALESCE(item."blendePrice", 0) * COALESCE(NULLIF(item."catalogBlendeQuantity", 0), 1)
  ) + (upef65."price" * 2),
  "blendeCode" = 'UPEF65 x2',
  "blendeLabel" = COALESCE(upef65."nameDe", upef65."name", 'UPEF65 Corner filler panel') || ' x 2',
  "blendePrice" = upef65."price",
  "catalogBlendeId" = upef65."id",
  "catalogBlendeQuantity" = 2,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM upef65, "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND lower(kitchen."slug") IN ('ab-105750', 'ab-105753', 'ab-105756')
  AND item."code" = 'CAB-BASE-AB105747-US30'
  AND upper(COALESCE(item."blendeCode", '')) LIKE 'UPK20%';
