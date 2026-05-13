import { stripProductDimensionsFromLabel } from "./product-label-format";

/** First-line prefixes we may auto-insert; must match `kitchenAreasLinePrefix` in service form copy per language. */
export const KITCHEN_AREA_FIRST_LINE_PREFIXES = [
  "K\u00fcchenbereiche:",
  "Kitchen areas:",
  "Mutfak b\u00f6lgeleri:",
  "Zonas de la cocina:",
  "Zones concern\u00e9es :",
  "\u041a\u0443\u0445\u043e\u043d\u043d\u044b\u0435 \u0437\u043e\u043d\u044b:",
];

export function splitKitchenAreasFromProblemDescription(text) {
  const raw = String(text ?? "");
  const lines = raw.split("\n");
  if (!lines.length) {
    return { userText: raw, areaDetailsByName: new Map(), areaDetails: [] };
  }

  const first = lines[0];
  const matchedPrefix = KITCHEN_AREA_FIRST_LINE_PREFIXES.find((prefix) => first.startsWith(prefix));
  if (!matchedPrefix) {
    return { userText: raw, areaDetailsByName: new Map(), areaDetails: [] };
  }

  const areaDetailsByName = new Map();
  const areaDetails = [];
  let i = 1;

  while (i < lines.length && lines[i] !== "") {
    const separatorIndex = lines[i].indexOf(":");
    if (separatorIndex < 0) {
      break;
    }
    const name = lines[i].slice(0, separatorIndex).trim();
    const detail = lines[i].slice(separatorIndex + 1).trimStart();
    if (name) {
      areaDetailsByName.set(name, detail);
      areaDetails.push(detail);
    }
    i += 1;
  }

  if (i === 1) {
    const inlineAreas = first
      .slice(matchedPrefix.length)
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    for (const name of inlineAreas) {
      areaDetailsByName.set(name, "");
      areaDetails.push("");
    }
  }

  if (lines[i] === "") {
    i += 1;
  }

  return { userText: lines.slice(i).join("\n"), areaDetailsByName, areaDetails };
}

/**
 * Rebuilds full problem text: auto selected areas as editable lines + preserved user text below.
 * `metaById` maps componentId -> { name }.
 */
export function composeProblemDescriptionWithAreas(prefix, componentIds, metaById, existingFullText, formatName) {
  const { userText, areaDetailsByName, areaDetails } = splitKitchenAreasFromProblemDescription(existingFullText);
  const names = (componentIds || [])
    .map((id) => {
      const meta = metaById.get(id);
      const rawName = stripProductDimensionsFromLabel(meta?.name);
      return typeof formatName === "function" ? formatName(meta, rawName) : rawName;
    })
    .filter(Boolean);
  if (!names.length) {
    return userText.trimEnd();
  }

  const lines = [
    prefix,
    ...names.map((name, index) => `${name}: ${areaDetailsByName.get(name) || areaDetails[index] || ""}`),
  ];
  const rest = userText.trim();
  return rest ? `${lines.join("\n")}\n\n${rest}` : lines.join("\n");
}
