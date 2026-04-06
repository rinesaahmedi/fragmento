import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { getKitchenById } from "../../../../../../lib/catalog";
import { buildKitchenCatalogWorkbook, parseKitchenCatalogSheet } from "../../../../../../lib/kitchen-catalog-sheet";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);

  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }

  const workbook = buildKitchenCatalogWorkbook(kitchen);

  return new NextResponse(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kitchen.slug}-catalog.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const kitchen = await getKitchenById(id);
    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const formData = await request.formData();
    const file = formData.get("catalogFile");

    if (!file || typeof file === "string" || typeof file.text !== "function") {
      throw new Error("Please upload the catalog file exported from this kitchen.");
    }

    const importedRows = parseKitchenCatalogSheet(new Uint8Array(await file.arrayBuffer()), file.name);
    if (!importedRows.length) {
      throw new Error("The catalog file has no item rows to import.");
    }

    const existingById = new Map(kitchen.items.map((item) => [item.id, item]));
    const existingByCode = new Map(kitchen.items.map((item) => [item.code, item]));
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of importedRows) {
        const existingItem = (row.id && existingById.get(row.id)) || existingByCode.get(row.code);
        if (!existingItem) {
          continue;
        }

        await tx.kitchenItem.update({
          where: { id: existingItem.id },
          data: row.data,
        });
        updatedCount += 1;
      }
    });

    if (!updatedCount) {
      throw new Error("No matching kitchen items were found. Re-import the file exported from this kitchen.");
    }

    return redirectWithFlash(
      request,
      `/admin/kitchens/${id}`,
      "success",
      `${updatedCount} item(s) updated from the spreadsheet.`,
    );
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Catalog import"));
  }
}
