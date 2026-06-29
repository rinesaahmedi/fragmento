import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

test("service kitchen svg loader uses the AB 105808 plan asset", async () => {
  const markup = await loadKitchenSvgMarkup("ab-105808");

  assert.match(markup, /viewBox="0 0 842 595"/);
  assert.match(markup, /M1214 2108H6758/);
});

test("AB 105808 service plan uses overlay bounds instead of color grouping", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "kitchen-svg-plan-utils.js"), "utf8");

  assert.match(source, /"ab-105808":\s*{/);
  assert.match(source, /"component-wall-cabinet-6":\s*boundsFromPlanPercent\(81\.23,\s*15\.89,\s*15\.07,\s*24\.09\)/);
  assert.match(source, /!\s*hasOverlayPlanBounds\(kitchenConfig\.kitchen\.slug\)/);
});

test("service claim kitchen plan exposes all active components for selection", () => {
  const source = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan.js"), "utf8");

  assert.doesNotMatch(source, /item\.itemType !== ItemType\.COMPONENT \|\| !item\.isLocked/);
  assert.match(source, /addSelectableComponent\(componentId,\s*{\s*code:/);
});

test("service claim picker toggles hood and cabinet independently", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-kitchen-picker.jsx"), "utf8");

  assert.doesNotMatch(source, /getLinkedComponentIds/);
  assert.match(source, /const isSelected = selectedIds\.has\(hotspot\.componentId\);/);
  assert.match(source, /const ids = selectable\.has\(componentId\) \? \[componentId\] : \[\];/);
});

test("service claim plan labels sink separately from worktop", () => {
  const planSource = fs.readFileSync(path.join(repoRoot, "lib", "service-claim-kitchen-plan.js"), "utf8");
  const flowSource = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(planSource, /"component-sink-faucet":\s*"Sink"/);
  assert.match(planSource, /resolveServiceClaimComponentName\(componentId,\s*item\)/);
  assert.match(flowSource, /"SINK-WORKTOP":\s*"Sp\\u00fcle"/);
});

test("German service claim labels do not fall back to English catalog names", () => {
  const source = fs.readFileSync(path.join(repoRoot, "components", "service-claim-flow.js"), "utf8");

  assert.match(source, /function formatGermanClaimAreaName/);
  assert.match(source, /code\.startsWith\("REF-"\)[\s\S]*Standk\\u00fchlschrank 178 cm/);
  assert.match(source, /normalizedName\.includes\("lower cabinet with drawer"\)[\s\S]*Unterschrank mit Schublade/);
  assert.match(source, /normalizedName\.includes\("dishwasher"\)[\s\S]*Vollintegrierter Geschirrsp\\u00fcler/);
});
