import assert from "node:assert/strict";
import test from "node:test";
import {
  isLinkedComponentSelected,
  toggleLinkedComponentSelection,
} from "../components/kitchen-selection-utils.js";

const KITCHEN_SLUG = "ab-105747";
const HOOD_CABINET = "component-wall-cabinet-2";
const EXTRACTOR_HOOD = "component-extractor-hood";

test("a restored partial hood selection stays selected in both the plan and catalog", () => {
  const staleSelection = [HOOD_CABINET];

  assert.equal(isLinkedComponentSelected(KITCHEN_SLUG, staleSelection, HOOD_CABINET), true);
  assert.equal(isLinkedComponentSelected(KITCHEN_SLUG, staleSelection, EXTRACTOR_HOOD), true);
});

test("toggling a restored partial hood selection removes and restores the full linked group", () => {
  const removed = toggleLinkedComponentSelection(
    KITCHEN_SLUG,
    [HOOD_CABINET],
    HOOD_CABINET,
  );
  const restored = toggleLinkedComponentSelection(KITCHEN_SLUG, removed, HOOD_CABINET);

  assert.deepEqual(removed, []);
  assert.deepEqual(new Set(restored), new Set([HOOD_CABINET, EXTRACTOR_HOOD]));
});
