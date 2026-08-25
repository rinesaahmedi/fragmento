import assert from "node:assert/strict";
import test from "node:test";
import {
  getCatalogProgramDisplayName,
  sortCatalogPrograms,
} from "../lib/catalog-program-order.js";

test("catalog programs pin Impuls first and Burger second", () => {
  const sorted = sortCatalogPrograms([
    { programmId: "ZETA" },
    { programmId: "BURGER CINDY" },
    { programmId: "ALPHA" },
    { programmId: "IP 2200" },
  ]);

  assert.deepEqual(sorted.map((program) => program.programmId), [
    "IP 2200",
    "BURGER CINDY",
    "ALPHA",
    "ZETA",
  ]);
});

test("catalog programs show supplier names for the two pinned programs", () => {
  assert.equal(getCatalogProgramDisplayName({ programmId: "IP 2200", name: "IP 2200" }), "Impuls");
  assert.equal(getCatalogProgramDisplayName({ programmId: "BURGER CINDY", name: "BURGER CINDY" }), "Burger - Cindy Type");
});
