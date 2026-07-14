import fs from "fs/promises";
import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import path from "path";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";
import {
  isMissingAttachmentsJsonColumnError,
  isMissingProblemAreasJsonColumnError,
} from "../../../lib/service-claim-admin-query";
import { persistServiceClaimAttachments } from "../../../lib/service-claim-attachments-storage";
import { renderClaimKitchenPreviewPng } from "../../../lib/claim-kitchen-preview";
import {
  getServiceClaimContractDetails,
  normalizeServiceClaimContractNumber,
} from "../../../lib/service-claims";
import { formatServiceClaimProblemArea, formatServiceClaimProblemAreaList, parseServiceClaimProblemAreas } from "../../../lib/service-claim-problem-areas";
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

function booleanFromFormValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function parseSerialNumberEntries(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const normalized = parseServiceClaimProblemAreas(problemAreasJsonRaw);
  return normalized.length ? JSON.stringify(normalized) : null;
}

function formatAttachmentLabel(entry) {
  const areaName = String(entry?.areaName || "").trim();
  const areaCode = String(entry?.areaCode || "").trim();
  const role = String(entry?.role || "").trim();
  const areaLabel = areaName && areaCode
    ? `${areaName} (${areaCode})`
    : areaName || areaCode;

  if (role === "problem_area" && areaLabel) {
    return `[${areaLabel}] ${entry.filename}`;
  }
  if (role === "serial_number") {
    return `[Serial number] ${entry.filename}`;
  }
  return entry.filename;
}

function requiredGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized !== "female" && normalized !== "male" && normalized !== "ms" && normalized !== "prefer_not_to_say") {
    throw new Error("Salutation is required.");
  }
  return normalized;
}

function genderDisplayLabel(gender) {
  if (gender === "male") return "Herr";
  if (gender === "female" || gender === "ms") return "Frau";
  if (gender === "prefer_not_to_say") return "Keine Angabe";
  return String(gender || "-");
}

function optionalGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female" || normalized === "male" || normalized === "ms" || normalized === "prefer_not_to_say") {
    return normalized;
  }
  return "";
}

function formatContactPersonName({ gender, givenName, surname, legacyName = "" }) {
  const joined = combinePersonName(givenName, surname);
  const person = legacyName || joined;
  if (!person) {
    return "";
  }
  if (gender === "female" || gender === "male" || gender === "ms") {
    return `${genderDisplayLabel(gender)} ${person}`;
  }
  return person;
}

function buildCustomerFullName({ givenName, surname, gender }) {
  const combined = [givenName, surname].filter(Boolean).join(" ").trim();
  if (gender === "female" || gender === "male" || gender === "ms") {
    return `${genderDisplayLabel(gender)} ${combined}`;
  }
  return combined;
}

function combinePersonName(givenName, surname) {
  return [givenName, surname].filter(Boolean).join(" ").trim();
}

function buildPartyContactBlock(contact) {
  const companyName = String(contact?.companyName || "").trim();
  const companyPhone = String(contact?.companyPhone || "").trim();
  const companyEmail = String(contact?.companyEmail || "").trim();
  const contactPerson = String(contact?.contactPerson || "").trim();
  const givenName = String(contact?.givenName || "").trim();
  const surname = String(contact?.surname || "").trim();
  const phone = String(contact?.phone || "").trim();
  const email = String(contact?.email || "").trim();
  const resolvedContactPerson =
    formatContactPersonName({
      gender: contact?.gender,
      givenName: contact?.contactGivenName || givenName,
      surname: contact?.contactSurname || surname,
      legacyName: contactPerson,
    }) || "—";

  return [
    `Firma: ${companyName || "—"}`,
    `Firma Telefon: ${companyPhone || "—"}`,
    `Firma E-Mail: ${companyEmail || "—"}`,
    `Ansprechperson: ${resolvedContactPerson}`,
    `Telefon Ansprechperson: ${phone || "—"}`,
    `E-Mail Ansprechperson: ${email || "—"}`,
  ].join("\n");
}

function formatServiceClaimErrorMessage(error) {
  const direct = String(error?.message || "").trim();
  if (direct) {
    return direct;
  }

  if (error && typeof error === "object" && Array.isArray(error.errors)) {
    const nested = error.errors
      .map((entry) => String(entry?.message || entry || "").trim())
      .filter(Boolean);
    if (nested.length) {
      return nested.join(" ");
    }
  }

  const fallback = String(error || "").trim();
  return fallback || "The complaint request could not be processed.";
}

async function postWebhook(payload) {
  const webhookUrl = String(process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return false;
  }

  const target = new URL(webhookUrl);
  const requestBody = JSON.stringify(payload);
  const lib = target.protocol === "https:" ? https : http;

  try {
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
  } catch (error) {
    console.warn("Service claim webhook delivery failed:", formatServiceClaimErrorMessage(error));
    return false;
  }
}

async function sendComplaintEmail(payload, attachmentParts = []) {
  const recipient = String(process.env.SERVICE_REQUEST_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
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

  const kitchenPreviewAttachment = await buildClaimKitchenPreviewAttachment(payload);
  const logoAttachment = await buildLogoAttachment();
  const emailAttachmentParts = attachmentParts.map((part, index) => ({
    ...part,
    cid: isEmailInlineImage(part.contentType) ? buildUserAttachmentCid(payload.id, index) : "",
  }));
  const userFiles = emailAttachmentParts.map((part) => ({
    filename: part.filename,
    content: part.content,
    contentType: part.contentType,
    ...(part.cid ? { cid: part.cid } : {}),
    contentDisposition: part.cid ? "inline" : "attachment",
  }));
  const attachments = [
    ...(logoAttachment ? [logoAttachment] : []),
    ...(kitchenPreviewAttachment ? [kitchenPreviewAttachment] : []),
    ...userFiles,
  ];
  const emailPayload = {
    ...payload,
    attachmentsMeta: (payload.attachmentsMeta || []).map((entry, index) => ({
      ...entry,
      cid: emailAttachmentParts[index]?.cid || "",
    })),
  };

  await transporter.sendMail({
    from: `"Fragmento" <${smtpFrom}>`,
    to: recipient,
    subject: `Reklamation ${payload.contractNumber} - ${payload.customerDisplayName}`,
    replyTo: payload.email || undefined,
    text: buildComplaintEmailText(emailPayload),
    html: `${buildComplaintEmailLogoHtml(Boolean(logoAttachment))}${buildComplaintEmailHtml(emailPayload, kitchenPreviewAttachment?.cid || "")}`,
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

function stripSelectedKitchenAreasFromProblemText(description) {
  let text = String(description || "").trim();
  if (!text) {
    return "";
  }

  for (const prefix of KITCHEN_AREA_FIRST_LINE_PREFIXES) {
    if (text.startsWith(prefix)) {
      const lines = text.split("\n");
      let index = 1;
      while (index < lines.length && lines[index].trim()) {
        index += 1;
      }
      return lines.slice(index).join("\n").trim();
    }
  }

  if (text.startsWith("AusgewÃ¤hlte KÃ¼chenbereiche:")) {
    const lines = text.split("\n");
    let index = 1;
    while (index < lines.length && lines[index].trim().startsWith("-")) {
      index += 1;
    }
    return lines.slice(index).join("\n").trim();
  }

  return text;
}

function isEmailInlineImage(contentType) {
  const normalized = String(contentType || "").toLowerCase().split(";")[0].trim();
  return normalized.startsWith("image/") && normalized !== "image/svg+xml";
}

function buildUserAttachmentCid(claimId, index) {
  return `claim-upload-${String(claimId || "claim").replace(/[^a-z0-9-]/gi, "")}-${index}@fragmento`;
}

function formatAttachmentMetaLine(entry) {
  return `${formatAttachmentLabel(entry)} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`;
}

function buildClaimItemRows(problemAreasJson, attachmentsMeta = []) {
  const attachmentsByComponentId = new Map();
  const orphanProblemAreaAttachments = [];

  for (const entry of attachmentsMeta || []) {
    if (entry?.role !== "problem_area") {
      continue;
    }
    const componentId = String(entry.areaComponentId || "").trim();
    if (!componentId) {
      orphanProblemAreaAttachments.push(entry);
      continue;
    }
    const list = attachmentsByComponentId.get(componentId) || [];
    list.push(entry);
    attachmentsByComponentId.set(componentId, list);
  }

  const rows = parseServiceClaimProblemAreas(problemAreasJson).map((area) => {
    const componentId = String(area.componentId || "").trim();
    return {
      label: formatServiceClaimProblemArea(area),
      detail: String(area.detail || "").trim(),
      attachments: componentId ? attachmentsByComponentId.get(componentId) || [] : [],
    };
  });

  for (const entry of orphanProblemAreaAttachments) {
    const areaLabel = [entry.areaName, entry.areaCode ? `(${entry.areaCode})` : ""].filter(Boolean).join(" ").trim();
    rows.push({
      label: areaLabel || "Küchenteil",
      detail: "",
      attachments: [entry],
    });
  }

  return rows;
}

function buildClaimItemText(row) {
  return [
    row.label || "-",
    row.detail ? `Problem: ${row.detail}` : "",
    row.attachments?.length
      ? [
          "Anhaenge:",
          ...row.attachments.map((entry) => `  - ${formatAttachmentMetaLine(entry)}`),
        ].join("\n")
      : "Anhaenge: -",
  ].filter(Boolean).join("\n");
}

function buildClaimItemHtml(row) {
  return [
    `<strong>${escapeHtml(row.label || "-")}</strong>`,
    row.detail ? `<div style="margin-top:4px;">Problem: ${formatMultiline(row.detail)}</div>` : "",
    `<div style="margin-top:6px;"><strong>Anhaenge:</strong><br />${
      row.attachments?.length
        ? row.attachments.map(formatAttachmentHtml).join("")
        : "-"
    }</div>`,
  ].filter(Boolean).join("");
}

function formatAttachmentHtml(entry) {
  const label = escapeHtml(formatAttachmentMetaLine(entry));
  if (!entry?.cid || !isEmailInlineImage(entry.contentType)) {
    return `<div style="margin-top:4px;">${label}</div>`;
  }

  return `
    <div style="margin-top:8px;">
      <div style="margin-bottom:6px;">${label}</div>
      <img src="cid:${escapeHtml(entry.cid)}" alt="${escapeHtml(entry.filename || "Uploaded image")}" style="display:block;width:100%;max-width:220px;height:auto;border:1px solid #e5e5e5;border-radius:6px;" />
    </div>
  `;
}

let serviceClaimInsertColumnSupportPromise = null;

async function getServiceClaimInsertColumnSupport(prismaClient) {
  if (!serviceClaimInsertColumnSupportPromise) {
    serviceClaimInsertColumnSupportPromise = prismaClient.$queryRaw`
      SELECT "column_name"
      FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'ServiceClaim'
    `
      .then((rows) => {
        const availableColumns = new Set(
          Array.isArray(rows)
            ? rows
                .map((row) => String(row?.column_name || "").trim())
                .filter(Boolean)
            : [],
        );

        return {
          includeAttachmentsJson: availableColumns.has("attachmentsJson"),
          includeProblemAreasJson: availableColumns.has("problemAreasJson"),
          includeLandlordCompanyPhone: availableColumns.has("landlordCompanyPhone"),
          includeLandlordCompanyEmail: availableColumns.has("landlordCompanyEmail"),
        };
      })
      .catch(() => ({
        includeAttachmentsJson: true,
        includeProblemAreasJson: true,
        includeLandlordCompanyPhone: true,
        includeLandlordCompanyEmail: true,
      }));
  }

  return serviceClaimInsertColumnSupportPromise;
}

function isMissingServiceClaimInsertColumnError(error, columnName) {
  const message = String(error?.message ?? "");
  const metaMessage = typeof error?.meta?.message === "string" ? error.meta.message : "";
  const combined = `${message} ${metaMessage}`;
  return (
    combined.includes(columnName)
    && (combined.includes("does not exist") || combined.includes("42703"))
  );
}

export function getMissingOptionalInsertColumns(error, options) {
  const missing = [];
  if (options.includeAttachmentsJson && isMissingAttachmentsJsonColumnError(error)) {
    missing.push("attachmentsJson");
  }
  if (options.includeProblemAreasJson && isMissingProblemAreasJsonColumnError(error)) {
    missing.push("problemAreasJson");
  }
  if (options.includeLandlordCompanyPhone && isMissingServiceClaimInsertColumnError(error, "landlordCompanyPhone")) {
    missing.push("landlordCompanyPhone");
  }
  if (options.includeLandlordCompanyEmail && isMissingServiceClaimInsertColumnError(error, "landlordCompanyEmail")) {
    missing.push("landlordCompanyEmail");
  }
  return missing;
}

function buildServiceClaimInsertSql(payload, options) {
  const columns = [
    Prisma.raw(`"id"`),
    Prisma.raw(`"contractNumber"`),
    Prisma.raw(`"fullName"`),
    Prisma.raw(`"phone"`),
    Prisma.raw(`"email"`),
    Prisma.raw(`"clientAddress"`),
    Prisma.raw(`"clientCountry"`),
    Prisma.raw(`"clientCity"`),
    Prisma.raw(`"clientPostalCode"`),
    Prisma.raw(`"landlordName"`),
    ...(options.includeLandlordCompanyPhone ? [Prisma.raw(`"landlordCompanyPhone"`)] : []),
    ...(options.includeLandlordCompanyEmail ? [Prisma.raw(`"landlordCompanyEmail"`)] : []),
    Prisma.raw(`"landlordPhone"`),
    Prisma.raw(`"landlordEmail"`),
    Prisma.raw(`"hausmeisterName"`),
    Prisma.raw(`"hausmeisterPhone"`),
    Prisma.raw(`"hausmeisterEmail"`),
    Prisma.raw(`"landlordContact"`),
    Prisma.raw(`"problemDescription"`),
    Prisma.raw(`"serialNumber"`),
    Prisma.raw(`"requestType"`),
    ...(options.includeProblemAreasJson ? [Prisma.raw(`"problemAreasJson"`)] : []),
    ...(options.includeAttachmentsJson ? [Prisma.raw(`"attachmentsJson"`)] : []),
  ];

  const values = [
    payload.id,
    payload.contractNumber,
    payload.fullName,
    payload.phone || null,
    payload.email || null,
    payload.clientAddress,
    payload.clientCountry,
    payload.clientCity,
    payload.clientPostalCode,
    payload.landlordName,
    ...(options.includeLandlordCompanyPhone ? [payload.landlordCompanyPhone || null] : []),
    ...(options.includeLandlordCompanyEmail ? [payload.landlordCompanyEmail || null] : []),
    payload.landlordPhone || null,
    payload.landlordEmail || null,
    payload.hausmeisterName,
    payload.hausmeisterPhone || null,
    payload.hausmeisterEmail || null,
    payload.landlordContact,
    payload.problemDescription,
    payload.serialNumber,
    payload.requestType,
    ...(options.includeProblemAreasJson ? [payload.problemAreasJson] : []),
    ...(options.includeAttachmentsJson ? [payload.attachmentsJson] : []),
  ].map((value) => Prisma.sql`${value}`);

  return Prisma.sql`
    INSERT INTO "ServiceClaim" (${Prisma.join(columns)})
    VALUES (${Prisma.join(values)})
  `;
}

async function insertServiceClaimRecord(prismaClient, payload) {
  const options = { ...(await getServiceClaimInsertColumnSupport(prismaClient)) };

  while (true) {
    try {
      await prismaClient.$executeRaw(buildServiceClaimInsertSql(payload, options));
      return;
    } catch (error) {
      const missingColumns = getMissingOptionalInsertColumns(error, options);
      if (!missingColumns.length) {
        throw error;
      }

      for (const columnName of missingColumns) {
        if (columnName === "attachmentsJson") {
          options.includeAttachmentsJson = false;
        }
        if (columnName === "problemAreasJson") {
          options.includeProblemAreasJson = false;
        }
        if (columnName === "landlordCompanyPhone") {
          options.includeLandlordCompanyPhone = false;
        }
        if (columnName === "landlordCompanyEmail") {
          options.includeLandlordCompanyEmail = false;
        }
      }
    }
  }
}

async function buildClaimKitchenPreviewAttachment(payload) {
  if (!String(payload?.kitchenSlug || "").trim()) {
    return null;
  }

  const selectedAreas = parseServiceClaimProblemAreas(payload.problemAreasJson);
  if (!selectedAreas.length) {
    return null;
  }

  const preview = await renderClaimKitchenPreviewPng({
    kitchenSlug: payload.kitchenSlug,
    selectedAreas,
    contractNumber: payload.contractNumber,
    width: 960,
  }).catch(() => null);

  if (!preview?.content?.length) {
    return null;
  }

  return {
    filename: `claim-kitchen-preview-${payload.contractNumber || payload.id}.png`,
    content: preview.content,
    cid: "claim-kitchen-preview@fragmento",
    contentType: preview.contentType || "image/png",
    contentDisposition: "inline",
  };
}

function buildComplaintEmailText(payload) {
  const landlordBlock = buildPartyContactBlock({
    companyName: payload.landlordCompanyName,
    companyPhone: payload.landlordCompanyPhone,
    companyEmail: payload.landlordCompanyEmail,
    contactPerson: payload.landlordContactPerson,
    gender: payload.landlordContactGender,
    contactGivenName: payload.landlordContactGivenName,
    contactSurname: payload.landlordContactSurname,
    givenName: payload.landlordGivenName,
    surname: payload.landlordSurname,
    phone: payload.landlordPhone,
    email: payload.landlordEmail,
  });
  const hausBlock = buildPartyContactBlock({
    givenName: payload.hausmeisterGivenName,
    surname: payload.hausmeisterSurname,
    phone: payload.hausmeisterPhone,
    email: payload.hausmeisterEmail,
  });
  const { description: problemText, availability } = extractAvailabilityFromDescription(
    payload.problemDescription,
  );
  const standaloneProblemText = stripSelectedKitchenAreasFromProblemText(problemText);
  const claimItemRows = buildClaimItemRows(payload.problemAreasJson, payload.attachmentsMeta);
  const serialNumberAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "serial_number");
  const generalAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "general");
  return [
    "Servicereklamation",
    "",
    `Vertragsnummer: ${payload.contractNumber}`,
    `Küche: ${payload.kitchenName || "-"}`,
    `Kunde: ${payload.genderLabel === "Keine Angabe" ? "" : `${payload.genderLabel} `}${payload.givenName} ${payload.surname}`,
    `Adresse: ${payload.clientAddress}`,
    `Telefon: ${payload.phone || "—"}`,
    `E-Mail: ${payload.email || "—"}`,
    `Seriennummer: ${payload.serialNumber}`,
    ...(serialNumberAttachments.length
      ? [
          "",
          "Seriennummer-Anhaenge",
          ...serialNumberAttachments.map((entry) => `- ${formatAttachmentMetaLine(entry)}`),
        ]
      : []),
    ...(claimItemRows.length
      ? [
          "",
          "Ausgewählte Küchenteile",
          ...claimItemRows.flatMap((row, index) => [
            "",
            `Küchenteil ${index + 1}:`,
            buildClaimItemText(row),
          ]),
        ]
      : []),
    "",
    "Vermieter",
    landlordBlock,
    "",
    "Hausmeister",
    hausBlock,
    "",
    "Problem",
    standaloneProblemText || "-",
    ...(availability ? ["", `Erreichbarkeit: ${availability}`] : []),
    ...(generalAttachments.length
      ? [
          "",
          "Allgemeine Anhaenge (siehe E-Mail-Anhaenge):",
          ...generalAttachments.map((entry) => `- ${formatAttachmentMetaLine(entry)}`),
        ]
      : []),
  ].join("\n");
}

function buildComplaintEmailHtml(payload, previewCid = "") {
  const tableStyles = "width:100%;border-collapse:collapse;font-family:Arial,sans-serif;";
  const tdStyles = "padding:12px 15px;border-bottom:1px solid #eaeaea;color:#555;vertical-align:top;";
  const customerName = escapeHtml(`${payload.givenName} ${payload.surname}`.trim());
  const landlordContactDisplay = formatContactPersonName({
    gender: payload.landlordContactGender,
    givenName: payload.landlordContactGivenName,
    surname: payload.landlordContactSurname,
    legacyName: payload.landlordContactPerson,
  });
  const landlordValue = [
    payload.landlordCompanyName ? `Firma: ${payload.landlordCompanyName}` : "",
    payload.landlordCompanyPhone ? `Firma Telefon: ${payload.landlordCompanyPhone}` : "",
    payload.landlordCompanyEmail ? `Firma E-Mail: ${payload.landlordCompanyEmail}` : "",
    landlordContactDisplay ? `Ansprechperson: ${landlordContactDisplay}` : "",
    !landlordContactDisplay && `${payload.landlordGivenName} ${payload.landlordSurname}`.trim()
      ? `${payload.landlordGivenName} ${payload.landlordSurname}`.trim()
      : "",
    payload.landlordPhone ? `Telefon Ansprechperson: ${payload.landlordPhone}` : "",
    payload.landlordEmail ? `E-Mail Ansprechperson: ${payload.landlordEmail}` : "",
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
  const standaloneProblemText = stripSelectedKitchenAreasFromProblemText(problemText);
  const claimItemRows = buildClaimItemRows(payload.problemAreasJson, payload.attachmentsMeta);
  const serialNumberAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "serial_number");
  const generalAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "general");
  const detailRows = [
    ["Vertragsnummer", payload.contractNumber],
    ["Küche", payload.kitchenName || "-"],
    ["Vorname", payload.givenName],
    ["Nachname", payload.surname],
    ["Anrede", payload.genderLabel],
    ["Kundenadresse", payload.clientAddress],
    ["Telefon", payload.phone || "—"],
    ["E-Mail", payload.email || "—"],
    ["Seriennummer", payload.serialNumber],
    ...(serialNumberAttachments.length
      ? [["Seriennummer-Anhaenge", serialNumberAttachments.map(formatAttachmentMetaLine).join("\n")]]
      : []),
    ...claimItemRows.map((row, index) => [`Küchenteil ${index + 1}`, { html: buildClaimItemHtml(row) }]),
    ["Vermieter", landlordValue],
    ["Hausmeister", hausValue],
    ["Problem", standaloneProblemText || "-"],
    ...(availability ? [["Erreichbarkeit", availability]] : []),
  ];

  const tbody = detailRows
    .map(
      ([label, value]) => {
        const renderedValue = value && typeof value === "object" && "html" in value
          ? value.html
          : formatMultiline(value);
        return `<tr><td style="${tdStyles}font-weight:bold;width:35%;">${escapeHtml(label)}</td><td style="${tdStyles}">${renderedValue}</td></tr>`;
      },
    )
    .join("");

  const attachmentsRow =
    generalAttachments.length > 0
      ? `<tr><td style="${tdStyles}font-weight:bold;width:35%;">Allgemeine Anhaenge</td><td style="${tdStyles}">${generalAttachments
          .map(formatAttachmentHtml)
          .join("")}</td></tr>`
      : "";
  const previewBlock = previewCid
    ? `
      <div style="margin:0 0 18px;">
        <div style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#777;">Küche / ausgewähltes Teil</div>
        <div style="padding:12px;border:1px solid #eaeaea;border-radius:10px;background:#fffaf5;">
          <img src="cid:${escapeHtml(previewCid)}" alt="Kitchen preview with selected claim area highlighted" style="display:block;width:100%;max-width:440px;height:auto;border:0;" />
        </div>
      </div>
    `
    : "";

  return `
    <div style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;">
      <p style="margin:0 0 16px;line-height:1.5;">
        Neue Servicereklamation zu Vertrag <strong>${escapeHtml(payload.contractNumber)}</strong>
        (${customerName}).
      </p>
      ${previewBlock}
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

const MAX_SERVICE_CLAIM_ATTACHMENTS = 20;
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
    const generalAttachmentFiles = [];
    const serialNumberImageFiles = [];
    const problemAreaAttachmentFilesByComponentId = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key === "attachments" || key === "generalAttachments") {
          generalAttachmentFiles.push(value);
          continue;
        }
        if (key === "serialNumberImages") {
          serialNumberImageFiles.push(value);
          continue;
        }
        if (key.startsWith("problemAreaAttachment:")) {
          const componentId = key.slice("problemAreaAttachment:".length).trim();
          if (componentId) {
            if (!Array.isArray(problemAreaAttachmentFilesByComponentId[componentId])) {
              problemAreaAttachmentFilesByComponentId[componentId] = [];
            }
            problemAreaAttachmentFilesByComponentId[componentId].push(value);
          }
          continue;
        }
        continue;
      }
      if (typeof value === "string") {
        body[key] = value;
      }
    }
    return {
      body,
      generalAttachmentFiles,
      serialNumberImageFiles,
      problemAreaAttachmentFilesByComponentId,
    };
  }

  const body = await request.json();
  return {
    body,
    generalAttachmentFiles: [],
    serialNumberImageFiles: [],
    problemAreaAttachmentFilesByComponentId: {},
  };
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims:${clientIp}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const {
      body,
      generalAttachmentFiles,
      serialNumberImageFiles,
      problemAreaAttachmentFilesByComponentId,
    } = await parseServiceClaimRequest(request);
    const contractNumber = normalizeServiceClaimContractNumber(
      requiredString(body.contractNumber, "Contract number"),
    );
    const contract = await getServiceClaimContractDetails(contractNumber);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const landlordCompanyName = optionalString(body.landlordCompanyName);
    const landlordContactGender = optionalGender(body.landlordContactGender);
    const landlordContactGivenName = optionalString(body.landlordContactGivenName);
    const landlordContactSurname = optionalString(body.landlordContactSurname);
    const landlordContactPersonJoined = combinePersonName(
      landlordContactGivenName,
      landlordContactSurname,
    );
    const landlordContactPerson =
      optionalString(body.landlordContactPerson) || landlordContactPersonJoined;
    const landlordGivenName = optionalString(body.landlordGivenName);
    const landlordSurname = optionalString(body.landlordSurname);
    const landlordNameJoined = combinePersonName(landlordGivenName, landlordSurname);
    const landlordResolvedContactPerson =
      formatContactPersonName({
        gender: landlordContactGender,
        givenName: landlordContactGivenName,
        surname: landlordContactSurname,
        legacyName: landlordContactPerson || landlordNameJoined,
      }) || landlordContactPerson || landlordNameJoined;
    const landlordName = [landlordCompanyName, landlordResolvedContactPerson].filter(Boolean).join(" / ") || null;
    const landlordCompanyPhone = optionalString(body.landlordCompanyPhone);
    const landlordCompanyEmail = optionalString(body.landlordCompanyEmail);
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
    const gender = requiredGender(body.gender);
    const genderLabel = genderDisplayLabel(gender);
    const customerDisplayName = [givenName, surname].filter(Boolean).join(" ").trim();
    const fullName = buildCustomerFullName({ givenName, surname, gender });
    const problemAreasJson = normalizeProblemAreasJson(body.problemAreasJson);
    const problemDescription = mergeProblemAreasIntoDescription(
      optionalString(body.problemDescription),
      optionalString(body.problemAreasJson),
    );
    const parsedProblemAreas = parseServiceClaimProblemAreas(problemAreasJson);
    const problemAreasByComponentId = new Map(
      parsedProblemAreas.map((area) => [String(area.componentId || "").trim(), area]),
    );
    const generalAttachmentParts = await normalizeServiceClaimUploads(generalAttachmentFiles);
    const serialNumberImageParts = await normalizeServiceClaimUploads(serialNumberImageFiles);
    const problemAreaAttachmentParts = [];
    for (const [componentId, files] of Object.entries(problemAreaAttachmentFilesByComponentId)) {
      const normalizedComponentId = String(componentId || "").trim();
      if (!normalizedComponentId || !files?.length) {
        continue;
      }
      const area = problemAreasByComponentId.get(normalizedComponentId) || {};
      const parts = await normalizeServiceClaimUploads(files);
      for (const part of parts) {
        problemAreaAttachmentParts.push({
          ...part,
          role: "problem_area",
          areaComponentId: normalizedComponentId,
          areaName: String(area?.name || "").trim(),
          areaCode: String(area?.code || "").trim(),
        });
      }
    }
    const attachmentParts = [
      ...serialNumberImageParts.map((part) => ({ ...part, role: "serial_number" })),
      ...generalAttachmentParts.map((part) => ({ ...part, role: "general" })),
      ...problemAreaAttachmentParts,
    ];
    if (attachmentParts.length > MAX_SERVICE_CLAIM_ATTACHMENTS) {
      throw new Error(`You can upload at most ${MAX_SERVICE_CLAIM_ATTACHMENTS} files.`);
    }
    if (!problemDescription) {
      throw new Error("Problem description is required.");
    }
    const rawSerialNumber = optionalString(body.serialNumber);
    const hasSerialNumberImage = serialNumberImageParts.length > 0 || booleanFromFormValue(body.hasSerialNumberImage);
    const serialEvidenceCount = parseSerialNumberEntries(rawSerialNumber).length + serialNumberImageParts.length;
    if (parsedProblemAreas.length > 0 && serialEvidenceCount < parsedProblemAreas.length) {
      return NextResponse.json(
        { error: `Please provide at least ${parsedProblemAreas.length} serial number(s) for the selected kitchen item(s).` },
        { status: 400 },
      );
    }
    if (!rawSerialNumber && !hasSerialNumberImage) {
      return NextResponse.json(
        { error: "Please provide a serial number or upload a serial number photo." },
        { status: 400 },
      );
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
      kitchenName: contract.kitchenName || "",
      kitchenSlug: contract.kitchenSlug || "",
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      clientAddress: requiredString(body.clientAddress, "Client address"),
      clientCountry: requiredString(body.clientCountry, "Client country"),
      clientCity: requiredString(body.clientCity, "Client city"),
      clientPostalCode: requiredString(body.clientPostalCode, "Client postal code"),
      landlordCompanyName,
      landlordContactGender,
      landlordContactGivenName,
      landlordContactSurname,
      landlordContactPerson: landlordResolvedContactPerson,
      landlordGivenName,
      landlordSurname,
      landlordName,
      landlordCompanyPhone,
      landlordCompanyEmail,
      landlordPhone,
      landlordEmail,
      hausmeisterGivenName,
      hausmeisterSurname,
      hausmeisterName,
      hausmeisterPhone,
      hausmeisterEmail,
      landlordContact: [
        `Landlord company: ${landlordCompanyName || "—"}`,
        `Company phone: ${landlordCompanyPhone || "-"}`,
        `Company email: ${landlordCompanyEmail || "-"}`,
        `Landlord contact person: ${landlordResolvedContactPerson || "—"}`,
        `Contact person phone: ${landlordPhone || "-"}`,
        `Contact person email: ${landlordEmail || "-"}`,
        `Hausmeister: ${hausmeisterNameJoined || "—"}`,
        `Hausmeister phone: ${hausmeisterPhone || "-"}`,
        `Hausmeister email: ${hausmeisterEmail || "-"}`,
      ].join("\n"),
      problemDescription,
      problemAreasJson,
      serialNumber: rawSerialNumber || "See serial number photo in attachments.",
      requestType: "complaint",
      hasSerialNumberImage,
      attachmentsMeta: attachmentParts.map(({ filename, contentType, size, role, areaComponentId, areaName, areaCode }) => ({
        filename,
        contentType,
        size,
        role: role || "general",
        ...(areaComponentId ? { areaComponentId } : {}),
        ...(areaName ? { areaName } : {}),
        ...(areaCode ? { areaCode } : {}),
      })),
    };

    if (!payload.phone || !payload.email) {
      return NextResponse.json(
        { error: "Please provide both a phone number and an email address." },
        { status: 400 },
      );
    }

    payload.attachmentsJson =
      payload.attachmentsMeta.length > 0 ? JSON.stringify(payload.attachmentsMeta) : null;

    await insertServiceClaimRecord(prisma, payload);

    if (attachmentParts.length) {
      try {
        await persistServiceClaimAttachments(payload.id, attachmentParts);
      } catch (persistError) {
        console.error("Service claim attachment persist error:", persistError);
      }
    }

    const [emailSent, webhookSent] = await Promise.all([
      sendComplaintEmail(payload, attachmentParts).catch((error) => {
        console.warn("Service claim email delivery failed:", formatServiceClaimErrorMessage(error));
        return false;
      }),
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
      { error: formatServiceClaimErrorMessage(error) },
      { status: error.status || 500 },
    );
  }
}
