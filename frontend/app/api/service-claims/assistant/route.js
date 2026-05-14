import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";

const COPY = {
  en: {
    greetingReply:
      "Hi. I can help you write the claim, choose the affected kitchen area, and suggest which photos or serial details to add.",
    greetingFollowUp:
      "Tell me what is not working, or ask me for help with wording, photos, or the right kitchen area.",
    unavailable: "The claim helper could not answer that right now.",
    openingGeneral: "Here is the fastest way to make the claim clearer for service support.",
    openingArea: "For {label}, here is what service support usually needs first.",
    includeTitle: "Include",
    nextTitle: "Suggested next steps in the form",
    areaTitle: "For this area",
    fallbackQuestion: "Please tell me what is not working, what you already observed, and which kitchen part is affected.",
    itemStarted: "When the issue started and whether it is constant or intermittent.",
    itemVisibleDamage: "What is visibly damaged, loose, leaking, blocked, or not reacting.",
    itemPhotoSet: "One overview photo and one close-up photo of the affected area.",
    itemErrorCode: "Any display message, blinking light, or error code if an appliance is involved.",
    itemNoiseSmell: "Whether there is unusual noise, smell, heat, or vibration.",
    itemLeak: "Where the water appears, whether it happens during use or also while idle, and how much water there is.",
    itemDishwasher: "Mention whether it does not start, does not drain, leaks, or shows an error.",
    itemWashingMachine: "Mention whether it does not spin, does not drain, leaks, or stops during the programme.",
    itemOvenHob: "State whether the oven or the hob is affected, which heating zone fails, and whether any fuse tripped.",
    itemFridge: "Mention whether the problem is cooling, icing, water, noise, or a door seal issue.",
    itemHood: "Mention whether the fan, extraction power, lighting, or noise level is the problem.",
    itemSink: "Describe whether the issue is a leak, blockage, bad odour, or damaged fitting.",
    itemCabinet: "Describe whether the issue is a hinge, drawer runner, front alignment, scratch, crack, or missing fitting.",
    nextMissingContract: "Add the contract number first so the support team can identify the kitchen setup.",
    nextMissingArea: "Select the affected kitchen area if possible so the claim is easier to route.",
    nextMissingSerial: "Add the appliance serial number if an electrical appliance is involved.",
    nextMissingSerialImage: "Upload a photo of the serial number label if you have it.",
    nextMissingAttachments: "Attach at least one photo if the problem is visible or physical.",
    nextMissingAvailability: "Add availability if a technician visit may be needed.",
    nextMissingContact: "Provide at least one contact option so the team can reach you.",
    nextAttachmentReady: "You already added attachments, so keep the written description short and precise.",
    askFollowUp: "If you want, ask me for a sample wording for the final problem description.",
  },
  de: {
    greetingReply:
      "Hallo. Ich helfe dir dabei, die Reklamation zu formulieren, den betroffenen K\u00fcchenbereich zu w\u00e4hlen und passende Fotos oder Seriendaten zu erg\u00e4nzen.",
    greetingFollowUp:
      "Schreib mir einfach, was nicht funktioniert, oder frag nach Hilfe bei Formulierung, Fotos oder dem richtigen K\u00fcchenbereich.",
    unavailable: "Die Reklamationshilfe konnte dazu gerade keine Antwort geben.",
    openingGeneral: "So wird die Reklamation f\u00fcr den Service am schnellsten klarer.",
    openingArea: "F\u00fcr {label} ben\u00f6tigt der Service meistens zuerst diese Angaben.",
    includeTitle: "Bitte angeben",
    nextTitle: "Sinnvolle n\u00e4chste Schritte im Formular",
    areaTitle: "Zu diesem Bereich",
    fallbackQuestion: "Beschreibe bitte, was genau nicht funktioniert, was du schon beobachtet hast und welcher K\u00fcchenbereich betroffen ist.",
    itemStarted: "Seit wann das Problem besteht und ob es dauerhaft oder nur zeitweise auftritt.",
    itemVisibleDamage: "Was sichtbar besch\u00e4digt, locker, undicht, blockiert oder ohne Reaktion ist.",
    itemPhotoSet: "Ein \u00dcbersichtsfoto und ein Nahfoto vom betroffenen Bereich.",
    itemErrorCode: "Jede Anzeige, Blinkmeldung oder Fehlernummer, falls ein Elektroger\u00e4t betroffen ist.",
    itemNoiseSmell: "Ob ungewohnte Ger\u00e4usche, Geruch, Hitze oder Vibration auftreten.",
    itemLeak: "Wo Wasser austritt, ob es nur bei Benutzung oder auch im Ruhezustand passiert und wie stark es austritt.",
    itemDishwasher: "Nenne, ob der Geschirrsp\u00fcler nicht startet, nicht abpumpt, undicht ist oder einen Fehler zeigt.",
    itemWashingMachine: "Nenne, ob die Waschmaschine nicht schleudert, nicht abpumpt, Wasser verliert oder im Programm stoppt.",
    itemOvenHob: "Gib an, ob Backofen oder Kochfeld betroffen ist, welche Zone nicht funktioniert und ob eine Sicherung ausgel\u00f6st hat.",
    itemFridge: "Nenne, ob es um K\u00fchlung, Vereisung, Wasser, Ger\u00e4usche oder die T\u00fcrdichtung geht.",
    itemHood: "Nenne, ob L\u00fcfter, Absaugleistung, Beleuchtung oder Lautst\u00e4rke das Problem sind.",
    itemSink: "Beschreibe, ob es um Undichtigkeit, Verstopfung, Geruch oder eine besch\u00e4digte Armatur geht.",
    itemCabinet: "Beschreibe, ob Scharnier, Auszug, Frontausrichtung, Kratzer, Riss oder ein fehlender Beschlag betroffen ist.",
    nextMissingContract: "Trage zuerst die Vertragsnummer ein, damit das Team die K\u00fcche eindeutig zuordnen kann.",
    nextMissingArea: "W\u00e4hle wenn m\u00f6glich den betroffenen K\u00fcchenbereich aus, damit die Reklamation besser zugeordnet wird.",
    nextMissingSerial: "Trage die Seriennummer ein, wenn ein Elektroger\u00e4t betroffen ist.",
    nextMissingSerialImage: "Lade nach M\u00f6glichkeit ein Foto vom Seriennummernschild hoch.",
    nextMissingAttachments: "F\u00fcge mindestens ein Foto hinzu, wenn der Schaden sichtbar oder physisch ist.",
    nextMissingAvailability: "Erg\u00e4nze eine Erreichbarkeit, falls wahrscheinlich ein Technikertermin n\u00f6tig ist.",
    nextMissingContact: "Hinterlege mindestens eine Kontaktm\u00f6glichkeit, damit der Service dich erreichen kann.",
    nextAttachmentReady: "Du hast bereits Anh\u00e4nge hinzugef\u00fcgt. Halte die schriftliche Beschreibung jetzt kurz und pr\u00e4zise.",
    askFollowUp: "Wenn du willst, formuliere ich dir als N\u00e4chstes einen passenden Text f\u00fcr die Problembeschreibung.",
  },
};

function t(language) {
  return COPY[language] || COPY.en;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function isGreeting(question) {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return false;
  return [
    "hi",
    "hello",
    "hey",
    "hallo",
    "servus",
    "guten tag",
    "good morning",
    "good afternoon",
    "good evening",
  ].includes(normalized);
}

function isLowInformationQuestion(question) {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return true;
  if (isGreeting(normalized)) return false;
  if (normalized.length <= 8) return true;
  if (normalized.split(/\s+/).length <= 2 && !/[?.!]/.test(normalized) && normalized.length < 18) {
    return true;
  }
  return false;
}

function detectAreaCategory(area) {
  const haystack = `${normalizeText(area?.name)} ${normalizeText(area?.code)}`.toLowerCase();
  if (!haystack) return "generic";
  if (haystack.includes("dish") || haystack.includes("geschirr")) return "dishwasher";
  if (haystack.includes("wm-") || haystack.includes("washing") || haystack.includes("wasch")) return "washing-machine";
  if (haystack.includes("oven") || haystack.includes("backofen") || haystack.includes("hob") || haystack.includes("koch")) return "oven-hob";
  if (haystack.includes("ref") || haystack.includes("fridge") || haystack.includes("k\u00fchl")) return "fridge";
  if (haystack.includes("hood") || haystack.includes("dunst")) return "hood";
  if (haystack.includes("sink") || haystack.includes("sp\u00fcl")) return "sink";
  if (haystack.includes("cab") || haystack.includes("drawer") || haystack.includes("schrank") || haystack.includes("front")) return "cabinet";
  return "generic";
}

function isApplianceCategory(category) {
  return ["dishwasher", "washing-machine", "oven-hob", "fridge", "hood"].includes(category);
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function buildAreaAdvice(copy, categories, combinedText) {
  const items = [];
  items.push(copy.itemStarted, copy.itemVisibleDamage, copy.itemPhotoSet);

  if (/\bleak|water|undicht|nass|tropf|drain|ablauf/i.test(combinedText)) {
    items.push(copy.itemLeak);
  }

  if (/\berror|code|display|blink|anzeige|fault|st.rung/i.test(combinedText)) {
    items.push(copy.itemErrorCode);
  }

  if (/\bnoise|smell|odor|ger\u00e4usch|laut|vibration|geruch|heiss|hot/i.test(combinedText)) {
    items.push(copy.itemNoiseSmell);
  }

  for (const category of categories) {
    if (category === "dishwasher") items.push(copy.itemDishwasher);
    if (category === "washing-machine") items.push(copy.itemWashingMachine);
    if (category === "oven-hob") items.push(copy.itemOvenHob);
    if (category === "fridge") items.push(copy.itemFridge);
    if (category === "hood") items.push(copy.itemHood);
    if (category === "sink") items.push(copy.itemSink);
    if (category === "cabinet") items.push(copy.itemCabinet);
  }

  return dedupe(items).slice(0, 6);
}

function buildNextSteps(copy, claim, categories, selectedAreas) {
  const steps = [];

  if (!normalizeText(claim.contractNumber)) {
    steps.push(copy.nextMissingContract);
  }
  if (!selectedAreas.length) {
    steps.push(copy.nextMissingArea);
  }
  if (categories.some(isApplianceCategory) && !normalizeText(claim.serialNumber)) {
    steps.push(copy.nextMissingSerial);
  }
  if (categories.some(isApplianceCategory) && !claim.hasSerialNumberImage) {
    steps.push(copy.nextMissingSerialImage);
  }
  if (!claim.attachmentCount) {
    steps.push(copy.nextMissingAttachments);
  } else {
    steps.push(copy.nextAttachmentReady);
  }
  if (!normalizeText(claim.availabilityDate) && !normalizeText(claim.availabilityTime)) {
    steps.push(copy.nextMissingAvailability);
  }
  if (!claim.hasPhone && !claim.hasEmail) {
    steps.push(copy.nextMissingContact);
  }

  return dedupe(steps).slice(0, 5);
}

function formatSection(title, items) {
  if (!items.length) {
    return "";
  }
  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function buildAnswer({ language, question, context, selectedAreas, claim }) {
  const copy = t(language);
  const focusLabel = normalizeText(context?.label);
  const questionText = normalizeText(question);
  if (isGreeting(questionText)) {
    return `${copy.greetingReply}\n\n${copy.greetingFollowUp}`;
  }
  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const scopedAreas =
    context?.type === "area" && focusLabel
      ? selectedAreas.filter((area) => normalizeText(area.name) === focusLabel)
      : selectedAreas;
  const categories = dedupe(scopedAreas.map(detectAreaCategory));

  const opening =
    context?.type === "area" && focusLabel
      ? copy.openingArea.replace("{label}", focusLabel)
      : copy.openingGeneral;

  const includeItems = buildAreaAdvice(copy, categories, combinedText);
  const nextItems = buildNextSteps(copy, claim || {}, categories, scopedAreas);

  const sections = [
    opening,
    formatSection(copy.includeTitle, includeItems),
    formatSection(copy.nextTitle, nextItems),
    copy.askFollowUp,
  ].filter(Boolean);

  if (!questionText || isLowInformationQuestion(questionText)) {
    sections.unshift(copy.fallbackQuestion);
  }

  return sections.join("\n\n").trim();
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims-assistant:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const question = normalizeText(body?.question);
    if (!question) {
      return NextResponse.json({ error: t(body?.language).unavailable }, { status: 400 });
    }

    const answer = buildAnswer({
      language: normalizeText(body?.language).toLowerCase(),
      question,
      context: body?.context || null,
      selectedAreas: Array.isArray(body?.selectedAreas) ? body.selectedAreas : [],
      claim: body?.claim || {},
    });

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Service claim assistant error:", error);
    return NextResponse.json(
      { error: error?.message || COPY.en.unavailable },
      { status: 500 },
    );
  }
}
