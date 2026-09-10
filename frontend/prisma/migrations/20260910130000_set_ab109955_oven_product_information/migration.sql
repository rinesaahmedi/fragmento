-- Register the appliance package as catalog data. The FRG product-info UI
-- resolves documents through the KitchenItem -> CatalogArticle relationship.
INSERT INTO "CatalogArticle" (
  "id", "articleNumber", "name", "nameDe", "widthMm", "price", "itemType",
  "productInfoPdfPath", "productInfoSummary", "productInfoKeyFacts",
  "productInfoExtractedText", "productInfoUpdatedAt", "isFixedPricePackage",
  "isActive", "createdAt", "updatedAt"
)
VALUES (
  'catalog-a-eh923640e-9ec744100c',
  'A-EH923640E + 9EC744100C',
  'Built-in oven and ceramic cooktop',
  'Einbauherd und Glaskeramikkochfeld',
  600, 0.00, 'COMPONENT',
  '/product-info/ovens/eh923640e/a-eh923640e-product-info.pdf',
  'Einbauherd A-EH923640E mit 62 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.',
  '[
    "Produkttyp: Einbauherd",
    "Artikelnummer: A-EH923640E",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 0,99 kWh konventionell / 0,77 kWh Heißluft/Umluft",
    "Garraumvolumen: 62 l",
    "Backofenfunktionen: 9",
    "Nischenmaße H x B x T: 600 x 560 x mindestens 560 mm",
    "Anschlusswert: 3,50 kW",
    "Spannung/Frequenz: 3N ~ 400 V / 50 Hz"
  ]'::jsonb,
  'Produktinformation für den architecto Einbauherd A-EH923640E. Energieeffizienzklasse A, 62 l Garraum und 9 Backofenfunktionen mit Umluft. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,77 kWh mit Heißluft/Umluft. Nischenmaße H x B x T 600 x 560 x mindestens 560 mm. Anschlusswert 3,50 kW bei 3N ~ 400 V / 50 Hz.',
  CURRENT_TIMESTAMP, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("articleNumber") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "nameDe" = EXCLUDED."nameDe",
  "widthMm" = EXCLUDED."widthMm",
  "price" = EXCLUDED."price",
  "itemType" = EXCLUDED."itemType",
  "productInfoPdfPath" = EXCLUDED."productInfoPdfPath",
  "productInfoSummary" = EXCLUDED."productInfoSummary",
  "productInfoKeyFacts" = EXCLUDED."productInfoKeyFacts",
  "productInfoExtractedText" = EXCLUDED."productInfoExtractedText",
  "productInfoUpdatedAt" = EXCLUDED."productInfoUpdatedAt",
  "isFixedPricePackage" = EXCLUDED."isFixedPricePackage",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Link the default oven/hob element to the catalog article. It stays locked
-- and default, so it remains absent from order-confirmation rows/attachments.
UPDATE "KitchenItem" AS item
SET
  "code" = 'OVEN-B-600-HOB',
  "articleNumber" = article."articleNumber",
  "name" = article."name",
  "nameDe" = article."nameDe",
  "infoText" = 'Built-in oven + ceramic cooktop',
  "catalogArticleId" = article."id",
  "catalogLinkStatus" = 'MATCHED',
  "productImagePath" = NULL,
  "productInfoPdfPath" = NULL,
  "productInfoSummary" = NULL,
  "productInfoKeyFacts" = NULL,
  "productInfoExtractedText" = NULL,
  "productInfoUpdatedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
CROSS JOIN "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109955'
  AND item."code" = 'OVEN-B-600-HOB'
  AND article."articleNumber" = 'A-EH923640E + 9EC744100C';

UPDATE "KitchenClaimPart" AS part
SET
  "articleCode" = 'A-EH923640E',
  "name" = 'Built-in Oven',
  "nameDe" = 'Einbauherd',
  "sourceKitchenItemCode" = 'OVEN-B-600-HOB',
  "productImagePath" = NULL,
  "productInfoPdfPath" = '/product-info/ovens/eh923640e/a-eh923640e-product-info.pdf',
  "productInfoSummary" = 'Einbauherd A-EH923640E mit 62 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.',
  "productInfoKeyFacts" = '[
    "Produkttyp: Einbauherd",
    "Artikelnummer: A-EH923640E",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 0,99 kWh konventionell / 0,77 kWh Heißluft/Umluft",
    "Garraumvolumen: 62 l",
    "Backofenfunktionen: 9",
    "Nischenmaße H x B x T: 600 x 560 x mindestens 560 mm",
    "Anschlusswert: 3,50 kW",
    "Spannung/Frequenz: 3N ~ 400 V / 50 Hz"
  ]'::jsonb,
  "productInfoExtractedText" = 'Produktinformation für den architecto Einbauherd A-EH923640E. Energieeffizienzklasse A, 62 l Garraum und 9 Backofenfunktionen mit Umluft. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,77 kWh mit Heißluft/Umluft. Nischenmaße H x B x T 600 x 560 x mindestens 560 mm. Anschlusswert 3,50 kW bei 3N ~ 400 V / 50 Hz.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE part."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-109955'
  AND part."partKey" = 'oven';
