-- Assign the supplier article identities to AB 110510's included lower cabinets.
-- The two supplied filler panels remain separately selectable in ASC.

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
  AND kitchen."slug" = 'ab-110510'
  AND item."code" = 'SINK-BASE-AB110510-DEFAULT';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U40',
  "name" = 'Lower Cabinet 40 cm',
  "nameDe" = 'Unterschrank 40 cm',
  "price" = 0.00,
  "widthMm" = 400,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U40 lower cabinet to the left of the oven',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110510'
  AND item."code" = 'CAB-BASE-AB110510-DEFAULT-LEFT';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U45',
  "name" = 'Lower Cabinet 45 cm',
  "nameDe" = 'Unterschrank 45 cm',
  "price" = blende."price",
  "widthMm" = 450,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U45 lower cabinet with UPEF65 corner filler panel',
  "blendeCode" = blende."code",
  "blendeLabel" = 'UPEF65 Corner filler panel',
  "blendePrice" = blende."price",
  "catalogArticleId" = NULL,
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110510'
  AND item."code" = 'CAB-BASE-AB110510-DEFAULT-CORNER'
  AND blende."code" = 'UPEF65';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'US50',
  "name" = 'Lower Cabinet with Drawer 50 cm',
  "nameDe" = 'Unterschrank mit Schublade 50 cm',
  "price" = blende."price",
  "widthMm" = 500,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'drawer_base_two',
  "infoText" = 'Included US50 lower cabinet with drawer and UPK20 filler panel',
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
  AND kitchen."slug" = 'ab-110510'
  AND item."code" = 'CAB-BASE-AB110510-DEFAULT-SINK-RUN'
  AND article."articleNumber" = 'US50'
  AND blende."code" = 'UPK20';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SPEB110',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülen-Unterschrank',
  "sourceKitchenItemCode" = 'SINK-BASE-AB110510-DEFAULT',
  "sourceComponentKey" = 'sink-base',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110510'
  AND part."partKey" = 'sink-cabinet';
