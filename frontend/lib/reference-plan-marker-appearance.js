// Ratios of the displayed sketch width, so email resizing preserves the view.
const DEFAULT_APPEARANCE = Object.freeze({
  diameter: 34 / 850,
  fontSize: 12.5 / 850,
  borderWidth: 3 / 850,
});

export function normalizeReferencePlanMarkerAppearance(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return DEFAULT_APPEARANCE;
    }
  }
  const { diameter, fontSize, borderWidth } = value || {};
  if (
    ![diameter, fontSize, borderWidth].every((entry) => typeof entry === "number" && Number.isFinite(entry))
    || diameter < 0.005 || diameter > 0.25
    || fontSize <= 0 || fontSize > diameter
    || borderWidth <= 0 || borderWidth >= diameter / 2
  ) {
    return DEFAULT_APPEARANCE;
  }
  return { diameter, fontSize, borderWidth };
}
