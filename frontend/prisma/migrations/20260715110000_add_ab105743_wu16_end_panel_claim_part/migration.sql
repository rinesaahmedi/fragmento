-- AB 105743 uses the same WU16 lower-cabinet side panel claim as the other
-- kitchens with a worktop end panel.
WITH worktop_source AS (
  SELECT
    kitchen."id" AS "kitchenId",
    item."code" AS "worktopCode",
    item."componentKey" AS "worktopComponentKey"
  FROM "Kitchen" kitchen
  JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND lower(coalesce(item."componentKey", '')) = 'worktop'
    ORDER BY item."isLocked" DESC, item."sortOrder", item."id"
    LIMIT 1
  ) item ON true
  WHERE lower(kitchen."slug") = 'ab-105743'
)
INSERT INTO "KitchenClaimPart" (
  "id", "kitchenId", "partKey", "name", "nameDe", "articleCode",
  "sourceKitchenItemCode", "sourceComponentKey", "isActive", "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  source."kitchenId" || ':claim-part:worktop-end-panel',
  source."kitchenId",
  'worktop-end-panel',
  'Cabinet side panel',
  'Unterschrank-Wange',
  'WU16',
  source."worktopCode",
  source."worktopComponentKey",
  true,
  80,
  NOW(),
  NOW()
FROM worktop_source source
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
