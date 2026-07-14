UPDATE "KitchenItem"
SET "articleNumber" = 'FH 664 621 E'
WHERE "articleNumber" = 'FH 664 621 S';

UPDATE "OrderItem"
SET "articleNumberSnapshot" = 'FH 664 621 E'
WHERE "articleNumberSnapshot" = 'FH 664 621 S';

UPDATE "TestOrderItem"
SET "articleNumberSnapshot" = 'FH 664 621 E'
WHERE "articleNumberSnapshot" = 'FH 664 621 S';

UPDATE "CatalogArticleProgramPrice"
SET "articleNumber" = 'FH 664 621 E'
WHERE "articleNumber" = 'FH 664 621 S';

UPDATE "CatalogArticlePriceHistory"
SET "articleNumber" = 'FH 664 621 E'
WHERE "articleNumber" = 'FH 664 621 S';

UPDATE "CatalogPriceListImportRow"
SET "articleNumber" = 'FH 664 621 E'
WHERE "articleNumber" = 'FH 664 621 S';

UPDATE "CatalogArticle"
SET "articleNumber" = 'FH 664 621 E'
WHERE "articleNumber" = 'FH 664 621 S';
