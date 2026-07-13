CREATE TABLE "KitchenClaimPart" (
  "id" TEXT NOT NULL,
  "kitchenId" TEXT NOT NULL,
  "partKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameDe" TEXT,
  "sourceKitchenItemCode" TEXT,
  "sourceComponentKey" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "KitchenClaimPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KitchenClaimPart_kitchenId_partKey_key"
  ON "KitchenClaimPart"("kitchenId", "partKey");

CREATE INDEX "KitchenClaimPart_kitchenId_isActive_idx"
  ON "KitchenClaimPart"("kitchenId", "isActive");

ALTER TABLE "KitchenClaimPart"
  ADD CONSTRAINT "KitchenClaimPart_kitchenId_fkey"
  FOREIGN KEY ("kitchenId") REFERENCES "Kitchen"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH sink_sources AS (
  SELECT
    kitchen."id" AS "kitchenId",
    sink_cabinet."code" AS "sinkCabinetCode",
    sink_cabinet."componentKey" AS "sinkCabinetComponentKey",
    sink_fixture."code" AS "sinkFixtureCode",
    sink_fixture."componentKey" AS "sinkFixtureComponentKey"
  FROM "Kitchen" kitchen
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND (
        upper(item."code") LIKE 'SINKBASE-%'
        OR lower(coalesce(item."componentKey", '')) = 'sink-base'
      )
    ORDER BY
      CASE WHEN upper(item."code") LIKE 'SINKBASE-%' THEN 0 ELSE 1 END,
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) sink_cabinet ON true
  LEFT JOIN LATERAL (
    SELECT item."code", item."componentKey"
    FROM "KitchenItem" item
    WHERE item."kitchenId" = kitchen."id"
      AND item."isActive" = true
      AND lower(coalesce(item."componentKey", '')) = 'sink-faucet'
    ORDER BY
      CASE WHEN item."isLocked" THEN 0 ELSE 1 END,
      item."sortOrder",
      item."id"
    LIMIT 1
  ) sink_fixture ON true
)
INSERT INTO "KitchenClaimPart" (
  "id",
  "kitchenId",
  "partKey",
  "name",
  "nameDe",
  "sourceKitchenItemCode",
  "sourceComponentKey",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  source."kitchenId" || ':claim-part:' || part."partKey",
  source."kitchenId",
  part."partKey",
  part."name",
  part."nameDe",
  CASE
    WHEN part."partKey" = 'sink-cabinet' THEN source."sinkCabinetCode"
    ELSE source."sinkFixtureCode"
  END,
  CASE
    WHEN part."partKey" = 'sink-cabinet' THEN source."sinkCabinetComponentKey"
    ELSE source."sinkFixtureComponentKey"
  END,
  true,
  part."sortOrder",
  NOW(),
  NOW()
FROM sink_sources source
CROSS JOIN (
  VALUES
    ('sink', 'Sink', 'Spüle', 10),
    ('sink-cabinet', 'Sink Cabinet', 'Spülenunterschrank', 20),
    ('faucet', 'Faucet', 'Armatur', 30)
) AS part("partKey", "name", "nameDe", "sortOrder")
WHERE source."sinkCabinetCode" IS NOT NULL
   OR source."sinkFixtureCode" IS NOT NULL;
