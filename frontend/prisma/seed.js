const bcrypt = require("bcryptjs");
const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "component-dishwasher", name: "Spülmaschine", price: "579.00", infoText: "Amica by architecto", iconKey: "dishwasher", colorKey: "#001f7f", sortOrder: 10 },
  { itemType: ItemType.COMPONENT, code: "component-refrigerator", name: "Kühlschrank", price: "579.00", infoText: "Amica by architecto", iconKey: "refrigerator", colorKey: "black", sortOrder: 20 },
  { itemType: ItemType.COMPONENT, code: "component-base-cabinet-30", name: "Unterschrank 30cm", price: "175.00", iconKey: "base_cabinet_30", colorKey: "#ffbf00", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "component-wall-cabinet-left", name: "Oberschrank (links)", price: "115.00", iconKey: "wall_cabinet_l", colorKey: "#00ffbf", sortOrder: 40 },
  { itemType: ItemType.COMPONENT, code: "component-wall-cabinet-right", name: "Oberschrank (rechts)", price: "115.00", iconKey: "wall_cabinet_r", colorKey: "#394c00", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "component-extractor-hood", name: "Dunstabzugshaube", price: "349.00", infoText: "Amica by architecto", iconKey: "extractor_hood", colorKey: "#ff7f9f", sortOrder: 60 },
  { itemType: ItemType.ACCESSORY, code: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 100 },
  { itemType: ItemType.ACCESSORY, code: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 110 },
  { itemType: ItemType.ACCESSORY, code: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 120 },
  { itemType: ItemType.SERVICE, code: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 200 },
  { itemType: ItemType.SERVICE, code: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 210 },
];

const MODEL_B_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "model-b-wall-cabinet-1", name: "Wall Cabinet left", price: "115.00", iconKey: "wall_cabinet_single_light", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10 },
  { itemType: ItemType.COMPONENT, code: "model-b-wall-cabinet-2", name: "Wall Cabinet mid-left", price: "115.00", iconKey: "wall_cabinet_single_light", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20 },
  { itemType: ItemType.COMPONENT, code: "model-b-wall-cabinet-3", name: "Wall Cabinet middle", price: "115.00", iconKey: "wall_cabinet_single_light", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "model-b-wall-cabinet-4", name: "Wall Cabinet extractor hood", price: "115.00", iconKey: "wall_cabinet_double_light", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40 },
  { itemType: ItemType.COMPONENT, code: "model-b-wall-cabinet-5", name: "Wall Cabinet right", price: "115.00", iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "model-b-base-module-1", name: "Washing Machine Base Unit", price: "229.00", iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 60 },
  { itemType: ItemType.COMPONENT, code: "model-b-base-module-2", name: "Standard Sink Base Cabinet", price: "249.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 70 },
  { itemType: ItemType.COMPONENT, code: "model-b-base-module-3", name: "Dishwasher Base Unit", price: "219.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 80 },
  { itemType: ItemType.COMPONENT, code: "model-b-oven-module", name: "Oven Base Unit", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 90, infoText: "Backofen mit Unterbau" },
  { itemType: ItemType.COMPONENT, code: "model-b-drawer-module", name: "Base Unit (2 Drawers)", price: "199.00", iconKey: "drawer_base", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100 },
  { itemType: ItemType.COMPONENT, code: "model-b-refrigerator", name: "Tall Refrigerator Unit", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 110, infoText: "Amica by architecto" },
  { itemType: ItemType.COMPONENT, code: "model-b-sink-faucet", name: "Sink Faucet", price: "0.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 120 },
  { itemType: ItemType.ACCESSORY, code: "acc-waste", name: "MÃ¼lltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 200 },
  { itemType: ItemType.ACCESSORY, code: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 210 },
  { itemType: ItemType.ACCESSORY, code: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220 },
  { itemType: ItemType.SERVICE, code: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
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
    name: "KITCHEN MODEL B",
    description: "Kitchen Model B based on the cleaned CAD export.",
    items: MODEL_B_ITEMS,
  },
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

      if (existingByCode.has(item.code)) {
        await prisma.kitchenItem.update({
          where: { id: existingByCode.get(item.code).id },
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
