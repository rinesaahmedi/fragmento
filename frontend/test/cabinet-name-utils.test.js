import assert from "node:assert/strict";
import test from "node:test";
import { getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { getCabinetWidthDisplayName } from "../lib/cabinet-name-utils.js";

test("base cabinet width uses lower cabinet label", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-BASE-TEST-300",
      name: "Base Cabinet",
      widthMm: 300,
      iconKey: "drawer_base_two",
    }),
    "Lower cabinet with drawer 30",
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

test("sink base cabinet is not renamed as a lower cabinet", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "SINKBASE-TEST-600",
      name: "Sink Base Cabinet",
      widthMm: 600,
      iconKey: "sink_base",
    }),
    "",
  );
});

test("localized sink base name stays Sink Lower Cabinet even after stored-name migration", () => {
  assert.equal(
    getLocalizedItemName(
      {
        code: "SINKBASE-AB105806-600",
        name: "Lower cabinet with drawer 60",
        widthMm: 600,
        iconKey: "sink_base",
      },
      (_key, fallback) => fallback,
      "en",
      false,
    ),
    "Sink Lower Cabinet",
  );
});

test("localized hood wall cabinet uses extractor hood upper cabinet label", () => {
  assert.equal(
    getLocalizedItemName(
      {
        code: "CAB-HOOD-AB105806-600",
        name: "Hood Wall Cabinet",
        widthMm: 600,
        iconKey: "hood_wall_cabinet",
      },
      (_key, fallback) => fallback,
      "en",
      false,
    ),
    "Extractor Hood Upper Cabinet",
  );
});

test("wall cabinet width falls back to code", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-AB105837-US60-L",
      name: "Wall Cabinet",
      iconKey: "wall_cabinet_plain",
    }),
    "Upper cabinet 60",
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
    "Unterschrank mit Schublade 60",
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
