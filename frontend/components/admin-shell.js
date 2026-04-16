import { cookies } from "next/headers";
import { AdminShellClient } from "./admin-shell-client";

function normalizeLanguage(value) {
  return value === "de" ? "de" : "en";
}

export async function AdminShell({ adminEmail, children }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get("adminLanguage")?.value);

  return (
    <AdminShellClient adminEmail={adminEmail} initialLanguage={initialLanguage}>
      {children}
    </AdminShellClient>
  );
}
