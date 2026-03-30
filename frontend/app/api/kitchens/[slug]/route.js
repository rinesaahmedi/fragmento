import { NextResponse } from "next/server";
import { getKitchenBySlug, serializeKitchenForLegacy } from "../../../../lib/catalog";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const kitchen = await getKitchenBySlug(slug);
  if (!kitchen || kitchen.status !== "ACTIVE") {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }

  return NextResponse.json(serializeKitchenForLegacy(kitchen));
}
