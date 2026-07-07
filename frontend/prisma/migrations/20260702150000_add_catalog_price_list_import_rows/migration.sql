-- CreateTable
CREATE TABLE "CatalogPriceListImportRow" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "itemKind" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "articleNumber" TEXT,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "nameDe" TEXT,
  "description" TEXT,
  "widthMm" INTEGER,
  "heightMm" INTEGER,
  "depthMm" INTEGER,
  "itemType" "ItemType",
  "price" DECIMAL(10,2) NOT NULL,
  "isFixedPricePackage" BOOLEAN,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogPriceListImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CatalogPriceListImportRow_importId_idx" ON "CatalogPriceListImportRow"("importId");

-- CreateIndex
CREATE INDEX "CatalogPriceListImportRow_itemKind_idx" ON "CatalogPriceListImportRow"("itemKind");

-- CreateIndex
CREATE INDEX "CatalogPriceListImportRow_identifier_idx" ON "CatalogPriceListImportRow"("identifier");

-- AddForeignKey
ALTER TABLE "CatalogPriceListImportRow" ADD CONSTRAINT "CatalogPriceListImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CatalogPriceListImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
