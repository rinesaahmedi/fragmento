import { stripProductDimensionsFromLabel } from "./product-label-format";

/** First-line prefixes we may auto-insert; must match `kitchenAreasLinePrefix` in service form copy per language. */
export const KITCHEN_AREA_FIRST_LINE_PREFIXES = [
  "Küchenbereiche:",
  "Kitchen areas:",
  "Mutfak bölgeleri:",
  "Zonas de la cocina:",
  "Zones concernées :",
  "Кухонные зоны:",
];

export function splitKitchenAreasFromProblemDescription(text) {
  const raw = String(text ?? "");
  const lines = raw.split("\n");
  if (!lines.length) {
    return { userText: raw };
  }
  const first = lines[0];
  const matched = KITCHEN_AREA_FIRST_LINE_PREFIXES.some((prefix) => first.startsWith(prefix));
  if (!matched) {
    return { userText: raw };
  }
  let i = 1;
  if (lines[i] === "") {
    i += 1;
  }
  return { userText: lines.slice(i).join("\n") };
}

/**
 * Rebuilds full problem text: auto first line from selection + preserved user text below.
 * `metaById` maps componentId -> { name }.
 */
export function composeProblemDescriptionWithAreas(prefix, componentIds, metaById, existingFullText) {
  const { userText } = splitKitchenAreasFromProblemDescription(existingFullText);
  const names = (componentIds || [])
    .map((id) => stripProductDimensionsFromLabel(metaById.get(id)?.name))
    .filter(Boolean);
  if (!names.length) {
    return userText.trimEnd();
  }
  const line = `${prefix} ${names.join(", ")}`;
  const rest = userText.trim();
  return rest ? `${line}\n\n${rest}` : line;
}
