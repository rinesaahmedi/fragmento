import { requireAdminPage } from "../../../lib/auth";
import { AdminShell } from "../../../components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const admin = await requireAdminPage();

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
