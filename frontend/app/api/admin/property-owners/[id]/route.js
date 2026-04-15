import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validatePropertyOwnerInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const [owner] = await prisma.$queryRaw`
    SELECT
      po."id",
      po."firstName",
      po."lastName",
      po."email",
      po."phone",
      po."notes",
      po."createdAt",
      po."updatedAt",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyOwner" po
    LEFT JOIN "KitchenContract" kc ON kc."ownerId" = po."id"
    WHERE po."id" = ${id}
    GROUP BY po."id"
    LIMIT 1
  `;

  if (!owner) {
    return NextResponse.json({ error: "Property owner not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...owner,
    _count: { contracts: Number(owner.contractCount || 0) },
  });
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();

    if (intent === "delete") {
      await prisma.$executeRaw`DELETE FROM "PropertyOwner" WHERE "id" = ${id}`;
      return redirectWithFlash(request, "/admin/property-owners", "success", "Property owner deleted.");
    }

    const data = validatePropertyOwnerInput(formData);
    await prisma.$executeRaw`
      UPDATE "PropertyOwner"
      SET
        "firstName" = ${data.firstName},
        "lastName" = ${data.lastName},
        "email" = ${data.email},
        "phone" = ${data.phone},
        "notes" = ${data.notes},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    return redirectWithFlash(request, "/admin/property-owners", "success", "Property owner updated.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/property-owners", "error", mapAdminMutationError(error, "Property owner"));
  }
}
