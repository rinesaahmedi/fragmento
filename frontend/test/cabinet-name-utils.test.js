import assert from "node:assert/strict";
import test from "node:test";
import { getCabinetWidthDisplayName } from "../lib/cabinet-name-utils.js";

test("base cabinet width uses lower cabinet label", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-BASE-TEST-300",
      name: "Base Cabinet",
      widthMm: 300,
      iconKey: "drawer_base_two",
    }),
    "Lower cabinet 30",
  );
});

test("wall cabinet width uses upper cabinet label", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-TEST-600",
      name: "Wall Cabinet",
      widthMm: 600,
      iconKey: "wall_cabinet_plain",
    }),
    "Upper cabinet 60",
  );
});

test("sink base cabinet is a lower cabinet", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "SINKBASE-TEST-600",
      name: "Sink Base Cabinet",
      widthMm: 600,
      iconKey: "sink_base",
    }),
    "Lower cabinet 60",
  );
});

test("wall cabinet width falls back to code", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-AB105837-500-L",
      name: "Wall Cabinet",
      iconKey: "wall_cabinet_plain",
    }),
    "Upper cabinet 50",
  );
});

test("structured width wins over misleading code width", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-LS-600",
      name: "Wall Cabinet right 2",
      widthMm: 500,
      iconKey: "wall_cabinet_standard",
    }),
    "Upper cabinet 50",
  );
});

test("cabinet labels use German names when requested", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-BASE-TEST-600",
      name: "Base Cabinet",
      widthMm: 600,
      iconKey: "drawer_base_two",
    }, "de"),
    "Unterschrank 60",
  );
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-TEST-600",
      name: "Wall Cabinet",
      widthMm: 600,
      iconKey: "wall_cabinet_plain",
    }, "de"),
    "Oberschrank 60",
  );
});

test("hood package is not renamed as a wall cabinet", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-HOOD-B-600",
      name: "Flat Screen Extractor Hood + Cabinet + Filter",
      widthMm: 600,
      iconKey: "wall_cabinet_plain",
    }),
    "",
  );
});
