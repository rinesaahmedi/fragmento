export const SERVICE_CODE_MONTAGE = "SVC-MONTAGE-001";
export const SERVICE_CODE_PICKUP = "SVC-PICKUP-001";

export function getServiceEligibility({
  selectedComponents = [],
  selectedAccessories = [],
  montageRequiredCodes = [],
}) {
  const componentCount = selectedComponents.length;
  const accessoryCount = selectedAccessories.length;
  const requiredCodeSet = new Set(montageRequiredCodes);
  const addedComponents = selectedComponents.filter((item) => !item?.isLocked && !item?.isOrderLocked);
  const addedComponentCount = addedComponents.length;
  const addedCabinetCount = addedComponents.filter((item) => requiredCodeSet.has(item.code)).length;
  const hasAnyPickupBase = componentCount > 0 || accessoryCount > 0;

  return {
    componentCount,
    addedComponentCount,
    addedCabinetCount,
    accessoryCount,
    hasAnyPickupBase,
    montageEligible: addedComponentCount >= 3 && addedCabinetCount >= 2,
    pickupEligible: hasAnyPickupBase,
  };
}

export function getServiceDisabledReason(serviceCode, eligibility) {
  if (serviceCode === SERVICE_CODE_MONTAGE && !eligibility.montageEligible) {
    return "Montage erst ab 3 zusaetzlichen Komponenten, davon 2 Schrank-Komponenten";
  }

  if (serviceCode === SERVICE_CODE_PICKUP && !eligibility.pickupEligible) {
    return "Nur mit mindestens einer Komponente oder einem Zubehoer";
  }

  return "";
}
