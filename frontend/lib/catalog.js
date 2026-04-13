import { KitchenStatus, ItemType, OrderStatus } from "@prisma/client";
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
  return prisma.kitchen.findUnique({
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
}

export function serializeKitchenForLegacy(kitchen) {
  const items = kitchen.items || [];
  const toClientItem = (item) => ({
    id: item.id,
    code: item.code,
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

  return prisma.order.findMany({
    where,
    include: {
      kitchen: true,
      kitchenContract: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      kitchen: true,
      kitchenContract: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });
}
