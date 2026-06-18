import { ItemType, Prisma } from "@prisma/client";
import { validateKitchenInput } from "./admin-forms";
import { extractCalloutsFromPdf, generateHotspotsForItems } from "./kitchen-hotspots";
import { derivePlanBaseName, processKitchenPlanFiles } from "./kitchen-import-plan";
import { parseSupplierKitchenSheet } from "./kitchen-import-sheet";
import { prisma } from "./prisma";
import {
  planSupplierImportMappings,
} from "./kitchen-import-rules.js";
import { classifySupplierRow } from "./kitchen-supplier-row.js";
import { finalizeImportedKitchenHotspots } from "./kitchen-hotspot-verify.js";
import { sortComponentsForCatalog } from "../components/kitchen-selection-utils.js";
import fs from "fs";
import path from "path";

const PHOTO_NUMBER_BY_CODE = {
  "OVEN-AB105806-600-HOB": "1",
  "TOP-AB105806": "2",
  "SINKBASE-AB105806-600": "3",
  "REF-AB105806-KGCN388140E": "4",
  "CAB-BASE-AB105806-400-L": "5",
  "CAB-BASE-AB105806-400-R": "6",
  "DISH-AB105806-600": "7",
  "CAB-BASE-AB105806-US60": "8",
  "CAB-WALL-AB105806-400-L": "9",
  "CAB-HOOD-AB105806-600": "10",
  "CAB-WALL-AB105806-400-R": "11",
  "CAB-WALL-AB105806-1": "12",
  "CAB-WALL-AB105806-2": "13",
  "CAB-WALL-AB105806-3": "14",
  "CAB-BASE-AB105820-US30-300": "5",
  "CAB-BASE-AB105820-US60": "6",
  "CAB-WALL-AB105820-H3002-300": "9",
  "CAB-WALL-AB105820-H6002": "11",
  "CAB-BASE-AB105819-US60-R": "4",
  "DISH-AB105819-600": "5",
  "REF-AB105819-KGCN388140E": "6",
  "CAB-WALL-AB105819-H6002-R": "7",
  "CAB-WALL-AB105819-H6002-L1": "8",
  "CAB-WALL-AB105819-H6002-L2": "9",
};

const DEFAULT_LOCKED_PRICES = {
  "oven-module": "449.00",
  worktop: "0.00",
  "sink-base": "0.00",
  "sink-faucet": "89.00",
};

const STANDARD_ACCESSORY_ITEMS = [
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-WASTE-001",
    articleNumber: "Blanco Botton 517467",
    name: "Waste separation system",
    nameDe: "Muelltrennsystem",
    price: "89.00",
    iconKey: "waste_system",
    sortOrder: 200,
    infoText: "Blanco Botton 517467",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-CUTLERY-ZB60SG",
    articleNumber: "ZB60SG",
    name: "Cutlery insert 60 cm",
    nameDe: "Besteckeinsatz 60 cm",
    price: "25.00",
    iconKey: "cutlery_insert",
    sortOrder: 210,
    infoText: "Cutlery insert 60 cm",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-LIGHT-003",
    articleNumber: "KA220043_S3",
    name: "Beleuchtungsset 3 LED-Spots",
    nameDe: "Beleuchtungsset 3 LED-Spots",
    price: "69.00",
    iconKey: "lighting_set",
    sortOrder: 220,
    isActive: true,
  },
];

const STANDARD_SERVICE_ITEMS = [
  {
    itemType: ItemType.SERVICE,
    code: "SVC-MONTAGE-001",
    name: "Lieferung, Vertragen, Montage und Anschluss",
    price: "349.00",
    iconKey: "delivery_assembly",
    sortOrder: 300,
    isActive: true,
  },
  {
    itemType: ItemType.SERVICE,
    code: "SVC-PICKUP-001",
    name: "Abholung an Logistikstandort",
    price: "0.00",
    iconKey: "pickup",
    sortOrder: 310,
    isActive: true,
  },
];

function optionalString(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function getCalloutNumber(item) {
  if (item.calloutNumber) return String(item.calloutNumber).trim();
  const code = String(item.code || "").trim().toUpperCase();
  return PHOTO_NUMBER_BY_CODE[code] || "";
}

function iconKeyForSlot(componentKey, row, slotKind) {
  if (slotKind === "refrigerator" || componentKey === "refrigerator") return "tall_refrigerator";
  if (slotKind === "oven-module" || componentKey === "oven-module") return "oven_base";
  if (slotKind === "worktop" || componentKey === "worktop") return "worktop";
  if (slotKind === "sink-base" || componentKey === "sink-base") return "sink_base";
  if (slotKind === "sink-faucet" || componentKey === "sink-faucet") return "sink_faucet";
  if (slotKind === "dishwasher" || /dishwasher|egspv/i.test(row.articlesUpper)) return "dishwasher_base";
  if (slotKind === "hood-cabinet" || /FH664621E|HD6002/i.test(row.articlesUpper)) return "hood_wall_cabinet";
  if (/US30|300/.test(row.articlesUpper) || row.widthMm === 300) return "drawer_base_two";
  if (/US60|600/.test(row.articlesUpper) || row.widthMm === 600) return "drawer_base_two";
  if (/H\d{4}/.test(row.articlesUpper) || /720/.test(row.dimensions)) return "wall_cabinet_plain";
  return "drawer_base_two";
}

function colorKeyForComponent(componentKey) {
  if (componentKey === "refrigerator") return "black";
  if (["oven-module", "worktop", "sink-base"].includes(componentKey)) return "springgreen";
  if (componentKey.includes("hood") || componentKey === "wall-cabinet-2") return "#394c00";
  return "#00ffbf";
}

function buildItemName(row, componentKey, slotKind) {
  if (slotKind === "refrigerator") return "Freestanding refrigerator";
  if (slotKind === "oven-module") return "Built-in Oven and Hob";
  if (slotKind === "worktop") return "Worktop";
  if (slotKind === "sink-base") return "Sink Base Cabinet";
  if (slotKind === "sink-faucet") return "Sink and Waste System";
  if (slotKind === "dishwasher") return "Fully integrated dishwasher incl. furniture front";
  if (slotKind === "hood-cabinet") return "Flat Screen Extractor Hood + Cabinet + Filter";
  if (slotKind === "wall-cabinet") return "Wall Cabinet";
  return "Base cabinet with drawer";
}

function sanitizeCodePart(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 24);
}

function buildItemCode({ kitchenCode, componentKey, row, slotKind }) {
  const kitchenPart = sanitizeCodePart(String(kitchenCode || "").replace(/\s+/g, ""));
  const articlePart = sanitizeCodePart(row.articles.split("+")[0]);
  if (slotKind === "refrigerator") return articlePart ? `REF-${kitchenPart}-${articlePart}` : `REF-${kitchenPart}`;
  if (slotKind === "oven-module") return `OVEN-${kitchenPart}-600-HOB`;
  if (slotKind === "worktop") return `TOP-${kitchenPart}`;
  if (slotKind === "sink-base") return `SINKBASE-${kitchenPart}-600`;
  if (slotKind === "sink-faucet") return `SINK-${kitchenPart}-BOTTON-45`;
  if (slotKind === "dishwasher") return `DISH-${kitchenPart}-600`;
  if (slotKind === "hood-cabinet") return `CAB-HOOD-${kitchenPart}-600`;
  if (slotKind === "wall-cabinet") {
    return `CAB-WALL-${kitchenPart}-${articlePart || row.widthMm || "600"}`;
  }
  return `CAB-BASE-${kitchenPart}-${articlePart || row.widthMm || "600"}`;
}

function resolvePrice({ row, componentKey, slotKind, templateItem }) {
  if (row.price) return row.price;
  if (row.isDefault && DEFAULT_LOCKED_PRICES[componentKey]) {
    return DEFAULT_LOCKED_PRICES[componentKey];
  }
  if (templateItem?.price != null) {
    return String(templateItem.price);
  }
  if (slotKind === "sink-faucet") return DEFAULT_LOCKED_PRICES["sink-faucet"];
  return "0.00";
}

function copyProductInfoFields(source) {
  if (!source) return {};
  return {
    productImagePath: source.productImagePath,
    productInfoPdfPath: source.productInfoPdfPath,
    productInfoSummary: source.productInfoSummary,
    productInfoKeyFacts: source.productInfoKeyFacts,
    productInfoExtractedText: source.productInfoExtractedText,
    productInfoUpdatedAt: source.productInfoUpdatedAt,
  };
}

async function findReusableItem({ articleNumber, code }) {
  if (code) {
    const byCode = await prisma.kitchenItem.findFirst({
      where: { code },
      orderBy: { updatedAt: "desc" },
    });
    if (byCode) return byCode;
  }

  if (articleNumber) {
    return prisma.kitchenItem.findFirst({
      where: {
        articleNumber: {
          equals: articleNumber,
          mode: "insensitive",
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  return null;
}

function allocateUniqueItemCode(proposedCode, usedCodes) {
  const baseCode = String(proposedCode || "").trim();
  if (!baseCode) {
    throw new Error("Could not generate a unique item code.");
  }

  if (!usedCodes.has(baseCode)) {
    usedCodes.add(baseCode);
    return baseCode;
  }

  let suffix = 2;
  let candidate = `${baseCode}-${suffix}`;
  while (usedCodes.has(candidate)) {
    suffix += 1;
    candidate = `${baseCode}-${suffix}`;
  }

  usedCodes.add(candidate);
  return candidate;
}

function buildLinkedComponentGroups(items, templateKitchen) {
  if (Array.isArray(templateKitchen?.linkedComponentGroups) && templateKitchen.linkedComponentGroups.length) {
    return templateKitchen.linkedComponentGroups;
  }

  const hoodCabinet = items.find(
    (item) =>
      item.componentKey?.startsWith("wall-cabinet") &&
      /FH664621E|HD6002|HOOD|DUNST/i.test(String(item.articleNumber || item.infoText || "").toUpperCase()),
  );
  const hiddenHood = items.find((item) => item.componentKey === "extractor-hood");

  if (hoodCabinet && hiddenHood) {
    return [[`component-${hoodCabinet.componentKey}`, `component-${hiddenHood.componentKey}`]];
  }

  return null;
}

async function buildHiddenHoodItem(templateKitchen, sortOrder) {
  const templateHood = templateKitchen?.items?.find((item) => item.componentKey === "extractor-hood");
  const reusableHood =
    templateHood ||
    (await findReusableItem({ code: "HOOD-AB105806-FH664621E" })) ||
    (await findReusableItem({ articleNumber: "FH 664 621 S" }));

  if (!reusableHood) {
    return null;
  }

  return {
    itemType: ItemType.COMPONENT,
    code: reusableHood.code,
    articleNumber: reusableHood.articleNumber,
    name: reusableHood.name,
    nameDe: reusableHood.nameDe,
    price: String(reusableHood.price),
    widthMm: reusableHood.widthMm,
    heightMm: reusableHood.heightMm,
    depthMm: reusableHood.depthMm,
    infoText: reusableHood.infoText,
    iconKey: reusableHood.iconKey || "extractor_hood",
    colorKey: reusableHood.colorKey || "#394c00",
    componentKey: "extractor-hood",
    calloutNumber: null,
    sortOrder,
    isLocked: false,
    isActive: false,
    ...copyProductInfoFields(reusableHood),
  };
}

async function buildItemsFromSupplierSheet({
  supplierRows,
  templateKitchen,
  kitchenCode,
  hasComponentKeyColumn,
  callouts = [],
  preferTemplate = false,
}) {
  const templateItems = templateKitchen?.items || [];
  const plan = planSupplierImportMappings({
    supplierRows,
    callouts,
    templateItems,
    preferTemplate,
  });

  if (!plan.ok) {
    throw new Error(plan.errors.join(" "));
  }

  const { assignments, nrToTemplateItem } = plan;
  const componentItems = [];
  const usedItemCodes = new Set(
    [...STANDARD_ACCESSORY_ITEMS, ...STANDARD_SERVICE_ITEMS].map((item) => item.code),
  );
  let sortOrder = 10;

  for (const { row, componentKey, slotKind } of assignments) {
    const templateItem = nrToTemplateItem.get(row.nr);
    const articleNumber = row.articles || templateItem?.articleNumber || null;
    const proposedCode = templateItem?.code || buildItemCode({ kitchenCode, componentKey, row, slotKind });
    const reusableItem = await findReusableItem({ code: proposedCode, articleNumber });
    const code = allocateUniqueItemCode(proposedCode, usedItemCodes);
    const price = resolvePrice({ row, componentKey, slotKind, templateItem: reusableItem || templateItem });
    const isLocked =
      row.isDefault || templateItem?.isLocked || ["oven-module", "worktop", "sink-base", "sink-faucet"].includes(componentKey);

    componentItems.push({
      itemType: ItemType.COMPONENT,
      code,
      articleNumber,
      name: reusableItem?.name || templateItem?.name || buildItemName(row, componentKey, slotKind),
      nameDe: reusableItem?.nameDe || templateItem?.nameDe || null,
      price,
      widthMm: row.widthMm || templateItem?.widthMm || reusableItem?.widthMm || null,
      heightMm: row.heightMm || templateItem?.heightMm || reusableItem?.heightMm || null,
      depthMm: row.depthMm || templateItem?.depthMm || reusableItem?.depthMm || null,
      infoText: row.articles || templateItem?.infoText || reusableItem?.infoText || null,
      iconKey: templateItem?.iconKey || reusableItem?.iconKey || iconKeyForSlot(componentKey, row, slotKind),
      colorKey: templateItem?.colorKey || reusableItem?.colorKey || colorKeyForComponent(componentKey),
      componentKey,
      calloutNumber: row.nr,
      sortOrder,
      isLocked,
      isActive: true,
      ...copyProductInfoFields(reusableItem || templateItem),
    });
    sortOrder += 10;
  }

  const hiddenHood = await buildHiddenHoodItem(templateKitchen, sortOrder + 2);
  const hasHoodCabinet = componentItems.some(
    (item) => item.componentKey?.startsWith("wall-cabinet") && /FH664621E|HD6002/i.test(item.articleNumber || ""),
  );
  if (hiddenHood && hasHoodCabinet && !componentItems.some((item) => item.componentKey === "extractor-hood")) {
    componentItems.push({
      ...hiddenHood,
      code: allocateUniqueItemCode(hiddenHood.code, usedItemCodes),
    });
  }

  if (!componentItems.some((item) => item.componentKey === "sink-faucet")) {
    const sinkTemplate = templateItems.find((item) => item.componentKey === "sink-faucet");
    componentItems.push({
      itemType: ItemType.COMPONENT,
      code: allocateUniqueItemCode(sinkTemplate?.code || `SINK-${sanitizeCodePart(kitchenCode)}-BOTTON-45`, usedItemCodes),
      articleNumber: sinkTemplate?.articleNumber || "517467",
      name: sinkTemplate?.name || "Sink and Waste System",
      price: sinkTemplate ? String(sinkTemplate.price) : DEFAULT_LOCKED_PRICES["sink-faucet"],
      iconKey: "sink_faucet",
      colorKey: "black",
      componentKey: "sink-faucet",
      sortOrder: sortOrder + 20,
      isLocked: true,
      isActive: true,
      ...copyProductInfoFields(sinkTemplate),
    });
  }

  return {
    items: [...componentItems, ...STANDARD_ACCESSORY_ITEMS, ...STANDARD_SERVICE_ITEMS],
    warnings: plan.warnings,
  };
}

function decodePublicPath(encodedPath) {
  const relative = decodeURIComponent(String(encodedPath || "").replace(/^\//, ""));
  return path.join(process.cwd(), "public", ...relative.split("/"));
}

function safeFileName(value, fallback) {
  const fileName = path.basename(String(value || "").trim() || fallback);
  return fileName.replace(/[<>:"/\\|?*]/g, "-");
}

function assignCatalogSortOrders(items, callouts = []) {
  const xByNr = new Map(callouts.map((callout) => [String(callout.nr), callout.xPct]));
  const components = items.filter((item) => item.itemType === ItemType.COMPONENT);
  const rest = items.filter((item) => item.itemType !== ItemType.COMPONENT);
  const sortedComponents = sortComponentsForCatalog(components, xByNr);
  sortedComponents.forEach((item, index) => {
    item.sortOrder = (index + 1) * 10;
  });
  const baseSort = sortedComponents.length * 10;
  rest.forEach((item, index) => {
    item.sortOrder = Math.max(item.sortOrder ?? 0, baseSort + 10 + index * 10);
  });
  return [...sortedComponents, ...rest];
}

export async function importKitchenFromFiles(formData) {
  const pdfFile = formData.get("pdfFile");
  const excelFile = formData.get("excelFile");
  const layoutTemplateKitchenId = optionalString(formData.get("layoutTemplateKitchenId"));
  const contractNumber = optionalString(formData.get("contractNumber"));

  if (!pdfFile || typeof pdfFile === "string" || typeof pdfFile.arrayBuffer !== "function") {
    throw new Error("Please upload the kitchen plan PDF.");
  }

  if (!excelFile || typeof excelFile === "string" || typeof excelFile.arrayBuffer !== "function") {
    throw new Error("Please upload the supplier Excel file.");
  }

  const kitchenInput = validateKitchenInput(formData);

  const existingKitchen = await prisma.kitchen.findUnique({
    where: { slug: kitchenInput.slug },
    select: { name: true },
  });
  if (existingKitchen) {
    throw new Error(
      `Kitchen slug "${kitchenInput.slug}" already exists (${existingKitchen.name}). Use a different kitchen name/code or delete the existing kitchen.`,
    );
  }

  if (contractNumber) {
    const existingContract = await prisma.kitchenContract.findUnique({
      where: { contractNumber },
      include: { kitchen: { select: { name: true } } },
    });
    if (existingContract) {
      throw new Error(
        `Contract number ${contractNumber} is already used by ${existingContract.kitchen.name}. Choose a different contract number.`,
      );
    }
  }

  const excelBytes = new Uint8Array(await excelFile.arrayBuffer());
  const { rows: supplierRows, hasComponentKeyColumn } = parseSupplierKitchenSheet(
    excelBytes,
    excelFile.name || "catalog.xlsx",
  );

  if (!supplierRows.length) {
    throw new Error("The supplier Excel file has no item rows to import.");
  }

  let templateKitchen = null;
  if (layoutTemplateKitchenId) {
    templateKitchen = await prisma.kitchen.findUnique({
      where: { id: layoutTemplateKitchenId },
      include: { items: true },
    });

    if (!templateKitchen) {
      throw new Error("Layout template kitchen was not found.");
    }
  }

  if (!hasComponentKeyColumn && !templateKitchen) {
    // Falls back to article-based auto slot assignment below.
  }

  const planBaseName = derivePlanBaseName({
    kitchenCode: kitchenInput.kitchenCode,
    kitchenName: kitchenInput.name,
    pdfFileName: pdfFile.name,
  });
  const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
  const safeBaseName = planBaseName.replace(/[<>:"/\\|?*]/g, "-");
  const importWorkspacePath = path.join(process.cwd(), ".kitchen-imports", kitchenInput.slug);
  fs.mkdirSync(importWorkspacePath, { recursive: true });
  const supplierExcelPath = path.join(importWorkspacePath, safeFileName(excelFile.name, "supplier.xlsx"));
  fs.writeFileSync(supplierExcelPath, Buffer.from(excelBytes));
  fs.writeFileSync(path.join(importWorkspacePath, "import-metadata.json"), JSON.stringify({
    kitchenName: kitchenInput.name,
    kitchenCode: kitchenInput.kitchenCode,
    slug: kitchenInput.slug,
    pdfFileName: pdfFile.name || null,
    excelFileName: excelFile.name || null,
    importedAt: new Date().toISOString(),
  }, null, 2));
  const pdfDir = path.join(process.cwd(), "public", "pdfs");
  fs.mkdirSync(pdfDir, { recursive: true });
  const pdfPath = path.join(pdfDir, `${safeBaseName}.pdf`);
  fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
  const callouts = extractCalloutsFromPdf(pdfPath);

  const { items, warnings: mappingWarnings } = await buildItemsFromSupplierSheet({
    supplierRows,
    templateKitchen,
    kitchenCode: kitchenInput.kitchenCode || kitchenInput.name,
    hasComponentKeyColumn,
    callouts,
    preferTemplate: Boolean(layoutTemplateKitchenId) && !hasComponentKeyColumn,
  });

  let planAssets;
  try {
    planAssets = await processKitchenPlanFiles({
      pdfBytes,
      planBaseName,
      componentItems: items.filter((item) => item.itemType === ItemType.COMPONENT),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan processing failed.";
    throw new Error(`${message} Install Python 3 with pymupdf, pypdfium2, pillow, and numpy.`);
  }

  assignCatalogSortOrders(items, callouts);

  const hotspotsFromPlan = planAssets.hotspots?.length
    ? planAssets.hotspots
    : generateHotspotsForItems(items, {
        planImagePath: planAssets.planImagePath,
        planPdfPath: planAssets.planPdfPath,
      }).hotspots;

  const hotspots = hotspotsFromPlan?.length ? hotspotsFromPlan : null;

  const linkedComponentGroups = buildLinkedComponentGroups(items, templateKitchen);
  const description =
    kitchenInput.description ||
    `Kitchen configuration imported from ${pdfFile.name || "plan PDF"} and ${excelFile.name || "supplier Excel"}.`;

  const createdKitchen = await prisma.$transaction(async (tx) => {
    const kitchen = await tx.kitchen.create({
      data: {
        ...kitchenInput,
        description,
        planImagePath: planAssets.planImagePath,
        planPdfPath: planAssets.planPdfPath,
        hotspots,
        linkedComponentGroups,
      },
    });

    try {
      await tx.kitchenItem.createMany({
        data: items.map((item) => ({
          kitchenId: kitchen.id,
          ...item,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const targets = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "unique field";
        throw new Error(`Duplicate item ${targets} while saving catalog rows. Try importing again.`);
      }
      throw error;
    }

    if (contractNumber) {
      await tx.kitchenContract.create({
        data: {
          contractNumber,
          kitchenId: kitchen.id,
          isActive: true,
        },
      });
    }

    return kitchen;
  });

  const warnings = [...mappingWarnings];
  if (!planAssets.usedVectorPlan) {
    warnings.push("Vector SVG plan was not generated; using the raster JPG plan instead.");
  }
  if (!hotspots?.length) {
    warnings.push("Hotspots could not be auto-detected. Add hotspot JSON on the kitchen detail page.");
  }
  if (!hasComponentKeyColumn && !templateKitchen) {
    warnings.push("Slots were auto-detected from articles. Verify items and use ?calibrate=1 on the kitchen page.");
  }

  const hotspotFinalize = await finalizeImportedKitchenHotspots(prisma, createdKitchen.id, {
    writeOverlay: true,
  });
  if (hotspotFinalize.repair?.updated) {
    warnings.push(`Repaired ${hotspotFinalize.repair.updated} component key mapping(s) from PDF callouts.`);
  }
  if (hotspotFinalize.overlay?.written) {
    warnings.push(`Hotspot overlay saved to ${hotspotFinalize.overlay.path.replace(/^.*public/, "")}.`);
  }
  if (!hotspotFinalize.ok) {
    warnings.push(
      `Hotspot verification failed: ${(hotspotFinalize.errors || []).join(" ") || "Review hotspots on the kitchen detail page."}`,
    );
  }

  const refreshedKitchen = await prisma.kitchen.findUnique({ where: { id: createdKitchen.id } });

  return {
    kitchen: refreshedKitchen || createdKitchen,
    itemCount: items.length,
    warnings,
    hotspotVerification: hotspotFinalize.verification,
    importWorkspacePath,
    supplierExcelPath,
    hotspotOverlayPath: hotspotFinalize.overlay?.path || null,
  };
}
