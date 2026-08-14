"use client";

function getExternalReferrerHost() {
  try {
    if (!document.referrer) return "";
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? "" : referrer.hostname;
  } catch {
    return "";
  }
}

export function getPublicTrackingContext(searchParams) {
  const params = searchParams || new URLSearchParams();
  const get = typeof params.get === "function"
    ? (key) => params.get(key) || ""
    : (key) => String(params?.[key] || "");
  const utmSource = get("utm_source");
  return {
    source: get("source") || utmSource,
    utmMedium: get("utm_medium"),
    utmCampaign: get("utm_campaign"),
    referrerHost: getExternalReferrerHost(),
  };
}

export function trackPublicPageOpened(searchParams, path = "") {
  if (typeof window === "undefined") return;

  const trackingContext = getPublicTrackingContext(searchParams);
  const payload = JSON.stringify({
    eventType: "PAGE_OPENED",
    path: path || window.location.pathname,
    ...trackingContext,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/public-visit-events", new Blob([payload], { type: "application/json" }));
    return;
  }

  fetch("/api/public-visit-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
