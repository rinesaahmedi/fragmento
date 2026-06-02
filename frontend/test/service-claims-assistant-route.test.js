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

test("known fridge cooling issue uses claims knowledge and offers claim-form help", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My fridge is warm and not cooling.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /cooling problem/i);
  assert.match(response.body.answer, /temperature setting/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.match(response.body.actions[0].prompt, /fridge/i);
});

test("gas smell issue returns urgent gas-hob claims guidance", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "I smell gas from the gas hob.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /gas smell/i);
  assert.match(response.body.answer, /stop using the appliance immediately/i);
  assert.ok(Array.isArray(response.body.actions));
});

test("common typo in 'error' still matches dishwasher code guidance", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My dishwaser shows eror E1.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water inlet problem/i);
  assert.match(response.body.answer, /water tap is fully open/i);
});

test("common typo in appliance and symptom still matches fridge knowledge", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My frdge is warm and not coolng.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /cooling problem/i);
  assert.match(response.body.answer, /temperature setting/i);
});

test("generic fuzzy matching handles broader misspellings, not just hardcoded words", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "I smels lkie gas from the gas hbo.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /gas smell/i);
  assert.match(response.body.answer, /stop using the appliance immediately/i);
});

test("vague washing machine issue asks for clarification instead of guessing a leak", async () => {
  delete process.env.OPENAI_API_KEY;
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "the washing machine its not working",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /which of these fits best/i);
  assert.doesNotMatch(response.body.answer, /washing machine leak/i);
  assert.doesNotMatch(response.body.answer, /stop using the appliance/i);
});

test("POST uses OpenAI assistant path when OPENAI_API_KEY is configured", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_CLAIM_ASSISTANT_MODEL = "gpt-5.1";

  installFetchMock(async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.match(init.headers.Authorization, /^Bearer test-key$/);
    return {
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            answer: "LLM answer for ambiguous washing machine issue.",
            showClaimFormHelpAction: false,
            suggestedProblemDescription: null,
          }),
        };
      },
    };
  });

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "the washing machine its not working",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.answer, "LLM answer for ambiguous washing machine issue.");
});

test("OpenAI path does not show claim-form-help chip on vague clarifying responses", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  installFetchMock(async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "Which of these fits best?",
          showClaimFormHelpAction: true,
          suggestedProblemDescription: null,
        }),
      };
    },
  }));

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "the dishwasher its not working",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.answer, "Which of these fits best?");
  assert.equal(response.body.actions, undefined);
});

test("OpenAI context marks appliance switches so latest user issue wins", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  installFetchMock(async (_url, init) => {
    const payload = JSON.parse(init.body);
    const text = payload.input[0].content[0].text;

    assert.match(text, /"current_message_appliance_types": \[\s*"washing_machine"\s*\]/);
    assert.match(text, /"previous_conversation_appliance_types": \[\s*"dishwasher"\s*\]/);
    assert.match(text, /"appliance_switch_from_previous": true/);

    return {
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            answer: "This is about the washing machine now.",
            showClaimFormHelpAction: false,
            suggestedProblemDescription: null,
          }),
        };
      },
    };
  });

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "the washing machine its not wokring",
    conversationMessages: [
      { role: "user", text: "the dishwasher its not working" },
      { role: "assistant", text: "Which of these fits best?" },
      { role: "user", text: "i see error E3" },
      { role: "assistant", text: "This sounds like a heating problem." },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.answer, "This is about the washing machine now.");
});
