import fs from "fs/promises";
import http from "http";
import https from "https";
import { jsPDF } from "jspdf";
import nodemailer from "nodemailer";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { getCabinetWidthDisplayName } from "../cabinet-name-utils.js";
import { getPreferredDeliveryWeekDisplay } from "../preferred-delivery.js";
import { getPriceBreakdown } from "../price-utils.js";

const LETTERHEAD = {
  headerHeight: 74,
  footerHeight: 66,
  contentTop: 114,
  contentBottomPadding: 24,
  templatePath: "pdfs/architecto-letterhead.pdf",
};

const PDF_SENDER_ADDRESS = [
  "architecto by Küchen Aktuell GmbH,",
  "Senefelderstraße 2b, 38124 Braunschweig",
];

async function resolvePublicAssetPath(relativePath) {
  const candidates = [
    path.join(process.cwd(), "public", relativePath),
    path.join(process.cwd(), "frontend", "public", relativePath),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  throw new Error(`Asset not found: ${relativePath}`);
}

function normalizeProductInfoAssetPath(pdfPath) {
  const normalized = String(pdfPath || "").trim().replace(/^\/+/, "");
  return normalized || "";
}

function buildProductInfoFilename(item, assetPath) {
  const baseName = String(getItemDisplayName(item) || path.basename(assetPath, ".pdf") || "Produktinformation")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `Produktinformation-${baseName || "Produkt"}.pdf`;
}

const DISHWASHER_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: "/product-info/a-egspv597210-product-info-eco21.pdf" },
];

const FLAT_HOOD_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: "/product-info/fh-664-621-s-product-info.pdf" },
];

const CHIMNEY_HOOD_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: "/product-info/khf-664-611-s-chimney-extractor-hood-product-info.pdf" },
];

const FRIDGE_PRODUCT_INFO_DOCUMENTS = [
  { label: "Produktinfo PDF", href: "/product-info/FRIDGE - 87b07181872a0fb7e8a15b39de13a7b78a22ad1c_1193783_Produktinformation.pdf" },
];

function getMappedProductInfoDocuments(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const articleNumber = String(item?.articleNumber || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const displayName = String(getItemDisplayName(item)).toLowerCase();
  const haystack = `${code} ${articleNumber} ${iconKey} ${componentKey} ${displayName}`;

  if (
    code.startsWith("DISH-") ||
    iconKey === "dishwasher_base" ||
    haystack.includes("dishwasher") ||
    haystack.includes("geschirr")
  ) {
    return DISHWASHER_PRODUCT_INFO_DOCUMENTS;
  }

  if (
    code.startsWith("REF-") ||
    articleNumber.includes("KGCN388140E") ||
    articleNumber.includes("KGC15495") ||
    iconKey.includes("refrigerator") ||
    iconKey.includes("fridge") ||
    componentKey.includes("refrigerator") ||
    haystack.includes("refrigerator") ||
    haystack.includes("fridge") ||
    haystack.includes("kuehlschrank") ||
    haystack.includes("kühlschrank")
  ) {
    return FRIDGE_PRODUCT_INFO_DOCUMENTS;
  }

  if (
    code.includes("KHF664611") ||
    articleNumber.includes("KHF664611") ||
    haystack.includes("chimney") ||
    haystack.includes("schraeg") ||
    haystack.includes("schrÃ¤g")
  ) {
    return CHIMNEY_HOOD_PRODUCT_INFO_DOCUMENTS;
  }

  if (
    code.startsWith("HOOD-") ||
    code.startsWith("CAB-HOOD-") ||
    iconKey.includes("hood") ||
    componentKey.includes("hood") ||
    componentKey.includes("extractor") ||
    haystack.includes("extractor") ||
    haystack.includes("hood") ||
    haystack.includes("dunstabzug") ||
    haystack.includes("flachschirmhaube")
  ) {
    return FLAT_HOOD_PRODUCT_INFO_DOCUMENTS;
  }

  return [];
}

function shouldPreferMappedProductInfoDocuments(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const articleNumber = String(item?.articleNumber || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const displayName = String(getItemDisplayName(item)).toLowerCase();
  const haystack = `${code} ${articleNumber} ${iconKey} ${componentKey} ${displayName}`;

  return (
    code.startsWith("REF-") ||
    articleNumber.includes("KGCN388140E") ||
    articleNumber.includes("KGC15495") ||
    articleNumber.includes("FH664621E + FWK124 + HD6002") ||
    articleNumber.includes("FH664621E + HD6002") ||
    articleNumber.includes("FH 664 621 S") ||
    code.startsWith("CAB-HOOD-") ||
    iconKey.includes("refrigerator") ||
    iconKey.includes("fridge") ||
    componentKey.includes("refrigerator") ||
    haystack.includes("refrigerator") ||
    haystack.includes("fridge") ||
    haystack.includes("kuehlschrank") ||
    haystack.includes("kÃ¼hlschrank") ||
    haystack.includes("flat screen extractor hood") ||
    haystack.includes("flachschirmhaube")
  );
}

function getProductInfoDocumentsForEmail(item) {
  const mappedDocuments = getMappedProductInfoDocuments(item);
  if (mappedDocuments.length && shouldPreferMappedProductInfoDocuments(item)) {
    return mappedDocuments;
  }

  const directPath = normalizeProductInfoAssetPath(item?.productInfoPdfPath);
  const directDocuments = directPath ? [{ label: "Produktinfo PDF", href: directPath }] : [];
  return directDocuments.length ? directDocuments : mappedDocuments;
}

function normalizeProductImageAssetPath(imagePath) {
  const normalized = String(imagePath || "").trim().replace(/^\/+/, "");
  return normalized || "";
}

function normalizeKitchenSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function deriveAbKitchenPlanCode(slug) {
  const normalizedSlug = normalizeKitchenSlug(slug);
  const aliasBySlug = {
    "ab-105813": "105805",
    "ab-105817": "105805",
    "ab-105840": "105837",
    "ab-105843": "105837",
    "ab-105814": "105810",
    "ab-105828": "105825",
    "ab-105824": "105821",
    "ab-105823": "105822",
    "ab-105829": "105822",
    "ab-105832": "105822",
    "ab-105830": "105827",
    "ab-105839": "105842",
    "ab-105838": "105841",
    "ab-105844": "105841",
  };
  const aliasedCode = aliasBySlug[normalizedSlug];
  if (aliasedCode) return aliasedCode;

  const match = normalizedSlug.match(/^ab-(\d{6})$/);
  return match?.[1] || "";
}

function formatAbKitchenPlanName(code) {
  return code ? `AB ${code.slice(0, 3)}${code.slice(3)}` : "";
}

async function resolveWorkspaceAssetPath(relativePath) {
  const normalized = String(relativePath || "").replace(/^\/+/, "");
  if (!normalized) return "";

  const candidates = [
    path.join(process.cwd(), normalized),
    path.join(process.cwd(), "frontend", normalized),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  return "";
}

function decodePublicAssetHref(href) {
  const normalized = String(href || "").trim().replace(/^\/+/, "");
  return normalized ? `public/${decodeURIComponent(normalized)}` : "";
}

function findBalancedObjectLiteral(source, assignmentName) {
  const assignmentIndex = source.indexOf(`const ${assignmentName} =`);
  if (assignmentIndex < 0) return "";

  const startIndex = source.indexOf("{", assignmentIndex);
  if (startIndex < 0) return "";

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

let kitchenPlanPreviewDataPromise = null;

async function loadKitchenPlanPreviewData() {
  if (kitchenPlanPreviewDataPromise) return kitchenPlanPreviewDataPromise;

  kitchenPlanPreviewDataPromise = (async () => {
    const sourcePath = path.join(process.cwd(), "components", "kitchen-svg-stage.jsx");
    const source = await fs.readFile(sourcePath, "utf8");
    const imageViewsLiteral = findBalancedObjectLiteral(source, "IMAGE_VIEW_BY_SLUG");
    const hotspotsLiteral = findBalancedObjectLiteral(source, "IMAGE_HOTSPOTS_BY_SLUG");
    const imageViews = imageViewsLiteral ? Function(`"use strict"; return (${imageViewsLiteral});`)() : {};
    const hotspotsBySlug = hotspotsLiteral ? Function(`"use strict"; return (${hotspotsLiteral});`)() : {};
    const selectionUtilsPath = path.join(process.cwd(), "components", "kitchen-selection-utils.js");
    const selectionUtilsSource = await fs.readFile(selectionUtilsPath, "utf8").catch(() => "");
    const linkedGroupsLiteral = selectionUtilsSource
      ? findBalancedObjectLiteral(selectionUtilsSource, "LINKED_COMPONENT_GROUPS_BY_SLUG")
      : "";
    const linkedGroupsBySlug = linkedGroupsLiteral
      ? Function(`"use strict"; return (${linkedGroupsLiteral});`)()
      : {};

    source.replace(
      /IMAGE_HOTSPOTS_BY_SLUG\["([^"]+)"\]\s*=\s*IMAGE_HOTSPOTS_BY_SLUG\["([^"]+)"\]/g,
      (match, target, sourceSlug) => {
        hotspotsBySlug[target] = hotspotsBySlug[sourceSlug] || [];
        return match;
      },
    );

    return { imageViews, hotspotsBySlug, linkedGroupsBySlug };
  })();

  return kitchenPlanPreviewDataPromise;
}

async function resolvePurchasedKitchenSketchPath(order) {
  const slug = normalizeKitchenSlug(order?.kitchen?.slug);
  const candidates = [];
  const previewData = await loadKitchenPlanPreviewData().catch(() => null);
  const imageViewHref = previewData?.imageViews?.[slug] || "";

  if (imageViewHref) {
    candidates.push(decodePublicAssetHref(imageViewHref));
  }

  if (slug === "108134-modul-1") {
    candidates.push(
      "public/plans/108134 MODUL 1.svg",
      "public/jpg/108134 MODUL 1_page-0001.jpg",
    );
  }

  if (slug === "kitchen-model-b" || slug === "kitchen-model-c" || slug === "l-kitchen-new" || slug === "l-shaped-kitchen") {
    candidates.push(`kitchen-svgs/active/${slug}.svg`);
  }

  const abPlanCode = deriveAbKitchenPlanCode(slug);
  const abPlanName = formatAbKitchenPlanName(abPlanCode);
  if (abPlanName) {
    candidates.push(
      `public/plans/${abPlanName}.svg`,
      `public/jpg/${abPlanName}_page-0001.jpg`,
    );
  }

  for (const candidate of candidates) {
    const resolved = await resolveWorkspaceAssetPath(candidate);
    if (resolved) return resolved;
  }

  return "";
}

function componentIdForPdfItem(item) {
  const componentKey = String(item?.componentKey || "").trim();
  if (!componentKey) return "";
  return `component-${componentKey.replace(/[^a-z0-9#-]/gi, "").toLowerCase()}`;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addClassToSvgTag(tag, className) {
  if (/\bclass\s*=/i.test(tag)) {
    return tag.replace(/\bclass=(["'])(.*?)\1/i, (match, quote, value) => {
      const classes = new Set(String(value || "").split(/\s+/).filter(Boolean));
      classes.add(className);
      return `class=${quote}${[...classes].join(" ")}${quote}`;
    });
  }

  return tag.replace(/>$/, ` class="${className}">`);
}

function markSvgComponentGroup(markup, componentId, className) {
  if (!componentId) return markup;
  const pattern = new RegExp(
    `<g\\b([^>]*\\bdata-component-id=(["'])${escapeRegExp(componentId)}\\2[^>]*)>`,
    "i",
  );

  return String(markup || "").replace(pattern, (match) => addClassToSvgTag(match, className));
}

function expandLinkedComponentKeys(componentKeys, linkedGroups = []) {
  const expanded = new Set(componentKeys);

  for (const group of linkedGroups || []) {
    const groupKeys = (Array.isArray(group) ? group : [])
      .map((componentId) => String(componentId || "").replace(/^component-/, "").trim())
      .filter(Boolean);
    if (groupKeys.some((componentKey) => expanded.has(componentKey))) {
      groupKeys.forEach((componentKey) => expanded.add(componentKey));
    }
  }

  return expanded;
}

function buildPurchasedKitchenPdfSelectionState(order, options = {}) {
  const linkedGroups = options.linkedGroups || [];
  const defaultLockedComponentKeys = options.defaultLockedComponentKeys || [];
  const selectedComponentIds = new Set();
  const lockedComponentIds = new Set();
  const selectedComponentKeys = new Set();
  const lockedComponentKeys = new Set();

  for (const item of order?.components || []) {
    const componentId = componentIdForPdfItem(item);
    if (!componentId) continue;
    const componentKey = String(item?.componentKey || "").trim();

    if (item?.isLocked) {
      lockedComponentIds.add(componentId);
      if (componentKey) lockedComponentKeys.add(componentKey);
    } else {
      selectedComponentIds.add(componentId);
      if (componentKey) selectedComponentKeys.add(componentKey);
    }
  }

  defaultLockedComponentKeys.forEach((componentKey) => {
    const normalizedKey = String(componentKey || "").trim();
    if (!normalizedKey || selectedComponentKeys.has(normalizedKey)) return;
    lockedComponentKeys.add(normalizedKey);
    lockedComponentIds.add(`component-${normalizedKey}`);
  });

  const expandedSelectedComponentKeys = expandLinkedComponentKeys(selectedComponentKeys, linkedGroups);
  const expandedLockedComponentKeys = expandLinkedComponentKeys(lockedComponentKeys, linkedGroups);

  expandedSelectedComponentKeys.forEach((componentKey) => selectedComponentIds.add(`component-${componentKey}`));
  expandedLockedComponentKeys.forEach((componentKey) => lockedComponentIds.add(`component-${componentKey}`));

  return {
    selectedComponentIds,
    lockedComponentIds,
    selectedComponentKeys: expandedSelectedComponentKeys,
    lockedComponentKeys: expandedLockedComponentKeys,
  };
}

function injectPurchasedKitchenPdfStyles(markup) {
  const styles = `
    <style>
      .fragmento-pdf-selected path,
      .fragmento-pdf-selected polygon,
      .fragmento-pdf-selected rect,
      .fragmento-pdf-selected circle,
      .fragmento-pdf-selected ellipse {
        fill: #bfe9cf !important;
        stroke: #2a9155 !important;
        stroke-width: 1.6px !important;
        vector-effect: non-scaling-stroke;
      }
      .fragmento-pdf-locked path,
      .fragmento-pdf-locked polygon,
      .fragmento-pdf-locked rect,
      .fragmento-pdf-locked circle,
      .fragmento-pdf-locked ellipse {
        fill: #c8d9ff !important;
        stroke: #2563eb !important;
        stroke-width: 1.5px !important;
        vector-effect: non-scaling-stroke;
      }
      .fragmento-pdf-selected text,
      .fragmento-pdf-locked text {
        fill: #111827 !important;
      }
      .component-hitbox {
        fill: transparent !important;
        stroke: transparent !important;
        opacity: 0 !important;
      }
    </style>
  `.trim();

  return String(markup || "").replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    const nextAttrs = /\bxmlns=/.test(attrs)
      ? attrs
      : `${attrs} xmlns="http://www.w3.org/2000/svg"`;
    return `<svg${nextAttrs}>${styles}`;
  });
}

function applyPurchasedKitchenSelectionToSvg(markup, order) {
  const { selectedComponentIds, lockedComponentIds } = buildPurchasedKitchenPdfSelectionState(order, {
    defaultLockedComponentKeys: ["worktop"],
  });
  let nextMarkup = injectPurchasedKitchenPdfStyles(markup);

  for (const componentId of selectedComponentIds) {
    nextMarkup = markSvgComponentGroup(nextMarkup, componentId, "fragmento-pdf-selected");
  }

  for (const componentId of lockedComponentIds) {
    nextMarkup = markSvgComponentGroup(nextMarkup, componentId, "fragmento-pdf-locked");
  }

  return nextMarkup;
}

function hotspotBounds(definition) {
  const points = Array.isArray(definition?.points) ? definition.points : [];
  if (points.length) {
    const xs = points.map((point) => Number(point[0])).filter(Number.isFinite);
    const ys = points.map((point) => Number(point[1])).filter(Number.isFinite);
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys),
    };
  }

  const left = Number(definition?.left || 0);
  const top = Number(definition?.top || 0);
  return {
    left,
    top,
    right: left + Number(definition?.width || 0),
    bottom: top + Number(definition?.height || 0),
  };
}

function getKitchenPlanDisplayCrop(hotspots = []) {
  if (!hotspots.length) return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };

  const bounds = hotspots.reduce(
    (current, hotspot) => {
      const box = hotspotBounds(hotspot);
      return {
        left: Math.min(current.left, box.left),
        top: Math.min(current.top, box.top),
        right: Math.max(current.right, box.right),
        bottom: Math.max(current.bottom, box.bottom),
      };
    },
    { left: 100, top: 100, right: 0, bottom: 0 },
  );
  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const left = Math.max(0, bounds.left - Math.max(2.6, bounds.left * 0.6));
  const top = Math.max(0, bounds.top - Math.max(4, bounds.top * 0.5));
  const right = Math.min(99.5, bounds.right + Math.max(3.2, trailingX * 0.92));
  const bottom = Math.min(99.5, bounds.bottom + Math.max(1, trailingY * 0.85));

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
  };
}

function pointsToOverlayPolygon(points, crop, width, height) {
  return points
    .map(([x, y]) => {
      const px = ((Number(x) - crop.left) / crop.width) * width;
      const py = ((Number(y) - crop.top) / crop.height) * height;
      return `${Math.round(px * 100) / 100},${Math.round(py * 100) / 100}`;
    })
    .join(" ");
}

function buildPurchasedKitchenOverlaySvg({ order, hotspots, crop, width, height, linkedGroups = [] }) {
  const hasWorktop = hotspots.some((hotspot) => String(hotspot?.componentKey || "").trim() === "worktop");
  const { selectedComponentKeys, lockedComponentKeys } = buildPurchasedKitchenPdfSelectionState(order, {
    linkedGroups,
    defaultLockedComponentKeys: hasWorktop ? ["worktop"] : [],
  });
  const shapes = [];

  for (const hotspot of hotspots) {
    const componentKey = String(hotspot?.componentKey || "").trim();
    const isLocked = lockedComponentKeys.has(componentKey);
    const isSelected = isLocked || selectedComponentKeys.has(componentKey);
    if (!isSelected) continue;

    const fill = isLocked ? "rgba(37,99,235,0.26)" : "rgba(62,188,116,0.34)";
    const stroke = isLocked ? "rgba(37,99,235,0.9)" : "rgba(42,145,85,1)";
    const points = Array.isArray(hotspot.points) ? hotspot.points : [];

    if (points.length) {
      shapes.push(
        `<polygon points="${pointsToOverlayPolygon(points, crop, width, height)}" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`,
      );
      continue;
    }

    const x = ((Number(hotspot.left || 0) - crop.left) / crop.width) * width;
    const y = ((Number(hotspot.top || 0) - crop.top) / crop.height) * height;
    const rectWidth = (Number(hotspot.width || 0) / crop.width) * width;
    const rectHeight = (Number(hotspot.height || 0) / crop.height) * height;
    shapes.push(
      `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2.2"/>`,
    );
  }

  if (!shapes.length) return null;
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${shapes.join("")}</svg>`);
}

async function renderPurchasedKitchenImagePlanPng(order, source) {
  const slug = normalizeKitchenSlug(order?.kitchen?.slug);
  const previewData = await loadKitchenPlanPreviewData().catch(() => null);
  const directHotspots = previewData?.hotspotsBySlug?.[slug] || [];
  const planHref = previewData?.imageViews?.[slug] || "";
  // Several kitchen numbers intentionally share one drawing. Some of those
  // hotspot aliases are assigned dynamically in the React module and are not
  // part of its object literal, so inherit the regions from another slug that
  // points at the exact same plan asset.
  const sharedPlanSlug = !directHotspots.length && planHref
    ? Object.keys(previewData?.hotspotsBySlug || {}).find((candidateSlug) =>
        previewData.imageViews?.[candidateSlug] === planHref &&
        previewData.hotspotsBySlug?.[candidateSlug]?.length,
      )
    : "";
  const hotspots = directHotspots.length
    ? directHotspots
    : (previewData?.hotspotsBySlug?.[sharedPlanSlug] || []);
  const linkedGroups = previewData?.linkedGroupsBySlug?.[slug] || [];
  if (!hotspots.length) return null;

  const rendered = await sharp(source).png().toBuffer({ resolveWithObject: true });
  const crop = getKitchenPlanDisplayCrop(hotspots);
  const extractLeft = Math.max(0, Math.floor((crop.left / 100) * rendered.info.width));
  const extractTop = Math.max(0, Math.floor((crop.top / 100) * rendered.info.height));
  const extractWidth = Math.min(rendered.info.width - extractLeft, Math.ceil((crop.width / 100) * rendered.info.width));
  const extractHeight = Math.min(rendered.info.height - extractTop, Math.ceil((crop.height / 100) * rendered.info.height));
  const finalWidth = 1400;
  const finalHeight = Math.round(finalWidth * (extractHeight / extractWidth));
  const overlay = buildPurchasedKitchenOverlaySvg({
    order,
    hotspots,
    crop,
    width: finalWidth,
    height: finalHeight,
    linkedGroups,
  });

  const pipeline = sharp(rendered.data)
    .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
    .resize({ width: finalWidth })
    .png();

  const output = overlay
    ? await pipeline.composite([{ input: overlay, left: 0, top: 0 }]).toBuffer({ resolveWithObject: true })
    : await pipeline.toBuffer({ resolveWithObject: true });

  return {
    content: output.data,
    width: output.info.width,
    height: output.info.height,
  };
}

async function loadPurchasedKitchenSketchPng(order) {
  const sketchPath = await resolvePurchasedKitchenSketchPath(order);
  if (!sketchPath) return null;

  const isSvg = path.extname(sketchPath).toLowerCase() === ".svg";
  const rawSource = isSvg
    ? Buffer.from(applyPurchasedKitchenSelectionToSvg(await fs.readFile(sketchPath, "utf8"), order))
    : await fs.readFile(sketchPath);
  const imagePlan = await renderPurchasedKitchenImagePlanPng(order, rawSource);
  if (imagePlan) {
    return {
      ...imagePlan,
      sourcePath: sketchPath,
    };
  }

  const { data, info } = await sharp(rawSource)
    .resize({ width: 1400, withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    content: data,
    width: info.width,
    height: info.height,
    sourcePath: sketchPath,
  };
}

function getMappedProductImagePath(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const articleNumber = String(item?.articleNumber || "").trim().toUpperCase();
  const iconKey = String(item?.iconKey || "").trim().toLowerCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const displayName = String(getItemDisplayName(item)).toLowerCase();
  const haystack = `${code} ${articleNumber} ${iconKey} ${componentKey} ${displayName}`;

  if (
    code.includes("KHF664611") ||
    articleNumber.includes("KHF664611") ||
    haystack.includes("chimney") ||
    haystack.includes("schraeg") ||
    haystack.includes("schräg")
  ) {
    return "product-images/email/khf664611s-chimney-hood.jpg";
  }

  if (
    code.startsWith("HOOD-") ||
    code.startsWith("CAB-HOOD-") ||
    iconKey.includes("hood") ||
    componentKey.includes("hood") ||
    componentKey.includes("extractor") ||
    haystack.includes("extractor") ||
    haystack.includes("hood") ||
    haystack.includes("dunstabzug") ||
    haystack.includes("flachschirmhaube")
  ) {
    return "product-images/email/fh664621s-flat-hood.jpg";
  }

  return "";
}

function getProductImagePathForEmail(item) {
  return normalizeProductImageAssetPath(item?.productImagePath) || getMappedProductImagePath(item);
}

function buildProductImageCid(item, index) {
  const code = String(item.code || item.name || `product-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `product-image-${code || index}@fragmento`;
}

async function buildWhiteBackedProductImage(content) {
  return sharp(content)
    .resize({
      width: 96,
      height: 96,
      fit: "contain",
      background: "#ffffff",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

function getItemDisplayCode(item) {
  return String(item?.articleNumber || item?.code || "-").trim() || "-";
}

function getItemDisplayName(item) {
  const cabinetName = getCabinetWidthDisplayName(item, "de");
  return normalizeGermanDisplayText(item?.nameDe || cabinetName || item?.name || item?.code || "");
}

function getItemDisplayNameWithQuantity(item) {
  const name = getItemDisplayName(item);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  return quantity > 1 ? `${name} x ${quantity}` : name;
}

function parseTrailingQuantity(value) {
  const match = String(value || "").match(/\bx\s*(\d+)\s*$/i);
  return match ? Math.max(1, Math.floor(Number(match[1]) || 1)) : 1;
}

function stripTrailingQuantity(value) {
  return String(value || "").replace(/\s*x\s*\d+\s*$/i, "").trim();
}

function stripLeadingBlendePrefix(value) {
  return String(value || "").replace(/^blende\s+/i, "").trim();
}

function normalizeGermanDisplayText(value) {
  return String(value || "")
    .trim()
    .replace(/Kuehlschrank/g, "Kühlschrank")
    .replace(/Geschirrspueler/g, "Geschirrspüler")
    .replace(/Spuele/g, "Spüle")
    .replace(/Zubehoer/g, "Zubehör")
    .replace(/\bKuechenmoebel\b/g, "Küchenmöbel")
    .replace(/\bfuer\b/g, "für")
    .replace(/\bOberschrank für Flachschirmhaube\s*,?\s*(\d+)(?:\s*cm)?\b/g, "Oberschrank für Flachschirmhaube, $1 cm");
}

async function loadProductImageAttachments(order) {
  const selectedItems = getPaidConfirmationItems([...order.components, ...order.accessories, ...order.services]);
  const seenAssetPaths = new Map();
  const attachments = [];
  const cidByAssetPath = new Map();

  for (const [index, item] of selectedItems.entries()) {
    const assetPath = getProductImagePathForEmail(item);
    if (!assetPath) continue;

    if (seenAssetPaths.has(assetPath)) {
      cidByAssetPath.set(assetPath, seenAssetPaths.get(assetPath));
      continue;
    }

    try {
      const absolutePath = await resolvePublicAssetPath(assetPath);
      const content = await fs.readFile(absolutePath);
      const whiteBackedContent = await buildWhiteBackedProductImage(content);
      const cid = buildProductImageCid(item, index);
      attachments.push({
        filename: `${path.basename(assetPath, path.extname(assetPath))}-email.jpg`,
        content: whiteBackedContent,
        cid,
        contentType: "image/jpeg",
        contentDisposition: "inline",
      });
      seenAssetPaths.set(assetPath, cid);
      cidByAssetPath.set(assetPath, cid);
    } catch (error) {
      console.warn(`Could not attach product image for ${item.code}:`, error.message);
    }
  }

  return { attachments, cidByAssetPath };
}

function normalizeExcludedAttachmentKeys(input = []) {
  if (input instanceof Set) return input;
  if (Array.isArray(input)) {
    return new Set(input.map((value) => String(value || "").trim()).filter(Boolean));
  }
  return new Set();
}

async function loadProductInfoAttachments(order, options = {}) {
  const selectedItems = getPaidConfirmationItems([...order.components, ...order.accessories, ...order.services]);
  const excludedAttachmentKeys = normalizeExcludedAttachmentKeys(options.excludedAttachmentKeys);
  const includeContent = options.includeContent !== false;
  const seenAssetPaths = new Set();
  const attachments = [];
  const labels = [];
  const links = [];

  for (const item of selectedItems) {
    const documents = getProductInfoDocumentsForEmail(item);

    for (const document of documents) {
      const assetPath = normalizeProductInfoAssetPath(document.href);
      if (!assetPath || seenAssetPaths.has(assetPath)) continue;
      const attachmentKey = `product-info:${assetPath}`;
      if (excludedAttachmentKeys.has(attachmentKey)) continue;

      try {
        const absolutePath = await resolvePublicAssetPath(assetPath);
        if (includeContent) {
          const content = await fs.readFile(absolutePath);
          attachments.push({
            filename: buildProductInfoFilename(item, assetPath),
            content,
            contentType: "application/pdf",
          });
        } else {
          await fs.access(absolutePath);
        }
        const label = getItemDisplayName(item) || document.label || path.basename(assetPath, ".pdf");
        labels.push(label);
        links.push({ key: attachmentKey, label, href: `/${assetPath}` });
        seenAssetPaths.add(assetPath);
      } catch (error) {
        console.warn(`Could not attach product info for ${item.code}:`, error.message);
      }
    }
  }

  return { attachments, labels, links };
}

async function loadLogoBuffer() {
  const logoPath = await resolvePublicAssetPath("img/fragmentologo-cropped.jpg");
  return fs.readFile(logoPath);
}

async function applyArchitectoLetterheadTemplate(pdfBytes) {
  const templatePath = await resolvePublicAssetPath(LETTERHEAD.templatePath);
  const [contentPdf, templatePdf] = await Promise.all([
    PDFDocument.load(pdfBytes),
    fs.readFile(templatePath).then((bytes) => PDFDocument.load(bytes)),
  ]);
  const templatePage = templatePdf.getPage(0);
  const outputPdf = await PDFDocument.create();
  const templateSize = templatePage.getSize();

  for (let pageIndex = 0; pageIndex < contentPdf.getPageCount(); pageIndex += 1) {
    const [letterheadPage] = await outputPdf.copyPages(templatePdf, [0]);
    outputPdf.addPage(letterheadPage);
    const outputPage = outputPdf.getPage(pageIndex);
    const { width, height } = outputPage.getSize();
    const embeddedContentPage = await outputPdf.embedPage(contentPdf.getPage(pageIndex));

    outputPage.drawRectangle({
      x: 0,
      y: LETTERHEAD.footerHeight,
      width,
      height: Math.max(0, height - LETTERHEAD.footerHeight - LETTERHEAD.headerHeight),
      color: rgb(1, 1, 1),
      borderWidth: 0,
    });
    outputPage.drawPage(embeddedContentPage, {
      x: 0,
      y: 0,
      width: templateSize.width,
      height: templateSize.height,
    });
  }

  return outputPdf.save();
}

function formatPdfDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function drawSenderAddressBlock(doc, x, y) {
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal").setFontSize(10);
  PDF_SENDER_ADDRESS.forEach((line, index) => {
    doc.text(line, x, y + index * 13, { align: "right" });
  });
}

export function formatCurrency(num) {
  const hasFraction = Number(num) % 1 !== 0;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Number(num || 0));
}

function buildBlendeDisplayItem(item) {
  const blendeLabel = String(item?.blendeLabel || "").trim();
  if (!blendeLabel) return null;

  const blendeCode = String(item?.blendeCode || blendeLabel).trim();
  const blendePrice = item?.blendePrice == null ? 0 : Number(item.blendePrice || 0);
  const storedQuantity = Math.max(1, Math.floor(Number(item?.catalogBlendeQuantity || 1)));
  const blendeQuantity = Math.max(storedQuantity, parseTrailingQuantity(blendeLabel), parseTrailingQuantity(blendeCode));
  const catalogDisplayName = String(item?.blendeNameDe || item?.blendeName || "").trim();
  const displayLabel = catalogDisplayName || stripLeadingBlendePrefix(stripTrailingQuantity(blendeLabel));
  const displayCode = stripTrailingQuantity(blendeCode);

  return {
    ...item,
    parentCode: item.code,
    parentIconKey: item.iconKey,
    parentComponentKey: item.componentKey,
    parentName: getItemDisplayName(item),
    code: displayCode || "BLENDE",
    articleNumber: displayCode || "BLENDE",
    name: displayLabel || blendeLabel,
    nameDe: displayLabel || blendeLabel,
    price: blendePrice / blendeQuantity,
    quantity: 1,
    iconKey: "blende",
    isBlendeDisplayItem: true,
    blendeDisplayQuantity: blendeQuantity,
    productImagePath: "",
    productInfoPdfPath: "",
    productInfoSummary: "",
    productInfoKeyFacts: [],
    productInfoExtractedText: "",
    blendeCode: "",
    blendeLabel: "",
    blendePrice: null,
  };
}

function expandItemsWithBlende(items = []) {
  return items.flatMap((item) => {
    const blendeItem = buildBlendeDisplayItem(item);
    if (!blendeItem) return [item];

    const blendePrice = Number(item?.blendePrice || 0);
    const itemPrice = Number(item?.price || 0);
    const parentItem = {
      ...item,
      price: Math.max(itemPrice - blendePrice, 0),
    };
    const blendeQuantity = Math.max(1, Math.floor(Number(blendeItem.blendeDisplayQuantity || 1)));
    const blendeItems = Array.from({ length: blendeQuantity }, (_, index) => ({
      ...blendeItem,
      blendeDisplayIndex: index + 1,
    }));

    return [parentItem, ...blendeItems];
  });
}

function getPaidConfirmationItems(items = []) {
  return items.filter((item) => Number(item?.price || 0) > 0);
}

function getVisibleConfirmationItems(items = []) {
  return expandItemsWithBlende(items).filter((item) => Number(item?.price || 0) > 0);
}

function isElectricalComponentItem(item) {
  const code = String(item?.code || "").toLowerCase();
  const iconKey = String(item?.iconKey || "").toLowerCase();
  const componentKey = String(item?.componentKey || "").toLowerCase();
  const name = String(getItemDisplayName(item)).toLowerCase();
  const parentCode = String(item?.parentCode || "").toLowerCase();
  const parentIconKey = String(item?.parentIconKey || "").toLowerCase();
  const parentComponentKey = String(item?.parentComponentKey || "").toLowerCase();
  const parentName = String(item?.parentName || "").toLowerCase();
  const haystack = `${code} ${iconKey} ${componentKey} ${name} ${parentCode} ${parentIconKey} ${parentComponentKey} ${parentName}`;
  return /\b(ref|dish|wm|oven|hob|hood)\b/.test(code)
    || haystack.includes("refrigerator")
    || haystack.includes("kuehlschrank")
    || haystack.includes("dishwasher")
    || haystack.includes("geschirr")
    || haystack.includes("washing")
    || haystack.includes("wasch")
    || haystack.includes("oven")
    || haystack.includes("backofen")
    || haystack.includes("hob")
    || haystack.includes("kochfeld")
    || haystack.includes("hood")
    || haystack.includes("extractor")
    || haystack.includes("dunstabzug");
}

function splitComponentItems(items = []) {
  const visibleItems = getVisibleConfirmationItems(items);
  return {
    electricalItems: visibleItems.filter(isElectricalComponentItem),
    cabinetItems: visibleItems.filter((item) => !isElectricalComponentItem(item)),
  };
}

function buildNumberedRows(items = []) {
  let nextMainNumber = 1;
  let currentParentRow = null;
  const rows = [];

  items.forEach((item) => {
    if (item?.isBlendeDisplayItem && currentParentRow) {
      const existingBlendeItem = currentParentRow.blendeItems.find(
        (blendeItem) => getItemDisplayCode(blendeItem) === getItemDisplayCode(item)
          && getItemDisplayName(blendeItem) === getItemDisplayName(item),
      );
      if (existingBlendeItem) {
        existingBlendeItem.price = Number(existingBlendeItem.price || 0) + Number(item.price || 0);
        existingBlendeItem.blendeDisplayQuantity = Math.max(1, Math.floor(Number(existingBlendeItem.blendeDisplayQuantity || 1))) + 1;
      } else {
        const nextBlendeNumber = currentParentRow.blendeItems.length + 1;
        currentParentRow.blendeItems.push({
          ...item,
          rowNumber: `${currentParentRow.rowNumber}.${nextBlendeNumber}`,
          blendeDisplayQuantity: 1,
        });
      }
      return;
    }

    const rowNumber = String(nextMainNumber);
    currentParentRow = { item, rowNumber, blendeItems: [] };
    rows.push(currentParentRow);
    nextMainNumber += 1;
  });

  return rows;
}

function getBlendeDisplayNameWithQuantity(item) {
  const name = stripLeadingBlendePrefix(getItemDisplayName(item));
  const quantity = Math.max(1, Math.floor(Number(item?.blendeDisplayQuantity || item?.quantity || 1)));
  return quantity > 1 ? `${name} x ${quantity}` : name;
}

function drawItemIcon(doc, item, x, y, size = 16) {
  const iconKey = String(item.iconKey || "").toLowerCase();
  const name = String(getItemDisplayName(item)).toLowerCase();
  const code = String(item.code || "").toLowerCase();
  const has = (...terms) => terms.some((term) => iconKey.includes(term) || name.includes(term) || code.includes(term));
  const unit = size / 16;
  const px = (value) => x + value * unit;
  const py = (value) => y + value * unit;
  const scaled = (value) => value * unit;
  const midX = x + size / 2;
  const midY = y + size / 2;
  const bottom = y + size;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(1);

  if (has("delivery", "montage", "pickup", "logistik", "assembly")) {
    doc.rect(px(3), py(7), scaled(7), scaled(5));
    doc.line(px(10), py(8), px(13), py(8));
    doc.line(px(13), py(8), px(14), py(12));
    doc.circle(px(5), py(13), scaled(1.2));
    doc.circle(px(12), py(13), scaled(1.2));
    return;
  }

  if (has("blende", "panel")) {
    doc.setLineWidth(1.2);
    doc.rect(px(6.3), py(1.8), scaled(3.4), scaled(12.5));
    doc.setLineWidth(1);
    return;
  }

  if (has("waste", "muell")) {
    doc.line(px(5), py(5), px(11), py(5));
    doc.line(px(6), py(6), px(7), bottom - scaled(3));
    doc.line(px(10), py(6), px(9), bottom - scaled(3));
    doc.line(px(7), bottom - scaled(3), px(9), bottom - scaled(3));
    return;
  }

  if (has("cutlery", "besteck")) {
    doc.line(px(5), py(4), px(5), bottom - scaled(4));
    doc.line(px(4), py(4), px(4), py(8));
    doc.line(px(6), py(4), px(6), py(8));
    doc.line(px(10), py(4), px(10), bottom - scaled(4));
    doc.circle(px(10), py(6), scaled(2));
    return;
  }

  if (has("light", "led", "beleuchtung")) {
    doc.circle(midX, py(7), scaled(3.2));
    doc.line(midX, py(10), midX, py(13));
    doc.line(midX - scaled(2), py(13), midX + scaled(2), py(13));
    return;
  }

  if (has("refrigerator", "fridge", "kuehlschrank")) {
    doc.rect(px(5), py(2.5), scaled(6), scaled(11));
    doc.line(px(5), py(7), px(11), py(7));
    doc.line(px(10), py(4), px(10), py(5.5));
    doc.line(px(10), py(9), px(10), py(10.5));
    return;
  }

  if (has("dishwasher", "spuel", "washing", "wasch")) {
    doc.rect(px(4), py(3), scaled(8), scaled(10));
    doc.line(px(4), py(5.5), px(12), py(5.5));
    doc.circle(midX, py(9.2), scaled(2.5));
    return;
  }

  if (has("hood", "dunstabzug", "extractor")) {
    doc.rect(px(6), py(2.5), scaled(4), scaled(6));
    doc.rect(px(3.5), py(8.5), scaled(9), scaled(3));
    doc.line(px(5), py(13), px(3.5), py(15));
    doc.line(px(8), py(13), px(8), py(15));
    doc.line(px(11), py(13), px(12.5), py(15));
    return;
  }

  if (has("sink", "faucet", "spuele")) {
    doc.rect(px(3), py(8), scaled(10), scaled(5));
    doc.circle(midX, py(8), scaled(3));
    doc.setFillColor(255, 255, 255);
    doc.rect(px(4), py(8), scaled(8), scaled(3), "F");
    doc.setDrawColor(40, 40, 40);
    doc.line(midX, py(5), midX, py(8));
    doc.line(midX, py(5), px(12), py(5));
    return;
  }

  if (has("worktop", "arbeitsplatte")) {
    doc.line(px(3), py(6), px(13), py(6));
    doc.line(px(3), py(10), px(13), py(10));
    doc.line(px(13), py(6), px(13), py(10));
    return;
  }

  if (has("wall", "upper", "oberschrank")) {
    doc.rect(px(3.5), py(3), scaled(9), scaled(10));
    doc.line(px(11), py(6), px(11), py(10));
    return;
  }

  if (has("drawer", "cabinet", "schrank", "base", "unterschrank")) {
    doc.rect(px(4), py(3), scaled(8), scaled(10));
    doc.line(px(4), py(7), px(12), py(7));
    doc.line(px(6.5), py(5), px(9.5), py(5));
    doc.line(px(6.5), py(10), px(9.5), py(10));
    return;
  }

  doc.setFont("helvetica", "bold").setFontSize(scaled(7));
  doc.text(String(getItemDisplayName(item) || "?").slice(0, 2).toUpperCase(), midX, midY + 2, { align: "center" });
}

export async function generateOrderConfirmationPdf(order) {
  const doc = new jsPDF({ unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 15;
  const contentBottom = pageHeight - LETTERHEAD.footerHeight - LETTERHEAD.contentBottomPadding;
  let y = LETTERHEAD.contentTop;

  const ensureSpace = (requiredHeight = 24) => {
    if (y + requiredHeight <= contentBottom) return;
    doc.addPage();
    y = LETTERHEAD.contentTop;
  };

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold").setFontSize(22).text("Bestellbestätigung", pageWidth - margin, y + 4, {
    align: "right",
  });
  drawSenderAddressBlock(doc, pageWidth - margin, y + 31);
  y += 92;

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`Bestellnummer: ${order.orderNumber}`, margin, y);
  doc.text(`Datum: ${formatPdfDate(order.createdAt)}`, pageWidth - margin, y, { align: "right" });
  doc.text(`Küchenvertrags-Nr.: ${order.customer.contractNumber || "N/A"}`, margin, y + lineHeight);
  y += 45;

  ensureSpace(90);
  doc.setFont("helvetica", "bold").text("Kundendaten:", margin, y);
  y += lineHeight;
  doc.setFont("helvetica", "normal");
  [
    `${order.customer.firstName} ${order.customer.lastName}`,
    order.customer.address1,
    order.customer.address2,
    `${order.customer.postalCode} ${order.customer.city}`,
    order.customer.country,
    `E-Mail: ${order.customer.email}`,
    `Telefon: ${order.customer.phone}`,
    order.customer.preferredDeliveryDate
      ? `Wunschlieferwoche: ${getPreferredDeliveryWeekDisplay(order.customer.preferredDeliveryDate, order.createdAt)}`
      : "",
  ]
    .filter(Boolean)
    .forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    });

  y += 15;

  const drawSection = (title, items, options = {}) => {
    const visibleItems = options.itemsAreVisible ? items : getVisibleConfirmationItems(items);
    if (!visibleItems.length) return;
    const showCodeColumn = options.showCodeColumn !== false;

    ensureSpace(78);
    doc.setFont("helvetica", "bold").setFontSize(11).text(title, margin, y);
    y += 16;
    const headerTop = y;
    const headerHeight = 32;
    const headerX = margin;
    const headerRight = pageWidth - margin;
    const numberX = margin + 15;
    const iconX = margin + 38;
    const typeX = margin + 68;
    const codeX = margin + 320;
    const priceX = pageWidth - margin - 15;
    const typeColumnWidth = showCodeColumn ? 208 : priceX - typeX - 30;
    const codeColumnWidth = showCodeColumn ? priceX - codeX - 58 : 0;
    doc.setFillColor(249, 249, 249);
    doc.rect(headerX, headerTop, headerRight - headerX, headerHeight, "F");
    doc.setDrawColor(234, 234, 234);
    doc.line(headerX, headerTop + headerHeight, headerRight, headerTop + headerHeight);
    doc.setTextColor(51, 51, 51);
    doc.text("Nr.", numberX, headerTop + 20, { align: "center" });
    doc.text("Type", typeX, headerTop + 20);
    if (showCodeColumn) {
      doc.text("Typen-Nr.", codeX, headerTop + 20);
    }
    doc.text("Preis", priceX, headerTop + 20, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y = headerTop + headerHeight + 8;
    doc.setFont("helvetica", "normal").setFontSize(10);

    const drawPdfDivider = (dividerY, color = 234) => {
      doc.setDrawColor(color, color, color);
      doc.line(margin, dividerY, pageWidth - margin, dividerY);
      doc.setDrawColor(40, 40, 40);
    };

    buildNumberedRows(visibleItems).forEach(({ item, rowNumber, blendeItems = [] }) => {
      const nameLines = doc.splitTextToSize(getItemDisplayNameWithQuantity(item), typeColumnWidth);
      const codeLines = showCodeColumn ? doc.splitTextToSize(getItemDisplayCode(item), codeColumnWidth) : [];
      const blendeLineGroups = blendeItems.map((blendeItem) => ({
        item: blendeItem,
        rowNumber: blendeItem.rowNumber,
        nameLines: doc.splitTextToSize(getBlendeDisplayNameWithQuantity(blendeItem), typeColumnWidth),
        codeLines: showCodeColumn ? doc.splitTextToSize(getItemDisplayCode(blendeItem), codeColumnWidth) : [],
        price: formatCurrency(blendeItem.price),
      }));
      const parentBandHeight = Math.max(36, Math.max(nameLines.length, codeLines.length || 1) * lineHeight + 21);
      const blendeBandHeights = blendeLineGroups.map((group) =>
        Math.max(36, Math.max(group.nameLines.length, group.codeLines.length || 1) * lineHeight + 21)
      );
      const rowHeight = parentBandHeight + blendeBandHeights.reduce((sum, height) => sum + height, 0);
      ensureSpace(rowHeight);
      const rowTop = y;
      const rowTextY = rowTop + 18;
      const iconY = rowTextY - 14;

      doc.text(rowNumber, numberX, rowTextY, { align: "center" });
      drawItemIcon(doc, item, iconX, iconY, 26);
      nameLines.forEach((line, lineIndex) => {
        doc.text(line, typeX, rowTextY + lineIndex * lineHeight);
      });
      if (showCodeColumn) {
        codeLines.forEach((line, lineIndex) => {
          doc.text(line, codeX, rowTextY + lineIndex * lineHeight);
        });
      }
      doc.text(formatCurrency(item.price), priceX, rowTextY, { align: "right" });
      if (blendeLineGroups.length) {
        let blendeRowTop = rowTop + parentBandHeight;
        drawPdfDivider(blendeRowTop, 247);
        blendeLineGroups.forEach((group, groupIndex) => {
          const blendeY = blendeRowTop + 18;
          doc.text(group.rowNumber, numberX, blendeY, { align: "center" });
          drawItemIcon(doc, group.item, iconX + 3, blendeY - 12, 22);
          group.nameLines.forEach((line, lineIndex) => {
            doc.text(line, typeX, blendeY + lineIndex * lineHeight);
          });
          if (showCodeColumn) {
            group.codeLines.forEach((line, lineIndex) => {
              doc.text(line, codeX, blendeY + lineIndex * lineHeight);
            });
          }
          doc.text(group.price, priceX, blendeY, { align: "right" });
          blendeRowTop += blendeBandHeights[groupIndex];
        });
      }
      drawPdfDivider(rowTop + rowHeight);
      y += rowHeight;
    });

    y += 24;
  };

  const { electricalItems, cabinetItems } = splitComponentItems(order.components);
  drawSection("Küchenmöbel:", cabinetItems, { itemsAreVisible: true });
  drawSection("Elektrogeräte:", electricalItems, { itemsAreVisible: true });
  drawSection("Zubehör:", order.accessories);
  drawSection("Dienstleistungen:", order.services, { showCodeColumn: false });

  ensureSpace(70);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 18;
  const { net, vat, total } = getPriceBreakdown(order.total);
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text("Preis:", margin, y);
  doc.text(formatCurrency(net), pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text("MwSt. (19%):", margin, y);
  doc.text(formatCurrency(vat), pageWidth - margin, y, { align: "right" });
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(total), pageWidth - margin, y, { align: "right" });

  const pdfBytes = await applyArchitectoLetterheadTemplate(doc.output("arraybuffer"));

  return {
    base64: Buffer.from(pdfBytes).toString("base64"),
    filename: `Bestellbestätigung-${order.orderNumber}.pdf`,
  };
}

function buildPurchasedKitchenFilename(order) {
  const orderNumber = String(order?.orderNumber || "").trim();
  return `Gekaufte-Kueche${orderNumber ? `-${orderNumber}` : ""}.pdf`;
}

export async function buildOrderConfirmationAttachmentLabels(order, productInfoAttachments = [], options = {}) {
  const orderNumber = String(order?.orderNumber || "").trim();
  const orderId = encodeURIComponent(String(order?.id || ""));
  const orderApiPath = String(options.orderApiPath || `/api/admin/orders/${orderId}`).replace(/\/$/, "");
  const labels = [{
    key: "order-confirmation",
    label: `Bestellbestätigung${orderNumber ? `-${orderNumber}` : ""}.pdf`,
    href: `${orderApiPath}/attachments/order-confirmation?view=1`,
  }];
  const purchasedKitchenSketchPath = await resolvePurchasedKitchenSketchPath(order).catch(() => "");

  if (purchasedKitchenSketchPath) {
    labels.push({
      key: "purchased-kitchen",
      label: buildPurchasedKitchenFilename(order),
      href: `${orderApiPath}/attachments/purchased-kitchen?view=1`,
    });
  }

  labels.push(
    ...productInfoAttachments
      .map((attachment) => {
        if (typeof attachment === "string") {
          const label = attachment.trim();
          return label ? { label: `Produktinformation: ${label}`, href: "" } : null;
        }
        const label = String(attachment?.label || "").trim();
        const key = String(attachment?.key || "").trim();
        return label
          ? {
              key,
              label: `Produktinformation: ${label}`,
              href: String(attachment?.href || ""),
            }
          : null;
      })
      .filter(Boolean),
  );

  return labels;
}

function drawWrappedPdfText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

export async function generatePurchasedKitchenPdf(order) {
  const sketch = await loadPurchasedKitchenSketchPng(order);
  if (!sketch?.content?.length) {
    return null;
  }

  const doc = new jsPDF({ unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentBottom = pageHeight - LETTERHEAD.footerHeight - LETTERHEAD.contentBottomPadding;
  let y = LETTERHEAD.contentTop;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold").setFontSize(22);
  doc.text("Ihre gekaufte Küche", pageWidth - margin, y + 4, { align: "right" });
  drawSenderAddressBlock(doc, pageWidth - margin, y + 31);
  y += 92;

  doc.setFont("helvetica", "normal").setFontSize(10);
  const details = [
    ["Bestellnummer", order.orderNumber || "-"],
    ["Küchenvertrags-Nr.", order.customer?.contractNumber || "-"],
    ["Datum", formatPdfDate(order.createdAt || new Date())],
  ];
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 110, y);
    y += 14;
  });

  y += 14;
  doc.setFont("helvetica", "normal").setFontSize(11);
  y = drawWrappedPdfText(
    doc,
    "Vielen Dank für Ihre Bestellung. Die untenstehende Skizze zeigt die von Ihnen gekaufte Küche gemäß Ihrer Auswahl und der Bestellbestätigung.",
    margin,
    y,
    pageWidth - margin * 2,
    15,
  );
  y += 22;

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Küchenskizze", margin, y);
  y += 12;

  const boxX = margin;
  const boxY = y;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = Math.max(160, contentBottom - boxY - 52);
  const imageRatio = sketch.width / sketch.height;
  const boxRatio = boxWidth / boxHeight;
  const imageWidth = imageRatio > boxRatio ? boxWidth : boxHeight * imageRatio;
  const imageHeight = imageRatio > boxRatio ? boxWidth / imageRatio : boxHeight;
  const imageX = boxX + (boxWidth - imageWidth) / 2;
  const imageY = boxY + (boxHeight - imageHeight) / 2;

  doc.setDrawColor(224, 224, 224);
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, boxY, boxWidth, boxHeight, "FD");
  doc.addImage(
    `data:image/png;base64,${sketch.content.toString("base64")}`,
    "PNG",
    imageX,
    imageY,
    imageWidth,
    imageHeight,
  );

  y = boxY + boxHeight + 18;
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.setTextColor(90, 90, 90);
  drawWrappedPdfText(
    doc,
    "Diese Unterlage dient als Übersicht zur gekauften Küche. Maßgeblich sind die Bestellbestätigung sowie die vereinbarten Vertrags- und Lieferunterlagen.",
    margin,
    y,
    pageWidth - margin * 2,
    12,
  );

  const pdfBytes = await applyArchitectoLetterheadTemplate(doc.output("arraybuffer"));

  return {
    base64: Buffer.from(pdfBytes).toString("base64"),
    filename: buildPurchasedKitchenFilename(order),
  };
}

export function buildOrderSummaryHtml(order) {
  const tableStyles = "width:100%;border-collapse:collapse;table-layout:fixed;font-family:Arial,sans-serif;margin-bottom:25px;background-color:#ffffff;";
  const thStyles =
    "padding:10px 8px;border-bottom:2px solid #eaeaea;background-color:#f9f9f9;text-align:left;color:#333;";
  const tdStyles = "padding:10px 8px;border-bottom:1px solid #eaeaea;color:#555;background-color:#ffffff;";
  const subtleDividerTdStyles = "padding:10px 8px;border-bottom:1px solid #f7f7f7;color:#555;background-color:#ffffff;";
  const numberColumnStyles = "width:24px;";
  const priceColumnStyles = "width:64px;text-align:right;";
  const priceThStyles = `${thStyles}${priceColumnStyles}`;
  const priceTdStyles = `${tdStyles}${priceColumnStyles}font-weight:bold;vertical-align:top;white-space:nowrap;`;
  const typeCellStyles = `${tdStyles}vertical-align:top;word-break:break-word;overflow-wrap:anywhere;`;
  const subtleTypeCellStyles = `${subtleDividerTdStyles}vertical-align:top;word-break:break-word;overflow-wrap:anywhere;`;
  const itemNameStyles = "font-size:14px;line-height:1.35;color:#555;word-break:break-word;overflow-wrap:anywhere;";
  const itemCodeStyles = "font-size:12px;line-height:1.35;color:#777;word-break:break-word;overflow-wrap:anywhere;";
  const orderDetailsRows = [
    ["Auftragsnummer", order.orderNumber],
    ["Vertragsnummer", order.customer.contractNumber || "-"],
    ["Wunschlieferwoche", order.customer.preferredDeliveryDate ? getPreferredDeliveryWeekDisplay(order.customer.preferredDeliveryDate, order.createdAt) : "-"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="${tdStyles};font-weight:bold;width:35%;">${label}</td><td style="${tdStyles}">${value}</td></tr>`,
    )
    .join("");

  const renderSection = (title, items, imageCidByAssetPath = new Map(), options = {}) => {
    const visibleItems = options.itemsAreVisible ? items : getVisibleConfirmationItems(items);
    if (!visibleItems.length) return "";
    const showCodeLine = options.showCodeLine !== false;
    const rows = buildNumberedRows(visibleItems)
      .map(({ item, rowNumber, blendeItems = [] }) => {
        const productImagePath = getProductImagePathForEmail(item);
        const imageCid = productImagePath ? imageCidByAssetPath.get(productImagePath) : "";
        const imageHtml = imageCid
          ? `<td width="50" valign="top" bgcolor="#ffffff" style="width:50px;padding:0 6px 0 0;background-color:#ffffff;"><img src="cid:${imageCid}" alt="${escapeHtml(getItemDisplayName(item) || "Produkt")}" width="46" style="display:block;width:46px;max-width:46px;max-height:46px;height:auto;object-fit:contain;border:1px solid #eaeaea;border-radius:5px;background-color:#ffffff;" /></td>`
          : "";
        const parentTdStyles = blendeItems.length ? subtleDividerTdStyles : tdStyles;
        const parentTypeTdStyles = blendeItems.length ? subtleTypeCellStyles : typeCellStyles;
        const parentPriceTdStyles = `${parentTdStyles}${priceColumnStyles}font-weight:bold;vertical-align:top;`;
        const itemCodeHtml = showCodeLine ? `<br><span style="${itemCodeStyles}">Typen-Nr.: ${escapeHtml(getItemDisplayCode(item))}</span>` : "";
        const itemDetailsHtml = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#ffffff" style="width:100%;border-collapse:collapse;table-layout:fixed;background-color:#ffffff;"><tr>${imageHtml}<td valign="top" bgcolor="#ffffff" style="padding:0;background-color:#ffffff;${itemNameStyles}">${escapeHtml(getItemDisplayNameWithQuantity(item))}${itemCodeHtml}</td></tr></table>`;
        const parentRow = `<tr><td style="${parentTdStyles}${numberColumnStyles}font-weight:bold;vertical-align:top;">${escapeHtml(rowNumber)}</td><td style="${parentTypeTdStyles}">${itemDetailsHtml}</td><td style="${parentPriceTdStyles}white-space:nowrap;">${formatCurrency(item.price)}</td></tr>`;
        const blendeRows = blendeItems
          .map((blendeItem) => {
            const blendeCodeHtml = showCodeLine ? `<br><span style="${itemCodeStyles}">Typen-Nr.: ${escapeHtml(getItemDisplayCode(blendeItem))}</span>` : "";
            return `<tr><td style="${tdStyles}${numberColumnStyles}font-weight:bold;vertical-align:top;">${escapeHtml(blendeItem.rowNumber)}</td><td style="${typeCellStyles}"><span style="${itemNameStyles}">${escapeHtml(getBlendeDisplayNameWithQuantity(blendeItem))}</span>${blendeCodeHtml}</td><td style="${priceTdStyles}">${formatCurrency(blendeItem.price)}</td></tr>`;
          })
          .join("");
        return `${parentRow}${blendeRows}`;
      })
      .join("");

    return `<h4 style="margin-top:0;">${title}</h4><table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="${tableStyles}"><thead><tr><th bgcolor="#f9f9f9" style="${thStyles}${numberColumnStyles}">Nr.</th><th bgcolor="#f9f9f9" style="${thStyles}">Type</th><th bgcolor="#f9f9f9" style="${priceThStyles}">Preis</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  return `
    <div bgcolor="#ffffff" style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;background-color:#ffffff;">
      <div bgcolor="#ffffff" style="padding:20px;border:1px solid #ddd;border-radius:8px;background-color:#ffffff;">
        <h4 style="margin-top:0;">Bestelldaten</h4>
        <table bgcolor="#ffffff" style="${tableStyles}"><tbody>${orderDetailsRows}</tbody></table>
        ${(() => {
          const { electricalItems, cabinetItems } = splitComponentItems(order.components);
          return [
            renderSection("Neu bestätigte Küchenmöbel", cabinetItems, order.productImageCids, { itemsAreVisible: true }),
            renderSection("Neu bestätigte Elektrogeräte", electricalItems, order.productImageCids, { itemsAreVisible: true }),
          ].join("");
        })()}
        ${renderSection("Neu bestätigtes Zubehör", order.accessories, order.productImageCids)}
        ${renderSection("Neu bestätigte Dienstleistungen", order.services, order.productImageCids, { showCodeLine: false })}
        <table bgcolor="#ffffff" style="width:100%;margin-top:20px;border-top:2px solid #333;padding-top:15px;background-color:#ffffff;">
          <tr><td style="text-align:right;font-size:0.95em;color:#555;">Preis: ${formatCurrency(
            getPriceBreakdown(order.total).net,
          )}</td></tr>
          <tr><td style="text-align:right;font-size:0.95em;color:#555;">MwSt. (19%): ${formatCurrency(
            getPriceBreakdown(order.total).vat,
          )}</td></tr>
          <tr><td bgcolor="#ffffff" style="text-align:right;font-size:1.3em;font-weight:bold;background-color:#ffffff;color:#333;">Gesamtpreis: ${formatCurrency(
            order.total,
          )}</td></tr>
        </table>
      </div>
    </div>
  `;
}

export async function buildOrderConfirmationEmailStaticHtml(order, options = {}) {
  const productInfo = await loadProductInfoAttachments(order, {
    excludedAttachmentKeys: options.excludedAttachmentKeys,
    includeContent: false,
  });
  const productInfoHtml = productInfo.labels.length
    ? `<div style="margin:16px 0 0;font-family:Arial,sans-serif;color:#333;">
        <p style="margin:0 0 6px;">Produktinformationen im Anhang:</p>
        <ul style="margin:0;padding-left:20px;">
          ${productInfo.labels.map((label) => `<li style="margin:0 0 4px;">${escapeHtml(label)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  return {
    html: `
      ${buildOrderSummaryHtml(order)}
      ${productInfoHtml}
    `,
    attachmentLabels: productInfo.labels,
    attachmentLinks: productInfo.links,
    productImageAttachments: [],
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailBodyTextAsHtml(bodyText) {
  return String(bodyText || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function normalizeEmailAddress(value) {
  return String(value || "").trim();
}

function isTestOrderNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "").startsWith("111");
}

function shouldSuppressOrderSenderCopy(order) {
  return isTestOrderNumber(order?.customer?.contractNumber) || isTestOrderNumber(order?.orderNumber);
}

export function buildOrderConfirmationRecipients(customerEmail, senderEmail, options = {}) {
  const to = normalizeEmailAddress(customerEmail);
  const sender = normalizeEmailAddress(senderEmail);
  if (options.suppressSenderCopy) {
    return { to };
  }
  const cc = sender && sender.toLowerCase() !== to.toLowerCase() ? sender : "";

  return cc ? { to, cc } : { to };
}

export function buildOrderConfirmationEmailDraft(order) {
  return {
    subject: `NK ${order.orderNumber}`,
    bodyText: [
      `Hallo ${order.customer.firstName} ${order.customer.lastName},`,
      "",
      "deine Bestellung wurde bestätigt.",
      "",
      `Vertragsnummer: ${order.customer.contractNumber || order.orderNumber}.`,
      "",
      "Dein Fragmento-Team",
    ].join("\n"),
  };
}

export async function buildOrderConfirmationEmailPreview(order, overrides = {}) {
  const draft = buildOrderConfirmationEmailDraft(order);
  const subject = String(overrides.subject || draft.subject).trim() || draft.subject;
  const bodyText = String(overrides.bodyText || draft.bodyText);
  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order, {
    excludedAttachmentKeys: overrides.excludedAttachmentKeys,
  });
  const recipients = buildOrderConfirmationRecipients(order.customer.email, overrides.senderEmail, {
    suppressSenderCopy: shouldSuppressOrderSenderCopy(order),
  });

  return {
    ...recipients,
    subject,
    bodyText,
    html: `
      ${formatEmailBodyTextAsHtml(bodyText)}
      ${staticHtml.html}
    `,
    attachmentLabels: staticHtml.attachmentLabels,
    productImageAttachments: staticHtml.productImageAttachments,
  };
}

export async function sendOrderConfirmationEmail({ order, pdfBase64, pdfFilename, subject, bodyText, excludedAttachmentKeys = [] }) {
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpFrom = String(process.env.SMTP_FROM || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "");

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    const missing = [
      !smtpHost ? "SMTP_HOST" : "",
      !smtpUser ? "SMTP_USER" : "",
      !smtpPass ? "SMTP_PASS" : "",
      !smtpFrom ? "SMTP_FROM" : "",
    ].filter(Boolean).join(", ");
    throw new Error(`Email SMTP config is missing: ${missing}`);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const excludedAttachments = normalizeExcludedAttachmentKeys(excludedAttachmentKeys);
  const attachments = [];
  if (!excludedAttachments.has("order-confirmation")) {
    let effectivePdfBase64 = pdfBase64;
    let effectivePdfFilename = pdfFilename;
    if (!effectivePdfBase64) {
      const generatedPdf = await generateOrderConfirmationPdf(order);
      effectivePdfBase64 = generatedPdf.base64;
      effectivePdfFilename = generatedPdf.filename;
    }

    attachments.push({
      filename: effectivePdfFilename || `Bestellbestätigung-${order.orderNumber}.pdf`,
      content: Buffer.from(effectivePdfBase64, "base64"),
      contentType: "application/pdf",
    });
  }

  if (!excludedAttachments.has("purchased-kitchen")) {
    try {
      const purchasedKitchenPdf = await generatePurchasedKitchenPdf(order);
      if (purchasedKitchenPdf?.base64) {
        attachments.push({
          filename: purchasedKitchenPdf.filename,
          content: Buffer.from(purchasedKitchenPdf.base64, "base64"),
          contentType: "application/pdf",
        });
      }
    } catch (error) {
      console.warn(`Could not attach purchased kitchen PDF for ${order.orderNumber}:`, error.message);
    }
  }

  const productInfo = await loadProductInfoAttachments(order, {
    excludedAttachmentKeys: excludedAttachments,
  });
  attachments.push(...productInfo.attachments);

  const emailPreview = await buildOrderConfirmationEmailPreview(order, {
    subject,
    bodyText,
    senderEmail: smtpFrom,
    excludedAttachmentKeys: excludedAttachments,
  });
  attachments.push(...(emailPreview.productImageAttachments || []));

  try {
    await transporter.sendMail({
      from: `"Fragmento" <${smtpFrom}>`,
      to: emailPreview.to,
      cc: emailPreview.cc,
      subject: emailPreview.subject,
      html: emailPreview.html,
      attachments,
    });
  } catch (error) {
    throw new Error(`Email sending failed via ${smtpHost || "(missing SMTP_HOST)"}:${smtpPort} as ${smtpUser || "(missing SMTP_USER)"}: ${error.message}`);
  }
}

export function buildOrderWebhookPayload(order) {
  return {
    customer: order.customer,
    totalPrice: order.total,
    components: [...order.components, ...order.accessories, ...order.services],
    kitchen: order.kitchen,
    orderNumber: order.orderNumber,
    callback: {
      requested: true,
      trigger: "order_created",
      phone: order.customer.phone,
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      orderNumber: order.orderNumber,
      reason: "New Fragmento order placed",
    },
  };
}

export async function forwardOrderWebhook(order) {
  if (!process.env.N8N_WEBHOOK_URL) return;

  const n8nUrl = new URL(process.env.N8N_WEBHOOK_URL);
  const lib = n8nUrl.protocol === "https:" ? https : http;
  const body = JSON.stringify(buildOrderWebhookPayload(order));

  await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: n8nUrl.hostname,
        port: n8nUrl.port || (n8nUrl.protocol === "https:" ? 443 : 80),
        path: n8nUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "n8n-webhook-forwarder/2.0",
        },
      },
      (res) => {
        const statusCode = res.statusCode || 200;
        res.resume();
        res.on("end", () => {
          if (statusCode >= 400) {
            reject(new Error(`Webhook returned status ${statusCode}`));
            return;
          }
          resolve();
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
