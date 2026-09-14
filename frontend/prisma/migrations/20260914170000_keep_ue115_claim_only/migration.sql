-- UE115 is an included/default AB 110401 component used for service claims.
-- It must not be exposed as a purchasable IP 2200 catalog article.
-- Remove only the program row created by our preceding targeted migration;
-- never remove or overwrite a dashboard-created program price.
DELETE FROM "CatalogArticleProgramPrice"
WHERE "id" = 'catalog-article-program-price-ip2200-ue115'
  AND "programmId" = 'IP 2200'
  AND "articleNumber" = 'UE115';

