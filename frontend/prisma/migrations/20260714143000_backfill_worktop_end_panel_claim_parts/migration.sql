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
    'ab-104968', 'ab-105734', 'ab-105737', 'ab-105740',
    'ab-105805', 'ab-105809', 'ab-105813', 'ab-105817',
    'ab-105806', 'ab-105807', 'ab-105808',
    'ab-105810', 'ab-105818', 'ab-105811', 'ab-105812', 'ab-105814',
    'ab-105815', 'ab-105816', 'ab-105819', 'ab-105820',
    'ab-105821', 'ab-105824', 'ab-105823', 'ab-105829', 'ab-105832',
    'ab-105826', 'ab-105827', 'ab-105830', 'ab-105833', 'ab-105835',
    'ab-105836', 'ab-105838', 'ab-105841', 'ab-105844',
    'ab-105839', 'ab-105842',
    'ab-105732', 'ab-105735', 'ab-105738', 'ab-105741',
    'ab-105733', 'ab-105736', 'ab-105739', 'ab-105742',
    'ab-105744', 'ab-105746', 'ab-105749', 'ab-105752', 'ab-105755',
    'ab-105757', '108134-modul-1'
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
  source."kitchenId" || ':claim-part:worktop-end-panel',
  source."kitchenId",
  'worktop-end-panel',
  'Worktop End Panel',
  'Arbeitsplatten-Seitenwange',
  'PLR60-3',
  source."worktopCode",
  source."worktopComponentKey",
  true,
  80,
  NOW(),
  NOW()
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
