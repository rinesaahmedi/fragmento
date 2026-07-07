import { KitchenStatus } from "@prisma/client";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog.js";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg.js";
import { prisma } from "./prisma.js";
import { buildServiceClaimSelectableComponents } from "./service-claim-kitchen-plan-selection.js";
import { normalizeServiceClaimContractNumber } from "./service-claims.js";

/**
 * Loads kitchen SVG + config for a contract so the service form can show an interactive plan.
 * Selectable components match the assigned kitchen's order/configurator component surface.
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
    const selectable = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig,
      kitchenSlug: slug,
    });

    return {
      kitchenName: kitchen.name,
      kitchenSlug: slug,
      kitchenConfig,
      svgMarkup,
      selectableComponentIds: selectable.selectableComponentIds,
      selectableComponents: selectable.selectableComponents,
    };
  } catch (error) {
    console.warn("Service claim kitchen plan:", error?.message || error);
    return null;
  }
}
