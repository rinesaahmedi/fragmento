-- All currently hosted ARC contracts use BOSCH appliances. Backfill a complete
-- manual inventory while preserving whether each appliance was already present
-- or removed. Unreviewed ARC inventories keep their legacy all-present state;
-- reviewed inventories treat previously missing rows as absent.
INSERT INTO "ContractAppliance" (
  "id",
  "kitchenContractId",
  "applianceType",
  "brand",
  "articleNumber",
  "serialHelpProfile",
  "source",
  "isPresent",
  "createdAt",
  "updatedAt"
)
SELECT
  'arc-bosch-' || md5(contract."id" || ':' || appliance."applianceType"),
  contract."id",
  appliance."applianceType",
  'bosch',
  NULL,
  'bosch',
  'MANUAL',
  NOT contract."appliancesConfigured",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "KitchenContract" AS contract
CROSS JOIN (
  VALUES
    ('dishwasher'),
    ('fridge'),
    ('oven'),
    ('hob'),
    ('extractor_hood')
) AS appliance("applianceType")
WHERE contract."contractType" = 'ARC'
ON CONFLICT ("kitchenContractId", "applianceType") DO UPDATE SET
  "brand" = EXCLUDED."brand",
  "serialHelpProfile" = EXCLUDED."serialHelpProfile",
  "updatedAt" = CURRENT_TIMESTAMP;
