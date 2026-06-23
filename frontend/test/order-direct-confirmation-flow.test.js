import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersPath = path.join(__dirname, "..", "lib", "orders.js");
const source = fs.readFileSync(ordersPath, "utf8");

test("order creation keeps webhook enabled while making direct email setting-controlled", () => {
  assert.match(source, /getDirectOrderConfirmationEnabled/);
  assert.match(source, /const directOrderConfirmationEnabled = await getDirectOrderConfirmationEnabled\(\);/);
  assert.match(source, /runEmail:\s*directOrderConfirmationEnabled/);
  assert.match(source, /runWebhook:\s*true/);
});

test("direct confirmation updates order status only after email success", () => {
  assert.match(
    source,
    /if \(directOrderConfirmationEnabled && notificationResult\.emailSent\) \{\s*await prisma\.order\.update\(\{/s,
  );
  assert.match(source, /data:\s*\{\s*status:\s*OrderStatus\.CONFIRMED\s*\}/);
  assert.doesNotMatch(source, /data:\s*\{\s*status:\s*OrderStatus\.CONFIRMED\s*\}[\s\S]*notificationResult\.emailError/);
});
