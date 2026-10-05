-- Remove legacy upper-cabinet measurements from these two kitchens.
-- Catalog nulls intentionally mean that a dimension is not displayed.
UPDATE "KitchenItem" AS item
SET "widthMm" = article."widthMm",
    "heightMm" = article."heightMm",
    "depthMm" = article."depthMm",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen, "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND item."catalogArticleId" = article."id"
  AND kitchen."slug" IN ('ab-104296', 'ab-104332')
  AND (item."componentKey" LIKE 'wall-cabinet-%'
       OR item."componentKey" = 'extractor-hood')
  AND (item."widthMm" IS DISTINCT FROM article."widthMm"
       OR item."heightMm" IS DISTINCT FROM article."heightMm"
       OR item."depthMm" IS DISTINCT FROM article."depthMm");
