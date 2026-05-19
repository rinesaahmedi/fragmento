UPDATE "KitchenItem"
SET
  "productInfoSummary" = 'Energie-Label fuer das LED-Beleuchtungsset KA220043_S3. Das Label nennt Energieeffizienzklasse E und 3 kWh / 1000 h.',
  "productInfoKeyFacts" = '["Product type: LED lighting set.","Model: KA220043_S3.","Energy efficiency class: E.","Energy consumption: 3 kWh / 1000 h.","Document: Energy label."]'::jsonb,
  "productInfoExtractedText" = 'Product name: LED lighting set KA220043_S3.
Wichtige Punkte:
- Product type: LED lighting set.
- Model: KA220043_S3.
- Energy efficiency class: E.
- Energy consumption: 3 kWh / 1000 h.
- Document: Energy label.
Auswahlhinweise:
- Show this label with the LED lighting set.',
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('LIGHT-B-LED-001', 'LIGHT-C-LED-001', 'ACC-LIGHT-003');
