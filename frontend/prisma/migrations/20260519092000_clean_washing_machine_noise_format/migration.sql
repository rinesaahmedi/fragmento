UPDATE "KitchenItem"
SET
  "productInfoKeyFacts" = '["Produkttyp: Waschmaschine.","Modell: EWA34660W.","Fassungsvermoegen: 8 kg.","Schleuderdrehzahl: 1400 U/min.","Geraeusch: 72 dB(A)","Wasser- und Stromanschluss nach Produktinformation beachten."]'::jsonb,
  "productInfoExtractedText" = 'Produktname: Waschmaschine EWA34660W.
Wichtige Punkte:
- Produkttyp: Waschmaschine.
- Modell: EWA34660W.
- Fassungsvermoegen: 8 kg.
- Schleuderdrehzahl: 1400 U/min.
- Geraeusch: 72 dB(A)
- Wasser- und Stromanschluss nach Produktinformation beachten.
Auswahlhinweise:
- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('WM-B-EWA34660W', 'WM-C-EWA34660W');
