ALTER TABLE "CatalogArticle"
ADD COLUMN "productImagePath" TEXT,
ADD COLUMN "productInfoPdfPath" TEXT,
ADD COLUMN "productInfoSummary" TEXT,
ADD COLUMN "productInfoKeyFacts" JSONB,
ADD COLUMN "productInfoExtractedText" TEXT,
ADD COLUMN "productInfoUpdatedAt" TIMESTAMP(3);

-- Backfill one canonical Product Information record per linked catalog article.
-- KitchenItem columns remain temporarily as a compatibility fallback for
-- legacy and currently unlinked items.
WITH ranked_product_info AS (
  SELECT
    item."catalogArticleId",
    item."productImagePath",
    item."productInfoPdfPath",
    item."productInfoSummary",
    item."productInfoKeyFacts",
    item."productInfoExtractedText",
    item."productInfoUpdatedAt",
    ROW_NUMBER() OVER (
      PARTITION BY item."catalogArticleId"
      ORDER BY
        (
          CASE WHEN NULLIF(BTRIM(item."productInfoPdfPath"), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN NULLIF(BTRIM(item."productInfoSummary"), '') IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN item."productInfoKeyFacts" IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN NULLIF(BTRIM(item."productInfoExtractedText"), '') IS NOT NULL THEN 1 ELSE 0 END
        ) DESC,
        item."productInfoUpdatedAt" DESC NULLS LAST,
        item."updatedAt" DESC
    ) AS rank
  FROM "KitchenItem" AS item
  WHERE item."catalogArticleId" IS NOT NULL
)
UPDATE "CatalogArticle" AS article
SET
  "productImagePath" = source."productImagePath",
  "productInfoPdfPath" = source."productInfoPdfPath",
  "productInfoSummary" = source."productInfoSummary",
  "productInfoKeyFacts" = source."productInfoKeyFacts",
  "productInfoExtractedText" = source."productInfoExtractedText",
  "productInfoUpdatedAt" = source."productInfoUpdatedAt"
FROM ranked_product_info AS source
WHERE source.rank = 1
  AND source."catalogArticleId" = article."id";

-- Confirmed source document for OL-KGCN388140E.
UPDATE "CatalogArticle"
SET
  "productInfoPdfPath" = '/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf',
  "productInfoSummary" = 'Kühl-/Gefrierkombination KGCN 388 140 E, 180 cm, mit NoFrost, Inverter-Kompressor und 250 l Nutzinhalt. Die Produktinformation nennt Energieeffizienzklasse D, 174,1 kWh/Jahr und 39 dB.',
  "productInfoKeyFacts" = '[
    "Modell: KGCN 388 140 E",
    "Produkttyp: Kühl-/Gefrierkombination, 180 cm",
    "Energieeffizienzklasse: D",
    "Energieverbrauch: 174,1 kWh/Jahr",
    "Luftschallemission: 39 dB(A), Klasse C",
    "Nutzinhalt gesamt: 250 l",
    "Nutzinhalt Kühlen / Gefrieren: 180 / 70 l",
    "Gerätemaße H x B x T: 1810 x 540 x 576 mm",
    "NoFrost: Kühl- und Gefrierteil",
    "Gefrierleistung: 3,2 kg/24 h",
    "Temperaturanstiegszeit: 9 h",
    "Türanschlag: rechts, wechselbar"
  ]'::jsonb,
  "productInfoExtractedText" = 'Produktname: AMICA KGCN 388 140 E Kühl-/Gefrierkombination, 180 cm. NoFrost-Standgerät in Edelstahloptik mit elektronischer Steuerung, Inverter-Kompressor, Tür-Offen-Alarm, Superkühl- und Supergefrierfunktion. Nutzinhalt gesamt 250 l, davon 180 l Kühlen und 70 l Gefrieren. Energieeffizienzklasse D, Energieverbrauch 174,1 kWh/Jahr, Luftschallemission 39 dB(A) Klasse C. Gerätemaße H x B x T 1810 x 540 x 576 mm. Gefrierleistung 3,2 kg/24 h, Temperaturanstiegszeit 9 h. Türanschlag rechts und wechselbar.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "articleNumber" = 'OL-KGCN388140E';

-- Confirmed source document and model name for FH664621E.
UPDATE "CatalogArticle"
SET
  "productInfoPdfPath" = '/product-info/extractor-hood-flat-product-info.pdf',
  "productInfoSummary" = 'Flachschirmhaube FH 664 621 E, 60 cm, für Abluft- oder Umluftbetrieb. Die Produktinformation nennt Energieeffizienzklasse A, 170–415 m³/h Luftleistung und 49–70 dB.',
  "productInfoKeyFacts" = '[
    "Modell: FH 664 621 E",
    "Produkttyp: Flachschirmhaube / Teleskophaube",
    "Energieeffizienzklasse: A",
    "Energieverbrauch: 24,8 kWh/Jahr",
    "Geräusch: 49–70 dB",
    "Breite: 60 cm",
    "Luftleistung: 170–415 m³/h",
    "Leistungsstufen: 3",
    "Betriebsart: Abluft / Umluft",
    "Gerätemaße H x B x T: 173 x 599 x 303 mm",
    "Montageabstand über Kochfeld / Gaskochfeld: 450 / 650 mm",
    "Kohlefilter für Umluftbetrieb: FWK 124, 2 Stück"
  ]'::jsonb,
  "productInfoExtractedText" = 'Produktname: AMICA FH 664 621 E Flachschirmhaube, 60 cm. Teleskophaube in Edelstahl mit Kippschalter, drei Leistungsstufen von 170 bis 415 m³/h und Abluft-/Umluftbetrieb. Energieeffizienzklasse A, Energieverbrauch 24,8 kWh/Jahr, Schallleistungspegel 49 bis 70 dB. Zwei LED-Leuchten und zwei spülmaschinengeeignete Aluminium-Fettfilter. Gerätemaße H x B x T 173 x 599 x 303 mm. Montageabstand über Kochfeld 450 mm, über Gaskochfeld 650 mm. Für Umluftbetrieb ist der Kohlefilter FWK 124 mit zwei Filtern vorgesehen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "articleNumber" = 'FH664621E + FWK124 + HD6002';

-- Keep legacy KitchenItem fallbacks correct during the transition.
UPDATE "KitchenItem" AS item
SET
  "productImagePath" = article."productImagePath",
  "productInfoPdfPath" = article."productInfoPdfPath",
  "productInfoSummary" = article."productInfoSummary",
  "productInfoKeyFacts" = article."productInfoKeyFacts",
  "productInfoExtractedText" = article."productInfoExtractedText",
  "productInfoUpdatedAt" = article."productInfoUpdatedAt"
FROM "CatalogArticle" AS article
WHERE item."catalogArticleId" = article."id"
  AND article."articleNumber" IN (
    'OL-KGCN388140E',
    'FH664621E + FWK124 + HD6002'
  );
