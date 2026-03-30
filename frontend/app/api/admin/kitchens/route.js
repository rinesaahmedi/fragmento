import { KitchenStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchensForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  await requireAdminApi();
  return NextResponse.json(await listKitchensForAdmin());
}

export async function POST(request) {
  await requireAdminApi();
  const formData = await request.formData();

  const kitchen = await prisma.kitchen.create({
    data: {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      status: Object.values(KitchenStatus).includes(String(formData.get("status"))) ? String(formData.get("status")) : "DRAFT",
      description: String(formData.get("description") || "").trim() || null,
    },
  });

  return NextResponse.redirect(new URL(`/admin/kitchens/${kitchen.id}`, request.url), 303);
}
