const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routePath = path.join(__dirname, "..", "app", "api", "service-claims", "assistant", "route.js");
const troubleshootingDataPath = path.join(__dirname, "..", "lib", "service-claim-troubleshooting-data.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = JSON.parse(fs.readFileSync(troubleshootingDataPath, "utf8"));

const KNOWLEDGE_ENTRIES = SERVICE_CLAIM_TROUBLESHOOTING_DATA.lookupEntries;
const ORIGINAL_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_CLAIM_MODEL = process.env.OPENAI_CLAIM_ASSISTANT_MODEL;
const ORIGINAL_FETCH = global.fetch;

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
    serviceClaimKnowledgeEntry: {
      findMany: async () => KNOWLEDGE_ENTRIES,
    },
  };

  const moduleFactory = new Function(
    "NextResponse",
    "prisma",
    "enforceRateLimit",
    "getRequestClientIp",
    "SERVICE_CLAIM_TROUBLESHOOTING_DATA",
    `${source}
return {
  POST,
  buildAnswer,
  normalizeCode
};`,
  );

  return moduleFactory(
    NextResponse,
    prisma,
    overrides.enforceRateLimit || (() => {}),
    overrides.getRequestClientIp || (() => "127.0.0.1"),
    SERVICE_CLAIM_TROUBLESHOOTING_DATA,
  );
}

function request(payload) {
  return {
    async json() {
      return payload;
    },
  };
}

function dishwasherArea() {
  return [{ code: "DISH-C-600-STD", name: "Dishwasher" }];
}

function emptyClaim() {
  return {
    contractNumber: "",
    problemDescription: "",
    serialNumber: "",
    hasSerialNumberImage: false,
    attachmentCount: 0,
    availabilityDate: "",
    availabilityTime: "",
    hasPhone: false,
    hasEmail: false,
  };
}

function installFetchMock(implementation) {
  global.fetch = implementation;
}

function restoreGlobals() {
  if (ORIGINAL_OPENAI_API_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_API_KEY;
  }

  if (ORIGINAL_CLAIM_MODEL === undefined) {
    delete process.env.OPENAI_CLAIM_ASSISTANT_MODEL;
  } else {
    process.env.OPENAI_CLAIM_ASSISTANT_MODEL = ORIGINAL_CLAIM_MODEL;
  }

  global.fetch = ORIGINAL_FETCH;
}

test.afterEach(() => {
  restoreGlobals();
});

test("normalizes dishwasher error codes", () => {
  const route = loadRoute();
  assert.equal(route.normalizeCode(" e 02 "), "E02");
  assert.equal(route.normalizeCode("e1"), "E1");
  assert.equal(route.normalizeCode("E3"), "E3");
});

test("claim assistant uses OpenAI responses API with gpt-5.1 and no reasoning", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  let capturedRequest = null;
  installFetchMock(async (_url, init) => {
    capturedRequest = JSON.parse(init.body);
    return {
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            answer: "Check that the water tap is fully open, then tell me if the dishwasher still shows E1.",
            showClaimFormHelpAction: true,
            suggestedProblemDescription: null,
          }),
        };
      },
    };
  });

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My architecto dishwasher shows E1.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water tap is fully open/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.equal(response.body.actions[0].id, "claim_form_help");

  assert.equal(capturedRequest.model, "gpt-5.1");
  assert.equal(capturedRequest.reasoning.effort, "none");
  assert.match(capturedRequest.instructions, /Fragmento claim assistant/);

  const promptText = capturedRequest.input[0].content[0].text;
  assert.match(promptText, /"selected_areas"/);
  assert.match(promptText, /"legacy_assistant_draft"/);
  assert.match(promptText, /"database_knowledge_entries"/);
});

test("claim-form help returns suggested problem description without action chips", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_CLAIM_ASSISTANT_MODEL = "gpt-5.1";

  installFetchMock(async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "For the claim form, use the text below.",
          showClaimFormHelpAction: false,
          suggestedProblemDescription:
            "My architecto dishwasher is not taking in water and may show error code E1. Please check the appliance and advise on the next step.",
        }),
      };
    },
  }));

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "Show claim-form help",
    conversationMessages: [
      { role: "user", text: "My dishwasher shows E1." },
      { role: "assistant", text: "Check the water inlet first." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.answer, "For the claim form, use the text below.");
  assert.equal(
    response.body.suggestedProblemDescription,
    "My architecto dishwasher is not taking in water and may show error code E1. Please check the appliance and advise on the next step.",
  );
  assert.equal(response.body.actions, undefined);
});

test("missing OpenAI configuration returns 503", async () => {
  delete process.env.OPENAI_API_KEY;

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "The sink is leaking.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 503);
  assert.equal(response.body.error, "Claim assistant is not configured.");
});
