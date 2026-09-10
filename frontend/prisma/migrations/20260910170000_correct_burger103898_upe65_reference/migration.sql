-- Burger 103898 uses the Burger-Cindy UPE65 corner filler (79 EUR).
-- Keep this correction scoped to the one Burger kitchen item so Fragmento
-- kitchens that correctly use UPEF65 remain unchanged.
UPDATE "KitchenItem" AS item
SET
  "articleNumber" = 'US60 + UPE65',
  "blendeCode" = upe65."code",
  "blendeLabel" = COALESCE(upe65."nameDe", upe65."name", 'UPE65 Corner filler panel'),
  "blendePrice" = upe65."price",
  "catalogBlendeId" = upe65."id",
  "catalogBlendeQuantity" = 1,
  "catalogLinkStatus" = 'MATCHED',
  "updatedAt" = NOW()
FROM "Kitchen" AS kitchen, "CatalogBlende" AS upe65
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'burger-103898'
  AND item."code" = 'CAB-BASE-BURGER103898-US60-UPE65'
  AND upe65."code" = 'UPE65';
