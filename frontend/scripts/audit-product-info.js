const fs = require("fs/promises");
const path = require("path");
const { PrismaClient, ItemType } = require("@prisma/client");

const prisma = new PrismaClient();

const REPORT_PATH = path.resolve(__dirname, "product-info-audit-report.json");
const LONG_FACT_LINE_THRESHOLD = 180;

const NORMALIZATION_WARNINGS = [
  { pattern: /\bGeraeusch\b/g, fallback: "Geraeusch", preferred: "Geräusch" },
  { pattern: /\bHoehe\b/g, fallback: "Hoehe", preferred: "Höhe" },
  { pattern: /\bKuehl\w*/g, fallback: "Kuehl", preferred: "Kühl" },
  { pattern: /\bGeraet\w*/g, fallback: "Geraet", preferred: "Gerät" },
  { pattern: /\bMasse\b/g, fallback: "Masse", preferred: "Maße" },
  { pattern: /\bFuer\b/g, fallback: "Fuer", preferred: "Für" },
  { pattern: /\bKueche\b/g, fallback: "Kueche", preferred: "Küche" },
];

const FACT_CHECKS = [
  {
    key: "energyClass",
    label: "energy class",
    patterns: [/energy\s*(efficiency\s*)?class/i, /energie(?:effizienz)?klasse/i],
  },
  {
    key: "noise",
    label: "noise / dB",
    patterns: [/noise/i, /\bdB(?:\(A\))?/i, /ger[aä]usch/i, /schall/i],
  },
  {
    key: "dimensions",
    label: "dimensions",
    patterns: [/dimension/i, /appliance\s*dimensions/i, /ger[aä]te?ma[ßs]e/i, /geraete?masse/i, /\bma[ßs]e\b/i, /\bmasse\b/i, /\b\d{2,4}\s*x\s*\d{2,4}\s*x\s*\d{2,4}\s*mm\b/i],
  },
  {
    key: "installationDimensions",
    label: "installation/niche dimensions",
    patterns: [/installation\s*dimensions/i, /cut-?out\s*dimensions/i, /niche\s*dimensions/i, /einbau(?:ma[ßs]e|masse)?/i, /ausschnitt(?:ma[ßs]e|masse)?/i, /nische/i],
  },
  {
    key: "energyConsumption",
    label: "energy consumption / kWh",
    patterns: [/energy\s*consumption/i, /energieverbrauch/i, /\bkWh\b/i],
  },
  {
    key: "waterConsumption",
    label: "water consumption",
    relevantPatterns: [/dish/i, /sp[üu]l/i, /wash/i, /wasch/i],
    patterns: [/water\s*consumption/i, /wasserverbrauch/i, /\bl\/(?:zyklus|cycle)\b/i],
  },
  {
    key: "capacity",
    label: "capacity / volume",
    relevantPatterns: [/dish/i, /sp[üu]l/i, /wash/i, /wasch/i, /fridge/i, /refrigerator/i, /\bref-/i, /k[üu]hl/i, /oven/i, /backofen/i],
    patterns: [/capacity/i, /volume/i, /fassungsverm[oö]gen/i, /nutzinhalt/i, /volumen/i, /ma[ßs]gedecke/i, /\b\d+\s*l\b/i, /\b\d+\s*kg\b/i],
  },
  {
    key: "programsFunctions",
    label: "programs / functions",
    relevantPatterns: [/dish/i, /sp[üu]l/i, /wash/i, /wasch/i, /oven/i, /backofen/i],
    patterns: [/program/i, /function/i, /programm/i, /funktion/i],
  },
];

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasText(value) {
  return Boolean(compact(value));
}

function normalizeKeyFacts(value) {
  const source = Array.isArray(value) ? value : (value ? [value] : []);

  return source
    .flatMap((entry) => String(entry || "").split(/\r?\n/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getChatbotReadiness(item, keyFactLines) {
  const filledCount = [
    hasText(item.productInfoSummary),
    keyFactLines.length > 0,
    hasText(item.productInfoExtractedText),
  ].filter(Boolean).length;

  if (filledCount === 3) return "Ready";
  if (filledCount > 0) return "Partial";
  return "Missing";
}

function auditKeyFacts(keyFactLines) {
  const linesWithoutColon = keyFactLines.filter((line) => !line.includes(":"));
  const longLines = keyFactLines
    .filter((line) => line.length > LONG_FACT_LINE_THRESHOLD)
    .map((line) => ({ length: line.length, line }));
  const labelCounts = keyFactLines.reduce((acc, line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return acc;
    const label = compact(line.slice(0, colonIndex)).toLowerCase();
    if (!label) return acc;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const duplicateFactLabels = Object.entries(labelCounts)
    .filter(([, count]) => count > 1)
    .map(([label, count]) => ({ label, count }));

  return {
    empty: keyFactLines.length === 0,
    allNonEmptyLinesUseLabelValueFormat: keyFactLines.length > 0 && linesWithoutColon.length === 0,
    linesWithoutColon,
    duplicateFactLabels,
    longLines,
  };
}

function isApplianceLike(item) {
  if (item.itemType === ItemType.SERVICE) return false;

  const haystack = `${item.code} ${item.name} ${item.componentKey || ""} ${item.iconKey || ""}`.toLowerCase();
  return [
    "dish", "spül", "spuel", "washer", "washing", "wasch", "wm-", "fridge", "refrigerator", "ref-", "kühl", "kuehl",
    "hood", "extractor", "haube", "oven", "backofen", "hob", "kochfeld",
  ].some((token) => haystack.includes(token));
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function auditImportantFacts(item, keyFactLines) {
  const itemText = `${item.code} ${item.name} ${item.componentKey || ""} ${item.iconKey || ""}`;
  const combinedText = [
    item.productInfoSummary,
    keyFactLines.join("\n"),
    item.productInfoExtractedText,
  ].filter(Boolean).join("\n");
  const applianceLike = isApplianceLike(item);
  const checks = {};

  for (const check of FACT_CHECKS) {
    const relevant = applianceLike && (!check.relevantPatterns || containsAny(itemText, check.relevantPatterns));
    const present = containsAny(combinedText, check.patterns);
    checks[check.key] = {
      label: check.label,
      relevant,
      present,
    };
  }

  return {
    applianceLike,
    checks,
    missingRelevantFacts: Object.entries(checks)
      .filter(([, value]) => value.relevant && !value.present)
      .map(([key, value]) => ({ key, label: value.label })),
  };
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function auditGermanNormalization(item, keyFactLines) {
  const fields = [
    ["productInfoSummary", item.productInfoSummary || ""],
    ["productInfoKeyFacts", keyFactLines.join("\n")],
    ["productInfoExtractedText", item.productInfoExtractedText || ""],
  ];
  const warnings = [];

  for (const [field, value] of fields) {
    for (const warning of NORMALIZATION_WARNINGS) {
      const count = countMatches(value, warning.pattern);
      if (!count) continue;
      warnings.push({
        field,
        fallback: warning.fallback,
        preferred: warning.preferred,
        count,
      });
    }
  }

  return warnings;
}

function productInfoWhereClause() {
  return {
    isActive: true,
    OR: [
      { productInfoPdfPath: { not: null } },
      { productInfoSummary: { not: null } },
      { productInfoKeyFacts: { not: null } },
      { productInfoExtractedText: { not: null } },
    ],
  };
}

async function loadItems() {
  return prisma.kitchenItem.findMany({
    where: productInfoWhereClause(),
    select: {
      id: true,
      code: true,
      name: true,
      itemType: true,
      componentKey: true,
      iconKey: true,
      productInfoPdfPath: true,
      productInfoSummary: true,
      productInfoKeyFacts: true,
      productInfoExtractedText: true,
      kitchen: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
    orderBy: [{ kitchen: { slug: "asc" } }, { sortOrder: "asc" }, { code: "asc" }],
  });
}

function auditItem(item) {
  const keyFactLines = normalizeKeyFacts(item.productInfoKeyFacts);
  const completeness = {
    hasProductInfoPdfPath: hasText(item.productInfoPdfPath),
    hasProductInfoSummary: hasText(item.productInfoSummary),
    hasProductInfoKeyFacts: keyFactLines.length > 0,
    hasProductInfoExtractedText: hasText(item.productInfoExtractedText),
    chatbotReadiness: getChatbotReadiness(item, keyFactLines),
  };

  return {
    id: item.id,
    kitchenSlug: item.kitchen?.slug || "",
    kitchenName: item.kitchen?.name || "",
    code: item.code,
    name: item.name,
    itemType: item.itemType,
    completeness,
    keyFacts: auditKeyFacts(keyFactLines),
    importantFacts: auditImportantFacts(item, keyFactLines),
    germanNormalizationWarnings: auditGermanNormalization(item, keyFactLines),
  };
}

function summarize(auditedItems) {
  return {
    auditedItems: auditedItems.length,
    readiness: {
      ready: auditedItems.filter((item) => item.completeness.chatbotReadiness === "Ready").length,
      partial: auditedItems.filter((item) => item.completeness.chatbotReadiness === "Partial").length,
      missing: auditedItems.filter((item) => item.completeness.chatbotReadiness === "Missing").length,
    },
    keyFacts: {
      empty: auditedItems.filter((item) => item.keyFacts.empty).length,
      withFormatWarnings: auditedItems.filter((item) => item.keyFacts.linesWithoutColon.length || item.keyFacts.duplicateFactLabels.length || item.keyFacts.longLines.length).length,
    },
    importantFacts: {
      applianceLikeItems: auditedItems.filter((item) => item.importantFacts.applianceLike).length,
      withMissingRelevantFacts: auditedItems.filter((item) => item.importantFacts.missingRelevantFacts.length).length,
    },
    germanNormalization: {
      itemsWithWarnings: auditedItems.filter((item) => item.germanNormalizationWarnings.length).length,
      totalWarnings: auditedItems.reduce((sum, item) => sum + item.germanNormalizationWarnings.reduce((itemSum, warning) => itemSum + warning.count, 0), 0),
    },
  };
}

function printCompleteness(item) {
  console.log(`\n${item.code} — ${item.name}`);
  console.log(`  Kitchen: ${item.kitchenSlug || "-"} | Type: ${item.itemType}`);
  console.log(`  Chatbot readiness: ${item.completeness.chatbotReadiness}`);
  console.log(`  PDF: ${item.completeness.hasProductInfoPdfPath ? "yes" : "no"} | Summary: ${item.completeness.hasProductInfoSummary ? "yes" : "no"} | Key facts: ${item.completeness.hasProductInfoKeyFacts ? "yes" : "no"} | Extracted text: ${item.completeness.hasProductInfoExtractedText ? "yes" : "no"}`);
}

function printKeyFacts(item) {
  const facts = item.keyFacts;
  if (facts.empty) {
    console.log("  Key facts: empty");
    return;
  }

  console.log(`  Key facts: ${facts.allNonEmptyLinesUseLabelValueFormat ? "Label: Value format ok" : "format warnings"}`);
  if (facts.linesWithoutColon.length) {
    console.log("    Lines without colon:");
    facts.linesWithoutColon.forEach((line) => console.log(`      - ${line}`));
  }
  if (facts.duplicateFactLabels.length) {
    console.log("    Duplicate labels:");
    facts.duplicateFactLabels.forEach((entry) => console.log(`      - ${entry.label} (${entry.count}x)`));
  }
  if (facts.longLines.length) {
    console.log(`    Very long lines > ${LONG_FACT_LINE_THRESHOLD} chars:`);
    facts.longLines.forEach((entry) => console.log(`      - ${entry.length} chars: ${entry.line}`));
  }
}

function printImportantFacts(item) {
  if (!item.importantFacts.applianceLike) {
    console.log("  Important appliance facts: not appliance-like");
    return;
  }

  const present = Object.values(item.importantFacts.checks)
    .filter((check) => check.relevant && check.present)
    .map((check) => check.label);
  const missing = item.importantFacts.missingRelevantFacts.map((entry) => entry.label);

  console.log(`  Important appliance facts present: ${present.length ? present.join(", ") : "none detected"}`);
  if (missing.length) {
    console.log(`  Important appliance facts missing: ${missing.join(", ")}`);
  }
}

function printGermanWarnings(item) {
  if (!item.germanNormalizationWarnings.length) return;

  console.log("  German normalization warnings:");
  item.germanNormalizationWarnings.forEach((warning) => {
    console.log(`    - ${warning.field}: ${warning.fallback} -> ${warning.preferred} (${warning.count}x)`);
  });
}

function printReport(report) {
  console.log("Product Information Audit");
  console.log("=========================");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Items audited: ${report.summary.auditedItems}`);
  console.log(`Readiness: ${report.summary.readiness.ready} ready, ${report.summary.readiness.partial} partial, ${report.summary.readiness.missing} missing`);
  console.log(`Key facts: ${report.summary.keyFacts.empty} empty, ${report.summary.keyFacts.withFormatWarnings} with format warnings`);
  console.log(`Appliance facts: ${report.summary.importantFacts.withMissingRelevantFacts} item(s) with missing relevant facts`);
  console.log(`German normalization: ${report.summary.germanNormalization.itemsWithWarnings} item(s), ${report.summary.germanNormalization.totalWarnings} occurrence(s)`);

  report.items.forEach((item) => {
    printCompleteness(item);
    printKeyFacts(item);
    printImportantFacts(item);
    printGermanWarnings(item);
  });
}

async function main() {
  const items = await loadItems();
  const auditedItems = items.map(auditItem);
  const report = {
    generatedAt: new Date().toISOString(),
    reportPath: REPORT_PATH,
    mutation: false,
    summary: summarize(auditedItems),
    items: auditedItems,
  };

  printReport(report);
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nJSON report written to ${path.relative(process.cwd(), REPORT_PATH)}`);
}

main()
  .catch((error) => {
    console.error("Product information audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
