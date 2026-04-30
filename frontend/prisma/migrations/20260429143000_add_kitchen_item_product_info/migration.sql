ALTER TABLE "KitchenItem"
  ADD COLUMN "productInfoPdfPath" TEXT,
  ADD COLUMN "productInfoSummary" TEXT,
  ADD COLUMN "productInfoExtractedText" TEXT,
  ADD COLUMN "productInfoUpdatedAt" TIMESTAMP(3);

WITH product_info("code", "pdfPath", "summary", "extractedText") AS (
  VALUES
    (
      'DISH-600-STD',
      '/product-info/dishwasher-product-info.pdf',
      'Vollintegrierter Geschirrspueler fuer den Einbau in die Kuechenzeile. Die Produktinformation nennt 12 Massgedecke und die Einbindung hinter einer Moebelfront.',
      'Wichtige Punkte:
- Produkttyp: vollintegrierter Geschirrspueler.
- Kapazitaet: 12 Massgedecke.
- Einbaugeraet fuer die Integration in die Kuechenzeile.
- Die Bedien- und Produktinformationen des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.'
    ),
    (
      'REF-545-1800-700',
      '/product-info/fridge-product-info.pdf',
      'Kuehl-Gefriergeraet fuer die Kuechenplanung. Die Produktinformation nennt NoFrost und eine Edelstahl-Ausfuehrung.',
      'Wichtige Punkte:
- Produkttyp: Kuehl-Gefriergeraet.
- Technisches Merkmal: NoFrost.
- Ausfuehrung: Edelstahl.
- Einbau- und Aufstellhinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Geraetemass, Tueranschlag und Belueftung im Kuechenplan pruefen.'
    ),
    (
      'HOOD-600-FLAT',
      '/product-info/extractor-hood-flat-product-info.pdf',
      'Flache Dunstabzugshaube fuer eine 60-cm-Kuechenloesung. Die Produktinformation gehoert zur flachen Haubenvariante.',
      'Wichtige Punkte:
- Produkttyp: flache Dunstabzugshaube.
- Breite: 60 cm.
- Einbau in den passenden Haubenbereich der Kueche.
- Montage- und Abluft/Umluft-Hinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbauposition und Luftfuehrung pruefen.'
    ),
    (
      'WM-B-EWA34660W',
      '/product-info/washing-machine-product-info.pdf',
      'Waschmaschine EWA34660W fuer die Kuechenkonfiguration. Die Produktinformation nennt 8 kg Fassungsvermoegen und 1400 U/min.',
      'Wichtige Punkte:
- Produkttyp: Waschmaschine.
- Modell: EWA34660W.
- Fassungsvermoegen: 8 kg.
- Schleuderdrehzahl: 1400 U/min.
- Wasser- und Stromanschluss nach Produktinformation beachten.
Auswahlhinweise:
- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.'
    ),
    (
      'DISH-B-600-STD',
      '/product-info/dishwasher-product-info.pdf',
      'Vollintegrierter Geschirrspueler fuer den Einbau in die Kuechenzeile. Die Produktinformation nennt 12 Massgedecke und die Einbindung hinter einer Moebelfront.',
      'Wichtige Punkte:
- Produkttyp: vollintegrierter Geschirrspueler.
- Kapazitaet: 12 Massgedecke.
- Einbaugeraet fuer die Integration in die Kuechenzeile.
- Die Bedien- und Produktinformationen des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.'
    ),
    (
      'REF-B-545-1800-700',
      '/product-info/fridge-product-info.pdf',
      'Kuehl-Gefriergeraet OL-KGCN388140E fuer die Kuechenplanung. Die Produktinformation nennt NoFrost und eine Edelstahl-Ausfuehrung.',
      'Wichtige Punkte:
- Produkttyp: Kuehl-Gefriergeraet.
- Modell: OL-KGCN388140E.
- Technisches Merkmal: NoFrost.
- Ausfuehrung: Edelstahl.
- Einbau- und Aufstellhinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Geraetemass, Tueranschlag und Belueftung im Kuechenplan pruefen.'
    ),
    (
      'HOOD-B-FH664621E',
      '/product-info/extractor-hood-flat-product-info.pdf',
      'Dunstabzugshaube FH664621E fuer eine 60-cm-Kuechenloesung. Die Produktinformation nennt einen maximalen Luftstrom von 415 m3/h.',
      'Wichtige Punkte:
- Produkttyp: Dunstabzugshaube.
- Modell: FH664621E.
- Breite: 60 cm.
- Maximaler Luftstrom: 415 m3/h.
- Montage- und Abluft/Umluft-Hinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbauposition und Luftfuehrung pruefen.'
    ),
    (
      'REF-C-545-1800-700',
      '/product-info/fridge-product-info.pdf',
      'Kuehl-Gefriergeraet OL-KGCN388140E fuer die Kuechenplanung. Die Produktinformation nennt NoFrost und eine Edelstahl-Ausfuehrung.',
      'Wichtige Punkte:
- Produkttyp: Kuehl-Gefriergeraet.
- Modell: OL-KGCN388140E.
- Technisches Merkmal: NoFrost.
- Ausfuehrung: Edelstahl.
- Einbau- und Aufstellhinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Geraetemass, Tueranschlag und Belueftung im Kuechenplan pruefen.'
    ),
    (
      'HOOD-C-FH664621E',
      '/product-info/extractor-hood-chimney-product-info.pdf',
      'Kamin-Dunstabzugshaube FH664621E fuer eine 60-cm-Kuechenloesung. Die Produktinformation nennt einen maximalen Luftstrom von 415 m3/h.',
      'Wichtige Punkte:
- Produkttyp: Kamin-Dunstabzugshaube.
- Modell: FH664621E.
- Breite: 60 cm.
- Maximaler Luftstrom: 415 m3/h.
- Montage- und Abluft/Umluft-Hinweise des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbauposition und Luftfuehrung pruefen.'
    ),
    (
      'WM-C-EWA34660W',
      '/product-info/washing-machine-product-info.pdf',
      'Waschmaschine EWA34660W fuer die Kuechenkonfiguration. Die Produktinformation nennt 8 kg Fassungsvermoegen und 1400 U/min.',
      'Wichtige Punkte:
- Produkttyp: Waschmaschine.
- Modell: EWA34660W.
- Fassungsvermoegen: 8 kg.
- Schleuderdrehzahl: 1400 U/min.
- Wasser- und Stromanschluss nach Produktinformation beachten.
Auswahlhinweise:
- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.'
    ),
    (
      'DISH-C-600-STD',
      '/product-info/dishwasher-product-info.pdf',
      'Vollintegrierter Geschirrspueler fuer den Einbau in die Kuechenzeile. Die Produktinformation nennt 12 Massgedecke und die Einbindung hinter einer Moebelfront.',
      'Wichtige Punkte:
- Produkttyp: vollintegrierter Geschirrspueler.
- Kapazitaet: 12 Massgedecke.
- Einbaugeraet fuer die Integration in die Kuechenzeile.
- Die Bedien- und Produktinformationen des PDF beachten.
Auswahlhinweise:
- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.'
    )
)
UPDATE "KitchenItem" AS ki
SET
  "productInfoPdfPath" = product_info."pdfPath",
  "productInfoSummary" = product_info."summary",
  "productInfoExtractedText" = product_info."extractedText",
  "productInfoUpdatedAt" = CURRENT_TIMESTAMP
FROM product_info
WHERE ki."code" = product_info."code";
