WITH upef65 AS (
  SELECT "id", "price", "name", "nameDe"
  FROM "CatalogBlende"
  WHERE "code" = 'UPEF65'
)
UPDATE "KitchenItem" item
SET
  "price" = item."price" - COALESCE(item."blendePrice", 0) + upef65."price",
  "blendeCode" = 'UPEF65',
  "blendeLabel" = COALESCE(upef65."nameDe", upef65."name", 'UPEF65 Corner filler panel'),
  "blendePrice" = upef65."price",
  "catalogBlendeId" = upef65."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM upef65, "Kitchen" kitchen
WHERE lower(kitchen."slug") IN (
  'ab-104968',
  'ab-105734', 'ab-105737', 'ab-105740',
  'ab-105805', 'ab-105809', 'ab-105813', 'ab-105817',
  'ab-105822', 'ab-105825', 'ab-105828', 'ab-105831',
  'ab-105834', 'ab-105837', 'ab-105840', 'ab-105843',
  'ab-105747', 'ab-105750', 'ab-105753', 'ab-105756'
)
  AND upper(COALESCE(item."blendeCode", '')) ~ '^UPK20[[:space:]]*X[[:space:]]*2';
