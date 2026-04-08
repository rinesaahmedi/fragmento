const KNOWN_KITCHEN_STRUCTURES = {
  "kitchen-model-b": {
    slots: [
      { componentKey: "wall-cabinet-1", label: "Wall cabinet left", zone: "Upper run" },
      { componentKey: "wall-cabinet-2", label: "Wall cabinet mid-left", zone: "Upper run" },
      { componentKey: "wall-cabinet-3", label: "Wall cabinet center", zone: "Upper run" },
      { componentKey: "wall-cabinet-4", label: "Wall cabinet hood", zone: "Upper run" },
      { componentKey: "wall-cabinet-5", label: "Wall cabinet right", zone: "Upper run" },
      { componentKey: "under-cabinet-light", label: "Under-cabinet light", zone: "Lighting" },
      { componentKey: "base-module-1", label: "Washing machine base", zone: "Lower run" },
      { componentKey: "base-module-2", label: "Sink base", zone: "Lower run" },
      { componentKey: "base-module-3", label: "Dishwasher base", zone: "Lower run" },
      { componentKey: "oven-module", label: "Oven base", zone: "Lower run" },
      { componentKey: "drawer-module", label: "Drawer base", zone: "Lower run" },
      { componentKey: "refrigerator", label: "Tall refrigerator", zone: "Utility tower" },
      { componentKey: "worktop", label: "Worktop", zone: "Work surface" },
      { componentKey: "sink-faucet", label: "Sink faucet", zone: "Work surface" },
    ],
  },
  "kitchen-model-c": {
    slots: [
      { componentKey: "refrigerator", label: "Tall refrigerator", zone: "Tall units" },
      { componentKey: "extractor-hood", label: "Extractor hood", zone: "Cooking wall" },
      { componentKey: "wall-cabinet-1", label: "Wall cabinet left", zone: "Cooking wall" },
      { componentKey: "wall-cabinet-2", label: "Wall cabinet mid-left", zone: "Cooking wall" },
      { componentKey: "wall-cabinet-3", label: "Wall cabinet mid-right", zone: "Cooking wall" },
      { componentKey: "wall-cabinet-4", label: "Wall cabinet right", zone: "Cooking wall" },
      { componentKey: "under-cabinet-light", label: "Under-cabinet light", zone: "Lighting" },
      { componentKey: "cook-base-left", label: "Cook base left", zone: "Lower run" },
      { componentKey: "oven-base", label: "Oven base", zone: "Lower run" },
      { componentKey: "cook-base-right", label: "Cook base right", zone: "Lower run" },
      { componentKey: "wm-base", label: "Washing machine base", zone: "Lower run" },
      { componentKey: "sink-base", label: "Sink base", zone: "Lower run" },
      { componentKey: "dishwasher-base", label: "Dishwasher base", zone: "Lower run" },
      { componentKey: "drawer-base-3", label: "Drawer base 3", zone: "Lower run" },
      { componentKey: "worktop", label: "Worktop", zone: "Work surface" },
      { componentKey: "sink-faucet", label: "Sink faucet", zone: "Work surface" },
    ],
  },
};

function normalizeSlug(slug) {
  return String(slug || "").trim().toLowerCase();
}

export function getKitchenStructure(slug) {
  return KNOWN_KITCHEN_STRUCTURES[normalizeSlug(slug)] || { slots: [] };
}

export function getKitchenStructureSlots(slug) {
  return getKitchenStructure(slug).slots;
}

export function findKitchenStructureSlot(slug, componentKey) {
  return getKitchenStructureSlots(slug).find((slot) => slot.componentKey === componentKey) || null;
}
