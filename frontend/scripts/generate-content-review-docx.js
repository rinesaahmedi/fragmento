const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "Fragmento-content-review-en-de.docx");
const fallbackOutputPath = path.join(root, "Fragmento-content-review-used-en-de.docx");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function flattenStrings(value, prefix = "") {
  const rows = [];

  if (typeof value === "string") {
    rows.push([prefix, value]);
    return rows;
  }

  if (Array.isArray(value)) {
    const scalarValues = value.filter((item) => typeof item === "string");
    if (scalarValues.length === value.length && value.length > 0) {
      rows.push([prefix, scalarValues.join(", ")]);
      return rows;
    }

    value.forEach((item, index) => {
      rows.push(...flattenStrings(item, `${prefix}[${index}]`));
    });
    return rows;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => {
      rows.push(...flattenStrings(child, prefix ? `${prefix}.${key}` : key));
    });
  }

  return rows;
}

function pairLocaleRows(label, enData, deData) {
  const enRows = new Map(flattenStrings(enData));
  const deRows = new Map(flattenStrings(deData));
  const keys = [...new Set([...enRows.keys(), ...deRows.keys()])].sort();

  return keys.map((key) => ({
    source: label,
    key,
    en: enRows.get(key) || "",
    de: deRows.get(key) || "",
  }));
}

function getSourceText() {
  const folders = ["app", "components", "lib"];
  const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
  const chunks = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (extensions.has(path.extname(entry.name))) {
        chunks.push(fs.readFileSync(fullPath, "utf8"));
      }
    }
  }

  folders.forEach((folder) => walk(path.join(root, folder)));
  return chunks.join("\n");
}

function isLocaleKeyUsed(key, sourceText) {
  if (sourceText.includes(key)) {
    return true;
  }

  const parts = key.split(".");
  for (let index = parts.length - 1; index > 0; index--) {
    const prefix = parts.slice(0, index).join(".");
    if (sourceText.includes(`${prefix}.`)) {
      return true;
    }
  }

  return false;
}

function pairUsedLocaleRows(label, enData, deData, sourceText) {
  return pairLocaleRows(label, enData, deData).filter((row) => isLocaleKeyUsed(row.key, sourceText));
}

function extractServiceClaimCopy() {
  const source = fs.readFileSync(path.join(root, "components/service-claim-flow.js"), "utf8");
  const match = source.match(/const COPY = (\{[\s\S]*?\n\});\n\nconst INITIAL_FORM/);
  if (!match) {
    return null;
  }

  return vm.runInNewContext(`(${match[1]})`);
}

function getUsedServiceClaimKeys(sourceText) {
  const keys = new Set();
  const regex = /\bt\(\s*["']([^"']+)["']\s*\)/g;
  let match;

  while ((match = regex.exec(sourceText))) {
    keys.add(match[1]);
  }

  const altKeyRegex = /altKey:\s*["']([^"']+)["']/g;
  while ((match = altKeyRegex.exec(sourceText))) {
    keys.add(match[1]);
  }

  return keys;
}

function pairServiceClaimCopyRows(sourceText) {
  const copy = extractServiceClaimCopy();
  if (!copy) {
    return [];
  }

  const usedKeys = getUsedServiceClaimKeys(sourceText);
  const enRows = new Map(flattenStrings(copy.en || {}));
  const deRows = new Map(flattenStrings(copy.de || {}));
  const keys = [...new Set([...enRows.keys(), ...deRows.keys()])]
    .filter((key) => usedKeys.has(key))
    .sort();

  return keys.map((key) => ({
    source: "Service claim page copy",
    key,
    en: enRows.get(key) || "",
    de: deRows.get(key) || "",
  }));
}

function pairServiceGuideRows(data) {
  const guideRows = data.guides || [];
  const grouped = new Map();

  for (const guide of guideRows) {
    const groupKey = [guide.brand, guide.appliance_type, guide.error_code || "no-code", guide.issue_key].join(" / ");
    const language = guide.language;
    if (!grouped.has(groupKey)) grouped.set(groupKey, {});
    grouped.get(groupKey)[language] = guide;
  }

  const fields = [
    "title",
    "description",
    "troubleshooting_steps",
    "claim_guidance",
    "optional_form_description",
    "keywords",
  ];

  const rows = [];
  for (const [groupKey, languages] of grouped.entries()) {
    for (const field of fields) {
      const enValue = languages.en ? flattenStrings(languages.en[field] || "", field)[0]?.[1] || "" : "";
      const deValue = languages.de ? flattenStrings(languages.de[field] || "", field)[0]?.[1] || "" : "";
      rows.push({
        source: "Service claim troubleshooting",
        key: `${groupKey} / ${field}`,
        en: enValue,
        de: deValue,
      });
    }
  }

  return rows;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text, style = "") {
  const safe = escapeXml(text).replace(/\r?\n/g, "<w:br/>");
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
}

function tableCell(text, bold = false) {
  const boldXml = bold ? "<w:rPr><w:b/></w:rPr>" : "";
  const safe = escapeXml(text).replace(/\r?\n/g, "<w:br/>");
  return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r>${boldXml}<w:t xml:space="preserve">${safe}</w:t></w:r></w:p></w:tc>`;
}

function table(rows) {
  const header = `<w:tr>${["Source", "Key", "English", "German"].map((cell) => tableCell(cell, true)).join("")}</w:tr>`;
  const body = rows
    .map((row) => `<w:tr>${[row.source, row.key, row.en, row.de].map((cell) => tableCell(cell)).join("")}</w:tr>`)
    .join("");

  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>${header}${body}</w:tbl>`;
}

function documentXml(rows) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraph("Fragmento English/German Content Review", "Title")}
    ${paragraph(`Generated from frontend locale and service-claim content files. Total review rows: ${rows.length}.`)}
    ${table(rows)}
    <w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;
}

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function writeUInt32LE(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function writeUInt16LE(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      writeUInt32LE(0x04034b50),
      writeUInt16LE(20),
      writeUInt16LE(0x0800),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(checksum),
      writeUInt32LE(data.length),
      writeUInt32LE(data.length),
      writeUInt16LE(name.length),
      writeUInt16LE(0),
      name,
    ]);

    localParts.push(localHeader, data);

    centralParts.push(Buffer.concat([
      writeUInt32LE(0x02014b50),
      writeUInt16LE(20),
      writeUInt16LE(20),
      writeUInt16LE(0x0800),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(checksum),
      writeUInt32LE(data.length),
      writeUInt32LE(data.length),
      writeUInt16LE(name.length),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt32LE(0),
      writeUInt32LE(offset),
      name,
    ]));

    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32LE(0x06054b50),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(files.length),
    writeUInt16LE(files.length),
    writeUInt32LE(centralDirectory.length),
    writeUInt32LE(offset),
    writeUInt16LE(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const sourceText = getSourceText();
const publicRows = pairUsedLocaleRows("Public site locale", readJson("locales/public.en.json"), readJson("locales/public.de.json"), sourceText);
const adminRows = pairUsedLocaleRows("Admin locale", readJson("locales/admin.en.json"), readJson("locales/admin.de.json"), sourceText);
const serviceClaimCopyRows = pairServiceClaimCopyRows(sourceText);
const serviceRows = pairServiceGuideRows(readJson("lib/service-claim-troubleshooting-data.json"));
const rows = [...publicRows, ...adminRows, ...serviceClaimCopyRows, ...serviceRows];

const files = [
  {
    name: "[Content_Types].xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
  },
  {
    name: "_rels/.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  },
  {
    name: "word/_rels/document.xml.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  },
  { name: "word/document.xml", content: documentXml(rows) },
  { name: "word/styles.xml", content: stylesXml() },
];

const docxBuffer = createZip(files);
let writtenPath = outputPath;
try {
  fs.writeFileSync(outputPath, docxBuffer);
} catch (error) {
  if (error.code !== "EBUSY") {
    throw error;
  }
  writtenPath = fallbackOutputPath;
  fs.writeFileSync(fallbackOutputPath, docxBuffer);
}

console.log(`Created ${writtenPath}`);
console.log(`Rows: ${rows.length}`);
