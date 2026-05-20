UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: D","Energieverbrauch: 82 kWh / 100 Zyklen.","Wasserverbrauch: 11.0 l/Zyklus.","Geraeusch: 49 dB","Breite: 60 cm","Geraetemasse H x B x T (mm): 815 x 598 x 550.","Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.","Tiefe bei geoeffneter Tuer (mm): 1150.","Programme: 5","Kapazitaet: 12 Massgedecke"]'::jsonb,
  "productInfoExtractedText" = 'Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspueler, 60 cm.
Wichtige Punkte:
- Produkttyp: vollintegrierter Einbau-Geschirrspueler.
- 12 Massgedecke, 5 Programme, 4 Temperaturen.
- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.
- Energieverbrauch: 82 kWh / 100 Zyklen.
- Wasserverbrauch: 11.0 l/Zyklus.
- Geraeusch: 49 dB(A), Klasse C.
- Geraetemasse H x B x T (mm): 815 x 598 x 550.
- Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.
- Tiefe bei geoeffneter Tuer (mm): 1150.
- Ausstattung: Aquastop, Extra Dry, OpenDry, halbe Beladung, Startzeitvorwahl 3/6/9 h.
Auswahlhinweise:
- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('DISH-B-600-STD', 'DISH-C-600-STD');
