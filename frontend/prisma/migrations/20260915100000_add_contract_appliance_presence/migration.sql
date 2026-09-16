-- Unknown legacy inventories remain distinguishable from an explicitly empty list.
ALTER TABLE "KitchenContract" ADD COLUMN "appliancesConfigured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContractAppliance" ADD COLUMN "isPresent" BOOLEAN NOT NULL DEFAULT true;
