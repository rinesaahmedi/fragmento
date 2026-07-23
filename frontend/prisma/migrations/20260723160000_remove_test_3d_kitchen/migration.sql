-- TEST 3D was a local preview kitchen and must not exist in deployed data.
-- Remove dependent orders explicitly because their kitchen relation is restrictive.
DELETE FROM "Order"
WHERE "kitchenId" IN (
  SELECT "id"
  FROM "Kitchen"
  WHERE "slug" = 'test-3d-kitchen'
);

DELETE FROM "TestOrder"
WHERE "kitchenId" IN (
  SELECT "id"
  FROM "Kitchen"
  WHERE "slug" = 'test-3d-kitchen'
);

-- KitchenItems, KitchenClaimParts and KitchenContracts cascade from Kitchen.
DELETE FROM "Kitchen"
WHERE "slug" = 'test-3d-kitchen';
