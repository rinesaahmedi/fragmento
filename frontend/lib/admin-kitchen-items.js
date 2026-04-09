import { ItemType } from "@prisma/client";
import { validateKitchenItemInput } from "./admin-forms";
import { findKitchenStructureSlot, getKitchenStructureSlots } from "./kitchen-structure";
import { getCompatibilityMessage, isItemCompatibleWithSlot } from "./kitchen-slot-compatibility";
import { prisma } from "./prisma";

export async function prepareKitchenItemMutation({ formData, kitchen, excludeItemId = "" }) {
  const data = validateKitchenItemInput(formData);
  const structureSlots = getKitchenStructureSlots(kitchen.slug);

  if (data.itemType !== ItemType.COMPONENT) {
    return {
      ...data,
      componentKey: null,
    };
  }

  if (structureSlots.length) {
    if (!data.componentKey) {
      throw new Error("Choose a kitchen position for this component.");
    }

    const slot = findKitchenStructureSlot(kitchen.slug, data.componentKey);
    if (!slot) {
      throw new Error("Selected kitchen position is not valid for this kitchen.");
    }

    if (!isItemCompatibleWithSlot(data, slot)) {
      throw new Error(getCompatibilityMessage(data, slot) || "This component is not compatible with the selected slot.");
    }
  }

  if (data.componentKey) {
    const duplicate = await prisma.kitchenItem.findFirst({
      where: {
        kitchenId: kitchen.id,
        componentKey: data.componentKey,
        ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (duplicate) {
      const slot = findKitchenStructureSlot(kitchen.slug, data.componentKey);
      throw new Error(
        `${slot?.label || data.componentKey} is already assigned to "${duplicate.name}". Edit that item instead or clear the slot first.`,
      );
    }
  }

  return data;
}
