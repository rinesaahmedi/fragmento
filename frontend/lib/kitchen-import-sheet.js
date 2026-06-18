import * as XLSX from "xlsx";

const NR_ALIASES = ["nr", "callout", "callout number", "no", "no.", "#"];
const ARTICLE_ALIASES = [
  ["article1", "article nr 1", "article number 1", "artikel 1"],
  ["article2", "article nr 2", "article number 2", "artikel 2"],
  ["article3", "article nr 3", "article number 3", "artikel 3"],
];
const DIMENSION_ALIASES = ["dimensionet", "dimensions", "dimension", "size"];
const HINGE_ALIASES = ["l/r", "lr", "hinge", "door"];
const PRICE_ALIASES = ["cmimi", "price", "eur", "amount"];
const COMPONENT_KEY_ALIASES = ["componentkey", "component key", "slot", "cabinet slot", "plan slot"];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findColumnIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(alias);
    if (index !== -1) return index;
  }
  return -1;
}

function findArticleColumns(headers) {
  const normalized = headers.map(normalizeHeader);
  const columns = [];
  for (const aliases of ARTICLE_ALIASES) {
    const index = findColumnIndex(normalized, aliases);
    columns.push(index);
  }
  return columns;
}

function requiredCell(value, label, rowNumber) {
  const nextValue = String(value ?? "").trim();
  if (!nextValue) {
    throw new Error(`Row ${rowNumber}: ${label} is required.`);
  }
  return nextValue;
}

function optionalCell(value) {
  const nextValue = String(value ?? "").trim();
  return nextValue || "";
}

function parsePrice(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue || /^default$/i.test(rawValue)) {
    return { price: "", isDefault: true };
  }

  const normalized = rawValue.replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return { price: "", isDefault: true };
  }

  return { price: normalized, isDefault: false };
}

export function parseDimensions(value) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return { widthMm: null, heightMm: null, depthMm: null };
  }

  const triple = rawValue.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
  if (triple) {
    return {
      widthMm: Number.parseInt(triple[1], 10),
      heightMm: Number.parseInt(triple[2], 10),
      depthMm: Number.parseInt(triple[3], 10),
    };
  }

  const pair = rawValue.match(/(\d+)\s*\/\s*(\d+)/);
  if (pair) {
    const widthMm = Number.parseInt(pair[1], 10);
    const second = Number.parseInt(pair[2], 10);
    // Base run cabinets: width/depth with standard 878 mm body height.
    if (second === 600 && widthMm <= 600) {
      return { widthMm, heightMm: 878, depthMm: 600 };
    }
    return { widthMm, heightMm: second, depthMm: null };
  }

  const cm = rawValue.match(/(\d+(?:[.,]\d+)?)\s*cm/i);
  if (cm) {
    const heightCm = Number.parseFloat(cm[1].replace(",", "."));
    const heightMm = Math.round(heightCm * 10);
    return {
      widthMm: heightCm >= 170 ? 710 : null,
      heightMm,
      depthMm: null,
    };
  }

  const mmOnly = rawValue.match(/^(\d+)\s*mm$/i);
  if (mmOnly) {
    const widthMm = Number.parseInt(mmOnly[1], 10);
    return { widthMm, heightMm: 878, depthMm: 600 };
  }

  return { widthMm: null, heightMm: null, depthMm: null };
}

function combineArticles(values) {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join(" + ");
}

function normalizeComponentKey(value, rowNumber) {
  const nextValue = String(value ?? "").trim().toLowerCase();
  if (!nextValue) return "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextValue)) {
    throw new Error(`Row ${rowNumber}: componentKey "${value}" is invalid.`);
  }
  return nextValue;
}

function normalizeSupplierRow(record, rowNumber, partDefaultIndex = null) {
  const nr = requiredCell(record.nr, "NR", rowNumber);
  const articles = combineArticles([record.article1, record.article2, record.article3]);
  const { price } = parsePrice(record.price);
  const isDefault = /^DEFAULT$/i.test(articles.trim());
  const dimensions = parseDimensions(record.dimensions);

  return {
    nr,
    componentKey: normalizeComponentKey(record.componentKey, rowNumber),
    articles,
    articlesUpper: articles.toUpperCase(),
    dimensions: optionalCell(record.dimensions),
    hinge: optionalCell(record.hinge),
    price,
    isDefault,
    partDefaultIndex: isDefault && partDefaultIndex !== null ? partDefaultIndex : undefined,
    rowNumber,
    ...dimensions,
  };
}

function sheetRowsToArrays(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function isSupplierHeaderRow(row) {
  const headers = row.map(normalizeHeader);
  return NR_ALIASES.some((alias) => headers.includes(alias));
}

function findSupplierHeaderRow(rows) {
  return rows.findIndex((row) => isSupplierHeaderRow(row));
}

function buildColumnIndexes(headers) {
  return {
    nrIndex: findColumnIndex(headers, NR_ALIASES),
    dimensionIndex: findColumnIndex(headers, DIMENSION_ALIASES),
    hingeIndex: findColumnIndex(headers, HINGE_ALIASES),
    priceIndex: findColumnIndex(headers, PRICE_ALIASES),
    componentKeyIndex: findColumnIndex(headers, COMPONENT_KEY_ALIASES),
    articleIndexes: findArticleColumns(headers),
  };
}

export function parseSupplierKitchenSheet(binary, filename = "") {
  const workbook = XLSX.read(binary, { type: "array", raw: false });
  const rows = sheetRowsToArrays(workbook);
  const headerIndex = findSupplierHeaderRow(rows);

  if (headerIndex === -1) {
    throw new Error(
      `Could not find an AB supplier sheet with an NR column in ${filename || "the uploaded file"}.`,
    );
  }

  const headers = rows[headerIndex].map(normalizeHeader);
  const {
    nrIndex,
    dimensionIndex,
    hingeIndex,
    priceIndex,
    componentKeyIndex,
    articleIndexes,
  } = buildColumnIndexes(headers);

  const parsedRows = [];
  let defaultCountInPart = 0;
  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const values = rows[rowIndex];
    if (!values.some((value) => String(value || "").trim() !== "")) {
      continue;
    }
    // AB supplier sheets often repeat the header for each kitchen elevation/part.
    if (isSupplierHeaderRow(values)) {
      defaultCountInPart = 0;
      continue;
    }

    const rowNumber = rowIndex + 1;
    const record = {
      nr: values[nrIndex],
      componentKey: componentKeyIndex === -1 ? "" : values[componentKeyIndex],
      article1: articleIndexes[0] === -1 ? "" : values[articleIndexes[0]],
      article2: articleIndexes[1] === -1 ? "" : values[articleIndexes[1]],
      article3: articleIndexes[2] === -1 ? "" : values[articleIndexes[2]],
      dimensions: dimensionIndex === -1 ? "" : values[dimensionIndex],
      hinge: hingeIndex === -1 ? "" : values[hingeIndex],
      price: priceIndex === -1 ? "" : values[priceIndex],
    };
    const isDefaultRow = /^DEFAULT$/i.test(
      combineArticles([record.article1, record.article2, record.article3]).trim(),
    );
    const partDefaultIndex = isDefaultRow ? defaultCountInPart : null;
    if (isDefaultRow) {
      defaultCountInPart += 1;
    }
    parsedRows.push(normalizeSupplierRow(record, rowNumber, partDefaultIndex));
  }

  const hasComponentKeyValues = parsedRows.some((row) => Boolean(row.componentKey));

  return {
    rows: parsedRows,
    hasComponentKeyColumn: componentKeyIndex !== -1 && hasComponentKeyValues,
  };
}
