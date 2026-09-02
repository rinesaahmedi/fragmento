const path = require("path");
const { PrismaClient, KitchenStatus, OrderStatus } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const CONTRACT_PREFIX = "222";
const TEST_ORDER_EMAIL = "service-claims-test@fragmento.local";
const TEST_DATA_MARKER = "service-claims-all-items-test-v1";

function buildClaimsTestContractNumber(kitchen) {
  const code = String(kitchen?.kitchenCode || kitchen?.slug || "").replace(/\D/g, "");

  if (!code) {
    throw new Error(`Cannot build a 222 contract number for kitchen ${kitchen?.slug || kitchen?.id || "unknown"}.`);
  }

  return `${CONTRACT_PREFIX}${code}`;
}

function buildOrderItemData(orderId, item) {
  return {
    orderId,
    kitchenItemId: item.id,
    itemType: item.itemType,
    code: item.code,
    nameSnapshot: item.name,
    nameDeSnapshot: item.nameDe || null,
    articleNumberSnapshot: item.articleNumber || null,
    priceSnapshot: item.price,
    quantity: 1,
  };
}

function calculateOrderTotal(items) {
  return items.reduce((total, item) => total + Number(item.price || 0), 0).toFixed(2);
}

async function syncKitchenTestOrder(prisma, kitchen) {
  const contractNumber = buildClaimsTestContractNumber(kitchen);
  const orderNumber = `${contractNumber}-1`;
  const sourceProjectId = kitchen.contracts[0]?.projectId || null;

  return prisma.$transaction(async (tx) => {
    const existingContract = await tx.kitchenContract.findUnique({
      where: { contractNumber },
      select: { id: true, kitchenId: true, projectId: true },
    });

    if (existingContract && existingContract.kitchenId !== kitchen.id) {
      throw new Error(
        `Contract ${contractNumber} already belongs to another kitchen; no data was changed for ${kitchen.slug}.`,
      );
    }

    const contract = existingContract
      ? await tx.kitchenContract.update({
          where: { id: existingContract.id },
          data: {
            isActive: true,
            projectId: existingContract.projectId || sourceProjectId,
          },
        })
      : await tx.kitchenContract.create({
          data: {
            contractNumber,
            kitchenId: kitchen.id,
            projectId: sourceProjectId,
            isActive: true,
            notes: TEST_DATA_MARKER,
          },
        });

    const existingOrder = await tx.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        kitchenId: true,
        kitchenContractId: true,
        email: true,
        notes: true,
      },
    });

    if (
      existingOrder
      && (
        existingOrder.kitchenId !== kitchen.id
        || existingOrder.kitchenContractId !== contract.id
        || existingOrder.email !== TEST_ORDER_EMAIL
        || !String(existingOrder.notes || "").includes(TEST_DATA_MARKER)
      )
    ) {
      throw new Error(
        `Order number ${orderNumber} is already used by non-test data; no order data was changed for ${kitchen.slug}.`,
      );
    }

    const orderData = {
      kitchenId: kitchen.id,
      kitchenContractId: contract.id,
      contractNumber,
      status: OrderStatus.CONFIRMED,
      firstName: "Service Claims",
      lastName: "Test",
      email: TEST_ORDER_EMAIL,
      phone: "+49 000 222 000",
      address1: "Fragmento test data",
      postalCode: "00000",
      city: "Test",
      country: "Germany",
      notes: `${TEST_DATA_MARKER}; all active kitchen items are ordered`,
      paymentMethod: "Test",
      paymentStatus: "PAID",
      totalPrice: calculateOrderTotal(kitchen.items),
    };

    const order = existingOrder
      ? await tx.order.update({ where: { id: existingOrder.id }, data: orderData })
      : await tx.order.create({ data: { orderNumber, ...orderData } });

    if (existingOrder) {
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    }

    if (kitchen.items.length) {
      await tx.orderItem.createMany({
        data: kitchen.items.map((item) => buildOrderItemData(order.id, item)),
      });
    }

    await tx.kitchenContract.update({
      where: { id: contract.id },
      data: { usedAt: new Date() },
    });

    return {
      contractNumber,
      orderNumber,
      itemCount: kitchen.items.length,
      createdContract: !existingContract,
      createdOrder: !existingOrder,
    };
  });
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const kitchens = await prisma.kitchen.findMany({
      where: { status: KitchenStatus.ACTIVE },
      select: {
        id: true,
        slug: true,
        kitchenCode: true,
        items: {
          where: { isActive: true },
          orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
        },
        contracts: {
          where: { contractNumber: { startsWith: "670" } },
          select: { projectId: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
      orderBy: { slug: "asc" },
    });

    if (!kitchens.length) {
      throw new Error("No active kitchens found. Run the main seed first.");
    }

    const contractNumbers = new Set();
    for (const kitchen of kitchens) {
      const contractNumber = buildClaimsTestContractNumber(kitchen);
      if (contractNumbers.has(contractNumber)) {
        throw new Error(`More than one active kitchen resolves to contract ${contractNumber}.`);
      }
      contractNumbers.add(contractNumber);
    }

    const results = [];
    for (const kitchen of kitchens) {
      const result = await syncKitchenTestOrder(prisma, kitchen);
      results.push(result);
      console.log(`${kitchen.slug}: ${result.contractNumber} / ${result.orderNumber} (${result.itemCount} items)`);
    }

    const createdContracts = results.filter((result) => result.createdContract).length;
    const createdOrders = results.filter((result) => result.createdOrder).length;
    const itemCount = results.reduce((total, result) => total + result.itemCount, 0);

    console.log(
      `Service Claims test data complete. Kitchens: ${results.length}. `
      + `Contracts created: ${createdContracts}. Orders created: ${createdOrders}. `
      + `Ordered item snapshots: ${itemCount}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  CONTRACT_PREFIX,
  TEST_DATA_MARKER,
  TEST_ORDER_EMAIL,
  buildClaimsTestContractNumber,
  buildOrderItemData,
  calculateOrderTotal,
  syncKitchenTestOrder,
};
