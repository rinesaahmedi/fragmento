-- AB 105758 has only the dishwasher corner filler (UPEF65).
-- The locked sink cabinet does not include or charge an UPK20 filler panel.
UPDATE "KitchenItem"
SET
  "blendeCode" = NULL,
  "blendeLabel" = NULL,
  "blendePrice" = NULL,
  "catalogBlendeId" = NULL,
  "catalogBlendeQuantity" = NULL,
  "catalogLinkStatus" = NULL
WHERE "code" = 'CAB-SINK-AB105758-DEFAULT'
  AND "kitchenId" IN (
    SELECT "id"
    FROM "Kitchen"
    WHERE "slug" = 'ab-105758'
  );
