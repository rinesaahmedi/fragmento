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
  WHERE lower(kitchen."slug") IN (
    'ab-105833',
    'ab-105836',
    'ab-105839',
    'ab-105842',
    'ab-105845'
  )
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
  source."worktopCode",
  source."worktopComponentKey",
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM worktop_sources source
CROSS JOIN (
  VALUES
    ('worktop-left', 'PLR60-1', 'Left Worktop', 'Arbeitsplatte links', 60),
    ('worktop-right', 'PLR60-2', 'Right Worktop', 'Arbeitsplatte rechts', 70)
) AS part("partKey", "articleCode", "name", "nameDe", "sortOrder")
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
