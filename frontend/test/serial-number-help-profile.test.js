import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { getSerialNumberHelpImages, SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE, SERIAL_NUMBER_HELP_APPLIANCES } from "../lib/serial-number-help.js";

test("registered photos exist beneath their own brand/appliance folder", () => {
  const folders = { dishwasher: "dishwasher", extractor_hood: "extractor-hood", fridge: "fridge", oven: "oven", hob: "cooktop", washing_machine: "washing-machine" };
  assert.deepEqual(Object.keys(SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE), ["amica", "bosch", "aeg"]);
  for (const [brand, appliances] of Object.entries(SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE)) {
    for (const [type, folder] of Object.entries(folders)) {
      assert.ok(Array.isArray(appliances[type]));
      assert.ok(fs.statSync(new URL(`../public/serial%20nr%20img/${brand}/${folder}/`, import.meta.url)).isDirectory());
      for (const photo of appliances[type]) {
        assert.ok(photo.src.startsWith(`/serial%20nr%20img/${brand}/${folder}/`));
        assert.ok(fs.statSync(new URL(`../public${photo.src}`, import.meta.url)).isFile());
      }
    }
  }
  assert.equal(SERIAL_NUMBER_HELP_APPLIANCES.some((entry) => entry.type === "washing_machine"), false);
});

test("every returned default Amica photo exists", () => {
  for (const type of ["dishwasher", "fridge", "oven", "hob", "extractor_hood"]) {
    const images = getSerialNumberHelpImages({ claimPartKey: type });
    assert.ok(images.length > 0, `${type} must have an Amica default photo`);
    for (const photo of images) {
      assert.match(photo.src, /^\/serial%20nr%20img\/amica\//);
      assert.ok(fs.statSync(new URL(`../public${photo.src}`, import.meta.url)).isFile());
    }
  }

  for (const photo of getSerialNumberHelpImages(null)) {
    assert.ok(fs.statSync(new URL(`../public${photo.src}`, import.meta.url)).isFile());
  }
});

test("an installed appliance without a selected brand defaults to Amica", () => {
  for (const type of ["dishwasher", "fridge", "oven", "hob", "extractor_hood"]) {
    const images = getSerialNumberHelpImages(
      { claimPartKey: type },
      [{ applianceType: type, brand: null }],
    );
    assert.ok(images.length > 0);
    assert.ok(images.every((photo) => photo.src.includes("/amica/")));
  }
});

test("supplied BOSCH and AEG photos are registered by appliance type", () => {
  for (const type of ["dishwasher", "extractor_hood", "fridge", "oven"]) {
    assert.ok(SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.bosch[type].length > 0);
  }
  for (const type of ["dishwasher", "fridge", "oven"]) {
    assert.ok(SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.aeg[type].length > 0);
  }
});

test("choosing a brand selects only that brand's photo for each appliance", () => {
  // Simulate the future supplied BOSCH/AEG/cooktop photo sets without inventing
  // or publishing manufacturer images in the actual registry.
  for (const brand of ["amica", "bosch", "aeg"]) {
    for (const type of ["dishwasher", "extractor_hood", "fridge", "oven", "hob"]) {
      const original = SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE[brand][type];
      const expected = [{ src: `/test/${brand}/${type}.png` }];
      SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE[brand][type] = expected;
      try {
        const images = getSerialNumberHelpImages(
          { claimPartKey: type === "hob" ? "cooktop" : type, name: "Old Amica product" },
          [{ applianceType: type, brand, sharesOvenSerial: false }],
        );
        assert.deepEqual(images, expected);
      } finally {
        SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE[brand][type] = original;
      }
    }
  }
});

test("a dedicated cooktop photo takes precedence over a shared oven photo", () => {
  const original = SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.amica.hob;
  SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.amica.hob = [{ src: "/test/amica/cooktop.png" }];
  try {
    assert.deepEqual(getSerialNumberHelpImages({ claimPartKey: "hob" }, [
      { applianceType: "hob", brand: "amica", sharesOvenSerial: true },
    ]), SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.amica.hob);
  } finally {
    SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.amica.hob = original;
  }
});

test("freezer uses its selected brand's fridge photo set", () => {
  assert.deepEqual(getSerialNumberHelpImages({ claimPartKey: "freezer" }, [
    { applianceType: "fridge", brand: "amica" },
  ]), SERIAL_NUMBER_HELP_IMAGES_BY_PROFILE.amica.fridge);
});

test("contract appliance brand selects the matching type-specific photo set", () => {
  const images = getSerialNumberHelpImages(
    { claimPartKey: "fridge" },
    [{ applianceType: "fridge", brand: "amica" }],
  );

  assert.equal(images.length, 1);
  assert.match(images[0].src, /Amica%20fridge/);
});

test("a configured brand never falls back to another manufacturer's photos", () => {
  const images = getSerialNumberHelpImages(
    { claimPartKey: "hob" },
    [{ applianceType: "hob", brand: "bosch" }],
  );

  assert.deepEqual(images, []);
});

test("legacy contracts without appliance configuration keep existing help photos", () => {
  const images = getSerialNumberHelpImages({ claimPartKey: "dishwasher" });
  assert.equal(images.length, 1);
  assert.match(images[0].src, /Amica%20dishwasher/);
});
