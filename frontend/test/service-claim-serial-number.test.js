import assert from "node:assert/strict";
import test from "node:test";
import {
  countElectricalApplianceProblemAreas,
  isElectricalApplianceProblemArea,
} from "../lib/service-claim-serial-number.js";

test("serial numbers are required only for selected electrical appliances", () => {
  const areas = [
    { componentId: "component-wall-cabinet-1", code: "CAB-WALL-B-L-600", name: "Wall Cabinet" },
    { componentId: "component-claim-blende-base-module-2", claimPartKey: "blende", code: "UPK20", name: "Filler Panel" },
    { componentId: "component-claim-filter", claimPartKey: "filter", name: "Extractor Hood Filter" },
    { componentId: "component-claim-furniture-front", claimPartKey: "furniture-front", name: "Furniture Front (Dishwasher)" },
    { componentId: "component-claim-oven", claimPartKey: "oven", code: "EH92364E-A", name: "Built-in Oven" },
    { componentId: "component-extractor-hood", code: "HOOD-B-FH664621E", name: "Extractor Hood" },
  ];

  assert.equal(countElectricalApplianceProblemAreas(areas), 2);
  assert.equal(isElectricalApplianceProblemArea(areas[0]), false);
  assert.equal(isElectricalApplianceProblemArea(areas[1]), false);
  assert.equal(isElectricalApplianceProblemArea(areas[2]), false);
  assert.equal(isElectricalApplianceProblemArea(areas[3]), false);
  assert.equal(isElectricalApplianceProblemArea(areas[4]), true);
  assert.equal(isElectricalApplianceProblemArea(areas[5]), true);
});

test("legacy appliance components are recognized without treating their cabinets as appliances", () => {
  assert.equal(isElectricalApplianceProblemArea({ componentId: "component-base-module-1", code: "WM-B-EWA34660W" }), true);
  assert.equal(isElectricalApplianceProblemArea({ componentId: "component-refrigerator", code: "REF-B-545-1800-700" }), true);
  assert.equal(isElectricalApplianceProblemArea({ componentId: "component-oven-module", code: "OVEN-B-600-HOB" }), true);
  assert.equal(isElectricalApplianceProblemArea({ componentId: "component-wall-cabinet-2", code: "CAB-HOOD-B-600", name: "Cabinet" }), false);
  assert.equal(isElectricalApplianceProblemArea({ componentId: "component-claim-oven-drawer", name: "Lower Cabinet for Built-in Oven" }), false);
});

test("the claim form and API require exactly one serial-number source per electrical appliance", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const flowSource = fs.readFileSync(path.join(testDir, "..", "components", "service-claim-flow.js"), "utf8");
  const routeSource = fs.readFileSync(path.join(testDir, "..", "app", "api", "service-claims", "route.js"), "utf8");

  assert.match(flowSource, /hasMissingProblemAreaSerialEvidence/);
  assert.match(flowSource, /data-problem-area-serial-required/);
  assert.match(flowSource, /serialNumberByComponentId/);
  assert.match(flowSource, /serialNumberImageByComponentId/);
  assert.match(flowSource, /formData\.append\(`serialNumberImage:\$\{area\.rowComponentId\}`/);
  assert.match(routeSource, /serialNumberImageFilesByComponentId/);
  assert.match(routeSource, /hasInvalidPerAreaSerialEvidence/);
  assert.match(routeSource, /typedCount \+ imageCount !== 1/);
  assert.match(routeSource, /exactly one serial number or one serial-number photo for each/);
});
