UPDATE "KitchenItem"
SET
  "productInfoSummary" = 'Waschmaschine EWA34660W fuer die Kuechenkonfiguration. Die Produktinformation nennt Energieeffizienzklasse A, 47 kWh / 100 Zyklen, 48 l/Zyklus, 8 kg Fassungsvermoegen, 1400 U/min, 72 dB(A) und Geraetemasse 830 x 600 x 540 mm.',
  "productInfoKeyFacts" = '["Produkttyp: Waschmaschine.","Modell: EWA34660W.","Energieeffizienzklasse: A.","Energieverbrauch: 47 kWh / 100 Zyklen.","Wasserverbrauch: 48 l/Zyklus.","Fassungsvermoegen: 8 kg.","Schleuderdrehzahl: 1400 U/min.","Geraeusch: 72 dB(A)","Geraetemasse H x B x T (mm): 830 x 600 x 540.","Einbaumasse H x B x T (mm): 825 x 600 x 580.","Wasser- und Stromanschluss nach Produktinformation beachten."]'::jsonb,
  "productInfoExtractedText" = 'Produktname: Waschmaschine EWA34660W.
Wichtige Punkte:
- Produkttyp: Waschmaschine.
- Modell: EWA34660W.
- Energieeffizienzklasse: A.
- Energieverbrauch: 47 kWh / 100 Zyklen.
- Wasserverbrauch: 48 l/Zyklus.
- Fassungsvermoegen: 8 kg.
- Schleuderdrehzahl: 1400 U/min.
- Geraeusch: 72 dB(A)
- Geraetemasse H x B x T (mm): 830 x 600 x 540.
- Einbaumasse H x B x T (mm): 825 x 600 x 580.
- Wasser- und Stromanschluss nach Produktinformation beachten.
Auswahlhinweise:
- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('WM-B-EWA34660W', 'WM-C-EWA34660W');

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: D","Geraeusch: 49 dB","Breite: 60 cm","Geraetemasse H x B x T (mm): 815 x 598 x 550.","Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.","Tiefe bei geoeffneter Tuer (mm): 1150.","Programme: 5","Kapazitaet: 12 Massgedecke"]'::jsonb,
  "productInfoExtractedText" = 'Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspueler, 60 cm.
Wichtige Punkte:
- Produkttyp: vollintegrierter Einbau-Geschirrspueler.
- 12 Massgedecke, 5 Programme, 4 Temperaturen.
- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.
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
  "productInfoKeyFacts" = '["Energieklasse: E","Geraeusch: 41 dB","Hoehe: 180 cm","Nutzinhalt: 250 l","NoFrost: Kuehlen und Gefrieren","Geraetemasse H x B x T (mm): 1800 x 545 x 590."]'::jsonb,
  "productInfoExtractedText" = 'Produktname: AMICA KGC 15495 S Kuehl-/Gefrierkombination, 180 cm.
Wichtige Punkte:
- Modell: KGC 15495 S.
- Freistehendes Kuehl-Gefriergeraet mit NoFrost und automatischer Abtauung.
- Geraetemasse H x B x T (mm): 1800 x 545 x 590.
- Energieklasse E, Jahresverbrauch 219 kWh, Geraeusch 41 dB(A), Klasse C.
- Kuehlen 180 l, Gefrieren 70 l, 4-Sterne-Gefrierteil.
- Ausstattung: FreshZone, VitControl Plus, LED-Licht, Flaschenregal, 3 Gefrierschubladen.
Auswahlhinweise:
- Vor der Bestellung Geraetemass, Tueranschlag und Belueftung im Kuechenplan pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('REF-B-545-1800-700', 'REF-C-545-1800-700');

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Energieklasse: A","Geraeusch: max. 70 dB","Breite: 60 cm","Luftleistung: 170-415 m3/h","Betriebsart: Abluft / Umluft","Geraetemasse H x B x T (mm): 173,0 x 599 x 303."]'::jsonb,
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'HOOD-B-FH664621E';

UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Backofen: Energieklasse A","Backofen: 77 l Volumen, 9 Funktionen","Backofen: Geraetemasse H x B x T (mm): 595 x 595 x 575.","Backofen: Einbaumasse H x B x T (mm): 595,0 x 560 x 560.","Kochfeld: 60 cm, 4 Kochzonen","Kochfeld: Geraetemasse B x T (mm): 590 x 520.","Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.","Kochfeld: 9 Leistungsstufen","Set: Backofen + Induktionskochfeld"]'::jsonb,
  "productInfoExtractedText" = 'Produktname: AMICA EBX 943 600 S Backofen + AMICA OL-KMI 754 000 E Induktionskochfeld.
Wichtige Punkte:
- Backofen: Einbau-Elektrobackofen mit 77 l Volumen, Energieklasse A und 9 Funktionen.
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
