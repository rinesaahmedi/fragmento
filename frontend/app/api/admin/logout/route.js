import { NextResponse } from "next/server";
import { clearAdminSession } from "../../../../lib/auth";

export async function POST(request) {
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}
