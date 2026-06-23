import { redirectWithFlash } from "../../../../../lib/admin-forms";
import { verifyAdminLoginCode } from "../../../../../lib/admin-login-verification";
import { clearPendingAdminLogin, createAdminSession, getPendingAdminLogin } from "../../../../../lib/auth";
import { enforceRateLimit, getRequestClientIp } from "../../../../../lib/rate-limit";

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`admin-login-verify:ip:${clientIp}`, {
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });

    const pendingAdmin = await getPendingAdminLogin();
    if (!pendingAdmin?.loginVerificationCodeHash) {
      return redirectWithFlash(
        request,
        "/admin/login",
        "error",
        "Your sign-in session expired. Please sign in again.",
      );
    }

    const formData = await request.formData();
    const code = String(formData.get("code") || "").trim();

    const result = await verifyAdminLoginCode(pendingAdmin.id, code);
    if (!result.ok) {
      return redirectWithFlash(request, "/admin/login/verify", "error", result.error);
    }

    await createAdminSession(result.admin.id);
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin",
      },
    });
  } catch (error) {
    if (error?.status === 429) {
      return redirectWithFlash(request, "/admin/login/verify", "error", error.message);
    }

    await clearPendingAdminLogin();
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Admin login verification failed.";
    return redirectWithFlash(request, "/admin/login", "error", message);
  }
}
