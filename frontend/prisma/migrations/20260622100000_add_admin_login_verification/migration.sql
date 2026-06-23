ALTER TABLE "AdminUser"
ADD COLUMN "loginVerificationCodeHash" TEXT,
ADD COLUMN "loginVerificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "loginVerificationAttempts" INTEGER NOT NULL DEFAULT 0;
