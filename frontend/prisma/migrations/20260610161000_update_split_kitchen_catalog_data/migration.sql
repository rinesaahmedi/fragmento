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

UPDATE "KitchenItem" item
SET
  "name" = 'Washing machine + front + side panel',
  "articleNumber" = 'EWA34660W + TGV60 + WU16',
  "price" = 639.00,
  "widthMm" = 600,
  "heightMm" = 830,
  "depthMm" = 540,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."code" IN ('WM-B-EWA34660W', 'WM-C-EWA34660W');

UPDATE "KitchenItem" item
SET
  "name" = 'Fully integrated dishwasher incl. furniture front',
  "articleNumber" = 'A-EGSPV597210 + TGV60',
  "price" = 579.00,
  "widthMm" = 600,
  "heightMm" = 815,
  "depthMm" = 550,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."code" IN ('DISH-B-600-STD', 'DISH-C-600-STD');

UPDATE "KitchenItem" item
SET
  "name" = 'Base cabinet with drawer 600/600 mm',
  "articleNumber" = 'US60',
  "price" = 219.00,
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'drawer_base_two',
  "isActive" = true,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."isLocked" = false
  AND item."code" IN (
    'CAB-BASE-B-STR',
    'CAB-COOK-C-L-600',
    'CAB-COOK-C-R-600',
    'CAB-DRAWER-C-3D'
  );

UPDATE "KitchenItem" item
SET
  "iconKey" = 'drawer_base_two',
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'CAB-BASE-B-STR';

UPDATE "KitchenItem" item
SET
  "name" = 'Freestanding refrigerator 178 cm',
  "articleNumber" = 'OL-KGCN388140E',
  "price" = 579.00,
  "widthMm" = 710,
  "heightMm" = 1780,
  "depthMm" = NULL,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."code" IN ('REF-B-545-1800-700', 'REF-C-545-1800-700');

UPDATE "KitchenItem" item
SET
  "code" = 'ACC-CUTLERY-ZB60SG',
  "name" = 'Cutlery insert 60 cm',
  "articleNumber" = 'ZB60SG',
  "price" = 25.00,
  "infoText" = 'Cutlery insert 60 cm',
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-c'
  AND item."code" = 'ACC-CUTLERY-001';

UPDATE "KitchenItem" item
SET
  "name" = 'Cutlery insert 60 cm',
  "articleNumber" = 'ZB60SG',
  "price" = 25.00,
  "infoText" = 'Cutlery insert 60 cm',
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."code" = 'ACC-CUTLERY-ZB60SG';

UPDATE "KitchenItem" item
SET
  "name" = 'Waste separation system',
  "articleNumber" = 'Blanco Botton 517467',
  "price" = 89.00,
  "infoText" = 'Blanco Botton 517467',
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('kitchen-model-b', 'kitchen-model-c')
  AND item."itemType" = 'ACCESSORY'
  AND item."code" = 'ACC-WASTE-001';

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
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" IN (
    'CAB-WALL-B-L-600',
    'CAB-WALL-B-ML-600',
    'CAB-WALL-B-MR-600',
    'CAB-WALL-B-R-600'
  );
