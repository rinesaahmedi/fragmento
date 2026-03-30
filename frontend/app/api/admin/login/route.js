import { NextResponse } from "next/server";
import { createAdminSession, verifyPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }

  await createAdminSession(admin.id);
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
