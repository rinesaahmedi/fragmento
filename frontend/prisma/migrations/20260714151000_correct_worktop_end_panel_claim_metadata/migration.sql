-- The plan hotspot remains the worktop-end-panel claim part, but it represents
-- the standard lower-cabinet side panel sold as WU16 in every kitchen.
UPDATE "KitchenClaimPart"
SET
  "articleCode" = 'WU16',
  "name" = 'Cabinet side panel',
  "nameDe" = 'Unterschrank-Wange',
  "updatedAt" = NOW()
WHERE "partKey" = 'worktop-end-panel'
  AND "isActive" = true;
