import { classifySupplierRow } from "./kitchen-supplier-row.js";
import {
  buildCalloutBasedComponentKeyMap,
  componentKeyMatchesSupplierKind,
} from "./kitchen-import-callout-mapping.js";

const BASE_ASSIGNABLE_SLOTS = ["base-module-1", "base-module-2", "base-module-3", "drawer-module"];

function isDefaultPlaceholderRow(row) {
  return row && /^DEFAULT$/i.test(String(row.articles || "").trim());
}

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

/**
 * Article-code slot assignment when PDF callouts are missing or as a consistency check.
 * One unique plan slot per supplier row kind (oven, wall run, base run, etc.).
 */
export function buildAutoComponentKeyMap(supplierRows) {
  const sorted = [...supplierRows].sort(
    (left, right) => Number.parseInt(left.nr, 10) - Number.parseInt(right.nr, 10),
  );
  const map = new Map();
  const wallQueue = [];
  const dishwasherRows = [];
  const baseCabinetRows = [];

  for (const row of sorted) {
    const kind = classifySupplierRow(row);
    if (kind === "refrigerator") {
      map.set(row.nr, "refrigerator");
    } else if (kind === "oven-module") {
      map.set(row.nr, "oven-module");
    } else if (kind === "worktop") {
      map.set(row.nr, "worktop");
    } else if (kind === "sink-base") {
      map.set(row.nr, "sink-base");
    } else if (kind === "wall-cabinet" || kind === "hood-cabinet") {
      wallQueue.push(row);
    } else if (kind === "dishwasher") {
      dishwasherRows.push(row);
    } else if (kind === "base-cabinet") {
      baseCabinetRows.push(row);
    }
  }

  let wallIndex = 1;
  for (const row of wallQueue) {
    map.set(row.nr, `wall-cabinet-${wallIndex}`);
    wallIndex += 1;
  }

  const used = new Set(map.values());

  for (const row of dishwasherRows) {
    const slot = used.has("base-module-3") ? nextAvailableBaseSlot(used) : "base-module-3";
    map.set(row.nr, slot);
    used.add(slot);
  }

  for (const row of baseCabinetRows) {
    const slot = nextAvailableBaseSlot(used);
    map.set(row.nr, slot);
    used.add(slot);
  }

  return map;
}

export function buildNrToTemplateItemMap(templateItems = []) {
  const map = new Map();
  for (const item of templateItems) {
    if (item.itemType !== "COMPONENT" || !item.componentKey || item.isActive === false) {
      continue;
    }
    const nr = item.calloutNumber ? String(item.calloutNumber).trim() : "";
    if (nr) {
      map.set(nr, item);
    }
  }
  return map;
}

/**
 * Resolve one Excel row to a plan componentKey.
 *
 * Priority (general rules for all kitchens):
 * 1. Explicit componentKey column in Excel
 * 2. PDF callout position + article kind (when kinds agree)
 * 3. Article-code auto detection
 * 4. Layout template (only when article kind matches template slot)
 * 5. Layout template forced (only when PDF has no callouts)
 */
export function resolveComponentKey({
  row,
  nrToTemplateItem,
  calloutComponentKeyMap,
  autoComponentKeyMap,
  preferTemplate = false,
}) {
  if (row.componentKey) {
    return row.componentKey;
  }

  const slotKind = classifySupplierRow(row);

  if (calloutComponentKeyMap?.has(row.nr)) {
    const calloutKey = calloutComponentKeyMap.get(row.nr);
    if (componentKeyMatchesSupplierKind(slotKind, calloutKey)) {
      return calloutKey;
    }
  }

  if (autoComponentKeyMap?.has(row.nr)) {
    return autoComponentKeyMap.get(row.nr);
  }

  const templateItem = nrToTemplateItem?.get(row.nr);
  if (templateItem?.componentKey && componentKeyMatchesSupplierKind(slotKind, templateItem.componentKey)) {
    return templateItem.componentKey;
  }

  if (preferTemplate && templateItem?.componentKey) {
    return templateItem.componentKey;
  }

  return null;
}

/**
 * Plan NR -> componentKey for an import before writing to the database.
 * Returns errors for duplicate slots or unmapped rows.
 */
export function planSupplierImportMappings({
  supplierRows,
  callouts = [],
  templateItems = [],
  preferTemplate = false,
}) {
  const nrToTemplateItem = buildNrToTemplateItemMap(templateItems);
  const calloutComponentKeyMap = buildCalloutBasedComponentKeyMap(supplierRows, callouts);
  const autoComponentKeyMap = buildAutoComponentKeyMap(supplierRows);
  const hasCallouts = callouts.length > 0;
  const useTemplateFallback = preferTemplate || (!hasCallouts && templateItems.length > 0);

  const assignments = [];
  const errors = [];
  const warnings = [];
  const seenSlots = new Map();

  for (const row of supplierRows) {
    const slotKind = classifySupplierRow(row);
    const componentKey = resolveComponentKey({
      row,
      nrToTemplateItem,
      calloutComponentKeyMap,
      autoComponentKeyMap,
      preferTemplate: useTemplateFallback,
    });

    if (!componentKey) {
      errors.push(
        `Row ${row.rowNumber} (NR ${row.nr}) could not be mapped. Add a componentKey column, verify article codes, or ensure PDF callout numbers match Excel NR.`,
      );
      continue;
    }

    if (seenSlots.has(componentKey)) {
      const priorNr = seenSlots.get(componentKey);
      if (isDefaultPlaceholderRow(row) && isDefaultPlaceholderRow(supplierRows.find((entry) => entry.nr === priorNr))) {
        warnings.push(
          `Row ${row.rowNumber} (NR ${row.nr}) repeats included DEFAULT slot "${componentKey}" from NR ${priorNr}; only the first DEFAULT row per slot is imported.`,
        );
        continue;
      }
      errors.push(
        `Row ${row.rowNumber} (NR ${row.nr}) maps to duplicate component slot "${componentKey}" (already used by NR ${priorNr}). Excel NR values must match the PDF callout numbers for the same item.`,
      );
      continue;
    }

    seenSlots.set(componentKey, row.nr);
    assignments.push({ row, componentKey, slotKind });
  }

  const excelNrs = supplierRows.map((row) => String(row.nr));
  const pdfNrs = callouts.map((callout) => String(callout.nr));

  if (hasCallouts) {
    const missingInPdf = excelNrs.filter((nr) => !pdfNrs.includes(nr));
    if (missingInPdf.length) {
      warnings.push(`Excel NR ${missingInPdf.join(", ")} not found in PDF callout labels.`);
    }
    const extraInPdf = pdfNrs.filter((nr) => !excelNrs.includes(nr));
    if (extraInPdf.length) {
      warnings.push(`PDF callouts ${extraInPdf.join(", ")} have no matching Excel row.`);
    }
  } else {
    warnings.push(
      "No PDF callout numbers detected. Slots are assigned from article codes only — open the kitchen with ?calibrate=1 after import.",
    );
  }

  const defaultArticleRows = supplierRows.filter((row) => /^DEFAULT$/i.test(String(row.articles || "").trim()));
  if (defaultArticleRows.length > 3) {
    warnings.push(
      `Found ${defaultArticleRows.length} rows with article DEFAULT; standard AB sheets use 3 (oven, worktop, sink).`,
    );
  }

  return {
    assignments,
    errors,
    warnings,
    ok: errors.length === 0,
    calloutComponentKeyMap,
    autoComponentKeyMap,
    nrToTemplateItem,
  };
}
