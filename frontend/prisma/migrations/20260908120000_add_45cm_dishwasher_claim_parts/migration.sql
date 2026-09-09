-- Keep every FRG item explicitly identified as a 45 cm dishwasher linked to
-- the matching 45 cm catalog package. Confirmed order snapshots are not
-- changed, so historical purchases retain their original commercial data.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'A-EGSPV587915 + TGV45',
  "widthMm" = 450,
  "catalogArticleId" = COALESCE(
    (SELECT "id" FROM "CatalogArticle" WHERE "articleNumber" = 'A-EGSPV587915 + TGV45' LIMIT 1),
    item."catalogArticleId"
  ),
  "catalogLinkStatus" = CASE
    WHEN EXISTS (SELECT 1 FROM "CatalogArticle" WHERE "articleNumber" = 'A-EGSPV587915 + TGV45') THEN 'MATCHED'
    ELSE item."catalogLinkStatus"
  END,
  "productImagePath" = NULL,
  "productInfoPdfPath" = NULL,
  "productInfoSummary" = NULL,
  "productInfoKeyFacts" = NULL,
  "productInfoExtractedText" = NULL,
  "productInfoUpdatedAt" = NULL,
  "updatedAt" = NOW()
WHERE item."isActive" = true
  AND upper(item."code") LIKE 'DISH-%-450';

-- Install (or replace stale 60 cm) ASC claim parts for the exact FRG kitchen
-- item and plan component. The furniture front stays an additive manual choice.
WITH dishwasher_sources AS (
  SELECT DISTINCT ON (item."kitchenId")
    item."kitchenId",
    item."code" AS "sourceKitchenItemCode",
    item."componentKey" AS "sourceComponentKey"
  FROM "KitchenItem" AS item
  WHERE item."isActive" = true
    AND upper(item."code") LIKE 'DISH-%-450'
  ORDER BY item."kitchenId", item."sortOrder", item."id"
)
INSERT INTO "KitchenClaimPart" (
  "id",
  "kitchenId",
  "partKey",
  "articleCode",
  "name",
  "nameDe",
  "sourceKitchenItemCode",
  "sourceComponentKey",
  "productImagePath",
  "productInfoPdfPath",
  "productInfoSummary",
  "productInfoKeyFacts",
  "productInfoExtractedText",
  "productInfoUpdatedAt",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  source."kitchenId" || ':claim-part:' || part."partKey",
  source."kitchenId",
  part."partKey",
  part."articleCode",
  part."name",
  part."nameDe",
  source."sourceKitchenItemCode",
  source."sourceComponentKey",
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM dishwasher_sources AS source
CROSS JOIN (
  VALUES
    ('dishwasher', 'A-EGSPV587915', 'Fully Integrated Dishwasher 45 cm', 'Vollintegrierter Geschirrspüler 45 cm', 32),
    ('furniture-front', 'TGV45', 'Furniture Front (Dishwasher)', 'Möbelfront (Geschirrspüler)', 34)
) AS part("partKey", "articleCode", "name", "nameDe", "sortOrder")
ON CONFLICT ("kitchenId", "partKey") DO UPDATE SET
  "articleCode" = EXCLUDED."articleCode",
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "sourceKitchenItemCode" = EXCLUDED."sourceKitchenItemCode",
  "sourceComponentKey" = EXCLUDED."sourceComponentKey",
  "productImagePath" = NULL,
  "productInfoPdfPath" = NULL,
  "productInfoSummary" = NULL,
  "productInfoKeyFacts" = NULL,
  "productInfoExtractedText" = NULL,
  "productInfoUpdatedAt" = NULL,
  "isActive" = true,
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
