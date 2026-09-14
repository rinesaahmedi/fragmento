-- EUR 35 is the HPK2002 price, not its width. Keep the stored label aligned
-- with the canonical CatalogBlende description used in confirmations.
UPDATE "KitchenItem"
SET
  "blendeLabel" = 'Passblende bis 20 cm',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "blendeCode" = 'HPK2002'
  AND "blendeLabel" = 'HPK2002 35 cm';
