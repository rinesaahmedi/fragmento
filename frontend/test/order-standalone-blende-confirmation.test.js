import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { buildOrderSummaryHtml } from "../lib/email/order-notifications.js";

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

function filler({ quantity = 1 } = {}) {
  return {
    code: "BLENDE-AB105789-OVEN-END",
    itemType: "COMPONENT",
    nameSnapshot: "Filler Panel up to 20 cm",
    nameDeSnapshot: "Separate Passblende bis 20 cm",
    articleNumberSnapshot: "UPK20",
    priceSnapshot: 25,
    quantity,
    kitchenItem: {
      componentKey: "base-end-blende",
      iconKey: "blende",
      isLocked: false,
      catalogBlendeId: "upk20",
      catalogBlendeQuantity: 1,
      catalogBlende: {
        code: "UPK20",
        name: "Filler Panel up to 20 cm",
        nameDe: "Passblende bis 20 cm",
        price: 25,
      },
    },
  };
}

function buildOrder(items, confirmedItems = []) {
  return buildOrderForNotifications({
    id: "standalone-test",
    orderNumber: "111105789-1",
    createdAt: new Date("2026-10-07T10:00:00Z"),
    totalPrice: items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
    kitchen: { id: "kitchen", slug: "ab-105789", name: "AB 105789" },
    contractNumber: "111105789",
    items,
  }, { confirmedItems });
}

test("new standalone catalog filler remains a main confirmation row beside cabinet fillers", () => {
  const cabinet = {
    code: "CAB-BASE-1",
    itemType: "COMPONENT",
    nameSnapshot: "Lower Cabinet with Drawer 30 cm",
    nameDeSnapshot: "Unterschrank mit Schublade 30 cm",
    articleNumberSnapshot: "US30",
    priceSnapshot: 200,
    quantity: 1,
    kitchenItem: {
      componentKey: "base-module-1",
      iconKey: "drawer_base_two",
      catalogArticleId: "us30",
      catalogBlendeId: "upk20",
      catalogBlende: filler().kitchenItem.catalogBlende,
    },
  };

  for (const items of [[filler(), cabinet], [cabinet, filler()]]) {
    const order = buildOrder(items);
    const separate = order.components.find((item) => item.code === filler().code);
    assert.equal(separate.price, 25);
    assert.equal(separate.blendeLabel, "");
    assert.equal(separate.blendeCode, "");
    assert.equal(separate.blendePrice, null);

    const html = buildOrderSummaryHtml(order);
    assert.doesNotMatch(html, /Neu bestätigte Elektrogeräte/);
    const mainNumber = items[0].code === filler().code ? 1 : 2;
    const cabinetNumber = mainNumber === 1 ? 2 : 1;
    assert.match(html, new RegExp(`<tr><td[^>]*>${mainNumber}</td><td[^>]*>[\\s\\S]*?Separate Passblende bis 20 cm[\\s\\S]*?Typen-Nr\\.: UPK20[\\s\\S]*?</td><td[^>]*>25`));
    assert.match(html, new RegExp(`<tr><td[^>]*>${cabinetNumber}\\.1</td><td[^>]*>[\\s\\S]*?Typen-Nr\\.: UPK20[\\s\\S]*?</td><td[^>]*>25`));
    assert.equal((html.match(/Typen-Nr\.: UPK20/g) || []).length, 2);
    assert.match(html, /<td[^>]*>175/);
  }
});

test("standalone filler keeps purchased quantity and excludes earlier confirmed filler from new email", () => {
  const earlier = { ...filler(), code: "EARLIER-FILLER" };
  const order = buildOrder([filler({ quantity: 2 })], [earlier]);
  assert.equal(order.components[0].price, 50);
  assert.equal(order.components[0].quantity, 2);
  assert.equal(order.purchasedKitchenComponents.find((item) => item.code === earlier.code).isLocked, true);
  const html = buildOrderSummaryHtml(order);
  assert.equal((html.match(/Typen-Nr\.: UPK20/g) || []).length, 1);
  assert.match(html, /<td[^>]*>50/);
  assert.doesNotMatch(html, /<td[^>]*>1\.1<\/td>/);
});
