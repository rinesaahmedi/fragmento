UPDATE "KitchenItem" AS item
SET "name" = data."name"
FROM (
  VALUES
    ('CAB-WALL-LS-400', 'Wall Cabinet left (400 x 723 mm)'),
    ('CAB-HOOD-LS-600', 'Hood Wall Cabinet (600 x 723 mm)'),
    ('CAB-WALL-LS-500', 'Wall Cabinet right (500 x 723 mm)'),
    ('CAB-WALL-LS-600', 'Wall Cabinet right (600 x 723 mm)'),
    ('HOOD-LS-FH664621E', 'Flat Pull-Out Extractor Hood (173 x 599 x 303 mm)'),
    ('CAB-BASE-LS-400', 'Base Cabinet left (400 x 723 mm)'),
    ('CAB-BASE-LS-500', 'Base Cabinet right (500 x 723 mm)'),
    ('CORNER-LS-650', 'Corner Filler (560 x 650 mm)'),
    ('SINKBASE-LS-600', 'Sink Base Cabinet (600 x 723 mm)'),
    ('CAB-DRAWER-LS-300', 'Base Cabinet with Drawers (300 x 723 mm)')
) AS data("code", "name")
,
"Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = data."code";
