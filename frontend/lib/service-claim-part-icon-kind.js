export function iconKind(option = {}, choiceGroup = null) {
  const partKey = String(option.claimPartKey || "").trim().toLowerCase();
  const componentId = String(option.componentId || "").trim().toLowerCase();
  const componentKey = String(option.componentKey || option.sourceComponentKey || "").trim().toLowerCase();
  const name = String(option.name || option.nameDe || "").trim().toLowerCase();
  const identity = `${componentId} ${componentKey} ${name}`;
  const groupComponentIds = new Set(
    (choiceGroup?.options || []).map((entry) => String(entry?.componentId || "").toLowerCase()),
  );
  const isHoodGroup = groupComponentIds.has("component-extractor-hood")
    && groupComponentIds.has("component-claim-filter");

  if (partKey === "blende" || identity.includes("filler panel") || identity.includes("passblende")) return "panel";

  if (partKey === "housing-side-panel") return "panel";
  if (partKey === "housing-top-front") return "panel";
  if (partKey === "housing-carcase") return "side-panel";
  if (partKey === "housing-plinth") return "panel";
  if (partKey === "housing-drawer-front") return "drawer";
  if (partKey.startsWith("housing-") && partKey.endsWith("-front")) return "front";
  if (partKey === "furniture-front" || componentKey === "dishwasher-front") return "front";
  if (partKey === "dishwasher" || identity.includes("dishwasher")) return "dishwasher";
  if (partKey === "sink-cabinet") return "sink-cabinet";
  if (partKey === "sink") return "sink";
  if (partKey === "faucet") return "faucet";
  if (partKey === "oven-drawer") return "drawer";
  if (partKey === "cooktop") return "cooktop";
  if (partKey === "oven" || partKey === "oven-set") return "oven";
  if (partKey === "filter") return "filter";
  if (partKey === "worktop-end-panel") return "side-panel";
  if (
    partKey === "worktop-left"
    || partKey === "worktop-right"
    || identity.includes("worktop")
    || identity.includes("arbeitsplatte")
  ) return "worktop";
  if (componentId === "component-extractor-hood" || identity.includes("extractor hood")) return "hood";
  if (isHoodGroup && identity.includes("cabinet")) return "hood-cabinet";
  if (
    componentKey.includes("wall-cabinet")
    || identity.includes("upper cabinet")
    || identity.includes("wall cabinet")
    || identity.includes("oberschrank")
  ) return "upper-cabinet";
  if (identity.includes("drawer") || identity.includes("schublade")) return "drawer-cabinet";
  if (identity.includes("cabinet")) return "cabinet";
  return "component";
}
