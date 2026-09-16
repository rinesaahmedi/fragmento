// Read-only inventory audit; redirect stdout to retain a reviewable JSON report.
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { loadKitchenApplianceInventories, loadContractApplianceInventory } from "../lib/contract-appliance-inventory.js";

try {
  const kitchens = await prisma.kitchen.findMany({ select: { id: true, slug: true } });
  const inventories = await loadKitchenApplianceInventories(kitchens.map((entry) => entry.id));
  const unknownBrands = kitchens.flatMap((kitchen) => inventories[kitchen.id]
    .filter((entry) => !entry.brand)
    .map((entry) => ({ kitchenId: kitchen.id, kitchenSlug: kitchen.slug, applianceType: entry.applianceType, articleNumber: entry.articleNumber })));
  const contracts = await prisma.kitchenContract.findMany({ include: { appliances: true } });
  const unreviewedContracts = [];
  const conflictingBrands = [];
  for (const contract of contracts) {
    const inventory = await loadContractApplianceInventory(contract);
    if (!inventory.configured) unreviewedContracts.push(contract.id);
    for (const appliance of inventory.entries.filter((entry) => entry.conflictingBrand)) {
      conflictingBrands.push({ contractId: contract.id, applianceType: appliance.applianceType });
    }
  }
  process.stdout.write(JSON.stringify({
    kitchenCount: kitchens.length, contractCount: contracts.length,
    unknownBrands, unreviewedContracts, conflictingBrands,
  }, null, 2) + "\n");
} finally {
  await prisma.$disconnect();
}
