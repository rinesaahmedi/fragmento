import test from "node:test";
import assert from "node:assert/strict";

import { filterAdminKitchens, normalizeKitchenSearchQuery } from "../lib/admin-kitchen-search.js";

const kitchens = [
  { name: "105745", kitchenCode: "105 745", slug: "ab-105745", programmId: "IP 2200", description: "L-shaped kitchen" },
  { name: "Burger Cindy", kitchenCode: "103 898", slug: "burger-103898", programmId: "BURGER CINDY", description: "Burger catalog" },
  { name: "Test kitchen", kitchenCode: null, slug: "test-kitchen", programmId: "IP 2200", description: null },
];

test("kitchen search matches codes with or without spaces and punctuation", () => {
  assert.deepEqual(filterAdminKitchens(kitchens, "105745"), [kitchens[0]]);
  assert.deepEqual(filterAdminKitchens(kitchens, "AB 105745"), [kitchens[0]]);
  assert.deepEqual(filterAdminKitchens(kitchens, "103-898"), [kitchens[1]]);
});

test("kitchen search matches names, slugs, programs, and descriptions", () => {
  assert.deepEqual(filterAdminKitchens(kitchens, "burger cindy"), [kitchens[1]]);
  assert.deepEqual(filterAdminKitchens(kitchens, "test-kitchen"), [kitchens[2]]);
  assert.deepEqual(filterAdminKitchens(kitchens, "L-shaped"), [kitchens[0]]);
  assert.equal(filterAdminKitchens(kitchens, "IP 2200").length, 2);
});

test("kitchen search safely normalizes URL parameters and empty queries", () => {
  assert.equal(normalizeKitchenSearchQuery([" 105745 ", "ignored"]), "105745");
  assert.equal(normalizeKitchenSearchQuery(undefined), "");
  assert.equal(filterAdminKitchens(kitchens, "").length, kitchens.length);
});
