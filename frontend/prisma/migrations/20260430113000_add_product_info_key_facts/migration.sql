ALTER TABLE "KitchenItem"
  ADD COLUMN "productInfoKeyFacts" JSONB;

WITH product_info_facts("code", "keyFacts") AS (
  VALUES
    ('DISH-600-STD', '["Produkttyp: vollintegrierter Geschirrspueler.","Kapazitaet: 12 Massgedecke.","Einbaugeraet fuer die Integration in die Kuechenzeile.","Die Bedien- und Produktinformationen des PDF beachten."]'::jsonb),
    ('REF-545-1800-700', '["Produkttyp: Kuehl-Gefriergeraet.","Technisches Merkmal: NoFrost.","Ausfuehrung: Edelstahl.","Einbau- und Aufstellhinweise des PDF beachten."]'::jsonb),
    ('HOOD-600-FLAT', '["Produkttyp: flache Dunstabzugshaube.","Breite: 60 cm.","Einbau in den passenden Haubenbereich der Kueche.","Montage- und Abluft/Umluft-Hinweise des PDF beachten."]'::jsonb),
    ('WM-B-EWA34660W', '["Produkttyp: Waschmaschine.","Modell: EWA34660W.","Fassungsvermoegen: 8 kg.","Schleuderdrehzahl: 1400 U/min.","Wasser- und Stromanschluss nach Produktinformation beachten."]'::jsonb),
    ('DISH-B-600-STD', '["Produkttyp: vollintegrierter Geschirrspueler.","Kapazitaet: 12 Massgedecke.","Einbaugeraet fuer die Integration in die Kuechenzeile.","Die Bedien- und Produktinformationen des PDF beachten."]'::jsonb),
    ('REF-B-545-1800-700', '["Produkttyp: Kuehl-Gefriergeraet.","Modell: OL-KGCN388140E.","Technisches Merkmal: NoFrost.","Ausfuehrung: Edelstahl.","Einbau- und Aufstellhinweise des PDF beachten."]'::jsonb),
    ('HOOD-B-FH664621E', '["Produkttyp: Dunstabzugshaube.","Modell: FH664621E.","Breite: 60 cm.","Maximaler Luftstrom: 415 m3/h.","Montage- und Abluft/Umluft-Hinweise des PDF beachten."]'::jsonb),
    ('REF-C-545-1800-700', '["Produkttyp: Kuehl-Gefriergeraet.","Modell: OL-KGCN388140E.","Technisches Merkmal: NoFrost.","Ausfuehrung: Edelstahl.","Einbau- und Aufstellhinweise des PDF beachten."]'::jsonb),
    ('HOOD-C-FH664621E', '["Produkttyp: Kamin-Dunstabzugshaube.","Modell: FH664621E.","Breite: 60 cm.","Maximaler Luftstrom: 415 m3/h.","Montage- und Abluft/Umluft-Hinweise des PDF beachten."]'::jsonb),
    ('WM-C-EWA34660W', '["Produkttyp: Waschmaschine.","Modell: EWA34660W.","Fassungsvermoegen: 8 kg.","Schleuderdrehzahl: 1400 U/min.","Wasser- und Stromanschluss nach Produktinformation beachten."]'::jsonb),
    ('DISH-C-600-STD', '["Produkttyp: vollintegrierter Geschirrspueler.","Kapazitaet: 12 Massgedecke.","Einbaugeraet fuer die Integration in die Kuechenzeile.","Die Bedien- und Produktinformationen des PDF beachten."]'::jsonb)
)
UPDATE "KitchenItem" AS ki
SET
  "productInfoKeyFacts" = product_info_facts."keyFacts",
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
FROM product_info_facts
WHERE ki."code" = product_info_facts."code"
  AND ki."productInfoKeyFacts" IS NULL;
