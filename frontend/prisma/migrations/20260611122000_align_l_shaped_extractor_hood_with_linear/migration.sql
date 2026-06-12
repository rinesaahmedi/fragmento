UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'FH 664 621 S',
  "name" = 'FH664621E Extractor Hood',
  "widthMm" = 599,
  "heightMm" = 173,
  "depthMm" = 303,
  "infoText" = 'Flat pull-out hood, 60 cm'
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'HOOD-LS-FH664621E';
