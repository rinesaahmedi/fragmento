UPDATE "KitchenItem" AS item
SET
  "widthMm" = data."widthMm",
  "heightMm" = 720,
  "depthMm" = 340,
  "name" = data."name",
  "updatedAt" = NOW()
FROM (
  VALUES
    ('CAB-WALL-LS-400', 400, 'Wall Cabinet left (400 x 720 x 340 mm)'),
    ('CAB-WALL-LS-500', 500, 'Wall Cabinet right 500 mm'),
    ('CAB-WALL-LS-600', 600, 'Wall Cabinet right 600 mm')
) AS data("code", "widthMm", "name"),
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
