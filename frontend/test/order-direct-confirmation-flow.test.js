import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersPath = path.join(__dirname, "..", "lib", "orders.js");
const stripePaymentsPath = path.join(__dirname, "..", "lib", "stripe-payments.js");
const ordersSource = fs.readFileSync(ordersPath, "utf8");
const stripePaymentsSource = fs.readFileSync(stripePaymentsPath, "utf8");

test("order creation does not send confirmation or webhook before payment", () => {
  assert.doesNotMatch(ordersSource, /getDirectOrderConfirmationEnabled/);
  assert.match(ordersSource, /runEmail:\s*false/);
  assert.match(ordersSource, /runWebhook:\s*false/);
});

test("paid Stripe checkout sends automatic confirmation after successful payment", () => {
  assert.match(stripePaymentsSource, /getDirectOrderConfirmationEnabled/);
  assert.match(stripePaymentsSource, /maybeSendPaidOrderConfirmation\(updatedOrder\)/);
  assert.match(stripePaymentsSource, /paymentStatus:\s*isPaid \? "PAID"/);
  assert.match(stripePaymentsSource, /await sendOrderConfirmationEmail\(\{\s*order\s*\}\)/);
  assert.match(stripePaymentsSource, /data:\s*\{\s*status:\s*"CONFIRMED"\s*\}/);
  assert.match(stripePaymentsSource, /orderStatus === "CONFIRMED" \|\| orderStatus === "EMAILED" \|\| orderStatus === "CANCELLED"/);
});
