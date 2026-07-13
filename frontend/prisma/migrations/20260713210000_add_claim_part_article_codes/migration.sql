ALTER TABLE "KitchenClaimPart"
  ADD COLUMN "articleCode" TEXT;

UPDATE "KitchenClaimPart"
SET
  "articleCode" = metadata."articleCode",
  "name" = metadata."name",
  "nameDe" = metadata."nameDe",
  "updatedAt" = NOW()
FROM (
  VALUES
    ('oven-drawer', 'UHK', 'Lower Cabinet for Built-in Oven', 'Unterschrank für Einbauherde'),
    ('oven', 'EH92364E-A', 'Built-in Oven', 'Einbauherd'),
    ('cooktop', '9EC744100C', 'Ceramic Cooktop 60cm', 'Glaskeramikkochfeld 60 cm'),
    ('sink-cabinet', 'SP60', 'Sink Lower Cabinet', 'Spülen-Unterschrank'),
    ('sink', '526335', 'Built-in Sink BLANCO TIPO 45 S', 'Einbau-Spüle BLANCO TIPO 45 S'),
    ('faucet', '517720', 'Kitchen Faucet BLANCO DARAS HD', 'Küchenarmatur BLANCO DARAS HD'),
    ('worktop-left', 'PLR60-1', 'Left Worktop', 'Arbeitsplatte links'),
    ('worktop-right', 'PLR60-2', 'Right Worktop', 'Arbeitsplatte rechts')
) AS metadata("partKey", "articleCode", "name", "nameDe")
WHERE "KitchenClaimPart"."partKey" = metadata."partKey";

-- Keep the AB metadata available for the cabinet side panel without activating
-- a claim selector where a kitchen plan has no dedicated side-panel hotspot.
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
  kitchen."id" || ':claim-part:cabinet-side-panel',
  kitchen."id",
  'cabinet-side-panel',
  'Cabinet side panel',
  'Unterschrank-Wange',
  'WU16',
  NULL,
  NULL,
  false,
  80,
  NOW(),
  NOW()
FROM "Kitchen" kitchen
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "updatedAt" = NOW();
