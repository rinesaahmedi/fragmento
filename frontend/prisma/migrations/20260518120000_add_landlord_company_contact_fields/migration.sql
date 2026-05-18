ALTER TABLE "ServiceClaim"
ADD COLUMN IF NOT EXISTS "landlordCompanyPhone" TEXT,
ADD COLUMN IF NOT EXISTS "landlordCompanyEmail" TEXT;
