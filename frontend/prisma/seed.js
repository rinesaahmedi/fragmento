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

const DEFAULT_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "DISH-600-STD", legacyCode: "component-dishwasher", name: "Spülmaschine", price: "579.00", infoText: "Amica by architecto", iconKey: "dishwasher", colorKey: "#001f7f", sortOrder: 10 },
  { itemType: ItemType.COMPONENT, code: "REF-545-1800-700", legacyCode: "component-refrigerator", name: "Kühlschrank", price: "579.00", infoText: "Amica by architecto", iconKey: "refrigerator", colorKey: "black", sortOrder: 20 },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-030", legacyCode: "component-base-cabinet-30", name: "Unterschrank 30cm", price: "175.00", iconKey: "base_cabinet_30", colorKey: "#ffbf00", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-L-060", legacyCode: "component-wall-cabinet-left", name: "Oberschrank (links)", price: "115.00", iconKey: "wall_cabinet_l", colorKey: "#00ffbf", sortOrder: 40 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-R-060", legacyCode: "component-wall-cabinet-right", name: "Oberschrank (rechts)", price: "115.00", iconKey: "wall_cabinet_r", colorKey: "#394c00", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "HOOD-600-FLAT", legacyCode: "component-extractor-hood", name: "Dunstabzugshaube", price: "349.00", infoText: "Amica by architecto", iconKey: "extractor_hood", colorKey: "#ff7f9f", sortOrder: 60 },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 100 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-001", legacyCode: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 110 },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 120 },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 200 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 210 },
];

const MODEL_B_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", legacyCode: "model-b-wall-cabinet-1", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", legacyCode: "model-b-wall-cabinet-2", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", legacyCode: "model-b-wall-cabinet-3", name: "Hood Wall Cabinet (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "HD6002, light hood setup" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", legacyCode: "model-b-wall-cabinet-4", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", legacyCode: "model-b-wall-cabinet-5", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 50, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", legacyCode: "model-b-extractor-hood", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 52, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", legacyCode: "model-b-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 55, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", legacyCode: "model-b-base-module-1", name: "Washing Machine (600 x 600 x 878 mm)", price: "548.00", iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 60, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", legacyCode: "model-b-base-module-2", name: "Sink Base Cabinet (600 x 600 x 878 mm)", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 70, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", legacyCode: "model-b-base-module-3", name: "Dishwasher (600 x 600 x 878 mm)", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210" },
  { itemType: ItemType.COMPONENT, code: "TOP-B-3036", legacyCode: "model-b-worktop", name: "Worktop (40 x 600 x 3036 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 85, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", legacyCode: "model-b-oven-module", name: "Built-in Oven and Hob (600 x 600 x 878 mm)", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 90, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", legacyCode: "model-b-drawer-module", name: "Base Storage Cabinet (600 x 600 x 878 mm)", price: "1150.00", iconKey: "drawer_base", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100, infoText: "STR base storage cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", legacyCode: "model-b-refrigerator", name: "Refrigerator (545 x 1800 x 700 mm)", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 110, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "KGC 15495 S" },
  { itemType: ItemType.COMPONENT, code: "SINK-B-BOTTON-45", legacyCode: "model-b-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 200 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Besteckeinsatz ZB60SG", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert for 60 cm cabinet", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const MODEL_C_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-C-545-1800-700", legacyCode: "model-c-refrigerator", name: "Refrigerator (545 x 1800 x 700 mm)", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "KGC 15495 S" },
  { itemType: ItemType.COMPONENT, code: "HOOD-C-FH664621E", legacyCode: "model-c-extractor-hood", name: "KHF664611S Chimney Extractor Hood", price: "349.00", iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 20, infoText: "Chimney hood, 60 cm", articleNumber: "KHF 664 611 S Stripe X" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-L-600", legacyCode: "model-c-cook-base-left", name: "Base Cabinet (2 Drawers) Left (600 x 600 x 878 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 30 },
  { itemType: ItemType.COMPONENT, code: "OVEN-C-600-HOB", legacyCode: "model-c-oven-base", name: "Built-in Oven and Hob (600 x 600 x 878 mm)", price: "449.00", iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 40, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-R-600", legacyCode: "model-c-cook-base-right", name: "Base Cabinet (2 Drawers) Right (600 x 600 x 878 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 50 },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-L-600", legacyCode: "model-c-wall-cabinet-1", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 60, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-ML-600", legacyCode: "model-c-wall-cabinet-2", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 70, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-MR-600", legacyCode: "model-c-wall-cabinet-3", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 80, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-R-600", legacyCode: "model-c-wall-cabinet-4", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 90, infoText: "H6002, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-C-LED-001", legacyCode: "model-c-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 100, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-C-EWA34660W", legacyCode: "model-c-wm-base", name: "Washing Machine (600 x 600 x 878 mm)", price: "548.00", iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 110, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-C-600", legacyCode: "model-c-sink-base", name: "Sink Base Cabinet (600 x 600 x 878 mm)", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-C-600-STD", legacyCode: "model-c-dishwasher-base", name: "Dishwasher (600 x 600 x 878 mm)", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210" },
  { itemType: ItemType.COMPONENT, code: "TOP-C-4000", legacyCode: "model-c-worktop", name: "Worktop (40 x 600 x 4000 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 135, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-C-3D", legacyCode: "model-c-drawer-base-3", name: "Base Cabinet (3 Drawers) (600 x 600 x 878 mm)", price: "229.00", iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-base-3", sortOrder: 140 },
  { itemType: ItemType.COMPONENT, code: "SINK-C-BOTTON-45", legacyCode: "model-c-sink-faucet", name: "Sink and Waste System", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Mülltrennsystem", price: "89.00", iconKey: "waste_system", sortOrder: 200 },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-001", legacyCode: "acc-cutlery", name: "Besteckeinsatz 30cm", price: "19.00", iconKey: "cutlery_insert", sortOrder: 210, articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const L_SHAPED_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-400", name: "H4002L Wall Cabinet left (400 x 723 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H4002L, 1 door, 2 adjustable shelves", articleNumber: "H4002L" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-LS-600", name: "HD6002L Hood Wall Cabinet (600 x 723 mm)", price: "139.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "HD6002L, wall cabinet for light hood, 1 door, 2 adjustable shelves", articleNumber: "HD6002L" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-500", name: "H5002R Wall Cabinet right (500 x 723 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "H5002R, 1 door, 2 adjustable shelves", articleNumber: "H5002R" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-600", name: "H6002R Wall Cabinet right (600 x 723 mm)", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "H6002R, 1 door, 2 adjustable shelves", articleNumber: "H6002R" },
  { itemType: ItemType.COMPONENT, code: "HOOD-LS-FH664621E", name: "FH664621E Flat Pull-Out Extractor Hood (173 x 599 x 303 mm)", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "under-cabinet-light", sortOrder: 50, infoText: "Flat pull-out hood, 60 cm, max. 415 m3/h, energy class A", articleNumber: "FH664621E" },
  { itemType: ItemType.COMPONENT, code: "REF-LS-KGCN388140E", name: "Kuehl-/Gefrierkombi (545 x 1800 mm)", price: "579.00", iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "OL-KGCN388140E, freestanding fridge-freezer, 180 cm, stainless-steel look, energy class D", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "TOP-LS-PLR", name: "PLR Worktops (40 mm, 1571 x 600 mm + 2200 x 800 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 70, infoText: "PLR worktop, 40 mm, Beton-Optik Schiefer dunkelgrau / Beton-Optik natur", articleNumber: "PLR60 / PLR80" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-400", name: "US40L Base Cabinet left (400 x 723 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 80, infoText: "US40L, 1 drawer, 1 door, 1 adjustable shelf", articleNumber: "US40L" },
  { itemType: ItemType.COMPONENT, code: "OVEN-LS-600-HOB", name: "Built-in Oven and Ceramic Hob with UHK Base (600 x 600 mm)", price: "449.00", iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 90, infoText: "UHK oven base with EH92364E-A oven + 9EC744100C ceramic hob; oven niche 600 x 560 x 560 mm", articleNumber: "UHK / EH92364E-A / 9EC744100C" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-500", name: "US50R Base Cabinet right (500 x 723 mm)", price: "199.00", iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 100, infoText: "US50R, 1 drawer, 1 door, 1 adjustable shelf", articleNumber: "US50R" },
  { itemType: ItemType.COMPONENT, code: "CORNER-LS-650", name: "UPEF65 Corner Filler (560 x 650 mm)", price: "0.00", iconKey: "base_cabinet_30", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 110, infoText: "Corner filler for base cabinets, 723 mm high, 90 degrees", articleNumber: "UPEF65" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-LS-600", name: "SP60L Sink Base Cabinet (600 x 723 mm)", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-3", sortOrder: 120, infoText: "SP60L, 1 door, fixed inner front panel", articleNumber: "SP60L" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-LS-300", name: "US2A30 Base Cabinet with Drawers (300 x 723 mm)", price: "229.00", iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 140, infoText: "US2A30, 1 drawer, 2 pull-outs", articleNumber: "US2A30" },
  { itemType: ItemType.ACCESSORY, code: "DISH-LS-600-STD", name: "A-EGSPV597210 Integrated Dishwasher with TGV60 Front", price: "579.00", iconKey: "dishwasher_base", sortOrder: 190, infoText: "Fully integrated dishwasher, 60 cm, 12 place settings, energy class D", articleNumber: "A-EGSPV597210 / TGV60" },
  { itemType: ItemType.ACCESSORY, code: "SINK-LS-TIPO45", name: "BLANCO TIPO 45 S Sink", price: "89.00", iconKey: "sink_faucet", sortOrder: 200, infoText: "Stainless steel natural finish, reversible, undermount dimension 450 mm", articleNumber: "526335" },
  { itemType: ItemType.ACCESSORY, code: "TAP-LS-DARAS-F-HD", name: "BLANCO DARAS-F HD Tap", price: "0.00", iconKey: "sink_faucet", sortOrder: 210, infoText: "Chrome high-pressure tap, 360 degree swivel spout, 35 mm tap hole", articleNumber: "521751" },
  { itemType: ItemType.ACCESSORY, code: "FILTER-LS-FWK124", name: "FWK124 Charcoal Filter Set", price: "0.00", iconKey: "extractor_hood", sortOrder: 220, infoText: "2 charcoal filters, 124 x 124 x 33.6 mm", articleNumber: "FWK124" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const DEFAULT_KITCHENS = [
  {
    slug: "fragmento-default",
    name: "Fragmento Default Kitchen",
    description: "Seeded default kitchen based on the legacy configurator.",
    items: DEFAULT_ITEMS,
  },
  {
    slug: "kitchen-model-b",
    name: "Linear Kitchen",
    description: "Compact single-wall layout ideal for smaller spaces",
    items: MODEL_B_ITEMS,
  },
  {
    slug: "kitchen-model-c",
    name: "Split Kitchen",
    description: "Two-part layout with separated zones for flexibility",
    items: MODEL_C_ITEMS,
  },
  {
    slug: "l-shaped-kitchen",
    name: "L-Shaped Kitchen",
    description: "L-shaped layout based on offer 670 105805 with return worktop and integrated appliances",
    items: L_SHAPED_ITEMS,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "736267", kitchenSlug: "fragmento-default" },
  { contractNumber: "736268", kitchenSlug: "kitchen-model-b" },
  { contractNumber: "736269", kitchenSlug: "kitchen-model-c" },
  { contractNumber: "736270", kitchenSlug: "l-shaped-kitchen" },
];

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

    const project = await prisma.project.upsert({
      where: { propertyObjectId: objectId },
      update: {
        housingCompanyId: ownerId,
        name: owner.projectName || `${owner.objectName} Project`,
      },
      create: {
        propertyObjectId: objectId,
        housingCompanyId: ownerId,
        name: owner.projectName || `${owner.objectName} Project`,
      },
    });

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
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        })
      : await prisma.kitchen.create({
          data: {
            slug: kitchen.slug,
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
        price: item.price,
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
