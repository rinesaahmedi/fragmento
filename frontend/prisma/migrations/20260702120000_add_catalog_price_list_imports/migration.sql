-- AlterTable
ALTER TABLE "KitchenItem" ADD COLUMN IF NOT EXISTS "catalogPriceSyncMode" TEXT NOT NULL DEFAULT 'AUTO';

-- CreateTable
CREATE TABLE "CatalogPriceListImport" (
  "id" TEXT NOT NULL,
  "label" TEXT,
  "sourceName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'APPLIED',
  "notes" TEXT,
  "importedBy" TEXT,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "unchangedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "syncedKitchenItemCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),

  CONSTRAINT "CatalogPriceListImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogArticlePriceHistory" (
  "id" TEXT NOT NULL,
  "importId" TEXT,
  "catalogArticleId" TEXT,
  "articleNumber" TEXT NOT NULL,
  "oldPrice" DECIMAL(10,2),
  "newPrice" DECIMAL(10,2) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogArticlePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogBlendePriceHistory" (
  "id" TEXT NOT NULL,
  "importId" TEXT,
  "catalogBlendeId" TEXT,
  "code" TEXT NOT NULL,
  "oldPrice" DECIMAL(10,2),
  "newPrice" DECIMAL(10,2) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogBlendePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogServicePriceHistory" (
  "id" TEXT NOT NULL,
  "importId" TEXT,
  "catalogServiceId" TEXT,
  "code" TEXT NOT NULL,
  "oldPrice" DECIMAL(10,2),
  "newPrice" DECIMAL(10,2) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogServicePriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogArticlePriceHistory_importId_idx" ON "CatalogArticlePriceHistory"("importId");

-- CreateIndex
CREATE INDEX "CatalogArticlePriceHistory_catalogArticleId_idx" ON "CatalogArticlePriceHistory"("catalogArticleId");

-- CreateIndex
CREATE INDEX "CatalogArticlePriceHistory_articleNumber_idx" ON "CatalogArticlePriceHistory"("articleNumber");

-- CreateIndex
CREATE INDEX "CatalogBlendePriceHistory_importId_idx" ON "CatalogBlendePriceHistory"("importId");

-- CreateIndex
CREATE INDEX "CatalogBlendePriceHistory_catalogBlendeId_idx" ON "CatalogBlendePriceHistory"("catalogBlendeId");

-- CreateIndex
CREATE INDEX "CatalogBlendePriceHistory_code_idx" ON "CatalogBlendePriceHistory"("code");

-- CreateIndex
CREATE INDEX "CatalogServicePriceHistory_importId_idx" ON "CatalogServicePriceHistory"("importId");

-- CreateIndex
CREATE INDEX "CatalogServicePriceHistory_catalogServiceId_idx" ON "CatalogServicePriceHistory"("catalogServiceId");

-- CreateIndex
CREATE INDEX "CatalogServicePriceHistory_code_idx" ON "CatalogServicePriceHistory"("code");

-- AddForeignKey
ALTER TABLE "CatalogArticlePriceHistory" ADD CONSTRAINT "CatalogArticlePriceHistory_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CatalogPriceListImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogArticlePriceHistory" ADD CONSTRAINT "CatalogArticlePriceHistory_catalogArticleId_fkey" FOREIGN KEY ("catalogArticleId") REFERENCES "CatalogArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogBlendePriceHistory" ADD CONSTRAINT "CatalogBlendePriceHistory_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CatalogPriceListImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogBlendePriceHistory" ADD CONSTRAINT "CatalogBlendePriceHistory_catalogBlendeId_fkey" FOREIGN KEY ("catalogBlendeId") REFERENCES "CatalogBlende"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogServicePriceHistory" ADD CONSTRAINT "CatalogServicePriceHistory_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CatalogPriceListImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogServicePriceHistory" ADD CONSTRAINT "CatalogServicePriceHistory_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "CatalogService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
