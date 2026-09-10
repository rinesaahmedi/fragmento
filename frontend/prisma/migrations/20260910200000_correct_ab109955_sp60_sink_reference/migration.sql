-- AB 109955 uses the SP60 sink lower cabinet. Keep its supplied UPK20
-- filler panel attached as a separately selectable ASC claim option.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'SP60',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülenunterschrank',
  "widthMm" = 600,
  "depthMm" = 600,
  "infoText" = 'Included SP60 sink base cabinet with supplied UPK20 filler panel',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109955'
  AND item."code" = 'SINK-BASE-AB109955-DEFAULT-UPK20';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SP60',
  "name" = 'Sink Lower Cabinet',
  "nameDe" = 'Spülen-Unterschrank',
  "sourceKitchenItemCode" = 'SINK-BASE-AB109955-DEFAULT-UPK20',
  "sourceComponentKey" = 'sink-base',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109955'
  AND part."partKey" = 'sink-cabinet';
