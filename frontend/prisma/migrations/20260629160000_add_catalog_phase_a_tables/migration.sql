-- CreateTable
CREATE TABLE "CatalogArticle" (
    "id" TEXT NOT NULL,
    "articleNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameDe" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "isFixedPricePackage" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogBlende" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameDe" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogBlende_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameDe" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogArticle_articleNumber_key" ON "CatalogArticle"("articleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogBlende_code_key" ON "CatalogBlende"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogService_code_key" ON "CatalogService"("code");
