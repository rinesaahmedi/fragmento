DELETE FROM "OrderItem"
WHERE "orderId" IN (
  SELECT orders."id"
  FROM "Order" AS orders
  JOIN "Kitchen" AS kitchen ON kitchen."id" = orders."kitchenId"
  WHERE kitchen."slug" = 'fragmento-default'
);

DELETE FROM "Order"
WHERE "kitchenId" IN (
  SELECT "id"
  FROM "Kitchen"
  WHERE "slug" = 'fragmento-default'
);

DELETE FROM "Kitchen"
WHERE "slug" = 'fragmento-default';
