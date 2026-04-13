import { KitchenStatus } from "@prisma/client";
import { prisma } from "./prisma";

export const CONTRACT_ERRORS = {
  REQUIRED: "Contract number is required.",
  NOT_FOUND: "Contract number was not found.",
  INACTIVE: "This contract number is not active.",
  USED: "This contract number has already been used.",
  KITCHEN_UNAVAILABLE: "The kitchen for this contract number is not available.",
  KITCHEN_MISMATCH: "Contract number does not match the selected kitchen.",
};

export function normalizeContractNumber(value) {
  return String(value || "").trim();
}

export function contractValidationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function assertUsableKitchenContract(contract) {
  if (!contract) {
    throw contractValidationError(CONTRACT_ERRORS.NOT_FOUND, 404);
  }
  if (!contract.isActive) {
    throw contractValidationError(CONTRACT_ERRORS.INACTIVE);
  }
  if (contract.usedAt) {
    throw contractValidationError(CONTRACT_ERRORS.USED);
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
