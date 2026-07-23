ALTER TABLE "KitchenClaimPart"
ADD COLUMN "productImagePath" TEXT,
ADD COLUMN "productInfoPdfPath" TEXT,
ADD COLUMN "productInfoSummary" TEXT,
ADD COLUMN "productInfoKeyFacts" JSONB,
ADD COLUMN "productInfoExtractedText" TEXT,
ADD COLUMN "productInfoUpdatedAt" TIMESTAMP(3);

-- The default oven and cooktop are claim products, not one combined catalog article.
UPDATE "KitchenClaimPart"
SET
  "productImagePath" = '/product-images/email/ebx943600s-oven.jpg',
  "productInfoPdfPath" = '/product-info/ebx-943-600-s-product-info.pdf',
  "productInfoSummary" = 'Einbaubackofen mit 77 l Garraum, Energieeffizienzklasse A und 9 Backofenfunktionen.',
  "productInfoKeyFacts" = '[
    "Produkttyp: Einbaubackofen",
    "Modell der Produktinformation: EBX 943 600 S",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 0,99 kWh konventionell / 0,83 kWh Heißluft",
    "Garraumvolumen: 77 l",
    "Backofenfunktionen: 9",
    "Gerätemaße H x B x T: 595 x 595 x 575 mm",
    "Einbaumaße H x B x T: 595 x 560 x 560 mm"
  ]'::jsonb,
  "productInfoExtractedText" = 'Produktinformation für den Einbaubackofen EBX 943 600 S. Energieeffizienzklasse A, 77 l Garraum und 9 Backofenfunktionen. Energieverbrauch 0,99 kWh im konventionellen Betrieb und 0,83 kWh mit Heißluft. Gerätemaße H x B x T 595 x 595 x 575 mm. Einbaumaße H x B x T 595 x 560 x 560 mm.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "partKey" = 'oven'
  AND "articleCode" = 'EH92364E-A';

UPDATE "KitchenClaimPart"
SET
  "productImagePath" = '/product-images/email/ol-kmi754000e-hob.jpg',
  "productInfoPdfPath" = '/product-info/ol-kmi-754-000-e-product-info.pdf',
  "productInfoSummary" = 'Autarkes 60-cm-Induktionskochfeld mit 4 Kochzonen, Booster und 9 Leistungsstufen.',
  "productInfoKeyFacts" = '[
    "Produkttyp: Induktionskochfeld",
    "Modell der Produktinformation: OL-KMI 754 000 E",
    "Breite: 60 cm",
    "Kochzonen: 4",
    "Leistungsstufen: 9",
    "Gerätemaße B x T: 590 x 520 mm",
    "Ausschnittmaße B x T: 560 x 490 mm",
    "Funktionen: Booster, Timer, Restwärmeanzeige, Topferkennung und Kindersicherung"
  ]'::jsonb,
  "productInfoExtractedText" = 'Produktinformation für das autarke Induktionskochfeld OL-KMI 754 000 E. Breite 60 cm, 4 Kochzonen mit Booster und 9 Leistungsstufen. Gerätemaße B x T 590 x 520 mm. Ausschnittmaße B x T 560 x 490 mm. Timer, Restwärmeanzeige, Topferkennung und Kindersicherung.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "partKey" = 'cooktop'
  AND "articleCode" = '9EC744100C';

UPDATE "KitchenItem"
SET
  "catalogArticleId" = NULL,
  "catalogLinkStatus" = NULL
WHERE "catalogArticleId" = 'catalog-oven-hob-ebx943600s-olkmi754000e'
   OR "code" = 'OVEN-B-600-HOB';

DELETE FROM "CatalogArticle"
WHERE "id" = 'catalog-oven-hob-ebx943600s-olkmi754000e'
   OR "articleNumber" = 'EBX943600S + OL-KMI754000E';
