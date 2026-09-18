import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReferencePlanMarkerAppearance } from "../lib/reference-plan-marker-appearance.js";

test("marker appearance accepts ratios serialized by the form", () => {
  const appearance = { diameter: 24 / 360, fontSize: 10.24 / 360, borderWidth: 2 / 360 };
  assert.deepEqual(normalizeReferencePlanMarkerAppearance(JSON.stringify(appearance)), appearance);
});

test("missing or invalid appearance uses bounded proportional defaults", () => {
  const fallback = normalizeReferencePlanMarkerAppearance(undefined);
  for (const value of [
    null, "invalid", "null", "[]", {},
    { diameter: Infinity, fontSize: 0.02, borderWidth: 0.003 },
    { diameter: 400, fontSize: 0.02, borderWidth: 0.003 },
    { diameter: 0.04, fontSize: -1, borderWidth: 0.003 },
    { diameter: 0.04, fontSize: 0.02, borderWidth: 0.04 },
  ]) {
    assert.deepEqual(normalizeReferencePlanMarkerAppearance(value), fallback);
  }
  assert.equal(fallback.diameter, 0.04);
});
