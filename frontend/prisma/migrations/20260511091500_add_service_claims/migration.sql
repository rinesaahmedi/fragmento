CREATE TABLE "ServiceClaim" (
  "id" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "landlordContact" TEXT NOT NULL,
  "problemDescription" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "requestType" TEXT NOT NULL DEFAULT 'complaint',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceClaim_contractNumber_idx" ON "ServiceClaim"("contractNumber");
CREATE INDEX "ServiceClaim_createdAt_idx" ON "ServiceClaim"("createdAt");
