const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const { PrismaClient, KitchenStatus, ItemType } = require("@prisma/client");
const CLAIMS_CHATBOT_KNOWLEDGE = require("../lib/claims-chatbot-knowledge.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = require("../lib/service-claim-troubleshooting-data.json");

const prisma = new PrismaClient();

const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";
const DISHWASHER_CATALOG_NAME_EN = "Fully integrated dishwasher incl. furniture front";
const DISHWASHER_CATALOG_NAME_DE = "Vollintegrierter Geschirrspüler inkl. Möbelfront";
const REFRIGERATOR_CATALOG_NAME_EN = "Freestanding refrigerator 178 cm";
const REFRIGERATOR_CATALOG_NAME_DE = "Standkühlschrank 178 cm";
const HOOD_WALL_CABINET_CATALOG_NAME_EN = "Flat screen extractor hood + cabinet + filter 60 cm";
const HOOD_WALL_CABINET_CATALOG_NAME_DE = "Flachschirmhaube + Schrank + Filter 60 cm";
const DEFAULT_OVEN_HOB_CATALOG_CODE = "OVEN-B-600-HOB";
const DEFAULT_OVEN_HOB_CATALOG_NAME_EN = "Built-in oven and induction hob";
const DEFAULT_OVEN_HOB_CATALOG_NAME_DE = "Einbaubackofen und Kochfeld";
const DEFAULT_OVEN_HOB_CATALOG_ARTICLE = "EBX943600S + OL-KMI754000E";
const DEFAULT_OVEN_HOB_CATALOG_PRICE = "0.00";
const DEFAULT_SINK_BASE_CATALOG_CODE = "SINKBASE-B-600";
const DEFAULT_SINK_BASE_CATALOG_NAME_EN = "Sink Lower Cabinet";
const DEFAULT_SINK_BASE_CATALOG_NAME_DE = "Spülenunterschrank";
const DEFAULT_SINK_BASE_CATALOG_INFO_TEXT = "Default sink base cabinet";
const DEFAULT_SINK_WORKTOP_CATALOG_CODE = "SINK-WORKTOP";
const DEFAULT_WORKTOP_CATALOG_NAME_EN = "Worktop";
const DEFAULT_WORKTOP_CATALOG_NAME_DE = "Arbeitsplatte";
const DEFAULT_WORKTOP_CATALOG_INFO_TEXT = "Worktop included with the default kitchen configuration";
const L_SHAPED_CLAIM_KITCHEN_SLUGS = new Set([
  "ab-104968", "ab-105734", "ab-105737", "ab-105740",
  "ab-105805", "ab-105809", "ab-105813", "ab-105817",
  "ab-105822", "ab-105825", "ab-105828", "ab-105831",
  "ab-105834", "ab-105837", "ab-105840", "ab-105843",
]);

const ARTICLE_PRICES = {
  "517467": 89,
  "A-EGSPV594400 + TGV60": 680,
  "A-EGSPV597210 + TGV60": 579,
  "EWA34660W + TGV60 + WU16": 639,
  "FH 664 621 S": 349,
  "FH664621E + FWK124 + HD6002": 349,
  H3002: 115,
  H4002: 130,
  H4502: 139,
  H5002: 135,
  H6002: 149,
  H8002: 200,
  H9002: 203,
  H10002: 209,
  "KALB KA220043_S3": 69,
  KHF664611S: 209,
  "KHF664611S + FWP18": 209,
  "OL-KGCN388140E": 579,
  US100: 353,
  US120: 403,
  US2A30: 298,
  US2A40: 305,
  US2A45: 316,
  US2A50: 324,
  US2A60: 369,
  US2A80: 466,
  US2A90: 471,
  US2A100: 514,
  US30: 175,
  US40: 183,
  US45: 198,
  US50: 198,
  US60: 219,
  US80: 333,
  US90: 339,
  ZB30SG: 19,
  ZB40SG: 19,
  ZB45SG: 22,
  ZB50SG: 22,
  ZB60SG: 25,
  ZB80SG: 31,
  ZB90SG: 31,
  ZB100SG: 36,
};

const BLENDE_PRICES = {
  HPEF4302: 150,
  HPK2002: 35,
  UPEF65: 68,
  UPK20: 25,
};

const SERVICE_PRICES = {
  MONTAGE: 349,
  PICKUP: 0,
};

const BUNDLE_PRICES = {
  "FH664621E + FWK124 + HD6002": 349,
  "KHF664611S + FWP18": 209,
};

const CATALOG_ARTICLES = [
  { articleNumber: "A-EGSPV594400 + TGV60", name: "Fully Integrated Dishwasher incl. Furniture Front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", widthMm: 600, depthMm: 600, price: "680.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "A-EGSPV597210 + TGV60", name: "Fully integrated dishwasher incl. furniture front", nameDe: "Vollintegrierter Geschirrspüler inkl. Möbelfront", price: "579.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "EWA34660W + TGV60 + WU16", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: "639.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "FH664621E + FWK124 + HD6002", name: "Flat screen extractor hood + cabinet + filter", nameDe: "Flachschirmhaube + Schrank + Filter", price: "349.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "H10002", name: "Upper cabinet 100 cm", nameDe: "Oberschrank 100 cm", widthMm: 1000, heightMm: 720, price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H3002", name: "Upper cabinet 30 cm", nameDe: "Oberschrank 30 cm", widthMm: 300, heightMm: 720, price: "115.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H4002", name: "Upper cabinet 40 cm", nameDe: "Oberschrank 40 cm", widthMm: 400, heightMm: 720, price: "130.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H4502", name: "Upper cabinet 45 cm", nameDe: "Oberschrank 45 cm", widthMm: 450, heightMm: 720, price: "139.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H5002", name: "Upper cabinet 50 cm", nameDe: "Oberschrank 50 cm", widthMm: 500, heightMm: 720, price: "135.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H6002", name: "Upper cabinet 60 cm", nameDe: "Oberschrank 60 cm", widthMm: 600, heightMm: 720, price: "149.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H8002", name: "Upper cabinet 80 cm", nameDe: "Oberschrank 80 cm", widthMm: 800, heightMm: 720, price: "200.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "H9002", name: "Upper cabinet 90 cm", nameDe: "Oberschrank 90 cm", widthMm: 900, heightMm: 720, price: "203.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KHF664611S", name: "Angled extractor hood", nameDe: "Schrägesse", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KHF664611S + FWP18", name: "Angled extractor hood + filter", nameDe: "Schrägesse + Filter", price: "209.00", itemType: ItemType.COMPONENT, isFixedPricePackage: true, isActive: true },
  { articleNumber: "OL-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", widthMm: 0, heightMm: 1780, depthMm: 0, price: "579.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US100", name: "Lower cabinet with drawer 100 cm", nameDe: "Unterschrank mit Schublade 100 cm", widthMm: 1000, price: "353.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US120", name: "Lower cabinet with drawer 120 cm", nameDe: "Unterschrank mit Schublade 120 cm", widthMm: 1200, price: "403.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A100", name: "Lower cabinet with Drawer/Soft-close 100", nameDe: "Unterschrank mit Schublade/Auszug 100", widthMm: 1000, price: "514.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A30", name: "Lower cabinet with Drawer/Soft-close 30", nameDe: "Unterschrank mit Schublade/Auszug 30", widthMm: 300, price: "298.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A40", name: "Lower cabinet with Drawer/Soft-close 40", nameDe: "Unterschrank mit Schublade/Auszug 40", widthMm: 400, price: "305.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A45", name: "Lower cabinet with Drawer/Soft-close 45", nameDe: "Unterschrank mit Schublade/Auszug 45", widthMm: 450, price: "316.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A50", name: "Lower cabinet with Drawer/Soft-close 50", nameDe: "Unterschrank mit Schublade/Auszug 50", widthMm: 500, price: "324.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A60", name: "Base cabinet with drawers 60 cm", nameDe: "Unterschrank mit Auszügen 60 cm", widthMm: 600, price: "369.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A80", name: "Lower cabinet with Drawer/Soft-close 80", nameDe: "Unterschrank mit Schublade/Auszug 80", widthMm: 800, price: "466.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US2A90", name: "Lower cabinet with Drawer/Soft-close 90", nameDe: "Unterschrank mit Schublade/Auszug 90", widthMm: 900, price: "471.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US30", name: "Lower cabinet with drawer 30 cm", nameDe: "Unterschrank mit Schublade 30 cm", widthMm: 300, price: "175.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US40", name: "Lower cabinet with drawer 40 cm", nameDe: "Unterschrank mit Schublade 40 cm", widthMm: 400, price: "183.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US45", name: "Lower cabinet with drawer 45 cm", nameDe: "Unterschrank mit Schublade 45 cm", widthMm: 450, price: "198.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US50", name: "Lower cabinet with drawer 50 cm", nameDe: "Unterschrank mit Schublade 50 cm", widthMm: 500, depthMm: 600, price: "198.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US60", name: "Lower cabinet with drawer 60 cm", nameDe: "Unterschrank mit Schublade 60 cm", widthMm: 600, depthMm: 600, price: "219.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US80", name: "Lower cabinet with drawer 80 cm", nameDe: "Unterschrank mit Schublade 80 cm", widthMm: 800, price: "333.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "US90", name: "Lower cabinet with drawer 90 cm", nameDe: "Unterschrank mit Schublade 90 cm", widthMm: 900, price: "339.00", itemType: ItemType.COMPONENT, isFixedPricePackage: false, isActive: true },
  { articleNumber: "517467", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: "89.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "KALB KA220043_S3", name: "LED lighting set", nameDe: "LED-Beleuchtungsset", price: "69.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB100SG", name: "Cutlery insert 100 cm", nameDe: "Besteckeinsatz 100 cm", price: "36.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB30SG", name: "Cutlery insert 30 cm", nameDe: "Besteckeinsatz 30 cm", price: "19.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB40SG", name: "Cutlery insert 40 cm", nameDe: "Besteckeinsatz 40 cm", price: "19.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB45SG", name: "Cutlery insert 45 cm", nameDe: "Besteckeinsatz 45 cm", price: "22.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB50SG", name: "Cutlery insert 50 cm", nameDe: "Besteckeinsatz 50 cm", price: "22.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB60SG", name: "Cutlery insert 60 cm", nameDe: "Besteckeinsatz 60 cm", price: "25.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB80SG", name: "Cutlery insert 80 cm", nameDe: "Besteckeinsatz 80 cm", price: "31.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
  { articleNumber: "ZB90SG", name: "Cutlery insert 90 cm", nameDe: "Besteckeinsatz 90 cm", price: "31.00", itemType: ItemType.ACCESSORY, isFixedPricePackage: false, isActive: true },
];

const CATALOG_BLENDEN = [
  { code: "HPEF4302", name: "Corner filler panel for Upper cabinet", nameDe: "Eckpassblende Hängeschrank", price: "150.00", isActive: true },
  { code: "HPK2002", name: "HPK2002 Filler Panel", nameDe: "HPK2002 Passblende", price: "35.00", isActive: true },
  { code: "UPEF65", name: "Corner filler panel for Lower cabinet", nameDe: "Eckpassblende Unterschrank", price: "68.00", isActive: true },
  { code: "UPK20", name: "UPK20 Filler Panel", nameDe: "UPK20 Passblende", price: "25.00", isActive: true },
];

const CATALOG_SERVICES = [
  { code: "MONTAGE", name: "Delivery, Carry-in, Assembly and Installation", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: "349.00", isActive: true },
  { code: "PICKUP", name: "Pickup at logistics location", nameDe: "Abholung an Logistikstandort", price: "0.00", isActive: true },
];

function formatSeedPrice(value) {
  return Number(value || 0).toFixed(2);
}

function articlePrice(articleNumber) {
  return formatSeedPrice(ARTICLE_PRICES[articleNumber]);
}

function blendePrice(code, quantity = 1) {
  return formatSeedPrice(BLENDE_PRICES[code] * quantity);
}

function articlePriceWithBlende(articleNumber, blendeCode, quantity = 1) {
  const article = Number(ARTICLE_PRICES[articleNumber]);
  const blende = Number(BLENDE_PRICES[blendeCode] || 0) * Number(quantity || 0);
  return formatSeedPrice(article + blende);
}

function servicePrice(code) {
  return formatSeedPrice(SERVICE_PRICES[code]);
}

function bundlePrice(bundleCode) {
  return formatSeedPrice(BUNDLE_PRICES[bundleCode]);
}

function defaultAccessories() {
  return [
    { itemType: ItemType.ACCESSORY, code: "ACC-WASTE-001", legacyCode: "acc-waste", name: "Waste separation system Blanco Botton", nameDe: "Mülltrennsystem Blanco Botton", price: articlePrice("517467"), iconKey: "waste_system", sortOrder: 200, infoText: "Blanco Botton 517467", articleNumber: "517467" },
    { itemType: ItemType.ACCESSORY, code: "ACC-CUTLERY-ZB60SG", legacyCode: "acc-cutlery", name: "Cutlery insert 60 cm", price: articlePrice("ZB60SG"), iconKey: "cutlery_insert", sortOrder: 210, infoText: "Cutlery insert 60 cm", articleNumber: "ZB60SG" },
    { itemType: ItemType.ACCESSORY, code: "ACC-LIGHT-003", legacyCode: "acc-lighting", name: "Beleuchtungsset 3 LED-Spots", price: articlePrice("KALB KA220043_S3"), iconKey: "lighting_set", sortOrder: 220, articleNumber: "KALB KA220043_S3" },
  ];
}

function defaultServices() {
  return [
    { itemType: ItemType.SERVICE, code: "SVC-MONTAGE-001", legacyCode: "service-montage", name: "Delivery, Carry-in, Assembly and Installation", nameDe: "Lieferung, Vertragen, Montage und Anschluss", price: servicePrice("MONTAGE"), iconKey: "delivery_assembly", sortOrder: 300 },
    { itemType: ItemType.SERVICE, code: "SVC-PICKUP-001", legacyCode: "service-pickup", name: "Pickup at logistics location", nameDe: "Abholung an Logistikstandort", price: servicePrice("PICKUP"), iconKey: "pickup", sortOrder: 310 },
  ];
}

function defaultOvenHob(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_OVEN_HOB_CATALOG_CODE,
    name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN,
    nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE,
    articleNumber: DEFAULT_OVEN_HOB_CATALOG_ARTICLE,
    price: DEFAULT_OVEN_HOB_CATALOG_PRICE,
    iconKey: "oven_base",
    colorKey: "springgreen",
    componentKey: "oven-module",
    sortOrder: 30,
    infoText: "Built-in oven + induction hob",
    isLocked: true,
    ...overrides,
  };
}

function defaultWorktop(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: "TOP-AB105806",
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    price: "0.00",
    iconKey: "worktop",
    colorKey: "springgreen",
    componentKey: "worktop",
    sortOrder: 20,
    isLocked: true,
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

function defaultSinkBase(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_SINK_BASE_CATALOG_CODE,
    name: DEFAULT_SINK_BASE_CATALOG_NAME_EN,
    nameDe: DEFAULT_SINK_BASE_CATALOG_NAME_DE,
    price: "0.00",
    iconKey: "sink_base",
    colorKey: "springgreen",
    componentKey: "sink-base",
    sortOrder: 30,
    isLocked: true,
    infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

function defaultSinkWorktop(overrides = {}) {
  return {
    itemType: ItemType.COMPONENT,
    code: DEFAULT_SINK_WORKTOP_CATALOG_CODE,
    name: DEFAULT_WORKTOP_CATALOG_NAME_EN,
    nameDe: DEFAULT_WORKTOP_CATALOG_NAME_DE,
    price: "0.00",
    iconKey: "sink_faucet",
    colorKey: "black",
    componentKey: "sink-faucet",
    sortOrder: 140,
    isLocked: true,
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
    ...overrides,
  };
}

function normalizeBlendeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (code.startsWith("UPK20")) return "UPK20";
  if (code.startsWith("HPK2002")) return "HPK2002";
  return "";
}

function getBlendeQuantity(item) {
  const code = String(item?.blendeCode || "").trim().toUpperCase();
  const label = String(item?.blendeLabel || "").trim().toUpperCase();
  const price = Number(item?.blendePrice || 0);
  const normalizedCode = normalizeBlendeCode(code);
  const unitPrice = BLENDE_PRICES[normalizedCode];

  if (!normalizedCode || !unitPrice) return 0;
  if (/\bX2\b/.test(code) || /^2X\b/.test(label) || /\bX\s*2\b/.test(label)) return 2;
  if (price === unitPrice * 2) return 2;
  if (price === unitPrice) return 1;
  return 0;
}

function applyCentralizedArticlePricing(item) {
  const articleNumber = String(item?.articleNumber || "").trim();
  const currentPrice = item?.price == null ? null : Number(item.price);
  const hasArticlePrice = Object.prototype.hasOwnProperty.call(ARTICLE_PRICES, articleNumber);
  const normalizedBlendeCode = normalizeBlendeCode(item?.blendeCode);
  const blendeQty = getBlendeQuantity(item);
  const data = { ...item };

  if (normalizedBlendeCode && blendeQty > 0) {
    data.blendePrice = blendePrice(normalizedBlendeCode, blendeQty);
  }

  if (!hasArticlePrice || currentPrice == null) {
    return data;
  }

  const expectedPrice = normalizedBlendeCode && blendeQty > 0
    ? Number(articlePriceWithBlende(articleNumber, normalizedBlendeCode, blendeQty))
    : Number(articlePrice(articleNumber));

  if (currentPrice === expectedPrice) {
    data.price = normalizedBlendeCode && blendeQty > 0
      ? articlePriceWithBlende(articleNumber, normalizedBlendeCode, blendeQty)
      : articlePrice(articleNumber);
  }

  return data;
}

const PRODUCT_INFO_FILES = {
  dishwasher: "/product-info/a-egspv597210-product-info-eco21.pdf",
  oven: "/product-info/ebx-943-600-s-product-info.pdf",
  hood: "/product-info/fh-664-621-s-product-info.pdf",
  hoodChimney: "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf",
  fridge: "/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf",
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
    productInfoSummary: "Vollintegrierter 60-cm-Geschirrspüler für den Einbau hinter einer Möbelfront. Die aktuelle Produktinformation nennt 12 Maßgedecke, Energieklasse D und 5 Programme.",
    productInfoKeyFacts: [
      "Energieklasse: D",
      "Energieverbrauch: 82 kWh / 100 Zyklen.",
      "Wasserverbrauch: 11.0 l/Zyklus.",
      "Geräusch: 49 dB",
      "Breite: 60 cm",
      "Gerätemaße H x B x T (mm): 815 x 598 x 550.",
      "Einbaumaße H x B x T (mm): 820 - 870 x 600 x 580.",
      "Tiefe bei geöffneter Tür (mm): 1150.",
      "Programme: 5",
      "Kapazität: 12 Maßgedecke",
    ],
    productInfoExtractedText: [
      "Produktname: Architecto / AMICA A-EGSPV597210 Geschirrspüler, 60 cm.",
      "Wichtige Punkte:",
      "- Produkttyp: vollintegrierter Einbau-Geschirrspüler.",
      "- 12 Maßgedecke, 5 Programme, 4 Temperaturen.",
      "- Energieklasse D, 82 kWh / 100 Zyklen, 11.0 l / Zyklus.",
      "- Energieverbrauch: 82 kWh / 100 Zyklen.",
      "- Wasserverbrauch: 11.0 l/Zyklus.",
      "- Geräusch: 49 dB(A), Klasse C.",
      "- Gerätemaße H x B x T (mm): 815 x 598 x 550.",
      "- Einbaumaße H x B x T (mm): 820 - 870 x 600 x 580.",
      "- Tiefe bei geöffneter Tür (mm): 1150.",
      "- Ausstattung: Aquastop, Extra Dry, OpenDry, halbe Beladung, Startzeitvorwahl 3/6/9 h.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbaumaß, Frontintegration und Anschlussposition prüfen.",
    ].join("\n"),
  },
  "REF-545-1800-700": {
    productImagePath: PRODUCT_IMAGE_FILES.fridge,
    productInfoPdfPath: PRODUCT_INFO_FILES.fridge,
    productInfoSummary: "Freistehende Kühl-Gefrierkombination KGC 15495 S für die Küchenplanung. Die aktuelle Produktinformation nennt NoFrost, 180 cm Bauhöhe und Energieklasse E.",
    productInfoKeyFacts: [
      "Energieklasse: E",
      "Geräusch: 41 dB",
      "Höhe: 180 cm",
      "Nutzinhalt: 250 l",
      "NoFrost: Kühlen und Gefrieren",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA KGC 15495 S Kühl-/Gefrierkombination, 180 cm.",
      "Wichtige Punkte:",
      "- Freistehendes Kühl-Gefriergeraet mit NoFrost und automatischer Abtauung.",
      "- Energieklasse E, Jahresverbrauch 219 kWh, Geräusch 41 dB(A), Klasse C.",
      "- Kühlen 180 l, Gefrieren 70 l, 4-Sterne-Gefrierteil.",
      "- Ausstattung: FreshZone, VitControl Plus, LED-Licht, Flaschenregal, 3 Gefrierschubladen.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Gerätemaß, Türanschlag und Belüftung im Küchenplan prüfen.",
    ].join("\n"),
  },
  "HOOD-600-FLAT": {
    productImagePath: PRODUCT_IMAGE_FILES.hood,
    productInfoPdfPath: PRODUCT_INFO_FILES.hood,
    productInfoSummary: "Flachschirmhaube FH 664 621 S für eine 60-cm-Küchenlösung. Die aktuelle Produktinformation nennt Energieklasse A und bis zu 70 dB Betriebsgeräusch.",
    productInfoKeyFacts: [
      "Energieklasse: A",
      "Geräusch: max. 70 dB",
      "Breite: 60 cm",
      "Luftleistung: 170-415 m3/h",
      "Betriebsart: Abluft / Umluft",
    ],
    productInfoExtractedText: [
      "Produktname: AMICA FH 664 621 S Flachschirmhaube, 60 cm.",
      "Wichtige Punkte:",
      "- Teleskophaube / Flachschirmhaube in Schwarz mit mechanischen Schaltern.",
      "- Energieklasse A, Jahresverbrauch 24.8 kWh, Fluid-Dynamic-Effizienzklasse B.",
      "- 3 Leistungsstufen, Luftleistung 170-415 m3/h, Geräusch 49-70 dB.",
      "- 2 LED-Leuchten, 2 spülmaschinengeeignete Aluminium-Fettfilter.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Einbauposition und Luftführung prüfen.",
    ].join("\n"),
  },
  "WM-B-EWA34660W": {
    productImagePath: PRODUCT_IMAGE_FILES.washingMachine,
    productInfoPdfPath: "/product-info/ewa-34660-w-product-info.pdf",
    productInfoSummary: "Waschmaschine EWA34660W für die Küchenkonfiguration. Die Produktinformation nennt Energieeffizienzklasse A, 47 kWh / 100 Zyklen, 48 l/Zyklus, 8 kg Fassungsvermögen, 1400 U/min, 72 dB(A) und Gerätemaße 830 x 600 x 540 mm.",
    productInfoKeyFacts: [
      "Produkttyp: Waschmaschine.",
      "Modell: EWA34660W.",
      "Energieeffizienzklasse: A.",
      "Energieverbrauch: 47 kWh / 100 Zyklen.",
      "Wasserverbrauch: 48 l/Zyklus.",
      "Fassungsvermögen: 8 kg.",
      "Schleuderdrehzahl: 1400 U/min.",
      "Geräusch: 72 dB(A)",
      "Gerätemaße H x B x T (mm): 830 x 600 x 540.",
      "Einbaumaße H x B x T (mm): 825 x 600 x 580.",
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
      "- Fassungsvermögen: 8 kg.",
      "- Schleuderdrehzahl: 1400 U/min.",
      "- Geräusch: 72 dB(A)",
      "- Gerätemaße H x B x T (mm): 830 x 600 x 540.",
      "- Einbaumaße H x B x T (mm): 825 x 600 x 580.",
      "- Wasser- und Stromanschluss nach Produktinformation beachten.",
      "Auswahlhinweise:",
      "- Vor der Bestellung Wasseranschluss, Ablauf und Stellmaß prüfen.",
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
PRODUCT_INFO_BY_CODE["DISH-AB105732-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105733-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105841-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105744-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105821-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105822-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105827-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105836-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105842-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105845-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105834-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105837-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105840-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105843-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105831-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB104968-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105746-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105757-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105825-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["DISH-AB105828-600"] = PRODUCT_INFO_BY_CODE["DISH-600-STD"];
PRODUCT_INFO_BY_CODE["REF-AB105828-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-AB105828-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"] = {
  ...PRODUCT_INFO_BY_CODE["REF-545-1800-700"],
  productInfoKeyFacts: [
    ...PRODUCT_INFO_BY_CODE["REF-545-1800-700"].productInfoKeyFacts,
    "Jahresverbrauch: 219 kWh/Jahr.",
    "Gerätemaße H x B x T (mm): 1800 x 545 x 590.",
  ],
  productInfoExtractedText: PRODUCT_INFO_BY_CODE["REF-545-1800-700"].productInfoExtractedText
    .replace("Produktname: AMICA KGC 15495 S Kühl-/Gefrierkombination, 180 cm.", "Produktname: AMICA KGC 15495 S Kühl-/Gefrierkombination, 180 cm.")
    .replace(
      "- Freistehendes Kühl-Gefriergeraet mit NoFrost und automatischer Abtauung.",
      "- Modell: KGC 15495 S.\n- Freistehendes Kühl-Gefriergeraet mit NoFrost und automatischer Abtauung.\n- Gerätemaße H x B x T (mm): 1800 x 545 x 590.",
    ),
};
PRODUCT_INFO_BY_CODE["REF-C-545-1800-700"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105806-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105807-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105815-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105819-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105733-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105841-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105744-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105821-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105845-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105831-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB104968-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105746-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105757-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105825-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105822-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["REF-AB105828-KGCN388140E"] = PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"];
PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"] = {
  ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"],
  productInfoKeyFacts: [
    ...PRODUCT_INFO_BY_CODE["HOOD-600-FLAT"].productInfoKeyFacts,
    "Jahresverbrauch: 24.8 kWh/Jahr.",
    "Gerätemaße H x B x T (mm): 173,0 x 599 x 303.",
  ],
};
PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"] = {
  productImagePath: PRODUCT_IMAGE_FILES.hoodChimney,
  productInfoPdfPath: PRODUCT_INFO_FILES.hoodChimney,
  productInfoSummary: "Kaminhaube KHF 664 611 S Stripe X für die Kochwand. Die Produktinformation nennt Energieklasse A++, 60 cm Breite und bis zu 67 dB.",
  productInfoKeyFacts: [
    "Energieklasse: A++",
    "Geräusch: max. 67 dB",
    "Breite: 60 cm",
    "Luftleistung: 317-595 m3/h",
    "Betriebsart: Abluft / Umluft",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA KHF 664 611 S Stripe X Kaminhaube, 60 cm.",
    "Wichtige Punkte:",
    "- Kaminhaube mit schwarzem Glasschirm und Edelstahlstreifen.",
    "- Energieklasse A++, Jahresverbrauch 22.7 kWh, Fluid-Dynamic-Effizienzklasse A.",
    "- 3 Leistungsstufen, Luftleistung 317-595 m3/h, Geräusch 49-67 dB.",
    "- SensorTouch, buerstenloser Motor, Nachlaufautomatik und 2 LED-Leuchten.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Wandposition, Kaminschacht und Luftführung prüfen.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["HOOD-LS-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105806-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105807-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105732-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105733-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105837-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105840-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105843-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105831-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB104968-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105746-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105757-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105825-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105822-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105828-FH664621E"] = PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"];
PRODUCT_INFO_BY_CODE["HOOD-AB105845-KHF664611S"] = PRODUCT_INFO_BY_CODE["HOOD-C-FH664621E"];
PRODUCT_INFO_BY_CODE["WM-C-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];
PRODUCT_INFO_BY_CODE["WM-AB105845-EWA34660W"] = PRODUCT_INFO_BY_CODE["WM-B-EWA34660W"];

const PRODUCT_INFO_BY_ARTICLE_NUMBER = {
  "OL-KGCN388140E": PRODUCT_INFO_BY_CODE["REF-B-545-1800-700"],
  "FH 664 621 S": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
  "FH664621E + HD6002": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
  "FH664621E + FWK124 + HD6002": PRODUCT_INFO_BY_CODE["HOOD-B-FH664621E"],
};

PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"] = {
  productImagePath: PRODUCT_IMAGE_FILES.oven,
  productInfoPdfPath: PRODUCT_INFO_FILES.oven,
  productInfoSummary: "Kombinierte Auswahl aus Einbaubackofen EBX 943 600 S und Induktionskochfeld OL-KMI 754 000 E. Die aktuellen Produktinformationen nennen 77 l Garraum, 9 Backofenfunktionen sowie 4 Kochzonen mit 9 Leistungsstufen.",
  productInfoKeyFacts: [
    "Backofen: Energieklasse A",
    "Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "Backofen: 77 l Volumen, 9 Funktionen",
    "Backofen: Gerätemaße H x B x T (mm): 595 x 595 x 575.",
    "Backofen: Einbaumaße H x B x T (mm): 595,0 x 560 x 560.",
    "Kochfeld: 60 cm, 4 Kochzonen",
    "Kochfeld: Gerätemaße B x T (mm): 590 x 520.",
    "Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "Kochfeld: 9 Leistungsstufen",
    "Set: Backofen + Induktionskochfeld",
  ],
  productInfoExtractedText: [
    "Produktname: AMICA EBX 943 600 S Backofen + AMICA OL-KMI 754 000 E Induktionskochfeld.",
    "Wichtige Punkte:",
    "- Backofen: Einbau-Elektrobackofen mit 77 l Volumen, Energieklasse A und 9 Funktionen.",
    "- Backofen: Energieverbrauch: 0.99 kWh conventional / 0.83 kWh hot air.",
    "- Backofen: Gerätemaße H x B x T (mm): 595 x 595 x 575.",
    "- Backofen: Einbaumaße H x B x T (mm): 595,0 x 560 x 560.",
    "- Backofen: SensorControl Timer, versenkbare Knebel, CoolDoor3, Steam Clean.",
    "- Kochfeld: autarkes Induktionskochfeld, 60 cm, 4 Kochzonen mit Booster.",
    "- Kochfeld: Gerätemaße B x T (mm): 590 x 520.",
    "- Kochfeld: Ausschnittmasse B x T (mm): 560 x 490.",
    "- Kochfeld: 9 Leistungsstufen, Timer, Restwärmeanzeige, Topferkennung, Kindersicherung.",
    "Auswahlhinweise:",
    "- Vor der Bestellung Nischenmaß, Anschlusswert und Elektroanschluss prüfen.",
  ].join("\n"),
};
PRODUCT_INFO_BY_CODE["OVEN-C-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105806-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
PRODUCT_INFO_BY_CODE["OVEN-AB105807-600-HOB"] = PRODUCT_INFO_BY_CODE["OVEN-B-600-HOB"];
const LED_LIGHTING_PRODUCT_INFO = {
  productInfoPdfPath: PRODUCT_INFO_FILES.ledLightingLabel,
  productInfoSummary: "Energielabel für das LED-Beleuchtungsset KA220043_S3. Das Label nennt Energieeffizienzklasse E und 3 kWh / 1000 h.",
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

// 108134 MODUL 1: single-wall plan (frontend/public/pdfs/108134 MODUL 1_10.03.2026_OH.pdf).
// Same component/article/price set as the legacy single-wall layout, so it reuses
// those item codes to inherit their localized names, product info, and galleries. Layout
// left→right: washing machine, sink base, dishwasher, oven, US60 drawer, fridge tall unit;
// five wall cabinets up top with the hood at wall-cabinet-4.
const MODUL1_108134_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-B-545-1800-700", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 180 cm, NoFrost", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "WM-B-EWA34660W", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: articlePrice("EWA34660W + TGV60 + WU16"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "base-module-1", sortOrder: 20, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-B-600-STD", name: "Fully integrated dishwasher incl. furniture front", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 40, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 50, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-B-STR", name: "Base cabinet with drawer 600/600 mm", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  defaultWorktop({ code: "TOP-B-3036", sortOrder: 75 }),
  defaultSinkWorktop({ sortOrder: 78 }),
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-L-600", name: "Wall Cabinet left (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-ML-600", name: "Wall Cabinet mid-left (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-MR-600", name: "Wall Cabinet mid-right (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-B-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-B-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-B-R-600", name: "Wall Cabinet right (600 x 723 x 320 mm)", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#ff7f9f", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-B-LED-001", name: "LED Lighting Set", price: articlePrice("KALB KA220043_S3"), iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 130, infoText: "LED lighting set", articleNumber: "KALB KA220043_S3" },
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105807_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-1", name: "Wall Cabinet 1", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105807-3", name: "Wall Cabinet 3", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105807-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105807-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-2", sortOrder: 10, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105807-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 20, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105807", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 25, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105807-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "REF-AB105807-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 45 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105806_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-L", name: "Base Cabinet left", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base storage cabinet, 400 mm", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-400-R", name: "Base Cabinet right", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base storage cabinet, 400 mm", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-L", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, 400 mm", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-400-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, 400 mm", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105819_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: null, depthMm: null, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105819-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105819-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105819-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105819-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105821_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-FILLER-500", legacyCode: "CAB-BASE-AB105821-FILLER-550", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "Base cabinet filler, hinge right", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1), articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105821-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105821-US30", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-FILLER-500", legacyCode: "CAB-WALL-AB105821-FILLER-550", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "Wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105824_ITEMS = AB_105821_ITEMS;

// AB 105833: two-part split run — fridge left, left run (filler, oven, US60), right run
// (filler, dishwasher, sink); wall fillers bracket hood + H6002 on each side.
const AB_105833_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: articlePrice("US50"), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105833-FILLER-500-R", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105833-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-FILLER-500-R", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105833-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105827: fridge-right run like AB 105821 with 500 mm filler cabinets ().
const AB_105827_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105827-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105827-US30", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105827-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105821-H3002", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 110, infoText: "H3002, hinge left", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105821-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 120, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105830_ITEMS = AB_105827_ITEMS;

// AB 105826: fridge-left 5-bay run — US60 R, oven, US60 L, dishwasher, sink (no end drawer).
const AB_105826_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105826-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105826-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105822: fridge-left compact run - 500 mm filler, oven, US60, dishwasher, sink (5 base bays).
const AB_105822_LEGACY_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-FILLER-500", name: "Base cabinet", price: articlePrice("US50"), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "base cabinet filler, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105822-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105822-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-FILLER-500", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105822-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105823_ITEMS = AB_105822_LEGACY_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: articlePriceWithBlende("H6002", "HPK2002", 1), blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) };
  }
  return item;
});

// AB 105829 and AB 105832 add a blende note on top of AB 105822's layout (last wall cabinet);
// AB 105822 doesn't have one, so this is a separate clone, not an alias.
const AB_105829_ITEMS = AB_105822_LEGACY_ITEMS.map((item) => {
  if (item.code === "CAB-WALL-AB105822-H6002-3") {
    return { ...item, price: articlePriceWithBlende("H6002", "HPK2002", 1), articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) };
  }
  return item;
});
const AB_105832_ITEMS = AB_105829_ITEMS;

// AB 105820 shares AB 105806's layout and appliances; identical items reuse the AB105806
// codes (per-kitchen unique, so a separate KitchenItem row is created) to inherit their
// names/product info/galleries. Only the four differently-sized cabinets get new codes.
const AB_105820_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US30-300", name: "Base Cabinet", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US30 base cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H3002-300", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right", articleNumber: "H3002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105820-H6002", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 104968: L-shaped isometric plan — US50 + oven + US40 on the main leg, US60 corner +
// dishwasher + locked sink on the return, tall fridge on the far right; H5002 + hood + H4002 +
// H6002 wall run above the main leg (Excel NR 1–12).
const AB_104968_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, code: "SINKBASE-AB104968-DEFAULT", widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US50-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US50 base storage cabinet, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US40-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US40", "UPK20", 2), widthMm: 400, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US40 base storage cabinet, hinge left", articleNumber: "US40", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB104968-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB104968-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#00ffbf", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB104968-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H5002-R", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H5002, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB104968-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB104968-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H4002-L", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H4002, hinge left", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB104968-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105746: straight elevation — fridge left, US60 + oven + dishwasher + locked sink on the base
// run; four H6002 wall cabinets with hood in position 2 (Excel NR 1–10).
const AB_105746_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105746-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet with UPK20 filler panel", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105746-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105746-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105746-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105746-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105746-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-L1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105746-H6002-L2", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// These kitchens use the identical AB 105746 element plan. Keep the source
// configuration in one place while giving every kitchen its own item codes.
function createAB105746Items(kitchenCode) {
  return AB_105746_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105746", `AB${kitchenCode}`),
  }));
}

const AB_105749_ITEMS = createAB105746Items("105749");
const AB_105752_ITEMS = createAB105746Items("105752");
const AB_105755_ITEMS = createAB105746Items("105755");

// AB 105757: straight elevation — US50 (UPK20) + oven + US60 + locked sink + dishwasher + US60;
// fridge right; wall run is H5002 (HPK2002) + hood + four H6002 cabinets. Excel NR 1–14.
const AB_105757_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-AB105757-DEFAULT", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: 878, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US50", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US50 base storage cabinet", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US60-1", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105757-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105757-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105757-KGCN388140E", name: "Freestanding refrigerator", nameDe: "Standkühlschrank", price: articlePrice("OL-KGCN388140E"), widthMm: 710, heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H5002", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H5002 wall cabinet", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105757-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105757-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105757-H6002-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002 wall cabinet", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105732_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet with UPK20 filler panel", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105732-US40-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US40 base storage cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105732-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H4002-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H4002, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105732-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105732-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 82, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105732-H6002-L-FILLER", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105733_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105733-US30-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right, with UPK20 filler panel", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105733-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105820-US60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105733-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H3002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H3002", "HPK2002", 1), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H3002, hinge right, with HPK2002 filler panel", articleNumber: "H3002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H6002-R1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105733-H6002-R2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105733-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 600, iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105733-FH664621E", name: "FH664621E Extractor Hood", price: bundlePrice("FH664621E + FWK124 + HD6002"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood + cabinet + filter, 60 cm", articleNumber: "FH664621E + FWK124 + HD6002", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 130 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105812 matches AB 105820's plan and Excel rows, so it reuses the same item codes.
const AB_105812_ITEMS = AB_105820_ITEMS;

// AB 105808 shares AB 105820's Excel rows (same appliances/cabinets, fridge-left layout).
const AB_105808_ITEMS = AB_105820_ITEMS;

// AB 105809: L-shaped isometric plan (callouts 1-12).
const AB_105809_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-500-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 2), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "US50", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  defaultSinkBase({ componentKey: "corner-base", sortOrder: 60, widthMm: 300, depthMm: 600, iconKey: "drawer_base_two" }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-US30-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-FILLER", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet filler", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105805: L-shaped isometric plan (same drawing family as 105809). Identical layout —
// 400R + 500L bases + oven on the main leg, dishwasher + sink base on the
// return, 4 wall cabinets + hood. Differs from 105809 at NR 8 (priced US30 sink base,
// hinge left, EUR 175), NR 9 (a real 400 mm Oberschrank, hinge right, instead of
// a wall filler), lower base/sink blenden, and the upper-right H6002 with right blende.
// Differing cabinets get new codes.
const AB_105805_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105809-400-R", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-500-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 2), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet, hinge left", articleNumber: "US50", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  defaultSinkBase({ componentKey: "corner-base", sortOrder: 60, widthMm: 300 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105805-US30-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "sink-base", sortOrder: 65, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-400-R", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105809-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105805-H6002-L", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105834: L-shaped isometric plan (fridge left) — 500R + oven + 500R bases on the main leg,
// corner + locked sink + dishwasher on the return; 500R wall filler, hood, H6002 L.
const AB_105813_ITEMS = AB_105805_ITEMS;
const AB_105817_ITEMS = AB_105805_ITEMS;

const AB_105834_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-500-R", name: "Base cabinet with drawer", price: articlePrice("US50"), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "Base cabinet, hinge right", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105834-400-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US40", "UPK20", 2), widthMm: 400, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "Base cabinet, hinge left", articleNumber: "US40", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105834-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-500-R", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "Wall cabinet, hinge right", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105834-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "corner-base", sortOrder: 120, isLocked: true, infoText: "Default sink base cabinet" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105837: L-shaped isometric plan, measured from frontend/public/pdfs/AB 105837.pdf.
// Excel rows 1-3 are the locked default oven/worktop/sink package. Rows 4-10 are selectable.
const AB_105837_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", widthMm: 600, heightMm: null, depthMm: 600, iconKey: "sink_base", colorKey: "springgreen", componentKey: "base-module-4", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105837-500-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US50", "UPK20", 2), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "Base cabinet, hinge right", articleNumber: "US50", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105837-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 70, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105837-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105837-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: 173, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-US60-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105837-US60-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const cloneAb105837Items = (targetCode) =>
  AB_105837_ITEMS.map((item) => ({
    ...item,
    code: item.code.replace("AB105837", `AB${targetCode}`),
  }));

const AB_105840_ITEMS = cloneAb105837Items("105840");
const AB_105843_ITEMS = cloneAb105837Items("105843");

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
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-US45", name: "Base cabinet with drawer", price: articlePrice("US45"), widthMm: 450, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 20, infoText: "US45 base storage cabinet, hinge right", articleNumber: "US45" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 30, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105810-FILLER-400", name: "Base cabinet", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 40, infoText: "Base cabinet filler, hinge left", articleNumber: "US40" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 50, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105806-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105806-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 75, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-H4502", name: "Wall Cabinet", price: articlePrice("H4502"), widthMm: 450, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H4502, hinge right, 2 adjustable shelves", articleNumber: "H4502" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105810-FILLER-400", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "Wall cabinet filler, hinge right", articleNumber: "H4002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105814 has the same item schedule and plan view as AB 105810; it keeps its own contract.
const AB_105814_ITEMS = AB_105810_ITEMS;
// AB 105818 mirrors AB 105810/105814 while keeping its own kitchen and contract.
const AB_105818_ITEMS = AB_105810_ITEMS;

// AB 105835: fridge-right 6×600 mm run — US60 R, US60 L, oven, dishwasher, sink, US60 L.
const AB_105835_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L1", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 50, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 60, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105835-US60-L2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 80, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-R3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105835-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105836: dual elevation plan — left run (fridge, US60×2, oven, hood wall) + right run
// (500 mm fillers, sink, dishwasher). Both segments share one vector plan page.
const AB_105836_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105836-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105836-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105836-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105842: same schedule as AB 105836 — dual elevation, slightly different plan proportions.
const AB_105842_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105806-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 40, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 50, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105842-FILLER-500", name: "Base cabinet", price: articlePriceWithBlende("US50", "UPK20", 1), widthMm: 500, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "base cabinet filler, hinge right", articleNumber: "US50", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105842-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePriceWithBlende("A-EGSPV597210 + TGV60", "UPK20", 1), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "drawer-module", sortOrder: 80, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-R", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 90, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_hood", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 110, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-FILLER-500", name: "Wall Cabinet", price: articlePriceWithBlende("H5002", "HPK2002", 1), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 120, infoText: "wall cabinet filler, hinge right", articleNumber: "H5002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105842-H6002-L3", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 140, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  defaultSinkWorktop({ sortOrder: 150 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105839_ITEMS = AB_105842_ITEMS;

// AB 105845: two PDF modules combined into one plan. Module 2 contains the sink/washer/
// dishwasher run; module 2-1 contains the fridge and cooking run with a chimney hood.
const AB_105845_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "REF-AB105845-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 10, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "WM-AB105845-EWA34660W", name: "Washing machine + front + side panel", nameDe: "Waschmaschine + Front + Wange", price: articlePrice("EWA34660W + TGV60 + WU16"), widthMm: 600, iconKey: "washing_machine_base", colorKey: "springgreen", componentKey: "wm-base", sortOrder: 20, infoText: "EWA34660W, 8 kg, 1400 rpm", articleNumber: "EWA34660W + TGV60 + WU16" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105845-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 30, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105845-US2A60", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_three", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 40, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-AB105845-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "cook-base-left", sortOrder: 50, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 60, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-COOK-AB105845-US60-R", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "cook-base-right", sortOrder: 70, infoText: "US60 base storage cabinet", articleNumber: "US60" },
  defaultSinkBase({ sortOrder: 80 }),
  defaultSinkWorktop({ sortOrder: 90 }),
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 100, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-1", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 130, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105845-US60-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 140, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "LIGHT-AB105845-LED", name: "LED Lighting Set", price: articlePrice("KALB KA220043_S3"), iconKey: "under_cabinet_light", colorKey: "#666666", componentKey: "under-cabinet-light", sortOrder: 150, infoText: "LED lighting set", articleNumber: "KALB KA220043_S3" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105845-KHF664611S", name: "Angled extractor hood + Filter", nameDe: "Schrägesse + Filter", price: bundlePrice("KHF664611S + FWP18"), widthMm: 600, iconKey: "extractor_hood_chimney", colorKey: "#8a6b34", componentKey: "extractor-hood", sortOrder: 160, infoText: "Chimney hood, 60 cm", articleNumber: "KHF664611S + FWP18" },
  ...defaultAccessories(),
  ...defaultServices(),
];

// AB 105841 shares AB 105806's single-wall layout (fridge on the RIGHT). Items whose callout
// number matches AB 105806's scheme reuse its codes (oven 1, worktop 2, sink base 3, hood 10,
// wall cabinets 12/13/14, sink+waste); the rest get AB105841 codes so their plan numbers (4-9, 11)
// stay correct (callout numbers are keyed by code in kitchen-selection-utils.js).
const AB_105841_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-1", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 20, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 40, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105841-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105841-US60-3", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 65, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105841-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105841-H6002-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-1", name: "Wall Cabinet 1", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-2", name: "Wall Cabinet 2", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105806-3", name: "Wall Cabinet 3", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105838_ITEMS = AB_105841_ITEMS;
const AB_105844_ITEMS = AB_105841_ITEMS;

// AB 105744: single-wall run with the fridge tall unit on the RIGHT (same drawing family as
// AB 105841). Base run (L->R): US60, oven (default), US60, sink (default), dishwasher, US40, then
// the fridge. Wall run (L->R): H6002, hood, H6002, H6002, H6002, H4002. DEFAULT rows (oven,
// worktop, sink) reuse the shared default codes; the hood package reuses AB105806's codes so it
// inherits its gallery/product info (its "10" callout also matches). Every other cabinet and
// appliance gets an AB105744 code so its plan number (4-9, 11-14) is correct.
const AB_105744_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US60-1", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 10, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  defaultOvenHob({ sortOrder: 20 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US60-2", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 30, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  defaultSinkBase({ sortOrder: 40, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "DISH-AB105744-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105744-US40", name: "Base cabinet with drawer", price: articlePrice("US40"), widthMm: 400, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 60, infoText: "US40 base storage cabinet, hinge left", articleNumber: "US40" },
  defaultWorktop({ sortOrder: 65 }),
  { itemType: ItemType.COMPONENT, code: "REF-AB105744-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 70, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 90, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 92, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 100, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-4", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 110, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H6002-5", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-5", sortOrder: 120, infoText: "H6002, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105744-H4002", name: "Wall Cabinet", price: articlePrice("H4002"), widthMm: 400, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-6", sortOrder: 130, infoText: "H4002, 40 cm", articleNumber: "H4002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105831_ITEMS = [

  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US30", "UPK20", 1), widthMm: 300, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105831-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US60-L", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 2), widthMm: 600, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-500-L", name: "Base cabinet with drawer", price: articlePrice("US50"), widthMm: 500, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-module", sortOrder: 70, infoText: "Base cabinet, hinge left", articleNumber: "US50" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105831-US30-L", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, heightMm: null, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-4", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105831-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105831-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105831-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-500-L", name: "Wall Cabinet", price: articlePrice("H5002"), widthMm: 500, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "Wall cabinet, hinge left", articleNumber: "H5002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105831-H3002-L", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left", articleNumber: "H3002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105825_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", widthMm: 600, heightMm: null, depthMm: null, iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-base", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  defaultSinkBase({ sortOrder: 30, widthMm: 600 }),
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-R", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US30 base storage cabinet, hinge right", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105825-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), widthMm: 600, heightMm: null, depthMm: null, iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "dishwasher-base", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-R", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 2), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "base-module-2", sortOrder: 60, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20 x2", blendeLabel: "UPK20 20 cm x 2", blendePrice: blendePrice("UPK20", 2) },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US60-L", name: "Base cabinet with drawer", price: articlePrice("US60"), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-3", sortOrder: 70, infoText: "US60 base storage cabinet, hinge left", articleNumber: "US60" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105825-US30-L", name: "Base cabinet with drawer", price: articlePrice("US30"), widthMm: 300, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#ffbf00", componentKey: "drawer-base", sortOrder: 80, infoText: "US30 base storage cabinet, hinge left", articleNumber: "US30" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105825-KGCN388140E", name: "Freestanding refrigerator 178 cm", nameDe: "Standkühlschrank 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 90, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-R", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 100, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105825-600", name: "Flat Screen Extractor Hood + Cabinet + Filter", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "hood_wall_cabinet", colorKey: "#394c00", componentKey: "wall-cabinet-2", sortOrder: 110, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105825-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 112, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H6002-L", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 120, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105825-H3002-L", name: "Wall Cabinet", price: articlePrice("H3002"), widthMm: 300, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-4", sortOrder: 130, infoText: "H3002, hinge left, 2 adjustable shelves", articleNumber: "H3002" },
  defaultSinkWorktop({ sortOrder: 140 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const cloneAB105825ItemsForKitchen = (kitchenNumber) =>
  AB_105825_ITEMS.map((item) => ({
    ...item,
    code: item.code.replaceAll("AB105825", `AB${kitchenNumber}`),
  }));

const AB_105822_ITEMS = cloneAB105825ItemsForKitchen("105822");
const AB_105828_ITEMS = cloneAB105825ItemsForKitchen("105828");

const AB_105811_ITEMS = [
  { itemType: ItemType.COMPONENT, code: "OVEN-B-600-HOB", name: "Built-in oven and induction hob", nameDe: "Einbaubackofen und Kochfeld", articleNumber: "EBX943600S + OL-KMI754000E", iconKey: "oven_base", colorKey: "springgreen", componentKey: "oven-module", sortOrder: 10, infoText: "Built-in oven + induction hob", isLocked: true },
  { itemType: ItemType.COMPONENT, code: "TOP-AB105806", name: "Worktop", price: "0.00", iconKey: "worktop", colorKey: "springgreen", componentKey: "worktop", sortOrder: 20, isLocked: true, infoText: "Worktop included with the default kitchen configuration" },
  { itemType: ItemType.COMPONENT, code: "SINKBASE-B-600", name: "Sink Lower Cabinet", nameDe: "Spülenunterschrank", price: "0.00", iconKey: "sink_base", colorKey: "springgreen", componentKey: "sink-base", sortOrder: 30, isLocked: true, infoText: "Default sink base cabinet" },
  { itemType: ItemType.COMPONENT, code: "CAB-BASE-AB105811-US60", name: "Base cabinet with drawer", price: articlePriceWithBlende("US60", "UPK20", 1), widthMm: 600, depthMm: 600, iconKey: "drawer_base_two", colorKey: "#f0a500", componentKey: "base-module-1", sortOrder: 40, infoText: "US60 base storage cabinet, hinge right", articleNumber: "US60", blendeCode: "UPK20", blendeLabel: "UPK20 20 cm", blendePrice: blendePrice("UPK20", 1) },
  { itemType: ItemType.COMPONENT, code: "DISH-AB105811-600", name: "Fully integrated dishwasher", nameDe: "Vollintegrierter Geschirrspüler", price: articlePrice("A-EGSPV597210 + TGV60"), iconKey: "dishwasher_base", colorKey: "#001f7f", componentKey: "base-module-3", sortOrder: 50, infoText: "Fully integrated dishwasher, 60 cm", articleNumber: "A-EGSPV597210 + TGV60" },
  { itemType: ItemType.COMPONENT, code: "REF-AB105811-KGCN388140E", name: "Freestanding refrigerator 178 cm", price: articlePrice("OL-KGCN388140E"), heightMm: 1780, iconKey: "tall_refrigerator", colorKey: "black", componentKey: "refrigerator", sortOrder: 60, infoText: "Fridge-freezer, 178 cm", articleNumber: "OL-KGCN388140E" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-1", name: "Wall Cabinet", price: articlePriceWithBlende("H6002", "HPK2002", 1), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-1", sortOrder: 70, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002", blendeCode: "HPK2002", blendeLabel: "HPK2002 20 cm", blendePrice: blendePrice("HPK2002", 1) },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-2", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-2", sortOrder: 80, infoText: "H6002, hinge right, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-WALL-AB105811-3", name: "Wall Cabinet", price: articlePrice("H6002"), widthMm: 600, heightMm: 720, depthMm: 340, iconKey: "wall_cabinet_plain", colorKey: "#00ffbf", componentKey: "wall-cabinet-3", sortOrder: 90, infoText: "H6002, hinge left, 2 adjustable shelves", articleNumber: "H6002" },
  { itemType: ItemType.COMPONENT, code: "CAB-HOOD-AB105806-600", name: "Upper Cabinet with Extractor Hood 60 cm", price: bundlePrice("FH664621E + FWK124 + HD6002"), iconKey: "wall_cabinet_plain", colorKey: "#394c00", componentKey: "wall-cabinet-4", sortOrder: 100, infoText: "HD6002, light hood setup", articleNumber: "FH664621E + FWK124 + HD6002" },
  { itemType: ItemType.COMPONENT, code: "HOOD-AB105806-FH664621E", name: "FH664621E Extractor Hood", price: articlePrice("FH 664 621 S"), widthMm: 599, heightMm: null, depthMm: 303, iconKey: "extractor_hood", colorKey: "#394c00", componentKey: "extractor-hood", sortOrder: 102, infoText: "Flat pull-out hood, 60 cm", articleNumber: "FH 664 621 S", isActive: false },
  defaultSinkWorktop({ sortOrder: 110 }),
  ...defaultAccessories(),
  ...defaultServices(),
];

const AB_105815_ITEMS = AB_105811_ITEMS.map((item) => ({
  ...item,
  code: item.code.replace("AB105811", "AB105815"),
}));

const DEFAULT_KITCHENS = [
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
    slug: "ab-105837",
    kitchenCode: "105 837",
    name: "AB 105837 Kitchen",
    description: "L-shaped kitchen based on pdfs/AB 105837.pdf",
    items: AB_105837_ITEMS,
  },
  {
    slug: "ab-105840",
    kitchenCode: "105 840",
    name: "AB 105840 Kitchen",
    description: "Kitchen configuration using the AB 105837 layout",
    items: AB_105840_ITEMS,
  },
  {
    slug: "ab-105843",
    kitchenCode: "105 843",
    name: "AB 105843 Kitchen",
    description: "Kitchen configuration using the AB 105837 layout",
    items: AB_105843_ITEMS,
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
    description: "Kitchen configuration using the AB 105825 layout and element selection",
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
    slug: "ab-105757",
    kitchenCode: "105 757",
    name: "AB 105757 Kitchen",
    description: "Straight kitchen configuration based on frontend/public/jpg/AB 105757_page-0001.jpg",
    items: AB_105757_ITEMS,
    reconcileExisting: true,
  },
  {
    slug: "ab-105746",
    kitchenCode: "105 746",
    name: "AB 105746 Kitchen",
    description: "Straight kitchen configuration based on frontend/public/jpg/AB 105746_page-0001.jpg",
    items: AB_105746_ITEMS,
  },
  {
    slug: "ab-105749",
    kitchenCode: "105 749",
    name: "AB 105749 Kitchen",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105749_ITEMS,
  },
  {
    slug: "ab-105752",
    kitchenCode: "105 752",
    name: "AB 105752 Kitchen",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105752_ITEMS,
  },
  {
    slug: "ab-105755",
    kitchenCode: "105 755",
    name: "AB 105755 Kitchen",
    description: "Kitchen configuration using the AB 105746 layout and element selection",
    items: AB_105755_ITEMS,
  },
  {
    slug: "ab-104968",
    kitchenCode: "104 968",
    name: "AB 104968 Kitchen",
    description: "L-shaped kitchen configuration based on frontend/public/jpg/AB 104968_page-0001.jpg",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105734",
    kitchenCode: "105 734",
    name: "AB 105734 Kitchen",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105737",
    kitchenCode: "105 737",
    name: "AB 105737 Kitchen",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105740",
    kitchenCode: "105 740",
    name: "AB 105740 Kitchen",
    description: "Kitchen configuration using the AB 104968 layout and element selection",
    items: AB_104968_ITEMS,
  },
  {
    slug: "ab-105732",
    kitchenCode: "105 732",
    name: "AB 105732 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105732.svg",
    items: AB_105732_ITEMS,
  },
  {
    slug: "ab-105735",
    kitchenCode: "105 735",
    name: "AB 105735 Kitchen",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105732_ITEMS,
  },
  {
    slug: "ab-105738",
    kitchenCode: "105 738",
    name: "AB 105738 Kitchen",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105732_ITEMS,
  },
  {
    slug: "ab-105741",
    kitchenCode: "105 741",
    name: "AB 105741 Kitchen",
    description: "Kitchen configuration using the AB 105732 layout and element selection",
    items: AB_105732_ITEMS,
  },
  {
    slug: "ab-105733",
    kitchenCode: "105 733",
    name: "AB 105733 Kitchen",
    description: "Kitchen configuration based on frontend/public/plans/AB 105733.svg",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105736",
    kitchenCode: "105 736",
    name: "AB 105736 Kitchen",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105739",
    kitchenCode: "105 739",
    name: "AB 105739 Kitchen",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
  },
  {
    slug: "ab-105742",
    kitchenCode: "105 742",
    name: "AB 105742 Kitchen",
    description: "Kitchen configuration using the AB 105733 layout and element selection",
    items: AB_105733_ITEMS,
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
    description: "Kitchen configuration using the AB 105825 layout and element selection",
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
  {
    slug: "ab-105744",
    kitchenCode: "105 744",
    name: "AB 105744 Kitchen",
    description: "Kitchen configuration based on frontend/public/jpg/AB 105744_page-0001.jpg",
    items: AB_105744_ITEMS,
  },
];

const DEFAULT_KITCHEN_CONTRACTS = [
  { contractNumber: "670108134", kitchenSlug: "108134-modul-1" },
  ...DEFAULT_KITCHENS
    .filter((kitchen) => kitchen.slug.startsWith("ab-"))
    .flatMap((kitchen) => [
      {
        contractNumber: buildKitchenContractNumber(kitchen, "670"),
        kitchenSlug: kitchen.slug,
      },
      {
        contractNumber: buildKitchenContractNumber(kitchen, "111"),
        kitchenSlug: kitchen.slug,
      },
    ]),
];

const OBSOLETE_KITCHENS = [
  { slug: "kitchen-model-c", contractNumbers: ["736269"] },
  { slug: "kitchen-model-b", contractNumbers: ["736268"] },
  { slug: "l-shaped-kitchen", contractNumbers: ["736270"] },
  { slug: "l-kitchen-new", contractNumbers: ["736271"] },
];

function buildKitchenContractNumber(kitchen, prefix) {
  const code = String(kitchen.kitchenCode || kitchen.slug).replace(/\D/g, "");

  if (!code) {
    throw new Error(`Cannot build kitchen contract number without a code: ${kitchen.slug}`);
  }

  return `${prefix}${code}`;
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
    infoText: DEFAULT_SINK_BASE_CATALOG_INFO_TEXT,
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
    infoText: DEFAULT_WORKTOP_CATALOG_INFO_TEXT,
  };
}

function isDishwasherItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const name = String(item?.name || "").trim().toLowerCase();
  return code.startsWith("DISH-") || iconKey === "dishwasher_base" || name.includes("dishwasher");
}

function applyDishwasherCatalogFields(item) {
  return {
    ...item,
    widthMm: null,
    heightMm: null,
    depthMm: null,
  };
}

function applyDefaultCatalogItem(item) {
  if (isDefaultOvenHobItem(item)) {
    return applyCentralizedArticlePricing({
      ...item,
      code: DEFAULT_OVEN_HOB_CATALOG_CODE,
      name: DEFAULT_OVEN_HOB_CATALOG_NAME_EN,
      nameDe: DEFAULT_OVEN_HOB_CATALOG_NAME_DE,
      articleNumber: null,
      price: DEFAULT_OVEN_HOB_CATALOG_PRICE,
      blendeCode: null,
      blendeLabel: null,
      blendePrice: null,
    });
  }

  if (isDefaultSinkBaseItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultSinkBaseCatalogFields(item));
  }

  if (isDefaultSinkWorktopItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultWorktopCatalogFields({
      ...item,
      code: DEFAULT_SINK_WORKTOP_CATALOG_CODE,
    }));
  }

  if (isDefaultWorktopItem(item)) {
    return applyCentralizedArticlePricing(applyDefaultWorktopCatalogFields(item));
  }

  if (isDishwasherItem(item)) {
    return applyCentralizedArticlePricing(applyDishwasherCatalogFields(item));
  }

  return applyCentralizedArticlePricing(item);
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
    return kind === "lower" ? `Unterschrank mit Schublade ${widthLabel} cm` : `Oberschrank ${widthLabel} cm`;
  }
  return kind === "lower"
    ? `Lower Cabinet with Drawer ${widthLabel} cm`
    : `Upper Cabinet ${widthLabel} cm`;
}

function formatBlendeLabel(label) {
  let normalized = String(label || "").trim().replace(/\s+/g, " ").replace(/^blende\s+/i, "");
  if (!normalized) return null;

  normalized = normalized.replace(/(\d)\s*cm\b/gi, "$1 cm");

  const doublePrefix = normalized.match(/^2\s*x,?\s*(UPK20|HPK2002)\s+(.+)$/i);
  if (doublePrefix) {
    normalized = `${doublePrefix[1]} ${doublePrefix[2]} x 2`;
  }

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

function compactSeedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

async function seedCatalogMasterData() {
  const result = {
    articlesCreated: 0,
    articlesExisting: 0,
    blendenCreated: 0,
    blendenExisting: 0,
    servicesCreated: 0,
    servicesExisting: 0,
  };

  for (const article of CATALOG_ARTICLES) {
    const data = compactSeedRecord({
      articleNumber: article.articleNumber,
      name: article.name,
      nameDe: article.nameDe ?? null,
      description: article.description ?? null,
      widthMm: article.widthMm ?? null,
      heightMm: article.heightMm ?? null,
      depthMm: article.depthMm ?? null,
      price: article.price,
      itemType: article.itemType,
      isFixedPricePackage: Boolean(article.isFixedPricePackage),
      isActive: article.isActive !== false,
    });

    const existingArticle = await prisma.catalogArticle.findUnique({
      where: { articleNumber: article.articleNumber },
      select: { id: true },
    });
    if (existingArticle) {
      result.articlesExisting += 1;
      continue;
    }

    await prisma.catalogArticle.create({ data });
    result.articlesCreated += 1;
  }

  for (const blende of CATALOG_BLENDEN) {
    const data = compactSeedRecord({
      code: blende.code,
      name: blende.name,
      nameDe: blende.nameDe ?? null,
      description: blende.description ?? null,
      price: blende.price,
      isActive: blende.isActive !== false,
    });

    const existingBlende = await prisma.catalogBlende.findUnique({
      where: { code: blende.code },
      select: { id: true },
    });
    if (existingBlende) {
      result.blendenExisting += 1;
      continue;
    }

    await prisma.catalogBlende.create({ data });
    result.blendenCreated += 1;
  }

  for (const service of CATALOG_SERVICES) {
    const data = compactSeedRecord({
      code: service.code,
      name: service.name,
      nameDe: service.nameDe ?? null,
      description: service.description ?? null,
      price: service.price,
      isActive: service.isActive !== false,
    });

    const existingService = await prisma.catalogService.findUnique({
      where: { code: service.code },
      select: { id: true },
    });
    if (existingService) {
      result.servicesExisting += 1;
      continue;
    }

    await prisma.catalogService.create({ data });
    result.servicesCreated += 1;
  }

  console.log(
    `Catalog seed created ${result.articlesCreated}/${CATALOG_ARTICLES.length} articles, ${result.blendenCreated}/${CATALOG_BLENDEN.length} blenden, and ${result.servicesCreated}/${CATALOG_SERVICES.length} services; existing rows were left unchanged.`,
  );
}

// A kitchen item stores its own W/H/D snapshot. To keep those in sync with the catalog that
// actually lives in the target database, we prefer the catalog article's dimension whenever it
// specifies a positive value, and fall back to the item's seeded value otherwise (e.g. appliance
// packages whose catalog rows carry no dimensions).
function pickCatalogDimension(catalogValue, itemValue) {
  const catalogNumber = Number(catalogValue);
  if (Number.isFinite(catalogNumber) && catalogNumber > 0) {
    return catalogNumber;
  }
  return itemValue ?? null;
}

async function loadCatalogArticleDimensions() {
  const byArticleNumber = new Map();
  const articles = await prisma.catalogArticle.findMany({
    select: { articleNumber: true, widthMm: true, heightMm: true, depthMm: true },
  });
  for (const article of articles) {
    const key = String(article.articleNumber || "").trim();
    if (key) {
      byArticleNumber.set(key, article);
    }
  }
  return byArticleNumber;
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

  await seedCatalogMasterData();
  await prisma.catalogArticle.updateMany({
    where: { articleNumber: "OL-KGCN388140E" },
    data: {
      name: REFRIGERATOR_CATALOG_NAME_EN,
      nameDe: REFRIGERATOR_CATALOG_NAME_DE,
      heightMm: 1780,
    },
  });
  await prisma.catalogArticle.updateMany({
    where: { articleNumber: { in: ["US50", "US60"] } },
    data: {
      heightMm: null,
      depthMm: 600,
    },
  });

  const housingCompanyCleanup = await pruneNonDefaultHousingCompanies();
  if (housingCompanyCleanup.deletedHousingCompanies || housingCompanyCleanup.unlinkedContracts) {
    console.log(
      `Removed ${housingCompanyCleanup.deletedHousingCompanies} non-ARGE housing companies and unlinked ${housingCompanyCleanup.unlinkedContracts} contracts.`,
    );
  }

  const defaultProjectId = await ensureDefaultPropertyProject();

  // Read the catalog dimensions that exist in *this* database so newly seeded kitchen items
  // inherit them (option 2: kitchen item W/H/D follows the catalog article by articleNumber).
  const catalogArticleDimsByNumber = await loadCatalogArticleDimensions();

  for (const kitchen of DEFAULT_KITCHENS) {
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { slug: kitchen.slug },
      select: { id: true },
    });

    const reconcileExisting = Boolean(existingKitchen && kitchen.reconcileExisting);
    if (existingKitchen && !reconcileExisting) {
      continue;
    }

    const kitchenData = {
      kitchenCode: kitchen.kitchenCode || null,
      programmId: DEFAULT_KITCHEN_PROGRAMM_ID,
      name: kitchen.name,
      status: KitchenStatus.ACTIVE,
      description: kitchen.description,
    };
    const kitchenRecord = existingKitchen
      ? await prisma.kitchen.update({
        where: { id: existingKitchen.id },
        data: kitchenData,
      })
      : await prisma.kitchen.create({
        data: {
          slug: kitchen.slug,
          ...kitchenData,
        },
      });
    const seededItemCodes = [];

    for (const rawItem of kitchen.items) {
      const item = applyDefaultCatalogItem(rawItem);
      seededItemCodes.push(item.code);
      const productInfo =
        PRODUCT_INFO_BY_CODE[item.code] ||
        PRODUCT_INFO_BY_CODE[rawItem.code] ||
        PRODUCT_INFO_BY_ARTICLE_NUMBER[String(item.articleNumber || "").trim()] ||
        {};
      // Resolve the item's stored dimensions against the catalog that exists in this database, so
      // the width-based display name (e.g. "Upper Cabinet 60 cm") stays consistent with the dims.
      const catalogDims = item.articleNumber
        ? catalogArticleDimsByNumber.get(String(item.articleNumber).trim())
        : null;
      const resolvedWidthMm = pickCatalogDimension(catalogDims?.widthMm, item.widthMm);
      const resolvedHeightMm = pickCatalogDimension(catalogDims?.heightMm, item.heightMm);
      const resolvedDepthMm = pickCatalogDimension(catalogDims?.depthMm, item.depthMm);
      const itemForName = { ...item, widthMm: resolvedWidthMm };
      const cabinetWidthName = getCabinetWidthDisplayName(itemForName);
      const cabinetWidthNameDe = getCabinetWidthDisplayName(itemForName, "de");
      const itemCode = String(item.code || "").trim().toUpperCase();
      const isDishwasherItem = itemCode.startsWith("DISH-")
        || item.iconKey === "dishwasher_base";
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
            : isDishwasherItem
              ? DISHWASHER_CATALOG_NAME_EN
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
            : isDishwasherItem
              ? DISHWASHER_CATALOG_NAME_DE
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
        widthMm: resolvedWidthMm,
        heightMm: resolvedHeightMm,
        depthMm: resolvedDepthMm,
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

      if (reconcileExisting) {
        await prisma.kitchenItem.upsert({
          where: {
            kitchenId_code: {
              kitchenId: kitchenRecord.id,
              code: item.code,
            },
          },
          update: data,
          create: {
            kitchenId: kitchenRecord.id,
            ...data,
          },
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

    if (reconcileExisting) {
      await prisma.kitchenItem.updateMany({
        where: {
          kitchenId: kitchenRecord.id,
          code: { notIn: seededItemCodes },
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    const claimSourceItems = kitchen.items.map(applyDefaultCatalogItem);
    const sinkCabinet = claimSourceItems.find((item) => (
      item?.isActive !== false
      && (
        String(item?.code || "").toUpperCase().startsWith("SINKBASE-")
        || String(item?.componentKey || "").toLowerCase() === "sink-base"
      )
    ));
    const sinkFixture = claimSourceItems.find((item) => (
      item?.isActive !== false
      && String(item?.componentKey || "").toLowerCase() === "sink-faucet"
    ));
    for (const part of [
      { partKey: "sink", articleCode: "526335", name: "Built-in Sink BLANCO TIPO 45 S", nameDe: "Einbau-Spüle BLANCO TIPO 45 S", source: sinkFixture, sortOrder: 10 },
      { partKey: "sink-cabinet", articleCode: "SP60", name: "Sink Lower Cabinet", nameDe: "Spülen-Unterschrank", source: sinkCabinet, sortOrder: 20 },
      { partKey: "faucet", articleCode: "517720", name: "Kitchen Faucet BLANCO DARAS HD", nameDe: "Küchenarmatur BLANCO DARAS HD", source: sinkFixture, sortOrder: 30 },
    ]) {
      if (!part.source) continue;
      const { source, ...claimPart } = part;
      await prisma.kitchenClaimPart.upsert({
        where: {
          kitchenId_partKey: {
            kitchenId: kitchenRecord.id,
            partKey: claimPart.partKey,
          },
        },
        update: {
          ...claimPart,
          sourceKitchenItemCode: source.code,
          sourceComponentKey: source.componentKey,
          isActive: true,
        },
        create: {
          kitchenId: kitchenRecord.id,
          ...claimPart,
          sourceKitchenItemCode: source.code,
          sourceComponentKey: source.componentKey,
          isActive: true,
        },
      });
    }

    const ovenBundle = claimSourceItems
      .find((item) => (
        item?.isActive !== false
        && ["oven-module", "oven-base"].includes(String(item?.componentKey || "").toLowerCase())
        && String(item?.code || "").toUpperCase().startsWith("OVEN-")
      ));
    if (ovenBundle) {
      for (const part of [
        { partKey: "oven", articleCode: "EH92364E-A", name: "Built-in Oven", nameDe: "Einbauherd", sortOrder: 40 },
        { partKey: "oven-drawer", articleCode: "UHK", name: "Lower Cabinet for Built-in Oven", nameDe: "Unterschrank für Einbauherde", sortOrder: 45 },
        { partKey: "cooktop", articleCode: "9EC744100C", name: "Ceramic Cooktop 60cm", nameDe: "Glaskeramikkochfeld 60 cm", sortOrder: 50 },
      ]) {
        await prisma.kitchenClaimPart.upsert({
          where: {
            kitchenId_partKey: {
              kitchenId: kitchenRecord.id,
              partKey: part.partKey,
            },
          },
          update: {
            ...part,
            sourceKitchenItemCode: ovenBundle.code,
            sourceComponentKey: ovenBundle.componentKey,
            isActive: true,
          },
          create: {
            kitchenId: kitchenRecord.id,
            ...part,
            sourceKitchenItemCode: ovenBundle.code,
            sourceComponentKey: ovenBundle.componentKey,
            isActive: true,
          },
        });
      }
    }

    const normalizedKitchenSlug = String(kitchen.slug || "").trim().toLowerCase();
    const worktop = claimSourceItems
      .find((item) => (
        item?.isActive !== false
        && String(item?.componentKey || "").toLowerCase() === "worktop"
      ));
    if (worktop && L_SHAPED_CLAIM_KITCHEN_SLUGS.has(normalizedKitchenSlug)) {
      for (const part of [
        { partKey: "worktop-left", articleCode: "PLR60-1", name: "Left Worktop", nameDe: "Arbeitsplatte links", sortOrder: 60 },
        { partKey: "worktop-right", articleCode: "PLR60-2", name: "Right Worktop", nameDe: "Arbeitsplatte rechts", sortOrder: 70 },
      ]) {
        await prisma.kitchenClaimPart.upsert({
          where: {
            kitchenId_partKey: {
              kitchenId: kitchenRecord.id,
              partKey: part.partKey,
            },
          },
          update: {
            ...part,
            sourceKitchenItemCode: worktop.code,
            sourceComponentKey: worktop.componentKey,
            isActive: true,
          },
          create: {
            kitchenId: kitchenRecord.id,
            ...part,
            sourceKitchenItemCode: worktop.code,
            sourceComponentKey: worktop.componentKey,
            isActive: true,
          },
        });
      }
    }

    await prisma.kitchenClaimPart.upsert({
      where: {
        kitchenId_partKey: {
          kitchenId: kitchenRecord.id,
          partKey: "cabinet-side-panel",
        },
      },
      update: {
        articleCode: "WU16",
        name: "Cabinet side panel",
        nameDe: "Unterschrank-Wange",
        isActive: false,
        sortOrder: 80,
      },
      create: {
        kitchenId: kitchenRecord.id,
        partKey: "cabinet-side-panel",
        articleCode: "WU16",
        name: "Cabinet side panel",
        nameDe: "Unterschrank-Wange",
        isActive: false,
        sortOrder: 80,
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
