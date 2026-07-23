import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductInformation } from "../lib/product-information.js";

test("catalog Product Information overrides duplicated KitchenItem data", () => {
  const resolved = resolveProductInformation({
    catalogArticleId: "catalog-fridge",
    productInfoPdfPath: "/product-info/old-fridge.pdf",
    productInfoSummary: "Old kitchen item summary",
    productInfoKeyFacts: ["Model: Old"],
    catalogArticle: {
      productInfoPdfPath: "/product-info/kgcn-388-140-e.pdf",
      productInfoSummary: "KGCN 388 140 E",
      productInfoKeyFacts: ["Model: KGCN 388 140 E"],
      productInfoExtractedText: "Confirmed catalog text",
    },
  });

  assert.equal(resolved.source, "catalog");
  assert.equal(resolved.productInfoPdfPath, "/product-info/kgcn-388-140-e.pdf");
  assert.equal(resolved.productInfoSummary, "KGCN 388 140 E");
  assert.deepEqual(resolved.productInfoKeyFacts, ["Model: KGCN 388 140 E"]);
  assert.equal(resolved.productInfoExtractedText, "Confirmed catalog text");
});

test("unlinked items retain their KitchenItem Product Information fallback", () => {
  const resolved = resolveProductInformation({
    productInfoPdfPath: "/product-info/legacy.pdf",
    productInfoSummary: "Legacy included product",
    productInfoKeyFacts: ["Energy class: A"],
  });

  assert.equal(resolved.source, "kitchen-item");
  assert.equal(resolved.productInfoPdfPath, "/product-info/legacy.pdf");
  assert.deepEqual(resolved.productInfoKeyFacts, ["Energy class: A"]);
});

test("claim products provide combined Product Information for the default oven and cooktop", () => {
  const resolved = resolveProductInformation({
    code: "OVEN-B-600-HOB",
    productInfoPdfPath: "/legacy/combined.pdf",
    claimProducts: [
      {
        partKey: "cooktop",
        sortOrder: 50,
        productInfoPdfPath: "/product-info/cooktop.pdf",
        productInfoSummary: "Cooktop summary",
        productInfoKeyFacts: ["Cooktop: 4 zones"],
        productInfoExtractedText: "Cooktop text",
      },
      {
        partKey: "oven",
        sortOrder: 40,
        productInfoPdfPath: "/product-info/oven.pdf",
        productInfoSummary: "Oven summary",
        productInfoKeyFacts: ["Oven: class A"],
        productInfoExtractedText: "Oven text",
      },
    ],
  });

  assert.equal(resolved.source, "claim-products");
  assert.equal(resolved.productInfoPdfPath, "/product-info/oven.pdf");
  assert.equal(resolved.productInfoSummary, "Oven summary\n\nCooktop summary");
  assert.deepEqual(resolved.productInfoKeyFacts, ["Oven: class A", "Cooktop: 4 zones"]);
  assert.equal(resolved.productInfoExtractedText, "Oven text\n\n---\n\nCooktop text");
});
