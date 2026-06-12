UPDATE "KitchenItem" AS item
SET
  "name" = data."name",
  "articleNumber" = NULL,
  "price" = 0.01,
  "infoText" = '1 door, 2 adjustable shelves',
  "updatedAt" = NOW()
FROM (
  VALUES
    ('CAB-WALL-LS-500', 'Wall Cabinet right 500 mm'),
    ('CAB-WALL-LS-600', 'Wall Cabinet right 600 mm')
) AS data("code", "name"),
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
