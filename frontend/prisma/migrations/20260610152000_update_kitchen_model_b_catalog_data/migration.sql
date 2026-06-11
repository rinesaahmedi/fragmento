UPDATE "KitchenItem" item
SET
  "articleNumber" = 'H6002',
  "price" = 149,
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

UPDATE "KitchenItem" item
SET
  "name" = 'Flat Screen Extractor Hood + Cabinet + Filter',
  "articleNumber" = 'FH664621E + HD6002',
  "price" = 349,
  "widthMm" = 600,
  "heightMm" = 720,
  "depthMm" = 340,
  "isActive" = true,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'CAB-HOOD-B-600';

UPDATE "KitchenItem" item
SET
  "isActive" = false,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'HOOD-B-FH664621E';

UPDATE "KitchenItem" item
SET
  "articleNumber" = 'EWA34660W + TGV60 + WU16',
  "price" = 639,
  "name" = 'Washing Machine + Front + Side Panel (600 x 830 x 540 mm)',
  "widthMm" = 600,
  "heightMm" = 830,
  "depthMm" = 540,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'WM-B-EWA34660W';

UPDATE "KitchenItem" item
SET
  "articleNumber" = 'A-EGSPV597210 + TGV60',
  "price" = 579,
  "name" = 'Fully Integrated Dishwasher incl. Furniture Front (600 x 815 x 550 mm)',
  "widthMm" = 600,
  "heightMm" = 815,
  "depthMm" = 550,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'DISH-B-600-STD';

UPDATE "KitchenItem" item
SET
  "articleNumber" = 'US60',
  "price" = 219,
  "name" = 'Base Cabinet with Drawer (600 x 878 x 600 mm)',
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'CAB-BASE-B-STR';

UPDATE "KitchenItem" item
SET
  "articleNumber" = 'OL-KGCN388140E',
  "price" = 579,
  "name" = 'Refrigerator (710 x 1780 mm)',
  "widthMm" = 710,
  "heightMm" = 1780,
  "depthMm" = NULL,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'REF-B-545-1800-700';

UPDATE "KitchenItem" item
SET
  "articleNumber" = 'EBX943600S + OL-KMI754000E',
  "name" = 'Built-in Oven + Induction Hob (600 x 878 x 600 mm)',
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'OVEN-B-600-HOB';

UPDATE "KitchenItem" item
SET
  "articleNumber" = NULL,
  "name" = 'Sink and Tap',
  "price" = 0,
  "infoText" = 'Included sink and tap',
  "isActive" = true,
  "isLocked" = true,
  "widthMm" = NULL,
  "heightMm" = NULL,
  "depthMm" = NULL,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'SINK-B-BOTTON-45';

UPDATE "KitchenItem" item
SET
  "articleNumber" = '517467',
  "name" = 'Waste Separation System',
  "price" = 89,
  "infoText" = 'Blanco Botton 517467',
  "isActive" = true,
  "isLocked" = false,
  "widthMm" = NULL,
  "heightMm" = NULL,
  "depthMm" = NULL,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'ACC-WASTE-001';

UPDATE "KitchenItem" item
SET
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'SINKBASE-B-600';

UPDATE "KitchenItem" item
SET
  "widthMm" = 3036,
  "heightMm" = 40,
  "depthMm" = 600,
  "updatedAt" = NOW()
FROM "Kitchen" kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'kitchen-model-b'
  AND item."code" = 'TOP-B-3036';
