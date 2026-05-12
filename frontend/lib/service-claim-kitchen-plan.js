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
 * Selectable components default to COMPONENT lines from confirmed + editable orders; if none,
 * all catalog components for that kitchen are selectable.
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

    const orderLines = [
      ...(orderState.confirmedItems || []),
      ...((orderState.editableOrder && orderState.editableOrder.items) || []),
    ];

    const selectableIds = new Set();
    const selectableMeta = [];

    for (const line of orderLines) {
      if (line.itemType !== ItemType.COMPONENT) {
        continue;
      }
      const ki = componentItemsByCode.get(line.code);
      if (!ki) {
        continue;
      }
      const componentId = componentIdForItem(ki);
      if (selectableIds.has(componentId)) {
        continue;
      }
      selectableIds.add(componentId);
      selectableMeta.push({
        componentId,
        code: line.code,
        name: stripProductDimensionsFromLabel(
          String(line.nameSnapshot || ki.name || line.code || "").trim() || line.code,
        ),
      });
    }

    if (selectableIds.size === 0) {
      for (const comp of kitchenConfig.components || []) {
        const componentId = componentIdForItem(comp);
        if (selectableIds.has(componentId)) {
          continue;
        }
        selectableIds.add(componentId);
        selectableMeta.push({
          componentId,
          code: comp.code,
          name: stripProductDimensionsFromLabel(String(comp.name || comp.code || "").trim() || comp.code),
        });
      }
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
