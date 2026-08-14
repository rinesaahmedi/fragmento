import assert from "node:assert/strict";
import test from "node:test";
import {
  getItemBlendeTotal,
  getItemPriceWithoutBlende,
  itemRequiresBlendeConfirmation,
} from "../components/kitchen-selection-utils.js";

test("itemRequiresBlendeConfirmation detects blende metadata", () => {
  assert.equal(itemRequiresBlendeConfirmation({ blendeCode: "UPEF65" }), true);
  assert.equal(itemRequiresBlendeConfirmation({ catalogBlendeId: "abc" }), true);
  assert.equal(itemRequiresBlendeConfirmation({ blendeLabel: "Corner filler panel" }), true);
  assert.equal(itemRequiresBlendeConfirmation({ articleNumber: "US60" }), false);
});

test("getItemBlendeTotal and cabinet-only price split the bundled amount", () => {
  const item = { price: 287, blendePrice: 68, blendeCode: "UPEF65" };
  assert.equal(getItemBlendeTotal(item), 68);
  assert.equal(getItemPriceWithoutBlende(item), 219);

  const catalogLinked = {
    price: 287,
    blendePrice: 68,
    catalogBlendeId: "blende-1",
    catalogBlendeQuantity: 1,
  };
  assert.equal(getItemBlendeTotal(catalogLinked), 68);
  assert.equal(getItemBlendeTotal({ ...catalogLinked, catalogBlendeQuantity: 2, price: 355 }), 136);

  assert.equal(getItemBlendeTotal({ price: 219 }), 0);
  assert.equal(getItemPriceWithoutBlende({ price: 219 }), 219);
});
