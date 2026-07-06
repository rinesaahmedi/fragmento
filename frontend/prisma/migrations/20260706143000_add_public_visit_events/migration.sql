CREATE TABLE "PublicVisitEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT,
    "path" TEXT,
    "contractNumberHash" TEXT,
    "contractNumberLast4" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicVisitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicVisitEvent_createdAt_idx" ON "PublicVisitEvent"("createdAt");
CREATE INDEX "PublicVisitEvent_eventType_createdAt_idx" ON "PublicVisitEvent"("eventType", "createdAt");
CREATE INDEX "PublicVisitEvent_contractNumberHash_idx" ON "PublicVisitEvent"("contractNumberHash");
