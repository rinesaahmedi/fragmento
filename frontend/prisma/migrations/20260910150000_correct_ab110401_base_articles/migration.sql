-- Register the two AB 110401 default cabinet identities that were previously
-- stored as generic DEFAULT rows.
INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "widthMm", "heightMm", "depthMm",
  "price", "itemType", "isFixedPricePackage", "isActive", "createdAt", "updatedAt"
)
VALUES
  ('catalog-spb90', 'SPB90', 'Sink Base Cabinet 90 cm', 'Spülenschrank 90 cm', 900, 878, 600, 0.00, 'COMPONENT', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('catalog-ue115', 'UE115', 'Lower Corner Cabinet 115 cm', 'Eckunterschrank 115 cm', 1150, 878, 600, 0.00, 'COMPONENT', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("articleNumber") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "widthMm" = EXCLUDED."widthMm",
  "heightMm" = EXCLUDED."heightMm",
  "depthMm" = EXCLUDED."depthMm",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

-- SPB90 is one 90 cm sink cabinet represented by two adjacent fronts in the
-- drawing. The second historic DEFAULT item is retired below.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = 900,
  "heightMm" = 878,
  "depthMm" = 600,
  "price" = 0.00,
  "infoText" = 'Included SPB90 sink cabinet with two connected fronts',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'SINK-BASE-AB110401-DEFAULT'
  AND article."articleNumber" = 'SPB90';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = 'Lower Cabinet with Drawer 45 cm',
  "nameDe" = 'Unterschrank mit Schublade 45 cm',
  "price" = 0.00,
  "infoText" = 'Included US45 lower cabinet with separate UPK20 filler panel to the left of the sink',
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
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-BASE-AB110401-DEFAULT-UPK20-1'
  AND article."articleNumber" = 'US45'
  AND blende."code" = 'UPK20';

UPDATE "KitchenItem" AS item
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-BASE-AB110401-DEFAULT-2';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = 1150,
  "price" = 0.00,
  "infoText" = 'Included UE115 lower corner cabinet',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-BASE-AB110401-DEFAULT-3'
  AND article."articleNumber" = 'UE115';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = 'Lower Cabinet with Drawer 60 cm',
  "nameDe" = 'Unterschrank mit Schublade 60 cm',
  "price" = 0.00,
  "infoText" = 'Included US60 lower cabinet with separate UPK20 filler panel at the far right',
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
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-BASE-AB110401-DEFAULT-UPK20-2'
  AND article."articleNumber" = 'US60'
  AND blende."code" = 'UPK20';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SPB90',
  "name" = 'Sink Base Cabinet 90 cm',
  "nameDe" = 'Spülenschrank 90 cm',
  "sourceKitchenItemCode" = 'SINK-BASE-AB110401-DEFAULT',
  "sourceComponentKey" = 'sink-base',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND part."partKey" = 'sink-cabinet';

-- The two historic H4502 rows are the two drawn fronts of one H9002 cabinet.
-- Keep the first row as the stable commercial item and retire the duplicate.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = 900,
  "heightMm" = 723,
  "depthMm" = 340,
  "price" = article."price",
  "infoText" = 'H9002 upper cabinet with two connected fronts',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-WALL-AB110401-H4502-2'
  AND article."articleNumber" = 'H9002';

UPDATE "KitchenItem" AS item
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-WALL-AB110401-H4502-3';
