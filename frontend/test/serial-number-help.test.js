import assert from "node:assert/strict";
import test from "node:test";
import {
  getSerialNumberHelpApplianceType,
  getSerialNumberHelpImages,
  SERIAL_NUMBER_HELP_APPLIANCES,
} from "../lib/serial-number-help.js";

test("ASC serial-number help exposes an ordered appliance chooser", () => {
  assert.deepEqual(SERIAL_NUMBER_HELP_APPLIANCES.map((entry) => entry.type), [
    "dishwasher",
    "fridge",
    "oven",
    "hob",
    "extractor_hood",
  ]);

  for (const appliance of SERIAL_NUMBER_HELP_APPLIANCES) {
    assert.ok(appliance.labelKey);
    assert.ok(getSerialNumberHelpImages({ claimPartKey: appliance.type }).length > 0);
  }
});

test("cooktop and hob use the dedicated Amica cooktop image", () => {
  const ovenImages = getSerialNumberHelpImages({ claimPartKey: "oven" });
  const hobImages = getSerialNumberHelpImages({ claimPartKey: "hob" });
  const cooktopImages = getSerialNumberHelpImages({ claimPartKey: "cooktop" });

  assert.notDeepEqual(hobImages, ovenImages);
  assert.deepEqual(cooktopImages, hobImages);
  assert.match(hobImages[0].src, /amica\/cooktop/);
});

test("ASC choices and FRG components resolve hood and hob help copy types", () => {
  assert.equal(getSerialNumberHelpApplianceType({ claimPartKey: "hob" }), "hob");
  assert.equal(getSerialNumberHelpApplianceType({ claimPartKey: "cooktop" }), "hob");
  assert.equal(
    getSerialNumberHelpApplianceType({ componentId: "component-claim-cooktop" }),
    "hob",
  );
  assert.equal(
    getSerialNumberHelpApplianceType({ componentId: "component-extractor-hood" }),
    "extractor_hood",
  );
});

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
  const extractorHoodImages = getSerialNumberHelpImages({
    componentId: "component-extractor-hood",
    resolvedLabel: "Extractor Hood",
    articleCode: "FH664621E",
  });

  assert.deepEqual(ovenImages.map((entry) => entry.src), [
    "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png",
  ]);
  assert.deepEqual(dishwasherImages.map((entry) => entry.src), [
    "/serial%20nr%20img/amica/dishwasher/Amica%20dishwasher%20ARROW.png",
  ]);
  assert.deepEqual(fridgeImages.map((entry) => entry.src), [
    "/serial%20nr%20img/amica/fridge/Amica%20fridge%20ARROW.png",
  ]);
  assert.deepEqual(extractorHoodImages.map((entry) => entry.src), [
    "/serial%20nr%20img/amica/extractor-hood/filter-location.jpeg",
    "/serial%20nr%20img/amica/extractor-hood/rating-plate.jpeg",
  ]);
});

test("serial-number help falls back to both generic examples for unknown products", () => {
  assert.deepEqual(getSerialNumberHelpImages({ resolvedLabel: "Electrical appliance" }), [
    { src: "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png", altKey: "serialNumberHelpAlt1" },
    { src: "/serial%20nr%20img/amica/fridge/Amica%20fridge%20ARROW.png", altKey: "serialNumberHelpAlt2" },
  ]);
});

test("serial-number help handles an unselected product", () => {
  assert.deepEqual(getSerialNumberHelpImages(null), [
    { src: "/serial%20nr%20img/amica/oven/Amica%20oven%20ARROW.png", altKey: "serialNumberHelpAlt1" },
    { src: "/serial%20nr%20img/amica/fridge/Amica%20fridge%20ARROW.png", altKey: "serialNumberHelpAlt2" },
  ]);
});
