import assert from "node:assert/strict";
import test from "node:test";
import { AB_105777_LAYOUT_ALIAS_SLUGS } from "../lib/ab-105777-layout.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_IMAGE_SOURCE_SIZE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { getLinkedComponentIds } from "../components/kitchen-selection-utils.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots } from "../lib/service-claim-kitchen-hotspots.js";
import { buildServiceClaimReferencePlan } from "../lib/service-claim-reference-plan.js";
import { getTwoPartMobilePlanLayout } from "../lib/two-part-mobile-plan-layout.js";
import { allowsKitchenArticleNumberAlias } from "../lib/order-article-aliases.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";

for (const slug of AB_105777_LAYOUT_ALIAS_SLUGS) {
  test(`${slug} reuses the complete 105777 plan and linked hood lights`, async () => {
    for (const map of [PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_IMAGE_SOURCE_SIZE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG]) {
      assert.deepEqual(map[slug], map["ab-105777"]);
    }
    assert.equal(await loadKitchenSvgMarkup(slug), await loadKitchenSvgMarkup("ab-105777"));
    assert.deepEqual(getLinkedComponentIds(slug, "component-wall-cabinet-2"), ["component-wall-cabinet-2", "component-extractor-hood"]);
    assert.deepEqual(getTwoPartMobilePlanLayout(slug), {splitX:60,shiftX:6});
    assert.equal(allowsKitchenArticleNumberAlias(slug), true);
  });

  test(`${slug} preserves claim seams, filler strips and the configured-plan priority`, () => {
    const source = PLAN_HOTSPOTS_BY_SLUG[slug];
    const parts = [["oven","oven-module"],["oven-drawer","oven-module"],["worktop-left","worktop"],["worktop-right","worktop"]].map(([partKey,sourceComponentKey])=>({partKey,sourceComponentKey,componentId:`claim-${partKey}`}));
    assert.deepEqual(buildServiceClaimPartHotspots(source,parts,slug),buildServiceClaimPartHotspots(source,parts,"ab-105777"));
    const blende = [{sourceComponentKey:"dishwasher-base",code:"UPK20",componentId:"blende-dishwasher",claimPartKey:"blende",sourceWidthMm:600,blendeQuantity:1}];
    const cabinets = [{componentKey:"dishwasher-base",widthMm:600}];
    assert.deepEqual(buildServiceClaimBlendeHotspots(source,blende,cabinets,slug),buildServiceClaimBlendeHotspots(source,blende,cabinets,"ab-105777"));
    assert.equal(buildServiceClaimReferencePlan({kitchen:{slug},claimPlanPreviewPath:"/jpg/older-plan.jpg"}), null);
  });
}
