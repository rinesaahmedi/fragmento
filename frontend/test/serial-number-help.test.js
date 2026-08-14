import assert from "node:assert/strict";
import test from "node:test";
import { getSerialNumberHelpImages } from "../lib/serial-number-help.js";

test("serial-number help images are separated by appliance type", () => {
  const ovenImages = getSerialNumberHelpImages({
    componentId: "component-claim-oven",
    claimPartKey: "oven",
    resolvedLabel: "Built-in Oven",
    articleCode: "EH92364E-A",
  });
  const dishwasherImages = getSerialNumberHelpImages({
    componentId: "component-claim-dishwasher",
    claimPartKey: "dishwasher",
    resolvedLabel: "Dishwasher",
    articleCode: "A-EGSPV597210",
  });
  const fridgeImages = getSerialNumberHelpImages({
    componentId: "component-refrigerator",
    resolvedLabel: "Fridge-freezer",
    articleCode: "OL-KGCN388140E",
  });

  assert.deepEqual(ovenImages.map((entry) => entry.src), [
    "/serial%20nr%20img/oven/Amica%20oven%20ARROW.png",
  ]);
  assert.deepEqual(dishwasherImages.map((entry) => entry.src), [
    "/serial%20nr%20img/dishwasher/Amica%20dishwasher%20ARROW.png",
  ]);
  assert.deepEqual(fridgeImages.map((entry) => entry.src), [
    "/serial%20nr%20img/fridge/Amica%20fridge%20ARROW.png",
  ]);
});

test("serial-number help falls back to both generic examples for unknown products", () => {
  assert.deepEqual(getSerialNumberHelpImages({ resolvedLabel: "Electrical appliance" }), [
    { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
    { src: "/img/AMICA%20FRIDGE.webp", altKey: "serialNumberHelpAlt2" },
  ]);
});

test("serial-number help handles an unselected product", () => {
  assert.deepEqual(getSerialNumberHelpImages(null), [
    { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
    { src: "/img/AMICA%20FRIDGE.webp", altKey: "serialNumberHelpAlt2" },
  ]);
});
