-- AB 109874: UPEF65 is part of the delivered kitchen, not part of the
-- optional US60 purchase. Keep all dashboard-managed prices and other
-- commercial fields unchanged while detaching only the filler relationship.

UPDATE "KitchenItem" AS item
SET
  "blendeCode" = NULL,
  "blendeLabel" = NULL,
  "blendePrice" = NULL,
  "catalogBlendeId" = NULL,
  "catalogBlendeQuantity" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109874'
  AND item."code" = 'CAB-BASE-AB109874-US60-UPEF65';

-- Insert only when missing. ON CONFLICT DO NOTHING intentionally preserves
-- every later manual dashboard edit if this migration is ever replayed.
INSERT INTO "KitchenItem" (
  "id", "kitchenId", "itemType", "code", "articleNumber", "name", "nameDe",
  "price", "widthMm", "heightMm", "depthMm", "infoText", "iconKey",
  "colorKey", "componentKey", "isLocked", "isActive", "sortOrder",
  "catalogLinkStatus", "catalogPriceSyncMode", "updatedAt"
)
SELECT
  CONCAT('default-corner-blende-', kitchen."id"),
  kitchen."id",
  'COMPONENT'::"ItemType",
  'BLENDE-AB109874-UPEF65-DEFAULT',
  'UPEF65',
  'Corner Filler Panel',
  'Eckpassblende',
  0,
  650,
  878,
  20,
  'Included UPEF65 corner filler panel',
  'blende',
  '#f0a500',
  'corner-blende',
  true,
  true,
  65,
  'UNMATCHED',
  'LOCKED_INCLUDED',
  CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE kitchen."slug" = 'ab-109874'
ON CONFLICT ("kitchenId", "code") DO NOTHING;
