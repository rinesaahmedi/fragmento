CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "housingCompanyId" TEXT NOT NULL,
  "propertyObjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_propertyObjectId_key" ON "Project"("propertyObjectId");
CREATE UNIQUE INDEX "Project_housingCompanyId_name_key" ON "Project"("housingCompanyId", "name");
CREATE INDEX "Project_housingCompanyId_idx" ON "Project"("housingCompanyId");

ALTER TABLE "Project" ADD CONSTRAINT "Project_housingCompanyId_fkey"
  FOREIGN KEY ("housingCompanyId") REFERENCES "HousingCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_propertyObjectId_fkey"
  FOREIGN KEY ("propertyObjectId") REFERENCES "PropertyObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH source_objects AS (
  SELECT
    pobj."id",
    pobj."housingCompanyId",
    COALESCE(NULLIF(BTRIM(pobj."name"), ''), 'Project') AS "baseName",
    pobj."createdAt",
    pobj."updatedAt",
    ROW_NUMBER() OVER (
      PARTITION BY pobj."housingCompanyId", COALESCE(NULLIF(BTRIM(pobj."name"), ''), 'Project')
      ORDER BY pobj."createdAt", pobj."id"
    ) AS "nameOrdinal"
  FROM "PropertyObject" pobj
)
INSERT INTO "Project" (
  "id",
  "name",
  "housingCompanyId",
  "propertyObjectId",
  "createdAt",
  "updatedAt"
)
SELECT
  'proj_' || "id",
  CASE
    WHEN "nameOrdinal" = 1 THEN "baseName"
    ELSE CONCAT("baseName", ' ', "nameOrdinal")
  END,
  "housingCompanyId",
  "id",
  COALESCE("createdAt", CURRENT_TIMESTAMP),
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM source_objects;
