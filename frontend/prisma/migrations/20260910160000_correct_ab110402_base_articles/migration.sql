-- AB 110402: register the commercial identities of the default lower cabinets.
INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "widthMm", "heightMm", "depthMm",
  "price", "itemType", "isFixedPricePackage", "isActive", "createdAt", "updatedAt"
)
VALUES
  ('catalog-spb80', 'SPB80', 'Sink Base Cabinet 80 cm', 'Spülenschrank 80 cm', 800, 878, 600, 0.00, 'COMPONENT', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-u30', 'U30', 'Lower Cabinet 30 cm', 'Unterschrank 30 cm', 300, 878, 600, 0.00, 'COMPONENT', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("articleNumber") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "widthMm" = EXCLUDED."widthMm",
  "heightMm" = EXCLUDED."heightMm",
  "depthMm" = EXCLUDED."depthMm",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- SPB80 is one 80 cm sink cabinet represented by two adjacent 40 cm fronts.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = 800,
  "heightMm" = 878,
  "depthMm" = 600,
  "price" = 0.00,
  "infoText" = 'Included SPB80 sink cabinet with two connected fronts',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'SINK-BASE-AB110402-DEFAULT'
  AND article."articleNumber" = 'SPB80';

-- The second historic 40 cm row is the second drawn face of SPB80, not a
-- separate commercial cabinet.
UPDATE "KitchenItem" AS item
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'CAB-BASE-AB110402-DEFAULT-2';

-- U30 and US40 each retain their supplied UPK20 as a separately claimable
-- Blende while remaining included default cabinets.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "price" = blende."price",
  "infoText" = 'Included U30 lower cabinet with left UPK20 filler panel',
  "catalogArticleId" = article."id",
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "blendeCode" = blende."code",
  "blendeLabel" = blende."nameDe",
  "blendePrice" = blende."price",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'CAB-BASE-AB110402-DEFAULT-UPK20-1'
  AND article."articleNumber" = 'U30'
  AND blende."code" = 'UPK20';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "price" = blende."price",
  "infoText" = 'Included US40 lower cabinet with right UPK20 filler panel',
  "catalogArticleId" = article."id",
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "blendeCode" = blende."code",
  "blendeLabel" = blende."nameDe",
  "blendePrice" = blende."price",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'CAB-BASE-AB110402-DEFAULT-UPK20-2'
  AND article."articleNumber" = 'US40'
  AND blende."code" = 'UPK20';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SPB80',
  "name" = 'Sink Base Cabinet 80 cm',
  "nameDe" = 'Spülenschrank 80 cm',
  "sourceKitchenItemCode" = 'SINK-BASE-AB110402-DEFAULT',
  "sourceComponentKey" = 'sink-base',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND part."partKey" = 'sink-cabinet';

-- The two historic H4002 rows are the two 40 cm fronts of one H8002 cabinet.
-- Keep the first row as the stable item and retire the duplicate.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = 800,
  "heightMm" = 723,
  "depthMm" = 340,
  "price" = article."price",
  "infoText" = 'H8002 upper cabinet with two connected fronts',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'CAB-WALL-AB110402-H4002-1'
  AND article."articleNumber" = 'H8002';

UPDATE "KitchenItem" AS item
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110402'
  AND item."code" = 'CAB-WALL-AB110402-H4002-2';
