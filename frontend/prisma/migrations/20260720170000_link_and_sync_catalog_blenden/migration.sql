-- The live Fragmento catalog is the canonical source for every environment.
-- Align catalog metadata that had drifted in developer databases.
UPDATE "CatalogArticle"
SET "price" = 450.00, "updatedAt" = NOW()
WHERE "articleNumber" = 'A-EGSPV587915 + TGV45';

UPDATE "CatalogArticle"
SET
  "name" = 'Fully Integrated Dishwasher incl. Furniture Front',
  "widthMm" = 600,
  "updatedAt" = NOW()
WHERE "articleNumber" = 'A-EGSPV597210 + TGV60';

UPDATE "CatalogArticle"
SET "name" = 'Washing machine + Front + Side Panel', "updatedAt" = NOW()
WHERE "articleNumber" = 'EWA34660W + TGV60 + WU16';

UPDATE "CatalogArticle"
SET
  "name" = 'Flat screen Extractor hood + Cabinet + Filter 60 cm',
  "nameDe" = 'Flachschirmhaube + Schrank + Filter 60 cm',
  "widthMm" = 600,
  "updatedAt" = NOW()
WHERE "articleNumber" = 'FH664621E + FWK124 + HD6002';

UPDATE "CatalogArticle"
SET "heightMm" = 723, "updatedAt" = NOW()
WHERE "articleNumber" IN ('H10002', 'H3002', 'H4002', 'H4502', 'H5002', 'H6002', 'H8002', 'H9002');

UPDATE "CatalogArticle"
SET "name" = 'Angled Extractor Hood + filter', "updatedAt" = NOW()
WHERE "articleNumber" = 'KHF664611S + FWP18';

UPDATE "CatalogArticle"
SET "widthMm" = 540, "depthMm" = NULL, "updatedAt" = NOW()
WHERE "articleNumber" = 'OL-KGCN388140E';

UPDATE "CatalogArticle"
SET
  "name" = 'Lower cabinet with Drawer ' || substring("articleNumber" FROM 3) || ' cm',
  "updatedAt" = NOW()
WHERE "articleNumber" IN ('US30', 'US40', 'US45', 'US50', 'US60', 'US80', 'US90', 'US100', 'US120');

UPDATE "CatalogArticle"
SET
  "widthMm" = substring("articleNumber" FROM 3 FOR length("articleNumber") - 4)::integer * 10,
  "updatedAt" = NOW()
WHERE "articleNumber" IN ('ZB30SG', 'ZB40SG', 'ZB45SG', 'ZB50SG', 'ZB60SG', 'ZB80SG', 'ZB90SG', 'ZB100SG');

UPDATE "CatalogBlende"
SET
  "name" = 'Filler Panel up to 20 cm',
  "nameDe" = 'Passblende bis 20 cm',
  "updatedAt" = NOW()
WHERE "code" IN ('HPK2002', 'UPK20');

-- Replace the obsolete duplicate lighting article with the server catalog row.
UPDATE "KitchenItem" AS item
SET
  "catalogArticleId" = canonical."id",
  "articleNumber" = canonical."articleNumber",
  "updatedAt" = NOW()
FROM "CatalogArticle" AS obsolete, "CatalogArticle" AS canonical
WHERE obsolete."articleNumber" = 'KA220043_S3'
  AND canonical."articleNumber" = 'KALB KA220043_S3'
  AND item."catalogArticleId" = obsolete."id";

DELETE FROM "CatalogArticle"
WHERE "articleNumber" = 'KA220043_S3';

-- The inactive legacy hood rows represent the same fixed catalog package.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "catalogArticleId" = article."id",
  "updatedAt" = NOW()
FROM "CatalogArticle" AS article
WHERE article."articleNumber" = 'FH664621E + FWK124 + HD6002'
  AND item."isActive" = false
  AND item."code" LIKE 'HOOD-%'
  AND item."articleNumber" = 'FH 664 621 E';

-- Link all article and service rows by canonical identifiers.
UPDATE "KitchenItem" AS item
SET "catalogArticleId" = article."id", "updatedAt" = NOW()
FROM "CatalogArticle" AS article
WHERE item."articleNumber" = article."articleNumber"
  AND item."catalogArticleId" IS DISTINCT FROM article."id";

UPDATE "KitchenItem" AS item
SET "catalogServiceId" = service."id", "updatedAt" = NOW()
FROM "CatalogService" AS service
WHERE (item."code" = 'SVC-MONTAGE-001' AND service."code" = 'MONTAGE')
   OR (item."code" = 'SVC-PICKUP-001' AND service."code" = 'PICKUP');

-- Two UPK20 panels are one lower-cabinet corner panel. Normalize every legacy
-- double row to exactly one UPEF65 relation, including rows whose text was
-- changed previously while their foreign key still pointed at UPK20.
UPDATE "KitchenItem" AS item
SET
  "catalogBlendeId" = upef65."id",
  "catalogBlendeQuantity" = 1,
  "blendeCode" = upef65."code",
  "blendeLabel" = COALESCE(upef65."nameDe", upef65."name"),
  "blendePrice" = upef65."price",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "CatalogBlende" AS upef65
WHERE upef65."code" = 'UPEF65'
  AND (
    COALESCE(item."catalogBlendeQuantity", 0) > 1
    OR upper(COALESCE(item."blendeCode", '')) ~ 'X[[:space:]]*2'
    OR upper(COALESCE(item."blendeLabel", '')) ~ 'X[[:space:]]*2'
  );

-- Link every remaining legacy blende row by its saved code. Quantity is always
-- one; no KitchenItem is allowed to model a repeated blende relation.
UPDATE "KitchenItem" AS item
SET
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "blendeCode" = blende."code",
  "blendeLabel" = COALESCE(blende."nameDe", blende."name"),
  "blendePrice" = blende."price",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "CatalogBlende" AS blende
WHERE upper(COALESCE(item."blendeCode", '')) LIKE blende."code" || '%'
  AND blende."code" IN ('HPEF4302', 'HPK2002', 'UPEF65', 'UPK20')
  AND COALESCE(item."catalogBlendeQuantity", 0) <= 1;

-- Synchronize all compatibility snapshots from their linked catalog records.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "CatalogArticle" AS article
WHERE item."catalogArticleId" = article."id";

UPDATE "KitchenItem" AS item
SET
  "blendeCode" = blende."code",
  "blendeLabel" = COALESCE(blende."nameDe", blende."name"),
  "blendePrice" = blende."price",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "CatalogBlende" AS blende
WHERE item."catalogBlendeId" = blende."id";

UPDATE "KitchenItem" AS item
SET
  "name" = service."name",
  "nameDe" = service."nameDe",
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "CatalogService" AS service
WHERE item."catalogServiceId" = service."id";

-- Recalculate non-included item prices from the linked catalog. Program prices
-- take precedence whenever a kitchen program defines them.
WITH expected_article_prices AS (
  SELECT
    item."id",
    COALESCE(article_program."price", article."price")
      + COALESCE(blende_program."price", blende."price", 0) AS expected_price,
    COALESCE(blende_program."price", blende."price") AS expected_blende_price
  FROM "KitchenItem" AS item
  JOIN "Kitchen" AS kitchen ON kitchen."id" = item."kitchenId"
  JOIN "CatalogArticle" AS article ON article."id" = item."catalogArticleId"
  LEFT JOIN "CatalogBlende" AS blende ON blende."id" = item."catalogBlendeId"
  LEFT JOIN "CatalogArticleProgramPrice" AS article_program
    ON article_program."programmId" = kitchen."programmId"
   AND article_program."catalogArticleId" = article."id"
   AND article_program."isActive" = true
  LEFT JOIN "CatalogBlendeProgramPrice" AS blende_program
    ON blende_program."programmId" = kitchen."programmId"
   AND blende_program."catalogBlendeId" = blende."id"
   AND blende_program."isActive" = true
  WHERE item."isLocked" = false
)
UPDATE "KitchenItem" AS item
SET
  "price" = expected.expected_price,
  "blendePrice" = expected.expected_blende_price,
  "updatedAt" = NOW()
FROM expected_article_prices AS expected
WHERE item."id" = expected."id";

WITH expected_service_prices AS (
  SELECT
    item."id",
    COALESCE(service_program."price", service."price") AS expected_price
  FROM "KitchenItem" AS item
  JOIN "Kitchen" AS kitchen ON kitchen."id" = item."kitchenId"
  JOIN "CatalogService" AS service ON service."id" = item."catalogServiceId"
  LEFT JOIN "CatalogServiceProgramPrice" AS service_program
    ON service_program."programmId" = kitchen."programmId"
   AND service_program."catalogServiceId" = service."id"
   AND service_program."isActive" = true
  WHERE item."isLocked" = false
)
UPDATE "KitchenItem" AS item
SET "price" = expected.expected_price, "updatedAt" = NOW()
FROM expected_service_prices AS expected
WHERE item."id" = expected."id";
