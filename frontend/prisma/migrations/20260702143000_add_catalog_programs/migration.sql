-- CreateTable
CREATE TABLE "CatalogProgram" (
  "id" TEXT NOT NULL,
  "programmId" TEXT NOT NULL,
  "name" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CatalogProgram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProgram_programmId_key" ON "CatalogProgram"("programmId");

-- Backfill known program ids from kitchens and historical imports.
INSERT INTO "CatalogProgram" ("id", "programmId", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'catalog-program-' || regexp_replace(lower(source."programmId"), '[^a-z0-9]+', '-', 'g'),
  source."programmId",
  source."programmId",
  true,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT COALESCE(NULLIF(TRIM("programmId"), ''), 'IP 2200') AS "programmId"
  FROM "Kitchen"
  UNION
  SELECT DISTINCT TRIM("programmId") AS "programmId"
  FROM "CatalogPriceListImport"
  WHERE "programmId" IS NOT NULL AND TRIM("programmId") <> ''
  UNION
  SELECT 'IP 2200' AS "programmId"
) source
ON CONFLICT ("programmId") DO NOTHING;
