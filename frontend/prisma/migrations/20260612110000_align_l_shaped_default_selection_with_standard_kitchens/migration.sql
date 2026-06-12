UPDATE "KitchenItem" AS item
SET
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'SINKBASE-LS-600';

INSERT INTO "KitchenItem" (
  "id",
  "kitchenId",
  "itemType",
  "code",
  "articleNumber",
  "name",
  "price",
  "infoText",
  "iconKey",
  "colorKey",
  "componentKey",
  "isLocked",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  'lshape-sink-botton-45',
  kitchen."id",
  'COMPONENT'::"ItemType",
  'SINK-LS-BOTTON-45',
  '517467',
  'Sink and Waste System',
  89,
  'Blanco Botton Pro 45/2 manual waste system',
  'sink_faucet',
  'black',
  'sink-faucet',
  true,
  true,
  150,
  NOW(),
  NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
ON CONFLICT ("kitchenId", "code") DO UPDATE SET
  "itemType" = EXCLUDED."itemType",
  "articleNumber" = EXCLUDED."articleNumber",
  "name" = EXCLUDED."name",
  "price" = EXCLUDED."price",
  "infoText" = EXCLUDED."infoText",
  "iconKey" = EXCLUDED."iconKey",
  "colorKey" = EXCLUDED."colorKey",
  "componentKey" = EXCLUDED."componentKey",
  "isLocked" = true,
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
