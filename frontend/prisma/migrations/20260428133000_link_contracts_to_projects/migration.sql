DO $$
DECLARE
  missing_property_object_count integer;
  missing_project_mapping_count integer;
BEGIN
  SELECT COUNT(*)
  INTO missing_property_object_count
  FROM "KitchenContract"
  WHERE "propertyObjectId" IS NULL;

  SELECT COUNT(*)
  INTO missing_project_mapping_count
  FROM "KitchenContract" kc
  LEFT JOIN "Project" prj ON prj."propertyObjectId" = kc."propertyObjectId"
  WHERE kc."propertyObjectId" IS NOT NULL
    AND prj."id" IS NULL;

  IF missing_property_object_count > 0 OR missing_project_mapping_count > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate KitchenContract -> Project. Missing propertyObjectId rows: %, missing Project mapping rows: %.',
      missing_property_object_count,
      missing_project_mapping_count;
  END IF;
END $$;

ALTER TABLE "KitchenContract" ADD COLUMN "projectId" TEXT;

UPDATE "KitchenContract" kc
SET "projectId" = prj."id"
FROM "Project" prj
WHERE prj."propertyObjectId" = kc."propertyObjectId";

ALTER TABLE "KitchenContract" ALTER COLUMN "projectId" SET NOT NULL;

DROP INDEX IF EXISTS "KitchenContract_propertyObjectId_idx";
ALTER TABLE "KitchenContract" DROP CONSTRAINT IF EXISTS "KitchenContract_propertyObjectId_fkey";
ALTER TABLE "KitchenContract" DROP COLUMN "propertyObjectId";

CREATE INDEX "KitchenContract_projectId_idx" ON "KitchenContract"("projectId");

ALTER TABLE "KitchenContract" ADD CONSTRAINT "KitchenContract_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
