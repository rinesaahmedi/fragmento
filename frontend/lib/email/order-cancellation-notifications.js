import nodemailer from "nodemailer";

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
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    }),
  };
}

function buildReceiptCopy(request, language = "de") {
  const receivedAt = formatReceivedAt(request.receivedAt, language);
  if (language === "de") {
    return {
      subject: `Eingang Ihres Widerrufs ${request.referenceNumber}`,
      heading: "Ihr Widerruf wurde registriert",
      intro: "Wir haben Ihre Erklärung erhalten und prüfen sie. Ihre Bestellung ist noch nicht als storniert markiert.",
      reference: "Referenz",
      order: "Vertragsnummer",
      name: "Name",
      email: "E-Mail für die Bestätigung",
      received: "Eingang",
      declaration: "Erklärung",
    };
  }
  return {
    subject: `Withdrawal received ${request.referenceNumber}`,
    heading: "Your withdrawal has been registered",
    intro: "We received your declaration and will review it. Your order has not yet been marked as cancelled.",
    reference: "Reference",
    order: "Contract number",
    name: "Name",
    email: "Confirmation email",
    received: "Received",
    declaration: "Declaration",
  };
}

export async function sendCancellationReceiptEmail(request, language = "de") {
  const { from, transporter } = getTransportConfig();
  const copy = buildReceiptCopy(request, language);
  const receivedAt = formatReceivedAt(request.receivedAt, language);
  const rows = [
    [copy.reference, request.referenceNumber],
    [copy.order, request.submittedContractNumber],
    [copy.name, request.consumerName],
    [copy.email, request.confirmationEmail],
    [copy.received, receivedAt],
  ];

  await transporter.sendMail({
    from: `"Fragmento" <${from}>`,
    to: request.confirmationEmail,
    subject: copy.subject,
    text: [copy.heading, "", copy.intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", `${copy.declaration}:`, request.declarationText].join("\n"),
    html: `
      <h2>${escapeHtml(copy.heading)}</h2>
      <p>${escapeHtml(copy.intro)}</p>
      <dl>${rows.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
      <h3>${escapeHtml(copy.declaration)}</h3>
      <p>${escapeHtml(request.declarationText)}</p>
    `,
  });
}

export async function sendCancellationInternalEmail(request, adminUrl = "") {
  const { from, transporter } = getTransportConfig();
  const recipient = String(process.env.ORDER_CANCELLATION_EMAIL || process.env.ADMIN_EMAIL || from).trim();
  if (!recipient) throw new Error("ORDER_CANCELLATION_EMAIL or ADMIN_EMAIL is required.");
  const receivedAt = formatReceivedAt(request.receivedAt, "de");
  const matchLabel = request.orderId ? "Mit Bestellung verknüpft" : "Manuelle Zuordnung erforderlich";

  await transporter.sendMail({
    from: `"Fragmento" <${from}>`,
    to: recipient,
    replyTo: request.confirmationEmail,
    subject: `Widerruf eingegangen ${request.referenceNumber} · ${request.submittedContractNumber}`,
    text: [
      "Ein neuer Widerruf ist eingegangen.",
      `Referenz: ${request.referenceNumber}`,
      `Vertragsnummer: ${request.submittedContractNumber}`,
      `Name: ${request.consumerName}`,
      `E-Mail: ${request.confirmationEmail}`,
      `Eingang: ${receivedAt}`,
      `Zuordnung: ${matchLabel}`,
      `Grund: ${request.reason || "Nicht angegeben"}`,
      "",
      request.declarationText,
      adminUrl ? `\nAdmin: ${adminUrl}` : "",
    ].join("\n"),
    html: `
      <h2>Widerruf eingegangen</h2>
      <p><strong>Referenz:</strong> ${escapeHtml(request.referenceNumber)}</p>
      <p><strong>Vertragsnummer:</strong> ${escapeHtml(request.submittedContractNumber)}</p>
      <p><strong>Name:</strong> ${escapeHtml(request.consumerName)}</p>
      <p><strong>E-Mail:</strong> ${escapeHtml(request.confirmationEmail)}</p>
      <p><strong>Eingang:</strong> ${escapeHtml(receivedAt)}</p>
      <p><strong>Zuordnung:</strong> ${escapeHtml(matchLabel)}</p>
      <p><strong>Grund:</strong> ${escapeHtml(request.reason || "Nicht angegeben")}</p>
      <p>${escapeHtml(request.declarationText)}</p>
      ${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}">Im Admin-Dashboard öffnen</a></p>` : ""}
    `,
  });
}

export async function sendCancellationDecisionEmail(request) {
  const { from, transporter } = getTransportConfig();
  const approved = request.status === "APPROVED";
  const language = request.language === "en" ? "en" : "de";
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
    text: [heading, "", message, `Referenz: ${request.referenceNumber}`, `Vertragsnummer: ${request.submittedContractNumber}`, request.adminNote ? `Hinweis: ${request.adminNote}` : ""].filter(Boolean).join("\n"),
    html: `
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(message)}</p>
      <p><strong>Referenz:</strong> ${escapeHtml(request.referenceNumber)}</p>
      <p><strong>Vertragsnummer:</strong> ${escapeHtml(request.submittedContractNumber)}</p>
      ${request.adminNote ? `<p><strong>Hinweis:</strong> ${escapeHtml(request.adminNote)}</p>` : ""}
    `,
  });
}
