import assert from "node:assert/strict";
import test from "node:test";
import { buildCalloutBasedComponentKeyMap } from "../lib/kitchen-import-callout-mapping.js";

function row(nr, articles, dimensions = "") {
  return {
    nr: String(nr),
    articles,
    articlesUpper: String(articles || "").toUpperCase(),
    dimensions,
    isDefault: /^DEFAULT$/i.test(String(articles || "").trim()),
  };
}

test("buildCalloutBasedComponentKeyMap maps wall and base rows by PDF callout band and x-position", () => {
  const supplierRows = [
    row(1, "DEFAULT"),
    row(2, "DEFAULT"),
    row(3, "DEFAULT"),
    row(4, "OL-KGCN388140E", "178 cm"),
    row(5, "NUK E KEMI-Unterschrank", "500mm"),
    row(6, "US60", "600/600 mm"),
    row(7, "A-EGSPV597210"),
    row(8, "NUK E KEMI-Oberschrank", "500mm"),
    row(9, "FH664621E"),
    row(10, "H6002", "600/720/340 mm"),
    row(11, "H6002", "600/720/340 mm"),
    row(12, "H6002", "600/720/340 mm"),
  ];

  const callouts = [
    { nr: 4, xPct: 88, yPct: 52 },
    { nr: 5, xPct: 18, yPct: 66 },
    { nr: 6, xPct: 28, yPct: 66 },
    { nr: 7, xPct: 38, yPct: 66 },
    { nr: 8, xPct: 48, yPct: 24 },
    { nr: 9, xPct: 58, yPct: 24 },
    { nr: 10, xPct: 68, yPct: 24 },
    { nr: 11, xPct: 78, yPct: 24 },
    { nr: 12, xPct: 88, yPct: 24 },
  ];

  const map = buildCalloutBasedComponentKeyMap(supplierRows, callouts);
  assert.ok(map);
  assert.equal(map.get("1"), "oven-module");
  assert.equal(map.get("2"), "worktop");
  assert.equal(map.get("3"), "sink-base");
  assert.equal(map.get("4"), "refrigerator");
  assert.equal(map.get("8"), "wall-cabinet-1");
  assert.equal(map.get("9"), "wall-cabinet-2");
  assert.equal(map.get("10"), "wall-cabinet-3");
  assert.equal(map.get("11"), "wall-cabinet-4");
  assert.equal(map.get("12"), "wall-cabinet-5");
  assert.equal(map.get("5"), "base-module-1");
  assert.equal(map.get("6"), "base-module-2");
  assert.equal(map.get("7"), "base-module-3");
});

test("buildCalloutBasedComponentKeyMap uses article kind when callout Y bands are misleading", () => {
  const supplierRows = [
    row(1, "DEFAULT"),
    row(2, "DEFAULT"),
    row(3, "DEFAULT"),
    row(4, "OL-KGCN388140E", "178 cm"),
    row(5, "H6002", "600/720/340 mm"),
    row(6, "H6002", "600/720/340 mm"),
    row(7, "A-EGSPV597210"),
    row(8, "US60", "600/600 mm"),
    row(9, "US60", "600/600 mm"),
    row(10, "FH664621E"),
    row(11, "H6002", "600/720/340 mm"),
    row(12, "H6002", "600/720/340 mm"),
  ];

  const callouts = [
    { nr: 4, xPct: 5, yPct: 55 },
    { nr: 5, xPct: 20, yPct: 62 },
    { nr: 6, xPct: 30, yPct: 62 },
    { nr: 7, xPct: 40, yPct: 62 },
    { nr: 8, xPct: 50, yPct: 62 },
    { nr: 9, xPct: 25, yPct: 22 },
    { nr: 10, xPct: 35, yPct: 22 },
    { nr: 11, xPct: 45, yPct: 22 },
    { nr: 12, xPct: 55, yPct: 22 },
  ];

  const map = buildCalloutBasedComponentKeyMap(supplierRows, callouts);
  assert.ok(map);
  assert.equal(map.get("5"), "wall-cabinet-1");
  assert.equal(map.get("6"), "wall-cabinet-2");
  assert.equal(map.get("9"), "base-module-1");
  assert.equal(map.get("8"), "base-module-2");
  assert.equal(map.get("7"), "base-module-3");
});

test("buildCalloutBasedComponentKeyMap maps a 14-NR single-wall kitchen layout", () => {
  const supplierRows = [
    row(1, "DEFAULT"),
    row(2, "DEFAULT"),
    row(3, "DEFAULT"),
    row(4, "OL-KGCN388140E", "178 cm"),
    row(5, "NUKE KENA-Unterschrank", "300 mm"),
    row(6, "US60", "600/600 mm"),
    row(7, "A-EGSPV597210"),
    row(8, "US60", "600/600 mm"),
    row(9, "NUKE KENA-Unterschrank", "300 mm"),
    row(10, "H6002", "600/720/340 mm"),
    row(11, "FH664621E"),
    row(12, "H6002", "600/720/340 mm"),
    row(13, "H6002", "600/720/340 mm"),
    row(14, "H6002", "600/720/340 mm"),
  ];

  const callouts = [
    { nr: 1, xPct: 33, yPct: 62 },
    { nr: 2, xPct: 52, yPct: 57 },
    { nr: 3, xPct: 74, yPct: 65 },
    { nr: 4, xPct: 10, yPct: 48 },
    { nr: 5, xPct: 23, yPct: 72 },
    { nr: 6, xPct: 47, yPct: 72 },
    { nr: 7, xPct: 58, yPct: 71 },
    { nr: 8, xPct: 88, yPct: 74 },
    { nr: 9, xPct: 23, yPct: 27 },
    { nr: 10, xPct: 34, yPct: 25 },
    { nr: 11, xPct: 48, yPct: 24 },
    { nr: 12, xPct: 62, yPct: 22 },
    { nr: 13, xPct: 75, yPct: 28 },
    { nr: 14, xPct: 87, yPct: 21 },
  ];

  const map = buildCalloutBasedComponentKeyMap(supplierRows, callouts);
  assert.ok(map);
  assert.equal(map.get("1"), "oven-module");
  assert.equal(map.get("2"), "worktop");
  assert.equal(map.get("3"), "sink-base");
  assert.equal(map.get("4"), "refrigerator");
  assert.equal(map.get("7"), "base-module-3");
  assert.equal(map.get("11"), "wall-cabinet-2");
  assert.match(map.get("5"), /^base-module-/);
  assert.match(map.get("10"), /^wall-cabinet-/);
  assert.equal(new Set([...map.values()].filter((key) => key.startsWith("wall-cabinet"))).size, 5);
  assert.equal(new Set([...map.values()].filter((key) => key.startsWith("base-module"))).size, 4);
});
