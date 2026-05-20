UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: A","Geraeusch: max. 70 dB","Breite: 60 cm","Luftleistung: 170-415 m3/h","Betriebsart: Abluft / Umluft","Jahresverbrauch: 24.8 kWh/Jahr.","Geraetemasse H x B x T (mm): 173,0 x 599 x 303."]'::jsonb,
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'HOOD-B-FH664621E';

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: D","Energieverbrauch: 82 kWh / 100 Zyklen.","Geraeusch: 49 dB","Breite: 60 cm","Geraetemasse H x B x T (mm): 815 x 598 x 550.","Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.","Tiefe bei geoeffneter Tuer (mm): 1150.","Programme: 5","Kapazitaet: 12 Massgedecke"]'::jsonb,
  "productInfoExtractedText" = 'Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspueler, 60 cm.
Wichtige Punkte:
- Produkttyp: vollintegrierter Einbau-Geschirrspueler.
- 12 Massgedecke, 5 Programme, 4 Temperaturen.
- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.
- Energieverbrauch: 82 kWh / 100 Zyklen.
- Geraeusch: 49 dB(A), Klasse C.
- Geraetemasse H x B x T (mm): 815 x 598 x 550.
- Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.
- Tiefe bei geoeffneter Tuer (mm): 1150.
- Ausstattung: Aquastop, Extra Dry, OpenDry, halbe Beladung, Startzeitvorwahl 3/6/9 h.
Auswahlhinweise:
- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('DISH-B-600-STD', 'DISH-C-600-STD');

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: E","Geraeusch: 41 dB","Hoehe: 180 cm","Nutzinhalt: 250 l","NoFrost: Kuehlen und Gefrieren","Jahresverbrauch: 219 kWh/Jahr.","Geraetemasse H x B x T (mm): 1800 x 545 x 590."]'::jsonb,
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('REF-B-545-1800-700', 'REF-C-545-1800-700');

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Backofen: Energieklasse A","Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.","Backofen: 77 l Volumen, 9 Funktionen","Backofen: Geraetemasse H x B x T (mm): 595 x 595 x 575.","Backofen: Einbaumasse H x B x T (mm): 595,0 x 560 x 560.","Kochfeld: 60 cm, 4 Kochzonen","Kochfeld: Geraetemasse B x T (mm): 590 x 520.","Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.","Kochfeld: 9 Leistungsstufen","Set: Backofen + Induktionskochfeld"]'::jsonb,
  "productInfoExtractedText" = 'Produktname: AMICA EBX 943 600 S Backofen + AMICA OL-KMI 754 000 E Induktionskochfeld.
Wichtige Punkte:
- Backofen: Einbau-Elektrobackofen mit 77 l Volumen, Energieklasse A und 9 Funktionen.
- Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.
- Backofen: Geraetemasse H x B x T (mm): 595 x 595 x 575.
- Backofen: Einbaumasse H x B x T (mm): 595,0 x 560 x 560.
- Backofen: SensorControl Timer, versenkbare Knebel, CoolDoor3, Steam Clean.
- Kochfeld: autarkes Induktionskochfeld, 60 cm, 4 Kochzonen mit Booster.
- Kochfeld: Geraetemasse B x T (mm): 590 x 520.
- Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.
- Kochfeld: 9 Leistungsstufen, Timer, Restwaermeanzeige, Topferkennung, Kindersicherung.
Auswahlhinweise:
- Vor der Bestellung Nischenmass, Anschlusswert und Elektroanschluss pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('OVEN-B-600-HOB', 'OVEN-C-600-HOB');
