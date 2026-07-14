WITH filter_sources AS (
  SELECT
    kitchen."id" AS "kitchenId",
    hood_bundle."code" AS "hoodBundleCode",
    hood_bundle."componentKey" AS "hoodBundleComponentKey"
  FROM "Kitchen" kitchen
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND upper(coalesce(item."articleNumber", '')) LIKE '%FWK124%'
    ORDER BY
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      CASE WHEN lower(coalesce(item."componentKey", '')) LIKE 'wall-cabinet-%' THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) hood_bundle ON true
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
  source."kitchenId" || ':claim-part:filter',
  source."kitchenId",
  'filter',
  'Extractor Hood Filter',
  'Filter für Dunstabzugshaube',
  'FWK124',
  source."hoodBundleCode",
  source."hoodBundleComponentKey",
  true,
  35,
  NOW(),
  NOW()
FROM filter_sources source
WHERE source."hoodBundleCode" IS NOT NULL
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
