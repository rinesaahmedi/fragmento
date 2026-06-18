ALTER TABLE "Kitchen"
  ADD COLUMN "planImagePath" TEXT,
  ADD COLUMN "planPdfPath" TEXT,
  ADD COLUMN "hotspots" JSONB,
  ADD COLUMN "linkedComponentGroups" JSONB;

ALTER TABLE "KitchenItem"
  ADD COLUMN "calloutNumber" TEXT;
