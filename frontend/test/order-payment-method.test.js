import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ordersPath = path.join(__dirname, "..", "lib", "orders.js");

test("order payment validation accepts legacy payment labels as card checkout", () => {
  const source = fs.readFileSync(ordersPath, "utf8");

  assert.match(source, /\["card",\s*"card"\]/);
  assert.match(source, /\["visa",\s*"card"\]/);
  assert.match(source, /\["mastercard",\s*"card"\]/);
  assert.match(source, /\["paypal",\s*"card"\]/);
  assert.match(source, /\["klarna",\s*"card"\]/);
  assert.match(source, /return normalizedPaymentMethod;/);
});
