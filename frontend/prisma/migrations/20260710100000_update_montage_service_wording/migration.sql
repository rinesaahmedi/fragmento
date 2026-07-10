UPDATE "CatalogService"
SET
  "name" = 'Delivery, Carry-in, Assembly and Installation',
  "nameDe" = COALESCE("nameDe", 'Lieferung, Vertragen, Montage und Anschluss'),
  "updatedAt" = NOW()
WHERE "code" = 'MONTAGE'
  AND (
    "name" IS DISTINCT FROM 'Delivery, Carry-in, Assembly and Installation'
    OR "nameDe" IS NULL
  );

UPDATE "KitchenItem"
SET
  "name" = 'Delivery, Carry-in, Assembly and Installation',
  "nameDe" = COALESCE("nameDe", 'Lieferung, Vertragen, Montage und Anschluss'),
  "updatedAt" = NOW()
WHERE "code" = 'SVC-MONTAGE-001'
  AND (
    "name" IS DISTINCT FROM 'Delivery, Carry-in, Assembly and Installation'
    OR "nameDe" IS NULL
  );

UPDATE "CatalogService"
SET
  "name" = 'Pickup at logistics location',
  "nameDe" = COALESCE("nameDe", 'Abholung an Logistikstandort'),
  "updatedAt" = NOW()
WHERE "code" = 'PICKUP'
  AND (
    "name" IS DISTINCT FROM 'Pickup at logistics location'
    OR "nameDe" IS NULL
  );

UPDATE "KitchenItem"
SET
  "name" = 'Pickup at logistics location',
  "nameDe" = COALESCE("nameDe", 'Abholung an Logistikstandort'),
  "updatedAt" = NOW()
WHERE "code" = 'SVC-PICKUP-001'
  AND (
    "name" IS DISTINCT FROM 'Pickup at logistics location'
    OR "nameDe" IS NULL
  );
