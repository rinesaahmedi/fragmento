import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import {
  buildPurchasedKitchenOverlaySvg,
  preparePurchasedKitchenPlanGeometry,
} from "../lib/email/order-notifications.js";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && context.parentURL) {
      const candidate = new URL(`${specifier}.js`, context.parentURL);
      if (fs.existsSync(candidate)) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { buildOrderForNotifications } = await import("../lib/orders.js");

function component({ code, componentKey, price = 100 }) {
  return {
    id: `item-${code}`,
    code,
    itemType: "COMPONENT",
    nameSnapshot: code,
    priceSnapshot: price,
    quantity: 1,
    kitchenItem: {
      id: `kitchen-item-${code}`,
      code,
      componentKey,
      name: code,
      isLocked: false,
    },
  };
}

test("second-order kitchen PDF keeps earlier confirmed components blue", () => {
  const earlier = component({ code: "CAB-FIRST", componentKey: "first" });
  const current = component({ code: "CAB-SECOND", componentKey: "second" });
  const order = buildOrderForNotifications({
    id: "order-2",
    orderNumber: "111105759-2",
    createdAt: new Date("2026-09-28T08:00:00Z"),
    totalPrice: 100,
    kitchen: { id: "kitchen", slug: "ab-105759", name: "105759", items: [] },
    items: [current],
    contractNumber: "111105759",
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
    phone: "1",
    address1: "Street 1",
    postalCode: "10000",
    city: "City",
  }, { confirmedItems: [earlier] });

  assert.deepEqual(order.components.map((item) => item.code), ["CAB-SECOND"]);
  assert.deepEqual(
    order.purchasedKitchenComponents.map((item) => [item.code, item.isLocked]),
    [["CAB-SECOND", false], ["CAB-FIRST", true]],
  );

  const sourceHotspots = [
    { componentKey: "first", left: 0, top: 0, width: 40, height: 100 },
    { componentKey: "second", left: 60, top: 0, width: 40, height: 100 },
  ];
  const { hotspots, crop } = preparePurchasedKitchenPlanGeometry(order, sourceHotspots);
  const overlay = buildPurchasedKitchenOverlaySvg({
    order,
    hotspots,
    crop,
    width: 1000,
    height: 500,
  }).toString("utf8");

  assert.match(overlay, /fill="rgba\(37,99,235,0\.26\)"/);
  assert.match(overlay, /fill="rgba\(62,188,116,0\.34\)"/);
});
