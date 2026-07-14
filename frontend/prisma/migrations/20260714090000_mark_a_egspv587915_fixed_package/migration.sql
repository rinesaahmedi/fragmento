UPDATE "CatalogArticle"
SET
  "isFixedPricePackage" = true,
  "updatedAt" = NOW()
WHERE "articleNumber" = 'A-EGSPV587915 + TGV45';
