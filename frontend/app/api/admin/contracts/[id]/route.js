import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function parseAddressVerificationRecord(formData) {
  const rawValue = String(formData.get("addressVerification") || "").trim();
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function getReturnPath(formData, fallback) {
  const rawPath = String(formData.get("returnTo") || "").trim();
  return rawPath.startsWith("/admin/") ? rawPath : fallback;
}

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const contract = await prisma.kitchenContract.findUnique({
    where: { id },
    include: { kitchen: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract number not found" }, { status: 404 });
  }

  const [ownerRow] = await prisma.$queryRaw`
    SELECT
      kc."ownerId",
      po."id",
      po."firstName",
      po."lastName",
      po."email",
      po."phone",
      po."notes",
      po."createdAt",
      po."updatedAt"
    FROM "KitchenContract" kc
    LEFT JOIN "PropertyOwner" po ON po."id" = kc."ownerId"
    WHERE kc."id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json({
    ...contract,
    ownerId: ownerRow?.ownerId || null,
    owner: ownerRow?.id
      ? {
          id: ownerRow.id,
          firstName: ownerRow.firstName,
          lastName: ownerRow.lastName,
          email: ownerRow.email,
          phone: ownerRow.phone,
          notes: ownerRow.notes,
          createdAt: ownerRow.createdAt,
          updatedAt: ownerRow.updatedAt,
        }
      : null,
  });
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let kitchenId = "";
  let returnPath = "/admin/contracts";

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();
    const contract = await prisma.kitchenContract.findUnique({
      where: { id },
      select: { id: true, kitchenId: true },
    });

    if (!contract) {
      throw new Error("Contract number not found.");
    }
    kitchenId = contract.kitchenId;
    returnPath = getReturnPath(formData, `/admin/kitchens/${contract.kitchenId}`);

    if (intent === "update") {
      const data = validateKitchenContractInput(formData);
      const addressVerification = parseAddressVerificationRecord(formData);
      if (!isAddressVerificationRecordValid(addressVerification, data)) {
        throw new Error("Verify the contract address before updating the contract.");
      }
      await prisma.kitchenContract.update({
        where: { id },
        data: {
          contractNumber: data.contractNumber,
          country: data.country,
          city: data.city,
          postalCode: data.postalCode,
          address1: data.address1,
          address2: data.address2,
          building: data.building,
          floor: data.floor,
          unitNumber: data.unitNumber,
          notes: data.notes,
        },
      });
      await prisma.$executeRaw`
        UPDATE "KitchenContract"
        SET "ownerId" = ${data.ownerId}
        WHERE "id" = ${id}
      `;

      return redirectWithFlash(request, returnPath, "success", "Contract number updated.");
    }

    if (intent === "delete") {
      await prisma.kitchenContract.delete({
        where: { id },
      });

      return redirectWithFlash(request, returnPath, "success", "Contract number deleted.");
    }

    const isActive = intent === "reactivate";
    await prisma.kitchenContract.update({
      where: { id },
      data: { isActive },
    });

    return redirectWithFlash(
      request,
      returnPath,
      "success",
      isActive ? "Contract number reactivated." : "Contract number deactivated.",
    );
  } catch (error) {
    const pathname = returnPath || (kitchenId ? `/admin/kitchens/${kitchenId}` : "/admin/contracts");
    return redirectWithFlash(request, pathname, "error", mapAdminMutationError(error, "Contract number"));
  }
}
