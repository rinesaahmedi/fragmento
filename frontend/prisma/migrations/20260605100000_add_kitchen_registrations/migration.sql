-- CreateTable
CREATE TABLE "KitchenRegistration" (
    "id" TEXT NOT NULL,
    "kitchenContractId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitchenRegistration_kitchenContractId_isActive_idx" ON "KitchenRegistration"("kitchenContractId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenRegistration_one_active_per_contract_idx" ON "KitchenRegistration"("kitchenContractId") WHERE "isActive" = true;

-- CreateIndex
CREATE INDEX "KitchenRegistration_email_idx" ON "KitchenRegistration"("email");

-- CreateIndex
CREATE INDEX "KitchenRegistration_phone_idx" ON "KitchenRegistration"("phone");

-- AddForeignKey
ALTER TABLE "KitchenRegistration" ADD CONSTRAINT "KitchenRegistration_kitchenContractId_fkey" FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
