const fs = require("fs");
const path = require("path");
const { PrismaClient, OrderStatus, ItemType } = require("@prisma/client");

function loadEnvFile() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const prisma = new PrismaClient();

const OWNER_FIRST_NAMES = [
  "Anna",
  "Lukas",
  "Sophie",
  "Daniel",
  "Laura",
  "Mateo",
  "Elena",
  "Jonas",
  "Nora",
  "David",
  "Mila",
  "Adrian",
  "Lea",
  "Felix",
  "Sara",
  "Noah",
];

const OWNER_LAST_NAMES = [
  "Schmidt",
  "Weber",
  "Muller",
  "Fischer",
  "Becker",
  "Hoffmann",
  "Wagner",
  "Keller",
  "Bauer",
  "Meyer",
  "Winter",
  "Hartmann",
];

const LOCATIONS = [
  { country: "Germany", city: "Berlin", postalCode: "10115" },
  { country: "Germany", city: "Hamburg", postalCode: "20095" },
  { country: "Germany", city: "Munich", postalCode: "80331" },
  { country: "Austria", city: "Vienna", postalCode: "1010" },
  { country: "Austria", city: "Graz", postalCode: "8010" },
  { country: "Hungary", city: "Budapest", postalCode: "1051" },
  { country: "Hungary", city: "Debrecen", postalCode: "4024" },
  { country: "Switzerland", city: "Zurich", postalCode: "8001" },
  { country: "Czechia", city: "Prague", postalCode: "11000" },
  { country: "Slovakia", city: "Bratislava", postalCode: "81101" },
  { country: "Poland", city: "Warsaw", postalCode: "00-001" },
  { country: "Kosovo", city: "Prishtina", postalCode: "10000" },
];

const PAYMENT_METHODS = ["Invoice", "Bank transfer", "Card", "Installments"];
const ORDER_NOTES = [
  "Customer requested morning delivery.",
  "Please call before arrival.",
  "Mounting team required.",
  "Building access code available.",
  "Customer wants order confirmation by email.",
  "Pickup option discussed.",
  "",
];

const STATUS_WEIGHTS = [
  { status: OrderStatus.CONFIRMED, weight: 34 },
  { status: OrderStatus.EMAILED, weight: 28 },
  { status: OrderStatus.NEW, weight: 24 },
  { status: OrderStatus.CANCELLED, weight: 14 },
];

const DEMO_BATCH_TAG = "dashboard-demo-v1";
const DEMO_ORDER_EMAIL_PREFIX = "demo.customer.";
const DEMO_ORDER_EMAIL_DOMAIN = "@fragmento.local";
const DEMO_ORDER_FILTER = {
  email: {
    startsWith: DEMO_ORDER_EMAIL_PREFIX,
    endsWith: DEMO_ORDER_EMAIL_DOMAIN,
  },
};
const DEFAULT_OWNER_COUNT = 14;
const DEFAULT_CONTRACT_COUNT = 30;
const DEFAULT_ORDER_COUNT = 60;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(list) {
  return list[randomInt(0, list.length - 1)];
}

function weightedStatus() {
  const total = STATUS_WEIGHTS.reduce((sum, row) => sum + row.weight, 0);
  let cursor = randomInt(1, total);
  for (const row of STATUS_WEIGHTS) {
    cursor -= row.weight;
    if (cursor <= 0) return row.status;
  }
  return OrderStatus.NEW;
}

function buildOrderNumber(batchPrefix, index) {
  return `${batchPrefix}-${String(index + 1).padStart(4, "0")}`;
}

function randomDateWithinDays(daysBack) {
  const now = Date.now();
  const min = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(randomInt(min, now));
}

function formatPhone(index) {
  return `+49 30 555 ${String(1000 + index).padStart(4, "0")}`;
}

function pickKitchenItems(kitchen) {
  const components = kitchen.items.filter((item) => item.itemType === ItemType.COMPONENT && item.isActive);
  const accessories = kitchen.items.filter((item) => item.itemType === ItemType.ACCESSORY && item.isActive);
  const services = kitchen.items.filter((item) => item.itemType === ItemType.SERVICE && item.isActive);

  const chosen = [];
  const componentPool = [...components].sort(() => Math.random() - 0.5);
  const accessoryPool = [...accessories].sort(() => Math.random() - 0.5);
  const servicePool = [...services].sort(() => Math.random() - 0.5);

  const componentCount = Math.max(2, Math.min(componentPool.length, randomInt(3, 5)));
  for (const item of componentPool.slice(0, componentCount)) {
    chosen.push({ kitchenItem: item, quantity: 1 });
  }

  const accessoryCount = Math.min(accessoryPool.length, randomInt(0, 2));
  for (const item of accessoryPool.slice(0, accessoryCount)) {
    chosen.push({ kitchenItem: item, quantity: randomInt(1, 2) });
  }

  if (servicePool.length && Math.random() > 0.35) {
    chosen.push({ kitchenItem: servicePool[0], quantity: 1 });
  }

  return chosen;
}

async function ensureOwners(targetCount) {
  const existing = await prisma.housingCompany.findMany({
    where: { notes: { contains: DEMO_BATCH_TAG } },
    include: { propertyObjects: true },
    orderBy: { createdAt: "asc" },
  });

  const owners = [...existing];
  for (let index = existing.length; index < targetCount; index += 1) {
    const firstName = OWNER_FIRST_NAMES[index % OWNER_FIRST_NAMES.length];
    const lastName = OWNER_LAST_NAMES[index % OWNER_LAST_NAMES.length];
    const location = LOCATIONS[index % LOCATIONS.length];
    const owner = await prisma.housingCompany.create({
      data: {
        name: `${firstName} ${lastName} Housing`,
        email: `demo.owner.${index + 1}@fragmento.local`,
        phone: formatPhone(index + 1),
        notes: `${DEMO_BATCH_TAG} owner ${index + 1}`,
        propertyObjects: {
          create: {
            name: `Building ${(index % 8) + 1}`,
            country: location.country,
            city: location.city,
            postalCode: location.postalCode,
            address1: `Demo Street ${index + 1}`,
            address2: index % 3 === 0 ? `Entrance ${randomInt(1, 4)}` : null,
          },
        },
      },
      include: { propertyObjects: true },
    });
    owners.push(owner);
  }

  for (const [index, owner] of owners.entries()) {
    const propertyObject = owner.propertyObjects?.[0];
    if (!propertyObject) continue;

    await prisma.project.upsert({
      where: { propertyObjectId: propertyObject.id },
      update: {
        housingCompanyId: owner.id,
        name: `Demo Project ${(index % 8) + 1}`,
      },
      create: {
        propertyObjectId: propertyObject.id,
        housingCompanyId: owner.id,
        name: `Demo Project ${(index % 8) + 1}`,
      },
    });
  }

  return owners;
}

async function ensureContracts(kitchens, owners, targetCount) {
  const existing = await prisma.kitchenContract.findMany({
    where: { notes: { contains: DEMO_BATCH_TAG } },
    include: { project: { include: { propertyObject: true } } },
    orderBy: { createdAt: "asc" },
  });

  const contracts = [...existing];
  for (let index = existing.length; index < targetCount; index += 1) {
    const kitchen = kitchens[index % kitchens.length];
    const owner = owners[index % owners.length];
    const propertyObject = owner.propertyObjects[0];
    const project = propertyObject
      ? await prisma.project.findUnique({ where: { propertyObjectId: propertyObject.id }, select: { id: true } })
      : null;
    const contract = await prisma.kitchenContract.create({
      data: {
        contractNumber: `DM-${String(800000 + index)}`,
        kitchenId: kitchen.id,
        projectId: project?.id,
        isActive: true,
        building: propertyObject?.name || `B${(index % 8) + 1}`,
        floor: String((index % 5) + 1),
        unitNumber: `${(index % 12) + 1}`,
        notes: `${DEMO_BATCH_TAG} contract ${index + 1}`,
      },
      include: { project: { include: { propertyObject: true } } },
    });
    contracts.push(contract);
  }

  return contracts;
}

async function trimDemoOrders(targetCount) {
  const demoOrders = await prisma.order.findMany({
    where: DEMO_ORDER_FILTER,
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (demoOrders.length <= targetCount) {
    return { removed: 0, remaining: demoOrders.length };
  }

  const idsToDelete = demoOrders.slice(targetCount).map((order) => order.id);
  await prisma.order.deleteMany({
    where: { id: { in: idsToDelete } },
  });

  return { removed: idsToDelete.length, remaining: targetCount };
}

async function createDemoOrders(orderCount, options = {}) {
  const { removed, remaining } = await trimDemoOrders(orderCount);
  const missingOrderCount = Math.max(orderCount - remaining, 0);

  if (missingOrderCount === 0) {
    return {
      created: 0,
      removed,
      kitchens: 0,
      owners: 0,
      contracts: 0,
      totalDemoOrders: remaining,
    };
  }

  const excludedKitchenSlugs = new Set(options.excludedKitchenSlugs || []);

  const kitchens = await prisma.kitchen.findMany({
    where: { status: "ACTIVE" },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      contracts: true,
    },
  });

  const filteredKitchens = kitchens.filter((kitchen) => !excludedKitchenSlugs.has(kitchen.slug));

  if (!filteredKitchens.length) {
    throw new Error("No active kitchens available after exclusions.");
  }

  if (!kitchens.length) {
    throw new Error("No active kitchens found. Run the main seed first.");
  }

  const owners = await ensureOwners(DEFAULT_OWNER_COUNT);
  const contracts = await ensureContracts(filteredKitchens, owners, DEFAULT_CONTRACT_COUNT);
  const contractsByKitchenId = new Map();

  for (const kitchen of filteredKitchens) {
    const kitchenContracts = contracts.filter((contract) => contract.kitchenId === kitchen.id);
    contractsByKitchenId.set(kitchen.id, kitchenContracts);
  }

  const batchPrefix = `DM${Date.now().toString().slice(-8)}`;
  let created = 0;

  for (let index = 0; index < missingOrderCount; index += 1) {
    const globalIndex = remaining + index;
    const kitchen = filteredKitchens[index % filteredKitchens.length];
    const kitchenContracts = contractsByKitchenId.get(kitchen.id) || [];
    const contract = kitchenContracts.length ? sample(kitchenContracts) : null;
    const location = contract
      ? {
          country: contract.project?.propertyObject?.country || sample(LOCATIONS).country,
          city: contract.project?.propertyObject?.city || sample(LOCATIONS).city,
          postalCode: contract.project?.propertyObject?.postalCode || sample(LOCATIONS).postalCode,
          address1: contract.project?.propertyObject?.address1 || `Demo Street ${index + 1}`,
          address2: contract.project?.propertyObject?.address2 || null,
        }
      : { ...sample(LOCATIONS), address1: `Demo Street ${globalIndex + 1}`, address2: null };

    const firstName = OWNER_FIRST_NAMES[(globalIndex * 3) % OWNER_FIRST_NAMES.length];
    const lastName = OWNER_LAST_NAMES[(globalIndex * 5) % OWNER_LAST_NAMES.length];
    const selectedItems = pickKitchenItems(kitchen);

    const totalPrice = selectedItems.reduce((sum, row) => {
      const unitPrice = Number(row.kitchenItem.price || 0);
      return sum + unitPrice * row.quantity;
    }, 0);

    const status = weightedStatus();
    const createdAt = randomDateWithinDays(110);
    const updatedAt = new Date(createdAt.getTime() + randomInt(1, 96) * 60 * 60 * 1000);

    await prisma.order.create({
      data: {
        orderNumber: buildOrderNumber(batchPrefix, index),
        kitchenId: kitchen.id,
        kitchenContractId: contract?.id || null,
        status,
        contractNumber: contract?.contractNumber || null,
        firstName,
        lastName,
        email: `demo.customer.${globalIndex + 1}${DEMO_ORDER_EMAIL_DOMAIN}`,
        phone: formatPhone(globalIndex + 101),
        address1: location.address1,
        address2: location.address2,
        postalCode: location.postalCode,
        city: location.city,
        country: location.country,
        notes: ORDER_NOTES[globalIndex % ORDER_NOTES.length] || null,
        paymentMethod: PAYMENT_METHODS[globalIndex % PAYMENT_METHODS.length],
        totalPrice: totalPrice.toFixed(2),
        createdAt,
        updatedAt,
        items: {
          create: selectedItems.map(({ kitchenItem, quantity }) => ({
            kitchenItemId: kitchenItem.id,
            itemType: kitchenItem.itemType,
            code: kitchenItem.code,
            nameSnapshot: kitchenItem.name,
            priceSnapshot: String(kitchenItem.price),
            quantity,
            createdAt,
          })),
        },
      },
    });

    if (contract && status === OrderStatus.CONFIRMED) {
      await prisma.kitchenContract.update({
        where: { id: contract.id },
        data: {
          usedAt: createdAt,
        },
      });
    }

    created += 1;
  }

  return {
    created,
    removed,
    kitchens: filteredKitchens.length,
    owners: owners.length,
    contracts: contracts.length,
    totalDemoOrders: remaining + created,
  };
}

async function main() {
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  const excludeKitchenArgs = process.argv
    .filter((arg) => arg.startsWith("--exclude-kitchen="))
    .map((arg) => arg.split("=")[1])
    .filter(Boolean);
  const orderCount = countArg ? Number.parseInt(countArg.split("=")[1], 10) : DEFAULT_ORDER_COUNT;

  if (!Number.isInteger(orderCount) || orderCount <= 0) {
    throw new Error("Use a positive integer for --count.");
  }

  const excludedKitchenSlugs = new Set(excludeKitchenArgs);

  const result = await createDemoOrders(orderCount, {
    excludedKitchenSlugs: [...excludedKitchenSlugs],
  });
  console.log(
    `Synced demo orders to ${result.totalDemoOrders} (created ${result.created}, removed ${result.removed}) across ${result.kitchens} kitchens, ${result.contracts} demo contracts, and ${result.owners} demo owners.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
