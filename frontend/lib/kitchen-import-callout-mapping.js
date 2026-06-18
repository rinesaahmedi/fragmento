import { classifySupplierRow } from "./kitchen-supplier-row.js";

const BASE_ASSIGNABLE_SLOTS = ["base-module-1", "base-module-2", "base-module-3", "drawer-module"];

function nextAvailableBaseSlot(used) {
  for (const slot of BASE_ASSIGNABLE_SLOTS) {
    if (!used.has(slot)) {
      return slot;
    }
  }

  let index = 4;
  while (used.has(`base-module-${index}`)) {
    index += 1;
  }
  return `base-module-${index}`;
}

function isDefaultSupplierRow(row) {
  return /^DEFAULT$/i.test(String(row.articles || "").trim());
}

function sortByCalloutX(entries) {
  return [...entries].sort((left, right) => left.callout.xPct - right.callout.xPct);
}

function supplierKindBucket(row) {
  const kind = classifySupplierRow(row);
  if (kind === "refrigerator") return "refrigerator";
  if (kind === "oven-module") return "oven-module";
  if (kind === "worktop") return "worktop";
  if (kind === "sink-base") return "sink-base";
  if (kind === "sink-faucet") return "sink-faucet";
  if (kind === "wall-cabinet" || kind === "hood-cabinet") return "wall";
  if (kind === "dishwasher") return "dishwasher";
  return "base";
}

export function componentKeyMatchesSupplierKind(kind, componentKey) {
  if (!componentKey) {
    return false;
  }

  if (kind === "refrigerator") {
    return componentKey === "refrigerator";
  }
  if (kind === "oven-module") {
    return componentKey === "oven-module";
  }
  if (kind === "worktop") {
    return componentKey === "worktop";
  }
  if (kind === "sink-base") {
    return componentKey === "sink-base";
  }
  if (kind === "sink-faucet") {
    return componentKey === "sink-faucet";
  }
  if (kind === "wall-cabinet" || kind === "hood-cabinet") {
    return componentKey.startsWith("wall-cabinet");
  }
  if (kind === "dishwasher") {
    return componentKey.startsWith("base-module") || componentKey === "drawer-module";
  }
  if (kind === "base-cabinet") {
    return componentKey.startsWith("base-module") || componentKey === "drawer-module";
  }

  return true;
}

/**
 * Maps Excel NR -> componentKey using PDF callout X order within article-based wall/base buckets.
 * Article classification is authoritative for slot family; callout position only orders slots left-to-right.
 */
export function buildCalloutBasedComponentKeyMap(supplierRows, callouts = []) {
  const calloutByNr = new Map(callouts.map((callout) => [String(callout.nr), callout]));
  const map = new Map();

  for (const row of supplierRows) {
    if (!isDefaultSupplierRow(row)) {
      continue;
    }
    const kind = classifySupplierRow(row);
    if (kind === "oven-module") {
      map.set(row.nr, "oven-module");
    } else if (kind === "worktop") {
      map.set(row.nr, "worktop");
    } else if (kind === "sink-base") {
      map.set(row.nr, "sink-base");
    }
  }

  const rowsWithCallouts = supplierRows
    .filter((row) => calloutByNr.has(row.nr) && !isDefaultSupplierRow(row) && !map.has(row.nr))
    .map((row) => ({ row, callout: calloutByNr.get(row.nr) }));

  if (!rowsWithCallouts.length) {
    return map.size ? map : null;
  }

  const refrigeratorRows = [];
  const wallRows = [];
  const dishwasherRows = [];
  const baseRows = [];

  for (const entry of rowsWithCallouts) {
    const bucket = supplierKindBucket(entry.row);
    if (bucket === "refrigerator") {
      refrigeratorRows.push(entry);
    } else if (bucket === "wall") {
      wallRows.push(entry);
    } else if (bucket === "dishwasher") {
      dishwasherRows.push(entry);
    } else if (bucket === "base") {
      baseRows.push(entry);
    }
  }

  for (const { row } of sortByCalloutX(refrigeratorRows)) {
    if (!map.has(row.nr)) {
      map.set(row.nr, "refrigerator");
    }
  }

  let wallIndex = 1;
  for (const { row } of sortByCalloutX(wallRows)) {
    if (map.has(row.nr)) {
      continue;
    }
    map.set(row.nr, `wall-cabinet-${wallIndex}`);
    wallIndex += 1;
  }

  const used = new Set(map.values());
  for (const { row } of sortByCalloutX(dishwasherRows)) {
    if (map.has(row.nr)) {
      continue;
    }
    const slot = used.has("base-module-3") ? nextAvailableBaseSlot(used) : "base-module-3";
    map.set(row.nr, slot);
    used.add(slot);
  }

  for (const { row } of sortByCalloutX(baseRows)) {
    if (map.has(row.nr)) {
      continue;
    }
    const slot = nextAvailableBaseSlot(used);
    map.set(row.nr, slot);
    used.add(slot);
  }

  return map.size ? map : null;
}
