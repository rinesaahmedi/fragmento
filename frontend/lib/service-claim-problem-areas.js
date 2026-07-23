import { stripProductDimensionsFromLabel } from "./product-label-format.js";

export function parseServiceClaimProblemAreas(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return [];
  }

  try {
    const areas = JSON.parse(text);
    if (!Array.isArray(areas)) {
      return [];
    }

    return areas
      .map((area) => {
        const componentId = String(area?.componentId || "").trim();
        const name = stripProductDimensionsFromLabel(String(area?.name || "").trim());
        const nameDe = stripProductDimensionsFromLabel(String(area?.nameDe || "").trim());
        const code = String(area?.code || "").trim();
        const articleCode = String(area?.articleCode || "").trim();
        const detail = String(area?.detail || "").trim();
        const serialNumber = String(area?.serialNumber || "").trim();
        const markerX = Number(area?.planMarker?.x);
        const markerY = Number(area?.planMarker?.y);
        const planMarker = (
          Number.isFinite(markerX)
          && Number.isFinite(markerY)
          && markerX >= 0
          && markerX <= 100
          && markerY >= 0
          && markerY <= 100
        )
          ? {
              x: Math.round(markerX * 10000) / 10000,
              y: Math.round(markerY * 10000) / 10000,
            }
          : null;
        const attachments = Array.isArray(area?.attachments)
          ? area.attachments
              .map((attachment) => {
                const filename = String(attachment?.filename || "").trim();
                const contentType = String(attachment?.contentType || "").trim();
                const size = Number(attachment?.size || 0);

                if (!filename) {
                  return null;
                }

                return {
                  filename,
                  contentType,
                  size: Number.isFinite(size) && size >= 0 ? size : 0,
                };
              })
              .filter(Boolean)
          : [];

        if (!componentId && !name && !code) {
          return null;
        }

        return {
          componentId,
          name,
          ...(nameDe ? { nameDe } : {}),
          code,
          ...(articleCode ? { articleCode } : {}),
          ...(detail ? { detail } : {}),
          ...(serialNumber ? { serialNumber } : {}),
          ...(planMarker ? { planMarker } : {}),
          ...(attachments.length ? { attachments } : {}),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function formatServiceClaimProblemArea(area) {
  const name = stripProductDimensionsFromLabel(String(area?.name || "").trim());
  const code = String(area?.code || "").trim();

  if (name && code) {
    return `${name} (${code})`;
  }
  return name || code || "";
}

export function formatServiceClaimProblemAreaForEmail(area) {
  const name = stripProductDimensionsFromLabel(String(area?.nameDe || area?.name || "").trim());
  const articleCode = String(area?.articleCode || "").trim();

  if (name && articleCode) {
    return `${name} (${articleCode})`;
  }
  return name || "";
}

export function formatServiceClaimProblemAreaList(raw) {
  return parseServiceClaimProblemAreas(raw)
    .map(formatServiceClaimProblemArea)
    .filter(Boolean);
}
