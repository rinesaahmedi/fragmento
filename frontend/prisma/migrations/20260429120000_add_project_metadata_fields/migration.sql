ALTER TABLE "Project"
ADD COLUMN "projectCode" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN "description" TEXT,
ADD COLUMN "managerName" TEXT;
