const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routePath = path.join(__dirname, "..", "app", "api", "service-claims", "assistant", "route.js");
const troubleshootingDataPath = path.join(__dirname, "..", "lib", "service-claim-troubleshooting-data.json");
const SERVICE_CLAIM_TROUBLESHOOTING_DATA = JSON.parse(fs.readFileSync(troubleshootingDataPath, "utf8"));

const KNOWLEDGE_ENTRIES = SERVICE_CLAIM_TROUBLESHOOTING_DATA.lookupEntries;

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

function assertClaimFormHelpAction(body, language) {
  assert.ok(Array.isArray(body.actions), "expected compact troubleshooting actions");
  assert.equal(body.actions.length, 1);
  const action = body.actions[0];
  assert.equal(action.id, "claim_form_help");
  if (language === "de") {
    assert.equal(action.label, "Formularhilfe anzeigen");
    assert.equal(action.prompt, "Formularhilfe anzeigen");
  } else if (language === "es") {
    assert.equal(action.label, "Mostrar ayuda del formulario");
    assert.equal(action.prompt, "Mostrar ayuda del formulario");
  } else {
    assert.equal(action.label, "Show claim-form help");
    assert.equal(action.prompt, "Show claim-form help");
  }
}

test("normalizes dishwasher error codes", () => {
  const route = loadRoute();
  assert.equal(route.normalizeCode(" e 02 "), "E02");
  assert.equal(route.normalizeCode("e1"), "E1");
  assert.equal(route.normalizeCode("E3"), "E3");
});

test("vague appliance problem gets a short clarifying question", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "The oven is not working.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /which of these fits best/i);
  assert.match(response.body.answer, /It is not turning on or not working at all/);
  assert.match(response.body.answer, /It shows an error code on the display/);
  assert.doesNotMatch(response.body.answer, /Suggested next steps in the form/);
});

test("vague room or area problem gets a short clarifying question", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "There is a problem in the kitchen.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /trouble in the kitchen/i);
  assert.match(response.body.answer, /An appliance is not working/);
  assert.match(response.body.answer, /There is a leak or water issue/);
});

test("explicit dishwasher E1 uses concise water inlet guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "My Amica dishwasher shows E1.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water inlet problem/);
  assert.match(response.body.answer, /matches error code E1/);
  assert.match(response.body.answer, /You can try/);
  assert.match(response.body.answer, /Check that the water tap is fully open/);
  assert.match(response.body.answer, /If the issue continues, you can create a claim\./);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /For the claim form/);
  assert.doesNotMatch(response.body.answer, /Suggested problem description/);
  assert.doesNotMatch(response.body.answer, /What it means/);
  assert.equal(response.body.suggestedProblemDescription, undefined);
});

test("show claim-form help after E1 conversation returns suggested description for the form", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "Show claim-form help",
    conversationMessages: [
      { role: "user", text: "im seeing the error E1" },
      {
        role: "assistant",
        text: "This sounds like a water inlet problem and matches error code E1 on architecto dishwashers.",
      },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /For the claim form/);
  assert.match(
    response.body.suggestedProblemDescription,
    /My architecto dishwasher is not taking in water and may show error code E1/,
  );
  assert.ok(!response.body.actions);
});

test("dishwasher temperature issue maps to E3 without unrelated leak advice", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "The dishwasher water stays cold and is not heating.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /heating or temperature problem/);
  assert.match(response.body.answer, /often linked to error code E3/);
  assert.match(response.body.answer, /Unplug the appliance for about 1 to 2 minutes/);
  assert.match(response.body.answer, /Inspect the inside filters/);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /Mention that the dishwasher is not heating or the water stays cold, and add E3/);
  assert.doesNotMatch(response.body.answer, /base tray/i);
  assert.doesNotMatch(response.body.answer, /tilt the appliance slightly forward/i);
});

test("dishwasher drainage issue maps to E02", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "The dishwasher does not drain and water stays inside.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /drainage problem/);
  assert.match(response.body.answer, /often linked to error code E02/);
  assert.match(response.body.answer, /Clean the internal filters/);
  assert.match(response.body.answer, /Check the drain hose/);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /base tray/i);
});

test("dishwasher leak or constant pumping maps to E4 and includes base tray advice", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "My dishwasher keeps pumping continuously and there may be water in the base tray.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /leak or overflow problem/);
  assert.match(response.body.answer, /often linked to error code E4/);
  assert.match(response.body.answer, /check whether there is water in the base tray/i);
  assert.match(response.body.answer, /tilt the appliance slightly forward/i);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
});

test("specific leak issue gets concise troubleshooting with optional form-help cta", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "There is water leaking under the sink.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /This sounds like a leak/);
  assert.match(response.body.answer, /If safe, stop using the affected sink or fitting for now/);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /For the claim form/);
  assert.doesNotMatch(response.body.answer, /Suggested problem description/);
});

test("specific drainage or blockage issue gets concise troubleshooting with optional form-help cta", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "The kitchen sink is blocked and not draining properly.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /blockage or drainage problem/);
  assert.match(response.body.answer, /Stop using the sink or drain if water is backing up/);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /Suggested problem description/);
});

test("specific electrical or lighting issue gets concise troubleshooting with optional form-help cta", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "The kitchen light is flickering and one socket has no power.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /electrical or lighting issue/);
  assert.match(response.body.answer, /stop using the affected light, switch, or socket/i);
  assert.doesNotMatch(response.body.answer, /\[Show claim-form help\]/);
  assert.match(response.body.answer, /I can also give you wording for the claim form if needed\./);
  assertClaimFormHelpAction(response.body, "en");
  assert.doesNotMatch(response.body.answer, /whether the issue is no power, flickering, or visible damage/i);
});

test("the dishwasher is not working asks a clarifying question", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "the dishwasher is not working",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /dishwasher/i);
  assert.match(response.body.answer, /which of these fits best/i);
  assert.match(response.body.answer, /It is not taking in water/);
  assert.doesNotMatch(response.body.answer, /Suggested next steps in the form/);
});

test("it is not taking in water maps to E1 and not E3", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "It is not taking in water.",
    conversationMessages: [
      { role: "user", text: "i have a problem with the dishwasher" },
      { role: "assistant", text: "Which of these fits best?" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /water inlet problem/);
  assert.match(response.body.answer, /often linked to error code E1/);
  assert.doesNotMatch(response.body.answer, /error code E3/);
  assert.doesNotMatch(response.body.answer, /error code E4/);
  assert.doesNotMatch(response.body.answer, /base tray/i);
});

test("it is not heating or the water stays cold maps to E3", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "It is not heating or the water stays cold.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /heating or temperature problem/);
  assert.match(response.body.answer, /often linked to error code E3/);
});

test("it is not draining maps to E02 without duplicate filter advice", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "It is not draining.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /drainage problem/);
  assert.match(response.body.answer, /often linked to error code E02/);
  assert.match(response.body.answer, /Clean the internal filters/);
  assert.match(response.body.answer, /Check the drain hose/);
  assert.match(response.body.answer, /Check the pump area for blockages/);
  assert.match(response.body.answer, /Unplug the appliance for about 1 to 2 minutes/);
  assert.equal((response.body.answer.match(/filter/gi) || []).length, 1);
  assert.doesNotMatch(response.body.answer, /Inspect the inside filters for dirt and buildup/);
});

test("it is leaking or pumping maps to E4", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "It is leaking, keeps pumping, or there may be water in the base tray.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /leak or overflow problem/);
  assert.match(response.body.answer, /often linked to error code E4/);
});

test("it shows an error code on the display asks which code is shown", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "It shows an error code on the display.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /What error code is shown on the display/i);
  assert.match(response.body.answer, /E1: Water inlet problem/);
  assert.match(response.body.answer, /E3: Heating or temperature problem/);
  assert.match(response.body.answer, /E4: Leak or overflow problem/);
  assert.match(response.body.answer, /E02: Water drainage problem/);
  assert.doesNotMatch(response.body.answer, /often linked to error code E4/);
});

test("E4 shown on the display returns E4 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "E4 is shown on the display.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E4/);
});

test("E1 shown on the display returns E1 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "E1 is shown on the display.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E1/);
});

test("i see error E1 returns dishwasher guidance without prior dishwasher context", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "i see error E1",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E1/);
  assert.match(response.body.answer, /water inlet problem/);
  assert.doesNotMatch(response.body.answer, /An appliance is not working/);
});

test("i see error 4 returns dishwasher E4 guidance without prior dishwasher context", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "i see error 4",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E4/);
  assert.match(response.body.answer, /leak or overflow problem/);
  assert.doesNotMatch(response.body.answer, /An appliance is not working/);
});

test("E3 shown on the display returns E3 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "E3 is shown on the display.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E3/);
});

test("E02 shown on the display returns E02 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "E02 is shown on the display.",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E02/);
});

test("latest dishwasher error code overrides earlier conversation codes", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "i see error E2",
    conversationMessages: [
      { role: "user", text: "the dishwasher isnt working" },
      { role: "assistant", text: "To help you faster, which of these fits best?" },
      { role: "user", text: "i see error E1" },
      { role: "assistant", text: "This sounds like a water inlet problem and matches error code E1 on architecto dishwashers." },
      { role: "user", text: "i see error E4" },
      { role: "assistant", text: "This sounds like a leak or overflow problem and matches error code E4 on architecto dishwashers." },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E02/);
  assert.match(response.body.answer, /drainage problem/);
  assert.doesNotMatch(response.body.answer, /matches error code E4/);
  assert.doesNotMatch(response.body.answer, /leak or overflow problem/);
});

test("latest german dishwasher error code overrides earlier conversation codes", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "ich sehe Fehler E2",
    conversationMessages: [
      { role: "user", text: "die Spülmaschine funktioniert nicht" },
      { role: "assistant", text: "Welcher Fehlercode wird auf dem Display angezeigt?" },
      { role: "user", text: "ich sehe Fehler E1" },
      { role: "assistant", text: "Das klingt nach einem Problem mit dem Wasserzulauf, passend zu Fehlercode E1." },
      { role: "user", text: "ich sehe Fehler E4" },
      { role: "assistant", text: "Das klingt nach einem Leck- oder Überlaufproblem, passend zu Fehlercode E4." },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Fehlercode E02/);
  assert.match(response.body.answer, /Problem mit dem Wasserablauf/i);
  assert.doesNotMatch(response.body.answer, /Fehlercode E4/);
  assert.doesNotMatch(response.body.answer, /Leck- oder Überlaufproblem/i);
});

test("error 4 after dishwasher clarification returns E4 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "i see error 4",
    conversationMessages: [
      { role: "user", text: "the dishwasher isnt working" },
      { role: "assistant", text: "To help you faster, which of these fits best?" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E4/);
  assert.match(response.body.answer, /leak or overflow problem/);
});

test("i see error E02 returns dishwasher guidance without prior dishwasher context", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "i see error E02",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.match(response.body.answer, /matches error code E02/);
  assert.match(response.body.answer, /drainage problem/);
  assert.doesNotMatch(response.body.answer, /There is a leak or water issue/);
});

test("user-provided code uses matches wording while inferred code uses often linked wording", async () => {
  const route = loadRoute();

  const explicitResponse = await route.POST(request({
    language: "en",
    question: "My dishwasher shows E3 and the water stays cold.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));
  const inferredResponse = await route.POST(request({
    language: "en",
    question: "My dishwasher water stays cold.",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.match(explicitResponse.body.answer, /matches error code E3/);
  assert.match(inferredResponse.body.answer, /often linked to error code E3/);
});

test("knowledge entries are queried by brand and appliance type", async () => {
  let receivedQuery = null;
  const route = loadRoute({
    prisma: {
      serviceClaimKnowledgeEntry: {
        findMany: async (query) => {
          receivedQuery = query;
          return KNOWLEDGE_ENTRIES;
        },
      },
    },
  });

  await route.POST(request({
    language: "en",
    question: "Dishwasher E1",
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.deepEqual(receivedQuery.where, {
    brand: "Amica",
    applianceType: "dishwasher",
    isActive: true,
  });
});

test("misspelled german language request switches the assistant to german immediately", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "kant du bitte auf deutch anfragen",
    conversationMessages: [
      { role: "user", text: "meine dishwasher ist kapput" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /^Natürlich, ich kann auf Deutsch antworten\./);
  assert.match(response.body.answer, /Es tut mir leid, dass Sie Probleme mit der Spülmaschine haben\./);
  assert.match(response.body.answer, /Sie zieht kein Wasser\./);
  assert.doesNotMatch(response.body.answer, /To help you faster/i);
});

test("german greeting uses formal support tone", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "hallo",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Ich helfe Ihnen bei der Reklamation\./);
  assert.match(response.body.answer, /Schreiben Sie einfach/);
  assert.doesNotMatch(response.body.answer, /\bdu\b|\bdir\b|\bdein\b|\bschreib\b|\bfrag\b/i);
});

test("hall is treated as a german greeting, not a generic maintenance issue", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "hall",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Ich helfe Ihnen bei der Reklamation\./);
  assert.doesNotMatch(response.body.answer, /Ein Gerät funktioniert nicht\./);
});

test("halo is treated as a german greeting, not a generic maintenance issue", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "halo",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Ich helfe Ihnen bei der Reklamation\./);
  assert.doesNotMatch(response.body.answer, /Ein Gerät funktioniert nicht\./);
});

test("hi returns the greeting intro", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "hi",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /I can help you with the claim\./);
  assert.doesNotMatch(response.body.answer, /An appliance is not working\./);
});

test("hey returns the greeting intro", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "hey",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /I can help you with the claim\./);
});

test("guten tag returns the german greeting intro", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "guten tag",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Ich helfe Ihnen bei der Reklamation\./);
});

test("bitte auf deutsch returns a german answer", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "bitte auf deutsch",
    conversationMessages: [
      { role: "user", text: "the dishwasher is not working" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Natürlich, ich kann auf Deutsch antworten\./);
  assert.match(response.body.answer, /Sie heizt nicht oder das Wasser bleibt kalt\./);
});

test("mixed german and english dishwasher wording is treated as german", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "meine dishwasher ist kapput",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Es tut mir leid, dass Sie Probleme mit der Spülmaschine haben\./);
});

test("german dishwasher issue gets the german clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "mein geschirrspüler ist kaputt",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Sie heizt nicht oder das Wasser bleibt kalt\./);
  assert.match(response.body.answer, /Auf dem Display wird ein Fehlercode angezeigt\./);
});

test("spülmaschine funktioniert nicht gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "die Spülmaschine funktioniert nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
  assert.match(response.body.answer, /Sie heizt nicht oder das Wasser bleibt kalt\./);
  assert.doesNotMatch(response.body.answer, /Ein Gerät funktioniert nicht\./);
});

test("spülmaschine funksioniert nicht gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "die Spülmaschine funksioniert nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
  assert.match(response.body.answer, /Sie zieht kein Wasser\./);
});

test("meine spülmaschine ist kaputt gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "meine Spülmaschine ist kaputt",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("geschirrspüler geht nicht gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Geschirrspüler geht nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("typo-heavy schpulmachine phrase gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "die schpulmachine fuksioniert nich",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
  assert.match(response.body.answer, /Sie pumpt nicht ab\./);
});

test("spülmaschiene kaputt gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "spülmaschiene kaputt",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("geschirrspuler geht nicht gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "geschirrspuler geht nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("dishwasher funktioniert nicht gets the german dishwasher clarification menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "dishwasher funktioniert nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("german generic issue without appliance gets the generic maintenance menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "etwas ist kaputt",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Es tut mir leid, dass Sie Probleme damit haben\./);
  assert.match(response.body.answer, /Ein Gerät funktioniert nicht\./);
  assert.doesNotMatch(response.body.answer, /Probleme mit der Spülmaschine/);
});

test("ein gerät funktioniert nicht asks which appliance is affected", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Ein Gerät funktioniert nicht.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Welches Gerät funktioniert nicht\?/);
  assert.match(response.body.answer, /- Spülmaschine/);
  assert.match(response.body.answer, /- Ein anderes Gerät/);
  assert.doesNotMatch(response.body.answer, /Das klingt nach einer Verstopfung/);
});

test("es gibt ein leck oder ein wasserproblem returns leak guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Es gibt ein Leck oder ein Wasserproblem.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Das klingt nach einem Leck oder Wasserproblem\./);
  assert.match(response.body.answer, /wo das Wasser austritt/);
  assert.doesNotMatch(response.body.answer, /Verstopfung oder einem Ablaufproblem/);
});

test("spüle wasserhahn oder abfluss ist verstopft oder beschädigt returns drain guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Spüle, Wasserhahn oder Abfluss ist verstopft oder beschädigt.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Das klingt nach einer Verstopfung oder einem Ablaufproblem\./);
});

test("es gibt ein problem mit strom oder beleuchtung returns electrical guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Es gibt ein Problem mit Strom oder Beleuchtung.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Das klingt nach einem Strom- oder Beleuchtungsproblem\./);
  assert.doesNotMatch(response.body.answer, /Verstopfung oder einem Ablaufproblem/);
});

test("etwas ist kaputt oder beschädigt asks what exactly is damaged", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Etwas ist kaputt oder beschädigt.",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Was genau ist kaputt oder beschädigt\?/);
  assert.match(response.body.answer, /- Schrank oder Tür/);
  assert.doesNotMatch(response.body.answer, /Ein Gerät funktioniert nicht\./);
});

test("ich habe ein problem gets the german generic maintenance menu", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "ich habe ein Problem",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Es tut mir leid, dass Sie Probleme damit haben\./);
  assert.match(response.body.answer, /Ein Gerät funktioniert nicht\./);
});

test("german zieht kein wasser maps to german E1 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "mein geschirrspüler zieht kein wasser",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Problem mit dem Wasserzulauf/);
  assert.match(response.body.answer, /häufig verbunden mit Fehlercode E1/i);
  assert.doesNotMatch(response.body.answer, /\[Formularhilfe anzeigen\]/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
  assert.doesNotMatch(response.body.answer, /Geben Sie an, dass der Geschirrspüler kein Wasser zieht\./);
});

test("spülmaschine zieht kein wasser maps to german E1 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Spülmaschine zieht kein Wasser",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Problem mit dem Wasserzulauf/);
  assert.doesNotMatch(response.body.answer, /\[Formularhilfe anzeigen\]/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
  assert.doesNotMatch(response.body.answer, /Für das Schadensformular/);
});

test("german heizt nicht maps to german E3 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "der geschirrspüler heizt nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Heiz- oder Temperaturproblem/);
  assert.match(response.body.answer, /häufig verbunden mit Fehlercode E3/i);
  assert.doesNotMatch(response.body.answer, /\[Formularhilfe anzeigen\]/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
});

test("spülmaschine heizt nicht maps to german E3 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Spülmaschine heizt nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Heiz- oder Temperaturproblem/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
});

test("german pumpt nicht ab maps to german E02 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "der geschirrspüler pumpt nicht ab",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Problem mit dem Wasserablauf/);
  assert.match(response.body.answer, /häufig verbunden mit Fehlercode E02/i);
  assert.doesNotMatch(response.body.answer, /\[Formularhilfe anzeigen\]/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
  assert.doesNotMatch(response.body.answer, /Geben Sie an, dass der Geschirrspüler nicht abpumpt\./);
});

test("spülmaschine pumpt nicht ab maps to german E02 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Spülmaschine pumpt nicht ab",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Problem mit dem Wasserablauf/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
});

test("german leak and base tray wording maps to german E4 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "der geschirrspüler ist undicht und pumpt dauerhaft, vielleicht wasser in der bodenwanne",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Leck- oder Überlaufproblem/);
  assert.match(response.body.answer, /häufig verbunden mit Fehlercode E4/i);
  assert.match(response.body.answer, /Wasser in der Bodenwanne/i);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
});

test("spülmaschine ist undicht maps to german E4 guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Spülmaschine ist undicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Leck- oder Überlaufproblem/);
  assert.match(response.body.answer, /Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben\./);
  assertClaimFormHelpAction(response.body, "de");
});

test("display error phrase asks for the code in german after dishwasher context", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Auf dem Display wird ein Fehlercode angezeigt",
    conversationMessages: [
      { role: "user", text: "die Spülmaschine funktioniert nicht" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Welcher Fehlercode wird auf dem Display angezeigt/i);
  assert.doesNotMatch(response.body.answer, /Fehlercode E4/);
});

test("german error-code-only wording asks for the code in german", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "beim geschirrspüler wird ein fehlercode angezeigt",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Welcher Fehlercode wird auf dem Display angezeigt/i);
  assert.match(response.body.answer, /E1: Problem mit dem Wasserzulauf/);
  assert.doesNotMatch(response.body.answer, /Fehlercode E4/);
});

test("english conversation stays in english until german is requested", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "the dishwasher is not working",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /which of these fits best/i);
  assert.doesNotMatch(response.body.answer, /Natürlich, ich kann auf Deutsch antworten/);
});

test("german dishwasher responses do not contain informal forms", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "die Spülmaschine funktioniert nicht",
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.doesNotMatch(response.body.answer, /\bdu\b|\bdir\b|\bdein\b|\bschreib\b|\bfrag\b/i);
});

test("what should i write shows english claim-form guidance and suggested description", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "what should I write?",
    conversationMessages: [
      { role: "user", text: "My Amica dishwasher shows E1." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /For the claim form/);
  assert.match(response.body.answer, /Mention that the dishwasher is not taking in water and add E1/);
  assert.match(response.body.answer, /Suggested problem description/);
  assert.match(
    response.body.suggestedProblemDescription,
    /My architecto dishwasher is not taking in water and may show error code E1/,
  );
  assert.ok(!response.body.actions);
});

test("formularhilfe anzeigen shows german claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Formularhilfe anzeigen",
    conversationMessages: [
      { role: "user", text: "Spülmaschine zieht kein Wasser" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Für das Schadensformular/);
  assert.match(response.body.answer, /Geben Sie an, dass der Geschirrspüler kein Wasser zieht/);
  assert.match(response.body.answer, /Vorschlag für die Beschreibung/);
  assert.ok(!response.body.actions);
});

test("show claim-form help shows english claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "Show claim-form help",
    conversationMessages: [
      { role: "user", text: "The dishwasher water stays cold and is not heating." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /For the claim form/);
  assert.match(response.body.answer, /Mention that the dishwasher is not heating or the water stays cold, and add E3/);
  assert.match(
    response.body.suggestedProblemDescription,
    /My architecto dishwasher is not heating properly and may show error code E3/,
  );
  assert.ok(!response.body.actions);
});

test("spanish E3 dishwasher guidance stays in spanish", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "es",
    question: "Veo el error E3",
    conversationMessages: [
      { role: "user", text: "El lavavajillas no funciona" },
    ],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "es");
  assert.match(response.body.answer, /problema de calentamiento o temperatura/i);
  assert.match(response.body.answer, /Puedes probar/);
  assert.match(response.body.answer, /Desenchufa el aparato durante 1 o 2 minutos para reiniciarlo/i);
  assert.doesNotMatch(response.body.answer, /Unplug the appliance/i);
  assertClaimFormHelpAction(response.body, "es");
});

test("mostrar ayuda del formulario shows spanish claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "es",
    question: "Mostrar ayuda del formulario",
    conversationMessages: [
      { role: "user", text: "Veo el error E3" },
      { role: "assistant", text: "Esto parece un problema de calentamiento o temperatura y coincide con el código de error E3 en lavavajillas architecto." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "es");
  assert.match(response.body.answer, /Para el formulario/);
  assert.match(response.body.answer, /Indica que el lavavajillas no calienta o que el agua sigue fría, y añade E3/i);
  assert.match(response.body.answer, /Descripción del problema sugerida/);
  assert.match(
    response.body.suggestedProblemDescription,
    /Mi lavavajillas architecto no calienta bien y puede mostrar el código de error E3/i,
  );
  assert.ok(!response.body.actions);
});

test("claim-form help phrase shows english drainage claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "en",
    question: "claim-form help",
    conversationMessages: [
      { role: "user", text: "The dishwasher does not drain and water stays inside." },
    ],
    selectedAreas: dishwasherArea(),
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "en");
  assert.match(response.body.answer, /For the claim form/);
  assert.match(response.body.answer, /Mention that the dishwasher is not draining properly/);
  assert.match(response.body.answer, /My architecto dishwasher is not draining properly/);
  assert.equal(
    response.body.suggestedProblemDescription,
    "My architecto dishwasher is not draining properly and may show error code E02. I checked the filters, drain hose, and pump area, but the issue remains. Please arrange a check or advise on the next step.",
  );
  assert.ok(!response.body.actions);
});

test("Was soll ich schreiben shows german dishwasher claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Was soll ich schreiben?",
    conversationMessages: [{ role: "user", text: "Spülmaschine pumpt nicht ab" }],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Für das Schadensformular/);
  assert.match(response.body.answer, /Geben Sie an, dass der Geschirrspüler nicht abpumpt/);
  assert.match(response.body.answer, /Mein architecto-Geschirrspüler pumpt nicht richtig ab/);
  assert.ok(!response.body.actions);
});

test("Formulierung triggers german dishwasher claim-form guidance", async () => {
  const route = loadRoute();

  const response = await route.POST(request({
    language: "de",
    question: "Formulierung",
    conversationMessages: [{ role: "user", text: "Spülmaschine heizt nicht" }],
    selectedAreas: [],
    claim: emptyClaim(),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.body.language, "de");
  assert.match(response.body.answer, /Für das Schadensformular/);
  assert.match(response.body.answer, /nicht richtig heizt/);
  assert.match(response.body.answer, /Vorschlag für die Beschreibung/);
  assert.ok(!response.body.actions);
});

test("structured troubleshooting data contains english and german dishwasher guides for required Amica codes", () => {
  const guides = SERVICE_CLAIM_TROUBLESHOOTING_DATA.guides.filter((entry) =>
    entry.brand === "Amica" && entry.appliance_type === "dishwasher"
  );

  for (const language of ["en", "de", "es"]) {
    for (const code of ["E1", "E3", "E4", "E02"]) {
      const match = guides.find((entry) => entry.language === language && entry.error_code === code);
      assert.ok(match, `missing ${language} guide for ${code}`);
      assert.ok(match.title);
      assert.ok(match.description);
      assert.ok(Array.isArray(match.troubleshooting_steps) && match.troubleshooting_steps.length > 0);
      assert.ok(match.optional_form_description);
      assert.ok(Array.isArray(match.keywords) && match.keywords.length > 0);
    }
  }
});

test("route no longer hardcodes dishwasher troubleshooting titles or sample descriptions", () => {
  const source = fs.readFileSync(routePath, "utf8");

  assert.doesNotMatch(source, /Water inlet problem/);
  assert.doesNotMatch(source, /Heating or temperature problem/);
  assert.doesNotMatch(source, /Leak or overflow problem/);
  assert.doesNotMatch(source, /Water drainage problem/);
  assert.doesNotMatch(source, /My architecto dishwasher is not taking in water/);
  assert.doesNotMatch(source, /My architecto dishwasher is not heating properly/);
  assert.doesNotMatch(source, /My architecto dishwasher appears to have a leak or overflow problem/);
  assert.doesNotMatch(source, /My architecto dishwasher is not draining properly/);
});
