WITH product_info_names("code", "productName") AS (
  VALUES
    ('DISH-600-STD', 'Vollintegrierter Geschirrspueler'),
    ('REF-545-1800-700', 'Kuehl-Gefriergeraet'),
    ('HOOD-600-FLAT', 'Flachschirmhaube, 60 cm'),
    ('WM-B-EWA34660W', 'Waschmaschine EWA34660W'),
    ('DISH-B-600-STD', 'Vollintegrierter Geschirrspueler'),
    ('REF-B-545-1800-700', 'Kuehl-Gefriergeraet OL-KGCN388140E'),
    ('HOOD-B-FH664621E', 'Flachschirmhaube, 60 cm FH 664 621 E'),
    ('REF-C-545-1800-700', 'Kuehl-Gefriergeraet OL-KGCN388140E'),
    ('HOOD-C-FH664621E', 'Kamin-Dunstabzugshaube FH 664 621 E'),
    ('WM-C-EWA34660W', 'Waschmaschine EWA34660W'),
    ('DISH-C-600-STD', 'Vollintegrierter Geschirrspueler')
)
UPDATE "KitchenItem" AS ki
SET
  "productInfoExtractedText" =
    CASE
      WHEN ki."productInfoExtractedText" IS NULL OR btrim(ki."productInfoExtractedText") = ''
        THEN 'Produktname: ' || product_info_names."productName" || '.'
      WHEN ki."productInfoExtractedText" NOT LIKE 'Produktname:%'
        THEN 'Produktname: ' || product_info_names."productName" || E'.\n' || ki."productInfoExtractedText"
      ELSE regexp_replace(
        ki."productInfoExtractedText",
        '^Produktname:[^\n]*',
        'Produktname: ' || product_info_names."productName" || '.'
      )
    END,
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
FROM product_info_names
WHERE ki."code" = product_info_names."code";
