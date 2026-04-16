import { formatCurrency } from "./kitchen-selection-utils";

const PDF_COMPANY_ADDRESS = [
  "architecto.",
  "by Kuechen Aktuell GmbH",
  "Senefelderstrasse 2b",
  "38124 Braunschweig",
];

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

async function loadPdfLogoImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image at ${url}.`));
    img.src = url;
  });
}

async function renderLogoDataUrl() {
  const logoImage = await loadPdfLogoImage("/img/fragmentologo-cropped.jpg");
  const scale = 2;
  const logoWidth = 920;
  const logoHeight = 205;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(logoWidth * scale);
  canvas.height = Math.round(logoHeight * scale);
  const context = canvas.getContext("2d");

  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(logoImage, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

export async function generateOrderPdf(order) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const lineHeight = 15;
  let y = margin;

  const ensureSpace = (requiredHeight = 24) => {
    if (y + requiredHeight <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  try {
    const imageData = await renderLogoDataUrl();
    if (imageData) doc.addImage(imageData, "JPEG", margin, y + 4, 230, 51);
  } catch (error) {
    console.error("Konnte das Logo fuer das PDF nicht laden:", error);
  }

  doc.setFont("helvetica", "bold").setFontSize(22).text("Bestellbestaetigung", pageWidth - margin, y, {
    align: "right",
  });
  doc.setFont("helvetica", "normal").setFontSize(9);
  PDF_COMPANY_ADDRESS.forEach((line, index) => {
    doc.text(line, pageWidth - margin, y + 20 + index * 12, { align: "right" });
  });
  y += 120;

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

    items.forEach((item) => {
      const nameLines = doc.splitTextToSize(item.name || "", 230);
      const rowHeight = Math.max(nameLines.length, 1) * lineHeight + 5;
      ensureSpace(rowHeight);
      nameLines.forEach((line, index) => {
        doc.text(line, margin, y + index * lineHeight);
      });
      doc.text(item.code || "-", margin + 250, y);
      doc.text(formatCurrency(item.price), pageWidth - margin, y, { align: "right" });
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
  return {
    blob: doc.output("blob"),
    filename,
  };
}
