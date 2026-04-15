import { ItemType, KitchenStatus, OrderStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const CONTRACT_ERRORS = {
  REQUIRED: "Contract number is required.",
  NOT_FOUND: "Contract number was not found.",
  INACTIVE: "This contract number is not active.",
  KITCHEN_UNAVAILABLE: "The kitchen for this contract number is not available.",
  KITCHEN_MISMATCH: "Contract number does not match the selected kitchen.",
};

const EDITABLE_ORDER_STATUSES = new Set([OrderStatus.NEW]);

export function normalizeContractNumber(value) {
  return String(value || "").trim();
}

export function contractValidationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function isEditableOrderStatus(status) {
  return EDITABLE_ORDER_STATUSES.has(status);
}

export function assertUsableKitchenContract(contract) {
  if (!contract) {
    throw contractValidationError(CONTRACT_ERRORS.NOT_FOUND, 404);
  }
  if (!contract.isActive) {
    throw contractValidationError(CONTRACT_ERRORS.INACTIVE);
  }
  if (!contract.kitchen || contract.kitchen.status !== KitchenStatus.ACTIVE) {
    throw contractValidationError(CONTRACT_ERRORS.KITCHEN_UNAVAILABLE);
  }
}

export async function getKitchenContractForAccess(contractNumber) {
  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  if (!normalizedContractNumber) {
    throw contractValidationError(CONTRACT_ERRORS.REQUIRED);
  }

  const contract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: normalizedContractNumber },
    include: { kitchen: true },
  });

  assertUsableKitchenContract(contract);
  return contract;
}

export async function getEditableOrderForContract(kitchenContractId, client = prisma, includeItems = false) {
  if (!kitchenContractId) return null;

  const editableOrders = await client.order.findMany({
    where: {
      kitchenContractId,
      status: { in: [...EDITABLE_ORDER_STATUSES] },
    },
    include: includeItems ? { items: { orderBy: { createdAt: "asc" } } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  if (editableOrders.length > 1) {
    console.warn(
      `Multiple editable orders found for kitchenContractId=${kitchenContractId}; using newest order ${editableOrders[0].id}.`,
    );
  }

  return editableOrders[0] || null;
}

export async function getContractOrderState(kitchenContractId, client = prisma) {
  if (!kitchenContractId) {
    return {
      editableOrder: null,
      confirmedOrders: [],
      confirmedItems: [],
    };
  }

  const editableOrder = await getEditableOrderForContract(kitchenContractId, client, true);
  const confirmedOrders = await client.order.findMany({
    where: {
      kitchenContractId,
      status: OrderStatus.CONFIRMED,
    },
    include: {
      items: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    editableOrder,
    confirmedOrders,
    confirmedItems: confirmedOrders.flatMap((order) =>
      (order.items || []).map((item) => ({
        ...item,
        sourceOrderId: order.id,
        sourceOrderNumber: order.orderNumber,
        sourceOrderCreatedAt: order.createdAt,
      })),
    ),
  };
}

export function buildConfirmedItemCodeSets(confirmedItems = []) {
  const sets = {
    [ItemType.COMPONENT]: new Set(),
    [ItemType.ACCESSORY]: new Set(),
    [ItemType.SERVICE]: new Set(),
  };

  confirmedItems.forEach((item) => {
    if (!sets[item.itemType]) return;
    sets[item.itemType].add(item.code);
  });

  return sets;
}
