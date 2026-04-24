ALTER TABLE "PropertyOwner" RENAME TO "HousingCompany";
ALTER TABLE "HousingCompany" RENAME CONSTRAINT "PropertyOwner_pkey" TO "HousingCompany_pkey";

ALTER TABLE "HousingCompany" ADD COLUMN "name" TEXT;
UPDATE "HousingCompany"
SET "name" = COALESCE(
  NULLIF(BTRIM(CONCAT_WS(' ', "firstName", "lastName")), ''),
  NULLIF(BTRIM("email"), ''),
  "id"
);
ALTER TABLE "HousingCompany" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "HousingCompany" DROP COLUMN "firstName";
ALTER TABLE "HousingCompany" DROP COLUMN "lastName";

CREATE TABLE "PropertyObject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "housingCompanyId" TEXT NOT NULL,
  "country" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "address1" TEXT,
  "address2" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyObject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyObject_housingCompanyId_idx" ON "PropertyObject"("housingCompanyId");

ALTER TABLE "PropertyObject" ADD CONSTRAINT "PropertyObject_housingCompanyId_fkey"
  FOREIGN KEY ("housingCompanyId") REFERENCES "HousingCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitchenContract" ADD COLUMN "propertyObjectId" TEXT;

WITH object_groups AS (
  SELECT
    kc."ownerId" AS "housingCompanyId",
    kc."country",
    kc."city",
    kc."postalCode",
    kc."address1",
    kc."address2",
    kc."building",
    MIN(kc."createdAt") AS "createdAt",
    MAX(kc."updatedAt") AS "updatedAt"
  FROM "KitchenContract" kc
  WHERE kc."ownerId" IS NOT NULL
  GROUP BY
    kc."ownerId",
    kc."country",
    kc."city",
    kc."postalCode",
    kc."address1",
    kc."address2",
    kc."building"
),
inserted_objects AS (
  INSERT INTO "PropertyObject" (
    "id",
    "name",
    "housingCompanyId",
    "country",
    "city",
    "postalCode",
    "address1",
    "address2",
    "createdAt",
    "updatedAt"
  )
  SELECT
    'obj_' || SUBSTRING(MD5(
      CONCAT_WS(
        '||',
        "housingCompanyId",
        COALESCE("country", ''),
        COALESCE("city", ''),
        COALESCE("postalCode", ''),
        COALESCE("address1", ''),
        COALESCE("address2", ''),
        COALESCE("building", '')
      )
    ) FROM 1 FOR 24),
    COALESCE(NULLIF(BTRIM("building"), ''), NULLIF(BTRIM("address1"), ''), 'Property object'),
    "housingCompanyId",
    "country",
    "city",
    "postalCode",
    "address1",
    "address2",
    "createdAt",
    COALESCE("updatedAt", CURRENT_TIMESTAMP)
  FROM object_groups
  RETURNING "id", "housingCompanyId", "country", "city", "postalCode", "address1", "address2", "name"
)
UPDATE "KitchenContract" kc
SET "propertyObjectId" = po."id"
FROM "PropertyObject" po
WHERE kc."ownerId" = po."housingCompanyId"
  AND COALESCE(kc."country", '') = COALESCE(po."country", '')
  AND COALESCE(kc."city", '') = COALESCE(po."city", '')
  AND COALESCE(kc."postalCode", '') = COALESCE(po."postalCode", '')
  AND COALESCE(kc."address1", '') = COALESCE(po."address1", '')
  AND COALESCE(kc."address2", '') = COALESCE(po."address2", '')
  AND COALESCE(NULLIF(BTRIM(kc."building"), ''), NULLIF(BTRIM(kc."address1"), ''), 'Property object') = po."name";

DROP INDEX IF EXISTS "KitchenContract_ownerId_idx";
ALTER TABLE "KitchenContract" DROP CONSTRAINT IF EXISTS "KitchenContract_ownerId_fkey";
ALTER TABLE "KitchenContract" DROP COLUMN "ownerId";
ALTER TABLE "KitchenContract" DROP COLUMN "country";
ALTER TABLE "KitchenContract" DROP COLUMN "city";
ALTER TABLE "KitchenContract" DROP COLUMN "postalCode";
ALTER TABLE "KitchenContract" DROP COLUMN "address1";
ALTER TABLE "KitchenContract" DROP COLUMN "address2";

CREATE INDEX "KitchenContract_propertyObjectId_idx" ON "KitchenContract"("propertyObjectId");

ALTER TABLE "KitchenContract" ADD CONSTRAINT "KitchenContract_propertyObjectId_fkey"
  FOREIGN KEY ("propertyObjectId") REFERENCES "PropertyObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
