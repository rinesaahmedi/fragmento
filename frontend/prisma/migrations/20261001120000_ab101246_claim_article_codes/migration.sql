-- AB 101246 uses these replacement-part identities in ASC only. The
-- commercial KitchenItem and shared catalog article numbers stay unchanged.
INSERT INTO "KitchenClaimPart" (
  "id", "kitchenId", "partKey", "name", "nameDe", "articleCode",
  "sourceKitchenItemCode", "sourceComponentKey", "isActive", "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  kitchen."id" || ':claim-part:' || part."partKey",
  kitchen."id",
  part."partKey",
  part."name",
  part."nameDe",
  part."articleCode",
  part."sourceKitchenItemCode",
  part."sourceComponentKey",
  true,
  part."sortOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN (VALUES
  ('sink-cabinet', 'Sink Lower Cabinet 50 cm', 'Spülen-Unterschrank 50 cm', 'SPDT50', 'SINK-BASE-AB101246-SP50', 'sink-base', 20),
  ('blende-base-module-1', 'Filler Panel for Lower Cabinet', 'Passblende Unterschrank', 'UP10K', 'CAB-BASE-AB101246-US50-DEFAULT', 'base-module-1', 21),
  ('faucet', 'Kitchen Faucet', 'Küchenarmatur', '519723', 'FAUCET-AB101246', 'sink-faucet', 30),
  ('filter', 'Extractor Hood Filter', 'Filter für Dunstabzugshaube', 'KF17146', 'CAB-HOOD-AB101246-DEFAULT', 'wall-cabinet-4', 35),
  ('oven', 'Built-in Oven', 'Einbauherd', 'EH9236SM-A', 'OVEN-AB101246-DEFAULT', 'oven-module', 40),
  ('oven-drawer', 'Lower Cabinet for Built-in Oven', 'Unterschrank für Einbauherde', 'UH60', 'OVEN-AB101246-DEFAULT', 'oven-module', 45),
  ('cooktop', 'Ceramic Cooktop 60 cm', 'Glaskeramikkochfeld 60 cm', '9EC744100E', 'OVEN-AB101246-DEFAULT', 'oven-module', 50),
  ('cabinet-base-module-2', 'Lower Cabinet 40 cm', 'Unterschrank 40 cm', 'UDT40', 'CAB-BASE-AB101246-U40-DEFAULT', 'base-module-2', 60),
  ('blende-wall-cabinet-1', 'Filler Panel for Upper Cabinet', 'Passblende Hängeschrank', 'HP1072K', 'CAB-WALL-AB101246-H10072-DEFAULT', 'wall-cabinet-1', 80),
  ('cabinet-extractor-hood', 'Extractor Hood', 'Flachschirmhaube', '9FH17161E', 'CAB-HOOD-AB101246-DEFAULT', 'extractor-hood', 112)
) AS part("partKey", "name", "nameDe", "articleCode", "sourceKitchenItemCode", "sourceComponentKey", "sortOrder")
WHERE kitchen."slug" = 'ab-101246'
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- The existing PDFs describe the previous oven/cooktop models. Do not show
-- those documents under the replacement article numbers.
UPDATE "KitchenClaimPart" AS part
SET "productImagePath" = NULL,
    "productInfoPdfPath" = NULL,
    "productInfoSummary" = NULL,
    "productInfoKeyFacts" = NULL,
    "productInfoExtractedText" = NULL,
    "productInfoUpdatedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-101246'
  AND part."partKey" IN ('oven', 'cooktop');
