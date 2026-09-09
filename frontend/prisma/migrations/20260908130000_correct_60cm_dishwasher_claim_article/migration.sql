-- Keep the ASC dishwasher identity aligned with the appliance component in
-- the FRG 60 cm package. The matching furniture front remains TGV60.
UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'A-EGSPV597210',
  "updatedAt" = NOW()
FROM "KitchenItem" AS item
WHERE part."kitchenId" = item."kitchenId"
  AND part."sourceKitchenItemCode" = item."code"
  AND part."partKey" = 'dishwasher'
  AND part."articleCode" = 'A-EGSPV594400'
  AND part."isActive" = true
  AND item."isActive" = true
  AND upper(coalesce(item."articleNumber", '')) LIKE '%A-EGSPV597210%'
  AND upper(coalesce(item."articleNumber", '')) LIKE '%TGV60%';
