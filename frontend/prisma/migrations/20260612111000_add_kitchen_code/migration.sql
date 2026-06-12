ALTER TABLE "Kitchen" ADD COLUMN "kitchenCode" TEXT;

UPDATE "Kitchen"
SET "kitchenCode" = CASE "slug"
  WHEN 'l-shaped-kitchen' THEN '105 809'
  WHEN 'kitchen-model-b' THEN '260 309'
  WHEN 'kitchen-model-c' THEN '560303'
  ELSE NULL
END
WHERE "slug" IN ('l-shaped-kitchen', 'kitchen-model-b', 'kitchen-model-c');
