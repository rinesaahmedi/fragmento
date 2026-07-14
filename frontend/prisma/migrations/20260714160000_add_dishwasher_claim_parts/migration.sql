WITH dishwasher_sources AS (
  SELECT
    kitchen."id" AS "kitchenId",
    dishwasher."code" AS "dishwasherBundleCode",
    dishwasher."componentKey" AS "dishwasherComponentKey"
  FROM "Kitchen" kitchen
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND upper(coalesce(item."code", '')) LIKE 'DISH-%'
      AND upper(coalesce(item."articleNumber", '')) LIKE '%TGV60%'
    ORDER BY
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) dishwasher ON true
)
INSERT INTO "KitchenClaimPart" (
  "id",
  "kitchenId",
  "partKey",
  "name",
  "nameDe",
  "articleCode",
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
  part."name",
  part."nameDe",
  part."articleCode",
  source."dishwasherBundleCode",
  source."dishwasherComponentKey",
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM dishwasher_sources source
CROSS JOIN (
  VALUES
    ('dishwasher', 'Fully Integrated Dishwasher', 'Vollintegrierter Geschirrspüler', 'A-EGSPV594400', 32),
    ('furniture-front', 'Furniture Front (Dishwasher)', 'Möbelfront (Geschirrspüler)', 'TGV60', 34)
) AS part("partKey", "name", "nameDe", "articleCode", "sortOrder")
WHERE source."dishwasherBundleCode" IS NOT NULL
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
