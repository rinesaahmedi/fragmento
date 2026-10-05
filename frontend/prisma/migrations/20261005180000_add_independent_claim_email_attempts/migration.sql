CREATE TABLE "ServiceClaimEmailAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "delivery" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- No foreign key: recording delivery never locks a claim row.
CREATE INDEX "ServiceClaimEmailAttempt_claimId_attemptedAt_createdAt_idx"
ON "ServiceClaimEmailAttempt" ("claimId", "attemptedAt" DESC, "createdAt" DESC);
