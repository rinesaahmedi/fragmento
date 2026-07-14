UPDATE "KitchenItem"
SET "articleNumber" = 'FH 664 621 E'
WHERE "componentKey" = 'extractor-hood'
  AND "code" LIKE '%FH664621E%'
  AND "articleNumber" IS DISTINCT FROM 'FH 664 621 E';

UPDATE "OrderItem"
SET "articleNumberSnapshot" = 'FH 664 621 E'
WHERE "code" LIKE 'HOOD-%FH664621E%'
  AND "articleNumberSnapshot" IS DISTINCT FROM 'FH 664 621 E';

UPDATE "TestOrderItem"
SET "articleNumberSnapshot" = 'FH 664 621 E'
WHERE "code" LIKE 'HOOD-%FH664621E%'
  AND "articleNumberSnapshot" IS DISTINCT FROM 'FH 664 621 E';
