import fs from "fs/promises";
import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import path from "path";
import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";

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

function buildPartySummary(label, name, phone, email) {
  return [
    `${label}: ${name || "-"}`,
    `Phone: ${phone || "-"}`,
    `Email: ${email || "-"}`,
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

async function sendComplaintEmail(payload) {
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

  await transporter.sendMail({
    from: `"Fragmento Service Desk" <${smtpFrom}>`,
    to: recipient,
    subject: `Reklamation ${payload.contractNumber} - ${payload.fullName}`,
    replyTo: payload.email || undefined,
    text: buildComplaintEmailText(payload),
    html: buildComplaintEmailHtml(payload, { hasLogo: Boolean(logoAttachment) }),
    attachments: logoAttachment ? [logoAttachment] : [],
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

function buildComplaintEmailText(payload) {
  return [
    "NEW FRAGMENTO COMPLAINT REQUEST",
    "",
    `Contract number: ${payload.contractNumber}`,
    `Full name: ${payload.fullName}`,
    `Client address: ${payload.clientAddress}`,
    `Phone: ${payload.phone || "-"}`,
    `Email: ${payload.email || "-"}`,
    `Serial number: ${payload.serialNumber}`,
    "",
    "Landlord contact",
    buildPartySummary("Landlord", payload.landlordName, payload.landlordPhone, payload.landlordEmail),
    "",
    "Hausmeister contact",
    buildPartySummary("Hausmeister", payload.hausmeisterName, payload.hausmeisterPhone, payload.hausmeisterEmail),
    "",
    "Problem description",
    payload.problemDescription,
  ].join("\n");
}

function buildComplaintEmailHtml(payload, { hasLogo = false } = {}) {
  const logoHtml = hasLogo
    ? '<img src="cid:logo@fragmento" alt="Fragmento" style="display:block;height:40px;width:auto;border:0;" />'
    : '<div style="font-size:22px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#fffdf9;">Fragmento</div>';

  return `
    <div style="margin:0;padding:32px 16px;background-color:#f7f4ef;font-family:Arial,sans-serif;color:#2b2b2b;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e1dc;border-radius:20px;overflow:hidden;box-shadow:0 18px 42px rgba(84, 59, 40, 0.1);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#5d4533 0%,#6b4f3a 58%,#7d6049 100%);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div>${logoHtml}</div>
            <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(255,253,249,0.16);color:#fffdf9;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
              Service Complaint
            </div>
          </div>
          <div style="margin-top:24px;">
            <div style="font-size:13px;line-height:20px;color:#f4e7d9;text-transform:uppercase;letter-spacing:0.08em;">New incoming request</div>
            <h1 style="margin:8px 0 0;font-size:28px;line-height:34px;color:#fffdf9;">Reklamation ${escapeHtml(payload.contractNumber)}</h1>
            <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:#f4e7d9;">
              A new service complaint has been submitted and is ready for review.
            </p>
          </div>
        </div>

        <div style="padding:32px;">
          <div style="margin-bottom:24px;padding:20px;border:1px solid #e5e1dc;border-radius:16px;background:linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,243,236,0.96) 100%);">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6b4f3a;">Customer overview</div>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:14px;">
              <tr>
                <td style="width:50%;padding:0 12px 14px 0;vertical-align:top;">
                  ${buildFieldHtml("Full name", payload.fullName)}
                </td>
                <td style="width:50%;padding:0 0 14px 12px;vertical-align:top;">
                  ${buildFieldHtml("Contract number", payload.contractNumber)}
                </td>
              </tr>
              <tr>
                <td style="width:50%;padding:0 12px 0 0;vertical-align:top;">
                  ${buildFieldHtml("Phone", payload.phone || "-")}
                </td>
                <td style="width:50%;padding:0 0 0 12px;vertical-align:top;">
                  ${buildFieldHtml("Email", payload.email || "-")}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:14px 0 0 0;vertical-align:top;">
                  ${buildFieldHtml("Client address", payload.clientAddress)}
                </td>
              </tr>
            </table>
          </div>

          <table role="presentation" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 24px;vertical-align:top;">
                ${buildSectionHtml("Serial number", payload.serialNumber)}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px;vertical-align:top;">
                ${buildSectionHtml("Landlord contact", [
                  `Name: ${payload.landlordName}`,
                  `Phone: ${payload.landlordPhone || "-"}`,
                  `Email: ${payload.landlordEmail || "-"}`,
                ].join("\n"), { multiline: true })}
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px;vertical-align:top;">
                ${buildSectionHtml("Hausmeister contact", [
                  `Name: ${payload.hausmeisterName}`,
                  `Phone: ${payload.hausmeisterPhone || "-"}`,
                  `Email: ${payload.hausmeisterEmail || "-"}`,
                ].join("\n"), { multiline: true })}
              </td>
            </tr>
            <tr>
              <td style="padding:0;vertical-align:top;">
                ${buildSectionHtml("Problem description", payload.problemDescription, { multiline: true, emphasize: true })}
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:20px 32px;border-top:1px solid #e5e1dc;background:#faf7f3;">
          <p style="margin:0;font-size:12px;line-height:18px;color:#6f6f6f;">
            Sent automatically from the Fragmento service form.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildFieldHtml(label, value) {
  return `
    <div>
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6f6f6f;">${escapeHtml(label)}</div>
      <div style="margin-top:6px;font-size:16px;line-height:24px;color:#2b2b2b;font-weight:600;">${escapeHtml(value)}</div>
    </div>
  `;
}

function buildSectionHtml(label, value, options = {}) {
  const { multiline = false, emphasize = false } = options;
  const bodyHtml = multiline ? formatMultiline(value) : escapeHtml(value);

  return `
    <div style="padding:20px;border:1px solid ${emphasize ? "rgba(242, 166, 90, 0.34)" : "#e5e1dc"};border-radius:16px;background:${emphasize ? "#fbf0db" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,243,236,0.96) 100%)"};">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${emphasize ? "#a06b12" : "#6b4f3a"};">${escapeHtml(label)}</div>
      <div style="margin-top:10px;font-size:15px;line-height:24px;color:#2b2b2b;">${bodyHtml}</div>
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

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims:${clientIp}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const landlordName = requiredString(body.landlordName, "Landlord name");
    const landlordPhone = optionalString(body.landlordPhone);
    const landlordEmail = optionalString(body.landlordEmail);
    const hausmeisterName = requiredString(body.hausmeisterName, "Hausmeister name");
    const hausmeisterPhone = optionalString(body.hausmeisterPhone);
    const hausmeisterEmail = optionalString(body.hausmeisterEmail);
    const payload = {
      id: crypto.randomUUID(),
      contractNumber: requiredString(body.contractNumber, "Contract number"),
      fullName: requiredString(body.fullName, "Full name"),
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      clientAddress: requiredString(body.clientAddress, "Client address"),
      landlordName,
      landlordPhone,
      landlordEmail,
      hausmeisterName,
      hausmeisterPhone,
      hausmeisterEmail,
      landlordContact: [
        `Landlord: ${landlordName}`,
        `Landlord phone: ${landlordPhone || "-"}`,
        `Landlord email: ${landlordEmail || "-"}`,
        `Hausmeister: ${hausmeisterName}`,
        `Hausmeister phone: ${hausmeisterPhone || "-"}`,
        `Hausmeister email: ${hausmeisterEmail || "-"}`,
      ].join("\n"),
      problemDescription: requiredString(body.problemDescription, "Problem description"),
      serialNumber: requiredString(body.serialNumber, "Serial number"),
      requestType: "complaint",
    };

    if (!payload.phone && !payload.email) {
      return NextResponse.json(
        { error: "Please provide at least a phone number or an email address." },
        { status: 400 },
      );
    }

    await prisma.$executeRaw`
      INSERT INTO "ServiceClaim" (
        "id",
        "contractNumber",
        "fullName",
        "phone",
        "email",
        "clientAddress",
        "landlordName",
        "landlordPhone",
        "landlordEmail",
        "hausmeisterName",
        "hausmeisterPhone",
        "hausmeisterEmail",
        "landlordContact",
        "problemDescription",
        "serialNumber",
        "requestType"
      )
      VALUES (
        ${payload.id},
        ${payload.contractNumber},
        ${payload.fullName},
        ${payload.phone || null},
        ${payload.email || null},
        ${payload.clientAddress},
        ${payload.landlordName},
        ${payload.landlordPhone || null},
        ${payload.landlordEmail || null},
        ${payload.hausmeisterName},
        ${payload.hausmeisterPhone || null},
        ${payload.hausmeisterEmail || null},
        ${payload.landlordContact},
        ${payload.problemDescription},
        ${payload.serialNumber},
        ${payload.requestType}
      )
    `;

    const [emailSent, webhookSent] = await Promise.all([
      sendComplaintEmail(payload),
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
