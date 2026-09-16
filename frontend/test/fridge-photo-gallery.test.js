import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCatalogDisplayItem, getProductImagePaths } from "../components/kitchen-selection-utils.js";

const uploadedPhotoHashes = [
  "23cdfe82ccc1139376ec0acf69d9698ca4ccd8a0b221efe5f8cf930adf68d668",
  "2edf603adc830e372fed502a083b6f07ebe36765ea11275797fba6c39d166836",
  "bb6dc600019f880930ad5232321b41484dc673f27a77dc878aa73aff38c5e26c",
  "27d5b2ad339f8add0520ab2762c54096e1fde42b5b6cca14f7110879d5259d9b",
  "a4792a9834e2a99956a94bf994782833f629a62d6e740551e83420c774afc198",
  "6526cbfa14008b1f13aeb72f023d2b4fef9155f0a4607f9370295611cc3dc85c",
  "517bdc5f25c3ecafc12a192b53cebec577ffc1533f67c3ac0a1ad9f8e0a634af",
];

test("105759 refrigerator Photo gallery contains the seven supplied images in order", () => {
  const fridge = {
    id: "fridge-105759",
    code: "REF-AB105759-KGCN388140E",
    articleNumber: "OL-KGCN388140E",
    catalogArticleId: "catalog-fridge",
    componentKey: "refrigerator",
    name: "Freestanding Refrigerator 181 cm",
  };
  const display = getCatalogDisplayItem([fridge], "ab-105759", fridge);
  const gallery = getProductImagePaths(display.item);
  assert.equal(gallery.length, 7);
  gallery.forEach((path, index) => {
    const file = new URL(`../public${path.split("?")[0]}`, import.meta.url);
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(hash, uploadedPhotoHashes[index]);
  });
});

test("catalog article lookup provides the same fridge gallery for new kitchen codes", () => {
  const expected = getProductImagePaths({ code: "REF-AB105759-KGCN388140E" });
  assert.deepEqual(getProductImagePaths({ code: "NEW-FRIDGE", articleNumber: "OL-KGCN388140E" }), expected);
  assert.deepEqual(getProductImagePaths({ catalogArticle: { articleNumber: "OL-KGCN388140E" } }), expected);
  assert.deepEqual(getProductImagePaths({ articleNumber: "OTHER", productImagePath: "/other.jpg" }), ["/other.jpg"]);
  assert.deepEqual(getProductImagePaths({ articleNumber: "OL-KGCN388140E", productImagePaths: ["/custom.jpg"] }), ["/custom.jpg"]);
});
