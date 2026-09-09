-- AB 109873 draws the SP120 sink cabinet as two adjacent 60 cm fronts.
-- Store it as one locked commercial article and retire the obsolete second row.

INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "description",
  "widthMm", "heightMm", "depthMm", "price", "itemType",
  "isFixedPricePackage", "isActive", "updatedAt"
)
VALUES (
  'catalog-article-sp120',
  'SP120',
  'Sink Base Cabinet 120 cm',
  'Spülenschrank 120 cm',
  'Two-door 120 cm sink base cabinet',
  1200,
  878,
  600,
  0.00,
  'COMPONENT'::"ItemType",
  false,
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("articleNumber") DO UPDATE SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "description" = EXCLUDED."description",
  "widthMm" = EXCLUDED."widthMm",
  "heightMm" = EXCLUDED."heightMm",
  "depthMm" = EXCLUDED."depthMm",
  "itemType" = EXCLUDED."itemType",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "KitchenItem" AS item
SET
  "code" = 'SINK-BASE-AB109873-SP120',
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "widthMm" = article."widthMm",
  "heightMm" = article."heightMm",
  "depthMm" = article."depthMm",
  "infoText" = 'Included SP120 sink cabinet with UPK20 filler panel',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" IN ('SINK-BASE-AB109873-DEFAULT', 'SINK-BASE-AB109873-SP120')
  AND article."articleNumber" = 'SP120';

UPDATE "KitchenItem" AS item
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND item."code" = 'CAB-BASE-AB109873-DEFAULT-1';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'SP120',
  "name" = 'Sink Base Cabinet 120 cm',
  "nameDe" = 'Spülenschrank 120 cm',
  "sourceKitchenItemCode" = 'SINK-BASE-AB109873-SP120',
  "sourceComponentKey" = 'sink-base',
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109873'
  AND part."partKey" = 'sink-cabinet';
