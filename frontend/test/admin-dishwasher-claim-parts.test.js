import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getDishwasherClaimPartDefinitions,
  syncDishwasherClaimPartsForAdminItem,
} from "../lib/admin-dishwasher-claim-parts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function dishwasherItem(overrides = {}) {
  return {
    kitchenId: "kitchen-1",
    code: "DISH-AB105747-450",
    articleNumber: "A-EGSPV587915 + TGV45",
    componentKey: "base-module-3",
    isActive: true,
    ...overrides,
  };
}

test("45 and 60 cm dishwasher packages resolve to their matching ASC parts", () => {
  assert.deepEqual(
    getDishwasherClaimPartDefinitions(dishwasherItem()).map((part) => [part.partKey, part.articleCode]),
    [["dishwasher", "A-EGSPV587915"], ["furniture-front", "TGV45"]],
  );
  assert.deepEqual(
    getDishwasherClaimPartDefinitions(dishwasherItem({
      code: "DISH-AB105747-600",
      articleNumber: "A-EGSPV597210 + TGV60",
    })).map((part) => [part.partKey, part.articleCode]),
    [["dishwasher", "A-EGSPV597210"], ["furniture-front", "TGV60"]],
  );
});

test("the Admin item update runs the dishwasher claim sync in the same transaction", () => {
  const route = fs.readFileSync(
    path.join(repoRoot, "app", "api", "admin", "items", "[id]", "route.js"),
    "utf8",
  );

  assert.match(route, /prisma\.\$transaction/);
  assert.match(route, /syncDishwasherClaimPartsForAdminItem\(\{[\s\S]*tx,[\s\S]*item: updatedItem,[\s\S]*previousItem: existingItem/);
});

test("Admin dishwasher changes update both ASC parts and preserve the exact source link", async () => {
  const upserts = [];
  const tx = {
    kitchenClaimPart: {
      findMany: async () => [
        { partKey: "dishwasher", articleCode: "A-EGSPV597210" },
        { partKey: "furniture-front", articleCode: "TGV60" },
      ],
      upsert: async (operation) => upserts.push(operation),
    },
  };
  const item = dishwasherItem();

  await syncDishwasherClaimPartsForAdminItem({
    tx,
    item,
    previousItem: dishwasherItem({
      code: "DISH-AB105747-600",
      articleNumber: "A-EGSPV597210 + TGV60",
    }),
  });

  assert.equal(upserts.length, 2);
  assert.deepEqual(upserts.map((operation) => operation.update.articleCode), ["A-EGSPV587915", "TGV45"]);
  for (const operation of upserts) {
    assert.equal(operation.update.sourceKitchenItemCode, item.code);
    assert.equal(operation.update.sourceComponentKey, item.componentKey);
    assert.equal(operation.update.isActive, true);
    assert.equal(operation.update.productInfoPdfPath, null);
  }
});

test("changing a dishwasher into another item deactivates its old ASC parts", async () => {
  const updates = [];
  const tx = {
    kitchenClaimPart: {
      updateMany: async (operation) => updates.push(operation),
    },
  };
  const previousItem = dishwasherItem();

  await syncDishwasherClaimPartsForAdminItem({
    tx,
    previousItem,
    item: dishwasherItem({ articleNumber: "CABINET-ARTICLE" }),
  });

  assert.deepEqual(updates, [{
    where: {
      kitchenId: previousItem.kitchenId,
      partKey: { in: ["dishwasher", "furniture-front"] },
      sourceKitchenItemCode: previousItem.code,
    },
    data: { isActive: false },
  }]);
});
