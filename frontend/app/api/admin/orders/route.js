import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { getOrdersForAdmin } from "../../../../lib/catalog";
import { deleteAllOrders } from "../../../../lib/orders";

export async function GET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  const orders = await getOrdersForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    status: searchParams.get("status") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    q: searchParams.get("q") || "",
  });

  return NextResponse.json(orders);
}

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent !== "delete-all") {
      throw new Error("Unsupported order action.");
    }

    const deletedCount = await deleteAllOrders();
    return redirectWithFlash(
      request,
      "/admin/orders",
      "success",
      `Deleted ${deletedCount} order${deletedCount === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    const message = mapAdminMutationError(error, "Order");
    return redirectWithFlash(request, "/admin/orders", "error", message);
  }
}
