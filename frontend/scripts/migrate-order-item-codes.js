const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const LEGACY_CODE_BY_KITCHEN = {
  "kitchen-model-b": {
    "model-b-wall-cabinet-1": "CAB-WALL-B-L-600",
    "model-b-wall-cabinet-2": "CAB-WALL-B-ML-600",
    "model-b-wall-cabinet-3": "CAB-HOOD-B-600",
    "model-b-wall-cabinet-4": "CAB-WALL-B-MR-600",
    "model-b-wall-cabinet-5": "CAB-WALL-B-R-600",
    "model-b-extractor-hood": "HOOD-B-FH664621E",
    "model-b-under-cabinet-light": "LIGHT-B-LED-001",
    "model-b-base-module-1": "WM-B-EWA34660W",
    "model-b-base-module-2": "SINKBASE-B-600",
    "model-b-base-module-3": "DISH-B-600-STD",
    "model-b-worktop": "TOP-B-3036",
    "model-b-oven-module": "OVEN-B-600-HOB",
    "model-b-drawer-module": "CAB-BASE-B-STR",
    "model-b-refrigerator": "REF-B-545-1800-700",
    "model-b-sink-faucet": "SINK-B-BOTTON-45",
    "acc-waste": "ACC-WASTE-001",
    "acc-cutlery": "ACC-CUTLERY-ZB60SG",
    "acc-lighting": "ACC-LIGHT-003",
    "service-montage": "SVC-MONTAGE-001",
    "service-pickup": "SVC-PICKUP-001",
  },
  "kitchen-model-c": {
    "model-c-refrigerator": "REF-C-545-1800-700",
    "model-c-extractor-hood": "HOOD-C-FH664621E",
    "model-c-cook-base-left": "CAB-COOK-C-L-600",
    "model-c-oven-base": "OVEN-C-600-HOB",
    "model-c-cook-base-right": "CAB-COOK-C-R-600",
    "model-c-wall-cabinet-1": "CAB-WALL-C-L-600",
    "model-c-wall-cabinet-2": "CAB-WALL-C-ML-600",
    "model-c-wall-cabinet-3": "CAB-WALL-C-MR-600",
    "model-c-wall-cabinet-4": "CAB-WALL-C-R-600",
    "model-c-under-cabinet-light": "LIGHT-C-LED-001",
    "model-c-wm-base": "WM-C-EWA34660W",
    "model-c-sink-base": "SINKBASE-C-600",
    "model-c-dishwasher-base": "DISH-C-600-STD",
    "model-c-worktop": "TOP-C-4000",
    "model-c-drawer-base-3": "CAB-DRAWER-C-3D",
    "model-c-sink-faucet": "SINK-C-BOTTON-45",
    "acc-waste": "ACC-WASTE-001",
    "acc-cutlery": "ACC-CUTLERY-001",
    "acc-lighting": "ACC-LIGHT-003",
    "service-montage": "SVC-MONTAGE-001",
    "service-pickup": "SVC-PICKUP-001",
  },
};

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildUniqueMap(items, keyFn) {
  const values = new Map();
  const duplicates = new Set();

  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (values.has(key)) {
      duplicates.add(key);
      continue;
    }
    values.set(key, item);
  }

  for (const key of duplicates) values.delete(key);
  return values;
}

function resolveKitchenItem({ orderItem, kitchen, byId, byCode, byName }) {
  if (orderItem.kitchenItemId && byId.has(orderItem.kitchenItemId)) {
    return { item: byId.get(orderItem.kitchenItemId), strategy: "kitchenItemId" };
  }

  const mappedCode = LEGACY_CODE_BY_KITCHEN[kitchen.slug]?.[orderItem.code];
  if (mappedCode && byCode.has(mappedCode)) {
    return { item: byCode.get(mappedCode), strategy: "legacyCodeMap" };
  }

  if (orderItem.code && byCode.has(orderItem.code)) {
    return { item: byCode.get(orderItem.code), strategy: "alreadyCurrentCode" };
  }

  const nameKey = normalize(orderItem.nameSnapshot);
  if (nameKey && byName.has(nameKey)) {
    return { item: byName.get(nameKey), strategy: "nameSnapshot" };
  }

  return { item: null, strategy: "noMatch" };
}

async function main() {
  const apply = process.argv.includes("--apply");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      kitchen: {
        include: {
          items: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const planned = [];
  const skipped = [];
  let alreadyCorrect = 0;

  for (const order of orders) {
    const kitchenItems = order.kitchen.items || [];
    const byId = new Map(kitchenItems.map((item) => [item.id, item]));
    const byCode = new Map(kitchenItems.map((item) => [item.code, item]));
    const byName = buildUniqueMap(kitchenItems, (item) => normalize(item.name));

    for (const orderItem of order.items) {
      const { item: kitchenItem, strategy } = resolveKitchenItem({
        orderItem,
        kitchen: order.kitchen,
        byId,
        byCode,
        byName,
      });

      if (!kitchenItem) {
        skipped.push({
          orderNumber: order.orderNumber,
          orderItemId: orderItem.id,
          oldCode: orderItem.code,
          name: orderItem.nameSnapshot,
          reason: strategy,
        });
        continue;
      }

      if (orderItem.code === kitchenItem.code) {
        alreadyCorrect += 1;
        continue;
      }

      planned.push({
        orderNumber: order.orderNumber,
        orderItemId: orderItem.id,
        itemName: orderItem.nameSnapshot,
        oldCode: orderItem.code,
        newCode: kitchenItem.code,
        strategy,
      });
    }
  }

  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Orders scanned: ${orders.length}`);
  console.log(`Order items already correct: ${alreadyCorrect}`);
  console.log(`Order items to update: ${planned.length}`);
  console.log(`Order items skipped: ${skipped.length}`);

  for (const change of planned) {
    console.log(
      `[UPDATE:${change.strategy}] ${change.orderNumber} | ${change.orderItemId} | ${change.oldCode} -> ${change.newCode} | ${change.itemName}`,
    );
  }

  for (const skip of skipped) {
    console.warn(
      `[SKIP:${skip.reason}] ${skip.orderNumber} | ${skip.orderItemId} | ${skip.oldCode} | ${skip.name}`,
    );
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to update OrderItem.code values.");
    return;
  }

  await prisma.$transaction(
    planned.map((change) =>
      prisma.orderItem.updateMany({
        where: {
          id: change.orderItemId,
          code: change.oldCode,
        },
        data: {
          code: change.newCode,
        },
      }),
    ),
  );

  console.log(`Applied ${planned.length} OrderItem.code update(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
