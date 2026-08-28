CREATE TYPE "OrderCancellationRequestStatus" AS ENUM ('RECEIVED', 'APPROVED', 'REJECTED');

CREATE TABLE "OrderCancellationRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "orderId" TEXT,
    "submittedContractNumber" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "confirmationEmail" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "reason" TEXT,
    "declarationText" TEXT NOT NULL,
    "status" "OrderCancellationRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "customerEmailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "customerEmailSentAt" TIMESTAMP(3),
    "internalEmailStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "internalEmailSentAt" TIMESTAMP(3),
    "finalEmailStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "finalEmailSentAt" TIMESTAMP(3),
    "lastEmailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderCancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderCancellationRequest_referenceNumber_key" ON "OrderCancellationRequest"("referenceNumber");
CREATE INDEX "OrderCancellationRequest_orderId_status_idx" ON "OrderCancellationRequest"("orderId", "status");
CREATE INDEX "OrderCancellationRequest_status_receivedAt_idx" ON "OrderCancellationRequest"("status", "receivedAt");
CREATE INDEX "OrderCancellationRequest_submittedContractNumber_confirmationEmail_idx" ON "OrderCancellationRequest"("submittedContractNumber", "confirmationEmail");

ALTER TABLE "OrderCancellationRequest"
ADD CONSTRAINT "OrderCancellationRequest_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
