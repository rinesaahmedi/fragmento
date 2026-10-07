import { createGuardedSmtpTransport } from "./local-email-safety.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatReceivedAt(value, language = "de") {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "long",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

function formatDate(value, language = "de") {
  if (!value) return "";
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function renderDetailRows(rows) {
  return rows.map(([label, value], index) => `
    <tr>
      <th scope="row" style="width:38%;padding:12px 14px;text-align:left;vertical-align:top;border-bottom:${index === rows.length - 1 ? "0" : "1px solid #eadfd3"};color:#74665b;font-size:13px;line-height:1.4;font-weight:700;">
        ${escapeHtml(label)}
      </th>
      <td style="padding:12px 14px;vertical-align:top;border-bottom:${index === rows.length - 1 ? "0" : "1px solid #eadfd3"};color:#332820;font-size:14px;line-height:1.5;overflow-wrap:anywhere;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `).join("");
}

function renderReceiptHtml(copy, rows, declarationText) {
  return `<!doctype html>
  <html lang="${copy.language}">
    <body style="margin:0;padding:0;background:#f3ebe2;font-family:Arial,Helvetica,sans-serif;color:#332820;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3ebe2;">
        <tr>
          <td align="center" style="padding:32px 14px;">
            <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#ffffff;border:1px solid #dfd1c3;border-radius:18px;overflow:hidden;">
              <tr>
                <td style="padding:28px 32px;background:#7b3f2d;color:#ffffff;">
                  <div style="margin-bottom:8px;font-size:11px;line-height:1.2;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#f5d9ca;">FRAGMENTO · ${escapeHtml(copy.eyebrow)}</div>
                  <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(copy.heading)}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 10px;">
                  <div style="padding:16px 18px;border-left:4px solid #3f8a5d;border-radius:8px;background:#eef8f1;">
                    <div style="margin-bottom:4px;color:#286b45;font-size:14px;font-weight:800;">${escapeHtml(copy.status)}</div>
                    <p style="margin:0;color:#43594a;font-size:14px;line-height:1.6;">${escapeHtml(copy.intro)}</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 8px;">
                  <h2 style="margin:0 0 10px;color:#63392c;font-size:17px;line-height:1.3;">${escapeHtml(copy.details)}</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #eadfd3;border-radius:10px;border-collapse:separate;border-spacing:0;background:#fffdfb;">
                    ${renderDetailRows(rows)}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 10px;">
                  <h2 style="margin:0 0 10px;color:#63392c;font-size:17px;line-height:1.3;">${escapeHtml(copy.declaration)}</h2>
                  <p style="margin:0;padding:16px 18px;border-radius:10px;background:#f8f1ea;color:#3e3028;font-size:14px;line-height:1.65;">${escapeHtml(declarationText)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 30px;">
                  <div style="padding-top:18px;border-top:1px solid #eadfd3;">
                    <h2 style="margin:0 0 6px;color:#63392c;font-size:15px;line-height:1.3;">${escapeHtml(copy.nextTitle)}</h2>
                    <p style="margin:0;color:#74665b;font-size:13px;line-height:1.6;">${escapeHtml(copy.nextText)}</p>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;color:#8a7c70;font-size:11px;line-height:1.5;">${escapeHtml(copy.footer)}</p>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function getTransportConfig() {
  const host = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "");
  const from = String(process.env.SMTP_FROM || "").trim();

  const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS", !from && "SMTP_FROM"].filter(Boolean);
  if (missing.length) {
    throw new Error(`Email SMTP config is missing: ${missing.join(", ")}`);
  }

  return {
    from,
    transporter: createGuardedSmtpTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
  };
}

async function sendVerifiedMail(transporter, options) {
  const delivery = await transporter.sendMail(options);
  const target = String(options.to).trim().toLowerCase();
  if (!delivery.accepted?.some((address) => String(address).trim().toLowerCase() === target)) {
    throw new Error(`SMTP did not accept the intended recipient: ${target}`);
  }
  return delivery;
}

function buildReceiptCopy(request, language = "de") {
  const receivedAt = formatReceivedAt(request.receivedAt, language);
  if (language === "de") {
    return {
      language: "de",
      subject: `Widerrufsbestätigung – Vertrag ${request.submittedContractNumber}`,
      eyebrow: "Widerruf eingegangen",
      heading: "Ihr Widerruf wurde registriert",
      status: "Erfolgreich übermittelt",
      intro: "Wir haben Ihre Erklärung erhalten. Über den weiteren Verlauf informieren wir Sie per E-Mail.",
      details: "Angaben zum Widerruf",
      reference: "Widerrufsreferenz",
      order: "Vertragsnummer",
      goods: "Waren / Dienstleistung",
      orderedOn: "Bestellt am",
      receivedOn: "Erhalten am",
      name: "Name",
      address: "Anschrift",
      email: "E-Mail für die Bestätigung",
      reason: "Grund des Widerrufs (freiwillig)",
      received: "Eingang",
      declaration: "Erklärung",
      nextTitle: "Wie geht es weiter?",
      nextText: "Wir prüfen Ihre Erklärung und informieren Sie per E-Mail über die endgültige Entscheidung. Bewahren Sie diese Nachricht als Eingangsbestätigung auf.",
      footer: "Diese Nachricht wurde automatisch von Fragmento versendet.",
    };
  }
  return {
    language: "en",
    subject: `Withdrawal confirmation – Contract ${request.submittedContractNumber}`,
    eyebrow: "Withdrawal received",
    heading: "Your withdrawal has been registered",
    status: "Successfully submitted",
    intro: "We received your declaration and will review it. Your order has not yet been marked as cancelled.",
    details: "Withdrawal details",
    reference: "Withdrawal reference",
    order: "Contract number",
    goods: "Goods / service",
    orderedOn: "Ordered on",
    receivedOn: "Received on",
    name: "Name",
    address: "Address",
    email: "Confirmation email",
    reason: "Reason for withdrawal (optional)",
    received: "Received",
    declaration: "Declaration",
    nextTitle: "What happens next?",
    nextText: "We will review your declaration and notify you by email of the final decision. Keep this message as your acknowledgement of receipt.",
    footer: "This is an automated message from Fragmento.",
  };
}

export async function sendCancellationReceiptEmail(request) {
  const language = "de";
  const { from, transporter } = getTransportConfig();
  const copy = buildReceiptCopy(request, language);
  const receivedAt = formatReceivedAt(request.receivedAt, language);
  const rows = [
    [copy.reference, request.referenceNumber],
    [copy.order, request.submittedContractNumber],
    [copy.goods, request.productDescription],
    [copy.orderedOn, formatDate(request.orderedOn, language)],
    [copy.receivedOn, formatDate(request.receivedOn, language)],
    [copy.name, request.consumerName],
    [copy.address, request.consumerAddress],
    [copy.email, request.confirmationEmail],
    [copy.reason, request.reason],
    [copy.received, receivedAt],
  ].filter(([, value]) => value);

  return sendVerifiedMail(transporter, {
    from: `"Fragmento" <${from}>`,
    to: request.confirmationEmail,
    subject: copy.subject,
    text: [copy.heading, "", copy.intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", `${copy.declaration}:`, request.declarationText].join("\n"),
    html: renderReceiptHtml(copy, rows, request.declarationText),
  });
}

function getInternalRows(request) {
  const notProvided = "Nicht angegeben";
  return [
    ["Widerrufs-ID", request.referenceNumber],
    ["Vertragsnummer", request.submittedContractNumber],
    ["Name des Verbrauchers", request.consumerName],
    ["Anschrift", request.consumerAddress || notProvided],
    ["E-Mail-Adresse", request.confirmationEmail],
    ["Waren / Dienstleistung", request.productDescription || notProvided],
    ["Bestellt am", formatDate(request.orderedOn, "de") || notProvided],
    ["Erhalten am", formatDate(request.receivedOn, "de") || notProvided],
    ["Grund des Widerrufs", request.reason || notProvided],
    ["Widerrufserklärung", request.declarationText],
    ["Eingang (Datum und Uhrzeit)", formatReceivedAt(request.receivedAt, "de")],
    ["Zuordnung", request.orderId ? "Mit Bestellung verknüpft" : "Manuelle Zuordnung erforderlich"],
  ];
}

export function renderCancellationInternalHtml(request, adminUrl = "") {
  return `<!doctype html>
    <html lang="de">
      <body style="margin:0;padding:24px;background:#f3ebe2;font-family:Arial,Helvetica,sans-serif;color:#332820;">
        <div style="max-width:660px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #dfd1c3;border-radius:12px;">
          <h1 style="margin:0 0 8px;font-size:22px;">Widerruf eingegangen</h1>
          <p style="margin:0 0 20px;font-size:14px;">Alle bestätigten Angaben zum Widerruf:</p>
          <table cellspacing="0" cellpadding="0" style="width:100%;border:1px solid #eadfd3;border-collapse:separate;border-spacing:0;">
            ${renderDetailRows(getInternalRows(request))}
          </table>
          ${adminUrl ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(adminUrl)}">Im Admin-Dashboard öffnen</a></p>` : ""}
        </div>
      </body>
    </html>`;
}

export async function sendCancellationInternalEmail(request, adminUrl = "") {
  const { from, transporter } = getTransportConfig();
  const recipient = String(process.env.ORDER_CANCELLATION_EMAIL || "").trim();
  if (!recipient) throw new Error("ORDER_CANCELLATION_EMAIL is required.");
  const rows = getInternalRows(request);

  return sendVerifiedMail(transporter, {
    from: `"Fragmento" <${from}>`,
    to: recipient,
    replyTo: request.confirmationEmail,
    subject: `Neuer Widerruf – Vertrag ${request.submittedContractNumber}`,
    text: ["Ein neuer Widerruf ist eingegangen.", "", ...rows.map(([label, value]) => `${label}: ${value}`), adminUrl ? `\nAdmin: ${adminUrl}` : ""].join("\n"),
    html: renderCancellationInternalHtml(request, adminUrl),
  });
}

export async function sendCancellationDecisionEmail(request) {
  const { from, transporter } = getTransportConfig();
  const approved = request.status === "APPROVED";
  const language = "de";
  const subject = approved
    ? language === "de" ? `Bestellung storniert ${request.submittedContractNumber}` : `Order cancelled ${request.submittedContractNumber}`
    : language === "de" ? `Entscheidung zu Ihrem Widerruf ${request.referenceNumber}` : `Decision about your withdrawal ${request.referenceNumber}`;
  const heading = approved
    ? language === "de" ? "Ihre Bestellung wurde storniert" : "Your order has been cancelled"
    : language === "de" ? "Ihr Widerruf wurde geprüft" : "Your withdrawal has been reviewed";
  const message = approved
    ? language === "de" ? "Die Bestellung wurde als storniert markiert." : "The order has been marked as cancelled."
    : language === "de" ? "Die Bestellung bleibt unverändert. Die Begründung finden Sie unten." : "The order remains unchanged. The explanation is shown below.";

  await transporter.sendMail({
    from: `"Fragmento" <${from}>`,
    to: request.confirmationEmail,
    subject,
    text: [heading, "", message, `Widerrufsreferenz: ${request.referenceNumber}`, `Vertragsnummer: ${request.submittedContractNumber}`, request.adminNote ? `Hinweis: ${request.adminNote}` : ""].filter(Boolean).join("\n"),
    html: `
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(message)}</p>
      <p><strong>Widerrufsreferenz:</strong> ${escapeHtml(request.referenceNumber)}</p>
      <p><strong>Vertragsnummer:</strong> ${escapeHtml(request.submittedContractNumber)}</p>
      ${request.adminNote ? `<p><strong>Hinweis:</strong> ${escapeHtml(request.adminNote)}</p>` : ""}
    `,
  });
}
