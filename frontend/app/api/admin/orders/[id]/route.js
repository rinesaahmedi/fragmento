import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getOrderById } from "../../../../../lib/catalog";
import { confirmOrder, resendOrderEmail, retryOrderWebhook, updateOrderStatus } from "../../../../../lib/orders";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "status");
    const status = String(formData.get("status") || "");

    if (intent === "resend-email") {
      await resendOrderEmail(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent.");
    }

    if (intent === "retry-webhook") {
      await retryOrderWebhook(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Webhook forwarded successfully.");
    }

    if (intent === "confirm") {
      await confirmOrder(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent and order confirmed.");
    }

    if (intent === "cancel") {
      await updateOrderStatus(id, "CANCELLED");
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Order marked as cancelled.");
    }

    if (status === "CONFIRMED") {
      await confirmOrder(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent and order confirmed.");
    }

    await updateOrderStatus(id, status);
    return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Order status updated.");
  } catch (error) {
    const message = mapAdminMutationError(error, "Order");
    return redirectWithFlash(request, `/admin/orders/${id}`, "error", message);
  }
}
