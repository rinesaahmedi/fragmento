-- The AB 105748 seed originally stored the hood's standalone article number.
-- The deployed catalog exposes this hood only as the fixed cabinet/filter package.
UPDATE "KitchenItem"
SET
  "articleNumber" = 'FH664621E + FWK124 + HD6002',
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = NULL
WHERE "code" = 'HOOD-AB105748-FH664621E';
