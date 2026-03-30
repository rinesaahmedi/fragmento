import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { getOrderById } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/prisma";

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
  const formData = await request.formData();
  const status = String(formData.get("status") || "");

  await prisma.order.update({
    where: { id },
    data: {
      status: Object.values(OrderStatus).includes(status) ? status : OrderStatus.NEW,
    },
  });

  return NextResponse.redirect(new URL(`/admin/orders/${id}`, request.url), 303);
}
