UPDATE "KitchenItem" AS item
SET
  "iconKey" = 'drawer_base_two',
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'SINKBASE-LS-600';
