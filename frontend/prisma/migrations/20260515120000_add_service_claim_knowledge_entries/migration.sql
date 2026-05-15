CREATE TABLE "ServiceClaimKnowledgeEntry" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "applianceType" TEXT NOT NULL,
  "topicType" TEXT NOT NULL,
  "code" TEXT,
  "titleKey" TEXT NOT NULL,
  "symptomKeys" JSONB,
  "checkKeys" JSONB,
  "causeKeys" JSONB,
  "actionKeys" JSONB,
  "triggerTerms" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceClaimKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceClaimKnowledgeEntry_slug_key" ON "ServiceClaimKnowledgeEntry"("slug");
CREATE INDEX "ServiceClaimKnowledgeEntry_brand_applianceType_isActive_idx" ON "ServiceClaimKnowledgeEntry"("brand", "applianceType", "isActive");
CREATE INDEX "ServiceClaimKnowledgeEntry_topicType_code_idx" ON "ServiceClaimKnowledgeEntry"("topicType", "code");
