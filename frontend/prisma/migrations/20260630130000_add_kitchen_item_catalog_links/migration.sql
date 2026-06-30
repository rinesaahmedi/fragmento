-- AlterTable
ALTER TABLE "KitchenItem" ADD COLUMN     "catalogArticleId" TEXT,
ADD COLUMN     "catalogBlendeId" TEXT,
ADD COLUMN     "catalogBlendeQuantity" INTEGER,
ADD COLUMN     "catalogLinkStatus" TEXT,
ADD COLUMN     "catalogServiceId" TEXT;

-- CreateIndex
CREATE INDEX "KitchenItem_catalogArticleId_idx" ON "KitchenItem"("catalogArticleId");

-- CreateIndex
CREATE INDEX "KitchenItem_catalogBlendeId_idx" ON "KitchenItem"("catalogBlendeId");

-- CreateIndex
CREATE INDEX "KitchenItem_catalogServiceId_idx" ON "KitchenItem"("catalogServiceId");

-- AddForeignKey
ALTER TABLE "KitchenItem" ADD CONSTRAINT "KitchenItem_catalogArticleId_fkey" FOREIGN KEY ("catalogArticleId") REFERENCES "CatalogArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenItem" ADD CONSTRAINT "KitchenItem_catalogBlendeId_fkey" FOREIGN KEY ("catalogBlendeId") REFERENCES "CatalogBlende"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenItem" ADD CONSTRAINT "KitchenItem_catalogServiceId_fkey" FOREIGN KEY ("catalogServiceId") REFERENCES "CatalogService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
