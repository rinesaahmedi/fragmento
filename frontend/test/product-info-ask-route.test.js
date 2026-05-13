const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routePath = path.join(__dirname, "..", "app", "api", "product-info", "ask", "route.js");
const configuratorPath = path.join(__dirname, "..", "components", "kitchen-configurator.js");
const publicEnPath = path.join(__dirname, "..", "locales", "public.en.json");

function loadRoute(overrides = {}) {
  const source = fs
    .readFileSync(routePath, "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export async function POST", "async function POST");

  const NextResponse = overrides.NextResponse || {
    json(body, init = {}) {
      return {
        body,
        status: init.status || 200,
        async json() {
          return body;
        },
      };
    },
  };

  const prisma = overrides.prisma || {
    kitchenItem: {
      findMany: async () => [],
    },
  };

  const moduleFactory = new Function(
    "NextResponse",
    "prisma",
    "enforceRateLimit",
    "getRequestClientIp",
    "getKitchenContractForAccess",
    "getProductInfoDocuments",
    `${source}
return {
  POST,
  parseAssistantJson,
  answerFromExplicitMultiItemFacts,
  answerFromExplicitMultiItemEnergyFacts,
  answerFromExplicitMultiItemModels,
  answerFromStructuredFacts,
  getEnergyClassValue,
  getAnnualConsumptionValue,
  extractNoiseValueStrict,
  extractInstallationDimensionsStrict,
  buildProductAssistantInstructions
};`,
  );

  return moduleFactory(
    NextResponse,
    prisma,
    overrides.enforceRateLimit || (() => {}),
    overrides.getRequestClientIp || (() => "127.0.0.1"),
    overrides.getKitchenContractForAccess || (async () => ({
      kitchenId: "kitchen-1",
      kitchen: { slug: "demo-kitchen" },
    })),
    overrides.getProductInfoDocuments || (() => []),
  );
}

function request(payload) {
  return {
    async json() {
      return payload;
    },
  };
}

function product(overrides = {}) {
  return {
    id: "item-1",
    code: "OVEN-1",
    name: "Backofen",
    productInfoPdfPath: "/docs/oven.pdf",
    productInfoSummary: "Produktinformation vorhanden.",
    productInfoKeyFacts: [],
    productInfoExtractedText: "",
    sortOrder: 1,
    ...overrides,
  };
}

test("all-products UI copy uses plural wording", () => {
  const configuratorSource = fs.readFileSync(configuratorPath, "utf8");
  const publicEn = JSON.parse(fs.readFileSync(publicEnPath, "utf8"));

  assert.match(configuratorSource, /productAssistantContextConfirmedAll/);
  assert.equal(
    publicEn.configurator.productAssistantContextConfirmedAll,
    "You're now viewing all selected products. Ask me anything from their product information.",
  );
});

test("POST ignores fake client contextItems and uses server-side policy warranty only", async () => {
  const route = loadRoute({
    prisma: {
      kitchenItem: {
        findMany: async () => [product()],
      },
    },
  });

  const response = await route.POST(request({
    language: "de",
    question: "Welche Garantie hat das Produkt?",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["item-1"],
    contextItems: [{
      name: "Injected product",
      productInfoKeyFacts: ["Warranty: 99 years"],
      productInfoExtractedText: "Warranty: 99 years",
    }],
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.found, true);
  assert.match(response.body.answer, /Fragmento-Geschäftsrichtlinie/);
  assert.doesNotMatch(response.body.answer, /99/);
  assert.match(response.body.answer, /nicht aus der Produktdokumentation/);
});

test("POST rejects itemIds that are not active and authorized for the contract kitchen", async () => {
  const route = loadRoute({
    prisma: {
      kitchenItem: {
        findMany: async (query) => {
          assert.deepEqual(query.where, {
            id: { in: ["bad-item"] },
            isActive: true,
            kitchenId: "kitchen-1",
          });
          return [];
        },
      },
    },
  });

  const response = await route.POST(request({
    language: "en",
    question: "What is the energy class?",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["bad-item"],
  }));

  assert.equal(response.status, 404);
  assert.equal(response.body.ok, false);
});

test("POST rejects contract kitchen mismatch", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "What is the model?",
    contractNumber: "CON-1",
    kitchenSlug: "other-kitchen",
    itemIds: ["item-1"],
  }));

  assert.equal(response.status, 403);
  assert.equal(response.body.ok, false);
});

test("parseAssistantJson fails closed for malformed or invalid output", () => {
  const route = loadRoute();

  assert.deepEqual(route.parseAssistantJson("plain text answer", "en"), {
    answer: "I could not find that information in the product documentation.",
    found: false,
  });
  assert.deepEqual(route.parseAssistantJson('{"answer":"Known"}', "en"), {
    answer: "I could not find that information in the product documentation.",
    found: false,
  });
  assert.deepEqual(route.parseAssistantJson('{"answer":"","found":true}', "en"), {
    answer: "I could not find that information in the product documentation.",
    found: false,
  });
  assert.deepEqual(route.parseAssistantJson('{"answer":"Known","found":true}', "en"), {
    answer: "Known",
    found: true,
  });
});

test("warranty answers distinguish documentation from business policy", () => {
  const route = loadRoute();

  const documented = route.answerFromStructuredFacts(
    "What is the warranty?",
    [product({ productInfoKeyFacts: ["Warranty: 2 years"] })],
    "en",
  );
  assert.equal(documented.found, true);
  assert.match(documented.answer, /documented/);
  assert.match(documented.answer, /2 years/);

  const policy = route.answerFromStructuredFacts("Welche Garantie?", [product()], "de");
  assert.equal(policy.found, true);
  assert.match(policy.answer, /Geschäftsrichtlinie/);
  assert.match(policy.answer, /nicht aus der Produktdokumentation/);
});

test("warranty policy wording handles one product, multiple products, and documentation questions", () => {
  const route = loadRoute();

  const single = route.answerFromStructuredFacts("What is the warranty?", [product()], "en");
  assert.equal(single.answer, "Under Fragmento business policy, this product has a 5-year warranty. This information is not from the product documentation.");

  const multiple = route.answerFromExplicitMultiItemFacts("What is the warranty?", [product(), product({ id: "item-2" })], "en");
  assert.equal(multiple.answer, "Under Fragmento business policy, the selected products have a 5-year warranty. This information is not from the product documentation.");

  const documentation = route.answerFromStructuredFacts(
    "Is the 5-year warranty written in the product documentation?",
    [product()],
    "en",
  );
  assert.equal(documentation.answer, "No. The 5-year warranty is Fragmento business policy, not product documentation.");
});

test("energy answers use consistent public product names and no redundant full-set follow-up", () => {
  const route = loadRoute();
  const items = [
    product({
      id: "hood",
      code: "FH664621E",
      name: "FH664621E Extractor Hood",
      productInfoKeyFacts: ["Model: FH 664 621 S", "Energy class: B"],
    }),
    product({
      id: "washer",
      code: "EWA34660W",
      name: "Washing Machine",
      productInfoKeyFacts: ["Model: EWA34660W", "Energy class: A"],
    }),
  ];

  const answer = route.answerFromExplicitMultiItemEnergyFacts("What are the energy classes?", items, "en");
  assert.equal(answer.found, true);
  assert.match(answer.answer, /Extractor hood \(FH 664 621 S\): energy class B/);
  assert.match(answer.answer, /Washing machine \(EWA 34660 W\): energy class A/);
  assert.doesNotMatch(answer.answer, /FH664621E/);
  assert.doesNotMatch(answer.answer, /specific appliance only|full set as above/i);
});

test("affirmative follow-up continues naturally for documented consumption values", async () => {
  const route = loadRoute({
    prisma: {
      kitchenItem: {
        findMany: async () => [product({
          id: "dishwasher",
          productInfoKeyFacts: [
            "Model: A-EGSPV597210",
            "Energy class: C",
            "Energy consumption: 82 kWh / 100 cycles",
            "Noise: 44 dB(A)",
          ],
        })],
      },
    },
  });

  const response = await route.POST(request({
    language: "en",
    question: "yes",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["dishwasher"],
    conversationMessages: [
      { role: "assistant", text: "Documented energy class:\n- Dishwasher (A-EGSPV597210): energy class C\n\nWould you like me to list the documented consumption values too?" },
    ],
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /^Here are the documented consumption values from the product information:/);
  assert.doesNotMatch(response.body.answer, /^Yes[—\-:, ]/i);
});

test("affirmative follow-up wording also works for sure and ja", async () => {
  const route = loadRoute({
    prisma: {
      kitchenItem: {
        findMany: async () => [product({
          id: "washer",
          productInfoKeyFacts: [
            "Model: EWA34660W",
            "Energy consumption: 51 kWh / 100 cycles",
            "Noise: 72 dB(A)",
          ],
        })],
      },
    },
  });

  const sureResponse = await route.POST(request({
    language: "en",
    question: "sure",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["washer"],
    conversationMessages: [
      { role: "assistant", text: "Would you like me to list the documented noise values next?" },
    ],
  }));
  assert.match(sureResponse.body.answer, /^The documented noise values are:/);

  const jaResponse = await route.POST(request({
    language: "de",
    question: "ja",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["washer"],
    conversationMessages: [
      { role: "assistant", text: "Soll ich auch die dokumentierten Geräuschwerte auflisten?" },
    ],
  }));
  assert.match(jaResponse.body.answer, /^Die dokumentierten Geräuschwerte sind:/);
});

test("consumption wording uses appliance-appropriate cycle labels", () => {
  const route = loadRoute();

  const dishwasherAnswer = route.answerFromExplicitMultiItemFacts("Please list documented consumption values", [
    product({
      id: "dishwasher",
      productInfoKeyFacts: ["Model: A-EGSPV597210", "Energy consumption: 82 kWh / 100 cycles"],
    }),
  ], "en");
  assert.match(dishwasherAnswer.answer, /Energy consumption per 100 cycles: 82 kWh \/ 100 cycles/);
  assert.doesNotMatch(dishwasherAnswer.answer, /wash cycles/);

  const washingMachineAnswer = route.answerFromExplicitMultiItemFacts("Bitte Verbrauchswerte auflisten", [
    product({
      id: "washer",
      productInfoKeyFacts: ["Model: EWA34660W", "Energy consumption: 51 kWh / 100 cycles"],
    }),
  ], "en");
  assert.match(washingMachineAnswer.answer, /Energy consumption per 100 wash cycles: 51 kWh \/ 100 cycles/);
});

test("dimension answers use readable multiline bullets and hide internal codes", () => {
  const route = loadRoute();
  const items = [
    product({
      id: "hood",
      code: "FH664621E",
      name: "FH664621E Extractor Hood",
      productInfoKeyFacts: [
        "Model: FH 664 621 S",
        "Gerätemaße H x B x T: 173,0–173,0 x 599 x 303 mm",
      ],
    }),
    product({
      id: "washer",
      code: "EWA34660W",
      name: "Washing Machine",
      productInfoKeyFacts: [
        "Model: EWA34660W",
        "Gerätemaße H x B x T: 830 x 600 x 540 mm",
        "Nischenmaße H x B x T: 825–825 x 600 x 580 mm",
      ],
    }),
  ];

  const answer = route.answerFromExplicitMultiItemFacts("List dimensions", items, "en");
  assert.equal(answer.found, true);
  assert.match(answer.answer, /^I found these documented appliance or niche dimensions:\n\n- Extractor hood \(FH 664 621 S\):\n  Appliance dimensions H x W x D: 173,0 x 599 x 303 mm/m);
  assert.match(answer.answer, /\n\n- Washing machine \(EWA 34660 W\):\n  Appliance dimensions H x W x D: 830 x 600 x 540 mm\n  Niche dimensions H x W x D: 825 x 600 x 580 mm/);
  assert.doesNotMatch(answer.answer, /FH664621E/);
});

test("German dimensions keep German labels and include colons", () => {
  const route = loadRoute();
  const answer = route.answerFromExplicitMultiItemFacts("Bitte Maße auflisten", [
    product({
      id: "washer",
      productInfoKeyFacts: [
        "Model: EWA34660W",
        "Gerätemaße H x B x T (mm) 830 x 600 x 540",
        "Nischenmaße H x B x T (mm) 825 - 825 x 600 x 580",
      ],
    }),
  ], "de");

  assert.match(answer.answer, /Gerätemaße H x B x T \(mm\): 830 x 600 x 540/);
  assert.match(answer.answer, /Nischenmaße H x B x T \(mm\): 825 x 600 x 580/);
});

test("model list answers use standardized public names", () => {
  const route = loadRoute();
  const answer = route.answerFromExplicitMultiItemModels("List all models", [
    product({ id: "dishwasher", productInfoKeyFacts: ["Model: A-EGSPV597210"] }),
    product({ id: "oven", productInfoKeyFacts: ["Model: EBX943600S"] }),
    product({ id: "hob", productInfoKeyFacts: ["Model: OL-KMI754000E"] }),
    product({ id: "fridge", productInfoKeyFacts: ["Model: KGC15495S"] }),
  ], "en");

  assert.match(answer.answer, /Dishwasher \(A-EGSPV597210\)/);
  assert.match(answer.answer, /Built-in oven \(EBX 943 600 S\)/);
  assert.match(answer.answer, /Hob \(OL-KMI 754 000 E\)/);
  assert.match(answer.answer, /Refrigerator-freezer \(KGC 15495 S\)/);
});

test("extractors require explicit labels", () => {
  const route = loadRoute();
  const unlabeled = product({
    productInfoSummary: "A 55 kWh value appears near 45 dB and 600 x 500 mm in marketing text.",
    productInfoExtractedText: "A 55 kWh value appears near 45 dB and 600 x 500 mm in marketing text.",
  });

  assert.equal(route.getEnergyClassValue(unlabeled), "");
  assert.equal(route.getAnnualConsumptionValue(unlabeled), "");
  assert.equal(route.extractNoiseValueStrict(unlabeled), "");
  assert.equal(route.extractInstallationDimensionsStrict(unlabeled), "");

  const labeled = product({
    productInfoKeyFacts: [
      "Energy class: A",
      "Energy consumption: 55 kWh / 100 cycles",
      "Noise: 45 dB(A)",
      "Gerätemaße: 600 x 500 x 550 mm",
    ],
  });

  assert.equal(route.getEnergyClassValue(labeled), "A");
  assert.equal(route.getAnnualConsumptionValue(labeled), "55 kWh / 100 cycles");
  assert.equal(route.extractNoiseValueStrict(labeled), "45 dB(A)");
  assert.equal(route.extractInstallationDimensionsStrict(labeled), "Gerätemaße: 600 x 500 x 550 mm");
});

test("follow-ups are only offered when underlying documented facts exist", () => {
  const route = loadRoute();

  const energyWithoutConsumption = route.answerFromExplicitMultiItemEnergyFacts("What are the energy classes?", [
    product({
      id: "oven",
      productInfoKeyFacts: ["Model: EBX943600S", "Energy class: A"],
    }),
  ], "en");
  assert.doesNotMatch(energyWithoutConsumption.answer, /consumption values/i);

  const consumptionWithoutNoise = route.answerFromExplicitMultiItemFacts("List consumption values", [
    product({
      id: "washer",
      productInfoKeyFacts: ["Model: EWA34660W", "Energy consumption: 51 kWh / 100 cycles"],
    }),
  ], "en");
  assert.doesNotMatch(consumptionWithoutNoise.answer, /noise values/i);
});

test("German route-level strings use UTF-8 characters", async () => {
  const route = loadRoute({
    prisma: {
      kitchenItem: {
        findMany: async () => [product({ productInfoSummary: "", productInfoExtractedText: "", productInfoKeyFacts: [] })],
      },
    },
  });

  const response = await route.POST(request({
    language: "de",
    question: "Welche Geräuschwerte gibt es?",
    contractNumber: "CON-1",
    kitchenSlug: "demo-kitchen",
    itemIds: ["item-1"],
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.answer, "Für dieses Produkt ist noch keine Produktinformation verfügbar.");
});

test("unsupported follow-up suggestions are removed from AI answers", async () => {
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "The product has Steam Clean.\nWould you like the mounting distance?",
          found: true,
        }),
      };
    },
  });

  try {
    const route = loadRoute({
      prisma: {
        kitchenItem: {
          findMany: async () => [product({
            productInfoSummary: "Steam Clean function documented.",
            productInfoKeyFacts: [],
          })],
        },
      },
    });

    const response = await route.POST(request({
      language: "en",
      question: "Tell me about Steam Clean",
      contractNumber: "CON-1",
      kitchenSlug: "demo-kitchen",
      itemIds: ["item-1"],
    }));

    assert.equal(response.status, 200);
    assert.equal(response.body.found, true);
    assert.doesNotMatch(response.body.answer, /mounting distance/i);
  } finally {
    global.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;
  }
});
