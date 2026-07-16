import { NextResponse } from "next/server";
import {
  hasPublicTrackingOptOut,
  PUBLIC_VISIT_EVENT_TYPES,
  safelyTrackPublicVisitEvent,
} from "../../../lib/public-visit-tracking.js";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  if (body?.eventType !== PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED) {
    return NextResponse.json({ ok: false, error: "Unsupported event type." }, { status: 400 });
  }

  if (hasPublicTrackingOptOut(request)) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  await safelyTrackPublicVisitEvent({
    request,
    eventType: PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED,
    source: body.source,
    utmMedium: body.utmMedium,
    utmCampaign: body.utmCampaign,
    referrerHost: body.referrerHost,
    path: body.path,
  });

  return NextResponse.json({ ok: true });
}
