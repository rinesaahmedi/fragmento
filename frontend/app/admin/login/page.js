import { redirect } from "next/navigation";
import AdminLoginPanel from "../../../components/admin-login-panel";
import { getFormMessage } from "../../../lib/admin-forms";
import { getAdminSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }) {
  let admin = null;
  let configError = "";

  try {
    admin = await getAdminSession();
  } catch (error) {
    configError = error instanceof Error ? error.message : "Admin login is not available because the server is misconfigured.";
  }

  if (admin) {
    redirect("/admin");
  }

  const resolvedSearchParams = (await searchParams) || {};
  const errorMessage = configError || getFormMessage(resolvedSearchParams, "error");

  return <AdminLoginPanel errorMessage={errorMessage} />;
}
