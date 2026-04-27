CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "HousingCompany_name_trgm_idx"
  ON "HousingCompany" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "HousingCompany_address_trgm_idx"
  ON "HousingCompany" USING GIN ("address" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PropertyObject_name_trgm_idx"
  ON "PropertyObject" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PropertyObject_city_trgm_idx"
  ON "PropertyObject" USING GIN ("city" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PropertyObject_postalCode_trgm_idx"
  ON "PropertyObject" USING GIN ("postalCode" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PropertyObject_address1_trgm_idx"
  ON "PropertyObject" USING GIN ("address1" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_orderNumber_trgm_idx"
  ON "Order" USING GIN ("orderNumber" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_city_trgm_idx"
  ON "Order" USING GIN ("city" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_postalCode_trgm_idx"
  ON "Order" USING GIN ("postalCode" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_address1_trgm_idx"
  ON "Order" USING GIN ("address1" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "KitchenContract_contractNumber_trgm_idx"
  ON "KitchenContract" USING GIN ("contractNumber" gin_trgm_ops);
