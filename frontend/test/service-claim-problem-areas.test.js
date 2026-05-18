import assert from "node:assert/strict";
import test from "node:test";
import {
  formatServiceClaimProblemAreaList,
  parseServiceClaimProblemAreas,
} from "../lib/service-claim-problem-areas.js";

test("parseServiceClaimProblemAreas normalizes selected kitchen parts", () => {
  const result = parseServiceClaimProblemAreas(JSON.stringify([
    {
      componentId: "wm-1",
      name: "Washing Machine (600 x 600 x 878 mm)",
      code: "WM-C-EWA34660W",
    },
  ]));

  assert.deepEqual(result, [
    {
      componentId: "wm-1",
      name: "Washing Machine",
      code: "WM-C-EWA34660W",
    },
  ]);
});

test("formatServiceClaimProblemAreaList returns display-ready labels", () => {
  const result = formatServiceClaimProblemAreaList(JSON.stringify([
    {
      componentId: "dish-1",
      name: "Dishwasher (600 x 600 x 878 mm)",
      code: "DISH-C-600-STD",
    },
    {
      componentId: "sink-1",
      name: "Sink Base Cabinet (600 x 600 x 878 mm)",
      code: "",
    },
  ]));

  assert.deepEqual(result, [
    "Dishwasher (DISH-C-600-STD)",
    "Sink Base Cabinet",
  ]);
});
