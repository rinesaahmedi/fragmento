const bcrypt = require("bcryptjs");
const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "DISH-600-STD", legacyCode: "component-dishwasher", name: "Spülmaschine", price: "579.00", infoText: "Amica by architecto", iconKey: "dishwasher", colorKey: "#001f7f", sortOrder: 10 },
  { itemType: ItemType.COMPONENT, code: "REF-545-1800-700", legacyCode: "component-refrigerator", name: "Kühlschrank", price: "579.00", infoText: "Amica by architecto", iconKey: "refrigerator", colorKey: "black", sortOrder: 20 },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-030", legacyCode: "component-base-cabinet-30", name: "Unterschrank 30cm", price: "175.00", iconKey: "base_cabinet_30", colorKey: "#ffbf00", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-L-060", legacyCode: "component-wall-cabinet-left", name: "Oberschrank (links)", price: "115.00", iconKey: "wall_cabinet_l", colorKey: "#00ffbf", sortOrder: 40 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-R-060", legacyCode: "component-wall-cabinet-right", name: "Oberschrank (rechts)", price: "115.00", iconKey: "wall_cabinet_r", colorKey: "#394c00", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "HOOD-600-FLAT", legacyCode: "component-extractor-hood", name: "Dunstabzugshaube", price: "349.00", infoText: "Amica by architecto", iconKey: "extractor_hood", colorKey: "#ff7f9f", sortOrder: 60 },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 100 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-001", legacyCode: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 110 },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 120 },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 200 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 210 },
];

const MODEL_B_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", legacyCode: "model-b-wall-cabinet-1", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", legacyCode: "model-b-wall-cabinet-2", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", legacyCode: "model-b-wall-cabinet-3", name: "Hood Wall Cabinet (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "HD6002, light hood setup" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", legacyCode: "model-b-wall-cabinet-4", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", legacyCode: "model-b-wall-cabinet-5", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 50, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", legacyCode: "model-b-extractor-hood", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 52, infoText: "60 cm, max air flow 415 m3/h" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", legacyCode: "model-b-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 55, infoText: "LED lighting set" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", legacyCode: "model-b-base-module-1", name: "Washing Machine (600 x 600 x 878 mm)", price: "548.00", iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 60, infoText: "EWA34660W, 8 kg, 1400 rpm" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", legacyCode: "model-b-base-module-2", name: "Sink Base Cabinet (600 x 600 x 878 mm)", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 70, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", legacyCode: "model-b-base-module-3", name: "Dishwasher (600 x 600 x 878 mm)", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 80, infoText: "Architecto, fully integrated, 12 place settings" },
  { itemType: ItemType.COMPONENT, code: "TOP-B-3036", legacyCode: "model-b-worktop", name: "Worktop (40 x 600 x 3036 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 85, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", legacyCode: "model-b-oven-module", name: "Built-in Oven and Hob (600 x 600 x 878 mm)", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 90, infoText: "Architecto built-in oven with hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", legacyCode: "model-b-drawer-module", name: "Base Storage Cabinet (600 x 600 x 878 mm)", price: "1150.00", iconKey: "drawer_base", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100, infoText: "STR base storage cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", legacyCode: "model-b-refrigerator", name: "Refrigerator (545 x 1800 x 700 mm)", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 110, infoText: "OL-KGCN388140E, NoFrost, stainless steel" },
  { itemType: ItemType.COMPONENT, code: "SINK-B-BOTTON-45", legacyCode: "model-b-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 200 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Besteckeinsatz ZB60SG", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert for 60 cm cabinet" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220 },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const MODEL_C_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-C-545-1800-700", legacyCode: "model-c-refrigerator", name: "Refrigerator (545 x 1800 x 700 mm)", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "OL-KGCN388140E, NoFrost, stainless steel" },
  { itemType: ItemType.COMPONENT, code: "HOOD-C-FH664621E", legacyCode: "model-c-extractor-hood", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 20, infoText: "60 cm, max air flow 415 m3/h" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-L-600", legacyCode: "model-c-cook-base-left", name: "Base Cabinet (2 Drawers) Left (600 x 600 x 878 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "OVEN-C-600-HOB", legacyCode: "model-c-oven-base", name: "Built-in Oven and Hob (600 x 600 x 878 mm)", price: "449.00", iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 40, infoText: "Architecto built-in oven with hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-R-600", legacyCode: "model-c-cook-base-right", name: "Base Cabinet (2 Drawers) Right (600 x 600 x 878 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-L-600", legacyCode: "model-c-wall-cabinet-1", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 60, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-ML-600", legacyCode: "model-c-wall-cabinet-2", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 70, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-MR-600", legacyCode: "model-c-wall-cabinet-3", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 80, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-R-600", legacyCode: "model-c-wall-cabinet-4", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 90, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-C-LED-001", legacyCode: "model-c-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 100, infoText: "LED lighting set" },
  { itemType: ItemType.COMPONENT, code: "WM-C-EWA34660W", legacyCode: "model-c-wm-base", name: "Washing Machine (600 x 600 x 878 mm)", price: "548.00", iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 110, infoText: "EWA34660W, 8 kg, 1400 rpm" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-C-600", legacyCode: "model-c-sink-base", name: "Sink Base Cabinet (600 x 600 x 878 mm)", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-C-600-STD", legacyCode: "model-c-dishwasher-base", name: "Dishwasher (600 x 600 x 878 mm)", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Architecto, fully integrated, 12 place settings" },
  { itemType: ItemType.COMPONENT, code: "TOP-C-4000", legacyCode: "model-c-worktop", name: "Worktop (40 x 600 x 4000 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 135, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-C-3D", legacyCode: "model-c-drawer-base-3", name: "Base Cabinet (3 Drawers) (600 x 600 x 878 mm)", price: "229.00", iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-base-3", sortOrder: 140 },
  { itemType: ItemType.COMPONENT, code: "SINK-C-BOTTON-45", legacyCode: "model-c-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 200 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-001", legacyCode: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 210 },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220 },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const DEFAULT_KITCHENS = [
  {
    slug: "fragmento-default",
    name: "Fragmento Default Kitchen",
    description: "Seeded default kitchen based on the legacy configurator.",
    items: DEFAULT_ITEMS,
  },
  {
    slug: "kitchen-model-b",
    name: "Linear Kitchen",
    description: "Compact single-wall layout ideal for smaller spaces",
    items: MODEL_B_ITEMS,
  },
  {
    slug: "kitchen-model-c",
    name: "Split Kitchen",
    description: "Two-part layout with separated zones for flexibility",
    items: MODEL_C_ITEMS,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "736267", kitchenSlug: "fragmento-default" },
  { contractNumber: "736268", kitchenSlug: "kitchen-model-b" },
  { contractNumber: "736269", kitchenSlug: "kitchen-model-c" },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
  }

  for (const kitchen of DEFAULT_KITCHENS) {
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { slug: kitchen.slug },
      include: { items: true },
    });

    const kitchenRecord = existingKitchen
      ? await prisma.kitchen.update({
          where: { slug: kitchen.slug },
          data: {
            name: kitchen.name,
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        })
      : await prisma.kitchen.create({
          data: {
            slug: kitchen.slug,
            name: kitchen.name,
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        });

    const existingByCode = new Map(kitchenRecord.items.map((item) => [item.code, item]));
    const targetCodes = new Set(kitchen.items.map((item) => item.code));

    for (const item of kitchen.items) {
      const existingItem = existingByCode.get(item.code) || (item.legacyCode ? existingByCode.get(item.legacyCode) : null);
      const data = {
        itemType: item.itemType,
        code: item.code,
        name: item.name,
        price: item.price,
        infoText: item.infoText || null,
        iconKey: item.iconKey || null,
        colorKey: item.colorKey || null,
        componentKey: item.componentKey || null,
        sortOrder: item.sortOrder || 0,
        isLocked: Boolean(item.isLocked),
        isActive: item.isActive !== false,
      };

      if (existingItem) {
        await prisma.kitchenItem.update({
          where: { id: existingItem.id },
          data,
        });
      } else {
        await prisma.kitchenItem.create({
          data: {
            kitchenId: kitchenRecord.id,
            ...data,
          },
        });
      }
    }

    await prisma.kitchenItem.deleteMany({
      where: {
        kitchenId: kitchenRecord.id,
        code: { notIn: [...targetCodes] },
      },
    });
  }

  for (const contract of DEFAULT_KITCHEN_CONTRACTS) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: contract.kitchenSlug },
      select: { id: true },
    });

    if (!kitchen) {
      throw new Error(`Kitchen not found for contract seed: ${contract.kitchenSlug}`);
    }

    await prisma.kitchenContract.upsert({
      where: { contractNumber: contract.contractNumber },
      update: {
        kitchenId: kitchen.id,
        isActive: true,
      },
      create: {
        contractNumber: contract.contractNumber,
        kitchenId: kitchen.id,
        isActive: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
