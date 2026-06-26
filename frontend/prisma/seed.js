const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");
const CLAIMS_CHATBOT_KNOWLEDGE = require("../lib/claims-chatbot-knowledge.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = require("../lib/service-claim-troubleshooting-data.json");

const prisma = new PrismaClient();

const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";
const REFRIGERATOR_CATALOG_NAME_EN = "Freestanding refrigerator 178cm";
const REFRIGERATOR_CATALOG_NAME_DE = "Standkühlschrank 178 cm";
const HOOD_WALL_CABINET_CATALOG_NAME_EN = "Upper Cabinet with Extractor Hood 60";
const HOOD_WALL_CABINET_CATALOG_NAME_DE = "Oberschrank für Flachschirmhaube 60";
const DEFAULT_OVEN_HOB_CATALOG_CODE = "OVEN-B-600-HOB";
const DEFAULT_OVEN_HOB_CATALOG_NAME_EN = "Built-in oven and induction hob";
const DEFAULT_OVEN_HOB_CATALOG_NAME_DE = "Einbaubackofen und Kochfeld";
const DEFAULT_OVEN_HOB_CATALOG_ARTICLE = "EBX943600S + OL-KMI754000E";
const DEFAULT_SINK_BASE_CATALOG_CODE = "SINKBASE-B-600";
const DEFAULT_SINK_BASE_CATALOG_NAME_EN = "Sink Lower Cabinet";
const DEFAULT_SINK_BASE_CATALOG_NAME_DE = "Spülenunterschrank";
const DEFAULT_SINK_WORKTOP_CATALOG_CODE = "SINK-WORKTOP";
const DEFAULT_WORKTOP_CATALOG_NAME_EN = "Worktop";
const DEFAULT_WORKTOP_CATALOG_NAME_DE = "Arbeitsplatte";

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
PRODUCT_INFO_BY_CODE["DISH-AB105815-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105819-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105841-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105821-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105822-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105827-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105836-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105842-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105845-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105834-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105837-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105831-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105825-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105828-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["REF-AB105828-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-AB105828-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
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
PRODUCT_INFO_BY_CODE["REF-AB105815-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105819-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105841-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105821-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105845-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105831-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105825-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
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
PRODUCT_INFO_BY_CODE["HOOD-AB105831-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105825-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105845-KHF664611S"] = PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"];
PRODUCT_INFO_BY_CODE["WM-C-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];
PRODUCT_INFO_BY_CODE["WM-AB105845-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];
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
PRODUCT_INFO_BY_CODE["LIGHT-AB105845-LED"] = LED_LIGHTING_PRODUCT_INFO;
PRODUCT_INFO_BY_CODE["ACC-LIGHT-003"] = LED_LIGHTING_PRODUCT_INFO;

const MODEL_B_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", legacyCode: "model-b-wall-cabinet-1", name: "Wall Cabinet left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", legacyCode: "model-b-wall-cabinet-2", name: "Wall Cabinet mid-left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", legacyCode: "model-b-wall-cabinet-3", name: "Wall Cabinet mid-right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", legacyCode: "model-b-wall-cabinet-4", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", legacyCode: "model-b-wall-cabinet-5", name: "Wall Cabinet right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 50, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", legacyCode: "model-b-extractor-hood", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 52, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", legacyCode: "model-b-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 55, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", legacyCode: "model-b-base-module-1", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, heightMm: 830, depthMm: 540, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 60, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", legacyCode: "model-b-base-module-2", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 70, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", legacyCode: "model-b-base-module-3", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-B-3036", legacyCode: "model-b-worktop", name: "Worktop", price: "0.00", widthMm: 40, heightMm: 600, depthMm: 3036, iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 85, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", legacyCode: "model-b-oven-module", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 90, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", legacyCode: "model-b-drawer-module", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 100, infoText: "STR base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", legacyCode: "model-b-refrigerator", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 110, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", legacyCode: "model-b-sink-faucet", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// 108134 MODUL 1: single-wall plan (frontend/public/pdfs/108134 MODUL 1_10.03.2026_OH.pdf).
// Same component/article/price set as the legacy single-wall layout, so it reuses
// those item codes to inherit their localized names, product info, and galleries. Layout
// left→right: washing machine, sink base, dishwasher, oven, US60 drawer, fridge tall unit;
// five wall cabinets up top with the hood at wall-cabinet-4.
const MODUL1_108134_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", name: "Freestanding refrigerator 178cm", price: "579.00", widthMm: 710, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, heightMm: 830, depthMm: 540, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 20, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", name: "Fully integrated dishwasher incl. furniture front", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 40, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 50, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", name: "Base cabinet with drawer 600/600 mm", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-B-3036", name: "Worktop (40 x 600 x 3036 mm)", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 78, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 130, infoText: "LED lighting set", articleNumber: "KALB + KA220043_S3" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105807_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-1", name: "Wall Cabinet 1", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105807-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105807-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 10, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105807-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 20, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105807", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 25, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105807-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105807-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 45, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105806_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-L", name: "Base Cabinet left", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base storage cabinet, 400 mm", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-R", name: "Base Cabinet right", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base storage cabinet, 400 mm", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-L", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, 400 mm", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-R", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, 400 mm", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105819_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105819-US60-R", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105819-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105819-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-R", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 110, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105821_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-FILLER-500", legacyCode: "CAB-BASE-AB105821-FILLER-550", name: "Base cabinet", price: "25.01", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "Base cabinet filler, hinge right", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105821-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-US30", name: "Base Cabinet", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-FILLER-500", legacyCode: "CAB-WALL-AB105821-FILLER-550", name: "Wall Cabinet", price: "35.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "Wall cabinet filler, hinge right", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105824_ITEMS = AB_105821_ITEMS;

// AB 105833: two-part split run — fridge left, left run (filler, oven, US60), right run
// (filler, dishwasher, sink); wall fillers bracket hood + H6002 on each side.
const AB_105833_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105833-FILLER-500-R", name: "Base cabinet", price: "25.01", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105833-600", name: "Dishwasher", price: "604.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L1", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-R", name: "Wall Cabinet", price: "35.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L3", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105827: fridge-right run like AB 105821 with 500 mm filler cabinets ().
const AB_105827_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-FILLER-500", name: "Base cabinet", price: "25.01", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105827-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-US30", name: "Base Cabinet", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105827-FILLER-500", name: "Wall Cabinet", price: "35.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105830_ITEMS = AB_105827_ITEMS;

// AB 105826: fridge-left 5-bay run — US60 R, oven, US60 L, dishwasher, sink (no end drawer).
const AB_105826_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-R", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L3", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105822: fridge-left compact run - 500 mm filler, oven, US60, dishwasher, sink (5 base bays).
const AB_105822_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105822-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-FILLER-500", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 130, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105823_ITEMS = AB_105822_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: "184.00", blendeCode: "HPK2002", blendeLabel: "HPK2002 20cm", blendePrice: "35.00" };
  }
  return item;
});

// AB 105829 and AB 105832 add a blende note on top of AB 105822's layout (last wall cabinet);
// AB 105822 doesn't have one, so this is a separate clone, not an alias.
const AB_105829_ITEMS = AB_105822_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: "184.00", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" };
  }
  return item;
});
const AB_105832_ITEMS = AB_105829_ITEMS;

// AB 105820 shares AB 105806's layout and appliances; identical items reuse the AB105806
// codes (per-kitchen unique, so a separate KitchenItem row is created) to inherit their
// names/product info/galleries. Only the four differently-sized cabinets get new codes.
const AB_105820_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US30-300", name: "Base Cabinet", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H3002-300", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H6002", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
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
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-500-L", name: "Base cabinet with drawer", price: "50.01", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "Unterschrank", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: "50.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 60, isLocked: true, infoText: "US30 sink base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-US30-L", name: "Base cabinet with drawer", price: "200.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-FILLER", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105805: L-shaped isometric plan (same drawing family as 105809). Identical layout —
// 400R + 500L bases + oven on the main leg, dishwasher + sink base on the
// return, 4 wall cabinets + hood. Differs from 105809 at NR 8 (priced US30 sink base,
// hinge left, EUR 175), NR 9 (a real 400 mm Oberschrank, hinge right, instead of
// a wall filler), lower base/sink blenden, and the upper-right H6002 with right blende.
// Differing cabinets get new codes.
const AB_105805_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "-Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-500-L", name: "Base cabinet with drawer", price: "50.01", widthMm: 500, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "-Unterschrank", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: "50.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "200.00", widthMm: 300, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 60, isLocked: true, infoText: "US30 sink base cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-US30-L", name: "Base cabinet with drawer", price: "200.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-400-R", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "-Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "-Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-H6002-L", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105834: L-shaped isometric plan (fridge left) — 500R + oven + 500R bases on the main leg,
// corner + locked sink + dishwasher on the return; 500R wall filler, hood, H6002 L.
const AB_105813_ITEMS = AB_105805_ITEMS;
const AB_105817_ITEMS = AB_105805_ITEMS;

const AB_105834_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-500-R", name: "Base cabinet with drawer", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-400-L", name: "Base cabinet with drawer", price: "0.01", widthMm: 400, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "Base cabinet, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105834-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-500-R", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-US30-L", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 130, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
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
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-US45", name: "Base cabinet with drawer", price: "198.00", widthMm: 450, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US45 base storage cabinet, hinge right", articleNumber: "US45" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-FILLER-400", name: "Base cabinet", price: "0.01", widthMm: 400, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-H4502", name: "Wall Cabinet", price: "139.00", widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502, hinge right, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-FILLER-400", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet filler, hinge right" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105814 has the same item schedule and plan view as AB 105810; it keeps its own contract.
const AB_105814_ITEMS = AB_105810_ITEMS;
// AB 105818 mirrors AB 105810/105814 while keeping its own kitchen and contract.
const AB_105818_ITEMS = AB_105810_ITEMS;

// AB 105835: fridge-right 6×600 mm run — US60 R, US60 L, oven, dishwasher, sink, US60 L.
const AB_105835_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-R", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L1", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L2", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105836: dual elevation plan — left run (fridge, US60×2, oven, hood wall) + right run
// (500 mm fillers, sink, dishwasher). Both segments share one vector plan page.
const AB_105836_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-L", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-FILLER-500", name: "Base cabinet", price: "25.01", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105836-600", name: "Dishwasher", price: "604.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L1", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-FILLER-500", name: "Wall Cabinet", price: "35.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L3", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105842: same schedule as AB 105836 — dual elevation, slightly different plan proportions.
const AB_105842_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-L", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-FILLER-500", name: "Base cabinet", price: "25.01", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "Unterschrank", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105842-600", name: "Dishwasher", price: "604.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L1", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-FILLER-500", name: "Wall Cabinet", price: "35.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "Oberschrank", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L3", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105839_ITEMS = AB_105842_ITEMS;

// AB 105845: two PDF modules combined into one plan. Module 2 contains the sink/washer/
// dishwasher run; module 2-1 contains the fridge and cooking run with a chimney hood.
const AB_105845_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105845-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "WM-AB105845-EWA34660W", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 20, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105845-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 30, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US2A60", name: "Base cabinet with drawers", price: "369.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US2A60 base drawer cabinet", articleNumber: "US2A60" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-AB105845-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 60, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-AB105845-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 80, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "0.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 90, isLocked: true, infoText: "Default sink and faucet position" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 100, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-1", name: "Wall Cabinet", price: "219.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 110, infoText: "600/600 mm cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-2", name: "Wall Cabinet", price: "219.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 120, infoText: "600/600 mm cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-3", name: "Wall Cabinet", price: "219.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 130, infoText: "600/600 mm cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-4", name: "Wall Cabinet", price: "219.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 140, infoText: "600/600 mm cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-AB105845-LED", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 150, infoText: "LED lighting set", articleNumber: "KALB + KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105845-KHF664611S", name: "Chimney extractor hood", price: "209.00", widthMm: 600, iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 160, infoText: "Chimney hood, 60 cm", articleNumber: "KHF664611S" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
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
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-1", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 20, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-2", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 40, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-3", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 65, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-1", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105838_ITEMS = AB_105841_ITEMS;
const AB_105844_ITEMS = AB_105841_ITEMS;

const MODEL_C_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-C-545-1800-700", legacyCode: "model-c-refrigerator", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "HOOD-C-FH664621E", legacyCode: "model-c-extractor-hood", name: "Angled extractor hood + filter", price: "209.00", iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 20, infoText: "Chimney hood, 60 cm", articleNumber: "KHF664611S" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-L-600", legacyCode: "model-c-cook-base-left", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 30, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", legacyCode: "model-c-oven-base", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 40, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-C-R-600", legacyCode: "model-c-cook-base-right", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 50, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-L-600", legacyCode: "model-c-wall-cabinet-1", name: "Wall Cabinet left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 60, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-ML-600", legacyCode: "model-c-wall-cabinet-2", name: "Wall Cabinet mid-left", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 70, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-MR-600", legacyCode: "model-c-wall-cabinet-3", name: "Wall Cabinet mid-right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-C-R-600", legacyCode: "model-c-wall-cabinet-4", name: "Wall Cabinet right", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-C-LED-001", legacyCode: "model-c-under-cabinet-light", name: "LED Lighting Set", price: "69.00", iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 100, infoText: "LED lighting set", articleNumber: "KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "WM-C-EWA34660W", legacyCode: "model-c-wm-base", name: "Washing machine + front + side panel", price: "639.00", widthMm: 600, heightMm: 830, depthMm: 540, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 110, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", legacyCode: "model-c-sink-base", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 120, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "DISH-C-600-STD", legacyCode: "model-c-dishwasher-base", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-C-4000", legacyCode: "model-c-worktop", name: "Worktop", price: "0.00", widthMm: 40, heightMm: 600, depthMm: 4000, iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 135, isLocked: true, infoText: "PLS, concrete slate gray" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-C-3D", legacyCode: "model-c-drawer-base-3", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base-3", sortOrder: 140, articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", legacyCode: "model-c-sink-faucet", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105837: L-shaped isometric plan (fridge left) — US60 + oven + 500R bases on the main leg,
// corner + dishwasher + locked sink on the return; US60 R wall, hood, US60 L.
const AB_105837_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US60-1", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-FILLER-500", name: "Base cabinet", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105837-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 60, infoText: "US30 sink base cabinet, hinge left", articleNumber: "US30", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US30-L", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-FILLER", name: "Wall Cabinet", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105837-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105837-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

// AB 105831: L-shaped perspective plan. Left return leg: US30, dishwasher, locked sink base.
// Main cook leg: 500 mm base, oven/hob, US60, US30, then fridge. Upper run: H6002, hood,
// 500 mm wall cabinet, H3002.
const AB_105831_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base with UPK20 side blende", articleNumber: "DEFAULT + UPK20", blendeCode: "UPK20", blendeLabel: "UPK20 61 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-R", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105831-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60 + UPK20", blendeCode: "UPK20", blendeLabel: "UPK20 61 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-500-L", name: "Base cabinet with drawer", price: "0.01", widthMm: 500, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 70, infoText: "Base cabinet, hinge left", articleNumber: "Unterschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-L", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, heightMm: 878, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-4", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105831-KGCN388140E", name: "Freestanding refrigerator 178cm", nameDe: "Standkühlschrank 178 cm", price: "579.00", widthMm: 710, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002 + HPK2002", blendeCode: "HPK2002", blendeLabel: "HPK2002 50 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105831-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105831-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-500-L", name: "Wall Cabinet", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "Wall cabinet, hinge left", articleNumber: "Oberschrank" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H3002-L", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105825_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, heightMm: 600, depthMm: 878, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-base", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base with UPK20 side blende", articleNumber: "DEFAULT + UPK20", blendeCode: "UPK20", blendeLabel: "UPK20 40 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-R", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105825-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 50 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-L", name: "Base cabinet with drawer", price: "220.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-L", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105825-KGCN388140E", name: "Freestanding refrigerator 178cm", nameDe: "Standkühlschrank 178 cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-R", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 50 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105825-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105825-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-L", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H3002-L", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left, 2 adjustable shelves", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 140, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const L_SHAPED_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-400", name: "Wall Cabinet left", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 10, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-LS-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 20, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-500", name: "Wall Cabinet right 1", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 30, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-LS-600", name: "Wall Cabinet right 2", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#ff7f9f", componentKey: "wall-cabinet-4", sortOrder: 40, infoText: "1 door, 2 adjustable shelves" },
  { itemType: ItemType.COMPONENT, code: "HOOD-LS-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "under-cabinet-light", sortOrder: 50, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "REF-LS-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1800, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "OL-KGCN388140E, freestanding fridge-freezer, 180 cm, stainless-steel look, energy class D", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "TOP-LS-PLR", name: "PLR Worktops", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 70, isLocked: true, infoText: "PLR worktop, 40 mm, Beton-Optik Schiefer dunkelgrau / Beton-Optik natur", articleNumber: "PLR60 / PLR80" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-400", name: "Base Cabinet left", price: "0.01", widthMm: 400, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 80, infoText: "1 drawer, 1 door, 1 adjustable shelf" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", widthMm: 600, depthMm: 600, iconKey: "oven_base", colorKey: "#00c76a", componentKey: "oven-base", sortOrder: 90, isLocked: true, infoText: "Built-in oven + induction hob" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-LS-500", name: "Base Cabinet right", price: "0.01", widthMm: 500, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 100, infoText: "1 drawer, 1 door, 1 adjustable shelf" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "175.00", widthMm: 300, heightMm: 720, depthMm: 600, iconKey: "drawer_base_two", colorKey: "springgreen", componentKey: "base-module-3", sortOrder: 120, isLocked: true, infoText: "US30, sink base cabinet", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-DRAWER-LS-300", name: "Base Cabinet with Drawers", price: "229.00", widthMm: 300, depthMm: 723, iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 140, infoText: "US2A30, 1 drawer, 2 pull-outs", articleNumber: "US2A30", isActive: false },
  { itemType: ItemType.COMPONENT, code: "DISH-LS-600-STD", name: "Dishwasher", price: "579.00", widthMm: 598, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 130, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const L_KITCHEN_NEW_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-400", name: "TOP - 400_1 Wall Cabinet", price: "139.00", widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#111111", componentKey: "top-400", sortOrder: 10, infoText: "DXF layer: TOP - 400_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-ASPIRATOR", name: "ASPIRATOR Hood Area", price: "349.00", iconKey: "extractor_hood", colorKey: "#222222", componentKey: "aspirator", sortOrder: 20, infoText: "DXF layer: ASPIRATOR" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-500", name: "TOP - 500_1 Wall Cabinet", price: "139.00", widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_standard", colorKey: "#333333", componentKey: "top-500", sortOrder: 30, infoText: "DXF layer: TOP - 500_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-TOP-600", name: "TOP - 600_1 Wall Cabinet", price: "139.00", iconKey: "wall_cabinet_standard", colorKey: "#444444", componentKey: "top-600", sortOrder: 40, infoText: "DXF layer: TOP - 600_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BASE", name: "BASE Worktop and Fixed Elements", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "base", sortOrder: 50, isLocked: true, infoText: "DXF layer: BASE" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-400", name: "BOTTOM - 400_1 Base Cabinet", price: "199.00", widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#555555", componentKey: "bottom-400", sortOrder: 60, infoText: "DXF layer: BOTTOM - 400_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-500", name: "BOTTOM - 500_1 Base Cabinet", price: "199.00", widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#666666", componentKey: "bottom-500", sortOrder: 70, infoText: "DXF layer: BOTTOM - 500_1" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-DISHWASHER", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#777777", componentKey: "dishwasher", sortOrder: 80, infoText: "DXF layer: DISHWASHER", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-BOTTOM-300", name: "BOTTOM - 300 Drawer Cabinet", price: "229.00", iconKey: "drawer_base_three", colorKey: "#888888", componentKey: "bottom-300", sortOrder: 90, infoText: "DXF layer: BOTTOM - 300" },
  { itemType: ItemType.COMPONENT, code: "LKNEW-REFRIGERATOR", name: "Freestanding refrigerator 178cm", price: "579.00", iconKey: "tall_refrigerator", colorKey: "#999999", componentKey: "refrigerator", sortOrder: 100, infoText: "DXF layer: REFRIGERATOR" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105811_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105811-US60", name: "Base cabinet with drawer", price: "244.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105811-600", name: "Dishwasher", price: "579.00", iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105811-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-1", name: "Wall Cabinet", price: "184.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-3", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 110, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const AB_105815_ITEMS = AB_105811_ITEMS.map((item) => ({
  ...item,
  code: item.code.replace("AB105811", "AB105815"),
}));

// AB 105828: L-shaped corner kitchen. Excel callouts 1–3 are DEFAULT locked items
// (oven+hob, worktop, sink base with UPK20 blende panel). Callouts 4–9 are base
// elements (US30 R, dishwasher, US60 R+blende, US60 L, US30 L, fridge). Callouts
// 10–14 are upper elements (H6002 R+blende, H6002 R, hood, H6002 L, H3002 L).
const AB_105828_ITEMS = [
  // Callout 1: DEFAULT – Built-in Oven and Hob (locked)
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", price: "449.00", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-base", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  // Callout 2: DEFAULT – Worktop (locked)
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  // Callout 3: DEFAULT + UPK20(0.52CM)(25E) – Sink Base Cabinet (locked) with UPK20 panel
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105828-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Blanco Botton Pro 45/2 waste system", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  // Callout 4: US30 R 300/600 mm – Base cabinet 30 cm hinge right
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105828-US30-R", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30" },
  // Callout 5: A-EGSPV597210 + TGV60 – Dishwasher
  { itemType: ItemType.COMPONENT, code: "DISH-AB105828-600", name: "Dishwasher", price: "579.00", widthMm: 600, heightMm: 815, depthMm: 550, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  // Callout 6: US60 R + UPK20(0.5CM)(25E) 600/600 mm – Base cabinet 60 cm hinge right with blende
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105828-US60-R", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: "25.00" },
  // Callout 7: US60 L 600/600 mm – Base cabinet 60 cm hinge left
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105828-US60-L", name: "Base cabinet with drawer", price: "219.00", widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  // Callout 8: US30 L 300/600 mm – Base cabinet 30 cm hinge left
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105828-US30-L", name: "Base cabinet with drawer", price: "175.00", widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  // Callout 9: OL-KGCN388140E 178 cm - Freestanding refrigerator
  { itemType: ItemType.COMPONENT, code: "REF-AB105828-KGCN388140E", name: "Freestanding refrigerator 178cm", price: "579.00", heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  // Callout 10: H6002 R + HPK2002(0.5CM)(35E) 600/720/340 mm – Wall cabinet 60 cm hinge right with blende
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105828-H6002-R1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: "35.00" },
  // Callout 11: H6002 R 600/720/340 mm – Wall cabinet 60 cm hinge right (right of hood)
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105828-H6002-R2", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  // Callout 12: FH664621E + FWK124 + HD6002 - Upper cabinet with extractor hood (hood area)
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105828-600", name: "Upper Cabinet with Extractor Hood 60", price: "349.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 120, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105828-FH664621E", name: "FH664621E Extractor Hood", price: "349.00", widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 122, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  // Callout 13: H6002 L 600/720/340 mm – Wall cabinet 60 cm hinge left (return wall)
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105828-H6002-L1", name: "Wall Cabinet", price: "149.00", widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  // Callout 14: H3002 L 300/720/340 mm – Wall cabinet 30 cm hinge left (end of return wall)
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105828-H3002-L", name: "Wall Cabinet", price: "115.00", widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 140, infoText: "H3002, hinge left, 2 adjustable shelves", articleNumber: "H3002" },
  // Sink and waste system (locked)
  { itemType: ItemType.COMPONENT, code: "SINK-WORKTOP", name: "Sink and Worktop", nameDe: "Spüle und Arbeitsplatte", price: "89.00", iconKey: "sink_faucet", colorKey: "black", componentKey: "sink-faucet", sortOrder: 150, isLocked: true, infoText: "Blanco Botton Pro 45/2 manual waste system", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system", price: "89.00", iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
  { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: "25.00", iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
  { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: "69.00", iconKey: "lighting_set", sortOrder: 220, articleNumber: "KA220043_S3" },
  { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", iconKey: "delivery_assembly", sortOrder: 300 },
  { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Abholung an Logistikstandort", price: "0.00", iconKey: "pickup", sortOrder: 310 },
];

const DEFAULT_KITCHENS = [
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
    slug: "ab-105805",
    kitchenCode: "105 805",
    name: "AB 105805 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105805_page-0001.jpg",
    items: AB_105805_ITEMS,
  },
  {
    slug: "ab-105809",
    kitchenCode: "105 809",
    name: "AB 105809 Kitchen",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105809_ITEMS,
  },
  {
    slug: "ab-105813",
    kitchenCode: "105 813",
    name: "AB 105813 Kitchen",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105813_ITEMS,
  },
  {
    slug: "ab-105817",
    kitchenCode: "105 817",
    name: "AB 105817 Kitchen",
    description: "Kitchen configuration using the AB 105805 layout",
    items: AB_105817_ITEMS,
  },
  {
    slug: "ab-105834",
    kitchenCode: "105 834",
    name: "AB 105834 Kitchen",
    description: "L-shaped kitchen based on pdfs/AB 105834.pdf",
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
    description: "Kitchen configuration based on frontend/public/jpg/AB 105810_page-0001.jpg",
    items: AB_105814_ITEMS,
  },
  {
    slug: "ab-105818",
    kitchenCode: "105 818",
    name: "AB 105818 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105818_page-0001.jpg",
    items: AB_105818_ITEMS,
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
    slug: "ab-105811",
    kitchenCode: "105 811",
    name: "AB 105811 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105811.svg",
    items: AB_105811_ITEMS,
  },
  {
    slug: "ab-105815",
    kitchenCode: "105 815",
    name: "AB 105815 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105815.svg",
    items: AB_105815_ITEMS,
  },
  {
    slug: "ab-105828",
    kitchenCode: "105 828",
    name: "AB 105828 Kitchen",
    description: "L-shaped corner kitchen based on KITCHENS/AB 105828.xlsx and KITCHENS/AB 105828.pdf",
    items: AB_105828_ITEMS,
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
    slug: "ab-105824",
    kitchenCode: "105 824",
    name: "AB 105824 Kitchen",
    description: "Kitchen configuration based on the AB 105821 kitchen layout",
    items: AB_105824_ITEMS,
  },
  {
    slug: "ab-105822",
    kitchenCode: "105 822",
    name: "AB 105822 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105822.svg",
    items: AB_105822_ITEMS,
  },
  {
    slug: "ab-105823",
    kitchenCode: "105 823",
    name: "AB 105823 Kitchen",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105823_ITEMS,
  },
  {
    slug: "ab-105829",
    kitchenCode: "105 829",
    name: "AB 105829 Kitchen",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105829_ITEMS,
  },
  {
    slug: "ab-105832",
    kitchenCode: "105 832",
    name: "AB 105832 Kitchen",
    description: "Kitchen configuration based on the AB 105822 kitchen layout",
    items: AB_105832_ITEMS,
  },
  {
    slug: "ab-105825",
    kitchenCode: "105 825",
    name: "AB 105825 Kitchen",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105825.svg",
    items: AB_105825_ITEMS,
  },
  {
    slug: "ab-105837",
    kitchenCode: "105 837",
    name: "AB 105837 Kitchen",
    description: "L-shaped kitchen based on pdfs/AB 105837.pdf",
    items: AB_105837_ITEMS,
  },
  {
    slug: "ab-105831",
    kitchenCode: "105 831",
    name: "AB 105831 Kitchen",
    description: "L-shaped kitchen configuration based on frontend/public/plans/AB 105831.svg",
    items: AB_105831_ITEMS,
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
    slug: "ab-105830",
    kitchenCode: "105 830",
    name: "AB 105830 Kitchen",
    description: "Kitchen configuration based on the AB 105827 kitchen layout",
    items: AB_105830_ITEMS,
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
    slug: "ab-105845",
    kitchenCode: "105 845",
    name: "AB 105845 Kitchen",
    description: "Two-module kitchen configuration based on frontend/public/plans/AB 105845.svg",
    items: AB_105845_ITEMS,
  },
  {
    slug: "ab-105839",
    kitchenCode: "105 839",
    name: "AB 105839 Kitchen",
    description: "Kitchen configuration based on the AB 105842 kitchen layout",
    items: AB_105839_ITEMS,
  },
  {
    slug: "ab-105841",
    kitchenCode: "105 841",
    name: "AB 105841 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105841_page-0001.jpg",
    items: AB_105841_ITEMS,
  },
  {
    slug: "108134-modul-1",
    kitchenCode: "108 134",
    name: "108134 Modul 1 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/108134 MODUL 1.svg",
    items: MODUL1_108134_ITEMS,
  },
  {
    slug: "ab-105838",
    kitchenCode: "105 838",
    name: "AB 105838 Kitchen",
    description: "Kitchen configuration based on the AB 105841 kitchen layout",
    items: AB_105838_ITEMS,
  },
  {
    slug: "ab-105844",
    kitchenCode: "105 844",
    name: "AB 105844 Kitchen",
    description: "Kitchen configuration based on the AB 105841 kitchen layout",
    items: AB_105844_ITEMS,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "736269", kitchenSlug: "kitchen-model-c" },
  { contractNumber: "670108134", kitchenSlug: "108134-modul-1" },
  ...DEFAULT_KITCHENS
    .filter((kitchen) => kitchen.slug.startsWith("ab-"))
    .map((kitchen) => ({
      contractNumber: buildAbKitchenContractNumber(kitchen),
      kitchenSlug: kitchen.slug,
    })),
];

const OBSOLETE_KITCHENS = [
  { slug: "kitchen-model-b", contractNumbers: ["736268"] },
  { slug: "l-shaped-kitchen", contractNumbers: ["736270"] },
  { slug: "l-kitchen-new", contractNumbers: ["736271"] },
];

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

function isDefaultOvenHobItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    code === DEFAULT_OVEN_HOB_CATALOG_CODE ||
    /^OVEN-.+-HOB$/.test(code)
  );
}

function isDefaultSinkBaseItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && code.startsWith("SINKBASE-");
}

function applyDefaultSinkBaseCatalogFields(item) {
  return {
    ...item,
    code: DEFAULT_SINK_BASE_CATALOG_CODE,
    name: DEFAULT_SINK_BASE_CATALOG_NAME_EN,
    nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE,
    price: "0.00",
    widthMm: null,
    heightMm: null,
    depthMm: null,
    articleNumber: null,
    blendeCode: null,
    blendeLabel: null,
    blendePrice: null,
  };
}

function isDefaultSinkWorktopItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    code === DEFAULT_SINK_WORKTOP_CATALOG_CODE ||
    /^SINK-.+BOTTON/.test(code) ||
    (code.startsWith("SINK-") && item?.iconKey === "sink_faucet")
  );
}

function isDefaultWorktopItem(item) {
  if (isDefaultSinkWorktopItem(item)) return true;

  const code = String(item?.code || "").trim().toUpperCase();
  return Boolean(item?.isLocked) && (
    item?.iconKey === "worktop" ||
    item?.componentKey === "worktop" ||
    code.startsWith("TOP-")
  );
}

function applyDefaultWorktopCatalogFields(item) {
  return {
    ...item,
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    nameDe: DEFAULT_WORKTOP_CATALOG_NAME_DE,
    price: "0.00",
    widthMm: null,
    heightMm: null,
    depthMm: null,
    articleNumber: null,
    blendeCode: null,
    blendeLabel: null,
    blendePrice: null,
  };
}

function applyDefaultCatalogItem(item) {
  if (isDefaultOvenHobItem(item)) {
    return {
      ...item,
      code: DEFAULT_OVEN_HOB_CATALOG_CODE,
      name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN,
      nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE,
      articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE,
    };
  }

  if (isDefaultSinkBaseItem(item)) {
    return applyDefaultSinkBaseCatalogFields(item);
  }

  if (isDefaultSinkWorktopItem(item)) {
    return applyDefaultWorktopCatalogFields({
      ...item,
      code: DEFAULT_SINK_WORKTOP_CATALOG_CODE,
    });
  }

  if (isDefaultWorktopItem(item)) {
    return applyDefaultWorktopCatalogFields(item);
  }

  return item;
}

const LOWER_CABINET_ICON_KEYS = new Set([
  "base_cabinet_30",
  "drawer_base",
  "drawer_base_two",
  "drawer_base_three",
]);

const UPPER_CABINET_ICON_KEYS = new Set([
  "wall_cabinet_l",
  "wall_cabinet_plain",
  "wall_cabinet_r",
  "wall_cabinet_standard",
]);

const EXCLUDED_CABINET_CODE_PREFIXES = [
  "CAB-HOOD-",
  "HOOD-",
  "DISH-",
  "LIGHT-",
  "OVEN-",
  "REF-",
  "SINKBASE-",
  "TOP-",
  "WM-",
];

const EXCLUDED_CABINET_ICON_KEYS = new Set([
  "dishwasher_base",
  "extractor_hood",
  "hood",
  "oven_base",
  "tall_refrigerator",
  "under_cabinet_light",
  "washing_machine_base",
  "worktop",
]);

function firstPositiveNumber(values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return null;
}

function extractCabinetWidthFromText(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const patterns = [
    /\b(?:US|H)(?:2A)?(\d{2})(?:\d{2})?\b/i,
    /\b(\d{3})\s*(?:x|\u00d7|\/)\s*\d{2,4}\b/i,
    /\b(?:width|breite)\D{0,12}(\d{3})\b/i,
    /\b(\d{3})\s*mm\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isFinite(number) && number > 0) {
      return number < 100 ? number * 10 : number;
    }
  }

  return null;
}

function extractCabinetWidthFromCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return null;

  const patterns = [
    /(?:^|[-_])(?:TOP|BOTTOM)[-_]?(\d{3})(?:$|[-_])/,
    /(?:^|[-_])(\d{3})(?:$|[-_])/,
    /(?:^|[-_])US(?:2A)?(\d{2})(?:$|[-_])/,
    /(?:^|[-_])H(\d{2})\d{2}(?:$|[-_])/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (!match) continue;
    const number = Number.parseInt(match[1], 10);
    if (Number.isFinite(number) && number > 0) {
      return number < 100 ? number * 10 : number;
    }
  }

  return null;
}

function getCabinetWidthMm(item) {
  return firstPositiveNumber([
    item?.widthMm,
    extractCabinetWidthFromCode(item?.code),
    extractCabinetWidthFromText(item?.name),
    extractCabinetWidthFromText(item?.infoText),
    extractCabinetWidthFromText(item?.articleNumber),
  ]);
}

function getCabinetKind(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();

  if (!code && !iconKey && !componentKey && !name) return null;
  if (EXCLUDED_CABINET_CODE_PREFIXES.some((prefix) => code.startsWith(prefix))) return null;
  if (EXCLUDED_CABINET_ICON_KEYS.has(iconKey)) return null;
  if (code.startsWith("CAB-BASE-")
    || code.startsWith("CAB-COOK-")
    || code.startsWith("CAB-DRAWER-")
    || code.startsWith("LKNEW-BOTTOM-")
    || code.startsWith("T3D-CAB-BASE-")
    || code.startsWith("T3D-CAB-CORNER-")
    || code.startsWith("T3D-CAB-DRAWERS-")
    || code.startsWith("T3D-CAB-STORAGE-")
    || LOWER_CABINET_ICON_KEYS.has(iconKey)) {
    return "lower";
  }

  if (code.startsWith("CAB-WALL-")
    || code.startsWith("LKNEW-TOP-")
    || code.startsWith("T3D-CAB-WALL-")
    || UPPER_CABINET_ICON_KEYS.has(iconKey)
    || componentKey.includes("wall-cabinet")) {
    return "upper";
  }

  if (/^(base cabinet|sink base cabinet|drawer base cabinet|return base cabinet|corner base cabinet)\b/.test(name)) {
    return "lower";
  }
  if (/^wall cabinet\b/.test(name)) {
    return "upper";
  }

  return null;
}

function getCabinetWidthDisplayName(item, language = "en") {
  const kind = getCabinetKind(item);
  const widthMm = getCabinetWidthMm(item);
  if (!kind || !Number.isFinite(Number(widthMm)) || Number(widthMm) <= 0) return "";
  const widthCm = Number(widthMm) / 10;
  const widthLabel = Number.isInteger(widthCm)
    ? String(widthCm)
    : String(Number(widthCm.toFixed(2))).replace(/\.0+$/, "");
  if (language === "de") {
    return kind === "lower" ? `Unterschrank mit Schublade ${widthLabel}` : `Oberschrank ${widthLabel}`;
  }
  return kind === "lower"
    ? `Lower cabinet with drawer ${widthLabel}`
    : `Upper cabinet ${widthLabel}`;
}

function formatBlendeLabel(label) {
  const normalized = String(label || "").trim().replace(/\s+/g, " ").replace(/^blende\s+/i, "");
  if (!normalized) return null;

  const match = normalized.match(/^([A-Z0-9-]+)\s+(.+)$/i);
  if (!match) return normalized;

  return `${match[1]}, ${match[2]}`;
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

const DEFAULT_HOUSING_COMPANY = {
  name: "ARGE Nördliche Riedsiedlung",
  address: "Beekbreite 2-8, 49124 Georgsmarienhütte, Germany",
  email: null,
  phone: null,
  notes: "c/o MBN GmbH",
};

const DEFAULT_PROPERTY_PROJECT = {
  objectName: "Hamburg - 800",
  projectName: "Hamburg - 800",
  projectCode: "Hamburg - 800",
  projectStatus: "active",
  projectDescription: "Kitchens for Hamburg - 800 project",
  projectManagerName: null,
  contactPhone: null,
  country: "Germany",
  city: "Hamburg",
  postalCode: "22111",
  address1: "Hermannstal 92-114",
  address2: null,
};

async function pruneNonDefaultHousingCompanies() {
  const defaultCompanyName = DEFAULT_HOUSING_COMPANY.name;

  const unlinkedContracts = await prisma.kitchenContract.updateMany({
    where: {
      projectId: { not: null },
      project: {
        housingCompany: {
          name: { not: defaultCompanyName },
        },
      },
    },
    data: { projectId: null },
  });

  const deletedHousingCompanies = await prisma.housingCompany.deleteMany({
    where: {
      name: { not: defaultCompanyName },
    },
  });

  return {
    deletedHousingCompanies: deletedHousingCompanies.count,
    unlinkedContracts: unlinkedContracts.count,
  };
}

async function ensureDefaultPropertyProject() {
  const company = DEFAULT_HOUSING_COMPANY;
  const projectSeed = DEFAULT_PROPERTY_PROJECT;

  const existingOwner = await prisma.housingCompany.findFirst({
    where: { name: company.name },
  });

  const ownerId = existingOwner?.id || randomUUID();
  if (existingOwner) {
    await prisma.housingCompany.update({
      where: { id: ownerId },
      data: {
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        notes: company.notes,
      },
    });
  } else {
    await prisma.housingCompany.create({
      data: {
        id: ownerId,
        name: company.name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        notes: company.notes,
      },
    });
  }

  const existingObject = await prisma.propertyObject.findFirst({
    where: {
      housingCompanyId: ownerId,
      name: projectSeed.objectName,
    },
  });

  const objectId = existingObject?.id || randomUUID();
  if (existingObject) {
    await prisma.propertyObject.update({
      where: { id: objectId },
      data: {
        name: projectSeed.objectName,
        contactPhone: projectSeed.contactPhone,
        country: projectSeed.country,
        city: projectSeed.city,
        postalCode: projectSeed.postalCode,
        address1: projectSeed.address1,
        address2: projectSeed.address2,
      },
    });
  } else {
    await prisma.propertyObject.create({
      data: {
        id: objectId,
        name: projectSeed.objectName,
        housingCompanyId: ownerId,
        contactPhone: projectSeed.contactPhone,
        country: projectSeed.country,
        city: projectSeed.city,
        postalCode: projectSeed.postalCode,
        address1: projectSeed.address1,
        address2: projectSeed.address2,
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { propertyObjectId: objectId },
    update: {
      name: projectSeed.projectName,
      projectCode: projectSeed.projectCode,
      status: projectSeed.projectStatus,
      description: projectSeed.projectDescription,
      managerName: projectSeed.projectManagerName,
      housingCompanyId: ownerId,
    },
    create: {
      propertyObjectId: objectId,
      housingCompanyId: ownerId,
      name: projectSeed.projectName,
      projectCode: projectSeed.projectCode,
      status: projectSeed.projectStatus,
      description: projectSeed.projectDescription,
      managerName: projectSeed.projectManagerName,
    },
  });

  return project.id;
}

async function linkImplementedKitchenContracts(projectId) {
  await prisma.kitchenContract.updateMany({
    where: {
      contractNumber: { not: { startsWith: "DM-" } },
      kitchen: { status: KitchenStatus.ACTIVE },
    },
    data: { projectId },
  });

  const linkedContracts = await prisma.kitchenContract.findMany({
    where: {
      projectId,
      contractNumber: { not: { startsWith: "DM-" } },
      kitchen: { status: KitchenStatus.ACTIVE },
    },
    select: { contractNumber: true },
    orderBy: { contractNumber: "asc" },
  });

  return linkedContracts.map((contract) => contract.contractNumber);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash, role: "SUPERADMIN", isActive: true },
      create: { email: adminEmail, passwordHash, role: "SUPERADMIN" },
    });
  }

  const housingCompanyCleanup = await pruneNonDefaultHousingCompanies();
  if (housingCompanyCleanup.deletedHousingCompanies || housingCompanyCleanup.unlinkedContracts) {
    console.log(
      `Removed ${housingCompanyCleanup.deletedHousingCompanies} non-ARGE housing companies and unlinked ${housingCompanyCleanup.unlinkedContracts} contracts.`,
    );
  }

  const defaultProjectId = await ensureDefaultPropertyProject();

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
            programmId: DEFAULT_KITCHEN_PROGRAMM_ID,
            name: kitchen.name,
            status: KitchenStatus.ACTIVE,
            description: kitchen.description,
          },
          include: { items: true },
        });

    const existingByCode = new Map(kitchenRecord.items.map((item) => [item.code, item]));
    const normalizedKitchenItems = kitchen.items.map(applyDefaultCatalogItem);
    const targetCodes = new Set(normalizedKitchenItems.map((item) => item.code));

    for (const rawItem of kitchen.items) {
      const item = applyDefaultCatalogItem(rawItem);
      const existingItem = existingByCode.get(item.code)
        || existingByCode.get(rawItem.code)
        || (rawItem.legacyCode ? existingByCode.get(rawItem.legacyCode) : null);
      const productInfo = PRODUCT_INFO_BY_CODE[item.code] || PRODUCT_INFO_BY_CODE[rawItem.code] || {};
      const cabinetWidthName = getCabinetWidthDisplayName(item);
      const cabinetWidthNameDe = getCabinetWidthDisplayName(item, "de");
      const itemCode = String(item.code || "").trim().toUpperCase();
      const isRefrigeratorItem = itemCode.startsWith("REF-")
        || itemCode === "LKNEW-REFRIGERATOR"
        || item.iconKey === "tall_refrigerator";
      const isHoodWallCabinetItem = itemCode.startsWith("CAB-HOOD-");
      const isDefaultCatalogItem = isDefaultOvenHobItem(item)
        || isDefaultSinkBaseItem(item)
        || isDefaultWorktopItem(item);
      const itemName = isDefaultOvenHobItem(item)
        ? DEFAULT_OVEN_HOB_CATALOG_NAME_EN
        : isDefaultSinkBaseItem(item)
          ? DEFAULT_SINK_BASE_CATALOG_NAME_EN
          : isDefaultWorktopItem(item)
            ? DEFAULT_WORKTOP_CATALOG_NAME_EN
            : isRefrigeratorItem
              ? REFRIGERATOR_CATALOG_NAME_EN
              : isHoodWallCabinetItem
                ? HOOD_WALL_CABINET_CATALOG_NAME_EN
                : cabinetWidthName || item.name;
      const itemNameDe = isDefaultOvenHobItem(item)
        ? DEFAULT_OVEN_HOB_CATALOG_NAME_DE
        : isDefaultSinkBaseItem(item)
          ? DEFAULT_SINK_BASE_CATALOG_NAME_DE
          : isDefaultWorktopItem(item)
            ? DEFAULT_WORKTOP_CATALOG_NAME_DE
            : isRefrigeratorItem
              ? REFRIGERATOR_CATALOG_NAME_DE
              : isHoodWallCabinetItem
                ? HOOD_WALL_CABINET_CATALOG_NAME_DE
                : cabinetWidthNameDe || item.nameDe || null;
      const data = {
        ...productInfo,
        productInfoUpdatedAt: productInfo.productInfoPdfPath ? new Date() : null,
        itemType: item.itemType,
        code: item.code,
        articleNumber: item.articleNumber || null,
        name: itemName,
        nameDe: itemNameDe,
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
        blendeCode: item.blendeCode || null,
        blendeLabel: formatBlendeLabel(item.blendeLabel),
        blendePrice: item.blendePrice ?? null,
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

  for (const contract of DEFAULT_KITCHEN_CONTRACTS) {
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
        projectId: defaultProjectId,
        isActive: true,
      },
      create: {
        contractNumber: contract.contractNumber,
        kitchenId: kitchen.id,
        projectId: defaultProjectId,
        isActive: true,
      },
    });
  }

  const linkedContractNumbers = await linkImplementedKitchenContracts(defaultProjectId);
  console.log(
    `Linked ${linkedContractNumbers.length} kitchen contract numbers to ${DEFAULT_PROPERTY_PROJECT.projectName}.`,
  );

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
