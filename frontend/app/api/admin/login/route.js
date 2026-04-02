import { NextResponse } from "next/server";
import { redirectWithFlash } from "../../../../lib/admin-forms";
import { createAdminSession, verifyPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return redirectWithFlash(request, "/admin/login", "error", "Invalid email or password.");
    }

    await createAdminSession(admin.id);
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Admin login is not available because the server is misconfigured.";
    return redirectWithFlash(request, "/admin/login", "error", message);
  }
}
