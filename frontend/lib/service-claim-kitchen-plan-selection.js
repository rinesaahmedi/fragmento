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

const CLAIM_BLENDE_COMPONENT_PREFIX = "component-claim-blende-";
// These Blenden belong to the sink-cabinet claim in the plan. They remain a
// separate form row so a customer can describe the panel issue, but they must
// not split the cabinet into an additional clickable surface.
const CLAIM_BLENDE_COMPANION_SOURCE_KEYS_BY_SLUG = {
  "ab-105805": new Set(["sink-base"]),
  "ab-105809": new Set(["sink-base"]),
  "ab-105813": new Set(["sink-base"]),
  "ab-105817": new Set(["sink-base"]),
  "ab-105822": new Set(["base-module-1"]),
  "ab-105828": new Set(["base-module-1"]),
};
const CLAIM_BLENDE_QUANTITY_OVERRIDES_BY_SLUG = {
  // Both adjacent right-hand strips are independently drawn in this shared plan.
  "ab-105805": { "base-module-2": 2 },
  "ab-105809": { "base-module-2": 2 },
  "ab-105813": { "base-module-2": 2 },
  "ab-105817": { "base-module-2": 2 },
};
const CLAIM_INDEPENDENT_BLENDE_QUANTITY_BY_SLUG = {
  "ab-105805": { "base-module-2": 2 },
  "ab-105809": { "base-module-2": 2 },
  "ab-105813": { "base-module-2": 2 },
  "ab-105817": { "base-module-2": 2 },
  "ab-105822": { "base-module-2": 2 },
  "ab-105825": { "base-module-2": 2 },
  "ab-105828": { "base-module-2": 2 },
  "ab-105831": { "base-module-2": 2 },
  "ab-105834": { "base-module-2": 2 },
  "ab-105837": { "base-module-2": 2 },
  "ab-105840": { "base-module-2": 2 },
  "ab-105843": { "base-module-2": 2 },
};
const CLAIM_BLENDE_OVERRIDES_BY_SLUG = {
  // The left end panel beside the US30 is drawn in this shared layout, but
  // legacy KitchenItem data did not retain its commercial UPK20 reference.
  "ab-105822": [
    {
      sourceComponentKey: "base-module-1",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105828": [
    {
      sourceComponentKey: "base-module-1",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  // These lower-right UPK20 strips are drawn in the plans but are not attached
  // to the locked sink cabinet in the commercial kitchen item data.
  "ab-105823": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105826": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105829": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105832": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  // This separately drawn upper-right HPK2002 face is present in the shared
  // perspective plan even though the legacy kitchen item has no Blende fields.
  "ab-105837": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
  "ab-105840": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
  "ab-105843": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
};

function normalizeClaimBlendeCode(value) {
  return String(value || "").trim().replace(/\s+x\s*\d+$/i, "").trim();
}

function getClaimBlendeQuantity(item = {}) {
  const explicit = Number.parseInt(String(item.catalogBlendeQuantity || ""), 10);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const match = `${item.blendeCode || ""} ${item.blendeLabel || ""}`.match(/\bx\s*(\d+)\b/i);
  return Math.max(1, Number.parseInt(match?.[1] || "1", 10) || 1);
}

function claimBlendeComponentId(componentKey) {
  const normalizedKey = String(componentKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalizedKey ? `${CLAIM_BLENDE_COMPONENT_PREFIX}${normalizedKey}` : "";
}

function buildClaimBlendeMeta(item = {}) {
  const componentKey = String(item.componentKey || "").trim();
  const code = normalizeClaimBlendeCode(item.catalogBlende?.code || item.blendeCode);
  const componentId = claimBlendeComponentId(componentKey);
  if (!componentId || !code) return null;

  return {
    componentId,
    code,
    articleCode: code,
    name: String(item.catalogBlende?.name || item.blendeLabel || `${code} Filler Panel`).trim(),
    nameDe: String(item.catalogBlende?.nameDe || item.blendeLabel || `${code} Passblende`).trim(),
    componentKey: `claim-blende-${componentKey}`,
    sourceComponentKey: componentKey,
    sourceKitchenItemCode: String(item.code || "").trim(),
    sourceWidthMm: Number(item.widthMm) || null,
    claimPartKey: "blende",
    blendeQuantity: getClaimBlendeQuantity(item),
  };
}

export const SERVICE_CLAIM_PART_COMPONENT_IDS = {
  sink: "component-claim-sink",
  "sink-cabinet": "component-claim-sink-cabinet",
  faucet: "component-claim-faucet",
  oven: "component-claim-oven",
  "oven-drawer": "component-claim-oven-drawer",
  cooktop: "component-claim-cooktop",
  "worktop-left": "component-claim-worktop-left",
  "worktop-right": "component-claim-worktop-right",
  "worktop-end-panel": "component-claim-worktop-end-panel",
};

const ADDITIVE_SERVICE_CLAIM_PART_KEYS = new Set([
  // This panel is sold with the worktop but remains independently selectable
  // in claims. It must not replace the existing horizontal worktop selector.
  "worktop-end-panel",
]);

const SERVICE_CLAIM_LINKED_COMPONENT_GROUPS_BY_SLUG = {
  "ab-105805": [["component-extractor-hood", "component-under-cabinet-light"]],
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

function resolveServiceClaimArticleCode(meta = {}) {
  const articleNumber = String(meta.articleNumber || meta.articleCode || "").trim();
  if (articleNumber) {
    return articleNumber;
  }

  if (String(meta.componentKey || "").trim().toLowerCase() === "worktop") {
    return "PLR60";
  }

  return String(meta.code || "").trim();
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
      articleCode: resolveServiceClaimArticleCode(item),
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
      articleCode: resolveServiceClaimArticleCode(comp),
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
    const articleCode = String(
      resolvedMeta.articleCode
      || fallbackMeta.articleCode
      || code,
    ).trim();
    const name = resolveServiceClaimComponentName(componentId, {
      code,
      name: resolvedMeta.name || fallbackMeta.name,
    });

    selectableMeta.push({
      componentId,
      code,
      articleCode,
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
        articleCode: resolveServiceClaimArticleCode(item),
        name: resolveServiceClaimComponentName(componentIdForItem(item), item),
      },
    }));

  const blendeQuantityOverrides = CLAIM_BLENDE_QUANTITY_OVERRIDES_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || {};
  const independentBlendeQuantities = CLAIM_INDEPENDENT_BLENDE_QUANTITY_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || {};
  const companionBlendeSourceKeys = CLAIM_BLENDE_COMPANION_SOURCE_KEYS_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || new Set();
  const claimBlenden = sourceItems
    .map(({ item }) => buildClaimBlendeMeta(item))
    .filter(Boolean)
    .map((entry) => {
      const quantity = Number(blendeQuantityOverrides[entry.sourceComponentKey] || 0);
      return quantity > 0 ? { ...entry, blendeQuantity: quantity } : entry;
    })
    .map((entry) => (
      companionBlendeSourceKeys.has(entry.sourceComponentKey)
        ? { ...entry, isCompanionOption: true }
        : entry
    ))
    .flatMap((entry) => {
      const quantity = Number(independentBlendeQuantities[entry.sourceComponentKey] || 0);
      if (quantity <= 1) return [entry];
      return Array.from({ length: quantity }, (_, index) => ({
        ...entry,
        componentId: index === 0 ? entry.componentId : `${entry.componentId}-${index + 1}`,
        componentKey: index === 0 ? entry.componentKey : `${entry.componentKey}-${index + 1}`,
        blendeIndex: index + 1,
      }));
    });
  const claimBlendeSourceKeys = new Set(claimBlenden.map((entry) => entry.sourceComponentKey));
  const sourceItemByComponentKey = new Map(
    sourceItems.map(({ item }) => [String(item.componentKey || "").trim(), item]),
  );
  (CLAIM_BLENDE_OVERRIDES_BY_SLUG[String(kitchenSlug || "").toLowerCase()] || []).forEach((override) => {
    const sourceItem = sourceItemByComponentKey.get(override.sourceComponentKey);
    if (!sourceItem || claimBlendeSourceKeys.has(override.sourceComponentKey)) return;
    const meta = buildClaimBlendeMeta({
      ...sourceItem,
      blendeCode: override.code,
      blendeLabel: override.name,
      catalogBlende: {
        code: override.code,
        name: override.name,
        nameDe: override.nameDe,
      },
    });
    if (meta) {
      const resolvedMeta = companionBlendeSourceKeys.has(meta.sourceComponentKey)
        ? { ...meta, isCompanionOption: true }
        : meta;
      claimBlenden.push(resolvedMeta);
      claimBlendeSourceKeys.add(resolvedMeta.sourceComponentKey);
    }
  });

  for (const entry of sourceItems) {
    const componentId = componentIdForItem(entry.item);
    if (!componentId) {
      continue;
    }
    addSelectableComponent(componentId, entry.fallbackMeta);
  }

  const separatedSourceComponentIds = new Set(
    (claimParts || [])
      .filter((part) => !ADDITIVE_SERVICE_CLAIM_PART_KEYS.has(String(part?.partKey || "").trim()))
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
    ...claimBlenden.map((blende) => blende.componentId),
  ];
  const resolvedSelectableMeta = [
    ...selectableMeta.filter((entry) => !separatedSourceComponentIds.has(entry.componentId)),
    ...separatedClaimParts,
    ...claimBlenden,
  ].filter((entry) => resolvedSelectableIds.includes(entry.componentId) || separatedClaimPartIds.has(entry.componentId));

  return {
    selectableComponentIds: resolvedSelectableIds,
    selectableComponents: resolvedSelectableMeta,
    visibleComponentIds: [...selectableIds],
    source: "kitchen",
  };
}
