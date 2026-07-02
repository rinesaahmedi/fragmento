CREATE TABLE "TestOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "kitchenId" TEXT NOT NULL,
  "kitchenContractId" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
  "contractNumber" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address1" TEXT NOT NULL,
  "address2" TEXT,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT,
  "preferredDeliveryDate" TIMESTAMP(3),
  "notes" TEXT,
  "paymentMethod" TEXT,
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "totalPrice" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TestOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kitchenItemId" TEXT,
  "itemType" "ItemType" NOT NULL,
  "code" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "priceSnapshot" DECIMAL(10,2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TestOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestOrder_orderNumber_key" ON "TestOrder"("orderNumber");
CREATE UNIQUE INDEX "TestOrder_stripeCheckoutSessionId_key" ON "TestOrder"("stripeCheckoutSessionId");
CREATE INDEX "TestOrder_kitchenContractId_idx" ON "TestOrder"("kitchenContractId");

ALTER TABLE "TestOrder" ADD CONSTRAINT "TestOrder_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TestOrder" ADD CONSTRAINT "TestOrder_kitchenContractId_fkey" FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestOrderItem" ADD CONSTRAINT "TestOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TestOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestOrderItem" ADD CONSTRAINT "TestOrderItem_kitchenItemId_fkey" FOREIGN KEY ("kitchenItemId") REFERENCES "KitchenItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
