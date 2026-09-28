-- Keep the configured article number identical to the linked catalog package.
UPDATE "KitchenItem" AS item
SET "articleNumber" = 'FH664621E + FWK124 + HD6002'
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('ab-105762', 'ab-105766', 'ab-105770', 'ab-105774')
  AND item."code" = 'CAB-HOOD-AB105762-600';

-- Repair incomplete snapshots so every downstream export sees the full bundle.
UPDATE "OrderItem"
SET "articleNumberSnapshot" = 'FH664621E + FWK124 + HD6002'
WHERE "code" = 'CAB-HOOD-AB105762-600'
  AND "articleNumberSnapshot" = 'FH664621E + FWK124';

UPDATE "TestOrderItem"
SET "articleNumberSnapshot" = 'FH664621E + FWK124 + HD6002'
WHERE "code" = 'CAB-HOOD-AB105762-600'
  AND "articleNumberSnapshot" = 'FH664621E + FWK124';
