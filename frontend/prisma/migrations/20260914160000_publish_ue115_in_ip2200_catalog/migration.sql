-- Keep UE115 as the technical article identity while using the requested
-- customer-facing cabinet name from the database catalog.
UPDATE "CatalogArticle"
SET
  "name" = 'Lower Cabinet 60 cm',
  "nameDe" = 'Unterschrank 60 cm',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "articleNumber" = 'UE115';

-- The program-scoped admin catalog uses an INNER JOIN to program prices.
-- Publish UE115 in IP 2200 using its existing catalog price only when the
-- program row is missing. Never overwrite a dashboard-managed program price.
INSERT INTO "CatalogArticleProgramPrice" (
  "id",
  "programmId",
  "catalogArticleId",
  "articleNumber",
  "price",
  "isActive",
  "updatedAt",
  "createdAt"
)
SELECT
  'catalog-article-program-price-ip2200-ue115',
  'IP 2200',
  article."id",
  article."articleNumber",
  article."price",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "CatalogArticle" AS article
WHERE article."articleNumber" = 'UE115'
ON CONFLICT ("programmId", "catalogArticleId") DO NOTHING;
