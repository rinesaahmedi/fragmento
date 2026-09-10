-- AB 109955 schedule item 5 is the locked/default US60 cabinet between the
-- dishwasher and oven. Keep it included while assigning its catalog identity.

UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'US60',
  "name" = 'Lower Cabinet with Drawer 60 cm',
  "nameDe" = 'Unterschrank mit Schublade 60 cm',
  "price" = 0.00,
  "widthMm" = 600,
  "heightMm" = 878,
  "depthMm" = 600,
  "iconKey" = 'drawer_base_two',
  "infoText" = 'Included US60 lower cabinet with drawer',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "isLocked" = true,
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109955'
  AND item."code" = 'CAB-BASE-AB109955-DEFAULT'
  AND article."articleNumber" = 'US60';
