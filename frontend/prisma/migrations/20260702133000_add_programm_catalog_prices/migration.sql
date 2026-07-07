-- AlterTable
ALTER TABLE "CatalogPriceListImport" ADD COLUMN IF NOT EXISTS "programmId" TEXT;

-- CreateTable
CREATE TABLE "CatalogArticleProgramPrice" (
  "id" TEXT NOT NULL,
  "programmId" TEXT NOT NULL,
  "catalogArticleId" TEXT NOT NULL,
  "articleNumber" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogArticleProgramPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogBlendeProgramPrice" (
  "id" TEXT NOT NULL,
  "programmId" TEXT NOT NULL,
  "catalogBlendeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogBlendeProgramPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogServiceProgramPrice" (
  "id" TEXT NOT NULL,
  "programmId" TEXT NOT NULL,
  "catalogServiceId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogServiceProgramPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogArticleProgramPrice_programmId_catalogArticleId_key" ON "CatalogArticleProgramPrice"("programmId", "catalogArticleId");

-- CreateIndex
CREATE INDEX "CatalogArticleProgramPrice_programmId_idx" ON "CatalogArticleProgramPrice"("programmId");

-- CreateIndex
CREATE INDEX "CatalogArticleProgramPrice_articleNumber_idx" ON "CatalogArticleProgramPrice"("articleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogBlendeProgramPrice_programmId_catalogBlendeId_key" ON "CatalogBlendeProgramPrice"("programmId", "catalogBlendeId");

-- CreateIndex
CREATE INDEX "CatalogBlendeProgramPrice_programmId_idx" ON "CatalogBlendeProgramPrice"("programmId");

-- CreateIndex
CREATE INDEX "CatalogBlendeProgramPrice_code_idx" ON "CatalogBlendeProgramPrice"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogServiceProgramPrice_programmId_catalogServiceId_key" ON "CatalogServiceProgramPrice"("programmId", "catalogServiceId");

-- CreateIndex
CREATE INDEX "CatalogServiceProgramPrice_programmId_idx" ON "CatalogServiceProgramPrice"("programmId");

-- CreateIndex
CREATE INDEX "CatalogServiceProgramPrice_code_idx" ON "CatalogServiceProgramPrice"("code");

-- AddForeignKey
ALTER TABLE "CatalogArticleProgramPrice" ADD CONSTRAINT "CatalogArticleProgramPrice_catalogArticleId_fkey" FOREIGN KEY ("catalogArticleId") REFERENCES "CatalogArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogBlendeProgramPrice" ADD CONSTRAINT "CatalogBlendeProgramPrice_catalogBlendeId_fkey" FOREIGN KEY ("catalogBlendeId") REFERENCES "CatalogBlende"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogServiceProgramPrice" ADD CONSTRAINT "CatalogServiceProgramPrice_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "CatalogService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
