export const SERVICE_CODE_MONTAGE = "SVC-MONTAGE-001";
export const SERVICE_CODE_PICKUP = "SVC-PICKUP-001";

export const MONTAGE_MIN_MERCHANDISE_EUR = 1000;
export const MONTAGE_MIN_CABINETS = 3;

function isMerchandiseExcludedFromValue(item) {
  return Boolean(item?.isLocked || item?.isOrderLocked || item?.kitchenItem?.isLocked);
}

/** Sum of payable merchandise (matches configurator / order effective line totals; locked baseline = 0). */
function sumMerchandiseEffectiveValue(components, accessories) {
  const sum = (items) =>
    items.reduce((acc, item) => {
      if (isMerchandiseExcludedFromValue(item)) return acc;
      return acc + Number(item?.price ?? 0);
    }, 0);
  return sum(components) + sum(accessories);
}

export function getServiceEligibility({
  selectedComponents = [],
  selectedAccessories = [],
  montageCabinetCodes = [],
}) {
  const componentCount = selectedComponents.length;
  const accessoryCount = selectedAccessories.length;
  const cabinetCodeSet = new Set(montageCabinetCodes);
  const hasAnyPickupBase = componentCount > 0 || accessoryCount > 0;
  const merchandiseSubtotal = sumMerchandiseEffectiveValue(selectedComponents, selectedAccessories);
  const cabinetCount = selectedComponents.filter(
    (item) => cabinetCodeSet.has(item.code) && !isMerchandiseExcludedFromValue(item),
  ).length;

  return {
    componentCount,
    accessoryCount,
    hasAnyPickupBase,
    merchandiseSubtotal,
    cabinetCount,
    montageEligible:
      merchandiseSubtotal >= MONTAGE_MIN_MERCHANDISE_EUR && cabinetCount >= MONTAGE_MIN_CABINETS,
    pickupEligible: hasAnyPickupBase,
  };
}

export function getServiceDisabledReason(serviceCode, eligibility) {
  if (serviceCode === SERVICE_CODE_MONTAGE && !eligibility.montageEligible) {
    return `Montage ab Warenwert ${MONTAGE_MIN_MERCHANDISE_EUR.toLocaleString("de-DE")} Euro und mindestens ${MONTAGE_MIN_CABINETS} Schrank-Komponenten`;
  }

  if (serviceCode === SERVICE_CODE_PICKUP && !eligibility.pickupEligible) {
    return "Nur mit mindestens einer Komponente oder einem Zubehoer";
  }

  return "";
}
