UPDATE "KitchenItem" AS item
SET
  "blendeCode" = blende."code",
  "blendeLabel" = COALESCE(blende."nameDe", blende."name"),
  "blendePrice" = blende."price",
  "updatedAt" = NOW()
FROM "CatalogBlende" AS blende
WHERE item."catalogBlendeId" = blende."id";
