import { KitchenStatus, ItemType, OrderStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const LOCKED_BASE_COLORS = ["springgreen", "red", "#7f001f", "#980026"];
export const MONTAGE_REQUIRED_CODES = [
  "component-base-cabinet-30",
  "component-wall-cabinet-left",
  "component-wall-cabinet-right",
  "model-b-wall-cabinet-1",
  "model-b-wall-cabinet-2",
  "model-b-wall-cabinet-3",
  "model-b-wall-cabinet-4",
  "model-b-wall-cabinet-5",
  "model-b-base-module-1",
  "model-b-base-module-2",
  "model-b-base-module-3",
  "model-b-oven-module",
  "model-b-drawer-module",
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
  "tall_refrigerator",
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
      _count: { select: { items: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKitchenById(id) {
  return prisma.kitchen.findUnique({
    where: { id },
    include: {
      _count: { select: { items: true, orders: true } },
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
      items: { orderBy: { createdAt: "asc" } },
    },
  });
}
