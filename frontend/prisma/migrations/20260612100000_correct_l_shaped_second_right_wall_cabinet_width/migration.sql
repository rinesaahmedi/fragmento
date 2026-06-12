UPDATE "KitchenItem" AS item
SET
  "name" = data."name",
  "widthMm" = 500,
  "heightMm" = 720,
  "depthMm" = 340,
  "articleNumber" = NULL,
  "price" = 0.01,
  "updatedAt" = NOW()
FROM (
  VALUES
    ('CAB-WALL-LS-500', 'Wall Cabinet right 500 mm 1'),
    ('CAB-WALL-LS-600', 'Wall Cabinet right 500 mm 2')
) AS data("code", "name"),
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
