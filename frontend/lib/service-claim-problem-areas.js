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
        const code = String(area?.code || "").trim();
        const detail = String(area?.detail || "").trim();
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
          code,
          ...(detail ? { detail } : {}),
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

export function formatServiceClaimProblemAreaList(raw) {
  return parseServiceClaimProblemAreas(raw)
    .map(formatServiceClaimProblemArea)
    .filter(Boolean);
}
