export const SERVICE_CODE_MONTAGE = "SVC-MONTAGE-001";
export const SERVICE_CODE_PICKUP = "SVC-PICKUP-001";

export function getServiceEligibility({
  selectedComponents = [],
  selectedAccessories = [],
}) {
  const componentCount = selectedComponents.length;
  const accessoryCount = selectedAccessories.length;
  const hasAnyPickupBase = componentCount > 0 || accessoryCount > 0;

  return {
    componentCount,
    accessoryCount,
    hasAnyPickupBase,
    montageEligible: hasAnyPickupBase,
    pickupEligible: hasAnyPickupBase,
  };
}

export function getServiceDisabledReason(serviceCode, eligibility, translate) {
  const t = typeof translate === "function" ? translate : (_key, fallback) => fallback;

  if ((serviceCode === SERVICE_CODE_MONTAGE || serviceCode === SERVICE_CODE_PICKUP) && !eligibility.montageEligible) {
    return t("configurator.servicePickupError", "Pickup can only be added once at least one item has been selected.");
  }

  return "";
}
