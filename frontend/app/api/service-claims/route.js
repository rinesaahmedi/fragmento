import fs from "fs/promises";
import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import path from "path";
import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";
import {
  isMissingAttachmentsJsonColumnError,
  isMissingProblemAreasJsonColumnError,
} from "../../../lib/service-claim-admin-query";
import { persistServiceClaimAttachments } from "../../../lib/service-claim-attachments-storage";
import { getServiceClaimContractDetails } from "../../../lib/service-claims";
import { KITCHEN_AREA_FIRST_LINE_PREFIXES } from "../../../lib/service-claim-problem-description";
import { stripProductDimensionsFromLabel } from "../../../lib/product-label-format";

function descriptionHasClientKitchenAreasLine(text) {
  const first = String(text || "").split("\n")[0] || "";
  return KITCHEN_AREA_FIRST_LINE_PREFIXES.some((p) => first.startsWith(p));
}

function requiredString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function optionalString(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function mergeProblemAreasIntoDescription(problemDescription, problemAreasJsonRaw) {
  const base = String(problemDescription || "").trim();
  if (descriptionHasClientKitchenAreasLine(base)) {
    return base;
  }
  const raw = String(problemAreasJsonRaw || "").trim();
  if (!raw) {
    return base;
  }
  try {
    const areas = JSON.parse(raw);
    if (!Array.isArray(areas) || areas.length === 0) {
      return base;
    }
    const lines = areas
      .map((a) => {
        const name = stripProductDimensionsFromLabel(String(a?.name || "").trim());
        const code = String(a?.code || "").trim();
        if (name && code) {
          return `- ${name} (${code})`;
        }
        if (name) {
          return `- ${name}`;
        }
        if (code) {
          return `- ${code}`;
        }
        return null;
      })
      .filter(Boolean);
    if (!lines.length) {
      return base;
    }
    return `Ausgewählte Küchenbereiche:\n${lines.join("\n")}\n\n${base}`.trim();
  } catch {
    return base;
  }
}

function normalizeProblemAreasJson(problemAreasJsonRaw) {
  const raw = String(problemAreasJsonRaw || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const areas = JSON.parse(raw);
    if (!Array.isArray(areas) || areas.length === 0) {
      return null;
    }
    const normalized = areas
      .map((area) => {
        const componentId = String(area?.componentId || "").trim();
        const name = stripProductDimensionsFromLabel(String(area?.name || "").trim());
        const code = String(area?.code || "").trim();
        if (!componentId && !name && !code) {
          return null;
        }
        return { componentId, name, code };
      })
      .filter(Boolean);
    return normalized.length ? JSON.stringify(normalized) : null;
  } catch {
    return null;
  }
}

function requiredGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized !== "female" && normalized !== "male" && normalized !== "prefer_not_to_say") {
    throw new Error("Gender is required.");
  }
  return normalized;
}

function genderDisplayLabel(gender) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  if (gender === "prefer_not_to_say") return "Prefer not to say";
  return String(gender || "-");
}

function buildCustomerFullName({ givenName, surname, gender }) {
  const combined = [givenName, surname].filter(Boolean).join(" ").trim();
  if (gender === "female" || gender === "male") {
    return `${combined} (${gender})`;
  }
  return combined;
}

function combinePersonName(givenName, surname) {
  return [givenName, surname].filter(Boolean).join(" ").trim();
}

function buildPartyContactBlock(givenName, surname, phone, email) {
  return [
    `Vorname: ${givenName}`,
    `Nachname: ${surname}`,
    `Telefon: ${phone || "—"}`,
    `E-Mail: ${email || "—"}`,
  ].join("\n");
}

async function postWebhook(payload) {
  const webhookUrl = String(process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return false;
  }

  const target = new URL(webhookUrl);
  const requestBody = JSON.stringify(payload);
  const lib = target.protocol === "https:" ? https : http;

  await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "fragmento-service-claims/1.0",
        },
      },
      (res) => {
        res.resume();
        res.on("end", resolve);
      },
    );

    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });

  return true;
}

async function sendComplaintEmail(payload, attachmentParts = []) {
  const recipient = String(process.env.SERVICE_REQUEST_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const smtpHost = String(process.env.SMTP_HOST || "").trim();
  const smtpFrom = String(process.env.SMTP_FROM || "").trim();

  if (!recipient || !smtpHost || !smtpFrom) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const logoAttachment = await buildLogoAttachment();
  const userFiles = attachmentParts.map((part) => ({
    filename: part.filename,
    content: part.content,
    contentType: part.contentType,
    contentDisposition: "attachment",
  }));
  const attachments = [...(logoAttachment ? [logoAttachment] : []), ...userFiles];

  await transporter.sendMail({
    from: `"Fragmento" <${smtpFrom}>`,
    to: recipient,
    subject: `Reklamation ${payload.contractNumber} - ${payload.customerDisplayName}`,
    replyTo: payload.email || undefined,
    text: buildComplaintEmailText(payload),
    html: `${buildComplaintEmailLogoHtml(Boolean(logoAttachment))}${buildComplaintEmailHtml(payload)}`,
    attachments,
  });

  return true;
}

async function buildLogoAttachment() {
  const logoPath = path.join(process.cwd(), "public", "img", "fragmentologo-cropped.jpg");

  try {
    const content = await fs.readFile(logoPath);
    return {
      filename: "fragmento-logo.jpg",
      content,
      cid: "logo@fragmento",
      contentType: "image/jpeg",
      contentDisposition: "inline",
    };
  } catch {
    return null;
  }
}

function buildComplaintEmailLogoHtml(hasLogo) {
  if (!hasLogo) {
    return "";
  }
  return '<div style="margin-bottom:16px"><img src="cid:logo@fragmento" alt="Fragmento" style="height:70px;object-fit:contain;border:0;" /></div>';
}

function formatEmailFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractAvailabilityFromDescription(description) {
  const raw = String(description || "");
  const match = raw.match(/^Erreichbarkeit\s*:\s*(.+)$/m);
  if (!match) {
    return { description: raw.trim(), availability: "" };
  }
  const availability = match[1].trim();
  const cleaned = raw
    .replace(/^Erreichbarkeit\s*:\s*.+$/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { description: cleaned, availability };
}

function buildComplaintEmailText(payload) {
  const landlordBlock = buildPartyContactBlock(
    payload.landlordGivenName,
    payload.landlordSurname,
    payload.landlordPhone,
    payload.landlordEmail,
  );
  const hausBlock = buildPartyContactBlock(
    payload.hausmeisterGivenName,
    payload.hausmeisterSurname,
    payload.hausmeisterPhone,
    payload.hausmeisterEmail,
  );
  const { description: problemText, availability } = extractAvailabilityFromDescription(
    payload.problemDescription,
  );
  return [
    "Servicereklamation",
    "",
    `Vertragsnummer: ${payload.contractNumber}`,
    `Kunde: ${payload.givenName} ${payload.surname} (${payload.genderLabel})`,
    `Adresse: ${payload.clientAddress}`,
    `Telefon: ${payload.phone || "—"}`,
    `E-Mail: ${payload.email || "—"}`,
    `Seriennummer: ${payload.serialNumber}`,
    "",
    "Vermieter",
    landlordBlock,
    "",
    "Hausmeister",
    hausBlock,
    "",
    "Problem",
    problemText,
    ...(availability ? ["", `Erreichbarkeit: ${availability}`] : []),
    ...(payload.attachmentsMeta?.length
      ? [
          "",
          "Anhaenge (siehe E-Mail-Anhaenge):",
          ...payload.attachmentsMeta.map(
            (entry) =>
              `- ${entry.filename} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`,
          ),
        ]
      : []),
  ].join("\n");
}

function buildComplaintEmailHtml(payload) {
  const tableStyles = "width:100%;border-collapse:collapse;font-family:Arial,sans-serif;";
  const tdStyles = "padding:12px 15px;border-bottom:1px solid #eaeaea;color:#555;vertical-align:top;";
  const customerName = escapeHtml(`${payload.givenName} ${payload.surname}`.trim());
  const landlordValue = [
    `${payload.landlordGivenName} ${payload.landlordSurname}`.trim(),
    payload.landlordPhone ? `Telefon: ${payload.landlordPhone}` : "",
    payload.landlordEmail ? `E-Mail: ${payload.landlordEmail}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const hausValue = [
    `${payload.hausmeisterGivenName} ${payload.hausmeisterSurname}`.trim(),
    payload.hausmeisterPhone ? `Telefon: ${payload.hausmeisterPhone}` : "",
    payload.hausmeisterEmail ? `E-Mail: ${payload.hausmeisterEmail}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { description: problemText, availability } = extractAvailabilityFromDescription(
    payload.problemDescription,
  );
  const detailRows = [
    ["Vertragsnummer", payload.contractNumber],
    ["Vorname", payload.givenName],
    ["Nachname", payload.surname],
    ["Geschlecht", payload.genderLabel],
    ["Kundenadresse", payload.clientAddress],
    ["Telefon", payload.phone || "—"],
    ["E-Mail", payload.email || "—"],
    ["Seriennummer", payload.serialNumber],
    ["Vermieter", landlordValue],
    ["Hausmeister", hausValue],
    ["Problem", problemText],
    ...(availability ? [["Erreichbarkeit", availability]] : []),
  ];

  const tbody = detailRows
    .map(
      ([label, value]) =>
        `<tr><td style="${tdStyles}font-weight:bold;width:35%;">${escapeHtml(label)}</td><td style="${tdStyles}">${formatMultiline(
          value,
        )}</td></tr>`,
    )
    .join("");

  const attachmentsRow =
    payload.attachmentsMeta?.length > 0
      ? `<tr><td style="${tdStyles}font-weight:bold;width:35%;">Anhaenge</td><td style="${tdStyles}">${payload.attachmentsMeta
          .map(
            (entry) =>
              `${escapeHtml(entry.filename)} (${escapeHtml(entry.contentType)}, ${escapeHtml(
                formatEmailFileSize(entry.size),
              )})`,
          )
          .join("<br />")}</td></tr>`
      : "";

  return `
    <div style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;">
      <p style="margin:0 0 16px;line-height:1.5;">
        Neue Servicereklamation zu Vertrag <strong>${escapeHtml(payload.contractNumber)}</strong>
        (${customerName}).
      </p>
      <div style="padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h4 style="margin-top:0;">Reklamationsdaten</h4>
        <table style="${tableStyles}"><tbody>${tbody}${attachmentsRow}</tbody></table>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#777;">
        E-Mail automatisch gesendet (Fragmento Servicemeldung).
      </p>
    </div>
  `;
}

function formatMultiline(value) {
  return escapeHtml(value || "-").replaceAll("\n", "<br />");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const MAX_SERVICE_CLAIM_ATTACHMENTS = 5;
const MAX_SERVICE_CLAIM_FILE_BYTES = 4 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const EXTENSION_TO_MIME = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sanitizeServiceClaimFilename(name) {
  let base = String(name || "attachment").replace(/^\.*[\\/]+/g, "");
  base = base.split(/[/\\]/).pop() || "attachment";
  base = base.replace(/[^\w.\- ()\u00C0-\u024F]+/g, "_");
  if (base.length > 120) {
    const dot = base.lastIndexOf(".");
    const ext = dot > 0 ? base.slice(dot) : "";
    base = `${base.slice(0, 110)}${ext}`;
  }
  return base || "attachment";
}

function getAttachmentExtension(filename) {
  const safe = sanitizeServiceClaimFilename(filename);
  const dot = safe.lastIndexOf(".");
  if (dot <= 0 || dot === safe.length - 1) return "";
  return safe.slice(dot + 1).toLowerCase();
}

function inferAttachmentContentType(filename, declared) {
  const trimmed = String(declared || "").toLowerCase().split(";")[0].trim();
  if (trimmed && trimmed !== "application/octet-stream") {
    return trimmed;
  }
  const ext = getAttachmentExtension(filename);
  return EXTENSION_TO_MIME[ext] || "application/octet-stream";
}

function isAllowedServiceClaimAttachment(mime, filename) {
  const normalized = String(mime || "").toLowerCase().split(";")[0].trim();
  if (normalized === "image/svg+xml") {
    return false;
  }
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(normalized)) return true;
  if (normalized.startsWith("image/")) return true;
  if (normalized === "application/octet-stream" || normalized === "") {
    const ext = getAttachmentExtension(filename);
    return Boolean(EXTENSION_TO_MIME[ext]);
  }
  return false;
}

async function normalizeServiceClaimUploads(files) {
  if (!files.length) {
    return [];
  }
  if (files.length > MAX_SERVICE_CLAIM_ATTACHMENTS) {
    throw new Error(`You can upload at most ${MAX_SERVICE_CLAIM_ATTACHMENTS} files.`);
  }
  const parts = [];
  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }
    if (file.size <= 0) {
      continue;
    }
    if (file.size > MAX_SERVICE_CLAIM_FILE_BYTES) {
      throw new Error("Each attachment must be 4 MB or smaller.");
    }
    const filename = sanitizeServiceClaimFilename(file.name);
    const declaredType = file.type;
    if (!isAllowedServiceClaimAttachment(declaredType, filename)) {
      throw new Error(
        "One or more files use a type that is not allowed. Use PDF, images, or common office documents.",
      );
    }
    const contentType = inferAttachmentContentType(filename, declaredType);
    const buffer = Buffer.from(await file.arrayBuffer());
    parts.push({
      filename,
      contentType,
      content: buffer,
      size: buffer.length,
    });
  }
  return parts;
}

async function parseServiceClaimRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body = {};
    for (const [key, value] of formData.entries()) {
      if (key === "attachments") {
        continue;
      }
      if (typeof value === "string") {
        body[key] = value;
      }
    }
    const rawFiles = formData.getAll("attachments").filter((entry) => entry instanceof File);
    const attachmentParts = await normalizeServiceClaimUploads(rawFiles);
    return { body, attachmentParts };
  }

  const body = await request.json();
  return { body, attachmentParts: [] };
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims:${clientIp}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const { body, attachmentParts } = await parseServiceClaimRequest(request);
    const contractNumber = requiredString(body.contractNumber, "Contract number");
    const contract = await getServiceClaimContractDetails(contractNumber);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const landlordGivenName = optionalString(body.landlordGivenName);
    const landlordSurname = optionalString(body.landlordSurname);
    const landlordNameJoined = combinePersonName(landlordGivenName, landlordSurname);
    const landlordName = landlordNameJoined || null;
    const landlordPhone = optionalString(body.landlordPhone);
    const landlordEmail = optionalString(body.landlordEmail);
    const hausmeisterGivenName = optionalString(body.hausmeisterGivenName);
    const hausmeisterSurname = optionalString(body.hausmeisterSurname);
    const hausmeisterNameJoined = combinePersonName(hausmeisterGivenName, hausmeisterSurname);
    const hausmeisterName = hausmeisterNameJoined || null;
    const hausmeisterPhone = optionalString(body.hausmeisterPhone);
    const hausmeisterEmail = optionalString(body.hausmeisterEmail);
    const givenName = requiredString(body.givenName, "Name");
    const surname = requiredString(body.surname, "Surname");
    requiredString(body.clientFloor, "Floor");
    requiredString(body.clientUnitNumber, "Unit number");
    const gender = requiredGender(body.gender);
    const genderLabel = genderDisplayLabel(gender);
    const customerDisplayName = [givenName, surname].filter(Boolean).join(" ").trim();
    const fullName = buildCustomerFullName({ givenName, surname, gender });
    const problemAreasJson = normalizeProblemAreasJson(body.problemAreasJson);
    const problemDescription = mergeProblemAreasIntoDescription(
      optionalString(body.problemDescription),
      optionalString(body.problemAreasJson),
    );
    if (!problemDescription) {
      throw new Error("Problem description is required.");
    }
    const payload = {
      id: crypto.randomUUID(),
      contractNumber,
      givenName,
      surname,
      gender,
      genderLabel,
      customerDisplayName,
      fullName,
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      clientAddress: requiredString(body.clientAddress, "Client address"),
      clientCountry: requiredString(body.clientCountry, "Client country"),
      clientCity: requiredString(body.clientCity, "Client city"),
      clientPostalCode: requiredString(body.clientPostalCode, "Client postal code"),
      landlordGivenName,
      landlordSurname,
      landlordName,
      landlordPhone,
      landlordEmail,
      hausmeisterGivenName,
      hausmeisterSurname,
      hausmeisterName,
      hausmeisterPhone,
      hausmeisterEmail,
      landlordContact: [
        `Landlord: ${landlordNameJoined || "—"}`,
        `Landlord phone: ${landlordPhone || "-"}`,
        `Landlord email: ${landlordEmail || "-"}`,
        `Hausmeister: ${hausmeisterNameJoined || "—"}`,
        `Hausmeister phone: ${hausmeisterPhone || "-"}`,
        `Hausmeister email: ${hausmeisterEmail || "-"}`,
      ].join("\n"),
      problemDescription,
      problemAreasJson,
      serialNumber: requiredString(body.serialNumber, "Serial number"),
      requestType: "complaint",
      attachmentsMeta: attachmentParts.map(({ filename, contentType, size }) => ({
        filename,
        contentType,
        size,
      })),
    };

    if (!payload.phone && !payload.email) {
      return NextResponse.json(
        { error: "Please provide at least a phone number or an email address." },
        { status: 400 },
      );
    }

    const attachmentsJson =
      payload.attachmentsMeta.length > 0 ? JSON.stringify(payload.attachmentsMeta) : null;

    try {
      await prisma.$executeRaw`
      INSERT INTO "ServiceClaim" (
        "id",
        "contractNumber",
        "fullName",
        "phone",
        "email",
        "clientAddress",
        "clientCountry",
        "clientCity",
        "clientPostalCode",
        "landlordName",
        "landlordPhone",
        "landlordEmail",
        "hausmeisterName",
        "hausmeisterPhone",
        "hausmeisterEmail",
        "landlordContact",
        "problemDescription",
        "serialNumber",
        "requestType",
        "problemAreasJson",
        "attachmentsJson"
      )
      VALUES (
        ${payload.id},
        ${payload.contractNumber},
        ${payload.fullName},
        ${payload.phone || null},
        ${payload.email || null},
        ${payload.clientAddress},
        ${payload.clientCountry},
        ${payload.clientCity},
        ${payload.clientPostalCode},
        ${payload.landlordName},
        ${payload.landlordPhone || null},
        ${payload.landlordEmail || null},
        ${payload.hausmeisterName},
        ${payload.hausmeisterPhone || null},
        ${payload.hausmeisterEmail || null},
        ${payload.landlordContact},
        ${payload.problemDescription},
        ${payload.serialNumber},
        ${payload.requestType},
        ${payload.problemAreasJson},
        ${attachmentsJson}
      )
    `;
    } catch (insertError) {
      if (isMissingProblemAreasJsonColumnError(insertError)) {
        await prisma.$executeRaw`
      INSERT INTO "ServiceClaim" (
        "id",
        "contractNumber",
        "fullName",
        "phone",
        "email",
        "clientAddress",
        "clientCountry",
        "clientCity",
        "clientPostalCode",
        "landlordName",
        "landlordPhone",
        "landlordEmail",
        "hausmeisterName",
        "hausmeisterPhone",
        "hausmeisterEmail",
        "landlordContact",
        "problemDescription",
        "serialNumber",
        "requestType",
        "attachmentsJson"
      )
      VALUES (
        ${payload.id},
        ${payload.contractNumber},
        ${payload.fullName},
        ${payload.phone || null},
        ${payload.email || null},
        ${payload.clientAddress},
        ${payload.clientCountry},
        ${payload.clientCity},
        ${payload.clientPostalCode},
        ${payload.landlordName},
        ${payload.landlordPhone || null},
        ${payload.landlordEmail || null},
        ${payload.hausmeisterName},
        ${payload.hausmeisterPhone || null},
        ${payload.hausmeisterEmail || null},
        ${payload.landlordContact},
        ${payload.problemDescription},
        ${payload.serialNumber},
        ${payload.requestType},
        ${attachmentsJson}
      )
    `;
      } else if (!isMissingAttachmentsJsonColumnError(insertError)) {
        throw insertError;
      } else {
        await prisma.$executeRaw`
      INSERT INTO "ServiceClaim" (
        "id",
        "contractNumber",
        "fullName",
        "phone",
        "email",
        "clientAddress",
        "clientCountry",
        "clientCity",
        "clientPostalCode",
        "landlordName",
        "landlordPhone",
        "landlordEmail",
        "hausmeisterName",
        "hausmeisterPhone",
        "hausmeisterEmail",
        "landlordContact",
        "problemDescription",
        "serialNumber",
        "requestType",
        "problemAreasJson"
      )
      VALUES (
        ${payload.id},
        ${payload.contractNumber},
        ${payload.fullName},
        ${payload.phone || null},
        ${payload.email || null},
        ${payload.clientAddress},
        ${payload.clientCountry},
        ${payload.clientCity},
        ${payload.clientPostalCode},
        ${payload.landlordName},
        ${payload.landlordPhone || null},
        ${payload.landlordEmail || null},
        ${payload.hausmeisterName},
        ${payload.hausmeisterPhone || null},
        ${payload.hausmeisterEmail || null},
        ${payload.landlordContact},
        ${payload.problemDescription},
        ${payload.serialNumber},
        ${payload.requestType},
        ${payload.problemAreasJson}
      )
    `;
      }
    }

    if (attachmentParts.length) {
      try {
        await persistServiceClaimAttachments(payload.id, attachmentParts);
      } catch (persistError) {
        console.error("Service claim attachment persist error:", persistError);
      }
    }

    const [emailSent, webhookSent] = await Promise.all([
      sendComplaintEmail(payload, attachmentParts),
      postWebhook(payload),
    ]);

    return NextResponse.json({
      success: true,
      message:
        emailSent || webhookSent
          ? "Your complaint has been sent successfully."
          : "Your complaint has been recorded successfully. Email or webhook delivery is not configured yet.",
      notifications: {
        emailSent,
        webhookSent,
      },
    });
  } catch (error) {
    console.error("Service claim submit error:", error);
    return NextResponse.json(
      { error: error.message || "The complaint request could not be processed." },
      { status: error.status || 500 },
    );
  }
}
