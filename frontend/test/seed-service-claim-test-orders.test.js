const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildClaimsTestContractNumber,
  buildOrderItemData,
  calculateOrderTotal,
} = require("../scripts/seed-service-claim-test-orders.js");

test("builds a stable 222 contract number from the kitchen code", () => {
  assert.equal(
    buildClaimsTestContractNumber({ kitchenCode: "105 845", slug: "ab-105845" }),
    "222105845",
  );
});

test("falls back to numeric characters in the slug", () => {
  assert.equal(
    buildClaimsTestContractNumber({ kitchenCode: null, slug: "burger-103898" }),
    "222103898",
  );
});

test("refuses to create a contract number when a kitchen has no numeric code", () => {
  assert.throws(
    () => buildClaimsTestContractNumber({ id: "kitchen-1", slug: "demo-kitchen" }),
    /Cannot build a 222 contract number/,
  );
});

test("copies every order-item snapshot field used by Claims", () => {
  const item = {
    id: "item-1",
    itemType: "COMPONENT",
    code: "CAB-001",
    name: "Cabinet",
    nameDe: "Schrank",
    articleNumber: "US60",
    price: "123.45",
  };

  assert.deepEqual(buildOrderItemData("order-1", item), {
    orderId: "order-1",
    kitchenItemId: "item-1",
    itemType: "COMPONENT",
    code: "CAB-001",
    nameSnapshot: "Cabinet",
    nameDeSnapshot: "Schrank",
    articleNumberSnapshot: "US60",
    priceSnapshot: "123.45",
    quantity: 1,
  });
});

test("calculates the complete active-item order total", () => {
  assert.equal(calculateOrderTotal([
    { price: "123.45" },
    { price: "10.00" },
    { price: null },
  ]), "133.45");
});
