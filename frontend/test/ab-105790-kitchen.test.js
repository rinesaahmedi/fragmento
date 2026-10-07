import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { getHotspotSourceBounds } from "../lib/kitchen-plan-geometry.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots } from "../lib/service-claim-kitchen-hotspots.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { loadKitchenPlanPreviewData, generatePurchasedKitchenPdf, buildOrderConfirmationAttachmentLabels } from "../lib/email/order-notifications.js";

const slug = "ab-105790";
const boxes = PLAN_HOTSPOTS_BY_SLUG[slug];
const source = boxes.map((box) => ({ ...box, ...getHotspotSourceBounds(box) }));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00002, `${actual} must match ${expected}`);
const sourcePoint = ([x, y], px, py) => { near(x, px / 842 * 100); near(y, py / 595 * 100); };

test("105790 uses its own vector source with hidden supplier numbers and tight grey details", async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/AB%20105790.svg");
  const svg = readFileSync(new URL("../public/plans/AB 105790.svg", import.meta.url), "utf8").trim();
  assert.equal(await loadKitchenSvgMarkup(slug), svg);
  assert.ok([...svg.matchAll(/<use\b[^>]*data-text="\d"[^>]*>/g)].every(([glyph]) => glyph.includes('fill="#ffffff"')));
  for (const detail of PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug]) {
    assert.ok(detail.persistWhenSelected && detail.width < 10 && detail.height < 10);
    assert.ok([detail.left, detail.top, detail.width, detail.height].every(Number.isFinite));
  }
});

test("the two separate blocks follow their PDF seams without bridging the gap", () => {
  assert.equal(boxes.length, 40);
  assert.ok(boxes.every((box) => box.points?.length >= 3 && box.preserveManualSize));
  const fronts = boxes.filter((box) => ["sink-end-blende", "sink-base", "dishwasher-base", "oven-module", "base-module-2"].includes(box.componentKey) && box.claimApplianceSurface !== "cooktop");
  for (let index = 1; index < fronts.length; index++) {
    assert.deepEqual(fronts[index - 1].points[1], fronts[index].points[0]);
    assert.deepEqual(fronts[index - 1].points[2], fronts[index].points[3]);
  }
  const secondary = source.filter((box) => box.componentKey === "worktop-secondary");
  const main = source.filter((box) => box.componentKey === "worktop");
  assert.equal(secondary.length, 3);
  assert.equal(main.length, 3);
  assert.ok(Math.max(...secondary.map((box) => box.right)) < Math.min(...main.map((box) => box.left)));
  assert.deepEqual(getLinkedComponentIds(slug, "component-extractor-hood"), ["component-wall-cabinet-3", "component-extractor-hood"]);
  const hoodFaces = boxes.filter((box) => box.componentKey === "extractor-hood");
  assert.equal(hoodFaces.length, 4, "underside, right side and both LED rays share the hood identity");
  const hoodSide = hoodFaces.find((box) => box.points.length === 3);
  sourcePoint(hoodSide.points[0], 652.44, 252.64);
  sourcePoint(hoodSide.points[1], 693, 258.52);
  sourcePoint(hoodSide.points[2], 652.44, 262.6);
  const codes = ["OVEN-B-600-HOB", "TOP-AB105790", "SINK-BASE-AB105790-SP60-L", "TOP-AB105790-SECONDARY", "REF-AB105790-KGCN388140E", "CAB-BASE-AB105790-US60-UPK20", "BLENDE-AB105790-SINK-END", "DISH-AB105790-600", "CAB-BASE-AB105790-US50-UPK20", "CAB-WALL-AB105790-H6002-HPK2002", "CAB-WALL-AB105790-H6002", "CAB-HOOD-AB105790-600", "CAB-WALL-AB105790-H5002"];
  codes.forEach((code, index) => assert.ok(getLocalizedItemName({ code, name: "Item" }, (_key, fallback) => fallback, "en", true).startsWith(`${index + 1}. `)));
});

const worktopParts = [
  { partKey: "worktop-left", sourceComponentKey: "worktop-secondary", sourceKitchenItemCode: "TOP-AB105790-SECONDARY" },
  { partKey: "worktop-right", sourceComponentKey: "worktop", sourceKitchenItemCode: "TOP-AB105790" },
  { partKey: "worktop-end-panel", sourceComponentKey: "worktop", sourceKitchenItemCode: "TOP-AB105790" },
];
test("ASC keeps both included worktops and the end panel separately claimable", () => {
  const claims = buildServiceClaimPartHotspots(source, worktopParts, slug);
  for (const [partKey, count] of [["worktop-left", 3], ["worktop-right", 2], ["worktop-end-panel", 1]]) {
    assert.equal(claims.filter((box) => box.claimPartKey === partKey).length, count, partKey);
  }
  const items = [
    { code: "TOP-AB105790", componentKey: "worktop", itemType: "COMPONENT", isLocked: true, articleNumber: "PLR60" },
    { code: "TOP-AB105790-SECONDARY", componentKey: "worktop-secondary", itemType: "COMPONENT", isLocked: true, articleNumber: "PLR60" },
  ];
  const select = (confirmedItems) => buildServiceClaimSelectableComponents({ kitchen: { items }, kitchenConfig: { components: items }, kitchenSlug: slug, claimParts: worktopParts, confirmedItems }).selectableComponents;
  assert.ok(select([]).some((entry) => entry.claimPartKey === "worktop-left"));
  assert.ok(select([]).some((entry) => entry.claimPartKey === "worktop-right"));
  assert.equal(select([]).find((entry) => entry.claimPartKey === "worktop-end-panel").contextualChoiceTriggerPartKey, "worktop-right");
});

test("ASC appliance and filler masks keep the exact measured physical parts", () => {
  const parts = ["oven", "oven-drawer", "cooktop"].map((partKey) => ({ partKey, sourceComponentKey: "oven-module" }));
  parts.push(...["sink", "faucet"].map((partKey) => ({ partKey, sourceComponentKey: "sink-faucet" })));
  const claims = buildServiceClaimPartHotspots(source, parts, slug);
  for (const [partKey, count] of [["oven", 1], ["oven-drawer", 1], ["cooktop", 1], ["sink", 1], ["faucet", 4]]) assert.equal(claims.filter((box) => box.claimPartKey === partKey).length, count, partKey);
  const oven = claims.find((entry) => entry.claimPartKey === "oven");
  const lastCorner = oven.clipPath.slice(8, -1).split(", ").at(-1).split(" ").map(parseFloat);
  sourcePoint([oven.left + lastCorner[0] / 100 * oven.width, oven.top + lastCorner[1] / 100 * oven.height], 534, 475.6);
  const definitions = [["base-module-1", "UPK20", 600, 1], ["base-module-2", "UPK20", 500, 1], ["wall-cabinet-1", "HPK2002", 600, 2], ["wall-cabinet-4", "HPK2002", 500, 2]];
  const blenden = definitions.map(([sourceComponentKey, code, sourceWidthMm]) => ({ componentId: `blende-${sourceComponentKey}`, componentKey: `claim-blende-${sourceComponentKey}`, sourceComponentKey, code, sourceWidthMm, claimPartKey: "blende", blendeQuantity: 1 }));
  const split = buildServiceClaimBlendeHotspots(source, blenden, definitions.map(([componentKey, , widthMm]) => ({ componentKey, widthMm })), slug);
  for (const [key, , , count] of definitions) {
    const filler = split.filter((entry) => entry.claimPartKey === "blende" && entry.sourceComponentKey === key);
    assert.equal(filler.length, count, key);
    assert.ok(filler.every((entry) => source.some((original) => original.componentKey === key && JSON.stringify(original.points) === JSON.stringify(entry.points))));
  }
  const rightFillers = split.filter((entry) => entry.claimPartKey === "blende" && entry.sourceComponentKey === "wall-cabinet-4");
  assert.ok(rightFillers.every((entry) => entry.blendeSide === "right"));
  sourcePoint(rightFillers[0].points[0], 717.48, 116.8);
  sourcePoint(rightFillers[0].points[2], 721.32, 262.6);
  assert.equal(split.filter((entry) => entry.componentKey === "wall-cabinet-4" && !entry.claimPartKey).length, 3, "cabinet front, top and exposed side remain separately selectable");
});

test("email includes the purchased 105790 sketch PDF with modular geometry", async () => {
  const preview = await loadKitchenPlanPreviewData();
  assert.equal(preview.imageViews[slug], PLAN_IMAGE_BY_SLUG[slug]);
  assert.equal(preview.hotspotsBySlug[slug].length, 40);
  const order = {
    id: "preview-105790", orderNumber: "670105790-preview", createdAt: "2026-10-07T08:00:00Z",
    kitchen: { slug, name: "105790" }, customer: { contractNumber: "670105790" },
    components: [...new Set(boxes.map((box) => box.componentKey))].filter((key) => key !== "extractor-hood").map((componentKey) => ({ componentKey, isLocked: ["worktop", "worktop-secondary", "oven-module", "sink-base", "sink-faucet"].includes(componentKey) })),
  };
  assert.ok((await buildOrderConfirmationAttachmentLabels(order)).some((entry) => entry.key === "purchased-kitchen"));
  const attachment = await generatePurchasedKitchenPdf(order);
  const bytes = Buffer.from(attachment.base64, "base64");
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  assert.ok(bytes.length > 20000);
  // Opt-in local visual QA; ordinary test runs only generate an in-memory fixture.
  if (process.env.KITCHEN_105790_PREVIEW_PDF) writeFileSync(process.env.KITCHEN_105790_PREVIEW_PDF, bytes);
});
