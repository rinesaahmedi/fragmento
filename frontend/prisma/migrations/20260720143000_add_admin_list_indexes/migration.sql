CREATE INDEX "Order_kitchenContractId_createdAt_idx"
ON "Order"("kitchenContractId", "createdAt");

CREATE INDEX "Order_status_createdAt_idx"
ON "Order"("status", "createdAt");

CREATE INDEX "Order_createdAt_idx"
ON "Order"("createdAt");

CREATE INDEX "TestOrder_kitchenContractId_createdAt_idx"
ON "TestOrder"("kitchenContractId", "createdAt");

CREATE INDEX "TestOrder_status_createdAt_idx"
ON "TestOrder"("status", "createdAt");

CREATE INDEX "TestOrder_createdAt_idx"
ON "TestOrder"("createdAt");

CREATE INDEX "OrderItem_orderId_idx"
ON "OrderItem"("orderId");

CREATE INDEX "TestOrderItem_orderId_idx"
ON "TestOrderItem"("orderId");
