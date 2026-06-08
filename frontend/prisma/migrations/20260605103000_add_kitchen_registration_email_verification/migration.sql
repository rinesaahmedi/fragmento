-- AlterTable
ALTER TABLE "KitchenRegistration"
ADD COLUMN "verificationCodeHash" TEXT,
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verifiedAt" TIMESTAMP(3);
