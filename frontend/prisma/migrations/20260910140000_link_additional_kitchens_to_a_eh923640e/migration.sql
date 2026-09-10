-- These kitchens use the same default A-EH923640E oven/cooktop package as
-- AB 109955. Link the generic default element to the shared catalog article.
UPDATE "KitchenItem" AS item
SET
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
  AND kitchen."slug" IN ('ab-110140', 'ab-110401', 'ab-110402', 'ab-110510')
  AND item."code" = 'OVEN-B-600-HOB'
  AND article."articleNumber" = 'A-EH923640E + 9EC744100C';

-- Keep the ASC oven identity and product-information source aligned with the
-- linked catalog package. This does not make the default item order-visible.
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
  AND kitchen."slug" IN ('ab-110140', 'ab-110401', 'ab-110402', 'ab-110510')
  AND part."partKey" = 'oven';
