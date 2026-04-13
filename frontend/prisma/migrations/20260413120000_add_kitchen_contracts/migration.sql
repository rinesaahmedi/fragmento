-- CreateTable
CREATE TABLE "KitchenContract" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenContract_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "kitchenContractId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KitchenContract_contractNumber_key" ON "KitchenContract"("contractNumber");

-- CreateIndex
CREATE INDEX "KitchenContract_kitchenId_idx" ON "KitchenContract"("kitchenId");

-- CreateIndex
CREATE INDEX "Order_kitchenContractId_idx" ON "Order"("kitchenContractId");

-- AddForeignKey
ALTER TABLE "KitchenContract" ADD CONSTRAINT "KitchenContract_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_kitchenContractId_fkey" FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
