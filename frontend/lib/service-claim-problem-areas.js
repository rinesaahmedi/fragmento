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

        if (!componentId && !name && !code) {
          return null;
        }

        return { componentId, name, code };
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
