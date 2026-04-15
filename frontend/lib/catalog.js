import { KitchenStatus, ItemType, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const LOCKED_BASE_COLORS = ["springgreen", "red", "#7f001f", "#980026"];
export const MONTAGE_REQUIRED_CODES = [
  "CAB-BASE-030",
  "CAB-WALL-L-060",
  "CAB-WALL-R-060",
  "CAB-WALL-B-L-600",
  "CAB-WALL-B-ML-600",
  "CAB-HOOD-B-600",
  "CAB-WALL-B-MR-600",
  "CAB-WALL-B-R-600",
  "HOOD-B-FH664621E",
  "WM-B-EWA34660W",
  "SINKBASE-B-600",
  "DISH-B-600-STD",
  "OVEN-B-600-HOB",
  "CAB-BASE-B-STR",
  "HOOD-C-FH664621E",
  "CAB-COOK-C-L-600",
  "OVEN-C-600-HOB",
  "CAB-COOK-C-R-600",
  "CAB-WALL-C-L-600",
  "CAB-WALL-C-ML-600",
  "CAB-WALL-C-MR-600",
  "CAB-WALL-C-R-600",
  "WM-C-EWA34660W",
  "SINKBASE-C-600",
  "DISH-C-600-STD",
  "CAB-DRAWER-C-3D",
];
export const LEGACY_ICON_KEYS = [
  "dishwasher",
  "refrigerator",
  "base_cabinet_30",
  "wall_cabinet_l",
  "wall_cabinet_r",
  "extractor_hood",
  "wall_cabinet_single_light",
  "wall_cabinet_double_light",
  "wall_cabinet_plain",
  "washing_machine_base",
  "sink_base",
  "dishwasher_base",
  "oven_base",
  "drawer_base",
  "worktop",
  "drawer_base_two",
  "drawer_base_three",
  "tall_refrigerator",
  "extractor_hood_chimney",
  "wall_cabinet_standard",
  "under_cabinet_light",
  "sink_faucet",
  "waste_system",
  "cutlery_insert",
  "lighting_set",
  "delivery_assembly",
  "pickup",
];

export async function getActiveKitchens() {
  return prisma.kitchen.findMany({
    where: { status: KitchenStatus.ACTIVE },
    orderBy: { name: "asc" },
  });
}

export async function getKitchenBySlug(slug) {
  return prisma.kitchen.findUnique({
    where: { slug },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

export async function listKitchensForAdmin() {
  return prisma.kitchen.findMany({
    include: {
      _count: { select: { items: true, orders: true, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKitchenById(id) {
  const kitchen = await prisma.kitchen.findUnique({
    where: { id },
    include: {
      _count: { select: { items: true, orders: true, contracts: true } },
      contracts: {
        orderBy: [{ createdAt: "desc" }, { contractNumber: "asc" }],
      },
      items: {
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!kitchen) return null;
  return {
    ...kitchen,
    contracts: await attachOwnersToContracts(kitchen.contracts),
  };
}

export async function listPropertyOwnersForAdmin() {
  const owners = await prisma.$queryRaw`
    SELECT
      po."id",
      po."firstName",
      po."lastName",
      po."email",
      po."phone",
      po."notes",
      po."createdAt",
      po."updatedAt",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyOwner" po
    LEFT JOIN "KitchenContract" kc ON kc."ownerId" = po."id"
    GROUP BY po."id"
    ORDER BY po."lastName" ASC, po."firstName" ASC
  `;

  return owners.map((owner) => ({
    id: owner.id,
    firstName: owner.firstName,
    lastName: owner.lastName,
    email: owner.email,
    phone: owner.phone,
    notes: owner.notes,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt,
    _count: { contracts: Number(owner.contractCount || 0) },
  }));
}

export async function listKitchenContractsForAdmin(filters = {}) {
  const whereParts = [];
  const havingParts = [];
  if (filters.kitchenId) whereParts.push(Prisma.sql`kc."kitchenId" = ${filters.kitchenId}`);
  if (filters.ownerId) whereParts.push(Prisma.sql`kc."ownerId" = ${filters.ownerId}`);
  if (filters.status === "active") whereParts.push(Prisma.sql`kc."isActive" = true`);
  if (filters.status === "inactive") whereParts.push(Prisma.sql`kc."isActive" = false`);
  if (filters.usage === "unused") havingParts.push(Prisma.sql`COUNT(o."id") = 0`);
  if (filters.usage === "used") havingParts.push(Prisma.sql`COUNT(o."id") >= 1`);
  if (filters.usage === "once") havingParts.push(Prisma.sql`COUNT(o."id") = 1`);
  if (filters.usage === "multiple") havingParts.push(Prisma.sql`COUNT(o."id") >= 2`);
  if (filters.query) {
    const query = `%${filters.query}%`;
    whereParts.push(Prisma.sql`(
      kc."contractNumber" ILIKE ${query}
      OR kc."city" ILIKE ${query}
      OR kc."postalCode" ILIKE ${query}
      OR kc."address1" ILIKE ${query}
      OR po."firstName" ILIKE ${query}
      OR po."lastName" ILIKE ${query}
      OR k."name" ILIKE ${query}
    )`);
  }

  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;
  const havingSql = havingParts.length ? Prisma.sql`HAVING ${Prisma.join(havingParts, " AND ")}` : Prisma.empty;
  const rows = await prisma.$queryRaw`
    SELECT
      kc."id",
      kc."contractNumber",
      kc."kitchenId",
      kc."ownerId",
      kc."isActive",
      kc."usedAt",
      kc."country",
      kc."city",
      kc."postalCode",
      kc."address1",
      kc."address2",
      kc."building",
      kc."floor",
      kc."unitNumber",
      kc."notes",
      kc."createdAt",
      kc."updatedAt",
      k."id" AS "kitchenRecordId",
      k."slug" AS "kitchenSlug",
      k."name" AS "kitchenName",
      po."id" AS "ownerRecordId",
      po."firstName",
      po."lastName",
      po."email",
      po."phone",
      po."notes" AS "ownerNotes",
      COUNT(o."id")::int AS "orderCount"
    FROM "KitchenContract" kc
    JOIN "Kitchen" k ON k."id" = kc."kitchenId"
    LEFT JOIN "PropertyOwner" po ON po."id" = kc."ownerId"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
    ${whereSql}
    GROUP BY kc."id", k."id", po."id"
    ${havingSql}
    ORDER BY kc."createdAt" DESC, kc."contractNumber" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    contractNumber: row.contractNumber,
    kitchenId: row.kitchenId,
    ownerId: row.ownerId,
    isActive: row.isActive,
    usedAt: row.usedAt,
    country: row.country,
    city: row.city,
    postalCode: row.postalCode,
    address1: row.address1,
    address2: row.address2,
    building: row.building,
    floor: row.floor,
    unitNumber: row.unitNumber,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    kitchen: {
      id: row.kitchenRecordId,
      slug: row.kitchenSlug,
      name: row.kitchenName,
    },
    owner: row.ownerRecordId
      ? {
          id: row.ownerRecordId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          notes: row.ownerNotes,
        }
      : null,
    _count: { orders: Number(row.orderCount || 0) },
  }));
}

async function attachOwnersToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  const rows = await prisma.$queryRaw`
    SELECT
      kc."id" AS "contractId",
      kc."ownerId",
      po."id" AS "ownerRecordId",
      po."firstName",
      po."lastName",
      po."email",
      po."phone",
      po."notes",
      po."createdAt",
      po."updatedAt"
    FROM "KitchenContract" kc
    LEFT JOIN "PropertyOwner" po ON po."id" = kc."ownerId"
    WHERE kc."id" IN (${Prisma.join(contractIds)})
  `;
  const ownerByContractId = new Map(
    rows.map((row) => [
      row.contractId,
      {
        ownerId: row.ownerId || null,
        owner: row.ownerRecordId
          ? {
              id: row.ownerRecordId,
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            }
          : null,
      },
    ]),
  );

  return contracts.map((contract) => ({
    ...contract,
    ownerId: ownerByContractId.get(contract.id)?.ownerId || null,
    owner: ownerByContractId.get(contract.id)?.owner || null,
  }));
}

export function serializeKitchenForLegacy(kitchen) {
  const items = kitchen.items || [];
  const toClientItem = (item) => ({
    id: item.id,
    code: item.code,
    articleNumber: item.articleNumber || "",
    name: item.name,
    price: Number(item.price),
    infoText: item.infoText || "",
    iconKey: item.iconKey || "",
    colorKey: item.colorKey || "",
    componentKey: item.componentKey || "",
    isLocked: item.isLocked,
    itemType: item.itemType.toLowerCase(),
  });

  return {
    kitchen: {
      id: kitchen.id,
      slug: kitchen.slug,
      name: kitchen.name,
      description: kitchen.description || "",
    },
    components: items.filter((item) => item.itemType === ItemType.COMPONENT).map(toClientItem),
    accessories: items.filter((item) => item.itemType === ItemType.ACCESSORY).map(toClientItem),
    services: items.filter((item) => item.itemType === ItemType.SERVICE).map(toClientItem),
    lockedBaseColors: LOCKED_BASE_COLORS,
    montageRequiredCodes: MONTAGE_REQUIRED_CODES,
  };
}

export async function getOrdersForAdmin(filters = {}) {
  const where = {};

  if (filters.kitchenId) where.kitchenId = filters.kitchenId;
  if (filters.status && Object.values(OrderStatus).includes(filters.status)) where.status = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      kitchen: true,
      kitchenContract: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return addContractOrderSequence(await attachOwnersToOrderContracts(orders));
}

export async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      kitchen: true,
      kitchenContract: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;
  const [sequencedOrder] = await addContractOrderSequence(await attachOwnersToOrderContracts([order]));
  return sequencedOrder;
}

async function attachOwnersToOrderContracts(orders) {
  const contracts = orders.map((order) => order.kitchenContract).filter(Boolean);
  const hydratedContracts = await attachOwnersToContracts(contracts);
  const contractById = new Map(hydratedContracts.map((contract) => [contract.id, contract]));

  return orders.map((order) => ({
    ...order,
    kitchenContract: order.kitchenContractId ? contractById.get(order.kitchenContractId) || order.kitchenContract : order.kitchenContract,
  }));
}

async function addContractOrderSequence(orders) {
  const contractIds = [...new Set(orders.map((order) => order.kitchenContractId).filter(Boolean))];
  if (!contractIds.length) {
    return orders.map((order) => ({
      ...order,
      contractOrderSequence: null,
      contractOrderCount: null,
    }));
  }

  const allContractOrders = await prisma.order.findMany({
    where: {
      kitchenContractId: { in: contractIds },
    },
    select: {
      id: true,
      kitchenContractId: true,
      createdAt: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const sequenceByOrderId = new Map();
  const countByContractId = new Map();

  allContractOrders.forEach((order) => {
    const nextSequence = (countByContractId.get(order.kitchenContractId) || 0) + 1;
    countByContractId.set(order.kitchenContractId, nextSequence);
    sequenceByOrderId.set(order.id, nextSequence);
  });

  return orders.map((order) => ({
    ...order,
    contractOrderSequence: order.kitchenContractId ? sequenceByOrderId.get(order.id) || 1 : null,
    contractOrderCount: order.kitchenContractId ? countByContractId.get(order.kitchenContractId) || 1 : null,
  }));
}
