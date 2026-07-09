UPDATE "KitchenItem" AS item
SET
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "updatedAt" = NOW()
FROM "CatalogArticle" AS article
WHERE article."articleNumber" = 'FH664621E + FWK124 + HD6002'
  AND (
    item."catalogArticleId" = article."id"
    OR item."articleNumber" = article."articleNumber"
    OR item."code" LIKE 'CAB-HOOD-%'
  );
