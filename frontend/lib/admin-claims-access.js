import { requireAdminApi, requireAdminPage } from "./auth";

/** Page, API, and sidebar access for authenticated admins. */
export function hasAdminClaimsAccess(adminEmail) {
  return Boolean(String(adminEmail || "").trim());
}

export function showAdminClaimsInNav(adminEmail) {
  return hasAdminClaimsAccess(adminEmail);
}

export async function requireAdminClaimsPage() {
  return requireAdminPage();
}

export async function requireAdminClaimsApi() {
  return requireAdminApi();
}
