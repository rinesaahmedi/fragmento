WITH oven_sources AS (
  SELECT
    kitchen."id" AS "kitchenId",
    oven_bundle."code" AS "ovenBundleCode",
    oven_bundle."componentKey" AS "ovenBundleComponentKey"
  FROM "Kitchen" kitchen
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND lower(coalesce(item."componentKey", '')) IN ('oven-module', 'oven-base')
      AND upper(coalesce(item."code", '')) LIKE 'OVEN-%'
    ORDER BY
      CASE WHEN upper(item."code") LIKE '%-HOB' THEN 0 ELSE 1 END,
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) oven_bundle ON true
)
INSERT INTO "KitchenClaimPart" (
  "id",
  "kitchenId",
  "partKey",
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
  part."name",
  part."nameDe",
  source."ovenBundleCode",
  source."ovenBundleComponentKey",
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM oven_sources source
CROSS JOIN (
  VALUES
    ('oven', 'Oven', 'Backofen', 40),
    ('cooktop', 'Cooktop', 'Kochfeld', 50)
) AS part("partKey", "name", "nameDe", "sortOrder")
WHERE source."ovenBundleCode" IS NOT NULL
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
