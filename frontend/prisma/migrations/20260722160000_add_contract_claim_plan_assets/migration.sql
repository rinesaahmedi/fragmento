CREATE TABLE "KitchenContractClaimPlanAsset" (
  "id" TEXT NOT NULL,
  "kitchenContractId" TEXT NOT NULL,
  "previewBytes" BYTEA,
  "previewMimeType" TEXT,
  "previewFileName" TEXT,
  "pdfBytes" BYTEA,
  "pdfMimeType" TEXT,
  "pdfFileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KitchenContractClaimPlanAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KitchenContractClaimPlanAsset_kitchenContractId_key"
ON "KitchenContractClaimPlanAsset"("kitchenContractId");

CREATE INDEX "KitchenContractClaimPlanAsset_kitchenContractId_idx"
ON "KitchenContractClaimPlanAsset"("kitchenContractId");

ALTER TABLE "KitchenContractClaimPlanAsset"
ADD CONSTRAINT "KitchenContractClaimPlanAsset_kitchenContractId_fkey"
FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
