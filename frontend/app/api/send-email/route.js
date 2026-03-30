import http from "http";
import https from "https";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

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

export async function POST(request) {
  let to_name;
  let to_email;
  let order_number;
  let order_summary_html;
  let pdf_base64;
  let pdf_filename;
  let webhook_payload;

  try {
    ({
      to_name,
      to_email,
      order_number,
      order_summary_html,
      pdf_base64,
      pdf_filename,
      webhook_payload,
    } = await request.json());
  } catch (error) {
    console.error("Body parse error:", error.message);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

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
    logoBuffer = await fetchBuffer("https://architectkitchen.netlify.app/img/fragmentologo.png");
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
  if (pdf_base64) {
    attachments.push({
      filename: pdf_filename || "Bestellung.pdf",
      content: Buffer.from(pdf_base64, "base64"),
      contentType: "application/pdf",
    });
  }

  const logoImgTag = logoBuffer
    ? '<div style="margin-bottom:16px"><img src="cid:logo@fragmento" alt="Fragmento" style="height:70px;object-fit:contain" /></div>'
    : "";

  const mailOptions = {
    from: `"Fragmento" <${process.env.SMTP_FROM}>`,
    to: to_email,
    subject: `Bestellbestaetigung #${order_number}`,
    html: `
      ${logoImgTag}
      <p>Hallo ${to_name},</p>
      <p>vielen Dank fuer deine Bestellung!</p>
      ${order_summary_html}
      <p>Dein Fragmento-Team</p>
    `,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("SMTP error:", error.message, error.code || "", error.response || "");
    try {
      const fallbackAttachments = attachments.filter((attachment) => attachment.cid === "logo@fragmento");
      await transporter.sendMail({ ...mailOptions, attachments: fallbackAttachments });
      return NextResponse.json({
        success: true,
        warning: `PDF attachment skipped: ${error.message}`,
      });
    } catch (fallbackError) {
      console.error(
        "SMTP error (fallback):",
        fallbackError.message,
        fallbackError.code || "",
        fallbackError.response || "",
      );
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
  }

  if (webhook_payload) {
    try {
      const n8nUrl = new URL(
        process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/kitchen-order-callback",
      );
      const lib = n8nUrl.protocol === "https:" ? https : http;
      const body = JSON.stringify(webhook_payload);

      await new Promise((resolve) => {
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
              "User-Agent": "n8n-webhook-forwarder/1.0",
            },
          },
          (res) => {
            res.resume();
            res.on("end", resolve);
          },
        );

        req.on("error", (error) => {
          console.warn("n8n webhook error:", error.message);
          resolve();
        });

        req.write(body);
        req.end();
      });
    } catch (error) {
      console.warn("Could not fire n8n webhook:", error.message);
    }
  }

  return NextResponse.json({ success: true });
}
