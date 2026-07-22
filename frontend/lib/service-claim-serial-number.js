const ELECTRICAL_APPLIANCE_CLAIM_PART_KEYS = new Set([
  "cooktop",
  "dishwasher",
  "oven",
]);

const NON_APPLIANCE_CLAIM_PART_KEYS = new Set([
  "blende",
  "faucet",
  "filter",
  "furniture-front",
  "oven-drawer",
  "sink",
  "sink-cabinet",
  "worktop-end-panel",
  "worktop-left",
  "worktop-right",
]);

const ELECTRICAL_APPLIANCE_COMPONENT_IDS = new Set([
  "component-claim-cooktop",
  "component-claim-dishwasher",
  "component-claim-oven",
  "component-dishwasher-base",
  "component-extractor-hood",
  "component-refrigerator",
  "component-wm-base",
]);

export function isElectricalApplianceProblemArea(area = {}) {
  const claimPartKey = String(area.claimPartKey || "").trim().toLowerCase();
  if (ELECTRICAL_APPLIANCE_CLAIM_PART_KEYS.has(claimPartKey)) {
    return true;
  }
  if (NON_APPLIANCE_CLAIM_PART_KEYS.has(claimPartKey)) {
    return false;
  }

  const componentId = String(area.componentId || "").trim().toLowerCase();
  if (componentId.startsWith("reference-electrical-")) {
    return true;
  }
  if (componentId.startsWith("reference-furniture-")) {
    return false;
  }
  if (ELECTRICAL_APPLIANCE_COMPONENT_IDS.has(componentId)) {
    return true;
  }
  if (componentId.startsWith("component-claim-") || componentId.includes("cabinet")) {
    return false;
  }

  const code = String(area.code || "").trim().toUpperCase();
  if (/^(?:CAB-|TOP-|SINK|UPK|HPK|UHK)/.test(code)) {
    return false;
  }
  if (/^(?:DISH-|HOOD-|OVEN-|REF-|WM-)/.test(code)) {
    return true;
  }

  const name = String(area.name || area.label || "").trim().toLowerCase();
  if (/\b(?:cabinet|drawer|filter|front|panel|sink|faucet|worktop)\b/.test(name)) {
    return false;
  }

  return /\b(?:cooktop|dishwasher|dryer|extractor hood|freezer|fridge|hob|microwave|oven|range hood|refrigerator|washing machine|wine cooler)\b/.test(name);
}

export function countElectricalApplianceProblemAreas(areas = []) {
  return (Array.isArray(areas) ? areas : []).filter(isElectricalApplianceProblemArea).length;
}
