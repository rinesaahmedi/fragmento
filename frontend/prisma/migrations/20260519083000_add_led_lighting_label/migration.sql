UPDATE "KitchenItem"
SET
  "productInfoPdfPath" = '/product-info/led-lighting-set-label.pdf',
  "productInfoSummary" = 'Energie-Label fuer das LED-Beleuchtungsset KA220043_S3.',
  "productInfoKeyFacts" = '["Produkttyp: LED-Beleuchtungsset.","Artikelnummer: KA220043_S3.","Dokument: Energie-Label."]'::jsonb,
  "productInfoExtractedText" = 'Produktname: LED-Beleuchtungsset KA220043_S3.
Wichtige Punkte:
- Produkttyp: LED-Beleuchtungsset.
- Artikelnummer: KA220043_S3.
- Dokument: Energie-Label.
Auswahlhinweise:
- Das Label beim LED-Beleuchtungsset anzeigen.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('LIGHT-B-LED-001', 'LIGHT-C-LED-001', 'ACC-LIGHT-003');
