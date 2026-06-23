const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const prisma = new PrismaClient();

const DEMO_BATCH_TAG = "dashboard-demo-v1";
const PRODUCTION_HOUSING_COMPANY_NAME = "ARGE Nördliche Riedsiedlung";
const LEGACY_SEED_OWNER_EMAILS = [
  "anna.schmidt@example.com",
  "lukas.weber@example.com",
  "sophie.muller@example.com",
  "daniel.fischer@example.com",
  "laura.becker@example.com",
];

async function countRows() {
  const [housingCompanies, propertyObjects, projects, linkedContracts, demoContracts] = await Promise.all([
    prisma.housingCompany.count(),
    prisma.propertyObject.count(),
    prisma.project.count(),
    prisma.kitchenContract.count({ where: { projectId: { not: null } } }),
    prisma.kitchenContract.count({
      where: {
        OR: [{ notes: { contains: DEMO_BATCH_TAG } }, { contractNumber: { startsWith: "DM-" } }],
      },
    }),
  ]);

  return {
    housingCompanies,
    propertyObjects,
    projects,
    linkedContracts,
    demoContracts,
  };
}

async function cleanupHousingSeedData() {
  const before = await countRows();

  const unlinkedContracts = await prisma.kitchenContract.updateMany({
    where: {
      projectId: { not: null },
      project: {
        housingCompany: {
          name: { not: PRODUCTION_HOUSING_COMPANY_NAME },
        },
      },
    },
    data: { projectId: null },
  });

  const deletedDemoContracts = await prisma.kitchenContract.deleteMany({
    where: {
      OR: [{ notes: { contains: DEMO_BATCH_TAG } }, { contractNumber: { startsWith: "DM-" } }],
    },
  });

  const deletedHousingCompanies = await prisma.housingCompany.deleteMany({
    where: {
      OR: [
        { notes: { contains: DEMO_BATCH_TAG } },
        { email: { in: LEGACY_SEED_OWNER_EMAILS } },
        { email: { startsWith: "demo.owner." } },
      ],
    },
  });

  const remainingHousingCompanies = await prisma.housingCompany.count({
    where: { name: { not: PRODUCTION_HOUSING_COMPANY_NAME } },
  });
  if (remainingHousingCompanies > 0) {
    const removedRemaining = await prisma.housingCompany.deleteMany({
      where: { name: { not: PRODUCTION_HOUSING_COMPANY_NAME } },
    });
    return {
      before,
      unlinkedContracts: unlinkedContracts.count,
      deletedDemoContracts: deletedDemoContracts.count,
      deletedHousingCompanies: deletedHousingCompanies.count + removedRemaining.count,
      deletedPropertyObjects: before.propertyObjects,
      deletedProjects: before.projects,
      removedAllRemainingHousingCompanies: removedRemaining.count,
    };
  }

  return {
    before,
    unlinkedContracts: unlinkedContracts.count,
    deletedDemoContracts: deletedDemoContracts.count,
    deletedHousingCompanies: deletedHousingCompanies.count,
    deletedPropertyObjects: before.propertyObjects,
    deletedProjects: before.projects,
    removedAllRemainingHousingCompanies: 0,
  };
}

async function main() {
  const result = await cleanupHousingSeedData();
  const after = await countRows();

  console.log("Housing seed cleanup complete.");
  console.log(
    JSON.stringify(
      {
        before: result.before,
        actions: {
          kitchenContractsUnlinkedFromProjects: result.unlinkedContracts,
          demoKitchenContractsDeleted: result.deletedDemoContracts,
          housingCompaniesDeleted: result.deletedHousingCompanies,
          propertyObjectsDeleted: result.deletedPropertyObjects,
          projectsDeleted: result.deletedProjects,
        },
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = {
  cleanupHousingSeedData,
  LEGACY_SEED_OWNER_EMAILS,
  DEMO_BATCH_TAG,
  PRODUCTION_HOUSING_COMPANY_NAME,
};
