UPDATE "KitchenItem" AS item
SET
  "isLocked" = false,
  "isActive" = true,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'SINKBASE-LS-600';
