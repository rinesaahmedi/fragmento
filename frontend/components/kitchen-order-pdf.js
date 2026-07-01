import { jsPDF } from "jspdf";
import { PDFDocument, rgb } from "pdf-lib";
import { formatCurrency } from "./kitchen-selection-utils";

const PDF_COMPANY_ADDRESS = [
  "architecto.",
  "by Kuechen Aktuell GmbH",
  "Senefelderstrasse 2b",
  "38124 Braunschweig",
];

const LETTERHEAD = {
  headerHeight: 74,
  footerHeight: 66,
  contentTop: 114,
  contentBottomPadding: 24,
  templateUrl: "/pdfs/architecto-letterhead.pdf",
};

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

export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("PDF could not be encoded."));
        return;
      }
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("PDF could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function applyArchitectoLetterheadTemplate(pdfBytes) {
  const [contentPdf, templatePdf] = await Promise.all([
    PDFDocument.load(pdfBytes),
    fetch(LETTERHEAD.templateUrl).then((response) => {
      if (!response.ok) throw new Error(`Could not load letterhead template: ${response.status}`);
      return response.arrayBuffer();
    }).then((bytes) => PDFDocument.load(bytes)),
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

function buildBlendeDisplayItem(item) {
  const blendeLabel = String(item?.blendeLabel || "").trim();
  if (!blendeLabel) return null;

  const blendeCode = String(item?.blendeCode || blendeLabel).trim();
  const blendePrice = item?.blendePrice == null ? 0 : Number(item.blendePrice || 0);

  return {
    ...item,
    code: blendeCode || "BLENDE",
    name: `Blende ${blendeLabel}`,
    price: blendePrice,
    blendeCode: "",
    blendeLabel: "",
    blendePrice: null,
  };
}

function expandItemsWithBlende(items = []) {
  return items.flatMap((item) => {
    const blendeItem = buildBlendeDisplayItem(item);
    if (!blendeItem) return [item];

    const blendePrice = Number(blendeItem.price || 0);
    const itemPrice = Number(item?.price || 0);
    const parentItem = {
      ...item,
      price: Math.max(itemPrice - blendePrice, 0),
    };

    return [parentItem, blendeItem];
  });
}

export async function generateOrderPdf(order) {
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

  doc.setFont("helvetica", "bold").setFontSize(22).text("Bestellbestaetigung", pageWidth - margin, y + 4, {
    align: "right",
  });
  doc.setFont("helvetica", "normal").setFontSize(9);
  PDF_COMPANY_ADDRESS.forEach((line, index) => {
    doc.text(line, pageWidth - margin, y + 20 + index * 12, { align: "right" });
  });
  y += 92;

  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text(`Bestellnummer: ${order.orderNumber}`, margin, y);
  doc.text(`Datum: ${order.createdAt}`, pageWidth - margin, y, { align: "right" });
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

  if (order.customer.notes) {
    y += 8;
    ensureSpace(50);
    doc.setFont("helvetica", "bold").text("Anmerkungen:", margin, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(order.customer.notes, pageWidth - margin * 2);
    noteLines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    });
  }

  y += 15;

  const drawSection = (title, items) => {
    if (!items?.length) return;

    ensureSpace(55);
    doc.setFont("helvetica", "bold").text(title, margin, y);
    y += 10;
    doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
    y += 20;
    doc.text("Artikel", margin, y);
    doc.text("Item Code", margin + 250, y);
    doc.text("Preis", pageWidth - margin, y, { align: "right" });
    y += 20;
    doc.setFont("helvetica", "normal");

    expandItemsWithBlende(items).forEach((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      const lineTotal = Number(item.price || 0) * quantity;
      const displayName = quantity > 1 ? `${item.name || ""} (${quantity}x)` : (item.name || "");
      const nameLines = doc.splitTextToSize(displayName, 230);
      const rowHeight = Math.max(nameLines.length, 1) * lineHeight + 5;
      ensureSpace(rowHeight);
      nameLines.forEach((line, index) => {
        doc.text(line, margin, y + index * lineHeight);
      });
      doc.text(item.code || "-", margin + 250, y);
      doc.text(formatCurrency(lineTotal), pageWidth - margin, y, { align: "right" });
      y += rowHeight;
    });

    y += 10;
  };

  drawSection("Komponenten:", order.components);
  drawSection("Zubehoer:", order.accessories);
  drawSection("Dienstleistungen:", order.services);

  ensureSpace(40);
  doc.setDrawColor(150).line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text("Gesamtpreis:", margin, y);
  doc.text(formatCurrency(order.total), pageWidth - margin, y, { align: "right" });

  const filename = `Bestellung-${order.orderNumber}.pdf`;
  const pdfBytes = await applyArchitectoLetterheadTemplate(doc.output("arraybuffer"));
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    filename,
  };
}
