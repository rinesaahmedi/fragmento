import fs from "fs/promises";
import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import path from "path";

const PRODUCT_INFO_BY_CODE = {
  "DISH-600-STD": {
    assetPath: "product-info/dishwasher-product-info.pdf",
    filename: "Produktinformation-Geschirrspueler.pdf",
    label: "Geschirrspueler",
  },
  "REF-545-1800-700": {
    assetPath: "product-info/fridge-product-info.pdf",
    filename: "Produktinformation-Kuehlschrank.pdf",
    label: "Kuehlschrank",
  },
  "HOOD-600-FLAT": {
    assetPath: "product-info/extractor-hood-flat-product-info.pdf",
    filename: "Produktinformation-Dunstabzugshaube-Flach.pdf",
    label: "Dunstabzugshaube flach",
  },
  "WM-B-EWA34660W": {
    assetPath: "product-info/washing-machine-product-info.pdf",
    filename: "Produktinformation-Waschmaschine.pdf",
    label: "Waschmaschine",
  },
  "DISH-B-600-STD": {
    assetPath: "product-info/dishwasher-product-info.pdf",
    filename: "Produktinformation-Geschirrspueler.pdf",
    label: "Geschirrspueler",
  },
  "REF-B-545-1800-700": {
    assetPath: "product-info/fridge-product-info.pdf",
    filename: "Produktinformation-Kuehlschrank.pdf",
    label: "Kuehlschrank",
  },
  "HOOD-B-FH664621E": {
    assetPath: "product-info/extractor-hood-flat-product-info.pdf",
    filename: "Produktinformation-Dunstabzugshaube-Flach.pdf",
    label: "Dunstabzugshaube flach",
  },
  "REF-C-545-1800-700": {
    assetPath: "product-info/fridge-product-info.pdf",
    filename: "Produktinformation-Kuehlschrank.pdf",
    label: "Kuehlschrank",
  },
  "HOOD-C-FH664621E": {
    assetPath: "product-info/extractor-hood-chimney-product-info.pdf",
    filename: "Produktinformation-Dunstabzugshaube-Kamin.pdf",
    label: "Dunstabzugshaube Kamin",
  },
  "WM-C-EWA34660W": {
    assetPath: "product-info/washing-machine-product-info.pdf",
    filename: "Produktinformation-Waschmaschine.pdf",
    label: "Waschmaschine",
  },
  "DISH-C-600-STD": {
    assetPath: "product-info/dishwasher-product-info.pdf",
    filename: "Produktinformation-Geschirrspueler.pdf",
    label: "Geschirrspueler",
  },
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

async function loadProductInfoAttachments(order) {
  const selectedItems = [...order.components, ...order.accessories, ...order.services];
  const seenAssetPaths = new Set();
  const attachments = [];
  const labels = [];

  for (const item of selectedItems) {
    const config = PRODUCT_INFO_BY_CODE[item.code];
    if (!config || seenAssetPaths.has(config.assetPath)) continue;

    try {
      const absolutePath = await resolvePublicAssetPath(config.assetPath);
      const content = await fs.readFile(absolutePath);
      attachments.push({
        filename: config.filename,
        content,
        contentType: "application/pdf",
      });
      labels.push(config.label);
      seenAssetPaths.add(config.assetPath);
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
  const logoPath = await resolvePublicAssetPath("img/fragmentologo.png");
  return fs.readFile(logoPath);
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

export async function sendOrderConfirmationEmail({ order, pdfBase64, pdfFilename }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT || "0", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let logoBuffer = null;
  try {
    logoBuffer = await loadLogoBuffer();
  } catch (error) {
    console.warn("Could not fetch logo:", error.message);
  }

  const attachments = [];
  if (logoBuffer) {
    attachments.push({
      filename: "fragmentologo.png",
      content: logoBuffer,
      cid: "logo@fragmento",
      contentType: "image/png",
      contentDisposition: "inline",
    });
  }

  if (pdfBase64) {
    attachments.push({
      filename: pdfFilename || `Bestellung-${order.orderNumber}.pdf`,
      content: Buffer.from(pdfBase64, "base64"),
      contentType: "application/pdf",
    });
  }

  const productInfo = await loadProductInfoAttachments(order);
  attachments.push(...productInfo.attachments);

  const logoHtml = logoBuffer
    ? '<div style="margin-bottom:16px"><img src="cid:logo@fragmento" alt="Fragmento" style="height:70px;object-fit:contain" /></div>'
    : "";
  const productInfoHtml = productInfo.labels.length
    ? `<p>Produktinformationen im Anhang: ${productInfo.labels.join(", ")}.</p>`
    : "";

  await transporter.sendMail({
    from: `"Fragmento" <${process.env.SMTP_FROM}>`,
    to: order.customer.email,
    subject: `Bestellbestaetigung #${order.orderNumber}`,
    html: `
      ${logoHtml}
      <p>Hallo ${order.customer.firstName} ${order.customer.lastName},</p>
      <p>deine Bestellung wurde bestaetigt.</p>
      <p>Bestellte Kueche: <strong>${order.kitchen.name}</strong>.</p>
      ${buildOrderSummaryHtml(order)}
      ${productInfoHtml}
      <p>Dein Fragmento-Team</p>
    `,
    attachments,
  });
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
