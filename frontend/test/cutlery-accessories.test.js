import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailableCutleryVariantsForComponents,
  isCutleryInsertCompatibleCabinet,
  normalizeCutleryLines,
  MAX_CUTLERY_QUANTITY,
  normalizeCutleryQuantity,
} from "../lib/cutlery-accessories.js";

test("cutlery inserts require a drawer-capable lower cabinet", () => {
  const incompatibleItems = [
    { code: "CAB-BASE-PLAIN-600", articleNumber: "U60", widthMm: 600, iconKey: "base_cabinet_plain", componentKey: "base-module-1", name: "Lower Cabinet 60 cm" },
    { code: "SINK-BASE-TEST-600", articleNumber: "SP60", widthMm: 600, iconKey: "drawer_base_two", componentKey: "sink-base", name: "Sink Base Cabinet 60 cm" },
    { code: "DISH-TEST-600", widthMm: 600, iconKey: "dishwasher_base", componentKey: "dishwasher-base", name: "Dishwasher 60 cm" },
    { code: "OVEN-TEST-600", widthMm: 600, iconKey: "drawer_base_two", componentKey: "oven-module", name: "Oven cabinet 60 cm" },
    { code: "CAB-WALL-TEST-US60", articleNumber: "US60", widthMm: 600, iconKey: "wall_cabinet_plain", componentKey: "wall-cabinet-1", name: "Upper Cabinet 60 cm" },
  ];

  incompatibleItems.forEach((item) => assert.equal(isCutleryInsertCompatibleCabinet(item), false));
  assert.deepEqual(getAvailableCutleryVariantsForComponents(incompatibleItems), []);
});

test("supplier US and US2A drawer cabinets expose their matching insert widths", () => {
  const available = getAvailableCutleryVariantsForComponents([
    { code: "CAB-BASE-TEST-US90", articleNumber: "US90", widthMm: 900, iconKey: "drawer_base_two", componentKey: "base-module-1", name: "Lower Cabinet with Drawer 90 cm" },
    { code: "CAB-BASE-TEST-US2A60", articleNumber: "US2A60", widthMm: 600, iconKey: "drawer_base_three", componentKey: "base-module-2", name: "Lower Cabinet with 3 Drawers 60 cm" },
  ]);

  assert.deepEqual(
    available.map(({ articleNumber, widthCm, maxQuantity }) => ({ articleNumber, widthCm, maxQuantity })),
    [
      { articleNumber: "ZB90SG", widthCm: 90, maxQuantity: MAX_CUTLERY_QUANTITY },
      { articleNumber: "ZB60SG", widthCm: 60, maxQuantity: MAX_CUTLERY_QUANTITY },
    ],
  );
});

test("legacy drawer metadata controls widths without limiting purchase quantity", () => {
  const available = getAvailableCutleryVariantsForComponents([
    { code: "CAB-BASE-DEFAULT-1", articleNumber: "DEFAULT", widthMm: 450, iconKey: "drawer_base_two", componentKey: "base-module-1", name: "Lower Cabinet with Drawer 45 cm" },
    { code: "CAB-BASE-DEFAULT-2", articleNumber: "DEFAULT", widthMm: 450, iconKey: "drawer_base_two", componentKey: "base-module-2", name: "Lower Cabinet with Drawer 45 cm" },
  ]);

  assert.deepEqual(
    available.map(({ articleNumber, widthCm, maxQuantity }) => ({ articleNumber, widthCm, maxQuantity })),
    [{ articleNumber: "ZB45SG", widthCm: 45, maxQuantity: MAX_CUTLERY_QUANTITY }],
  );
});

test("AB 105759 offers catalog-priced 45 cm inserts for both drawer variants", () => {
  for (const articleNumber of ["US90", "US2A90"]) {
    const available = getAvailableCutleryVariantsForComponents([
      { code: "CAB-BASE-AB105759-US40", articleNumber: "US40", widthMm: 400, iconKey: "drawer_base_two", componentKey: "base-module-1" },
      { code: "CAB-BASE-AB105759-US30", articleNumber: "US30", widthMm: 300, iconKey: "drawer_base_two", componentKey: "base-module-2" },
      { code: "CAB-BASE-AB105759-US90-UPK20", articleNumber, widthMm: 900, iconKey: articleNumber === "US90" ? "drawer_base_two" : "drawer_base_three", componentKey: "drawer-module" },
    ], [
      { articleNumber: "ZB30SG", widthCm: 30, price: 19 },
      { articleNumber: "ZB40SG", widthCm: 40, price: 19 },
      { articleNumber: "ZB45SG", widthCm: 45, price: 24, catalogArticleId: "catalog-45" },
      { articleNumber: "ZB90SG", widthCm: 90, price: 31 },
    ]);
    assert.deepEqual(available.map(({ articleNumber, maxQuantity }) => ({ articleNumber, maxQuantity })), [
      { articleNumber: "ZB45SG", maxQuantity: MAX_CUTLERY_QUANTITY },
      { articleNumber: "ZB40SG", maxQuantity: MAX_CUTLERY_QUANTITY },
      { articleNumber: "ZB30SG", maxQuantity: MAX_CUTLERY_QUANTITY },
    ]);
    assert.equal(available[0].price, 24);
    assert.equal(available[0].catalogArticleId, "catalog-45");
    assert.deepEqual(normalizeCutleryLines([
      { articleNumber: "ZB90SG", quantity: 1 },
      { articleNumber: "ZB45SG", quantity: 3 },
    ], available), [{ id: "cutlery-ZB45SG", articleNumber: "ZB45SG", quantity: 3 }]);
  }
});

test("AB 109873 offers 45 cm inserts for its split US90 drawers without a cabinet-count limit", () => {
  const available = getAvailableCutleryVariantsForComponents([
    { code: "SINK-BASE-AB109873-SP120", articleNumber: "SP120", widthMm: 1200, iconKey: "sink_base", componentKey: "sink-base", name: "Sink Base Cabinet 120 cm" },
    { code: "DISH-AB109873-600", widthMm: 600, iconKey: "dishwasher_base", componentKey: "dishwasher-base", name: "Dishwasher 60 cm" },
    { code: "OVEN-B-600-HOB", widthMm: 600, iconKey: "oven_base", componentKey: "oven-module", name: "Built-in oven and induction hob" },
    { code: "CAB-BASE-AB109873-US90", articleNumber: "US90", widthMm: 900, iconKey: "drawer_base_two", componentKey: "base-module-2", name: "Lower Cabinet with Drawer 90 cm" },
  ]);

  assert.deepEqual(
    available.map(({ articleNumber, widthCm, maxQuantity }) => ({ articleNumber, widthCm, maxQuantity })),
    [{ articleNumber: "ZB45SG", widthCm: 45, maxQuantity: MAX_CUTLERY_QUANTITY }],
  );
});

test("one 50 cm drawer cabinet supports purchases above 99 and preserves them after cabinet changes", () => {
  const cabinet = { code: "CAB-BASE-TEST-US50", articleNumber: "US50", widthMm: 500, iconKey: "drawer_base_two", componentKey: "base-module-1" };
  const variants = getAvailableCutleryVariantsForComponents([cabinet]);
  const lines = normalizeCutleryLines([
    { articleNumber: "ZB50SG", quantity: 150 },
    { articleNumber: "ZB50SG", quantity: 25 },
    { articleNumber: "ZB60SG", quantity: 10 },
  ], variants);
  assert.deepEqual(lines, [{ id: "cutlery-ZB50SG", articleNumber: "ZB50SG", quantity: 175 }]);
  assert.deepEqual(normalizeCutleryLines(lines, getAvailableCutleryVariantsForComponents([cabinet, { ...cabinet, code: "CAB-BASE-TEST-US50-2" }])), lines);
  assert.deepEqual(normalizeCutleryLines(lines, getAvailableCutleryVariantsForComponents([])), []);
});

test("cutlery quantities remain positive integers that fit database storage", () => {
  assert.equal(normalizeCutleryQuantity(150), 150);
  assert.equal(normalizeCutleryQuantity(2.9), 2);
  assert.equal(normalizeCutleryQuantity(0), 1);
  assert.equal(normalizeCutleryQuantity(-5), 1);
  assert.equal(normalizeCutleryQuantity("invalid"), 1);
  assert.equal(normalizeCutleryQuantity(Infinity), 1);
  assert.equal(normalizeCutleryQuantity(Number.MAX_SAFE_INTEGER), MAX_CUTLERY_QUANTITY);
});
