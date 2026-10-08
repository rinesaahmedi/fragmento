import assert from "node:assert/strict";
import test from "node:test";
import { AB_105779_LAYOUT_SLUGS } from "../lib/ab-105779-layout.js";
import { PLAN_HOTSPOTS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { loadKitchenPlanPreviewData, preparePurchasedKitchenPlanGeometry, buildPurchasedKitchenOverlaySvg } from "../lib/email/order-notifications.js";

for (const slug of AB_105779_LAYOUT_SLUGS) {
  test(`${slug} purchased-kitchen email selects both hood faces and both lights together`, async () => {
    const preview = await loadKitchenPlanPreviewData();
    assert.deepEqual(preview.hotspotsBySlug[slug], PLAN_HOTSPOTS_BY_SLUG[slug]);
    const order = { kitchen: { slug }, components: [{ componentKey: "wall-cabinet-2" }] };
    const geometry = preparePurchasedKitchenPlanGeometry(order, preview.hotspotsBySlug[slug]);
    const hood = geometry.hotspots.filter(h => h.componentKey === "extractor-hood");
    assert.equal(hood.length, 4);
    const render = components => buildPurchasedKitchenOverlaySvg({
      order: { ...order, components }, hotspots: hood, crop: geometry.crop,
      width: 1400, height: 1000, linkedGroups: preview.linkedGroupsBySlug[slug],
    });
    const selected = render(order.components).toString();
    assert.equal((selected.match(/<polygon /g) || []).length, 4);
    assert.equal((selected.match(/fill="rgba\(62,188,116,0\.34\)"/g) || []).length, 4);
    assert.equal(render([]), null, "hood faces and lights stay white when not purchased");
    assert.equal((render([{ componentKey: "extractor-hood" }]).toString().match(/<polygon /g) || []).length, 4);
  });
}
