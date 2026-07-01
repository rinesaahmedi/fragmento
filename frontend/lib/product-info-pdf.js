export function normalizeExtractedProductText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractProductInfoPdfText(buffer) {
  const { PDFParse } = await Function("specifier", "return import(specifier)")("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeExtractedProductText(result.text);
  } finally {
    await parser.destroy();
  }
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  if (Array.isArray(payload?.output)) {
    return payload.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .map((content) => content?.text || "")
      .join("")
      .trim();
  }

  return "";
}

function normalizeStringList(value, maxItems = 20) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanAiFactLine(value) {
  const line = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[-•]\s*/, "")
    .trim();
  if (!line || !line.includes(":")) return "";

  const [label, ...valueParts] = line.split(":");
  const cleanLabel = label.trim();
  const cleanValue = valueParts.join(":").trim();
  if (!cleanLabel || !cleanValue) return "";

  const compactValue = cleanValue.replace(/\s+/g, "");
  if (/^[•.\-/]+$/.test(compactValue)) return "";
  if (/^[•.\-/]+(?:\/[•.\-/]+)+$/.test(compactValue)) return "";
  if (/nicht angegeben|not specified|n\/a|unbekannt/i.test(cleanValue)) return "";

  return `${cleanLabel}: ${cleanValue.replace(/•/g, "ja")}`;
}

function cleanAiExtractedText(value) {
  return normalizeExtractedProductText(value)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .filter((line) => {
      const compactLine = line.trim().replace(/\s+/g, "");
      return !/^[•.\-/]+$/.test(compactLine) && !/^[•.\-/]+(?:\/[•.\-/]+)+$/.test(compactLine);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAiFactList(value, fallbackFacts) {
  const cleanedFacts = (Array.isArray(value) ? value : [])
    .map(cleanAiFactLine)
    .filter(Boolean);

  return cleanedFacts.length
    ? dedupeFacts(cleanedFacts).slice(0, 14)
    : normalizeStringList(fallbackFacts, 14);
}

function normalizeAiDraft(value, fallbackDraft) {
  return {
    summary: String(value?.summary || fallbackDraft.summary || "").trim(),
    keyFacts: normalizeAiFactList(value?.keyFacts, fallbackDraft.keyFacts),
    extractedText: cleanAiExtractedText(value?.extractedText || fallbackDraft.extractedText || ""),
    technicalData: value?.technicalData && typeof value.technicalData === "object" ? value.technicalData : {},
  };
}

export async function buildAiEnhancedProductInfoDraft({ text, fileName = "", fallbackDraft }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ...fallbackDraft,
      aiEnhanced: false,
      aiEnhancementStatus: "missing_api_key",
    };
  }

  const model = process.env.OPENAI_PRODUCT_INFO_EXTRACT_MODEL
    || process.env.OPENAI_PRODUCT_INFO_MODEL
    || "gpt-5.4-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const sourceText = normalizeExtractedProductText(text).slice(0, 60000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: [
          "You convert raw German product PDF text into admin-reviewed product assistant data.",
          "Use only facts explicitly present in the source text. Do not guess missing values.",
          "Repair table-like label/value pairs when the PDF extraction split labels and values across lines.",
          "Prefer concise German product labels. Keep units exactly as documented.",
          "The chatbot data must be useful for customer questions about dimensions, energy, noise, installation, functions, capacity, connections, EAN, and accessories.",
          "Key facts must be customer-relevant, not an exhaustive technical table. Return 8 to 14 key facts.",
          "Never include empty values, dash-only values, bullet-only values, or marker values such as '• / • / •'. Convert a single documented bullet marker to 'ja' only when the label is clearly meaningful.",
          "Do not include internal table rows that are not helpful to a customer, such as display dashes, sensor dashes, empty optional accessories, or repeated legal/footer text.",
          "For extractedText, create clean short sections with relevant facts only. Remove page markers, legal footers, TCPDF text, and raw table marker noise.",
          "Return clean JSON only through the provided schema.",
        ].join("\n"),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `PDF filename: ${fileName || "product-info.pdf"}`,
                  "",
                  "Raw extracted PDF text:",
                  sourceText,
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "product_info_pdf_cleanup",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: {
                  type: "string",
                  description: "One or two concise German sentences naming the product and the most important documented facts.",
                },
                keyFacts: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 6,
                  maxItems: 14,
                  description: "Important facts as Label: value lines. Include only facts present in the PDF.",
                },
                extractedText: {
                  type: "string",
                  description: "Cleaned product text for chatbot fallback. Preserve relevant facts; remove page markers, legal footers, and broken table noise.",
                },
                technicalData: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    productName: { type: "string" },
                    category: { type: "string" },
                    model: { type: "string" },
                    ean: { type: "string" },
                    energyClass: { type: "string" },
                    energyConsumption: { type: "string" },
                    noise: { type: "string" },
                    dimensions: { type: "string" },
                    installationDimensions: { type: "string" },
                    capacity: { type: "string" },
                    voltage: { type: "string" },
                    connectionValue: { type: "string" },
                    programsOrFunctions: { type: "string" },
                    accessories: { type: "string" },
                  },
                  required: [
                    "productName",
                    "category",
                    "model",
                    "ean",
                    "energyClass",
                    "energyConsumption",
                    "noise",
                    "dimensions",
                    "installationDimensions",
                    "capacity",
                    "voltage",
                    "connectionValue",
                    "programsOrFunctions",
                    "accessories",
                  ],
                },
              },
              required: ["summary", "keyFacts", "extractedText", "technicalData"],
            },
          },
        },
        max_output_tokens: 2200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("OpenAI product info PDF cleanup failed:", response.status, errorText);
      return {
        ...fallbackDraft,
        aiEnhanced: false,
        aiEnhancementStatus: "openai_error",
      };
    }

    const payload = await response.json();
    const textOutput = extractResponseText(payload);
    const parsed = JSON.parse(textOutput);
    return {
      ...normalizeAiDraft(parsed, fallbackDraft),
      aiEnhanced: true,
      aiEnhancementStatus: "ok",
    };
  } catch (error) {
    console.error("OpenAI product info PDF cleanup failed:", error);
    return {
      ...fallbackDraft,
      aiEnhanced: false,
      aiEnhancementStatus: error?.name === "AbortError" ? "timeout" : "failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[-•]\s*/, "")
    .replace(/\s+([:;,.])/g, "$1")
    .trim();
}

function dedupeFacts(facts) {
  const seen = new Set();

  return facts.filter((fact) => {
    const key = fact.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstMatchingLine(lines, pattern) {
  return lines.find((line) => pattern.test(line)) || "";
}

function asFact(label, value) {
  const normalizedValue = normalizeLine(value).replace(/^[.:;-]\s*/, "");
  if (!normalizedValue) return "";
  return `${label}: ${normalizedValue}`;
}

export function buildProductInfoDraft({ text, fileName = "" }) {
  const normalizedText = normalizeExtractedProductText(text);
  const lines = normalizedText
    .split("\n")
    .map(normalizeLine)
    .filter((line) => line && !/^-- \d+ of \d+ --$/i.test(line));

  const facts = [];
  const productNameLine = firstMatchingLine(lines, /^(produktname|product name)\s*:/i);
  const modelLine = firstMatchingLine(lines, /^(modell|model|modell \/ art\.-nr\.|art\.-nr\.)\b/i);
  const energyLine = firstMatchingLine(lines, /(energieeffizienzklasse|energy efficiency class|energieklasse)\b/i);
  const noiseLine = firstMatchingLine(lines, /(ger[aä]usch|schall|noise|dB(?:\s*\(|\b))/i);
  const widthLine = firstMatchingLine(lines, /\bbreite\b|\bwidth\b/i);
  const annualEnergyLine = firstMatchingLine(lines, /(jahresverbrauch|energieverbrauch.*(?:100|jahr|cycle|zyklus|kwh))/i);
  const waterLine = firstMatchingLine(lines, /(wasserverbrauch|water consumption)/i);
  const capacityLine = firstMatchingLine(lines, /(nutzinhalt|volumen|fassungsverm[oö]gen|ma[ßs]gedecke|capacity)/i);
  const dimensionLine = firstMatchingLine(lines, /(ger[aä]tema[ßs]e|einbauma[ßs]e|nischenma[ßs]e|appliance dimensions|installation dimensions|h x b x t|b x t)/i);
  const programLine = firstMatchingLine(lines, /(programme|funktionen|kochzonen|programs|functions|cooking zones)/i);
  const airflowLine = firstMatchingLine(lines, /(luftleistung|air flow|m3\/h|m³\/h)/i);
  const operatingModeLine = firstMatchingLine(lines, /(betriebsart|abluft|umluft|operating mode)/i);

  if (productNameLine) facts.push(productNameLine);
  if (modelLine) facts.push(/^modell|^model/i.test(modelLine) ? modelLine : asFact("Modell", modelLine));
  if (energyLine) facts.push(/:/.test(energyLine) ? energyLine : asFact("Energieklasse", energyLine));
  if (noiseLine) facts.push(/:/.test(noiseLine) ? noiseLine : asFact("Geräusch", noiseLine));
  if (widthLine) facts.push(/:/.test(widthLine) ? widthLine : asFact("Breite", widthLine));
  if (annualEnergyLine && annualEnergyLine !== energyLine) facts.push(/:/.test(annualEnergyLine) ? annualEnergyLine : asFact("Energieverbrauch", annualEnergyLine));
  if (waterLine) facts.push(/:/.test(waterLine) ? waterLine : asFact("Wasserverbrauch", waterLine));
  if (capacityLine) facts.push(/:/.test(capacityLine) ? capacityLine : asFact("Kapazitaet", capacityLine));
  if (dimensionLine) facts.push(/:/.test(dimensionLine) ? dimensionLine : asFact("Masse", dimensionLine));
  if (programLine) facts.push(/:/.test(programLine) ? programLine : asFact("Programme/Funktionen", programLine));
  if (airflowLine) facts.push(/:/.test(airflowLine) ? airflowLine : asFact("Luftleistung", airflowLine));
  if (operatingModeLine) facts.push(/:/.test(operatingModeLine) ? operatingModeLine : asFact("Betriebsart", operatingModeLine));

  const cleanFileName = String(fileName || "")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  const title = productNameLine.replace(/^(produktname|product name)\s*:\s*/i, "") || cleanFileName;
  const summaryPieces = [title, energyLine, noiseLine, widthLine]
    .map((line) => line.replace(/^(produktname|product name)\s*:\s*/i, ""))
    .filter(Boolean)
    .slice(0, 4);
  const summary = summaryPieces.length
    ? `${summaryPieces.join(". ").replace(/\.+/g, ".")}.`
    : lines.slice(0, 3).join(" ").slice(0, 260).trim();

  return {
    summary,
    keyFacts: dedupeFacts(facts).slice(0, 16),
    extractedText: normalizedText,
  };
}
