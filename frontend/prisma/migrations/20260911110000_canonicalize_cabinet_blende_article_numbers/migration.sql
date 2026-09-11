-- Keep the cabinet and attached filler panel as separate linked catalog records.
-- The KitchenItem article number is the cabinet's canonical catalog number;
-- catalogBlendeId carries the HPK2002 relationship and its separate price.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = correction.article_number,
  "catalogArticleId" = article."id",
  "blendeCode" = blende."code",
  "catalogBlendeId" = blende."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN (
  VALUES
    ('ab-109955', 'CAB-WALL-AB109955-H6002-HPK2002', 'H6002'),
    ('ab-110140', 'CAB-WALL-AB110140-H6002-HPK2002', 'H6002'),
    ('ab-110402', 'CAB-WALL-AB110402-H3002-HPK2002', 'H3002'),
    ('ab-110402', 'CAB-WALL-AB110402-H4002-HPK2002', 'H4002'),
    ('ab-110510', 'CAB-WALL-AB110510-H6002-HPK2002', 'H6002'),
    ('ab-111539', 'CAB-WALL-AB111539-H6002-HPK2002', 'H6002'),
    ('ab-111539', 'CAB-WALL-AB111539-H3002-HPK2002', 'H3002')
) AS correction(kitchen_slug, item_code, article_number)
CROSS JOIN "CatalogArticle" AS article
CROSS JOIN "CatalogBlende" AS blende
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = correction.kitchen_slug
  AND item."code" = correction.item_code
  AND article."articleNumber" = correction.article_number
  AND blende."code" = 'HPK2002';
