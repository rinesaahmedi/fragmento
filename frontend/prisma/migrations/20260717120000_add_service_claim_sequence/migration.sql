ALTER TABLE "ServiceClaim"
ADD COLUMN "claimSequence" INTEGER;

WITH ranked_claims AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "contractNumber"
      ORDER BY "createdAt" ASC, "id" ASC
    )::INTEGER AS "claimSequence"
  FROM "ServiceClaim"
)
UPDATE "ServiceClaim" AS claim
SET "claimSequence" = ranked."claimSequence"
FROM ranked_claims AS ranked
WHERE claim."id" = ranked."id";

ALTER TABLE "ServiceClaim"
ALTER COLUMN "claimSequence" SET NOT NULL;

CREATE UNIQUE INDEX "ServiceClaim_contractNumber_claimSequence_key"
ON "ServiceClaim"("contractNumber", "claimSequence");
