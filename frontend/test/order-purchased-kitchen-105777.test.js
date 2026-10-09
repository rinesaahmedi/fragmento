import assert from "node:assert/strict";
import test from "node:test";
import { AB_105777_LAYOUT_SLUGS } from "../lib/ab-105777-layout.js";
import { PLAN_HOTSPOTS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { loadKitchenPlanPreviewData, preparePurchasedKitchenPlanGeometry, buildPurchasedKitchenOverlaySvg } from "../lib/email/order-notifications.js";

for (const slug of AB_105777_LAYOUT_SLUGS) {
  test(`${slug} email highlights hood fascia and both lights with the purchased hood cabinet`, async () => {
    const preview = await loadKitchenPlanPreviewData();
    assert.deepEqual(preview.hotspotsBySlug[slug], PLAN_HOTSPOTS_BY_SLUG[slug]);
    const order = { kitchen: { slug }, components: [{ componentKey: "wall-cabinet-2" }] };
    const geometry = preparePurchasedKitchenPlanGeometry(order, preview.hotspotsBySlug[slug]);
    const hood = geometry.hotspots.filter(h => h.componentKey === "extractor-hood");
    assert.equal(hood.length, 3);
    const render = components => buildPurchasedKitchenOverlaySvg({
      order: { ...order, components }, hotspots: hood, crop: geometry.crop,
      width: 1400, height: 1000, linkedGroups: preview.linkedGroupsBySlug[slug],
    });
    const selected = render(order.components).toString();
    assert.equal((selected.match(/<rect /g) || []).length, 3);
    assert.equal((selected.match(/fill="rgba\(62,188,116,0\.34\)"/g) || []).length, 3);
    assert.equal(render([]), null, "unselected hood lights stay white");
    assert.equal((render([{ componentKey: "extractor-hood" }]).toString().match(/<rect /g) || []).length, 3);
  });
}
