UPDATE "KitchenItem" AS item
SET
  "name" = 'Fully Integrated Dishwasher incl. Furniture Front',
  "articleNumber" = 'A-EGSPV597210 + TGV60',
  "price" = 579,
  "widthMm" = 598,
  "heightMm" = 815,
  "depthMm" = 550,
  "infoText" = 'Fully integrated dishwasher, 60 cm',
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" = 'DISH-LS-600-STD';
