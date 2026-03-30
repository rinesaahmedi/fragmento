import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/auth";
import { getOrdersForAdmin } from "../../../../lib/catalog";

export async function GET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  const orders = await getOrdersForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    status: searchParams.get("status") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  return NextResponse.json(orders);
}
