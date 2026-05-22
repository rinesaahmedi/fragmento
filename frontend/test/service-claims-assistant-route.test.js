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

test("known dishwasher error uses local knowledge and offers claim-form help", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My architecto dishwasher shows E1.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water tap is fully open/i);
  assert.match(response.body.answer, /water inlet problem/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.equal(response.body.actions[0].id, "claim_form_help");
  assert.match(response.body.actions[0].prompt, /E1/i);
});

test("claim-form help returns suggested problem description without action chips", async () => {
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
  assert.match(response.body.answer, /For the claim form/i);
  assert.equal(
    response.body.suggestedProblemDescription,
    "E1: My architecto dishwasher is not taking in water and may show error code E1. I checked the water tap and inlet hose, but the issue remains. Please arrange a check or advise on the next step.",
  );
  assert.match(response.body.answer, /\*\*E1:\*\*/);
  assert.equal(response.body.actions, undefined);
});

test("latest explicit dishwasher error code overrides older form description context", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "i see error E1",
    conversationMessages: [
      { role: "user", text: "the dishwasher its not working" },
      { role: "assistant", text: "Which of these fits best?" },
      { role: "user", text: "i see error E2" },
    ],
    selectedAreas: dishwasherArea(),
    claim: {
      ...emptyClaim(),
      problemDescription:
        "E02: My architecto dishwasher is not draining properly and may show error code E02. I checked the filters, drain hose, and pump area, but the issue remains. Please arrange a check or advise on the next step.",
    },
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water inlet problem/i);
  assert.match(response.body.answer, /water tap is fully open/i);
  assert.doesNotMatch(response.body.answer, /water drainage problem/i);
  assert.match(response.body.actions[0].prompt, /E1/i);
});

test("generic claim-form-help request follows the latest dishwasher error in conversation", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "Show claim-form help",
    conversationMessages: [
      { role: "user", text: "the dishwasher its not working" },
      { role: "assistant", text: "Which of these fits best?" },
      { role: "user", text: "i see error E1" },
      { role: "assistant", text: "This sounds like a water inlet problem." },
      { role: "user", text: "Show claim-form help E1" },
      { role: "assistant", text: "For the claim form..." },
      { role: "user", text: "i see error E2" },
    ],
    selectedAreas: dishwasherArea(),
    claim: {
      ...emptyClaim(),
      problemDescription:
        "E1: My architecto dishwasher is not taking in water and may show error code E1. I checked the water tap and inlet hose, but the issue remains. Please arrange a check or advise on the next step.",
    },
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /not draining properly/i);
  assert.equal(
    response.body.suggestedProblemDescription,
    "E02: My architecto dishwasher is not draining properly and may show error code E02. I checked the filters, drain hose, and pump area, but the issue remains. Please arrange a check or advise on the next step.",
  );
  assert.equal(response.body.actions, undefined);
});

test("low-information greeting does not show claim-form help action", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "hi",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.actions, undefined);
  assert.match(response.body.answer, /help you with the claim/i);
});

test("generic non-database issue does not show claim-form help action", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "The sink is leaking.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.actions, undefined);
  assert.match(response.body.answer, /leak around the sink area/i);
});
