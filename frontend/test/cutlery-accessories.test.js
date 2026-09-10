import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailableCutleryVariantsForComponents,
  isCutleryInsertCompatibleCabinet,
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
      { articleNumber: "ZB90SG", widthCm: 90, maxQuantity: 1 },
      { articleNumber: "ZB60SG", widthCm: 60, maxQuantity: 1 },
    ],
  );
});

test("legacy drawer metadata remains compatible and controls maximum quantity", () => {
  const available = getAvailableCutleryVariantsForComponents([
    { code: "CAB-BASE-DEFAULT-1", articleNumber: "DEFAULT", widthMm: 450, iconKey: "drawer_base_two", componentKey: "base-module-1", name: "Lower Cabinet with Drawer 45 cm" },
    { code: "CAB-BASE-DEFAULT-2", articleNumber: "DEFAULT", widthMm: 450, iconKey: "drawer_base_two", componentKey: "base-module-2", name: "Lower Cabinet with Drawer 45 cm" },
  ]);

  assert.deepEqual(
    available.map(({ articleNumber, widthCm, maxQuantity }) => ({ articleNumber, widthCm, maxQuantity })),
    [{ articleNumber: "ZB45SG", widthCm: 45, maxQuantity: 2 }],
  );
});

test("AB 109873 offers one 90 cm insert for its single commercial US90 cabinet", () => {
  const available = getAvailableCutleryVariantsForComponents([
    { code: "SINK-BASE-AB109873-SP120", articleNumber: "SP120", widthMm: 1200, iconKey: "sink_base", componentKey: "sink-base", name: "Sink Base Cabinet 120 cm" },
    { code: "DISH-AB109873-600", widthMm: 600, iconKey: "dishwasher_base", componentKey: "dishwasher-base", name: "Dishwasher 60 cm" },
    { code: "OVEN-B-600-HOB", widthMm: 600, iconKey: "oven_base", componentKey: "oven-module", name: "Built-in oven and induction hob" },
    { code: "CAB-BASE-AB109873-US90", articleNumber: "US90", widthMm: 900, iconKey: "drawer_base_two", componentKey: "base-module-2", name: "Lower Cabinet with Drawer 90 cm" },
  ]);

  assert.deepEqual(
    available.map(({ articleNumber, widthCm, maxQuantity }) => ({ articleNumber, widthCm, maxQuantity })),
    [{ articleNumber: "ZB90SG", widthCm: 90, maxQuantity: 1 }],
  );
});
