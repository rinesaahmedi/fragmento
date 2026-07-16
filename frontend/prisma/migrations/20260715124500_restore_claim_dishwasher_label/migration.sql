UPDATE "KitchenClaimPart"
SET
  "name" = 'Fully Integrated Dishwasher',
  "nameDe" = 'Vollintegrierter Geschirrspüler',
  "updatedAt" = NOW()
WHERE "partKey" = 'dishwasher'
  AND "articleCode" = 'A-EGSPV594400';
