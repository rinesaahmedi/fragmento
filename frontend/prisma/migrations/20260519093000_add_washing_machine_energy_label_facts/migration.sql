UPDATE "KitchenItem"
SET
  "productInfoSummary" = 'Waschmaschine EWA34660W fuer die Kuechenkonfiguration. Die Produktinformation nennt Energieeffizienzklasse A, 47 kWh / 100 Zyklen, 48 l/Zyklus, 8 kg Fassungsvermoegen, 1400 U/min und 72 dB(A).',
  "productInfoKeyFacts" = '["Produkttyp: Waschmaschine.","Modell: EWA34660W.","Energieeffizienzklasse: A.","Energieverbrauch: 47 kWh / 100 Zyklen.","Wasserverbrauch: 48 l/Zyklus.","Fassungsvermoegen: 8 kg.","Schleuderdrehzahl: 1400 U/min.","Geraeusch: 72 dB(A)","Wasser- und Stromanschluss nach Produktinformation beachten."]'::jsonb,
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
- Wasser- und Stromanschluss nach Produktinformation beachten.
Auswahlhinweise:
- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('WM-B-EWA34660W', 'WM-C-EWA34660W');
