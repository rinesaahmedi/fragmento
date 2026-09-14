-- AB 110401 uses the UE115 technical article identity, while the customer-
-- facing front is labelled as a 60 cm lower cabinet. Change only its names;
-- preserve price, dimensions, catalog identity, and all other dashboard data.

UPDATE "KitchenItem" AS item
SET
  "name" = 'Lower Cabinet 60 cm',
  "nameDe" = 'Unterschrank 60 cm',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-110401'
  AND item."code" = 'CAB-BASE-AB110401-DEFAULT-3'
  AND item."articleNumber" = 'UE115';
