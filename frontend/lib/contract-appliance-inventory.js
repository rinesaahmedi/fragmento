import { prisma } from "./prisma.js";
import { getContractOrderState } from "./kitchen-contracts.js";
import { getOrderKindForContractNumber } from "./order-kind.js";
import { buildServiceClaimSelectableComponents } from "./service-claim-kitchen-plan-selection.js";
import { deriveKitchenAppliances, resolveContractAppliances, parseContractAppliances } from "./contract-appliances.js";

export async function loadKitchenApplianceInventories(kitchenIds, client = prisma) {
  const kitchens = await client.kitchen.findMany({ where: { id: { in: kitchenIds } }, include: {
    items: { where: { isActive: true }, include: { catalogArticle: true, catalogBlende: true, catalogService: true } },
    claimParts: { where: { isActive: true } },
  } });
  return Object.fromEntries(kitchens.map((kitchen) => {
    const selectable = buildServiceClaimSelectableComponents({
      kitchen, kitchenSlug: kitchen.slug, claimParts: kitchen.claimParts,
    });
    return [kitchen.id, deriveKitchenAppliances({ ...selectable, items: kitchen.items })];
  }));
}

// Read-only: appliance administration must never apply catalog prices or alter orders.
export async function loadContractApplianceInventory(contract, client = prisma) {
  const kitchen = contract.kitchenId ? await client.kitchen.findUnique({
    where: { id: contract.kitchenId },
    include: {
      items: { where: { isActive: true }, include: { catalogArticle: true, catalogBlende: true, catalogService: true } },
      claimParts: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { partKey: "asc" }] },
    },
  }) : null;
  const manual = contract.contractType === "ARC" || !kitchen || kitchen.slug === "pdf-only-kitchen" || !kitchen.items.length;
  let automatic = [];
  if (!manual) {
    const { confirmedItems } = contract.id
      ? await getContractOrderState(contract.id, client, getOrderKindForContractNumber(contract.contractNumber))
      : { confirmedItems: [] };
    const selectable = buildServiceClaimSelectableComponents({
      kitchen, kitchenSlug: kitchen.slug,
      confirmedItems, claimParts: kitchen.claimParts,
    });
    automatic = deriveKitchenAppliances({ ...selectable, items: kitchen.items, confirmedItems });
  }
  return resolveContractAppliances({ automatic, saved: contract.appliances || [], manual, configured: contract.appliancesConfigured });
}

export async function saveContractApplianceInventory(tx, contract, formData) {
  // Unrelated/older contract forms must not erase appliance configuration.
  if (!formData.has("applianceInventorySubmitted")) return;
  if (formData.get("applianceInventorySubmitted") !== "true") throw new Error("Wait for the appliance list to load before saving.");
  const inventory = await loadContractApplianceInventory(contract, tx);
  const submittedKitchenId = String(formData.get("applianceInventoryKitchenId") || "");
  if (!inventory.manual && submittedKitchenId !== contract.kitchenId) {
    throw new Error("The kitchen changed. Reload its appliance list before saving.");
  }
  const entries = parseContractAppliances(formData);
  const allowed = new Set(inventory.entries.map((entry) => entry.applianceType));
  if (entries.some((entry) => !allowed.has(entry.applianceType) || (!inventory.manual && !entry.isPresent))) {
    throw new Error("Only installed kitchen appliances can be configured for this FRG contract.");
  }
  if (entries.length !== allowed.size) throw new Error("The appliance list changed. Reload the contract before saving.");
  for (const entry of entries) {
    await tx.contractAppliance.upsert({
      where: { kitchenContractId_applianceType: { kitchenContractId: contract.id, applianceType: entry.applianceType } },
      create: { ...entry, kitchenContractId: contract.id }, update: entry,
    });
  }
  // Remove obsolete overrides only for this contract, never shared kitchen items.
  await tx.contractAppliance.deleteMany({ where: {
    kitchenContractId: contract.id, applianceType: { notIn: [...allowed] },
  } });
  await tx.kitchenContract.update({ where: { id: contract.id }, data: { appliancesConfigured: inventory.manual } });
}
