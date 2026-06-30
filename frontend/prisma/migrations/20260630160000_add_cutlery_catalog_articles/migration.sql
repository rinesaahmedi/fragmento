INSERT INTO "CatalogArticle" (
  "id",
  "articleNumber",
  "name",
  "nameDe",
  "price",
  "itemType",
  "isFixedPricePackage",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES
  ('catalog-art-zb30sg', 'ZB30SG', 'Cutlery insert 30 cm', 'Besteckeinsatz 30 cm', 19.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb40sg', 'ZB40SG', 'Cutlery insert 40 cm', 'Besteckeinsatz 40 cm', 19.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb45sg', 'ZB45SG', 'Cutlery insert 45 cm', 'Besteckeinsatz 45 cm', 22.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb50sg', 'ZB50SG', 'Cutlery insert 50 cm', 'Besteckeinsatz 50 cm', 22.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb60sg', 'ZB60SG', 'Cutlery insert 60 cm', 'Besteckeinsatz 60 cm', 25.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb80sg', 'ZB80SG', 'Cutlery insert 80 cm', 'Besteckeinsatz 80 cm', 31.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb90sg', 'ZB90SG', 'Cutlery insert 90 cm', 'Besteckeinsatz 90 cm', 31.00, 'ACCESSORY', false, true, NOW(), NOW()),
  ('catalog-art-zb100sg', 'ZB100SG', 'Cutlery insert 100 cm', 'Besteckeinsatz 100 cm', 36.00, 'ACCESSORY', false, true, NOW(), NOW())
ON CONFLICT ("articleNumber") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "price" = EXCLUDED."price",
  "itemType" = EXCLUDED."itemType",
  "isFixedPricePackage" = EXCLUDED."isFixedPricePackage",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
