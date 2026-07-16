ALTER TABLE "PublicVisitEvent"
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "referrerHost" TEXT,
ADD COLUMN "countryCode" VARCHAR(2),
ADD COLUMN "deviceType" TEXT,
ADD COLUMN "browserFamily" TEXT,
ADD COLUMN "operatingSystem" TEXT,
ADD COLUMN "visitorKey" TEXT,
ADD COLUMN "kitchenContractId" TEXT;

ALTER TABLE "PublicVisitEvent"
ADD CONSTRAINT "PublicVisitEvent_kitchenContractId_fkey"
FOREIGN KEY ("kitchenContractId") REFERENCES "KitchenContract"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PublicVisitEvent_countryCode_createdAt_idx"
ON "PublicVisitEvent"("countryCode", "createdAt");

CREATE INDEX "PublicVisitEvent_source_createdAt_idx"
ON "PublicVisitEvent"("source", "createdAt");

CREATE INDEX "PublicVisitEvent_visitorKey_createdAt_idx"
ON "PublicVisitEvent"("visitorKey", "createdAt");

CREATE INDEX "PublicVisitEvent_kitchenContractId_createdAt_idx"
ON "PublicVisitEvent"("kitchenContractId", "createdAt");
