import { ItemType } from "@prisma/client";
import { validateKitchenItemInput } from "./admin-forms";
import { findKitchenStructureSlot, getKitchenStructureSlots } from "./kitchen-structure";
import { getCompatibilityMessage, isItemCompatibleWithSlot } from "./kitchen-slot-compatibility";
import { prisma } from "./prisma";

export async function prepareKitchenItemMutation({ formData, kitchen, excludeItemId = "" }) {
  const input = validateKitchenItemInput(formData);
  const structureSlots = getKitchenStructureSlots(kitchen.slug);
  const duplicateCode = await prisma.kitchenItem.findFirst({
    where: {
      kitchenId: kitchen.id,
      code: input.code,
      ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (duplicateCode) {
    throw new Error(`Item code "${input.code}" is already used by "${duplicateCode.name}". Article numbers must be unique.`);
  }

  const [catalogBlende, catalogService] = await Promise.all([
    input.catalogBlendeId
      ? prisma.catalogBlende.findUnique({ where: { id: input.catalogBlendeId } })
      : null,
    input.catalogServiceId
      ? prisma.catalogService.findUnique({ where: { id: input.catalogServiceId } })
      : null,
  ]);

  if (input.catalogBlendeId && !catalogBlende) {
    throw new Error("Selected blende was not found.");
  }

  if (input.catalogServiceId && !catalogService) {
    throw new Error("Selected service was not found.");
  }

  const data = {
    ...input,
    catalogBlendeQuantity: catalogBlende ? (input.catalogBlendeQuantity || 1) : null,
    blendeCode: catalogBlende?.code || null,
    blendeLabel: catalogBlende?.nameDe || catalogBlende?.name || null,
    blendePrice: catalogBlende ? catalogBlende.price : null,
    catalogServiceId: catalogService?.id || null,
  };

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
