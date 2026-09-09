-- Correct the three AB 109874 default cabinet identities without changing
-- their included/default pricing. U50 keeps its existing UPK20 filler.

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'SPEB125',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülenunterschrank',
  "widthMm" = 1250,
  "heightMm" = 878,
  "depthMm" = 600,
  "infoText" = 'Included SPEB125 sink cabinet',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109874'
  AND item."code" = 'SINK-BASE-AB109874-DEFAULT';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U50',
  "name" = 'Lower Cabinet 50 cm',
  "nameDe" = 'Unterschrank 50 cm',
  "widthMm" = 500,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U50 lower cabinet with UPK20 filler panel',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109874'
  AND item."code" = 'CAB-BASE-AB109874-DEFAULT-UPK20';

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'U60',
  "name" = 'Lower Cabinet 60 cm',
  "nameDe" = 'Unterschrank 60 cm',
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'base_cabinet_plain',
  "infoText" = 'Included U60 lower cabinet',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'UNMATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109874'
  AND item."code" = 'CAB-BASE-AB109874-DEFAULT-2';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SPEB125',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülen-Unterschrank',
  "sourceKitchenItemCode" = 'SINK-BASE-AB109874-DEFAULT',
  "sourceComponentKey" = 'sink-base',
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109874'
  AND part."partKey" = 'sink-cabinet';
