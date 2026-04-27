ALTER TABLE "HousingCompany"
ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "PropertyObject"
ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
