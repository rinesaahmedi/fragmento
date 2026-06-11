UPDATE "KitchenItem" item
SET
  "articleNumber" = 'H6002',
  "price" = 149.00,
  "widthMm" = 600,
  "heightMm" = 720,
  "depthMm" = 340,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-c'
  AND item."code" IN (
    'CAB-WALL-C-L-600',
    'CAB-WALL-C-ML-600',
    'CAB-WALL-C-MR-600',
    'CAB-WALL-C-R-600'
  );

UPDATE "KitchenItem" item
SET
  "name" = 'Angled extractor hood + filter',
  "articleNumber" = 'KHF664611S',
  "price" = 209.00,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-c'
  AND item."code" = 'HOOD-C-FH664621E';
