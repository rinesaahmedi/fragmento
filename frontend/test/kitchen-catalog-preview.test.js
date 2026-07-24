import assert from "node:assert/strict";
import test from "node:test";
import {
  getKitchenCatalogImagePreview,
  getKitchenCatalogPreviewHotspots,
  getKitchenCatalogPreviewSlot,
  resolveKitchenCatalogPreviewSlug,
} from "../lib/kitchen-catalog-preview.js";
import { PLAN_HOTSPOTS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";

test("resolveKitchenCatalogPreviewSlug canonicalizes newly created AB kitchen slugs", () => {
  const slug = resolveKitchenCatalogPreviewSlug({
    slug: "105-806",
    kitchenCode: "105 806",
    items: [],
  });

  assert.equal(slug, "ab-105806");
});

test("resolveKitchenCatalogPreviewSlug keeps imported AB item preview association", () => {
  const slug = resolveKitchenCatalogPreviewSlug({
    slug: "custom-kitchen",
    kitchenCode: "",
    items: [{ code: "CAB-WALL-AB105807-1" }],
  });

  assert.equal(slug, "ab-105807");
});

test("getKitchenCatalogPreviewSlot resolves slots from image hotspots", () => {
  const preview = getKitchenCatalogImagePreview("ab-105806");
  const slot = getKitchenCatalogPreviewSlot(preview, "wall-cabinet-6");

  assert.equal(preview.imageHref, "/plans/AB%20105806.svg");
  assert.equal(slot.componentKey, "wall-cabinet-6");
  assert.equal(slot.label, "Wall Cabinet 6");
});

test("getKitchenCatalogPreviewSlot preserves no-preview fallback for unknown components", () => {
  const preview = getKitchenCatalogImagePreview("ab-105806");

  assert.equal(getKitchenCatalogPreviewSlot(preview, "not-on-plan"), null);
  assert.equal(getKitchenCatalogImagePreview("unknown-kitchen"), null);
});

test("AB 105835 uses its exact plan image and refrigerator hotspot", () => {
  const slug = resolveKitchenCatalogPreviewSlug({
    slug: "105-835",
    kitchenCode: "105 835",
    items: [],
  });
  const preview = getKitchenCatalogImagePreview(slug);
  const refrigerator = preview.hotspots.find((hotspot) => hotspot.componentKey === "refrigerator");

  assert.equal(slug, "ab-105835");
  assert.equal(preview.imageHref, "/plans/AB%20105835.svg");
  assert.ok(refrigerator.left > 80);
});

test("AB 105841 base module preview bounds exclude configurator plinth extension", () => {
  const preview = getKitchenCatalogImagePreview("ab-105841");
  const source = PLAN_HOTSPOTS_BY_SLUG["ab-105841"].find((hotspot) => hotspot.componentKey === "base-module-1");
  const baseModule = preview.hotspots.find((hotspot) => hotspot.componentKey === "base-module-1");
  const sourceBottom = source.top + source.height;
  const crop = preview.crop;
  const expectedBottom = ((sourceBottom - crop.top) / crop.height) * 100;

  assert.ok(baseModule);
  assert.ok(Math.abs(baseModule.top + baseModule.height - expectedBottom) < 0.35);
  assert.ok(baseModule.height < 33);
});

test("AB 105822 catalog preview uses the AB 105825 layout", () => {
  const preview = getKitchenCatalogImagePreview("ab-105822", [
    { componentKey: "base-module-3" },
    { componentKey: "sink-base" },
  ]);
  const baseModule = preview.hotspots.find((hotspot) => hotspot.componentKey === "base-module-3");
  const worktops = PLAN_HOTSPOTS_BY_SLUG["ab-105822"]
    .filter((hotspot) => hotspot.componentKey === "worktop");

  assert.equal(preview.imageHref, "/plans/AB%20105825.svg");
  assert.notEqual(PLAN_HOTSPOTS_BY_SLUG["ab-105822"], PLAN_HOTSPOTS_BY_SLUG["ab-105825"]);
  assert.equal(worktops.length, 2);
  assert.ok(worktops.every((hotspot) => !hotspot.preserveManualSize));
  assert.ok(worktops.every((hotspot) =>
    hotspot.points.some(([x, y]) => x === 43.467933 && y === 53.277311)
    && hotspot.points.some(([x, y]) => x === 44.299287 && y === 54.621849)
  ));
  assert.ok(worktops.every((hotspot) =>
    !hotspot.points.some(([x, y]) => x === 43.71 && y === 54.45)
  ));
  assert.ok(preview.crop.width < 100);
  assert.ok(baseModule.top > 50);
  assert.ok(baseModule.height > 25);
  assert.ok(baseModule.height < 33);
});

test("AB 105822 hood underside belongs to extractor hood instead of cabinet", () => {
  const cabinetFace = PLAN_HOTSPOTS_BY_SLUG["ab-105822"].find((hotspot) =>
    hotspot.componentKey === "wall-cabinet-2"
    && hotspot.points?.some(([x, y]) => x === 66.98 && y === 39.25)
  );
  const hoodUnderside = PLAN_HOTSPOTS_BY_SLUG["ab-105822"].find((hotspot) =>
    hotspot.componentKey === "extractor-hood"
    && hotspot.points?.some(([x, y]) => x === 58.08 && y === 37.42)
  );

  assert.ok(cabinetFace);
  assert.ok(cabinetFace.points.every(([, y]) => y < 40));
  assert.ok(hoodUnderside);
  assert.ok(Math.min(...hoodUnderside.points.map(([, y]) => y)) < 38);
});

test("AB 105828 catalog preview uses the AB 105825 layout", () => {
  const preview = getKitchenCatalogImagePreview("ab-105828");

  assert.equal(preview.imageHref, "/plans/AB%20105825.svg");
  assert.equal(PLAN_HOTSPOTS_BY_SLUG["ab-105828"], PLAN_HOTSPOTS_BY_SLUG["ab-105825"]);
});

test("AB 105831 hood underside belongs to extractor hood instead of cabinet", () => {
  const cabinetFace = PLAN_HOTSPOTS_BY_SLUG["ab-105831"].find((hotspot) =>
    hotspot.componentKey === "wall-cabinet-2"
    && hotspot.points?.some(([x, y]) => x === 67.11 && y === 43.65)
  );
  const hoodUndersides = PLAN_HOTSPOTS_BY_SLUG["ab-105831"].filter((hotspot) =>
    hotspot.componentKey === "extractor-hood"
    && hotspot.points?.some(([x, y]) => x === 57.97 && y === 41.45)
  );

  assert.ok(cabinetFace);
  assert.ok(cabinetFace.points.every(([, y]) => y < 44));
  assert.ok(hoodUndersides.length >= 1);
});

test("AB 105837 hood LED strip belongs to extractor hood instead of cabinet", () => {
  const cabinetFace = PLAN_HOTSPOTS_BY_SLUG["ab-105837"].find((hotspot) =>
    hotspot.componentKey === "wall-cabinet-2"
    && hotspot.points?.some(([x, y]) => x === 48.02 && y === 38.69)
  );
  const hoodLedStrip = PLAN_HOTSPOTS_BY_SLUG["ab-105837"].find((hotspot) =>
    hotspot.componentKey === "extractor-hood"
    && hotspot.points?.some(([x, y]) => x === 37.08 && y === 40.38)
    && hotspot.points?.some(([x, y]) => x === 48.02 && y === 39.78)
  );

  assert.ok(cabinetFace);
  assert.ok(cabinetFace.points.every(([, y]) => y <= 40.38));
  assert.ok(hoodLedStrip);
});

test("AB 105809 worktop preview excludes vertical corner blende strips", () => {
  const preview = getKitchenCatalogImagePreview("ab-105809");
  const worktopHotspots = getKitchenCatalogPreviewHotspots(preview, "worktop");

  assert.equal(worktopHotspots.length, 3);
  assert.ok(worktopHotspots.every((hotspot) => hotspot.height < 25));
});

test("AB 105809 oven preview uses polygon outline instead of oversized bbox", () => {
  const preview = getKitchenCatalogImagePreview("ab-105809");
  const ovenHotspots = getKitchenCatalogPreviewHotspots(preview, "oven-module");

  assert.equal(ovenHotspots.length, 1);
  assert.ok(Array.isArray(ovenHotspots[0].outlinePoints));
  assert.ok(ovenHotspots[0].outlinePoints.length >= 3);
});

test("AB 105834 hood bottom side strip belongs to the extractor hood", () => {
  const hoodBottomSideStrip = PLAN_HOTSPOTS_BY_SLUG["ab-105834"].find((hotspot) =>
    hotspot.points?.some(([x, y]) => x === 35.49 && y === 39.62)
    && hotspot.points?.some(([x, y]) => x === 30.0 && y === 38.62)
  );
  const hoodLedArea = PLAN_HOTSPOTS_BY_SLUG["ab-105834"].find((hotspot) =>
    hotspot.points?.some(([x, y]) => x === 36.58 && y === 44.08)
    && hotspot.points?.some(([x, y]) => x === 46.38 && y === 38.11)
  );
  const wallCabinetSideFace = PLAN_HOTSPOTS_BY_SLUG["ab-105834"].find((hotspot) =>
    hotspot.points?.some(([x, y]) => x === 25.51 && y === 12.58)
    && hotspot.points?.some(([x, y]) => x === 29.52 && y === 27.34)
  );

  assert.ok(hoodBottomSideStrip);
  assert.equal(hoodBottomSideStrip.componentKey, "extractor-hood");
  assert.ok(hoodLedArea);
  assert.equal(hoodLedArea.componentKey, "extractor-hood");
  assert.ok(wallCabinetSideFace);
  assert.equal(wallCabinetSideFace.componentKey, "wall-cabinet-1");
});

test("AB 105821 corner cabinet previews include left blende in the cabinet bounds", () => {
  const preview = getKitchenCatalogImagePreview("ab-105821");
  const wallHotspots = getKitchenCatalogPreviewHotspots(preview, "wall-cabinet-1");
  const baseHotspots = getKitchenCatalogPreviewHotspots(preview, "base-module-1");

  assert.equal(wallHotspots.length, 1);
  assert.equal(baseHotspots.length, 1);
  assert.ok(wallHotspots[0].left < 10.34);
  assert.ok(baseHotspots[0].left < 10.34);
});

test("AB 105819 left cabinet previews include left blende in the cabinet bounds", () => {
  const preview = getKitchenCatalogImagePreview("ab-105819");
  const wallHotspots = getKitchenCatalogPreviewHotspots(preview, "wall-cabinet-1");
  const baseHotspots = getKitchenCatalogPreviewHotspots(preview, "base-module-1");

  assert.equal(wallHotspots.length, 1);
  assert.equal(baseHotspots.length, 1);
  assert.ok(wallHotspots[0].left < 3.68);
  assert.ok(baseHotspots[0].left < 3.68);
});

test("AB 105818 uses pixel-aligned 105810 wall cabinet and fridge hotspots", () => {
  const wallHotspot = PLAN_HOTSPOTS_BY_SLUG["ab-105818"].find((hotspot) => hotspot.componentKey === "wall-cabinet-1");
  const refrigeratorHotspot = PLAN_HOTSPOTS_BY_SLUG["ab-105818"].find((hotspot) => hotspot.componentKey === "refrigerator");

  assert.ok(wallHotspot);
  assert.ok(refrigeratorHotspot);
  assert.ok(Math.abs(wallHotspot.left - 18.12) < 0.15);
  assert.ok(Math.abs(wallHotspot.top - 15.77) < 0.15);
  assert.ok(Math.abs(refrigeratorHotspot.left - 3.9) < 0.15);
});

test("AB 105814 uses pixel-aligned wall cabinet and fridge hotspots", () => {
  const wallHotspot = PLAN_HOTSPOTS_BY_SLUG["ab-105814"].find((hotspot) => hotspot.componentKey === "wall-cabinet-1");
  const rightWallHotspot = PLAN_HOTSPOTS_BY_SLUG["ab-105814"].find((hotspot) => hotspot.componentKey === "wall-cabinet-6");
  const refrigeratorHotspot = PLAN_HOTSPOTS_BY_SLUG["ab-105814"].find((hotspot) => hotspot.componentKey === "refrigerator");

  assert.ok(wallHotspot);
  assert.ok(rightWallHotspot);
  assert.ok(refrigeratorHotspot);
  assert.ok(Math.abs(wallHotspot.left - 18.12) < 0.15);
  assert.ok(Math.abs(wallHotspot.top - 15.77) < 0.15);
  assert.ok(Math.abs(rightWallHotspot.left + rightWallHotspot.width - 94.86) < 0.15);
  assert.ok(Math.abs(refrigeratorHotspot.left - 3.9) < 0.15);
});
