ALTER TABLE "OrderCancellationRequest"
ADD COLUMN "productDescription" TEXT,
ADD COLUMN "orderedOn" TIMESTAMP(3),
ADD COLUMN "receivedOn" TIMESTAMP(3),
ADD COLUMN "consumerAddress" TEXT;
