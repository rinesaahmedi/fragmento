const path = require("path");

const clientModulePath = process.env.PRISMA_CHECK_CLIENT_PATH
  ? path.resolve(process.cwd(), process.env.PRISMA_CHECK_CLIENT_PATH)
  : "@prisma/client";
const { PrismaClient } = require(clientModulePath);

const prisma = new PrismaClient();

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function formatRow(row) {
  return {
    issue: row.issueType,
    contractId: row.contractId,
    contractNumber: row.contractNumber || "",
    kitchen: row.kitchenName || "",
    propertyObjectId: row.propertyObjectId || "",
    propertyObject: row.propertyObjectName || "",
    company: row.housingCompanyName || "",
    projectId: row.projectId || "",
    project: row.projectName || "",
    active: row.isActive,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
  };
}

async function main() {
  const [projectTableStatus] = await prisma.$queryRaw`
    SELECT to_regclass('"Project"')::text AS "projectTableName"
  `;
  const projectTableExists = Boolean(projectTableStatus?.projectTableName);

  const problematicContracts = projectTableExists
    ? await prisma.$queryRaw`
        SELECT
          kc."id" AS "contractId",
          kc."contractNumber",
          kc."propertyObjectId",
          kc."isActive",
          kc."notes",
          kc."createdAt",
          k."name" AS "kitchenName",
          po."name" AS "propertyObjectName",
          hc."id" AS "housingCompanyId",
          hc."name" AS "housingCompanyName",
          prj."id" AS "projectId",
          prj."name" AS "projectName",
          CASE
            WHEN kc."propertyObjectId" IS NULL THEN 'MISSING_PROPERTY_OBJECT'
            WHEN po."id" IS NULL THEN 'ORPHANED_PROPERTY_OBJECT'
            WHEN prj."id" IS NULL THEN 'MISSING_PROJECT_MAPPING'
            ELSE 'OK'
          END AS "issueType"
        FROM "KitchenContract" kc
        LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
        LEFT JOIN "PropertyObject" po ON po."id" = kc."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = po."housingCompanyId"
        LEFT JOIN "Project" prj ON prj."propertyObjectId" = kc."propertyObjectId"
        WHERE kc."propertyObjectId" IS NULL
           OR po."id" IS NULL
           OR prj."id" IS NULL
        ORDER BY kc."createdAt" ASC, kc."contractNumber" ASC, kc."id" ASC
      `
    : await prisma.$queryRaw`
        SELECT
          kc."id" AS "contractId",
          kc."contractNumber",
          kc."propertyObjectId",
          kc."isActive",
          kc."notes",
          kc."createdAt",
          k."name" AS "kitchenName",
          po."name" AS "propertyObjectName",
          hc."id" AS "housingCompanyId",
          hc."name" AS "housingCompanyName",
          NULL::text AS "projectId",
          NULL::text AS "projectName",
          CASE
            WHEN kc."propertyObjectId" IS NULL THEN 'MISSING_PROPERTY_OBJECT'
            WHEN po."id" IS NULL THEN 'ORPHANED_PROPERTY_OBJECT'
            ELSE 'WILL_MAP_AFTER_PROJECT_CREATION'
          END AS "issueType"
        FROM "KitchenContract" kc
        LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
        LEFT JOIN "PropertyObject" po ON po."id" = kc."propertyObjectId"
        LEFT JOIN "HousingCompany" hc ON hc."id" = po."housingCompanyId"
        WHERE kc."propertyObjectId" IS NULL
           OR po."id" IS NULL
        ORDER BY kc."createdAt" ASC, kc."contractNumber" ASC, kc."id" ASC
      `;

  const missingPropertyObject = problematicContracts.filter((row) => row.issueType === "MISSING_PROPERTY_OBJECT");
  const orphanedPropertyObject = problematicContracts.filter((row) => row.issueType === "ORPHANED_PROPERTY_OBJECT");
  const missingProjectMapping = problematicContracts.filter((row) => row.issueType === "MISSING_PROJECT_MAPPING");

  printSection("KitchenContract -> Project migration preflight");
  console.log(`Project table exists: ${projectTableExists ? "yes" : "no"}`);
  console.log(`Problematic contracts: ${problematicContracts.length}`);
  console.log(`- Missing propertyObjectId: ${missingPropertyObject.length}`);
  console.log(`- Orphaned propertyObjectId: ${orphanedPropertyObject.length}`);
  console.log(`- Missing Project mapping: ${missingProjectMapping.length}`);

  if (!projectTableExists) {
    console.log("- Project table not created yet, so valid propertyObject-linked contracts are expected to map automatically after the Project creation migration.");
  }

  if (!problematicContracts.length) {
    console.log("\nAll KitchenContract rows can be mapped safely to Project.");
    return;
  }

  printSection("Problem rows");
  console.table(problematicContracts.map(formatRow));

  if (missingProjectMapping.length) {
    printSection("Safe cleanup option 1A: create missing Project rows for existing objects");
    console.log(`This is the safest fix for contracts that already have a valid object but no Project row.\n`);
    console.log(`Suggested SQL (review before running):`);
    console.log(`
INSERT INTO "Project" ("id", "name", "housingCompanyId", "propertyObjectId", "createdAt", "updatedAt")
SELECT
  'repair_' || pobj."id",
  COALESCE(NULLIF(BTRIM(pobj."name"), ''), 'Recovered project'),
  pobj."housingCompanyId",
  pobj."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PropertyObject" pobj
LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
WHERE prj."id" IS NULL
  AND pobj."id" IN (${missingProjectMapping.map((row) => `'${row.propertyObjectId}'`).join(", ")});
`.trim());
  }

  if (missingPropertyObject.length || orphanedPropertyObject.length) {
    printSection("Safe cleanup option 1B: assign missing-object contracts to a reviewed default recovery project");
    console.log("These rows cannot be auto-mapped because they have no usable propertyObject reference.\n");
    console.log("Recommended safe process:");
    console.log("1. Create one recovery HousingCompany, PropertyObject, and Project manually.");
    console.log("2. Update only the reviewed contract IDs to that recovery project after the migration schema is in place, or restore a proper propertyObjectId before migrating.");
    console.log("\nSuggested pre-migration review query for these rows:");
    console.log(`
SELECT "id", "contractNumber", "kitchenId", "isActive", "notes", "createdAt"
FROM "KitchenContract"
WHERE "id" IN (${[...missingPropertyObject, ...orphanedPropertyObject].map((row) => `'${row.contractId}'`).join(", ")})
ORDER BY "createdAt" ASC;
`.trim());
  }

  printSection("Safe cleanup option 2: archive or delete test data");
  console.log("Archiving is non-destructive, but archived rows will still block the migration until they are mapped or deleted.");
  console.log("\nSuggested archive query:");
  console.log(`
UPDATE "KitchenContract"
SET "isActive" = false,
    "notes" = CONCAT(COALESCE("notes", ''), CASE WHEN COALESCE("notes", '') = '' THEN '' ELSE ' | ' END, 'Archived during project migration review')
WHERE "id" IN (${problematicContracts.map((row) => `'${row.contractId}'`).join(", ")});
`.trim());
  console.log("\nSuggested delete query for confirmed test-only rows:");
  console.log(`
DELETE FROM "KitchenContract"
WHERE "id" IN (${problematicContracts.map((row) => `'${row.contractId}'`).join(", ")});
`.trim());
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
