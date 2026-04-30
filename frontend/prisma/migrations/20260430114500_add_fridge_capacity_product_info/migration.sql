WITH fridge_info("code") AS (
  VALUES
    ('REF-545-1800-700'),
    ('REF-B-545-1800-700'),
    ('REF-C-545-1800-700')
)
UPDATE "KitchenItem" AS ki
SET
  "productInfoKeyFacts" = CASE
    WHEN ki."code" = 'REF-545-1800-700' THEN
      '["Produkttyp: Kuehl-Gefriergeraet.","Technisches Merkmal: NoFrost.","Nutzinhalt total: 250 l.","Kuehlen: 180 l.","Gefrieren: 70 l.","Ausfuehrung: Edelstahl.","Einbau- und Aufstellhinweise des PDF beachten."]'::jsonb
    ELSE
      '["Produkttyp: Kuehl-Gefriergeraet.","Modell: OL-KGCN388140E.","Technisches Merkmal: NoFrost.","Nutzinhalt total: 250 l.","Kuehlen: 180 l.","Gefrieren: 70 l.","Ausfuehrung: Edelstahl.","Einbau- und Aufstellhinweise des PDF beachten."]'::jsonb
  END,
  "productInfoExtractedText" = CASE
    WHEN ki."productInfoExtractedText" LIKE '%Nutzinhalt total:%' THEN ki."productInfoExtractedText"
    ELSE replace(
      ki."productInfoExtractedText",
      '- Technisches Merkmal: NoFrost.',
      '- Technisches Merkmal: NoFrost.' || E'\n- Nutzinhalt total: 250 l.\n- Kuehlen: 180 l.\n- Gefrieren: 70 l.'
    )
  END,
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
FROM fridge_info
WHERE ki."code" = fridge_info."code";
