import assert from "node:assert/strict";
import test from "node:test";
import { iconKind } from "../lib/service-claim-part-icon-kind.js";

test("a dishwasher filler uses the panel icon in both languages", () => {
  for (const name of ["Filler Panel up to 20 cm", "Passblende bis 20 cm"]) {
    assert.equal(iconKind({ claimPartKey: "blende", componentId: "component-claim-blende-dishwasher-base", sourceComponentKey: "dishwasher-base", name }), "panel");
  }
});

test("dishwasher and furniture front retain their own icons", () => {
  assert.equal(iconKind({claimPartKey:"dishwasher",sourceComponentKey:"dishwasher-base"}), "dishwasher");
  assert.equal(iconKind({claimPartKey:"furniture-front",sourceComponentKey:"dishwasher-base"}), "front");
});
