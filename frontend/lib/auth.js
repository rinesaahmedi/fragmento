import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const SESSION_COOKIE = "fragmento_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "fragmento-dev-secret";
}

function signValue(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function encodeSession(payload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${base}.${signValue(base)}`;
}

function decodeSession(token) {
  if (!token) return null;
  const [base, signature] = token.split(".");
  if (!base || !signature || signValue(base) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8"));
    if (!payload?.adminId || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function createAdminSession(adminId) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession({ adminId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = decodeSession(token);
  if (!payload) return null;

  return prisma.adminUser.findUnique({
    where: { id: payload.adminId },
  });
}

export async function requireAdminPage() {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

export async function requireAdminApi() {
  const admin = await getAdminSession();
  if (!admin) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  return admin;
}
