-- UE115 is an included/default component of AB 110401. Register it as a
-- claim-only product tied to the existing cabinet and exact ASC hotspot.
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
  'claim-ab-110401-cabinet-base-module-3',
  kitchen."id",
  'cabinet-base-module-3',
  'Lower Cabinet 60 cm',
  'Unterschrank 60 cm',
  'UE115',
  'CAB-BASE-AB110401-DEFAULT-3',
  'base-module-3',
  true,
  55,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'ab-110401'
ON CONFLICT ("kitchenId", "partKey") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "articleCode" = EXCLUDED."articleCode",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

