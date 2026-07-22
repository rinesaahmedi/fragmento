ALTER TABLE "KitchenContract"
ADD COLUMN "contractType" TEXT NOT NULL DEFAULT 'FRG';

ALTER TABLE "KitchenContract"
ADD CONSTRAINT "KitchenContract_contractType_check"
CHECK ("contractType" IN ('ARC', 'FRG'));

CREATE INDEX "KitchenContract_contractType_idx"
ON "KitchenContract"("contractType");
