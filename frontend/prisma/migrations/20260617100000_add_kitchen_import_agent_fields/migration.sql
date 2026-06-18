ALTER TABLE "Kitchen"
  ADD COLUMN "importAgentStatus" TEXT,
  ADD COLUMN "importAgentStartedAt" TIMESTAMP(3),
  ADD COLUMN "importAgentFinishedAt" TIMESTAMP(3),
  ADD COLUMN "importAgentLogPath" TEXT,
  ADD COLUMN "importAgentLastMessage" TEXT;
