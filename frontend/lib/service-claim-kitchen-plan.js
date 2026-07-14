import { KitchenStatus } from "@prisma/client";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog.js";
import { getContractOrderState } from "./kitchen-contracts.js";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg.js";
import { getOrderKindForContractNumber } from "./order-kind.js";
import { prisma } from "./prisma.js";
import { buildServiceClaimSelectableComponents } from "./service-claim-kitchen-plan-selection.js";
import { normalizeServiceClaimContractNumber } from "./service-claims.js";

// TEMPORARY: expose every component as ordered while testing service claims.
// Delete this flag and the conditional below to restore real confirmed-order filtering.
const SHOW_FULL_KITCHEN_IN_SERVICE_CLAIMS = true;

async function loadKitchenClaimParts(kitchenId) {
  try {
    return await prisma.$queryRaw`
      SELECT
        "partKey",
        "name",
        "nameDe",
        "articleCode",
        "sourceKitchenItemCode",
        "sourceComponentKey",
        "sortOrder"
      FROM "KitchenClaimPart"
      WHERE "kitchenId" = ${kitchenId}
        AND "isActive" = true
      ORDER BY "sortOrder" ASC, "partKey" ASC
    `;
  } catch (error) {
    const message = String(error?.message || "");
    if (error?.code === "P2010" || /KitchenClaimPart.*does not exist/i.test(message)) {
      return [];
    }
    throw error;
  }
}

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
    const orderKind = getOrderKindForContractNumber(contract.contractNumber);
    const contractOrderState = await getContractOrderState(contract.id, prisma, orderKind);
    const claimParts = await loadKitchenClaimParts(contract.kitchen.id);
    const selectable = buildServiceClaimSelectableComponents({
      kitchen,
      kitchenConfig,
      kitchenSlug: slug,
      confirmedItems: SHOW_FULL_KITCHEN_IN_SERVICE_CLAIMS
        ? kitchen.items
        : contractOrderState.confirmedItems,
      claimParts,
    });

    return {
      kitchenName: kitchen.name,
      kitchenSlug: slug,
      kitchenConfig,
      svgMarkup,
      selectableComponentIds: selectable.selectableComponentIds,
      selectableComponents: selectable.selectableComponents,
      visibleComponentIds: selectable.visibleComponentIds,
      claimParts,
    };
  } catch (error) {
    console.warn("Service claim kitchen plan:", error?.message || error);
    return null;
  }
}
