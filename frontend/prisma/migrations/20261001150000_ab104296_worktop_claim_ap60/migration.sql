-- AB 104296 uses AP60 for both worktop replacement parts in ASC.
-- The commercial kitchen item and shared price catalog stay unchanged.
UPDATE "KitchenClaimPart" AS part
SET "articleCode" = 'AP60',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-104296'
  AND part."partKey" IN ('worktop-left', 'worktop-right')
  AND part."articleCode" IN ('PLR60-1', 'PLR60-2');
