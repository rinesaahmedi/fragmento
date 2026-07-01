import fs from "fs/promises";
import http from "http";
import https from "https";
import { jsPDF } from "jspdf";
import nodemailer from "nodemailer";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";

const LETTERHEAD = {
  headerHeight: 74,
  footerHeight: 66,
  contentTop: 114,
  contentBottomPadding: 24,
  templatePath: "pdfs/architecto-letterhead.pdf",
};

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

function normalizeProductImageAssetPath(imagePath) {
  const normalized = String(imagePath || "").trim().replace(/^\/+/, "");
  return normalized || "";
}

function buildProductImageCid(item, index) {
  const code = String(item.code || item.name || `product-${index}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `product-image-${code || index}@fragmento`;
}

function getItemDisplayCode(item) {
  return String(item?.articleNumber || item?.code || "-").trim() || "-";
}

function getItemDisplayName(item) {
  return String(item?.nameDe || item?.name || item?.code || "").trim();
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

async function loadProductImageAttachments(order) {
  const selectedItems = getPaidConfirmationItems([...order.components, ...order.accessories, ...order.services]);
  const seenAssetPaths = new Map();
  const attachments = [];
  const cidByAssetPath = new Map();

  for (const [index, item] of selectedItems.entries()) {
    const assetPath = normalizeProductImageAssetPath(item.productImagePath);
    if (!assetPath) continue;

    if (seenAssetPaths.has(assetPath)) {
      cidByAssetPath.set(assetPath, seenAssetPaths.get(assetPath));
      continue;
    }

    try {
      const absolutePath = await resolvePublicAssetPath(assetPath);
      const content = await fs.readFile(absolutePath);
      const ext = path.extname(assetPath).toLowerCase();
      const contentType = ext === ".png" ? "image/png" : "image/jpeg";
      const cid = buildProductImageCid(item, index);
      attachments.push({
        filename: path.basename(assetPath),
        content,
        cid,
        contentType,
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

async function loadProductInfoAttachments(order) {
  const selectedItems = getPaidConfirmationItems([...order.components, ...order.accessories, ...order.services]);
  const seenAssetPaths = new Set();
  const attachments = [];
  const labels = [];

  for (const item of selectedItems) {
    const assetPath = normalizeProductInfoAssetPath(item.productInfoPdfPath);
    if (!assetPath || seenAssetPaths.has(assetPath)) continue;

    try {
      const absolutePath = await resolvePublicAssetPath(assetPath);
      const content = await fs.readFile(absolutePath);
      attachments.push({
        filename: buildProductInfoFilename(item, assetPath),
        content,
        contentType: "application/pdf",
      });
      labels.push(getItemDisplayName(item) || path.basename(assetPath, ".pdf"));
      seenAssetPaths.add(assetPath);
    } catch (error) {
      console.warn(`Could not attach product info for ${item.code}:`, error.message);
    }
  }

  return { attachments, labels };
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

function formatDateOnly(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
  const blendeQuantity = Math.max(parseTrailingQuantity(blendeLabel), parseTrailingQuantity(blendeCode));
  const displayLabel = stripTrailingQuantity(blendeLabel);
  const displayCode = stripTrailingQuantity(blendeCode);

  return {
    ...item,
    code: displayCode || "BLENDE",
    articleNumber: displayCode || "BLENDE",
    name: `Blende ${displayLabel || blendeLabel}`,
    nameDe: `Blende ${displayLabel || blendeLabel}`,
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
  const haystack = `${code} ${iconKey} ${componentKey} ${name}`;
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
  const name = getItemDisplayName(item);
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
    doc.line(px(4), py(4), px(12), py(4));
    doc.line(px(4), py(7), px(12), py(7));
    doc.line(px(4), py(10), px(12), py(10));
    doc.line(px(4), py(13), px(12), py(13));
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

  if (has("drawer", "cabinet", "schrank", "base", "wall")) {
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
  doc.setFont("helvetica", "bold").setFontSize(22).text("Bestellbestaetigung", pageWidth - margin, y + 4, {
    align: "right",
  });
  doc.setFont("helvetica", "normal").setFontSize(9);
  ["architecto.", "by Kuechen Aktuell GmbH", "Senefelderstrasse 2b", "38124 Braunschweig"].forEach((line, index) => {
    doc.text(line, pageWidth - margin, y + 20 + index * 12, { align: "right" });
  });
  y += 92;

  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`Bestellnummer: ${order.orderNumber}`, margin, y);
  doc.text(`Datum: ${formatPdfDate(order.createdAt)}`, pageWidth - margin, y, { align: "right" });
  doc.text(`Kuechenvertragsnr.: ${order.customer.contractNumber || "N/A"}`, margin, y + lineHeight);
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
      ? `Gewuenschter Liefertermin: ${formatDateOnly(order.customer.preferredDeliveryDate)}`
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

    ensureSpace(60);
    doc.setFont("helvetica", "bold").setFontSize(11).text(title, margin, y);
    y += 10;
    doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
    y += 20;
    doc.text("Nr.", margin, y);
    doc.text("Artikel", margin + 58, y);
    doc.text("Item Code", margin + 320, y);
    doc.text("Preis", pageWidth - margin, y, { align: "right" });
    y += 18;
    doc.setFont("helvetica", "normal").setFontSize(10);

    buildNumberedRows(visibleItems).forEach(({ item, rowNumber, blendeItems = [] }) => {
      const nameLines = doc.splitTextToSize(getItemDisplayNameWithQuantity(item), 208);
      const blendeLineGroups = blendeItems.map((blendeItem) => ({
        rowNumber: blendeItem.rowNumber,
        nameLines: doc.splitTextToSize(getBlendeDisplayNameWithQuantity(blendeItem), 208),
        code: getItemDisplayCode(blendeItem),
        price: formatCurrency(blendeItem.price),
      }));
      const blendeTextHeight = blendeLineGroups.reduce((sum, group) => sum + (group.nameLines.length + 1) * lineHeight, 0);
      const rowHeight = Math.max(nameLines.length * lineHeight + blendeTextHeight, 30) + 8;
      ensureSpace(rowHeight);
      doc.text(rowNumber, margin, y);
      drawItemIcon(doc, item, margin + 22, y - 12, 26);
      nameLines.forEach((line, index) => {
        doc.text(line, margin + 58, y + index * lineHeight);
      });
      doc.text(getItemDisplayCode(item), margin + 320, y);
      doc.text(formatCurrency(item.price), pageWidth - margin, y, { align: "right" });
      if (blendeLineGroups.length) {
        let blendeY = y + nameLines.length * lineHeight + 4;
        blendeLineGroups.forEach((group) => {
          doc.text(group.rowNumber, margin, blendeY);
          group.nameLines.forEach((line, index) => {
            doc.text(line, margin + 58, blendeY + index * lineHeight);
          });
          doc.text(`Code: ${group.code}`, margin + 58, blendeY + group.nameLines.length * lineHeight);
          doc.text(group.price, pageWidth - margin, blendeY, { align: "right" });
          blendeY += (group.nameLines.length + 1) * lineHeight;
        });
      }
      y += rowHeight;
    });

    y += 10;
  };

  const { electricalItems, cabinetItems } = splitComponentItems(order.components);
  drawSection("Kuechenmoebel:", cabinetItems, { itemsAreVisible: true });
  drawSection("Elektrogeraete:", electricalItems, { itemsAreVisible: true });
  drawSection("Zubehoer:", order.accessories);
  drawSection("Dienstleistungen:", order.services);

  ensureSpace(40);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(order.total), pageWidth - margin, y, { align: "right" });

  const pdfBytes = await applyArchitectoLetterheadTemplate(doc.output("arraybuffer"));

  return {
    base64: Buffer.from(pdfBytes).toString("base64"),
    filename: `Bestellbestaetigung-${order.orderNumber}.pdf`,
  };
}

export function buildOrderSummaryHtml(order) {
  const tableStyles = "width:100%;border-collapse:collapse;font-family:Arial,sans-serif;margin-bottom:25px;";
  const thStyles =
    "padding:12px 15px;border-bottom:2px solid #eaeaea;background-color:#f9f9f9;text-align:left;color:#333;";
  const tdStyles = "padding:12px 15px;border-bottom:1px solid #eaeaea;color:#555;";
  const priceTdStyles = `${tdStyles} text-align:right;font-weight:bold;`;
  const orderDetailsRows = [
    ["Auftragsnummer", order.orderNumber],
    ["Vertragsnummer", order.customer.contractNumber || "-"],
    ["Gewuenschter Liefertermin", order.customer.preferredDeliveryDate ? formatDateOnly(order.customer.preferredDeliveryDate) : "-"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="${tdStyles};font-weight:bold;width:35%;">${label}</td><td style="${tdStyles}">${value}</td></tr>`,
    )
    .join("");

  const renderSection = (title, items, imageCidByAssetPath = new Map(), options = {}) => {
    const visibleItems = options.itemsAreVisible ? items : getVisibleConfirmationItems(items);
    if (!visibleItems.length) return "";
    const rows = buildNumberedRows(visibleItems)
      .map(({ item, rowNumber, blendeItems = [] }) => {
        const productImagePath = normalizeProductImageAssetPath(item.productImagePath);
        const imageCid = productImagePath ? imageCidByAssetPath.get(productImagePath) : "";
        const imageHtml = imageCid
          ? `<img src="cid:${imageCid}" alt="${escapeHtml(getItemDisplayName(item) || "Produkt")}" style="width:72px;max-height:64px;object-fit:contain;border:1px solid #eaeaea;border-radius:6px;background:#fff;margin-right:12px;vertical-align:middle;" />`
          : "";
        const blendeHtml = blendeItems
          .map((blendeItem) => `<div style="margin-top:8px;">${escapeHtml(getBlendeDisplayNameWithQuantity(blendeItem))}<br><span style="font-size:12px;color:#777;">Code: ${escapeHtml(getItemDisplayCode(blendeItem))}</span></div>`)
          .join("");
        const blendeNumberHtml = blendeItems
          .map((blendeItem) => `<div style="margin-top:24px;">${escapeHtml(blendeItem.rowNumber)}</div>`)
          .join("");
        const blendePriceHtml = blendeItems
          .map((blendeItem) => `<div style="margin-top:8px;">${formatCurrency(blendeItem.price)}</div>`)
          .join("");

        return `<tr><td style="${tdStyles};width:34px;font-weight:bold;vertical-align:top;"><div>${escapeHtml(rowNumber)}</div>${blendeNumberHtml}</td><td style="${tdStyles}"><div style="display:flex;align-items:flex-start;gap:12px;">${imageHtml}<div>${escapeHtml(getItemDisplayNameWithQuantity(item))}<br><span style="font-size:12px;color:#777;">Code: ${escapeHtml(getItemDisplayCode(item))}</span>${blendeHtml}</div></div></td><td style="${priceTdStyles}">${formatCurrency(
            item.price,
          )}${blendePriceHtml}</td></tr>`;
      })
      .join("");

    return `<h4 style="margin-top:0;">${title}</h4><table style="${tableStyles}"><thead><tr><th style="${thStyles};width:34px;">Nr.</th><th style="${thStyles}">Artikel</th><th style="${thStyles}">Preis</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  return `
    <div style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;">
      <div style="padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h4 style="margin-top:0;">Bestelldaten</h4>
        <table style="${tableStyles}"><tbody>${orderDetailsRows}</tbody></table>
        ${(() => {
          const { electricalItems, cabinetItems } = splitComponentItems(order.components);
          return [
            renderSection("Neu bestaetigte Kuechenmoebel", cabinetItems, order.productImageCids, { itemsAreVisible: true }),
            renderSection("Neu bestaetigte Elektrogeraete", electricalItems, order.productImageCids, { itemsAreVisible: true }),
          ].join("");
        })()}
        ${renderSection("Neu bestaetigtes Zubehoer", order.accessories, order.productImageCids)}
        ${renderSection("Neu bestaetigte Dienstleistungen", order.services, order.productImageCids)}
        <table style="width:100%;margin-top:20px;border-top:2px solid #333;padding-top:15px;">
          <tr><td style="text-align:right;font-size:1.3em;font-weight:bold;">Gesamtpreis: ${formatCurrency(
            order.total,
          )}</td></tr>
        </table>
      </div>
    </div>
  `;
}

export async function buildOrderConfirmationEmailStaticHtml(order) {
  const productInfo = await loadProductInfoAttachments(order);
  const productImages = await loadProductImageAttachments(order);
  const orderWithProductImages = {
    ...order,
    productImageCids: productImages.cidByAssetPath,
  };
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
      ${buildOrderSummaryHtml(orderWithProductImages)}
      ${productInfoHtml}
    `,
    attachmentLabels: productInfo.labels,
    productImageAttachments: productImages.attachments,
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

export function buildOrderConfirmationEmailDraft(order) {
  return {
    subject: `Bestellbestaetigung #${order.orderNumber}`,
    bodyText: [
      `Hallo ${order.customer.firstName} ${order.customer.lastName},`,
      "",
      "deine Bestellung wurde bestaetigt.",
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
  const staticHtml = await buildOrderConfirmationEmailStaticHtml(order);

  return {
    to: order.customer.email,
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

export async function sendOrderConfirmationEmail({ order, pdfBase64, pdfFilename, subject, bodyText }) {
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

  let effectivePdfBase64 = pdfBase64;
  let effectivePdfFilename = pdfFilename;
  if (!effectivePdfBase64) {
    const generatedPdf = await generateOrderConfirmationPdf(order);
    effectivePdfBase64 = generatedPdf.base64;
    effectivePdfFilename = generatedPdf.filename;
  }

  const attachments = [];
  if (effectivePdfBase64) {
    attachments.push({
      filename: effectivePdfFilename || `Bestellbestaetigung-${order.orderNumber}.pdf`,
      content: Buffer.from(effectivePdfBase64, "base64"),
      contentType: "application/pdf",
    });
  }

  const productInfo = await loadProductInfoAttachments(order);
  attachments.push(...productInfo.attachments);

  const emailPreview = await buildOrderConfirmationEmailPreview(order, { subject, bodyText });
  attachments.push(...(emailPreview.productImageAttachments || []));
  const customerEmail = String(order.customer.email || "").trim();
  const copyToSender = smtpFrom && customerEmail.toLowerCase() !== smtpFrom.toLowerCase()
    ? smtpFrom
    : undefined;

  try {
    await transporter.sendMail({
      from: `"Fragmento" <${smtpFrom}>`,
      to: customerEmail,
      cc: copyToSender,
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
  if (process.env.N8N_WEBHOOK_ENABLED !== "true") return;
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
