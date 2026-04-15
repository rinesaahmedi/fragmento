CREATE TABLE "PropertyOwner" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "KitchenContract" ADD COLUMN "ownerId" TEXT;

CREATE INDEX "KitchenContract_ownerId_idx" ON "KitchenContract"("ownerId");

ALTER TABLE "KitchenContract" ADD CONSTRAINT "KitchenContract_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "PropertyOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
