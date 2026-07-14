WITH worktop_sources AS (
  SELECT
    kitchen."id" AS "kitchenId",
    worktop."code" AS "worktopCode",
    worktop."componentKey" AS "worktopComponentKey"
  FROM "Kitchen" kitchen
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND lower(coalesce(item."componentKey", '')) = 'worktop'
    ORDER BY
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) worktop ON true
  WHERE lower(kitchen."slug") IN ('ab-105837', 'ab-105840', 'ab-105843')
)
INSERT INTO "KitchenClaimPart" (
  "id", "kitchenId", "partKey", "name", "nameDe", "articleCode",
  "sourceKitchenItemCode", "sourceComponentKey", "isActive", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  source."kitchenId" || ':claim-part:worktop-end-panel',
  source."kitchenId", 'worktop-end-panel', 'Worktop End Panel', 'Arbeitsplatten-Seitenwange', 'PLR60-3',
  source."worktopCode", source."worktopComponentKey", true, 80, NOW(), NOW()
FROM worktop_sources source
WHERE source."worktopCode" IS NOT NULL
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
