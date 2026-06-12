UPDATE "KitchenItem" AS item
SET
  "articleNumber" = NULL,
  "price" = 0.01,
  "infoText" = '1 door, 2 adjustable shelves'
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'CAB-WALL-LS-400';
