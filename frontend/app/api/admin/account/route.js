import { redirectWithFlash } from "../../../../lib/admin-forms";
import { hashPassword, requireAdminApi, verifyPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function requiredTrimmed(value, label) {
  const nextValue = String(value || "").trim();
  if (!nextValue) {
    throw new Error(`${label} is required.`);
  }
  return nextValue;
}

export async function POST(request) {
  try {
    const admin = await requireAdminApi();
    const formData = await request.formData();
    const email = requiredTrimmed(formData.get("email"), "Email").toLowerCase();
    const currentPassword = String(formData.get("currentPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!(await verifyPassword(currentPassword, admin.passwordHash))) {
      return redirectWithFlash(request, "/admin/account", "error", "Current password is incorrect.");
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        return redirectWithFlash(request, "/admin/account", "error", "New password must be at least 8 characters.");
      }
      if (newPassword !== confirmPassword) {
        return redirectWithFlash(request, "/admin/account", "error", "New password and confirmation do not match.");
      }
    }

    const updates = {};
    if (email !== admin.email) {
      updates.email = email;
    }
    if (newPassword) {
      updates.passwordHash = await hashPassword(newPassword);
    }

    if (!updates.email && !updates.passwordHash) {
      return redirectWithFlash(request, "/admin/account", "success", "No account changes were needed.");
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: updates,
    });

    return redirectWithFlash(request, "/admin/account", "success", "Admin account updated.");
  } catch (error) {
    if (error?.status === 401) {
      return redirectWithFlash(request, "/admin/login", "error", "Please sign in again.");
    }

    if (error?.code === "P2002") {
      return redirectWithFlash(request, "/admin/account", "error", "That email is already in use by another admin.");
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not update the admin account.";
    return redirectWithFlash(request, "/admin/account", "error", message);
  }
}
