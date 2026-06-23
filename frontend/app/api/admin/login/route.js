import { redirectWithFlash } from "../../../../lib/admin-forms";
import {
  beginAdminLoginVerification,
  sendAdminLoginVerificationEmail,
} from "../../../../lib/admin-login-verification";
import { createPendingAdminLogin, verifyPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const clientIp = getRequestClientIp(request);

    enforceRateLimit(`admin-login:ip:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (email) {
      enforceRateLimit(`admin-login:email:${email.toLowerCase()}`, {
        limit: 8,
        windowMs: 15 * 60 * 1000,
      });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return redirectWithFlash(request, "/admin/login", "error", "Invalid email or password.");
    }

    const { code } = await beginAdminLoginVerification(admin.id);
    await sendAdminLoginVerificationEmail({ to: admin.email, code });
    await createPendingAdminLogin(admin.id);

    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin/login/verify",
      },
    });
  } catch (error) {
    if (error?.status === 429) {
      return redirectWithFlash(request, "/admin/login", "error", error.message);
    }
    if (error?.status === 503) {
      return redirectWithFlash(request, "/admin/login", "error", error.message);
    }
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Admin login is not available because the server is misconfigured.";
    return redirectWithFlash(request, "/admin/login", "error", message);
  }
}
