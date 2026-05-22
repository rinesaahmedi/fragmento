import { redirect } from "next/navigation";
import { requireAdminApi, requireAdminPage } from "./auth";

function getClaimsAccessEmails() {
  const raw = process.env.ADMIN_CLAIMS_ACCESS_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function emailInAllowlist(adminEmail, allowed) {
  return allowed.has(String(adminEmail || "").trim().toLowerCase());
}

/** Page, API, and sidebar access — only emails listed in ADMIN_CLAIMS_ACCESS_EMAILS. */
export function hasAdminClaimsAccess(adminEmail) {
  const allowed = getClaimsAccessEmails();
  if (allowed.size === 0) return false;
  return emailInAllowlist(adminEmail, allowed);
}

export function showAdminClaimsInNav(adminEmail) {
  return hasAdminClaimsAccess(adminEmail);
}

export async function requireAdminClaimsPage() {
  const admin = await requireAdminPage();
  if (!hasAdminClaimsAccess(admin.email)) {
    redirect("/admin");
  }
  return admin;
}

export async function requireAdminClaimsApi() {
  const admin = await requireAdminApi();
  if (!hasAdminClaimsAccess(admin.email)) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
  return admin;
}
