const path = require("path");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient, ItemType } = require("@prisma/client");

const projectRoot = path.resolve(__dirname, "..");
loadEnvConfig(projectRoot);

const prisma = new PrismaClient();

const CUTLERY_ARTICLES = [
  { articleNumber: "ZB30SG", widthCm: 30, price: "19.00" },
  { articleNumber: "ZB40SG", widthCm: 40, price: "19.00" },
  { articleNumber: "ZB45SG", widthCm: 45, price: "22.00" },
  { articleNumber: "ZB50SG", widthCm: 50, price: "22.00" },
  { articleNumber: "ZB60SG", widthCm: 60, price: "25.00" },
  { articleNumber: "ZB80SG", widthCm: 80, price: "31.00" },
  { articleNumber: "ZB90SG", widthCm: 90, price: "31.00" },
  { articleNumber: "ZB100SG", widthCm: 100, price: "36.00" },
];

function articleData(article) {
  return {
    name: `Cutlery insert ${article.widthCm} cm`,
    nameDe: `Besteckeinsatz ${article.widthCm} cm`,
    description: `Cutlery insert for ${article.widthCm} cm cabinet`,
    widthMm: article.widthCm * 10,
    heightMm: null,
    depthMm: null,
    price: article.price,
    itemType: ItemType.ACCESSORY,
    isFixedPricePackage: false,
    isActive: true,
  };
}

async function main() {
  const results = [];

  for (const article of CUTLERY_ARTICLES) {
    const data = articleData(article);
    const saved = await prisma.catalogArticle.upsert({
      where: { articleNumber: article.articleNumber },
      create: {
        articleNumber: article.articleNumber,
        ...data,
      },
      update: data,
    });

    results.push(`${saved.articleNumber}: ${saved.name} (${saved.price.toFixed(2)} EUR)`);
  }

  console.log("Upserted cutlery catalog articles:");
  for (const line of results) {
    console.log(`- ${line}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
