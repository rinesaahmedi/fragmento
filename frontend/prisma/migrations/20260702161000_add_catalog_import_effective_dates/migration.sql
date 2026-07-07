ALTER TABLE "CatalogPriceListImport"
ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "syncLinkedKitchenItemsRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "syncAppliedAt" TIMESTAMP(3);

UPDATE "CatalogPriceListImport"
SET "effectiveFrom" = COALESCE("effectiveFrom", "appliedAt", "createdAt")
WHERE "effectiveFrom" IS NULL;

CREATE INDEX IF NOT EXISTS "CatalogPriceListImport_status_effectiveFrom_idx"
ON "CatalogPriceListImport"("status", "effectiveFrom");
