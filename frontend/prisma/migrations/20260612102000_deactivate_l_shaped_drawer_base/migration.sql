UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'CAB-DRAWER-LS-300';
