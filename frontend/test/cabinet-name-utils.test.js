import assert from "node:assert/strict";
import test from "node:test";
import { getCatalogItemDetails, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { getCabinetWidthDisplayName } from "../lib/cabinet-name-utils.js";
import { buildCutleryLineItems, parseCutleryLineFromOrderItem } from "../lib/cutlery-accessories.js";

test("base cabinet width uses lower cabinet label", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-BASE-TEST-300",
      name: "Base Cabinet",
      widthMm: 300,
      iconKey: "drawer_base_two",
    }),
    "Lower Cabinet with Drawer 30",
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
    "Upper Cabinet 60",
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
        name: "Lower Cabinet with Drawer 60",
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

test("AB 105846 default sink keeps plan callout 3", () => {
  assert.equal(
    getLocalizedItemName(
      {
        code: "SINK-BASE-AB105846-DEFAULT",
        name: "Sink Lower Cabinet",
        iconKey: "sink_base",
      },
      (_key, fallback) => fallback,
      "en",
    ),
    "3. Sink Lower Cabinet",
  );
});

test("localized catalog-linked cabinet name matches catalog label exactly", () => {
  assert.equal(
    getLocalizedItemName(
      {
        catalogArticleId: "catalog-us40",
        code: "CAB-BASE-AB105817-US40",
        articleNumber: "US40",
        name: "Lower Cabinet with Drawer 40",
        nameDe: "Unterschrank mit Schublade 40",
        widthMm: 400,
        depthMm: 600,
        iconKey: "drawer_base_two",
      },
      (_key, fallback) => fallback,
      "en",
      false,
    ),
    "Lower Cabinet with Drawer 40",
  );
});

test("localized hood wall cabinet uses upper cabinet with extractor hood label", () => {
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
    "Upper Cabinet with Extractor Hood 60",
  );
});

test("cutlery variant summary keeps selected width name instead of base catalog code", () => {
  assert.equal(
    getLocalizedItemName(
      {
        code: "ACC-CUTLERY-ZB60SG",
        articleNumber: "ZB40SG",
        name: "Cutlery insert 40 cm",
        nameDe: "Besteckeinsatz 40 cm",
        iconKey: "cutlery_insert",
        isCutleryLine: true,
      },
      (_key, fallback) => fallback,
      "en",
      false,
    ),
    "Cutlery insert 40 cm",
  );
  assert.equal(
    getLocalizedItemName(
      {
        code: "ACC-CUTLERY-ZB60SG",
        articleNumber: "ZB40SG",
        name: "Cutlery insert 40 cm",
        nameDe: "Besteckeinsatz 40 cm",
        iconKey: "cutlery_insert",
        isCutleryLine: true,
      },
      (_key, fallback) => fallback,
      "de",
      false,
    ),
    "Besteckeinsatz 40 cm",
  );
});

test("cutlery variant line items use catalog article data", () => {
  const [lineItem] = buildCutleryLineItems(
    {
      code: "ACC-CUTLERY-ZB60SG",
      name: "Cutlery insert 60 cm",
      price: 25,
      iconKey: "cutlery_insert",
    },
    [{ articleNumber: "ZB40SG", quantity: 2 }],
    (_key, fallback) => fallback,
    "en",
    [
      {
        articleNumber: "ZB40SG",
        name: "Catalog 40 cm insert",
        nameDe: "Katalog 40 cm Einsatz",
        widthCm: 40,
        price: 21,
      },
    ],
  );

  assert.equal(lineItem.code, "ACC-CUTLERY-ZB60SG");
  assert.equal(lineItem.articleNumber, "ZB40SG");
  assert.equal(lineItem.name, "Catalog 40 cm insert");
  assert.equal(lineItem.price, 21);
  assert.equal(lineItem.quantity, 2);
});

test("cutlery order item parser recovers article number from saved German name", () => {
  assert.deepEqual(
    parseCutleryLineFromOrderItem({
      code: "ACC-CUTLERY-ZB60SG",
      articleNumber: "",
      nameSnapshot: "Besteckeinsatz 45 cm",
      quantity: 1,
    }),
    { articleNumber: "ZB45SG", quantity: 1 },
  );
});

test("wall cabinet width falls back to code", () => {
  assert.equal(
    getCabinetWidthDisplayName({
      code: "CAB-WALL-TEST-600",
      name: "Wall Cabinet",
      widthMm: 600,
      iconKey: "wall_cabinet_plain",
    }),
    "Upper Cabinet 60",
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
    "Upper Cabinet 50",
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

test("dishwasher catalog details do not expose dimensions", () => {
  assert.equal(
    getCatalogItemDetails({
      code: "DISH-AB105822-600",
      name: "Dishwasher",
      widthMm: 600,
      heightMm: null,
      depthMm: null,
      iconKey: "dishwasher_base",
    }).dimensions,
    "",
  );
});

test("localized dishwasher names use fully integrated labels", () => {
  const item = {
    code: "DISH-AB105822-600",
    name: "Dishwasher",
    nameDe: "Geschirrspüler",
    iconKey: "dishwasher_base",
  };

  assert.equal(
    getLocalizedItemName(item, (_key, fallback) => fallback, "en", false),
    "Fully integrated dishwasher",
  );
  assert.equal(
    getLocalizedItemName(item, (_key, fallback) => fallback, "de", false),
    "Vollintegrierter Geschirrspüler",
  );
});

test("localized chimney hood names use angled extractor labels", () => {
  const item = {
    code: "HOOD-C-FH664621E",
    name: "Chimney extractor hood",
    nameDe: "Kamin-Dunstabzugshaube",
  };

  assert.equal(
    getLocalizedItemName(item, (_key, fallback) => fallback, "en", false),
    "Angled extractor hood + Filter",
  );
  assert.equal(
    getLocalizedItemName(item, (_key, fallback) => fallback, "de", false),
    "Schrägesse + Filter",
  );
});
