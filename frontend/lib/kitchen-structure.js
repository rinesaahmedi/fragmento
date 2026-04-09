const KNOWN_KITCHEN_STRUCTURES = {
  "kitchen-model-b": {
    slots: [
      { componentKey: "wall-cabinet-1", label: "Wall cabinet left", zone: "Upper run", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-2", label: "Wall cabinet mid-left", zone: "Upper run", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-3", label: "Wall cabinet center", zone: "Upper run", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-4", label: "Wall cabinet middle-right", zone: "Upper run", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-5", label: "Wall cabinet right", zone: "Upper run", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "extractor-hood", label: "Extractor hood", zone: "Upper run", compatibleKinds: ["extractor-hood"] },
      { componentKey: "under-cabinet-light", label: "Under-cabinet light", zone: "Lighting", compatibleKinds: ["under-cabinet-light"] },
      { componentKey: "base-module-1", label: "Washing machine base", zone: "Lower run", compatibleKinds: ["washing-machine-base"] },
      { componentKey: "base-module-2", label: "Sink base", zone: "Lower run", compatibleKinds: ["sink-base"] },
      { componentKey: "base-module-3", label: "Dishwasher base", zone: "Lower run", compatibleKinds: ["dishwasher-base"] },
      { componentKey: "oven-module", label: "Oven base", zone: "Lower run", compatibleKinds: ["oven-base"] },
      { componentKey: "drawer-module", label: "Drawer base", zone: "Lower run", compatibleKinds: ["drawer-base-2"] },
      { componentKey: "refrigerator", label: "Tall refrigerator", zone: "Utility tower", compatibleKinds: ["refrigerator"] },
      { componentKey: "worktop", label: "Worktop", zone: "Work surface", compatibleKinds: ["worktop"] },
      { componentKey: "sink-faucet", label: "Sink faucet", zone: "Work surface", compatibleKinds: ["sink-faucet"] },
    ],
  },
  "kitchen-model-c": {
    slots: [
      { componentKey: "refrigerator", label: "Tall refrigerator", zone: "Tall units", compatibleKinds: ["refrigerator"] },
      { componentKey: "extractor-hood", label: "Extractor hood", zone: "Cooking wall", compatibleKinds: ["extractor-hood"] },
      { componentKey: "wall-cabinet-1", label: "Wall cabinet left", zone: "Cooking wall", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-2", label: "Wall cabinet mid-left", zone: "Cooking wall", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-3", label: "Wall cabinet mid-right", zone: "Cooking wall", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "wall-cabinet-4", label: "Wall cabinet right", zone: "Cooking wall", compatibleKinds: ["wall-cabinet"] },
      { componentKey: "under-cabinet-light", label: "Under-cabinet light", zone: "Lighting", compatibleKinds: ["under-cabinet-light"] },
      { componentKey: "cook-base-left", label: "Cook base left", zone: "Lower run", compatibleKinds: ["drawer-base-2"] },
      { componentKey: "oven-base", label: "Oven base", zone: "Lower run", compatibleKinds: ["oven-base"] },
      { componentKey: "cook-base-right", label: "Cook base right", zone: "Lower run", compatibleKinds: ["drawer-base-2"] },
      { componentKey: "wm-base", label: "Washing machine base", zone: "Lower run", compatibleKinds: ["washing-machine-base"] },
      { componentKey: "sink-base", label: "Sink base", zone: "Lower run", compatibleKinds: ["sink-base"] },
      { componentKey: "dishwasher-base", label: "Dishwasher base", zone: "Lower run", compatibleKinds: ["dishwasher-base"] },
      { componentKey: "drawer-base-3", label: "Drawer base 3", zone: "Lower run", compatibleKinds: ["drawer-base-3"] },
      { componentKey: "worktop", label: "Worktop", zone: "Work surface", compatibleKinds: ["worktop"] },
      { componentKey: "sink-faucet", label: "Sink faucet", zone: "Work surface", compatibleKinds: ["sink-faucet"] },
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
