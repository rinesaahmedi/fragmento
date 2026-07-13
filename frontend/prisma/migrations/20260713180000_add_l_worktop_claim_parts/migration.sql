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
    'ab-104968',
    'ab-105734',
    'ab-105737',
    'ab-105740',
    'ab-105805',
    'ab-105809',
    'ab-105813',
    'ab-105817',
    'ab-105822',
    'ab-105825',
    'ab-105828',
    'ab-105831',
    'ab-105834',
    'ab-105837',
    'ab-105840',
    'ab-105843'
  )
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
  source."worktopCode",
  source."worktopComponentKey",
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM worktop_sources source
CROSS JOIN (
  VALUES
    ('worktop-left', 'Left Worktop', 'Arbeitsplatte links', 60),
    ('worktop-right', 'Right Worktop', 'Arbeitsplatte rechts', 70)
) AS part("partKey", "name", "nameDe", "sortOrder")
WHERE source."worktopCode" IS NOT NULL
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
