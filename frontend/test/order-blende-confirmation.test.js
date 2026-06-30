import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderSummaryHtml } from "../lib/email/order-notifications.js";

test("order confirmation summary renders blende as a separate product row", () => {
  const order = {
    orderNumber: "FRG-TEST-001",
    total: 244,
    kitchen: {
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-100",
      preferredDeliveryDate: "2026-07-15",
    },
    components: [
      {
        code: "CAB-BASE-1",
        name: "Base cabinet",
        price: 244,
        blendeCode: "UPK20",
        blendeLabel: "UPK20 20 cm",
        blendePrice: 25,
      },
    ],
    accessories: [],
    services: [],
  };

  const html = buildOrderSummaryHtml(order);

  assert.ok(html.indexOf("Base cabinet") < html.indexOf("Blende UPK20 20 cm"));
  assert.match(html, /Code: CAB-BASE-1/);
  assert.match(html, /Code: UPK20/);
  assert.match(html, /Gewuenschter Liefertermin/);
  assert.match(html, /15\.07\.2026/);
  assert.match(html, /219/);
  assert.match(html, /25/);
  assert.match(html, /244/);
});
