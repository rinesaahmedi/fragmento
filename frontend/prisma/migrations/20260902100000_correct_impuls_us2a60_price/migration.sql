-- Correct the approved Impuls price for US2A60 while leaving Burger's
-- program-specific EUR 461 price unchanged.
UPDATE "CatalogArticle"
SET "price" = 347.00
WHERE "articleNumber" = 'US2A60';

UPDATE "CatalogArticleProgramPrice"
SET "price" = 347.00
WHERE "programmId" = 'IP 2200'
  AND "articleNumber" = 'US2A60';
