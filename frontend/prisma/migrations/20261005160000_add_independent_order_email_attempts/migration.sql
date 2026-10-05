CREATE TABLE "OrderEmailAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderKind" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "delivery" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- No foreign key to Order or TestOrder: logging never locks an order row.
CREATE INDEX "OrderEmailAttempt_orderKind_orderId_attemptedAt_createdAt_idx"
ON "OrderEmailAttempt" ("orderKind", "orderId", "attemptedAt" DESC, "createdAt" DESC);
