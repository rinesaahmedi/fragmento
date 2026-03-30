import { KitchenStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { getKitchenById } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }
  return NextResponse.json(kitchen);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const formData = await request.formData();

  await prisma.kitchen.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      status: Object.values(KitchenStatus).includes(String(formData.get("status"))) ? String(formData.get("status")) : "DRAFT",
      description: String(formData.get("description") || "").trim() || null,
    },
  });

  return NextResponse.redirect(new URL(`/admin/kitchens/${id}`, request.url), 303);
}
