-- Restore the two physical ASC claim identities for every active 60 cm
-- dishwasher package. Both identities must point to the same kitchen item and
-- plan component for the Dishwasher / Furniture Front choice to be available.
WITH dishwasher_sources AS (
  SELECT DISTINCT ON (item."kitchenId")
    item."kitchenId",
    item."code" AS "sourceKitchenItemCode",
    item."componentKey" AS "sourceComponentKey"
  FROM "KitchenItem" AS item
  WHERE item."isActive" = true
    AND upper(coalesce(item."code", '')) LIKE 'DISH-%'
    AND upper(coalesce(item."articleNumber", '')) LIKE '%A-EGSPV597210%'
    AND upper(coalesce(item."articleNumber", '')) LIKE '%TGV60%'
  ORDER BY
    item."kitchenId",
    CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
    item."sortOrder",
    item."id"
)
INSERT INTO "KitchenClaimPart" (
  "id",
  "kitchenId",
  "partKey",
  "articleCode",
  "name",
  "nameDe",
  "sourceKitchenItemCode",
  "sourceComponentKey",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  source."kitchenId" || ':claim-part:' || part."partKey",
  source."kitchenId",
  part."partKey",
  part."articleCode",
  part."name",
  part."nameDe",
  source."sourceKitchenItemCode",
  source."sourceComponentKey",
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM dishwasher_sources AS source
CROSS JOIN (
  VALUES
    ('dishwasher', 'A-EGSPV597210', 'Fully Integrated Dishwasher', 'Vollintegrierter Geschirrspüler', 32),
    ('furniture-front', 'TGV60', 'Furniture Front (Dishwasher)', 'Möbelfront (Geschirrspüler)', 34)
) AS part("partKey", "articleCode", "name", "nameDe", "sortOrder")
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "articleCode" = EXCLUDED."articleCode",
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
