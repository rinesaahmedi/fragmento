UPDATE "KitchenItem" AS item
SET
  "name" = data."name",
  "updatedAt" = NOW()
FROM (
  VALUES
    ('CAB-WALL-LS-400', 'Wall Cabinet left'),
    ('CAB-WALL-LS-500', 'Wall Cabinet right 1'),
    ('CAB-WALL-LS-600', 'Wall Cabinet right 2')
) AS data("code", "name"),
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
