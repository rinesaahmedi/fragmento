function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function inferSlotKindFromComponentKey(componentKey) {
  const key = normalize(componentKey);
  if (!key) return "";
  if (key.includes("refrigerator")) return "refrigerator";
  if (key.includes("extractor-hood") || key.includes("hood")) return "extractor-hood";
  if (key.includes("wall-cabinet")) return "wall-cabinet";
  if (key.includes("under-cabinet-light")) return "under-cabinet-light";
  if (key.includes("wm-base") || key.includes("washing-machine") || key.includes("base-module-1")) return "washing-machine-base";
  if (key.includes("sink-base") || key.includes("base-module-2")) return "sink-base";
  if (key.includes("dishwasher-base") || key.includes("base-module-3")) return "dishwasher-base";
  if (key.includes("oven-base") || key.includes("oven-module")) return "oven-base";
  if (key.includes("drawer-base-3")) return "drawer-base-2";
  if (key.includes("cook-base") || key.includes("drawer-module")) return "drawer-base-2";
  if (key.includes("worktop")) return "worktop";
  if (key.includes("sink-faucet") || key.includes("faucet")) return "sink-faucet";
  return "";
}

export function inferItemKind(item) {
  const iconKey = normalize(item?.iconKey);
  const code = normalize(item?.code);
  const name = normalize(item?.name);
  const componentKey = normalize(item?.componentKey);

  return (
    inferSlotKindFromComponentKey(componentKey) ||
    (hasAny(iconKey, ["tall_refrigerator", "refrigerator"]) || hasAny(code, ["refrigerator"]) ? "refrigerator" : "") ||
    (hasAny(iconKey, ["extractor_hood_chimney", "extractor_hood"]) || hasAny(code, ["extractor-hood", "hood"]) ? "extractor-hood" : "") ||
    (hasAny(iconKey, ["wall_cabinet"]) || hasAny(code, ["wall-cabinet"]) ? "wall-cabinet" : "") ||
    (hasAny(iconKey, ["under_cabinet_light"]) || hasAny(code, ["under-cabinet-light"]) ? "under-cabinet-light" : "") ||
    (hasAny(iconKey, ["washing_machine_base"]) || hasAny(code, ["wm-base", "washing-machine"]) || hasAny(name, ["washing machine"]) ? "washing-machine-base" : "") ||
    (hasAny(iconKey, ["sink_base"]) || hasAny(code, ["sink-base"]) || hasAny(name, ["sink base"]) ? "sink-base" : "") ||
    (hasAny(iconKey, ["dishwasher_base", "dishwasher"]) || hasAny(code, ["dishwasher-base"]) || hasAny(name, ["dishwasher"]) ? "dishwasher-base" : "") ||
    (hasAny(iconKey, ["oven_base"]) || hasAny(code, ["oven-base", "oven-module"]) || hasAny(name, ["oven"]) ? "oven-base" : "") ||
    (hasAny(iconKey, ["drawer_base_three"]) || hasAny(code, ["drawer-base-3"]) || hasAny(name, ["3 drawers", "3 drawer"]) ? "drawer-base-3" : "") ||
    (hasAny(iconKey, ["drawer_base_two", "drawer_base"]) || hasAny(code, ["cook-base", "drawer-module"]) || hasAny(name, ["2 drawers", "2 drawer", "drawer base", "base cabinet"]) ? "drawer-base-2" : "") ||
    (hasAny(iconKey, ["worktop"]) || hasAny(code, ["worktop"]) ? "worktop" : "") ||
    (hasAny(iconKey, ["sink_faucet"]) || hasAny(code, ["sink-faucet", "faucet"]) ? "sink-faucet" : "")
  );
}

export function getCompatibleKindsForSlot(slot) {
  const explicitKinds = Array.isArray(slot?.compatibleKinds) ? slot.compatibleKinds.filter(Boolean) : [];
  if (explicitKinds.length) return explicitKinds;

  const inferred = inferSlotKindFromComponentKey(slot?.componentKey);
  return inferred ? [inferred] : [];
}

export function isItemCompatibleWithSlot(item, slot) {
  const compatibleKinds = getCompatibleKindsForSlot(slot);
  if (!compatibleKinds.length) return true;

  const itemKind = inferItemKind(item);
  return Boolean(itemKind) && compatibleKinds.includes(itemKind);
}

export function getCompatibilityMessage(item, slot) {
  const compatibleKinds = getCompatibleKindsForSlot(slot);
  if (!compatibleKinds.length) return "";

  const itemKind = inferItemKind(item);
  if (!itemKind) {
    return `This slot only accepts ${compatibleKinds.join(", ")} type components.`;
  }
  if (!compatibleKinds.includes(itemKind)) {
    return `This ${itemKind} component cannot be placed in ${slot.label}.`;
  }
  return "";
}
