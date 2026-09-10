-- Match the 60 cm ASC dishwasher label to the existing explicit 45 cm label.
UPDATE "KitchenClaimPart"
SET
  "name" = 'Fully Integrated Dishwasher 60 cm',
  "nameDe" = 'Vollintegrierter Geschirrspüler 60 cm',
  "updatedAt" = NOW()
WHERE "partKey" = 'dishwasher'
  AND "articleCode" = 'A-EGSPV597210';
