const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routePath = path.join(__dirname, "..", "app", "api", "service-claims", "assistant", "route.js");
const troubleshootingDataPath = path.join(__dirname, "..", "lib", "service-claim-troubleshooting-data.json");
const claimsChatbotKnowledgePath = path.join(__dirname, "..", "lib", "claims-chatbot-knowledge.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = JSON.parse(fs.readFileSync(troubleshootingDataPath, "utf8"));
const CLAIMS_CHATBOT_KNOWLEDGE = JSON.parse(fs.readFileSync(claimsChatbotKnowledgePath, "utf8"));

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
    "CLAIMS_CHATBOT_KNOWLEDGE",
    "SERVICE_CLAIM_TROUBLESHOOTING_DATA",
    `${source}
return {
  POST,
  buildAnswer,
  normalizeCode,
  findClaimsChatbotKnowledgeMatch
};`,
  );

  return moduleFactory(
    NextResponse,
    prisma,
    overrides.enforceRateLimit || (() => {}),
    overrides.getRequestClientIp || (() => "127.0.0.1"),
    CLAIMS_CHATBOT_KNOWLEDGE,
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
  assert.equal(route.normalizeCode("E01"), "E1");
  assert.equal(route.normalizeCode("e1"), "E1");
  assert.equal(route.normalizeCode("E3"), "E3");
  assert.equal(route.normalizeCode("E03"), "E3");
  assert.equal(route.normalizeCode("E04"), "E4");
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

test("repeated greeting uses the greeting response instead of vague issue triage", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "hello hello",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.actions, undefined);
  assert.match(response.body.answer, /help you with the claim/i);
  assert.doesNotMatch(response.body.answer, /which of these fits best/i);
});

test("clearly unrelated question redirects to service claim scope", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "what is the weather today?",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.actions, undefined);
  assert.match(response.body.answer, /only help with kitchen service claims/i);
  assert.match(response.body.answer, /what is not working in the kitchen/i);
});

test("vague service issue is not blocked by out-of-scope guard", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "something is broken",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.body.answer, /only help with kitchen service claims/i);
  assert.match(response.body.answer, /damaged or broken item/i);
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

test("washing machine generic not-working issue uses decision-guide self-checks", async () => {
  delete process.env.OPENAI_API_KEY;
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "the washing machine its not working",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /safe self-check first/i);
  assert.match(response.body.answer, /Check tap, supply hose\/filter, close door, press Start\/Pause/i);
  assert.doesNotMatch(response.body.answer, /stop using the appliance/i);
});

test("claims decision-guide aliases map to the correct knowledge section", () => {
  const route = loadRoute();
  const match = route.findClaimsChatbotKnowledgeMatch({
    question: "FH664621E hood suction is weak",
    claim: emptyClaim(),
    selectedAreas: [],
    conversationMessages: [],
  });

  assert.equal(match.sourceSection, "FH 664 621 S / FH664621E - Extractor Hood");
  assert.equal(match.model, "FH 664 621 S / FH664621E");
  assert.equal(match.problem, "Weak suction / odours remain");
});

test("claims decision-guide normal behaviour does not trigger immediate claim creation", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My KMI 754 000 E induction hob is buzzing.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /this can be normal/i);
  assert.match(response.body.answer, /No claim/i);
  assert.equal(response.body.actions, undefined);
});

test("claims decision-guide self-check issue asks user to try safe check first", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My FH 664 621 S hood suction is weak.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /safe self-check first/i);
  assert.match(response.body.answer, /Clean grease filter/i);
  assert.match(response.body.answer, /Did this solve the issue/i);
});

test("claims decision-guide unresolved self-check guides user to create a claim", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "It still has weak suction after cleaning the filter.",
    conversationMessages: [
      { role: "user", text: "My FH 664 621 S hood suction is weak." },
      { role: "assistant", text: "Clean the grease filter first." },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /continue with a claim/i);
  assert.match(response.body.answer, /suction remains weak/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.match(response.body.suggestedProblemDescription, /checked\/tried/i);
});

test("claims decision-guide urgent issue stops use and escalates immediately", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My KMI 754 600 C hob glass is cracked.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /Stop using the appliance now/i);
  assert.match(response.body.answer, /Create or escalate the claim immediately/i);
  assert.match(response.body.answer, /Do not open electrical parts/i);
  assert.ok(Array.isArray(response.body.actions));
});

test("oven not working gives only safe checks then direct claim description", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My EBX 943 600 S oven does not work.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /oven not working can be a service issue/i);
  assert.match(response.body.answer, /function and temperature/i);
  assert.match(response.body.answer, /household fuse\/power supply/i);
  assert.match(response.body.answer, /There is no further safe self-check/i);
  assert.doesNotMatch(response.body.answer, /Suggested problem description/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.match(response.body.suggestedProblemDescription, /EBX 943 600 S/);
});

test("dishwasher E3 gives direct service guidance and suggested claim description", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My dishwasher shows E3.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /Error E3 is a heating\/temperature issue/i);
  assert.match(response.body.answer, /There is no further safe self-check/i);
  assert.doesNotMatch(response.body.answer, /Suggested problem description/i);
  assert.match(response.body.suggestedProblemDescription, /error E3/i);
  assert.ok(Array.isArray(response.body.actions));
});

test("dishwasher E02 then E3 combines both errors in claim description", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "Now it also shows E3.",
    conversationMessages: [
      { role: "user", text: "My dishwasher showed E02 and does not drain." },
      { role: "assistant", text: "Check the filters and drain hose." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /both E02\/E2 and E3/i);
  assert.match(response.body.suggestedProblemDescription, /E02\/E2 and E3/i);
  assert.match(response.body.suggestedProblemDescription, /not draining properly/i);
  assert.match(response.body.suggestedProblemDescription, /heating\/temperature issue/i);
});

test("washing machine E10 final step is direct if unresolved", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "My EWA 34660 W washing machine shows E10.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /Open water supply tap|water valve|inlet hose/i);
  assert.match(response.body.answer, /There is no further safe self-check/i);
  assert.ok(Array.isArray(response.body.actions));
  assert.equal(response.body.actions[0].id, "claim_form_help");
});

test("washing machine not working then E10 combines context in claim summary when unresolved", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "E10 still appears after checking the tap and hose.",
    conversationMessages: [
      { role: "user", text: "The washing machine is not working." },
      { role: "assistant", text: "Check the tap, supply hose/filter, door, and Start/Pause." },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /continue with a claim/i);
  assert.match(response.body.suggestedProblemDescription, /Washing machine not working/i);
  assert.match(response.body.suggestedProblemDescription, /Error E10/i);
});

test("claims decision-guide data is scoped to the service-claims assistant route", () => {
  const productInfoRoute = fs.readFileSync(
    path.join(__dirname, "..", "app", "api", "product-info", "ask", "route.js"),
    "utf8",
  );

  assert.doesNotMatch(productInfoRoute, /claims-chatbot-knowledge/);
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

test("POST sanitizes Amica from OpenAI user-facing answers", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  installFetchMock(async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "Error E4 on an Amica/architecto dishwasher indicates overflow.",
          showClaimFormHelpAction: false,
          suggestedProblemDescription: "My Amica dishwasher shows E4.",
        }),
      };
    },
  }));

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "i see error E4",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.body.answer, /Amica/i);
  assert.match(response.body.answer, /architecto dishwasher/i);
  assert.doesNotMatch(response.body.suggestedProblemDescription, /Amica/i);
});

test("OpenAI path keeps claim-form-help chip when suggested description exists", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  installFetchMock(async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "Error E3 needs service if the safe checks do not solve it.",
          showClaimFormHelpAction: false,
          suggestedProblemDescription: "My architecto dishwasher shows error E3.",
        }),
      };
    },
  }));

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "i see error E3",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.actions));
  assert.equal(response.body.actions[0].id, "claim_form_help");
  assert.match(response.body.suggestedProblemDescription, /E3/i);
});

test("POST collapses duplicate architecto brand wording", async () => {
  process.env.OPENAI_API_KEY = "test-key";

  installFetchMock(async () => ({
    ok: true,
    async json() {
      return {
        output_text: JSON.stringify({
          answer: "On your architecto / architecto washing machine, error E10 means no water.",
          showClaimFormHelpAction: false,
          suggestedProblemDescription: null,
        }),
      };
    },
  }));

  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "washing machine E10",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.body.answer, /architecto\s*\/\s*architecto/i);
  assert.match(response.body.answer, /architecto washing machine/i);
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

test("misspelled dishwasher question still opens dishwasher triage", async () => {
  const route = loadRoute();
  const response = await route.POST(request({
    language: "en",
    question: "dishwaher isn work ???",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /trouble with the dishwasher/i);
  assert.match(response.body.answer, /not draining/i);
});

test("misspelled appliance names are classified across claim assistant triage", async () => {
  const route = loadRoute();
  const cases = [
    { question: "frige isnt cooling", expected: /fridge or freezer/i },
    { question: "washing mashine isnt working", expected: /washing machine/i },
    { question: "owen not heating", expected: /oven/i },
    { question: "extracor hood doesnt work", expected: /extractor/i },
  ];

  for (const item of cases) {
    const response = await route.POST(request({
      language: "en",
      question: item.question,
      selectedAreas: [],
      claim: emptyClaim(),
    }));

    assert.equal(response.status, 200);
    assert.match(response.body.answer, item.expected);
    assert.doesNotMatch(response.body.answer, /only help with kitchen service claims/i);
  }
});

test("misspelled kitchen area names are still treated as service claim context", async () => {
  const route = loadRoute();
  const cases = [
    { question: "sinkk is leaking", expected: /leak/i },
    { question: "cabnet door broken", expected: /damaged or broken item/i },
  ];

  for (const item of cases) {
    const response = await route.POST(request({
      language: "en",
      question: item.question,
      selectedAreas: [],
      claim: emptyClaim(),
    }));

    assert.equal(response.status, 200);
    assert.match(response.body.answer, item.expected);
    assert.doesNotMatch(response.body.answer, /only help with kitchen service claims/i);
  }
});
