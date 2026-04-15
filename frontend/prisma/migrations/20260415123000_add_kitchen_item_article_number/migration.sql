ALTER TABLE "KitchenItem" ADD COLUMN "articleNumber" TEXT;

UPDATE "KitchenItem" AS ki
SET "articleNumber" = data."articleNumber"
FROM (
  VALUES
    ('kitchen-model-b', 'WM-B-EWA34660W', 'EWA34660W'),
    ('kitchen-model-b', 'DISH-B-600-STD', 'A-EGSPV597210'),
    ('kitchen-model-b', 'REF-B-545-1800-700', 'OL-KGCN388140E'),
    ('kitchen-model-b', 'HOOD-B-FH664621E', 'FH664621E'),
    ('kitchen-model-b', 'ACC-CUTLERY-ZB60SG', 'ZB60SG'),
    ('kitchen-model-b', 'SINK-B-BOTTON-45', '517467'),
    ('kitchen-model-b', 'ACC-LIGHT-003', 'KA220043_S3'),
    ('kitchen-model-b', 'LIGHT-B-LED-001', 'KA220043_S3'),
    ('kitchen-model-c', 'WM-C-EWA34660W', 'EWA34660W'),
    ('kitchen-model-c', 'DISH-C-600-STD', 'A-EGSPV597210'),
    ('kitchen-model-c', 'REF-C-545-1800-700', 'OL-KGCN388140E'),
    ('kitchen-model-c', 'ACC-CUTLERY-001', 'ZB60SG'),
    ('kitchen-model-c', 'SINK-C-BOTTON-45', '517467'),
    ('kitchen-model-c', 'ACC-LIGHT-003', 'KA220043_S3'),
    ('kitchen-model-c', 'LIGHT-C-LED-001', 'KA220043_S3')
) AS data("kitchenSlug", "code", "articleNumber")
JOIN "Kitchen" AS k ON k."slug" = data."kitchenSlug"
WHERE ki."kitchenId" = k."id"
  AND ki."code" = data."code";
