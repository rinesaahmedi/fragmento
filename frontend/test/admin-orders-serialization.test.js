import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalogSource = readFileSync(new URL("../lib/catalog.js", import.meta.url), "utf8");

test("admin order rows convert Prisma Decimal totals before reaching client components", () => {
  assert.match(
    catalogSource,
    /const serializableOrders = orders\.map\(\(order\) => \(\{[\s\S]*?totalPrice: Number\(order\.totalPrice \|\| 0\),[\s\S]*?return addContractOrderSequence\(serializableOrders, orderKind\)/,
  );
});
