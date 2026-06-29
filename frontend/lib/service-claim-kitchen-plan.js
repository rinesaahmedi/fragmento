import { ItemType, KitchenStatus } from "@prisma/client";
import { componentIdForItem, getLinkedComponentIds } from "../components/kitchen-selection-utils";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog";
import { getContractOrderState } from "./kitchen-contracts";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg";
import { stripProductDimensionsFromLabel } from "./product-label-format";
import { prisma } from "./prisma";
import { normalizeServiceClaimContractNumber } from "./service-claims";

/**
 * Loads kitchen SVG + config for a contract so the service form can show an interactive plan.
 * Selectable components come from locked default components and included base items plus COMPONENT lines on confirmed orders.
 */
const CLAIM_COMPONENT_CODE_ALIASES = new Map([
  ["HOOD-B-FH664621E", "CAB-HOOD-B-600"],
]);

const CLAIM_LINKED_COMPONENT_META = {
  "component-extractor-hood": {
    code: "HOOD-B-FH664621E",
    name: "Extractor Hood",
  },
};

const CLAIM_COMPONENT_LABEL_OVERRIDES = {
  "component-sink-faucet": "Sink",
};

function resolveServiceClaimComponentName(componentId, meta = {}) {
  const override = CLAIM_COMPONENT_LABEL_OVERRIDES[componentId];
  if (override) {
    return override;
  }

  return stripProductDimensionsFromLabel(String(meta.name || meta.code || componentId).trim() || meta.code || componentId);
}

export async function getServiceClaimKitchenPlan(contractNumber) {
  const normalized = normalizeServiceClaimContractNumber(contractNumber);
  if (!normalized) {
    return null;
  }

  try {
    const contract = await prisma.kitchenContract.findUnique({
      where: { contractNumber: normalized },
      include: { kitchen: true },
    });

    if (!contract?.isActive || !contract.kitchen || contract.kitchen.status !== KitchenStatus.ACTIVE) {
      return null;
    }

    const slug = String(contract.kitchen.slug || "").trim();
    if (!slug) {
      return null;
    }

    const kitchen = await getKitchenBySlug(slug);
    if (!kitchen) {
      return null;
    }

    const kitchenConfig = serializeKitchenForLegacy(kitchen);
    const svgMarkup = await loadKitchenSvgMarkup(slug);
    const orderState = await getContractOrderState(contract.id);

    const componentItemsByCode = new Map(
      (kitchen.items || [])
        .filter((item) => item.itemType === ItemType.COMPONENT)
        .map((item) => [item.code, item]),
    );
    const componentMetaById = new Map();

    for (const item of kitchen.items || []) {
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

    for (const comp of kitchenConfig.components || []) {
      const componentId = componentIdForItem(comp);
      if (!componentId || componentMetaById.has(componentId)) {
        continue;
      }
      componentMetaById.set(componentId, {
        code: String(comp.code || "").trim(),
        name: resolveServiceClaimComponentName(componentId, comp),
      });
    }

    const selectableIds = new Set();
    const selectableMetaIds = new Set();
    const selectableMeta = [];

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

      const linkedIds = getLinkedComponentIds(slug, componentId);
      linkedIds.forEach((linkedId) => {
        selectableIds.add(linkedId);
        addSelectableMeta(linkedId, linkedId === componentId
          ? fallbackMeta
          : CLAIM_LINKED_COMPONENT_META[linkedId]);
      });
    }

    for (const item of kitchen.items || []) {
      if (item.itemType !== ItemType.COMPONENT) {
        continue;
      }

      const componentId = componentIdForItem(item);
      if (!componentId) {
        continue;
      }

      addSelectableComponent(componentId, {
        code: String(item.code || "").trim(),
        name: resolveServiceClaimComponentName(componentId, item),
      });
    }

    const orderLines = orderState.confirmedItems || [];

    for (const line of orderLines) {
      if (line.itemType !== ItemType.COMPONENT) {
        continue;
      }
      const normalizedCode = CLAIM_COMPONENT_CODE_ALIASES.get(line.code) || line.code;
      const ki = componentItemsByCode.get(normalizedCode);
      if (!ki) {
        continue;
      }
      const componentId = componentIdForItem(ki);
      const fallbackMeta = {
        code: String(normalizedCode || line.code || "").trim(),
        name: resolveServiceClaimComponentName(componentId, {
          code: normalizedCode || line.code,
          name: line.nameSnapshot || ki.name || line.code,
        }),
      };
      addSelectableComponent(componentId, fallbackMeta);
    }

    return {
      kitchenName: kitchen.name,
      kitchenSlug: slug,
      kitchenConfig,
      svgMarkup,
      selectableComponentIds: [...selectableIds],
      selectableComponents: selectableMeta,
    };
  } catch (error) {
    console.warn("Service claim kitchen plan:", error?.message || error);
    return null;
  }
}
