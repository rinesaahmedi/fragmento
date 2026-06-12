UPDATE "KitchenItem" AS item
SET
  "name" = data."name",
  "articleNumber" = data."articleNumber",
  "price" = data."price",
  "widthMm" = data."widthMm",
  "heightMm" = 720,
  "depthMm" = 600,
  "infoText" = data."infoText",
  "updatedAt" = NOW()
FROM (
  VALUES
    ('CAB-BASE-LS-400', 'Base Cabinet left', NULL::text, 0.01::numeric, 400, '1 drawer, 1 door, 1 adjustable shelf'),
    ('CAB-BASE-LS-500', 'Base Cabinet right', NULL::text, 0.01::numeric, 500, '1 drawer, 1 door, 1 adjustable shelf'),
    ('SINKBASE-LS-600', 'Sink Base Cabinet', 'US30'::text, 175::numeric, 300, 'US30, sink base cabinet')
) AS data("code", "name", "articleNumber", "price", "widthMm", "infoText"),
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
