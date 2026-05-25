const fs = require("fs/promises");
const path = require("path");
const { PrismaClient, ItemType } = require("@prisma/client");

const prisma = new PrismaClient();

const OUTPUT_PATH = path.resolve(__dirname, "product-info-cleanup-proposals.json");

const FACT_CHECKS = [
  {
    key: "energyClass",
    label: "energy class",
    patterns: [/energy\s*(efficiency\s*)?class/i, /energie(?:effizienz)?klasse/i],
  },
  {
    key: "noise",
    label: "noise / dB",
    patterns: [/noise/i, /\bdB(?:\(A\))?/i, /ger[aä]usch/i, /geraeusch/i, /schall/i],
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
    relevantPatterns: [/dish/i, /sp[üu]l/i, /spuel/i, /wash/i, /wasch/i],
    patterns: [/water\s*consumption/i, /wasserverbrauch/i, /\bl\/(?:zyklus|cycle)\b/i],
  },
  {
    key: "capacity",
    label: "capacity / volume",
    relevantPatterns: [/dish/i, /sp[üu]l/i, /spuel/i, /wash/i, /wasch/i, /fridge/i, /refrigerator/i, /\bref-/i, /k[üu]hl/i, /kuehl/i, /oven/i, /backofen/i],
    patterns: [/capacity/i, /volume/i, /fassungsverm[oö]gen/i, /nutzinhalt/i, /volumen/i, /ma[ßs]gedecke/i, /\b\d+\s*l\b/i, /\b\d+\s*kg\b/i],
  },
  {
    key: "programsFunctions",
    label: "programs / functions",
    relevantPatterns: [/dish/i, /sp[üu]l/i, /spuel/i, /wash/i, /wasch/i, /oven/i, /backofen/i],
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

function replaceAndCount(text, pattern, replacement) {
  let count = 0;
  const nextText = String(text || "").replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  return { text: nextText, count };
}

function normalizeGermanText(value) {
  let text = String(value || "");
  let changes = 0;

  const replacements = [
    [/\bNischenmasse\b/g, "Nischenmaße"],
    [/\bnischenmasse\b/g, "nischenmaße"],
    [/\bGeraetemasse\b/g, "Gerätemaße"],
    [/\bGeraetemaße\b/g, "Gerätemaße"],
    [/\bgeraetemasse\b/g, "gerätemaße"],
    [/\bgeraetemaße\b/g, "gerätemaße"],
    [/\bEinbaumasse\b/g, "Einbaumaße"],
    [/\beinbaumasse\b/g, "einbaumaße"],
    [/\bAusschnittmasse\b/g, "Ausschnittmaße"],
    [/\bausschnittmasse\b/g, "ausschnittmaße"],
    [/\bGeraeusch\b/g, "Geräusch"],
    [/\bgeraeusch\b/g, "geräusch"],
    [/\bHoehe\b/g, "Höhe"],
    [/\bhoehe\b/g, "höhe"],
    [/\bKuehl/g, "Kühl"],
    [/\bkuehl/g, "kühl"],
    [/\bGeraet/g, "Gerät"],
    [/\bgeraet/g, "gerät"],
    [/\bFuer\b/g, "Für"],
    [/\bfuer\b/g, "für"],
    [/\bKueche\b/g, "Küche"],
    [/\bkueche\b/g, "küche"],
  ];

  for (const [pattern, replacement] of replacements) {
    const result = replaceAndCount(text, pattern, replacement);
    text = result.text;
    changes += result.count;
  }

  let contextualMasseChanges = 0;
  text = text.replace(/\bMasse\b/g, (match, offset, fullText) => {
    const lineStart = fullText.lastIndexOf("\n", offset) + 1;
    const lineEndIndex = fullText.indexOf("\n", offset);
    const lineEnd = lineEndIndex === -1 ? fullText.length : lineEndIndex;
    const line = fullText.slice(lineStart, lineEnd);
    const dimensionContext = /\b(\d{2,4}\s*x\s*\d{2,4}|dimension|abmess|einbau|ausschnitt|nische|gerät|geraet|maße)\b/i.test(line);
    if (!dimensionContext) return match;
    contextualMasseChanges += 1;
    return "Maße";
  });
  changes += contextualMasseChanges;

  return { text, changes };
}

function lineLooksLikeInstallationNote(line) {
  return /(anschluss|stromanschluss|wasseranschluss|nischenma[ßs]|nischenmass|bestellung|pr[üu]fen|pruefen|beachten|installation)/i.test(line);
}

function formatKeyFactLine(line) {
  if (line.includes(":")) return { line, changed: false, reason: "" };

  const prefix = lineLooksLikeInstallationNote(line) ? "Installationshinweis" : "Hinweis";
  return {
    line: `${prefix}: ${line}`,
    changed: true,
    reason: `Added ${prefix}: prefix to a key fact line without Label: Value format.`,
  };
}

function buildFieldProposal({ field, beforeText, afterText, reason, germanNormalizationChanges = 0, keyFactsFormatChanges = 0 }) {
  if (beforeText === afterText) return null;

  return {
    field,
    beforeText,
    afterText,
    reason,
    germanNormalizationChanges,
    keyFactsFormatChanges,
  };
}

function proposeSummaryCleanup(item) {
  const beforeText = String(item.productInfoSummary || "");
  const normalized = normalizeGermanText(beforeText);

  return buildFieldProposal({
    field: "productInfoSummary",
    beforeText,
    afterText: normalized.text,
    reason: "Normalize fallback German spellings in summary text.",
    germanNormalizationChanges: normalized.changes,
  });
}

function proposeExtractedTextCleanup(item) {
  const beforeText = String(item.productInfoExtractedText || "");
  const normalized = normalizeGermanText(beforeText);

  return buildFieldProposal({
    field: "productInfoExtractedText",
    beforeText,
    afterText: normalized.text,
    reason: "Normalize fallback German spellings in extracted product text.",
    germanNormalizationChanges: normalized.changes,
  });
}

function proposeKeyFactsCleanup(item) {
  const beforeLines = normalizeKeyFacts(item.productInfoKeyFacts);
  const afterLines = [];
  let germanNormalizationChanges = 0;
  let keyFactsFormatChanges = 0;
  const reasons = new Set();

  for (const beforeLine of beforeLines) {
    const normalized = normalizeGermanText(beforeLine);
    germanNormalizationChanges += normalized.changes;
    if (normalized.changes) {
      reasons.add("Normalize fallback German spellings in key facts.");
    }

    const formatted = formatKeyFactLine(normalized.text);
    if (formatted.changed) {
      keyFactsFormatChanges += 1;
      reasons.add(formatted.reason);
    }
    afterLines.push(formatted.line);
  }

  return buildFieldProposal({
    field: "productInfoKeyFacts",
    beforeText: beforeLines.join("\n"),
    afterText: afterLines.join("\n"),
    reason: Array.from(reasons).join(" "),
    germanNormalizationChanges,
    keyFactsFormatChanges,
  });
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function isApplianceLike(item) {
  if (item.itemType === ItemType.SERVICE) return false;

  const haystack = `${item.code} ${item.name} ${item.componentKey || ""} ${item.iconKey || ""}`.toLowerCase();
  return [
    "dish", "spül", "spuel", "washer", "washing", "wasch", "wm-", "fridge", "refrigerator", "ref-", "kühl", "kuehl",
    "hood", "extractor", "haube", "oven", "backofen", "hob", "kochfeld",
  ].some((token) => haystack.includes(token));
}

function itemContextText(item) {
  return [
    item.code,
    item.name,
    item.componentKey,
    item.iconKey,
    item.productInfoSummary,
    normalizeKeyFacts(item.productInfoKeyFacts).join("\n"),
    item.productInfoExtractedText,
  ].filter(Boolean).join("\n");
}

function buildReviewNote(item, missingFact) {
  const itemText = itemContextText(item);
  const itemLabel = `${item.code} ${item.name}`;

  if (missingFact.key === "noise" && /oven|backofen|hob|kochfeld/i.test(itemLabel)) {
    return {
      key: missingFact.key,
      label: missingFact.label,
      note: "Likely okay: Oven/hob has no noise value; do not add unless documented.",
      severity: "likelyOkay",
    };
  }

  if (
    missingFact.key === "installationDimensions" &&
    /fridge|refrigerator|k[üu]hl|kuehl|\bref-/i.test(itemLabel) &&
    /freestanding|free-standing|freistehend/i.test(itemText)
  ) {
    return {
      key: missingFact.key,
      label: missingFact.label,
      note: "Likely okay: Refrigerator appears to be freestanding, so installation/niche dimensions may not be required. Do not add unless documented.",
      severity: "likelyOkay",
    };
  }

  if (missingFact.key === "programsFunctions" && /wash|washer|wasch|wm-/i.test(itemLabel)) {
    return {
      key: missingFact.key,
      label: missingFact.label,
      note: "Review needed: Washing machine may be missing programs/functions if documented in PDF.",
      severity: "reviewNeeded",
    };
  }

  return {
    key: missingFact.key,
    label: missingFact.label,
    note: `Review needed: ${missingFact.label} may be missing if documented in PDF.`,
    severity: "reviewNeeded",
  };
}

function auditMissingRelevantFacts(item) {
  if (!isApplianceLike(item)) return [];

  const itemText = `${item.code} ${item.name} ${item.componentKey || ""} ${item.iconKey || ""}`;
  const keyFactLines = normalizeKeyFacts(item.productInfoKeyFacts);
  const combinedText = [
    item.productInfoSummary,
    keyFactLines.join("\n"),
    item.productInfoExtractedText,
  ].filter(Boolean).join("\n");

  return FACT_CHECKS
    .filter((check) => !check.relevantPatterns || containsAny(itemText, check.relevantPatterns))
    .filter((check) => !containsAny(combinedText, check.patterns))
    .map((check) => buildReviewNote(item, check));
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

function proposeItemCleanup(item) {
  const proposals = [
    proposeSummaryCleanup(item),
    proposeKeyFactsCleanup(item),
    proposeExtractedTextCleanup(item),
  ].filter(Boolean);
  const reviewNotes = auditMissingRelevantFacts(item);
  const reviewNeeded = reviewNotes.filter((note) => note.severity === "reviewNeeded");
  const likelyOkay = reviewNotes.filter((note) => note.severity === "likelyOkay");

  return {
    id: item.id,
    kitchenSlug: item.kitchen?.slug || "",
    kitchenName: item.kitchen?.name || "",
    code: item.code,
    name: item.name,
    proposals,
    reviewNeeded,
    likelyOkay,
  };
}

function summarize(items) {
  const itemReports = items.filter((item) => item.proposals.length || item.reviewNeeded.length || item.likelyOkay.length);
  const allProposals = itemReports.flatMap((item) => item.proposals);
  const allReviewNeeded = itemReports.flatMap((item) => item.reviewNeeded);
  const allLikelyOkay = itemReports.flatMap((item) => item.likelyOkay);

  return {
    itemsScanned: items.length,
    itemsWithProposals: itemReports.filter((item) => item.proposals.length).length,
    fieldProposals: allProposals.length,
    germanNormalizationChanges: allProposals.reduce((sum, proposal) => sum + proposal.germanNormalizationChanges, 0),
    keyFactsFormatProposals: allProposals.reduce((sum, proposal) => sum + proposal.keyFactsFormatChanges, 0),
    reviewNeededCount: allReviewNeeded.length,
    likelyOkayCount: allLikelyOkay.length,
  };
}

function printSummary(report) {
  console.log("Product Information Cleanup Proposals");
  console.log("=====================================");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Items scanned: ${report.summary.itemsScanned}`);
  console.log(`Items with proposals: ${report.summary.itemsWithProposals}`);
  console.log(`Proposed German normalization changes: ${report.summary.germanNormalizationChanges}`);
  console.log(`Key Facts format proposals: ${report.summary.keyFactsFormatProposals}`);
  console.log(`Review needed: ${report.summary.reviewNeededCount}`);
  console.log(`Likely okay: ${report.summary.likelyOkayCount}`);

  for (const item of report.proposals) {
    console.log(`\n${item.code} — ${item.name}`);
    console.log(`  Field proposals: ${item.proposals.length}`);
    item.proposals.forEach((proposal) => {
      console.log(`    - ${proposal.field}: ${proposal.reason}`);
    });
    if (item.reviewNeeded.length) {
      console.log("  Review needed:");
      item.reviewNeeded.forEach((reviewNote) => console.log(`    - ${reviewNote.note}`));
    }
    if (item.likelyOkay.length) {
      console.log("  Likely okay:");
      item.likelyOkay.forEach((reviewNote) => console.log(`    - ${reviewNote.note}`));
    }
  }
}

async function main() {
  const items = await loadItems();
  const proposedItems = items.map(proposeItemCleanup);
  const proposals = proposedItems.filter((item) => item.proposals.length || item.reviewNeeded.length || item.likelyOkay.length);
  const report = {
    generatedAt: new Date().toISOString(),
    mutation: false,
    summary: summarize(proposedItems),
    proposals,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printSummary(report);
  console.log(`\nJSON proposals written to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main()
  .catch((error) => {
    console.error("Product information cleanup proposal failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
