import { ItemType } from "@prisma/client";

export const SINK_AND_WORKTOP_NAME = "Worktop";
export const SINK_AND_WORKTOP_CODE = "SINK-WORKTOP";

function getItemName(item) {
  return String(item?.name || item?.nameSnapshot || "").trim().toLowerCase();
}

function getItemCode(item) {
  return String(item?.code || "").trim().toUpperCase();
}

function getItemComponentKey(item) {
  return String(item?.componentKey || item?.kitchenItem?.componentKey || "").trim().toLowerCase();
}

function getItemType(item) {
  return String(item?.itemType || "").trim().toUpperCase();
}

export function isWorktopOrderItem(item) {
  const code = getItemCode(item);
  const componentKey = getItemComponentKey(item);
  const name = getItemName(item);
  return (
    getItemType(item) === ItemType.COMPONENT &&
    (componentKey === "worktop" || code.startsWith("TOP-") || name.startsWith("worktop"))
  );
}

export function isSinkOrderItem(item) {
  const code = getItemCode(item);
  const componentKey = getItemComponentKey(item);
  const name = getItemName(item);
  return (
    getItemType(item) === ItemType.COMPONENT &&
    (componentKey === "sink-faucet" || code.startsWith("SINK-") || name.includes("sink and worktop") || name.includes("sink and waste system"))
  );
}

export function mergeSinkAndWorktopItems(items = [], createMergedItem) {
  const worktopItem = items.find(isWorktopOrderItem);
  const sinkItem = items.find(isSinkOrderItem);

  if (!worktopItem || !sinkItem) {
    return items;
  }

  const mergedItem = createMergedItem(sinkItem, worktopItem);
  const mergedItems = [];
  let insertedMergedItem = false;

  for (const item of items) {
    if (item === sinkItem || item === worktopItem) {
      if (!insertedMergedItem) {
        mergedItems.push(mergedItem);
        insertedMergedItem = true;
      }
      continue;
    }

    mergedItems.push(item);
  }

  return mergedItems;
}
