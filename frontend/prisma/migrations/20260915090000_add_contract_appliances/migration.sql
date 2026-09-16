CREATE TABLE "ContractAppliance" (
  "id" TEXT NOT NULL,
  "kitchenContractId" TEXT NOT NULL,
  "applianceType" TEXT NOT NULL,
  "brand" TEXT,
  "articleNumber" TEXT,
  "serialHelpProfile" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractAppliance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractAppliance_applianceType_check"
    CHECK ("applianceType" IN ('dishwasher', 'fridge', 'oven', 'hob', 'extractor_hood')),
  CONSTRAINT "ContractAppliance_source_check"
    CHECK ("source" IN ('MANUAL', 'ORDER', 'KITCHEN_ITEM'))
);

CREATE UNIQUE INDEX "ContractAppliance_kitchenContractId_applianceType_key"
ON "ContractAppliance"("kitchenContractId", "applianceType");

CREATE INDEX "ContractAppliance_kitchenContractId_idx"
ON "ContractAppliance"("kitchenContractId");

CREATE INDEX "ContractAppliance_applianceType_brand_idx"
ON "ContractAppliance"("applianceType", "brand");

ALTER TABLE "ContractAppliance"
ADD CONSTRAINT "ContractAppliance_kitchenContractId_fkey"
FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
