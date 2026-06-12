UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "isLocked" = false,
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'l-shaped-kitchen'
  AND kitchen."id" = item."kitchenId"
  AND item."code" IN ('SINK-LS-TIPO45', 'TAP-LS-DARAS-F-HD', 'FILTER-LS-FWK124');

INSERT INTO "KitchenItem" (
  "id",
  "kitchenId",
  "itemType",
  "code",
  "articleNumber",
  "name",
  "price",
  "infoText",
  "iconKey",
  "isLocked",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  data."id",
  kitchen."id",
  data."itemType"::"ItemType",
  data."code",
  data."articleNumber",
  data."name",
  data."price",
  data."infoText",
  data."iconKey",
  false,
  true,
  data."sortOrder",
  NOW(),
  NOW()
FROM "Kitchen" AS kitchen,
(
  VALUES
    ('lshape-acc-waste-001', 'ACCESSORY', 'ACC-WASTE-001', 'Blanco Botton 517467', 'Waste separation system', 89::numeric, 'Blanco Botton 517467', 'waste_system', 200),
    ('lshape-acc-cutlery-zb60sg', 'ACCESSORY', 'ACC-CUTLERY-ZB60SG', 'ZB60SG', 'Cutlery insert 60 cm', 25::numeric, 'Cutlery insert 60 cm', 'cutlery_insert', 210),
    ('lshape-acc-light-003', 'ACCESSORY', 'ACC-LIGHT-003', 'KA220043_S3', 'Beleuchtungsset 3 LED-Spots', 69::numeric, NULL::text, 'lighting_set', 220)
) AS data("id", "itemType", "code", "articleNumber", "name", "price", "infoText", "iconKey", "sortOrder")
WHERE kitchen."slug" = 'l-shaped-kitchen'
ON CONFLICT ("kitchenId", "code") DO UPDATE SET
  "itemType" = EXCLUDED."itemType",
  "articleNumber" = EXCLUDED."articleNumber",
  "name" = EXCLUDED."name",
  "price" = EXCLUDED."price",
  "infoText" = EXCLUDED."infoText",
  "iconKey" = EXCLUDED."iconKey",
  "isLocked" = false,
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
