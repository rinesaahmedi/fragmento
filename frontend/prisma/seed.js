const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");
const CLAIMS_CHATBOT_KNOWLEDGE = require("../lib/claims-chatbot-knowledge.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = require("../lib/service-claim-troubleshooting-data.json");

const prisma = new PrismaClient();

const PRODUCT_INFO_FILES = {
  dishwasher: "/product-info/a-egspv597210-product-info-eco21.pdf",
  oven: "/product-info/ebx-943-600-s-product-info.pdf",
  hood: "/product-info/fh-664-621-s-product-info.pdf",
  hoodChimney: "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf",
  fridge: "/product-info/kgc-15495-s-product-info-eco21.pdf",
  ledLightingLabel: "/product-info/led-lighting-set-elabel.pdf",
};

const PRODUCT_IMAGE_FILES = {
  dishwasher: "/product-images/email/a-egspv597210-dishwasher.jpg",
  oven: "/product-images/email/ebx943600s-oven.jpg",
  hob: "/product-images/email/ol-kmi754000e-hob.jpg",
  hood: "/product-images/email/fh664621s-flat-hood.jpg",
  hoodChimney: "/product-images/email/khf664611s-chimney-hood.jpg",
  fridge: "/product-images/email/kgc15495s-fridge.jpg",
  washingMachine: "/product-images/email/ewa34660w-washing-machine.jpg",
};

const PRODUCT_INFO_BY_CODE = {
  "DISH-600-STD": {
    productImagePath: PRODUCT_IMAGE_FILES.dishwasher,
    productInfoPdfPath: PRODUCT_INFO_FILES.dishwasher,
    productInfoSummary: "Vollintegrierter 60-cm-Geschirrspueler fuer den Einbau hinter einer Moebelfront. Die aktuelle Produktinformation nennt 12 Massgedecke, Energieklasse D und 5 Programme.",
    productInfoKeyFacts: [
      "Energieklasse: D",
      "Energieverbrauch: 82 kWh / 100 Zyklen.",
      "Wasserverbrauch: 11.0 l/Zyklus.",
      "Geraeusch: 49 dB",
      "Breite: 60 cm",
      "Geraetemasse H x B x T (mm): 815 x 598 x 550.",
      "Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.",
      "Tiefe bei geoeffneter Tuer (mm): 1150.",
      "Programme: 5",
      "Kapazitaet: 12 Massgedecke",
    ],
    productInfoExtractedText: [
      "Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspueler, 60 cm.",
      "Wichtige Punkte:",
      "- Produkttyp: vollintegrierter Einbau-Geschirrspueler.",
      "- 12 Massgedecke, 5 Programme, 4 Temperaturen.",
      "- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.",
      "- Energieverbrauch: 82 kWh / 100 Zyklen.",
      "- Wasserverbrauch: 11.0 l/Zyklus.",
      "- Geraeusch: 49 dB(A), Klasse C.",
      "- Geraetemasse H x B x T (mm): 815 x 598 x 550.",
      "- Einbaumasse H x B x T (mm): 820 - 870 x 600 x 580.",
      "- Tiefe bei geoeffneter Tuer (mm): 1150.",
      "- Ausstattung: Aquastop, Extra Dry, OpenDry, halbe Beladung, Startzeitvorwahl 3/6/9 h.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbaumass, Frontintegration und Anschlussposition pruefen.",
    ].join("\n"),
  },
  "REF-545-1800-700": {
    productImagePath: PRODUCT_IMAGE_FILES.fridge,
    productInfoPdfPath: PRODUCT_INFO_FILES.fridge,
    productInfoSummary: "Freistehende Kuehl-Gefrierkombination KGC 15495 S fuer die Kuechenplanung. Die aktuelle Produktinformation nennt NoFrost, 180 cm Bauhoehe und Energieklasse E.",
    productInfoKeyFacts: [
      "Energieklasse: E",
      "Geraeusch: 41 dB",
      "Hoehe: 180 cm",
      "Nutzinhalt: 250 l",
      "NoFrost: Kuehlen und Gefrieren",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA KGC 15495 S Kuehl-/Gefrierkombination, 180 cm.",
      "Wichtige Punkte:",
      "- Freistehendes Kuehl-Gefriergeraet mit NoFrost und automatischer Abtauung.",
      "- Energieklasse E, Jahresverbrauch 219 kWh, Geraeusch 41 dB(A), Klasse C.",
      "- Kuehlen 180 l, Gefrieren 70 l, 4-Sterne-Gefrierteil.",
      "- Ausstattung: FreshZone, VitControl Plus, LED-Licht, Flaschenregal, 3 Gefrierschubladen.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Geraetemass, Tueranschlag und Belueftung im Kuechenplan pruefen.",
    ].join("\n"),
  },
  "HOOD-600-FLAT": {
    productImagePath: PRODUCT_IMAGE_FILES.hood,
    productInfoPdfPath: PRODUCT_INFO_FILES.hood,
    productInfoSummary: "Flachschirmhaube FH 664 621 S fuer eine 60-cm-Kuechenloesung. Die aktuelle Produktinformation nennt Energieklasse A und bis zu 70 dB Betriebsgeraesch.",
    productInfoKeyFacts: [
      "Energieklasse: A",
      "Geraeusch: max. 70 dB",
      "Breite: 60 cm",
      "Luftleistung: 170-415 m3/h",
      "Betriebsart: Abluft / Umluft",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA FH 664 621 S Flachschirmhaube, 60 cm.",
      "Wichtige Punkte:",
      "- Teleskophaube / Flachschirmhaube in Schwarz mit mechanischen Schaltern.",
      "- Energieklasse A, Jahresverbrauch 24.8 kWh, Fluid-Dynamic-Effizienzklasse B.",
      "- 3 Leistungsstufen, Luftleistung 170-415 m3/h, Geraeusch 49-70 dB.",
      "- 2 LED-Leuchten, 2 spuelmaschinengeeignete Aluminium-Fettfilter.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbauposition und Luftfuehrung pruefen.",
    ].join("\n"),
  },
  "WM-B-EWA34660W": {
    productImagePath: PRODUCT_IMAGE_FILES.washingMachine,
    productInfoPdfPath: "/product-info/ewa-34660-w-product-info.pdf",
    productInfoSummary: "Waschmaschine EWA34660W fuer die Kuechenkonfiguration. Die Produktinformation nennt Energieeffizienzklasse A, 47 kWh / 100 Zyklen, 48 l/Zyklus, 8 kg Fassungsvermoegen, 1400 U/min, 72 dB(A) und Geraetemasse 830 x 600 x 540 mm.",
    productInfoKeyFacts: [
      "Produkttyp: Waschmaschine.",
      "Modell: EWA34660W.",
      "Energieeffizienzklasse: A.",
      "Energieverbrauch: 47 kWh / 100 Zyklen.",
      "Wasserverbrauch: 48 l/Zyklus.",
      "Fassungsvermoegen: 8 kg.",
      "Schleuderdrehzahl: 1400 U/min.",
      "Geraeusch: 72 dB(A)",
      "Geraetemasse H x B x T (mm): 830 x 600 x 540.",
      "Einbaumasse H x B x T (mm): 825 x 600 x 580.",
      "Wasser- und Stromanschluss nach Produktinformation beachten.",
    ],
    productInfoExtractedText: [
      "Produktname: Waschmaschine EWA34660W.",
      "Wichtige Punkte:",
      "- Produkttyp: Waschmaschine.",
      "- Modell: EWA34660W.",
      "- Energieeffizienzklasse: A.",
      "- Energieverbrauch: 47 kWh / 100 Zyklen.",
      "- Wasserverbrauch: 48 l/Zyklus.",
      "- Fassungsvermoegen: 8 kg.",
      "- Schleuderdrehzahl: 1400 U/min.",
      "- Geraeusch: 72 dB(A)",
      "- Geraetemasse H x B x T (mm): 830 x 600 x 540.",
      "- Einbaumasse H x B x T (mm): 825 x 600 x 580.",
      "- Wasser- und Stromanschluss nach Produktinformation beachten.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Wasseranschluss, Ablauf und Stellmass pruefen.",
    ].join("\n"),
  },
  "DISH-B-600-STD": null,
  "OVEN-B-600-HOB": null,
  "REF-B-545-1800-700": null,
  "HOOD-B-FH664621E": null,
  "OVEN-C-600-HOB": null,
  "REF-C-545-1800-700": null,
  "HOOD-C-FH664621E": null,
  "WM-C-EWA34660W": null,
  "DISH-C-600-STD": null,
};

PRODUCT_INFO_BY_CODE["DISH-B-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-C-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-LS-600-STD"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105806-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105807-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105819-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105841-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105821-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105822-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105836-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105842-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105834-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105837-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"] = {
  ...PRODUCT_INFO_BY_CODE["REF-545-1800-700"],
  productInfoKeyFacts: [
    ...PRODUCT_INFO_BY_CODE["REF-545-1800-700"].productInfoKeyFacts,
    "Jahresverbrauch: 219 kWh/Jahr.",
    "Geraetemasse H x B x T (mm): 1800 x 545 x 590.",
  ],
  productInfoExtractedText: PRODUCT_INFO_BY_CODE["REF-545-1800-700"].productInfoExtractedText
    .replace("Produktname: AMICA KGC 15495 S Kuehl-/Gefrierkombination, 180 cm.", "Produktname: AMICA KGC 15495 S Kuehl-/Gefrierkombination, 180 cm.")
    .replace(
      "- Freistehendes Kuehl-Gefriergeraet mit NoFrost und automatischer Abtauung.",
      "- Modell: KGC 15495 S.\n- Freistehendes Kuehl-Gefriergeraet mit NoFrost und automatischer Abtauung.\n- Geraetemasse H x B x T (mm): 1800 x 545 x 590.",
    ),
};
PRODUCT_INFO_BY_CODE["REF-C-545-1800-700"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105806-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105807-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105819-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105841-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105821-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"] = {
  ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"],
  productInfoKeyFacts: [
    ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"].productInfoKeyFacts,
    "Jahresverbrauch: 24.8 kWh/Jahr.",
    "Geraetemasse H x B x T (mm): 173,0 x 599 x 303.",
  ],
};
PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"] = {
  productImagePath: PRODUCT_IMAGE_FILES.hoodChimney,
  productInfoPdfPath: PRODUCT_INFO_FILES.hoodChimney,
  productInfoSummary: "Kaminhaube KHF 664 611 S Stripe X fuer die Kochwand. Die Produktinformation nennt Energieklasse A++, 60 cm Breite und bis zu 67 dB.",
  productInfoKeyFacts: [
    "Energieklasse: A++",
    "Geraeusch: max. 67 dB",
    "Breite: 60 cm",
    "Luftleistung: 317-595 m3/h",
    "Betriebsart: Abluft / Umluft",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA KHF 664 611 S Stripe X Kaminhaube, 60 cm.",
    "Wichtige Punkte:",
    "- Kaminhaube mit schwarzem Glasschirm und Edelstahlstreifen.",
    "- Energieklasse A++, Jahresverbrauch 22.7 kWh, Fluid-Dynamic-Effizienzklasse A.",
    "- 3 Leistungsstufen, Luftleistung 317-595 m3/h, Geraeusch 49-67 dB.",
    "- SensorTouch, buerstenloser Motor, Nachlaufautomatik und 2 LED-Leuchten.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Wandposition, Kaminschacht und Luftfuehrung pruefen.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["HOOD-LS-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105806-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105807-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105837-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["WM-C-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];
PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"] = {
  productImagePath: PRODUCT_IMAGE_FILES.oven,
  productInfoPdfPath: PRODUCT_INFO_FILES.oven,
  productInfoSummary: "Kombinierte Auswahl aus Einbaubackofen EBX 943 600 S und Induktionskochfeld OL-KMI 754 000 E. Die aktuellen Produktinformationen nennen 77 l Garraum, 9 Backofenfunktionen sowie 4 Kochzonen mit 9 Leistungsstufen.",
  productInfoKeyFacts: [
    "Backofen: Energieklasse A",
    "Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "Backofen: 77 l Volumen, 9 Funktionen",
    "Backofen: Geraetemasse H x B x T (mm): 595 x 595 x 575.",
    "Backofen: Einbaumasse H x B x T (mm): 595,0 x 560 x 560.",
    "Kochfeld: 60 cm, 4 Kochzonen",
    "Kochfeld: Geraetemasse B x T (mm): 590 x 520.",
    "Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "Kochfeld: 9 Leistungsstufen",
    "Set: Backofen + Induktionskochfeld",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA EBX 943 600 S Backofen + AMICA OL-KMI 754 000 E Induktionskochfeld.",
    "Wichtige Punkte:",
    "- Backofen: Einbau-Elektrobackofen mit 77 l Volumen, Energieklasse A und 9 Funktionen.",
    "- Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "- Backofen: Geraetemasse H x B x T (mm): 595 x 595 x 575.",
    "- Backofen: Einbaumasse H x B x T (mm): 595,0 x 560 x 560.",
    "- Backofen: SensorControl Timer, versenkbare Knebel, CoolDoor3, Steam Clean.",
    "- Kochfeld: autarkes Induktionskochfeld, 60 cm, 4 Kochzonen mit Booster.",
    "- Kochfeld: Geraetemasse B x T (mm): 590 x 520.",
    "- Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "- Kochfeld: 9 Leistungsstufen, Timer, Restwaermeanzeige, Topferkennung, Kindersicherung.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Nischenmass, Anschlusswert und Elektroanschluss pruefen.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["OVEN-C-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105806-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105807-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
const LED_LIGHTING_PRODUCT_INFO = {
  productInfoPdfPath: PRODUCT_INFO_FILES.ledLightingLabel,
  productInfoSummary: "Energie-Label fuer das LED-Beleuchtungsset KA220043_S3. Das Label nennt Energieeffizienzklasse E und 3 kWh / 1000 h.",
  productInfoKeyFacts: [
    "Product type: LED lighting set.",
    "Model: KA220043_S3.",
    "Energy efficiency class: E.",
    "Energy consumption: 3 kWh / 1000 h.",
    "Document: Energy label.",
  ],
  productInfoExtractedText: [
    "Product name: LED lighting set KA220043_S3.",
    "Wichtige Punkte:",
    "- Product type: LED lighting set.",
    "- Model: KA220043_S3.",
    "- Energy efficiency class: E.",
    "- Energy consumption: 3 kWh / 1000 h.",
    "- Document: Energy label.",
    "Auswahlhinweise:",
    "- Show this label with the LED lighting set.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["LIGHT-B-LED-001"] = LED_LIGHTING_PRODUCT_INFO;
PRODUCT_INFO_BY_CODE["LIGHT-C-LED-001"] = LED_LIGHTING_PRODUCT_INFO;
PRODUCT_INFO_BY_CODE["ACC-LIGHT-003"] = LED_LIGHTING_PRODUCT_INFO;

const MODEL_B_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", legacyCode: "model-b-wall-cabinet-1", name: "Wall Cabinet left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", legacyCode: "model-b-wall-cabinet-2", name: "Wall Cabinet mid-left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", legacyCode: "model-b-wall-cabinet-3", name: "Wall Cabinet mid-right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", legacyCode: "model-b-wall-cabinet-4", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", legacyCode: "model-b-wall-cabinet-5", name: "Wall Cabinet right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 50, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", legacyCode: "model-b-extractor-hood", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 52, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", legacyCode: "model-b-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 55, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", legacyCode: "model-b-base-module-1", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, heightMm: 830, depthMm: 540, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 60, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", legacyCode: "model-b-base-module-2", name: "Sink Base Cabinet", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 70, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", legacyCode: "model-b-base-module-3", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-B-3036", legacyCode: "model-b-worktop", name: "Worktop", price: "0.00", widthMm: 40, heightMm: 600, depthMm: 3036, iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 85, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", legacyCode: "model-b-oven-module", name: "Built-in Oven and Hob", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 90, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", legacyCode: "model-b-drawer-module", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100, infoText: "STR base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", legacyCode: "model-b-refrigerator", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 110, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-B-BOTTON-45", legacyCode: "model-b-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105807_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105807-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105807-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 42, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105807-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105807-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105807", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 65, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105807-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 70, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105807-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 80, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105807-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105807-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 100, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105806_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-L", name: "Base Cabinet left", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base storage cabinet, 400 mm", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-R", name: "Base Cabinet right", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base storage cabinet, 400 mm", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-L", name: "Wall Cabinet", price: "0.01", widthMm: 400, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, 400 mm", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-R", name: "Wall Cabinet", price: "0.01", widthMm: 400, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, 400 mm", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105819_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105819-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105819-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105819-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 110, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105821_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-FILLER-550", name: "Base cabinet", price: "0.01", widthMm: 550, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "Base cabinet filler, hinge right" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105821-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-US30", name: "Base Cabinet", price: "175.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-FILLER-550", name: "Wall Cabinet", price: "0.01", widthMm: 550, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "Wall cabinet filler, hinge right" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105833: two-part split run — fridge left, left run (filler, oven, US60), right run
// (filler, dishwasher, sink); wall fillers bracket hood + H6002 on each side.
const AB_105833_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105833-FILLER-500-R", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105833-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-R", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105827: fridge-right run like AB 105821 with 500 mm filler cabinets ().
const AB_105827_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105821-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-US30", name: "Base Cabinet", price: "175.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105827-FILLER-500", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105826: fridge-left 5-bay run — US60 R, oven, US60 L, dishwasher, sink (no end drawer).
const AB_105826_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105822: fridge-left compact run - 500 mm filler, oven, US60, dishwasher, sink (5 base bays).
const AB_105822_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105822-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-FILLER-500", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105820 shares AB 105806's layout and appliances; identical items reuse the AB105806
// codes (per-kitchen unique, so a separate KitchenItem row is created) to inherit their
// names/product info/galleries. Only the four differently-sized cabinets get new codes.
const AB_105820_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US30-300", name: "Base Cabinet", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H3002-300", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H6002", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105812 matches AB 105820's plan and Excel rows, so it reuses the same item codes.
const AB_105812_ITEMS = AB_105820_ITEMS;

// AB 105808 shares AB 105820's Excel rows (same appliances/cabinets, fridge-left layout).
const AB_105808_ITEMS = AB_105820_ITEMS;

// AB 105809: L-shaped isometric plan (callouts 1-12).
const AB_105809_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-500-L", name: "Base cabinet with drawer", price: "0.01", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CORNER-AB105809-650", name: "Corner filler", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 45, isLocked: true, infoText: "Corner filler for base cabinets, 90 degrees", articleNumber: "UPEF65" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105809-US30", name: "Sink Base Cabinet", price: "0.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 60, infoText: "US30 sink base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-FILLER", name: "Wall Cabinet", price: "0.01", widthMm: 400, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105834: L-shaped isometric plan (same family as 105809) — 500R + 400L bases,
// US60 on the return leg, two H6002 wall cabinets, no wall filler.
const AB_105834_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-500-R", name: "Base cabinet with drawer", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-400-L", name: "Base cabinet with drawer", price: "0.01", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "Base cabinet, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CORNER-AB105809-650", name: "Corner filler", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 55, isLocked: true, infoText: "Corner filler for base cabinets, 90 degrees", articleNumber: "UPEF65" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105834-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-500-R", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105816 matches AB 105820 except callout 11 is an H6002 with left hinge.
const AB_105816_ITEMS = AB_105820_ITEMS.map((item) =>
  item.code === "CAB-WALL-AB105820-H6002"
    ? {
        ...item,
        code: "CAB-WALL-AB105816-H6002-L",
        name: "Wall Cabinet",
        infoText: "H6002, hinge left, 2 adjustable shelves",
      }
    : item
);

// AB 105810: fridge-left run with US45 + 400 mm filler bases, H4502 + 400 mm filler wall,
// hood, and three H6002 cabinets. Plan callouts 1–3 DEFAULT (locked); shared appliance codes reused.
const AB_105810_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-US45", name: "Base cabinet with drawer", price: "198.00", widthMm: 450, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US45 base storage cabinet, hinge right", articleNumber: "US45" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-FILLER-400", name: "Base cabinet", price: "0.01", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-H4502", name: "Wall Cabinet", price: "139.00", widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502, hinge right, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-FILLER-400", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet filler, hinge right" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105814 has the same item schedule as AB 105810; it gets its own plan/hotspots/contract.
const AB_105814_ITEMS = AB_105810_ITEMS;

// AB 105835: fridge-right 6×600 mm run — US60 R, US60 L, oven, dishwasher, sink, US60 L.
const AB_105835_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L1", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L2", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105836: dual elevation plan — left run (fridge, US60×2, oven, hood wall) + right run
// (500 mm fillers, sink, dishwasher). Both segments share one vector plan page.
const AB_105836_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105836-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-FILLER-500", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105842: same schedule as AB 105836 — dual elevation, slightly different plan proportions.
const AB_105842_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105842-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-FILLER-500", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105841 shares AB 105806's single-wall layout (fridge on the RIGHT). Items whose callout
// number matches AB 105806's scheme reuse its codes (oven 1, worktop 2, sink base 3, hood 10,
// wall cabinets 12/13/14, sink+waste); the rest get AB105841 codes so their plan numbers (4-9, 11)
// stay correct (callout numbers are keyed by code in kitchen-selection-utils.js).
const AB_105841_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-1", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 20, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-2", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105806-600", name: "Sink Base Cabinet", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 40, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-3", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 65, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const MODEL_C_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-C-545-1800-700", legacyCode: "model-c-refrigerator", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "HOOD-C-FH664621E", legacyCode: "model-c-extractor-hood", name: "Angled extractor hood + filter", price: "209.00", iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 20, infoText: "Chimney hood, 60 cm", articleNumber: "KHF664611S" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-L-600", legacyCode: "model-c-cook-base-left", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 30, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-C-600-HOB", legacyCode: "model-c-oven-base", name: "Built-in Oven and Hob", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 40, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-R-600", legacyCode: "model-c-cook-base-right", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-L-600", legacyCode: "model-c-wall-cabinet-1", name: "Wall Cabinet left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 60, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-ML-600", legacyCode: "model-c-wall-cabinet-2", name: "Wall Cabinet mid-left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 70, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-MR-600", legacyCode: "model-c-wall-cabinet-3", name: "Wall Cabinet mid-right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-R-600", legacyCode: "model-c-wall-cabinet-4", name: "Wall Cabinet right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-C-LED-001", legacyCode: "model-c-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 100, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-C-EWA34660W", legacyCode: "model-c-wm-base", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, heightMm: 830, depthMm: 540, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 110, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-C-600", legacyCode: "model-c-sink-base", name: "Sink Base Cabinet", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-C-600-STD", legacyCode: "model-c-dishwasher-base", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-C-4000", legacyCode: "model-c-worktop", name: "Worktop", price: "0.00", widthMm: 40, heightMm: 600, depthMm: 4000, iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 135, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-C-3D", legacyCode: "model-c-drawer-base-3", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base-3", sortOrder: 140, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINK-C-BOTTON-45", legacyCode: "model-c-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105837: L-shaped perspective plan using the same selectable component layout as AB 105809.
// Kitchen-specific codes preserve the 105837 callout numbers while shared appliance/worktop/sink
// codes reuse their product information.
const AB_105837_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US60-1", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-AB105806-600-HOB", name: "Built-in Oven and Hob", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CORNER-AB105809-650", name: "Corner filler", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 45, isLocked: true, infoText: "Corner filler for base cabinets, 90 degrees", articleNumber: "UPEF65", isActive: false },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105837-600", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105809-US30", name: "Sink Base Cabinet", price: "0.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 60, infoText: "US30 sink base cabinet, hinge left", articleNumber: "US30", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-FILLER", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105837-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105837-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "SINK-AB105806-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const L_SHAPED_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-400", name: "Wall Cabinet left", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-LS-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + HD6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-500", name: "Wall Cabinet right 1", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-600", name: "Wall Cabinet right 2", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "HOOD-LS-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "under-cabinet-light", sortOrder: 50, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "REF-LS-KGCN388140E", name: "Kuehl-/Gefrierkombi", price: "579.00", heightMm: 1800, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "OL-KGCN388140E, freestanding fridge-freezer, 180 cm, stainless-steel look, energy class D", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "TOP-LS-PLR", name: "PLR Worktops", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 70, isLocked: true, infoText: "PLR worktop, 40 mm, Beton-Optik Schiefer dunkelgrau / Beton-Optik natur", articleNumber: "PLR60 / PLR80" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-400", name: "Base Cabinet left", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 80, infoText: "1 drawer, 1 door, 1 adjustable shelf" },
  { itemType: ItemType.COMPONENT, code: "OVEN-LS-600-HOB", name: "Built-in Oven and Ceramic Hob with UHK Base", price: "449.00", widthMm: 600, depthMm: 600, iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 90, isLocked: true, infoText: "UHK oven base with EH92364E-A oven + 9EC744100C ceramic hob; oven niche 600 x 560 x 560 mm", articleNumber: "UHK / EH92364E-A / 9EC744100C" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-500", name: "Base Cabinet right", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 100, infoText: "1 drawer, 1 door, 1 adjustable shelf" },
  { itemType: ItemType.COMPONENT, code: "CORNER-LS-650", name: "Corner Filler", price: "0.00", widthMm: 560, depthMm: 650, colorKey: "springgreen", componentKey: "corner-base", sortOrder: 110, isLocked: true, infoText: "Corner filler for base cabinets, 723 mm high, 90 degrees", articleNumber: "UPEF65" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-LS-600", name: "Sink Base Cabinet", price: "175.00", widthMm: 300, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "springgreen", componentKey: "base-module-3", sortOrder: 120, infoText: "US30, sink base cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-LS-300", name: "Base Cabinet with Drawers", price: "229.00", widthMm: 300, depthMm: 723, iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 140, infoText: "US2A30, 1 drawer, 2 pull-outs", articleNumber: "US2A30", isActive: false },
  { itemType: ItemType.COMPONENT, code: "DISH-LS-600-STD", name: "Fully Integrated Dishwasher incl. Furniture Front", price: "579.00", widthMm: 598, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINK-LS-BOTTON-45", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "Blanco Botton 517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const L_KITCHEN_NEW_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-400", name: "TOP - 400_1 Wall Cabinet", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#111111", componentKey: "top-400", sortOrder: 10, infoText: "DXF layer: TOP - 400_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-ASPIRATOR", name: "ASPIRATOR Hood Area", price: "349.00", iconKey: "extractor_hood", colorKey: "#222222", componentKey: "aspirator", sortOrder: 20, infoText: "DXF layer: ASPIRATOR" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-500", name: "TOP - 500_1 Wall Cabinet", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#333333", componentKey: "top-500", sortOrder: 30, infoText: "DXF layer: TOP - 500_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-600", name: "TOP - 600_1 Wall Cabinet", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#444444", componentKey: "top-600", sortOrder: 40, infoText: "DXF layer: TOP - 600_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BASE", name: "BASE Worktop and Fixed Elements", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "base", sortOrder: 50, isLocked: true, infoText: "DXF layer: BASE" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-400", name: "BOTTOM - 400_1 Base Cabinet", price: "199.00", iconKey: "drawer_base_two", colorKey: "#555555", componentKey: "bottom-400", sortOrder: 60, infoText: "DXF layer: BOTTOM - 400_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-500", name: "BOTTOM - 500_1 Base Cabinet", price: "199.00", iconKey: "drawer_base_two", colorKey: "#666666", componentKey: "bottom-500", sortOrder: 70, infoText: "DXF layer: BOTTOM - 500_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-DISHWASHER", name: "DISHWASHER", price: "579.00", iconKey: "dishwasher_base", colorKey: "#777777", componentKey: "dishwasher", sortOrder: 80, infoText: "DXF layer: DISHWASHER", articleNumber: "A-EGSPV597210" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-300", name: "BOTTOM - 300 Drawer Cabinet", price: "229.00", iconKey: "drawer_base_three", colorKey: "#888888", componentKey: "bottom-300", sortOrder: 90, infoText: "DXF layer: BOTTOM - 300" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-REFRIGERATOR", name: "REFRIGERATOR", price: "579.00", iconKey: "tall_refrigerator", colorKey: "#999999", componentKey: "refrigerator", sortOrder: 100, infoText: "DXF layer: REFRIGERATOR" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const DEFAULT_KITCHENS = [
  {
    slug: "kitchen-model-b",
    kitchenCode: "260 309",
    name: "Linear Kitchen",
    description: "Compact single-wall layout ideal for smaller spaces",
    items: MODEL_B_ITEMS,
  },
  {
    slug: "kitchen-model-c",
    kitchenCode: "560303",
    name: "Split Kitchen",
    description: "Two-part layout with separated zones for flexibility",
    items: MODEL_C_ITEMS,
  },
  {
    slug: "ab-105806",
    kitchenCode: "105 806",
    name: "AB 105806 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105806_page-0001.jpg",
    items: AB_105806_ITEMS,
  },
  {
    slug: "ab-105807",
    kitchenCode: "105 807",
    name: "AB 105807 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105807.svg",
    items: AB_105807_ITEMS,
  },
  {
    slug: "ab-105808",
    kitchenCode: "105 808",
    name: "AB 105808 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105808_page-0001.jpg",
    items: AB_105808_ITEMS,
  },
  {
    slug: "ab-105809",
    kitchenCode: "105 809",
    name: "AB 105809 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105809.svg",
    items: AB_105809_ITEMS,
  },
  {
    slug: "ab-105834",
    kitchenCode: "105 834",
    name: "AB 105834 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105834_page-0001.jpg",
    items: AB_105834_ITEMS,
  },
  {
    slug: "ab-105810",
    kitchenCode: "105 810",
    name: "AB 105810 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105810_page-0001.jpg",
    items: AB_105810_ITEMS,
  },
  {
    slug: "ab-105812",
    kitchenCode: "105 812",
    name: "AB 105812 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105812_page-0001.jpg",
    items: AB_105812_ITEMS,
  },
  {
    slug: "ab-105814",
    kitchenCode: "105 814",
    name: "AB 105814 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105814_page-0001.jpg",
    items: AB_105814_ITEMS,
  },
  {
    slug: "ab-105816",
    kitchenCode: "105 816",
    name: "AB 105816 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105816_page-0001.jpg",
    items: AB_105816_ITEMS,
  },
  {
    slug: "ab-105819",
    kitchenCode: "105 819",
    name: "AB 105819 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105819.svg",
    items: AB_105819_ITEMS,
  },
  {
    slug: "ab-105820",
    kitchenCode: "105 820",
    name: "AB 105820 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105820_page-0001.jpg",
    items: AB_105820_ITEMS,
  },
  {
    slug: "ab-105821",
    kitchenCode: "105 821",
    name: "AB 105821 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105821.svg",
    items: AB_105821_ITEMS,
  },
  {
    slug: "ab-105822",
    kitchenCode: "105 822",
    name: "AB 105822 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105822.svg",
    items: AB_105822_ITEMS,
  },
  {
    slug: "ab-105837",
    kitchenCode: "105 837",
    name: "AB 105837 Kitchen",
    description: "L-shaped corner kitchen based on frontend/public/plans/AB 105837.svg",
    items: AB_105837_ITEMS,
  },
  {
    slug: "ab-105833",
    kitchenCode: "105 833",
    name: "AB 105833 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105833.svg",
    items: AB_105833_ITEMS,
  },
  {
    slug: "ab-105826",
    kitchenCode: "105 826",
    name: "AB 105826 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105826.svg",
    items: AB_105826_ITEMS,
  },
  {
    slug: "ab-105827",
    kitchenCode: "105 827",
    name: "AB 105827 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105827.svg",
    items: AB_105827_ITEMS,
  },
  {
    slug: "ab-105835",
    kitchenCode: "105 835",
    name: "AB 105835 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105835.svg",
    items: AB_105835_ITEMS,
  },
  {
    slug: "ab-105836",
    kitchenCode: "105 836",
    name: "AB 105836 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105836.svg",
    items: AB_105836_ITEMS,
  },
  {
    slug: "ab-105842",
    kitchenCode: "105 842",
    name: "AB 105842 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105842.svg",
    items: AB_105842_ITEMS,
  },
  {
    slug: "ab-105841",
    kitchenCode: "105 841",
    name: "AB 105841 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105841_page-0001.jpg",
    items: AB_105841_ITEMS,
  },
  {
    slug: "l-shaped-kitchen",
    kitchenCode: "105 809",
    name: "L-Shaped Kitchen",
    description: "L-shaped layout based on offer 670 105805 with return worktop and integrated appliances",
    items: L_SHAPED_ITEMS,
  },
  {
    slug: "l-kitchen-new",
    name: "L Kitchen New",
    description: "Layer-based L kitchen imported from L - KITCHEN.dxf",
    items: L_KITCHEN_NEW_ITEMS,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "736268", kitchenSlug: "kitchen-model-b" },
  { contractNumber: "736269", kitchenSlug: "kitchen-model-c" },
  { contractNumber: "736270", kitchenSlug: "l-shaped-kitchen" },
  { contractNumber: "736271", kitchenSlug: "l-kitchen-new" },
  ...DEFAULT_KITCHENS
    .filter((kitchen) => kitchen.slug.startsWith("ab-"))
    .map((kitchen) => ({
      contractNumber: buildAbKitchenContractNumber(kitchen),
      kitchenSlug: kitchen.slug,
    })),
  // AB 105811 and AB 105815 use the AB 105819 layout in the seed data.
  { contractNumber: "670105811", kitchenSlug: "ab-105819" },
  { contractNumber: "670105815", kitchenSlug: "ab-105819" },
];

const OBSOLETE_KITCHENS = [];

function buildAbKitchenContractNumber(kitchen) {
  const code = String(kitchen.kitchenCode || kitchen.slug).replace(/\D/g, "");

  if (!code) {
    throw new Error(`Cannot build AB kitchen contract number without a code: ${kitchen.slug}`);
  }

  return `670${code}`;
}

function normalizeSeedSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function mapClaimsDecisionGuideEntry(entry) {
  const priorityByDecision = {
    URGENT_CLAIM_STOP_USE: 130,
    CREATE_CLAIM_SERVICE: 115,
    SELF_CHECK_FIRST_CLAIM_IF_UNSOLVED: 100,
    NO_CLAIM_NORMAL: 70,
  };

  return {
    slug: `claims-guide-${normalizeSeedSlug(entry.id || `${entry.productCode}-${entry.problem}`)}`,
    brand: "Amica",
    applianceType: entry.itemType,
    topicType: "claims_decision_guide",
    code: null,
    titleKey: entry.problem,
    symptomKeys: [entry.problem],
    checkKeys: [entry.safeUserCheck].filter(Boolean),
    causeKeys: [entry.possibleCause].filter(Boolean),
    actionKeys: [entry.claimTrigger, entry.chatbotDecision].filter(Boolean),
    triggerTerms: [
      ...new Set([
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
        ...(Array.isArray(entry.matchTerms) ? entry.matchTerms : []),
      ]),
    ],
    priority: priorityByDecision[entry.chatbotDecision] || 80,
    isActive: true,
  };
}

const SERVICE_CLAIM_KNOWLEDGE_ENTRIES = [
  ...SERVICE_CLAIM_TROUBLESHOOTING_DATA.lookupEntries,
  ...CLAIMS_CHATBOT_KNOWLEDGE.entries.map(mapClaimsDecisionGuideEntry),
];

const DEFAULT_PROPERTY_OWNERS = [
  { name: "Anna Schmidt Housing GmbH", email: "anna.schmidt@example.com", phone: "+49 30 555 0101", objectName: "Building A", country: "Germany", city: "Berlin", postalCode: "10115", address1: "Invalidenstrasse 10" },
  { name: "Lukas Weber Wohnen", email: "lukas.weber@example.com", phone: "+49 30 555 0102", objectName: "Building B", country: "Germany", city: "Hamburg", postalCode: "20095", address1: "Demo Street 2" },
  { name: "Sophie Muller Immobilien", email: "sophie.muller@example.com", phone: "+49 30 555 0103", objectName: "Building C", country: "Austria", city: "Vienna", postalCode: "1010", address1: "Demo Street 3" },
  { name: "Daniel Fischer Estates", email: "daniel.fischer@example.com", phone: "+49 30 555 0104", objectName: "Building D", country: "Hungary", city: "Budapest", postalCode: "1051", address1: "Demo Street 4" },
  { name: "Laura Becker Living", email: "laura.becker@example.com", phone: "+49 30 555 0105", objectName: "Building E", country: "Switzerland", city: "Zurich", postalCode: "8001", address1: "Demo Street 5" },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash },
      create: { email: adminEmail, passwordHash },
    });
  }

  const seededObjects = [];
  for (const owner of DEFAULT_PROPERTY_OWNERS) {
    const [existingOwner] = await prisma.$queryRaw`
      SELECT "id"
      FROM "HousingCompany"
      WHERE "email" = ${owner.email}
      LIMIT 1
    `;

    const ownerId = existingOwner?.id || randomUUID();
    if (existingOwner) {
      await prisma.$executeRaw`
        UPDATE "HousingCompany"
        SET
          "name" = ${owner.name},
          "email" = ${owner.email},
          "phone" = ${owner.phone},
          "notes" = ${owner.notes || null},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${ownerId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "HousingCompany" ("id", "name", "email", "phone", "notes", "createdAt", "updatedAt")
        VALUES (${ownerId}, ${owner.name}, ${owner.email}, ${owner.phone}, ${owner.notes || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    const [existingObject] = await prisma.$queryRaw`
      SELECT "id"
      FROM "PropertyObject"
      WHERE "housingCompanyId" = ${ownerId}
        AND "name" = ${owner.objectName}
      LIMIT 1
    `;
    const objectId = existingObject?.id || randomUUID();
    if (existingObject) {
      await prisma.$executeRaw`
        UPDATE "PropertyObject"
        SET
          "country" = ${owner.country},
          "city" = ${owner.city},
          "postalCode" = ${owner.postalCode},
          "address1" = ${owner.address1},
          "address2" = ${owner.address2 || null},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${objectId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
        VALUES (${objectId}, ${owner.objectName}, ${ownerId}, ${owner.country}, ${owner.city}, ${owner.postalCode}, ${owner.address1}, ${owner.address2 || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }

    const projectName = owner.projectName || `${owner.objectName} Project`;
    let project =
      (await prisma.project.findUnique({ where: { propertyObjectId: objectId } })) ||
      (await prisma.project.findFirst({
        where: { housingCompanyId: ownerId, name: projectName },
      }));

    if (project) {
      if (project.propertyObjectId !== objectId) {
        project = await prisma.project.update({
          where: { id: project.id },
          data: { propertyObjectId: objectId },
        });
      }
    } else {
      try {
        project = await prisma.project.create({
          data: {
            propertyObjectId: objectId,
            housingCompanyId: ownerId,
            name: projectName,
          },
        });
      } catch (error) {
        if (error.code !== "P2002") throw error;
        project = await prisma.project.findFirstOrThrow({
          where: { housingCompanyId: ownerId, name: projectName },
        });
      }
    }

    seededObjects.push({
      id: objectId,
      projectId: project.id,
    });
  }

  for (const kitchen of DEFAULT_KITCHENS) {
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { slug: kitchen.slug },
      include: { items: true },
    });

    const kitchenRecord = existingKitchen
      ? await prisma.kitchen.update({
          where: { slug: kitchen.slug },
          data: {
            name: kitchen.name,
            kitchenCode: kitchen.kitchenCode || null,
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        })
      : await prisma.kitchen.create({
          data: {
            slug: kitchen.slug,
            kitchenCode: kitchen.kitchenCode || null,
            name: kitchen.name,
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        });

    const existingByCode = new Map(kitchenRecord.items.map((item) => [item.code, item]));
    const targetCodes = new Set(kitchen.items.map((item) => item.code));

    for (const item of kitchen.items) {
      const existingItem = existingByCode.get(item.code) || (item.legacyCode ? existingByCode.get(item.legacyCode) : null);
      const productInfo = PRODUCT_INFO_BY_CODE[item.code] || {};
      const data = {
        ...productInfo,
        productInfoUpdatedAt: productInfo.productInfoPdfPath ? new Date() : null,
        itemType: item.itemType,
        code: item.code,
        articleNumber: item.articleNumber || null,
        name: item.name,
        nameDe: item.nameDe || null,
        price: item.price,
        widthMm: item.widthMm ?? null,
        heightMm: item.heightMm ?? null,
        depthMm: item.depthMm ?? null,
        infoText: item.infoText || null,
        iconKey: item.iconKey || null,
        colorKey: item.colorKey || null,
        componentKey: item.componentKey || null,
        sortOrder: item.sortOrder || 0,
        isLocked: Boolean(item.isLocked),
        isActive: item.isActive !== false,
      };

      if (existingItem) {
        await prisma.kitchenItem.update({
          where: { id: existingItem.id },
          data,
        });
      } else {
        await prisma.kitchenItem.create({
          data: {
            kitchenId: kitchenRecord.id,
            ...data,
          },
        });
      }
    }

    await prisma.kitchenItem.deleteMany({
      where: {
        kitchenId: kitchenRecord.id,
        code: { notIn: [...targetCodes] },
      },
    });
  }

  const obsoleteKitchen = await prisma.kitchen.findUnique({
    where: { slug: "ab-105811" },
    select: { id: true },
  });
  const replacementKitchen = await prisma.kitchen.findUnique({
    where: { slug: "ab-105819" },
    select: { id: true },
  });

  if (obsoleteKitchen && replacementKitchen) {
    await prisma.kitchenContract.updateMany({
      where: { kitchenId: obsoleteKitchen.id },
      data: { kitchenId: replacementKitchen.id },
    });
    await prisma.order.updateMany({
      where: { kitchenId: obsoleteKitchen.id },
      data: { kitchenId: replacementKitchen.id },
    });
    await prisma.kitchen.delete({
      where: { id: obsoleteKitchen.id },
    });
  }

  for (const obsolete of OBSOLETE_KITCHENS) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: obsolete.slug },
      select: { id: true },
    });
    const contracts = await prisma.kitchenContract.findMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          { contractNumber: { in: obsolete.contractNumbers } },
        ],
      },
      select: { id: true },
    });
    const contractIds = contracts.map((contract) => contract.id);

    if (!kitchen && contractIds.length === 0) continue;

    await prisma.order.deleteMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          ...(contractIds.length ? [{ kitchenContractId: { in: contractIds } }] : []),
        ],
      },
    });
    await prisma.kitchenContract.deleteMany({
      where: {
        OR: [
          ...(kitchen ? [{ kitchenId: kitchen.id }] : []),
          { contractNumber: { in: obsolete.contractNumbers } },
        ],
      },
    });
    if (kitchen) {
      await prisma.kitchen.delete({
        where: { id: kitchen.id },
      });
    }
  }

  for (const [index, contract] of DEFAULT_KITCHEN_CONTRACTS.entries()) {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: contract.kitchenSlug },
      select: { id: true },
    });

    if (!kitchen) {
      throw new Error(`Kitchen not found for contract seed: ${contract.kitchenSlug}`);
    }

    await prisma.kitchenContract.upsert({
      where: { contractNumber: contract.contractNumber },
      update: {
        kitchenId: kitchen.id,
        projectId: seededObjects[index % seededObjects.length]?.projectId || undefined,
        isActive: true,
      },
      create: {
        contractNumber: contract.contractNumber,
        kitchenId: kitchen.id,
        projectId: seededObjects[index % seededObjects.length]?.projectId,
        isActive: true,
      },
    });
  }

  for (const entry of SERVICE_CLAIM_KNOWLEDGE_ENTRIES) {
    await prisma.serviceClaimKnowledgeEntry.upsert({
      where: { slug: entry.slug },
      update: entry,
      create: entry,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
