import assert from "node:assert/strict";
import test from "node:test";
import { ItemType } from "@prisma/client";
import { verifyKitchenHotspotCoverage } from "../lib/kitchen-hotspot-verify.js";

test("verifyKitchenHotspotCoverage flags missing and overlapping hotspots", () => {
  const items = [
    { itemType: ItemType.COMPONENT, componentKey: "wall-cabinet-1", isActive: true },
    { itemType: ItemType.COMPONENT, componentKey: "base-module-1", isActive: true },
  ];

  const ok = verifyKitchenHotspotCoverage(items, [
    { componentKey: "wall-cabinet-1", left: 10, top: 10, width: 10, height: 20 },
    { componentKey: "base-module-1", left: 30, top: 50, width: 10, height: 20 },
  ]);
  assert.equal(ok.ok, true);

  const missing = verifyKitchenHotspotCoverage(items, [
    { componentKey: "wall-cabinet-1", left: 10, top: 10, width: 10, height: 20 },
  ]);
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(" "), /base-module-1/);

  const overlap = verifyKitchenHotspotCoverage(items, [
    { componentKey: "wall-cabinet-1", left: 10, top: 10, width: 20, height: 20 },
    { componentKey: "base-module-1", left: 12, top: 12, width: 20, height: 20 },
  ]);
  assert.equal(overlap.ok, false);
  assert.match(overlap.errors.join(" "), /overlap/i);
});
