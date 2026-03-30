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

  const existingKitchen = await prisma.kitchen.findUnique({
    where: { slug: "fragmento-default" },
  });

  if (!existingKitchen) {
    await prisma.kitchen.create({
      data: {
        slug: "fragmento-default",
        name: "Fragmento Default Kitchen",
        status: KitchenStatus.ACTIVE,
        description: "Seeded default kitchen based on the legacy configurator.",
        items: { create: DEFAULT_ITEMS },
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
