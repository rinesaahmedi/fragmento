-- Translate the US2A drawer labels to the approved German wording.
-- Limit this one-time correction to the previous canonical labels; normal
-- seed runs remain insert-only and do not overwrite dashboard edits.
UPDATE "CatalogArticle"
SET "nameDe" = CASE "articleNumber"
  WHEN 'US2A100' THEN 'Unterschrank mit 3 Schubladen 100 cm'
  WHEN 'US2A30' THEN 'Unterschrank mit 3 Schubladen 30 cm'
  WHEN 'US2A40' THEN 'Unterschrank mit 3 Schubladen 40 cm'
  WHEN 'US2A45' THEN 'Unterschrank mit 3 Schubladen 45 cm'
  WHEN 'US2A50' THEN 'Unterschrank mit 3 Schubladen 50 cm'
  WHEN 'US2A60' THEN 'Unterschrank mit 3 Schubladen 60 cm'
  WHEN 'US2A80' THEN 'Unterschrank mit 3 Schubladen 80 cm'
  WHEN 'US2A90' THEN 'Unterschrank mit 3 Schubladen 90 cm'
END
WHERE "articleNumber" IN ('US2A100', 'US2A30', 'US2A40', 'US2A45', 'US2A50', 'US2A60', 'US2A80', 'US2A90')
  AND "nameDe" LIKE 'Unterschrank mit Schublade/Auszug %';
