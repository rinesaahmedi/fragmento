import fs from "fs/promises";
import http from "http";
import https from "https";
import { jsPDF } from "jspdf";
import nodemailer from "nodemailer";
import path from "path";

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
  const baseName = String(item.name || path.basename(assetPath, ".pdf") || "Produktinformation")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `Produktinformation-${baseName || "Produkt"}.pdf`;
}

async function loadProductInfoAttachments(order) {
  const selectedItems = [...order.components, ...order.accessories, ...order.services];
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
      labels.push(item.name || item.code || path.basename(assetPath, ".pdf"));
      seenAssetPaths.add(assetPath);
    } catch (error) {
      console.warn(`Could not attach product info for ${item.code}:`, error.message);
    }
  }

  return { attachments, labels };
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function loadLogoBuffer() {
  const logoPath = await resolvePublicAssetPath("img/fragmentologo-cropped.jpg");
  return fs.readFile(logoPath);
}

async function drawPdfLogo(doc, x, y, width) {
  const logoBuffer = await loadLogoBuffer();
  const imageData = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
  const height = (width * 205) / 920;

  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, "F");
  doc.addImage(imageData, "JPEG", x, y, width, height);

  return height;
}

function formatPdfDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

function drawItemIcon(doc, item, x, y, size = 16) {
  const iconKey = String(item.iconKey || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();
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
  doc.text(String(item.name || item.code || "?").slice(0, 2).toUpperCase(), midX, midY + 2, { align: "center" });
}

export async function generateOrderConfirmationPdf(order) {
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
    await drawPdfLogo(doc, margin, y + 8, 230);
  } catch (error) {
    console.warn("Could not draw PDF logo:", error.message);
    doc.setFont("helvetica", "bold").setFontSize(26).setTextColor(65, 55, 48).text("fragmento.", margin, y + 42);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(65, 55, 48).text("by architecto.", margin + 48, y + 56);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold").setFontSize(22).text("Bestellbestaetigung", pageWidth - margin, y, {
    align: "right",
  });
  doc.setFont("helvetica", "normal").setFontSize(9);
  ["architecto.", "by Kuechen Aktuell GmbH", "Senefelderstrasse 2b", "38124 Braunschweig"].forEach((line, index) => {
    doc.text(line, pageWidth - margin, y + 20 + index * 12, { align: "right" });
  });
  y += 105;

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
  ]
    .filter(Boolean)
    .forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    });

  y += 15;

  const drawSection = (title, items) => {
    if (!items?.length) return;

    ensureSpace(60);
    doc.setFont("helvetica", "bold").setFontSize(11).text(title, margin, y);
    y += 10;
    doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
    y += 20;
    doc.text("Artikel", margin + 36, y);
    doc.text("Item Code", margin + 300, y);
    doc.text("Preis", pageWidth - margin, y, { align: "right" });
    y += 18;
    doc.setFont("helvetica", "normal").setFontSize(10);

    items.forEach((item) => {
      const nameLines = doc.splitTextToSize(item.name || "", 228);
      const rowHeight = Math.max(nameLines.length * lineHeight, 30) + 6;
      ensureSpace(rowHeight);
      drawItemIcon(doc, item, margin, y - 8, 26);
      nameLines.forEach((line, index) => {
        doc.text(line, margin + 36, y + index * lineHeight);
      });
      doc.text(item.code || "-", margin + 300, y);
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

  return {
    base64: doc.output("datauristring").split(",")[1] || "",
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
    ["Kueche", order.kitchen.name],
    ["Auftragsnummer", order.orderNumber],
    ["Vertragsnummer", order.customer.contractNumber || "-"],
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="${tdStyles};font-weight:bold;width:35%;">${label}</td><td style="${tdStyles}">${value}</td></tr>`,
    )
    .join("");

  const renderSection = (title, items) => {
    if (!items.length) return "";
    const rows = items
      .map(
        (item) =>
          `<tr><td style="${tdStyles}">${item.name}<br><span style="font-size:12px;color:#777;">Code: ${item.code || "-"}</span></td><td style="${priceTdStyles}">${formatCurrency(
            item.price,
          )}</td></tr>`,
      )
      .join("");

    return `<h4 style="margin-top:0;">${title}</h4><table style="${tableStyles}"><thead><tr><th style="${thStyles}">Artikel</th><th style="${thStyles}">Preis</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  return `
    <div style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;">
      <div style="padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h4 style="margin-top:0;">Bestelldaten</h4>
        <table style="${tableStyles}"><tbody>${orderDetailsRows}</tbody></table>
        ${renderSection("Neu bestaetigte Komponenten", order.components)}
        ${renderSection("Neu bestaetigtes Zubehoer", order.accessories)}
        ${renderSection("Neu bestaetigte Dienstleistungen", order.services)}
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
  const productInfoHtml = productInfo.labels.length
    ? `<p>Produktinformationen im Anhang: ${productInfo.labels.join(", ")}.</p>`
    : "";

  return {
    html: `
      ${buildOrderSummaryHtml(order)}
      ${productInfoHtml}
    `,
    attachmentLabels: productInfo.labels,
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
      `Bestellte Kueche: ${order.kitchen.name}.`,
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

  let logoBuffer = null;
  try {
    logoBuffer = await loadLogoBuffer();
  } catch (error) {
    console.warn("Could not fetch logo:", error.message);
  }

  let effectivePdfBase64 = pdfBase64;
  let effectivePdfFilename = pdfFilename;
  if (!effectivePdfBase64) {
    const generatedPdf = await generateOrderConfirmationPdf(order);
    effectivePdfBase64 = generatedPdf.base64;
    effectivePdfFilename = generatedPdf.filename;
  }

  const attachments = [];
  if (logoBuffer) {
    attachments.push({
      filename: "fragmentologo.jpg",
      content: logoBuffer,
      cid: "logo@fragmento",
      contentType: "image/jpeg",
      contentDisposition: "inline",
    });
  }

  if (effectivePdfBase64) {
    attachments.push({
      filename: effectivePdfFilename || `Bestellbestaetigung-${order.orderNumber}.pdf`,
      content: Buffer.from(effectivePdfBase64, "base64"),
      contentType: "application/pdf",
    });
  }

  const productInfo = await loadProductInfoAttachments(order);
  attachments.push(...productInfo.attachments);

  const logoHtml = logoBuffer
    ? '<div style="margin-bottom:16px"><img src="cid:logo@fragmento" alt="Fragmento" style="height:70px;object-fit:contain" /></div>'
    : "";
  const emailPreview = await buildOrderConfirmationEmailPreview(order, { subject, bodyText });

  try {
    await transporter.sendMail({
      from: `"Fragmento" <${smtpFrom}>`,
      to: order.customer.email,
      subject: emailPreview.subject,
      html: `
        ${logoHtml}
        ${emailPreview.html}
      `,
      attachments,
    });
  } catch (error) {
    throw new Error(`Email sending failed via ${smtpHost || "(missing SMTP_HOST)"}:${smtpPort} as ${smtpUser || "(missing SMTP_USER)"}: ${error.message}`);
  }
}

export async function forwardOrderWebhook(order) {
  if (!process.env.N8N_WEBHOOK_URL) return;

  const n8nUrl = new URL(process.env.N8N_WEBHOOK_URL);
  const lib = n8nUrl.protocol === "https:" ? https : http;
  const body = JSON.stringify({
    customer: order.customer,
    totalPrice: order.total,
    components: [...order.components, ...order.accessories, ...order.services],
    kitchen: order.kitchen,
    orderNumber: order.orderNumber,
  });

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
