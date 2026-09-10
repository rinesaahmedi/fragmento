-- Assign the supplier article identities to AB 110140's included cabinets.
-- Prices remain zero because these three items belong to the default kitchen.

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'SPEB110',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülenunterschrank',
  "price" = 0.00,
  "widthMm" = 1100,
  "heightMm" = 878,
  "depthMm" = 600,
  "infoText" = 'Included SPEB110 sink cabinet',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110140'
  AND item."code" = 'SINK-BASE-AB110140-DEFAULT';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U45',
  "name" = 'Lower Cabinet 45 cm',
  "nameDe" = 'Unterschrank 45 cm',
  "price" = 0.00,
  "widthMm" = 450,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U45 lower cabinet to the left of the sink',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110140'
  AND item."code" = 'CAB-BASE-AB110140-DEFAULT-SINK-RUN';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'US60',
  "name" = 'Lower Cabinet with Drawer 60 cm',
  "nameDe" = 'Unterschrank mit Schublade 60 cm',
  "price" = 0.00,
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'drawer_base_two',
  "infoText" = 'Included US60 lower cabinet with UPEF65 corner filler panel',
  "blendeCode" = blende."code",
  "blendeLabel" = 'UPEF65 Corner filler panel',
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
  AND kitchen."slug" = 'ab-110140'
  AND item."code" = 'CAB-BASE-AB110140-DEFAULT-LEFT'
  AND article."articleNumber" = 'US60'
  AND blende."code" = 'UPEF65';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U50',
  "name" = 'Lower Cabinet 50 cm',
  "nameDe" = 'Unterschrank 50 cm',
  "price" = 0.00,
  "widthMm" = 500,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U50 lower cabinet at the far right',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110140'
  AND item."code" = 'CAB-BASE-AB110140-DEFAULT-RIGHT';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SPEB110',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülen-Unterschrank',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110140'
  AND part."partKey" = 'sink-cabinet'
  AND part."sourceKitchenItemCode" = 'SINK-BASE-AB110140-DEFAULT';
