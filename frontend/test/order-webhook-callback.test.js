import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderWebhookPayload } from "../lib/email/order-notifications.js";

test("order webhook payload includes automatic callback request and existing fields", () => {
  const order = {
    orderNumber: "FRG-20260520-ABC123",
    total: 349,
    kitchen: {
      id: "kitchen_1",
      slug: "demo-kitchen",
      name: "Demo Kitchen",
    },
    customer: {
      contractNumber: "KV-100",
      firstName: "Max",
      lastName: "Mustermann",
      email: "max@example.com",
      phone: "+49 30 555 0101",
      address1: "Demo Street 1",
      postalCode: "10115",
      city: "Berlin",
      paymentMethod: "card",
    },
    components: [{ code: "CAB-1", name: "Cabinet", price: 100 }],
    accessories: [{ code: "ACC-1", name: "Accessory", price: 49 }],
    services: [{ code: "SVC-1", name: "Montage", price: 200 }],
  };

  const payload = buildOrderWebhookPayload(order);

  assert.equal(payload.customer, order.customer);
  assert.equal(payload.totalPrice, order.total);
  assert.deepEqual(payload.components, [
    ...order.components,
    ...order.accessories,
    ...order.services,
  ]);
  assert.equal(payload.kitchen, order.kitchen);
  assert.equal(payload.orderNumber, order.orderNumber);
  assert.deepEqual(payload.callback, {
    requested: true,
    trigger: "order_created",
    phone: order.customer.phone,
    name: "Max Mustermann",
    orderNumber: order.orderNumber,
    reason: "New Fragmento order placed",
  });
});
