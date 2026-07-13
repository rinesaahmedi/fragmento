import { ItemType } from "@prisma/client";
import { componentIdForItem, getLinkedComponentIds } from "../components/kitchen-selection-utils.js";
import { stripProductDimensionsFromLabel } from "./product-label-format.js";

const CLAIM_LINKED_COMPONENT_META = {
  "component-extractor-hood": {
    code: "HOOD-B-FH664621E",
    name: "Extractor Hood",
  },
  "component-under-cabinet-light": {
    code: "ACC-LIGHT-003",
    name: "LED Lighting Set",
  },
};

const CLAIM_COMPONENT_LABEL_OVERRIDES = {
  "component-sink-faucet": "Sink",
};

export const SERVICE_CLAIM_PART_COMPONENT_IDS = {
  sink: "component-claim-sink",
  "sink-cabinet": "component-claim-sink-cabinet",
  faucet: "component-claim-faucet",
  oven: "component-claim-oven",
  "oven-drawer": "component-claim-oven-drawer",
  cooktop: "component-claim-cooktop",
  "worktop-left": "component-claim-worktop-left",
  "worktop-right": "component-claim-worktop-right",
};

const SERVICE_CLAIM_LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "ab-105805": [["component-extractor-hood", "component-under-cabinet-light"]],
  "ab-105809": [["component-extractor-hood", "component-under-cabinet-light"]],
  "ab-105813": [["component-extractor-hood", "component-under-cabinet-light"]],
  "ab-105817": [["component-extractor-hood", "component-under-cabinet-light"]],
};

export function getServiceClaimLinkedComponentIds(kitchenSlug, componentId) {
  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const linkedGroups = SERVICE_CLAIM_LINKED_COMPONENT_GROUPS_BY_SLUG[normalizedSlug] || [];
  const linkedGroup = linkedGroups.find((group) => group.includes(componentId));
  return linkedGroup || [componentId];
}

function resolveServiceClaimComponentName(componentId, meta = {}) {
  const override = CLAIM_COMPONENT_LABEL_OVERRIDES[componentId];
  if (override) {
    return override;
  }

  return stripProductDimensionsFromLabel(String(meta.name || meta.code || componentId).trim() || meta.code || componentId);
}

export function buildServiceClaimComponentMetaById(kitchen, kitchenConfig) {
  const componentMetaById = new Map();

  for (const item of kitchen?.items || []) {
    if (item.itemType !== ItemType.COMPONENT) {
      continue;
    }
    const componentId = componentIdForItem(item);
    if (!componentId) {
      continue;
    }
    componentMetaById.set(componentId, {
      code: String(item.code || "").trim(),
      name: resolveServiceClaimComponentName(componentId, item),
    });
  }

  for (const comp of kitchenConfig?.components || []) {
    const componentId = componentIdForItem(comp);
    if (!componentId || componentMetaById.has(componentId)) {
      continue;
    }
    componentMetaById.set(componentId, {
      code: String(comp.code || "").trim(),
      name: resolveServiceClaimComponentName(componentId, comp),
    });
  }

  return componentMetaById;
}

export function buildServiceClaimSelectableComponents({
  kitchen,
  kitchenConfig,
  kitchenSlug,
  confirmedItems = [],
  claimParts = [],
}) {
  const componentMetaById = buildServiceClaimComponentMetaById(kitchen, kitchenConfig);
  const selectableIds = new Set();
  const selectableMetaIds = new Set();
  const selectableMeta = [];
  const confirmedComponentCodes = new Set();
  const confirmedKitchenItemIds = new Set();

  for (const item of confirmedItems || []) {
    if (item?.itemType !== ItemType.COMPONENT) {
      continue;
    }

    const code = String(item.code || "").trim();
    if (code) {
      confirmedComponentCodes.add(code);
    }
    if (item.kitchenItemId) {
      confirmedKitchenItemIds.add(item.kitchenItemId);
    }
    if (item.kitchenItem?.id) {
      confirmedKitchenItemIds.add(item.kitchenItem.id);
    }
  }

  function isDefaultOrConfirmedComponent(item) {
    if (item?.itemType !== ItemType.COMPONENT) {
      return false;
    }
    if (item.isLocked) {
      return true;
    }

    const code = String(item.code || "").trim();
    return (code && confirmedComponentCodes.has(code)) || confirmedKitchenItemIds.has(item.id);
  }

  function addSelectableMeta(componentId, fallbackMeta = {}) {
    if (!componentId || selectableMetaIds.has(componentId)) {
      return;
    }

    selectableMetaIds.add(componentId);
    const resolvedMeta = componentMetaById.get(componentId) || {};
    const code = String(resolvedMeta.code || fallbackMeta.code || "").trim();
    const name = resolveServiceClaimComponentName(componentId, {
      code,
      name: resolvedMeta.name || fallbackMeta.name,
    });

    selectableMeta.push({
      componentId,
      code,
      name,
    });
  }

  function addSelectableComponent(componentId, fallbackMeta = {}) {
    if (!componentId) {
      return;
    }

    const linkedIds = [
      ...new Set(
        getLinkedComponentIds(kitchenSlug, componentId).flatMap((linkedId) =>
          getServiceClaimLinkedComponentIds(kitchenSlug, linkedId),
        ),
      ),
    ];
    linkedIds.forEach((linkedId) => {
      selectableIds.add(linkedId);
      addSelectableMeta(linkedId, linkedId === componentId
        ? fallbackMeta
        : CLAIM_LINKED_COMPONENT_META[linkedId]);
    });
  }

  const sourceItems = (kitchen?.items || [])
    .filter(isDefaultOrConfirmedComponent)
    .map((item) => ({
      item,
      fallbackMeta: {
        code: String(item.code || "").trim(),
        name: resolveServiceClaimComponentName(componentIdForItem(item), item),
      },
    }));

  for (const entry of sourceItems) {
    const componentId = componentIdForItem(entry.item);
    if (!componentId) {
      continue;
    }
    addSelectableComponent(componentId, entry.fallbackMeta);
  }

  const separatedSourceComponentIds = new Set(
    (claimParts || [])
      .map((part) => componentIdForItem({ componentKey: part?.sourceComponentKey }))
      .filter(Boolean),
  );
  const separatedClaimParts = (claimParts || [])
    .map((part) => {
      const partKey = String(part?.partKey || "").trim();
      const componentId = SERVICE_CLAIM_PART_COMPONENT_IDS[partKey];
      if (!componentId) {
        return null;
      }

      return {
        componentId,
        code: String(part?.articleCode || part?.sourceKitchenItemCode || "").trim(),
        articleCode: String(part?.articleCode || "").trim(),
        sourceKitchenItemCode: String(part?.sourceKitchenItemCode || "").trim(),
        name: String(part?.name || partKey).trim(),
        nameDe: String(part?.nameDe || "").trim(),
        componentKey: String(part?.sourceComponentKey || "").trim(),
        claimPartKey: partKey,
      };
    })
    .filter(Boolean);

  const separatedClaimPartIds = new Set(separatedClaimParts.map((part) => part.componentId));
  const resolvedSelectableIds = [
    ...[...selectableIds].filter((componentId) => !separatedSourceComponentIds.has(componentId)),
    ...separatedClaimParts.map((part) => part.componentId),
  ];
  const resolvedSelectableMeta = [
    ...selectableMeta.filter((entry) => !separatedSourceComponentIds.has(entry.componentId)),
    ...separatedClaimParts,
  ].filter((entry) => resolvedSelectableIds.includes(entry.componentId) || separatedClaimPartIds.has(entry.componentId));

  return {
    selectableComponentIds: resolvedSelectableIds,
    selectableComponents: resolvedSelectableMeta,
    visibleComponentIds: [...selectableIds],
    source: "kitchen",
  };
}
