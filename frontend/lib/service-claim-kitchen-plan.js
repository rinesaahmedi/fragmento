import { ItemType, KitchenStatus } from "@prisma/client";
import { componentIdForItem } from "../components/kitchen-selection-utils";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog";
import { getContractOrderState } from "./kitchen-contracts";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg";
import { stripProductDimensionsFromLabel } from "./product-label-format";
import { prisma } from "./prisma";
import { normalizeServiceClaimContractNumber } from "./service-claims";

/**
 * Loads kitchen SVG + config for a contract so the service form can show an interactive plan.
 * Selectable components come from included base items plus COMPONENT lines on confirmed orders.
 */
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
        name: stripProductDimensionsFromLabel(String(item.name || item.code || "").trim() || item.code),
      });
    }

    for (const comp of kitchenConfig.components || []) {
      const componentId = componentIdForItem(comp);
      if (!componentId || componentMetaById.has(componentId)) {
        continue;
      }
      componentMetaById.set(componentId, {
        code: String(comp.code || "").trim(),
        name: stripProductDimensionsFromLabel(String(comp.name || comp.code || "").trim() || comp.code),
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
      const name = stripProductDimensionsFromLabel(
        String(resolvedMeta.name || fallbackMeta.name || code || componentId).trim() || code || componentId,
      );

      selectableMeta.push({
        componentId,
        code,
        name,
      });
    }

    for (const item of kitchen.items || []) {
      if (item.itemType !== ItemType.COMPONENT || !item.isLocked) {
        continue;
      }

      const componentId = componentIdForItem(item);
      if (!componentId) {
        continue;
      }

      selectableIds.add(componentId);
      addSelectableMeta(componentId, {
        code: String(item.code || "").trim(),
        name: stripProductDimensionsFromLabel(
          String(item.name || item.code || "").trim() || item.code,
        ),
      });
    }

    const orderLines = orderState.confirmedItems || [];

    for (const line of orderLines) {
      if (line.itemType !== ItemType.COMPONENT) {
        continue;
      }
      const ki = componentItemsByCode.get(line.code);
      if (!ki) {
        continue;
      }
      const componentId = componentIdForItem(ki);
      const fallbackMeta = {
        code: String(line.code || "").trim(),
        name: stripProductDimensionsFromLabel(
          String(line.nameSnapshot || ki.name || line.code || "").trim() || line.code,
        ),
      };
      selectableIds.add(componentId);
      addSelectableMeta(componentId, fallbackMeta);
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
