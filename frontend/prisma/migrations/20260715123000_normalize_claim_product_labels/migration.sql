UPDATE "KitchenClaimPart"
SET
  "name" = 'Dishwasher',
  "nameDe" = 'Geschirrspüler',
  "updatedAt" = NOW()
WHERE "partKey" = 'dishwasher'
  AND "articleCode" = 'A-EGSPV594400';
