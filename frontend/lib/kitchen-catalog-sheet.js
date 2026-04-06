import { ItemType } from "@prisma/client";
import * as XLSX from "xlsx";

export const KITCHEN_CATALOG_COLUMNS = [
  "order",
  "id",
  "code",
  "name",
  "itemType",
  "price",
  "infoText",
  "iconKey",
  "colorKey",
  "componentKey",
  "sortOrder",
  "isLocked",
  "isActive",
];

const COLUMN_WIDTHS = [10, 26, 24, 28, 16, 12, 42, 20, 16, 22, 12, 12, 12];

function normalizeCsvLineEndings(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function requiredString(value, label, rowNumber) {
  const nextValue = String(value || "").trim();
  if (!nextValue) {
    throw new Error(`Row ${rowNumber}: ${label} is required.`);
  }
  return nextValue;
}

function optionalString(value) {
  const nextValue = String(value || "").trim();
  return nextValue || null;
}

function parseItemType(value, rowNumber) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!Object.values(ItemType).includes(normalized)) {
    throw new Error(`Row ${rowNumber}: itemType must be one of ${Object.values(ItemType).join(", ")}.`);
  }
  return normalized;
}

function parsePrice(value, rowNumber) {
  const rawValue = requiredString(value, "price", rowNumber).replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawValue)) {
    throw new Error(`Row ${rowNumber}: price must be a number with up to 2 decimals.`);
  }
  return rawValue;
}

function parseSortOrder(value, rowNumber) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return 0;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Row ${rowNumber}: sortOrder must be a whole number.`);
  }
  return parsed;
}

function parseBoolean(value, label, rowNumber) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  throw new Error(`Row ${rowNumber}: ${label} must be true or false.`);
}

function normalizeImportedRecord(record, rowNumber) {
  const id = optionalString(record.id);
  const code = requiredString(record.code, "code", rowNumber);

  return {
    id,
    code,
    data: {
      code,
      name: requiredString(record.name, "name", rowNumber),
      itemType: parseItemType(record.itemType, rowNumber),
      price: parsePrice(record.price, rowNumber),
      infoText: optionalString(record.infoText),
      iconKey: optionalString(record.iconKey),
      colorKey: optionalString(record.colorKey),
      componentKey: optionalString(record.componentKey),
      sortOrder: parseSortOrder(record.sortOrder, rowNumber),
      isLocked: parseBoolean(record.isLocked, "isLocked", rowNumber),
      isActive: parseBoolean(record.isActive, "isActive", rowNumber),
    },
  };
}

function parseCsv(text) {
  const input = normalizeCsvLineEndings(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((currentRow) => currentRow.some((value) => String(value || "").trim() !== ""));
}

function parseKitchenCatalogCsv(text) {
  const rows = parseCsv(text);
  return parseKitchenCatalogRows(rows);
}

export function buildKitchenCatalogWorkbook(kitchen) {
  const title = `${kitchen.name} Catalog Export`;
  const rows = [
    [title],
    KITCHEN_CATALOG_COLUMNS,
    ...(kitchen.items || []).map((item, index) => [
      index + 1,
      item.id,
      item.code,
      item.name,
      item.itemType,
      Number(item.price).toFixed(2),
      item.infoText || "",
      item.iconKey || "",
      item.colorKey || "",
      item.componentKey || "",
      item.sortOrder,
      item.isLocked ? "true" : "false",
      item.isActive ? "true" : "false",
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = COLUMN_WIDTHS.map((width) => ({ wch: width }));
  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: KITCHEN_CATALOG_COLUMNS.length - 1 },
    },
  ];
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 1, c: 0 },
      e: { r: Math.max(rows.length - 1, 1), c: KITCHEN_CATALOG_COLUMNS.length - 1 },
    }),
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(kitchen.slug || kitchen.name || "catalog"));

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

function parseKitchenCatalogRows(rows) {
  if (!rows.length) {
    throw new Error("The file is empty.");
  }

  const headerIndex = rows.findIndex((row) =>
    KITCHEN_CATALOG_COLUMNS.every((column) => row.some((value) => String(value || "").trim() === column)),
  );

  if (headerIndex === -1) {
    throw new Error(`Missing columns: ${KITCHEN_CATALOG_COLUMNS.join(", ")}.`);
  }

  const headers = rows[headerIndex].map((header) => String(header || "").trim());
  const missingColumns = KITCHEN_CATALOG_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`Missing columns: ${missingColumns.join(", ")}.`);
  }

  return rows
    .slice(headerIndex + 1)
    .filter((values) => values.some((value) => String(value || "").trim() !== ""))
    .map((values, index) => {
      const rowNumber = headerIndex + index + 2;
      const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
      return normalizeImportedRecord(record, rowNumber);
    });
}

function parseKitchenCatalogWorkbook(binary) {
  const workbook = XLSX.read(binary, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The workbook has no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  return parseKitchenCatalogRows(rows);
}

function sanitizeSheetName(value) {
  const sanitized = String(value || "catalog")
    .replace(/[\\/*?:[\]]/g, "-")
    .trim();

  return (sanitized || "catalog").slice(0, 31);
}

export function parseKitchenCatalogSheet(fileData, filename = "") {
  const lowerFilename = String(filename || "").toLowerCase();

  if (typeof fileData === "string") {
    return parseKitchenCatalogCsv(fileData);
  }

  const bytes =
    fileData instanceof Uint8Array
      ? fileData
      : fileData instanceof ArrayBuffer
        ? new Uint8Array(fileData)
        : new Uint8Array(fileData || []);

  if (!bytes.length) {
    throw new Error("The file is empty.");
  }

  if (lowerFilename.endsWith(".csv")) {
    return parseKitchenCatalogCsv(new TextDecoder("utf-8").decode(bytes));
  }

  return parseKitchenCatalogWorkbook(bytes);
}
