import crypto from "crypto";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { getKitchenContractForAccess } from "../../../lib/kitchen-contracts";
import { isMissingKitchenRegistrationTableError, kitchenRegistrationUnavailableMessage } from "../../../lib/kitchen-registration-db";
import { prisma } from "../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";

const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

function requiredString(value, fieldName) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function optionalString(value) {
  return String(value || "").trim() || null;
}

function normalizeEmail(value) {
  const normalized = optionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(String(code || "")).digest("hex");
}

async function sendRegistrationVerificationEmail({ to, code, contractNumber, kitchenName }) {
  const smtpHost = String(process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpFrom = String(process.env.SMTP_FROM || "").trim();

  if (!to || !smtpHost || !smtpFrom || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = new Error("Email verification is not configured. Please contact support.");
    error.status = 503;
    throw error;
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

  await transporter.sendMail({
    from: `"Fragmento" <${smtpFrom}>`,
    to,
    subject: `Verification code for kitchen contract ${contractNumber}`,
    text: [
      "Kitchen registration verification",
      "",
      `Contract number: ${contractNumber}`,
      `Kitchen: ${kitchenName || "-"}`,
      "",
      `Your verification code is: ${code}`,
      "",
      "This code expires in 15 minutes. If you did not request this registration, ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;">
        <h2 style="margin:0 0 12px;">Kitchen registration verification</h2>
        <p style="margin:0 0 10px;">Contract number: <strong>${contractNumber}</strong></p>
        <p style="margin:0 0 18px;">Kitchen: ${kitchenName || "-"}</p>
        <p style="margin:0 0 8px;">Your verification code is:</p>
        <p style="margin:0 0 18px;font-size:28px;font-weight:700;letter-spacing:0.16em;">${code}</p>
        <p style="margin:0;color:#666;">This code expires in 15 minutes. If you did not request this registration, ignore this email.</p>
      </div>
    `,
  });
}

function normalizeVerificationValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
}

async function getRegistrationVerificationData(contract) {
  const propertyObject = contract.project?.propertyObject || null;
  const latestOrder = await prisma.order.findFirst({
    where: { kitchenContractId: contract.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      postalCode: true,
      address1: true,
      address2: true,
    },
  });

  const postalCode = propertyObject?.postalCode || latestOrder?.postalCode || "";
  const addressCandidates = [
    propertyObject?.address1,
    propertyObject?.address2,
    latestOrder?.address1,
    latestOrder?.address2,
    contract.unitNumber,
    contract.floor,
    contract.building,
    propertyObject?.name,
  ]
    .map((value) => normalizeVerificationValue(value))
    .filter(Boolean);

  return {
    postalCode: normalizeVerificationValue(postalCode),
    addressCandidates: [...new Set(addressCandidates)],
  };
}

async function assertContractRegistrationVerification(contract, body) {
  const verificationPostalCode = normalizeVerificationValue(
    requiredString(body?.verificationPostalCode, "Postal code"),
  );
  const verificationAddress = normalizeVerificationValue(
    requiredString(body?.verificationAddress || body?.verificationUnit, "Street, apartment, or floor"),
  );
  const verification = await getRegistrationVerificationData(contract);

  if (!verification.postalCode || !verification.addressCandidates.length) {
    const error = new Error(
      "This contract cannot be self-registered because verification details are missing. Please contact support.",
    );
    error.status = 403;
    throw error;
  }

  if (
    verificationPostalCode !== verification.postalCode
    || !verification.addressCandidates.includes(verificationAddress)
  ) {
    const error = new Error("The verification details do not match this contract.");
    error.status = 403;
    throw error;
  }
}

function formatRegistrationError(error) {
  return String(error?.message || "").trim() || "Kitchen registration failed.";
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`kitchen-registration:${clientIp}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const contract = await getKitchenContractForAccess(body?.contractNumber);
    const fullName = requiredString(body?.fullName, "Full name");
    const email = normalizeEmail(body?.email);
    const phone = optionalString(body?.phone);
    const addressNote = optionalString(body?.addressNote);
    await assertContractRegistrationVerification(contract, body);

    if (!email) {
      return NextResponse.json(
        { error: "Please provide an email address so we can verify this registration." },
        { status: 400 },
      );
    }

    const verificationCode = generateVerificationCode();
    const registration = await prisma.kitchenRegistration.create({
      data: {
        kitchenContractId: contract.id,
        fullName,
        email,
        phone,
        addressNote,
        isActive: false,
        verificationCodeHash: hashVerificationCode(verificationCode),
        verificationExpiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      },
    });

    try {
      await sendRegistrationVerificationEmail({
        to: email,
        code: verificationCode,
        contractNumber: contract.contractNumber,
        kitchenName: contract.kitchen.name,
      });
    } catch (emailError) {
      await prisma.kitchenRegistration.update({
        where: { id: registration.id },
        data: {
          deactivatedAt: new Date(),
        },
      });
      throw emailError;
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: "We sent a verification code to your email. Enter it to complete the registration.",
      registration: {
        id: registration.id,
        contractNumber: contract.contractNumber,
        kitchenName: contract.kitchen.name,
        kitchenSlug: contract.kitchen.slug,
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        registeredAt: registration.registeredAt,
      },
    });
  } catch (error) {
    console.error("Kitchen registration error:", error);
    if (isMissingKitchenRegistrationTableError(error)) {
      return NextResponse.json({ error: kitchenRegistrationUnavailableMessage() }, { status: 503 });
    }
    return NextResponse.json(
      { error: formatRegistrationError(error) },
      { status: error.status || 500 },
    );
  }
}
