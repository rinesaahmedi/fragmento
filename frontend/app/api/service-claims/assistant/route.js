import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../../lib/rate-limit";
import { prisma } from "../../../../lib/prisma";
import CLAIMS_CHATBOT_KNOWLEDGE from "../../../../lib/claims-chatbot-knowledge.json";
import SERVICE_CLAIM_TROUBLESHOOTING_DATA from "../../../../lib/service-claim-troubleshooting-data.json";

const OPENAI_TIMEOUT_MS = 20000;

const COPY = {
  en: {
    greetingReply: "Hi. I can help you with the claim.",
    greetingFollowUp: "Tell me what is wrong, or ask about wording, photos, or the right kitchen area.",
    greetingExamples:
      "For example: \"The sink is leaking\", \"What photos should I attach?\", or \"Which area should I select?\"",
    unavailable: "The claim helper could not answer that right now.",
    openingGeneral: "Here is the fastest way to make the claim clearer for service support.",
    openingArea: "For {label}, here is what service support usually needs first.",
    includeTitle: "Include",
    nextTitle: "Suggested next steps in the form",
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
    briefPrompt: "Please tell me what is wrong, which kitchen part is affected, and what you have already noticed.",
    briefPromptWithArea: "Please tell me what is wrong with {label} and what you have already noticed.",
    sampleWordingIntro: "You can use this wording:",
    sampleWordingAreaFallback: "the affected area",
    sampleWordingAreaLabel: "Affected area",
    sampleWordingFallback:
      "The issue started [when]. It is [constant/intermittent]. The affected area is [area]. I noticed [visible issue]. Please check and advise on the next step.",
    sampleWordingOutro: "Please check and advise on the next step.",
    knowledgeOpening: "I found matching architecto dishwasher troubleshooting guidance for this issue.",
    knowledgeOpeningArea: "For {label}, I found matching architecto dishwasher troubleshooting guidance.",
    knowledgeCodeTitle: "Matching guidance",
    knowledgeSymptomsTitle: "What it usually means",
    knowledgeChecksTitle: "Check first",
    knowledgeCausesTitle: "Possible cause",
    knowledgeActionsTitle: "Immediate steps",
    knowledgeGeneralCode: "Code",
    issueSubject_appliance: "the appliance",
    issueSubject_leak: "the leak",
    issueSubject_sink_or_drain: "the sink or drain",
    issueSubject_electrical_issue: "the electrical issue",
    issueSubject_this: "this",
    issueSubject_sink_area: "the sink area",
    issueSubject_blockage: "the blockage",
    issueSubject_lighting: "the lighting",
    issueSubject_oven: "the oven",
    issueSubject_fridge_or_freezer: "the fridge or freezer",
    issueSubject_washing_machine: "the washing machine",
    issueSubject_dryer: "the dryer",
    issueSubject_hob: "the hob",
    issueSubject_extractor: "the extractor",
    issueSubject_kitchen: "the kitchen",
    generalClarifyLead: "To help you faster, which of these fits best?",
    generalClarifyApplianceIntro: "",
    generalClarifyApplianceIntroWithSubject: "I'm sorry you're having trouble with {subject}.",
    generalClarifyKitchenIntro: "I'm sorry you're having trouble in the kitchen.",
    generalClarifyGenericIntro: "I'm sorry you're having trouble with this.",
    generalClarifyApplianceDetail: "If you can, also tell me what the appliance is doing or whether an error code is shown.",
    generalClarifyGenericDetail: "If you can, also tell me which item or area is affected.",
    generalClarifyApplianceOpt1: "It is not turning on or not working at all.",
    generalClarifyApplianceOpt2: "It is not heating, cooling, or draining properly.",
    generalClarifyApplianceOpt3: "It is leaking, making unusual noise, or smells unusual.",
    generalClarifyApplianceOpt4: "It shows an error code on the display.",
    generalClarifyApplianceOpt5: "There is visible damage or something else is wrong.",
    generalClarifyKitchenOpt1: "An appliance is not working.",
    generalClarifyKitchenOpt2: "There is a leak or water issue.",
    generalClarifyKitchenOpt3: "A sink, tap, or drain is blocked or damaged.",
    generalClarifyKitchenOpt4: "There is an electrical or lighting issue.",
    generalClarifyKitchenOpt5: "Something is broken or damaged.",
    dishwasherClarifyIntro: "I'm sorry you're having trouble with the dishwasher.",
    dishwasherClarifyLead: "To help you faster, which of these fits best?",
    dishwasherOptionNotHeating: "It is not heating or the water stays cold.",
    dishwasherOptionNoWater: "It is not taking in water.",
    dishwasherOptionNotDraining: "It is not draining.",
    dishwasherOptionLeakPump: "It is leaking, keeps pumping, or there may be water in the base tray.",
    dishwasherOptionCode: "It shows an error code on the display.",
    dishwasherDetailPrompt: "If you can, also tell me the error code or what the dishwasher is doing.",
    dishwasherCodeAsk: "I can help with that. What error code is shown on the display?",
    dishwasherCodeListIntro: "Common architecto dishwasher codes include:",
    dishwasherCodeOutro: "Please tell me the code, and I can give you the right troubleshooting steps and claim wording.",
    generalLeakIntro: "This sounds like a leak around {subject}.",
    generalLeakStep1: "If safe, stop using the affected sink or fitting for now.",
    generalLeakStep2: "Check whether the water is coming from the pipe, drain, or tap connection.",
    generalLeakStep3: "Wipe up standing water to limit further damage.",
    generalLeakStep4: "Take a photo of the leak or wet area if possible.",
    generalLeakClaim1: "Mention where the leak is and attach a photo if possible.",
    generalLeakDescription:
      "There is water leaking in the affected area. The surface underneath is wet, and the leak may be coming from the pipe, drain, or connection. Please arrange an inspection or repair.",
    generalDrainageIntro: "This sounds like a blockage or drainage problem around {subject}.",
    generalDrainageStep1: "Stop using the sink or drain if water is backing up.",
    generalDrainageStep2: "Check whether the blockage is complete or only draining slowly.",
    generalDrainageStep3: "Remove standing water if it is safe to do so.",
    generalDrainageStep4: "Take a photo if the blockage or overflow is visible.",
    generalDrainageClaim1: "Mention that the sink or drain is blocked or not draining properly, and include a photo if possible.",
    generalDrainageDescription:
      "The sink or drain is blocked or not draining properly. Water may be draining slowly or backing up. Please arrange a check or repair.",
    generalElectricalIntro: "This sounds like an electrical or lighting issue with {subject}.",
    generalElectricalStep1: "If safe, stop using the affected light, switch, or socket for now.",
    generalElectricalStep2: "Check whether only one fitting is affected or the whole area.",
    generalElectricalStep3: "Note any flickering, loss of power, or tripped fuse.",
    generalElectricalStep4: "Take a photo if there is visible damage.",
    generalElectricalClaim1: "Mention the affected area and whether the issue is no power, flickering, or visible damage.",
    generalElectricalDescription:
      "There is an electrical or lighting issue in the affected area. Please check the fitting and advise on the next step or arrange a repair.",
    generalDamageIntro: "This sounds like a damaged or broken item in {subject}.",
    generalDamageStep1: "Take a clear photo of the damaged part.",
    generalDamageStep2: "Note whether the item is still usable or no longer works properly.",
    generalDamageStep3: "Avoid forcing moving parts if they are stuck or loose.",
    generalDamageClaim1: "Mention what is broken or damaged and attach a photo if possible.",
    generalDamageDescription:
      "There is visible damage to the affected item. Please inspect it and advise on the next step or arrange a repair.",
    applianceChoiceIntro: "Which appliance is not working?",
    applianceChoiceDishwasher: "Dishwasher",
    applianceChoiceOven: "Oven",
    applianceChoiceFridge: "Fridge or freezer",
    applianceChoiceWasher: "Washing machine or dryer",
    applianceChoiceHob: "Hob or cooker",
    applianceChoiceHood: "Extractor hood",
    applianceChoiceOther: "Another appliance",
    claimFormTrySteps: "You can try",
    claimFormForForm: "For the claim form",
    claimFormSuggestedDescription: "Suggested problem description",
    claimFormHelpClosing: "I can also give you wording for the claim form if needed.",
    claimFormHelpAction: "Show claim-form help",
    claimFormNextStep: "If the issue continues, you can create a claim.",
    claimFormDamageStepsTitle: "Please name the affected item or area, for example",
    claimFormCopyOutro:
      "You can copy this into the claim form. If anything changes or you see an error code, include that too.",
    unsupportedKnowledge: "I do not have reliable troubleshooting guidance for that exact appliance problem.",
    unsupportedKnowledgeAsk: "Please describe the main symptom, any error code, and add a photo or video if possible.",
    waterInletOutro: "You can copy this into the claim form. If an error code appears, include it too.",
    knowledgeIntroStart: "This sounds like a ",
    knowledgeCodeExplicit: " and matches error code {code} on architecto dishwashers.",
    knowledgeCodeImplicit: ", often linked to error code {code} on architecto dishwashers.",
    dishwasherProblemPhrase: "dishwasher problem",
    dishwasherSuggestFallback:
      "My architecto dishwasher is not working properly. Please check the appliance and advise on the next step.",
    dishwasherSuggestWithIssue:
      "My architecto dishwasher has the following issue: {issue}. Please check the appliance and advise on the next step.",
  },
  de: {
    greetingReply: "Hallo. Ich helfe Ihnen bei der Reklamation.",
    greetingFollowUp: "Schreiben Sie einfach, was nicht funktioniert, oder fragen Sie nach Hilfe bei Formulierung, Fotos oder dem richtigen Küchenbereich.",
    greetingExamples:
      "Zum Beispiel: \"Die Spüle ist undicht\", \"Welche Fotos soll ich anhängen?\" oder \"Welchen Bereich soll ich auswählen?\"",
    unavailable: "Die Reklamationshilfe konnte dazu gerade keine Antwort geben.",
    openingGeneral: "So wird die Reklamation für den Service am schnellsten klarer.",
    openingArea: "Für {label} benötigt der Service meistens zuerst diese Angaben.",
    includeTitle: "Bitte angeben",
    nextTitle: "Sinnvolle nächste Schritte im Formular",
    fallbackQuestion: "Beschreiben Sie bitte, was genau nicht funktioniert, was Sie schon beobachtet haben und welcher Küchenbereich betroffen ist.",
    itemStarted: "Seit wann das Problem besteht und ob es dauerhaft oder nur zeitweise auftritt.",
    itemVisibleDamage: "Was sichtbar beschädigt, locker, undicht, blockiert oder ohne Reaktion ist.",
    itemPhotoSet: "Ein Übersichtsfoto und ein Nahfoto vom betroffenen Bereich.",
    itemErrorCode: "Jede Anzeige, Blinkmeldung oder Fehlernummer, falls ein Elektrogerät betroffen ist.",
    itemNoiseSmell: "Ob ungewohnte Geräusche, Geruch, Hitze oder Vibration auftreten.",
    itemLeak: "Wo Wasser austritt, ob es nur bei Benutzung oder auch im Ruhezustand passiert und wie stark es austritt.",
    itemDishwasher: "Nennen Sie, ob der Geschirrspüler nicht startet, nicht abpumpt, undicht ist oder einen Fehler zeigt.",
    itemWashingMachine: "Nennen Sie, ob die Waschmaschine nicht schleudert, nicht abpumpt, Wasser verliert oder im Programm stoppt.",
    itemOvenHob: "Geben Sie an, ob Backofen oder Kochfeld betroffen sind, welche Zone nicht funktioniert und ob eine Sicherung ausgelöst hat.",
    itemFridge: "Nennen Sie, ob es um Kühlung, Vereisung, Wasser, Geräusche oder die Türdichtung geht.",
    itemHood: "Nennen Sie, ob Lüfter, Absaugleistung, Beleuchtung oder Lautstärke das Problem sind.",
    itemSink: "Beschreiben Sie, ob es um Undichtigkeit, Verstopfung, Geruch oder eine beschädigte Armatur geht.",
    itemCabinet: "Beschreiben Sie, ob Scharnier, Auszug, Frontausrichtung, Kratzer, Riss oder ein fehlender Beschlag betroffen sind.",
    nextMissingContract: "Trage zuerst die Vertragsnummer ein, damit das Team die Küche eindeutig zuordnen kann.",
    nextMissingArea: "Wähle wenn möglich den betroffenen Küchenbereich aus, damit die Reklamation besser zugeordnet wird.",
    nextMissingSerial: "Trage die Seriennummer ein, wenn ein Elektrogerät betroffen ist.",
    nextMissingSerialImage: "Lade nach Möglichkeit ein Foto vom Seriennummernschild hoch.",
    nextMissingAttachments: "Füge mindestens ein Foto hinzu, wenn der Schaden sichtbar oder physisch ist.",
    nextMissingAvailability: "Ergänze eine Erreichbarkeit, falls wahrscheinlich ein Technikertermin nötig ist.",
    nextMissingContact: "Hinterlegen Sie mindestens eine Kontaktmöglichkeit, damit der Service Sie erreichen kann.",
    nextAttachmentReady: "Sie haben bereits Anhänge hinzugefügt. Halten Sie die schriftliche Beschreibung jetzt kurz und präzise.",
    askFollowUp: "Wenn Sie möchten, formuliere ich Ihnen als Nächstes einen passenden Text für die Problembeschreibung.",
    briefPrompt: "Beschreiben Sie bitte kurz, was nicht funktioniert, welcher Küchenbereich betroffen ist und was Sie bereits beobachtet haben.",
    briefPromptWithArea: "Beschreiben Sie bitte kurz, was bei {label} nicht funktioniert und was Sie bereits beobachtet haben.",
    sampleWordingIntro: "Sie können zum Beispiel so schreiben:",
    sampleWordingAreaFallback: "der betroffene Bereich",
    sampleWordingAreaLabel: "Betroffener Bereich",
    sampleWordingFallback:
      "Das Problem besteht seit [Zeitpunkt]. Es tritt [dauerhaft/gelegentlich] auf. Betroffen ist [Bereich]. Sichtbar ist [Beobachtung]. Bitte prüfen Sie den Fall und teilen Sie mir die nächsten Schritte mit.",
    sampleWordingOutro: "Bitte prüfen Sie den Fall und teilen Sie mir die nächsten Schritte mit.",
    knowledgeOpening: "Ich habe passende Hinweise zu architecto-Geschirrspülern für dieses Problem gefunden.",
    knowledgeOpeningArea: "Für {label} habe ich passende Hinweise zu architecto-Geschirrspülern gefunden.",
    knowledgeCodeTitle: "Passende Hinweise",
    knowledgeSymptomsTitle: "Das bedeutet meist",
    knowledgeChecksTitle: "Zuerst prüfen",
    knowledgeCausesTitle: "Mögliche Ursache",
    knowledgeActionsTitle: "Sofortmaßnahmen",
    knowledgeGeneralCode: "Code",
    issueSubject_appliance: "dem Gerät",
    issueSubject_leak: "der Leckage",
    issueSubject_sink_or_drain: "Spüle oder Abfluss",
    issueSubject_electrical_issue: "dem Stromproblem",
    issueSubject_this: "dem Problem",
    issueSubject_sink_area: "dem Spülenbereich",
    issueSubject_blockage: "der Verstopfung",
    issueSubject_lighting: "der Beleuchtung",
    issueSubject_oven: "dem Backofen",
    issueSubject_fridge_or_freezer: "Kühlschrank oder Gefrierschrank",
    issueSubject_washing_machine: "der Waschmaschine",
    issueSubject_dryer: "dem Trockner",
    issueSubject_hob: "dem Kochfeld",
    issueSubject_extractor: "der Dunstabzugshaube",
    issueSubject_kitchen: "der Küche",
    generalClarifyLead: "Damit ich schneller helfen kann: Was passt am besten?",
    generalClarifyApplianceIntro: "Es tut mir leid, dass Sie Probleme mit einem Gerät haben.",
    generalClarifyApplianceIntroWithSubject: "Es tut mir leid, dass Sie Probleme mit {subject} haben.",
    generalClarifyKitchenIntro: "Es tut mir leid, dass es in der Küche ein Problem gibt.",
    generalClarifyGenericIntro: "Es tut mir leid, dass Sie Probleme damit haben.",
    generalClarifyApplianceDetail: "Wenn möglich, beschreiben Sie bitte auch, was das Gerät genau macht oder ob ein Fehlercode angezeigt wird.",
    generalClarifyGenericDetail: "Wenn möglich, nennen Sie bitte auch den betroffenen Gegenstand oder Bereich.",
    generalClarifyApplianceOpt1: "Es schaltet sich nicht ein oder funktioniert gar nicht.",
    generalClarifyApplianceOpt2: "Es heizt, kühlt oder pumpt nicht richtig.",
    generalClarifyApplianceOpt3: "Es ist undicht, macht ungewöhnliche Geräusche oder riecht ungewöhnlich.",
    generalClarifyApplianceOpt4: "Auf dem Display wird ein Fehlercode angezeigt.",
    generalClarifyApplianceOpt5: "Es gibt einen sichtbaren Schaden oder etwas anderes stimmt nicht.",
    generalClarifyKitchenOpt1: "Ein Gerät funktioniert nicht.",
    generalClarifyKitchenOpt2: "Es gibt ein Leck oder ein Wasserproblem.",
    generalClarifyKitchenOpt3: "Spüle, Wasserhahn oder Abfluss ist verstopft oder beschädigt.",
    generalClarifyKitchenOpt4: "Es gibt ein Problem mit Strom oder Beleuchtung.",
    generalClarifyKitchenOpt5: "Etwas ist kaputt oder beschädigt.",
    dishwasherClarifyIntro: "Es tut mir leid, dass Sie Probleme mit der Spülmaschine haben.",
    dishwasherClarifyLead: "Damit ich schneller helfen kann: Was passt am besten?",
    dishwasherOptionNotHeating: "Sie heizt nicht oder das Wasser bleibt kalt.",
    dishwasherOptionNoWater: "Sie zieht kein Wasser.",
    dishwasherOptionNotDraining: "Sie pumpt nicht ab.",
    dishwasherOptionLeakPump: "Sie ist undicht, pumpt dauerhaft oder es befindet sich Wasser in der Bodenwanne.",
    dishwasherOptionCode: "Auf dem Display wird ein Fehlercode angezeigt.",
    dishwasherDetailPrompt: "Wenn möglich, nennen Sie bitte auch den Fehlercode oder beschreiben Sie, was die Spülmaschine genau macht.",
    dishwasherCodeAsk: "Ich helfe Ihnen gerne weiter. Welcher Fehlercode wird auf dem Display angezeigt?",
    dishwasherCodeListIntro: "H\u00e4ufige architecto-Fehlercodes sind:",
    dishwasherCodeOutro: "Bitte nennen Sie mir den Fehlercode, dann gebe ich Ihnen die passenden Schritte und eine Formulierung f\u00fcr das Schadensformular.",
    generalLeakIntro: "Das klingt nach einem Leck oder Wasserproblem.",
    generalLeakStep1: "Wenn Wasser austritt, benutzen Sie den betroffenen Bereich vorerst nicht weiter.",
    generalLeakStep2: "Wischen Sie stehendes Wasser auf, wenn das sicher möglich ist.",
    generalLeakStep3: "Prüfen Sie, wo das Wasser austritt, zum Beispiel unter der Spüle, am Wasserhahn, am Schlauch oder am Gerät.",
    generalLeakStep4: "Machen Sie ein Foto der nassen Stelle oder der undichten Verbindung.",
    generalLeakClaim1: "Geben Sie an, wo das Wasser austritt und ob es dauerhaft tropft oder plötzlich ausgelaufen ist.",
    generalLeakDescription:
      "Es gibt ein Leck oder Wasserproblem im betroffenen Bereich. Wasser tritt aus oder sammelt sich dort. Bitte prüfen Sie die Ursache und veranlassen Sie eine Reparatur.",
    generalDrainageIntro: "Das klingt nach einer Verstopfung oder einem Ablaufproblem.",
    generalDrainageStep1: "Benutzen Sie Spüle oder Ablauf nicht weiter, wenn sich das Wasser zurückstaut.",
    generalDrainageStep2: "Prüfen Sie, ob der Ablauf komplett blockiert ist oder nur langsam abläuft.",
    generalDrainageStep3: "Entfernen Sie stehendes Wasser, wenn das sicher möglich ist.",
    generalDrainageStep4: "Machen Sie ein Foto, falls die Verstopfung oder Überlaufspur sichtbar ist.",
    generalDrainageClaim1: "Geben Sie an, dass Spüle oder Ablauf verstopft sind oder nicht richtig ablaufen, und fügen Sie wenn möglich ein Foto hinzu.",
    generalDrainageDescription:
      "Die Spüle oder der Ablauf ist verstopft oder läuft nicht richtig ab. Das Wasser läuft nur langsam ab oder staut sich zurück. Bitte prüfen Sie den Fall oder veranlassen Sie eine Reparatur.",
    generalElectricalIntro: "Das klingt nach einem Strom- oder Beleuchtungsproblem.",
    generalElectricalStep1: "Wenn es sicher ist, benutzen Sie die betroffene Ausstattung vorerst nicht weiter.",
    generalElectricalStep2: "Prüfen Sie, ob nur ein einzelner Punkt betroffen ist oder der ganze Bereich.",
    generalElectricalStep3: "Notieren Sie Flackern, Stromausfall oder eine ausgelöste Sicherung.",
    generalElectricalStep4: "Machen Sie ein Foto, falls ein sichtbarer Schaden vorhanden ist.",
    generalElectricalClaim1: "Geben Sie an, welcher Bereich betroffen ist und ob kein Strom vorhanden ist, etwas flackert oder ein sichtbarer Schaden vorliegt.",
    generalElectricalDescription:
      "Im betroffenen Bereich liegt ein Strom- oder Beleuchtungsproblem vor. Bitte prüfen Sie die Installation und veranlassen Sie bei Bedarf eine Reparatur.",
    generalDamageIntro: "Es scheint einen sichtbaren Schaden am betroffenen Gegenstand zu geben.",
    generalDamageStep1: "Machen Sie ein gut lesbares Foto der beschädigten Stelle.",
    generalDamageStep2: "Notieren Sie, ob der Gegenstand noch nutzbar ist oder nicht mehr richtig funktioniert.",
    generalDamageStep3: "Versuchen Sie nicht, bewegliche Teile mit Gewalt zu bewegen, wenn sie klemmen oder locker sind.",
    generalDamageClaim1: "Geben Sie an, was beschädigt oder kaputt ist, und fügen Sie wenn möglich ein Foto hinzu.",
    generalDamageDescription:
      "Es liegt ein sichtbarer Schaden am betroffenen Gegenstand vor. Bitte prüfen Sie den Fall und teilen Sie die weiteren Schritte mit oder veranlassen Sie eine Reparatur.",
    applianceChoiceIntro: "Welches Gerät funktioniert nicht?",
    applianceChoiceDishwasher: "Spülmaschine",
    applianceChoiceOven: "Backofen",
    applianceChoiceFridge: "Kühlschrank oder Gefrierschrank",
    applianceChoiceWasher: "Waschmaschine oder Trockner",
    applianceChoiceHob: "Kochfeld oder Herd",
    applianceChoiceHood: "Dunstabzugshaube",
    applianceChoiceOther: "Ein anderes Gerät",
    claimFormTrySteps: "Sie können Folgendes prüfen",
    claimFormForForm: "Für das Schadensformular",
    claimFormSuggestedDescription: "Vorschlag für die Beschreibung",
    claimFormHelpClosing: "Wenn Sie möchten, kann ich Ihnen auch eine passende Formulierung für das Formular geben.",
    claimFormHelpAction: "Formularhilfe anzeigen",
    claimFormNextStep: "Falls das Problem weiterhin besteht, können Sie eine Reklamation erstellen.",
    claimFormDamageStepsTitle: "Bitte nennen Sie den betroffenen Gegenstand oder Bereich, zum Beispiel",
    claimFormCopyOutro:
      "Sie k\u00f6nnen diesen Text in das Formular kopieren. Falls sich etwas \u00e4ndert oder ein Fehlercode angezeigt wird, f\u00fcgen Sie ihn bitte hinzu.",
    waterInletOutro: "Sie k\u00f6nnen diesen Text in das Formular kopieren. Falls ein Fehlercode angezeigt wird, f\u00fcgen Sie ihn bitte hinzu.",
    knowledgeIntroStart: "Das klingt nach einem ",
    knowledgeCodeExplicit: ", passend zu Fehlercode {code} bei architecto-Geschirrsp\u00fclern.",
    knowledgeCodeImplicit: ", h\u00e4ufig verbunden mit Fehlercode {code} bei architecto-Geschirrsp\u00fclern.",
    dishwasherProblemPhrase: "Problem mit dem Geschirrsp\u00fcler",
    dishwasherSuggestFallback:
      "Mein architecto-Geschirrsp\u00fcler funktioniert nicht richtig. Bitte pr\u00fcfen Sie das Ger\u00e4t und teilen Sie mir die n\u00e4chsten Schritte mit.",
    dishwasherSuggestWithIssue:
      "Mein architecto-Geschirrsp\u00fcler hat folgendes Problem: {issue}. Bitte pr\u00fcfen Sie das Ger\u00e4t und teilen Sie mir die n\u00e4chsten Schritte mit.",
  },
  tr: {
    greetingReply: "Merhaba. Şikayet konusunda yardımcı olabilirim.",
    greetingFollowUp: "Ne olduğunu yazın ya da metin, fotoğraf veya doğru mutfak alanı hakkında soru sorun.",
    greetingExamples:
      "Örneğin: \"Eviye sızdırıyor\", \"Hangi fotoğrafları eklemeliyim?\" veya \"Hangi alanı seçmeliyim?\"",
    unavailable: "Şikayet yardımcısı şu anda buna yanıt veremedi.",
    openingGeneral: "Servis ekibi için şikayeti en hızlı şekilde netleştirmenin yolu bu.",
    openingArea: "{label} için servis ekibinin genelde ilk istediği bilgiler bunlardır.",
    includeTitle: "Ekleyin",
    nextTitle: "Formdaki sonraki adımlar",
    fallbackQuestion: "Lütfen neyin çalışmadığını, ne gözlemlediğinizi ve hangi mutfak bölümünün etkilendiğini yazın.",
    itemStarted: "Sorunun ne zaman başladığı ve sürekli mi yoksa aralıklı mı olduğu.",
    itemVisibleDamage: "Gözle görülür hasar, gevşeklik, sızıntı, tıkanıklık veya tepki vermeme durumu.",
    itemPhotoSet: "Etkilenen alanın bir genel fotoğrafı ve bir yakın plan fotoğrafı.",
    itemErrorCode: "Bir cihaz söz konusuysa ekrandaki mesaj, yanıp sönme veya hata kodu.",
    itemNoiseSmell: "Olağandışı ses, koku, ısı veya titreşim olup olmadığı.",
    itemLeak: "Suyun nerede göründüğü, sadece kullanım sırasında mı yoksa beklerken de mi olduğu ve ne kadar su olduğu.",
    itemDishwasher: "Bulaşık makinesinin başlamadığını, su boşaltmadığını, sızdırdığını veya hata verdiğini belirtin.",
    itemWashingMachine: "Çamaşır makinesinin sıkmadığını, boşaltmadığını, su sızdırdığını veya program sırasında durduğunu belirtin.",
    itemOvenHob: "Fırın mı ocak mı etkilendi, hangi bölge çalışmıyor ve sigorta atmış mı belirtin.",
    itemFridge: "Sorunun soğutma, buzlanma, su, ses veya kapı contası ile ilgili olup olmadığını belirtin.",
    itemHood: "Sorunun fan, çekiş gücü, aydınlatma veya ses seviyesi ile ilgili olup olmadığını belirtin.",
    itemSink: "Sorunun sızıntı, tıkanıklık, kötü koku veya hasarlı armatür olup olmadığını açıklayın.",
    itemCabinet: "Sorunun menteşe, ray, kapak hizası, çizik, çatlak veya eksik bağlantı elemanı olup olmadığını açıklayın.",
    nextMissingContract: "Ekibin mutfak kurulumunu tanıyabilmesi için önce sözleşme numarasını ekleyin.",
    nextMissingArea: "Mümkünse doğru yönlendirme için etkilenen mutfak alanını seçin.",
    nextMissingSerial: "Elektrikli cihaz varsa seri numarasını ekleyin.",
    nextMissingSerialImage: "Mümkünse seri numarası etiketinin fotoğrafını yükleyin.",
    nextMissingAttachments: "Sorun görünür ya da fiziksel ise en az bir fotoğraf ekleyin.",
    nextMissingAvailability: "Teknisyen ziyareti gerekebileceği için uygunluk bilgisi ekleyin.",
    nextMissingContact: "Ekibin size ulaşabilmesi için en az bir iletişim bilgisi bırakın.",
    nextAttachmentReady: "Zaten ek dosya eklediniz, yazılı açıklamayı kısa ve net tutun.",
    askFollowUp: "İsterseniz bir sonraki adımda son problem açıklaması için örnek metin hazırlayabilirim.",
    briefPrompt: "Lütfen neyin bozuk olduğunu, hangi mutfak bölümünün etkilendiğini ve neleri fark ettiğinizi kısaca yazın.",
    briefPromptWithArea: "Lütfen {label} ile ilgili sorunu ve neleri fark ettiğinizi kısaca yazın.",
    sampleWordingIntro: "Şu ifadeyi kullanabilirsiniz:",
    sampleWordingAreaFallback: "etkilenen alan",
    sampleWordingAreaLabel: "Etkilenen alan",
    sampleWordingFallback:
      "Sorun [zaman] tarihinde başladı. [Sürekli/aralıklı] olarak görülüyor. Etkilenen alan [alan]. Gördüğüm durum [gözlem]. Lütfen kontrol edip sonraki adımı paylaşın.",
    sampleWordingOutro: "Lütfen kontrol edip sonraki adımı paylaşın.",
    knowledgeOpening: "Bu sorun için Amica bulaşık makinesiyle ilgili uygun sorun giderme bilgisi buldum.",
    knowledgeOpeningArea: "{label} için Amica bulaşık makinesiyle ilgili uygun sorun giderme bilgisi buldum.",
    knowledgeCodeTitle: "Eşleşen bilgi",
    knowledgeSymptomsTitle: "Genelde anlamı",
    knowledgeChecksTitle: "Önce kontrol edin",
    knowledgeCausesTitle: "Olası neden",
    knowledgeActionsTitle: "Hemen yapılacaklar",
    knowledgeGeneralCode: "Kod",
    issueSubject_appliance: "cihaz",
    issueSubject_leak: "sızıntı",
    issueSubject_sink_or_drain: "eviye veya gider",
    issueSubject_electrical_issue: "elektrik sorunu",
    issueSubject_this: "bu durum",
    issueSubject_sink_area: "eviye bölgesi",
    issueSubject_blockage: "tıkanıklık",
    issueSubject_lighting: "aydınlatma",
    issueSubject_oven: "fırın",
    issueSubject_fridge_or_freezer: "buzdolabı veya dondurucu",
    issueSubject_washing_machine: "çamaşır makinesi",
    issueSubject_dryer: "kurutma makinesi",
    issueSubject_hob: "ocak",
    issueSubject_extractor: "aspiratör",
    issueSubject_kitchen: "mutfak",
    generalClarifyLead: "Size daha hızlı yardımcı olabilmem için hangisi en uygun?",
    generalClarifyApplianceIntro: "",
    generalClarifyApplianceIntroWithSubject: "{subject} ile ilgili sorun yaşadığınız için üzgünüm.",
    generalClarifyKitchenIntro: "Mutfağınızda bir sorun olduğu için üzgünüm.",
    generalClarifyGenericIntro: "Bu konuda sorun yaşadığınız için üzgünüm.",
    generalClarifyApplianceDetail: "Mümkünse cihazın ne yaptığını veya bir hata kodu görünüp görünmediğini de yazın.",
    generalClarifyGenericDetail: "Mümkünse hangi eşya veya alanın etkilendiğini de belirtin.",
    generalClarifyApplianceOpt1: "Hiç açılmıyor veya hiç çalışmıyor.",
    generalClarifyApplianceOpt2: "Isıtmıyor, soğutmuyor veya suyu düzgün boşaltmıyor.",
    generalClarifyApplianceOpt3: "Sızdırıyor, olağandışı ses çıkarıyor veya olağandışı koku var.",
    generalClarifyApplianceOpt4: "Ekranda bir hata kodu görünüyor.",
    generalClarifyApplianceOpt5: "Görünür hasar var veya başka bir sorun var.",
    generalClarifyKitchenOpt1: "Bir cihaz çalışmıyor.",
    generalClarifyKitchenOpt2: "Sızıntı veya su sorunu var.",
    generalClarifyKitchenOpt3: "Eviye, musluk veya gider tıkalı veya hasarlı.",
    generalClarifyKitchenOpt4: "Elektrik veya aydınlatma sorunu var.",
    generalClarifyKitchenOpt5: "Bir şey kırık veya hasarlı.",
    dishwasherClarifyIntro: "Bulaşık makinesiyle ilgili sorun yaşadığınız için üzgünüm.",
    dishwasherClarifyLead: "Size daha hızlı yardımcı olabilmem için hangisi en uygun?",
    dishwasherOptionNotHeating: "Isıtmıyor veya su soğuk kalıyor.",
    dishwasherOptionNoWater: "Su almıyor.",
    dishwasherOptionNotDraining: "Su boşaltmıyor.",
    dishwasherOptionLeakPump: "Sızdırıyor, sürekli pompalıyor veya tabanda su olabilir.",
    dishwasherOptionCode: "Ekranda bir hata kodu görünüyor.",
    dishwasherDetailPrompt: "Mümkünse hata kodunu veya makinenin ne yaptığını yazın.",
    dishwasherCodeAsk: "Yardımcı olabilirim. Ekranda hangi hata kodu görünüyor?",
    dishwasherCodeListIntro: "Yaygın architecto bulaşık makinesi kodları:",
    dishwasherCodeOutro: "Lütfen kodu yazın; doğru adımları ve form için metni paylaşayım.",
    generalLeakIntro: "{subject} çevresinde sızıntı gibi duruyor.",
    generalLeakStep1: "Emniyetliyse, etkilenen eviye veya bağlantıyı şimdilik kullanmayın.",
    generalLeakStep2: "Suyun boru, gider veya musluk bağlantısından gelip gelmediğini kontrol edin.",
    generalLeakStep3: "Daha fazla hasarı önlemek için birikmiş suyu silin.",
    generalLeakStep4: "Mümkünse sızıntının veya ıslak alanın fotoğrafını çekin.",
    generalLeakClaim1: "Sızıntının nerede olduğunu belirtin ve mümkünse foto ekleyin.",
    generalLeakDescription:
      "Etkilenen alanda su sızıntısı var. Yüzey ıslak; sızıntı boru, gider veya bağlantıdan olabilir. Lütfen kontrol veya onarım ayarlayın.",
    generalDrainageIntro: "{subject} çevresinde tıkanıklık veya gider sorunu gibi duruyor.",
    generalDrainageStep1: "Su geri geliyorsa eviye veya gideri kullanmayın.",
    generalDrainageStep2: "Tıkanıklığın tam mı yoksa yavaş akıyor mu olduğunu kontrol edin.",
    generalDrainageStep3: "Güvenliyse birikmiş suyu alın.",
    generalDrainageStep4: "Taşma veya tıkanıklık görünüyorsa fotoğraf çekin.",
    generalDrainageClaim1: "Eviye veya giderin tıkalı veya düzgün boşalmadığını belirtin; mümkünse foto ekleyin.",
    generalDrainageDescription:
      "Eviye veya gider tıkalı veya düzgün boşalmıyor. Su yavaş akıyor veya geri geliyor. Lütfen kontrol veya onarım ayarlayın.",
    generalElectricalIntro: "{subject} ile ilgili elektrik veya aydınlatma sorunu gibi duruyor.",
    generalElectricalStep1: "Güvenliyse, etkilenen lamba, anahtar veya prizi şimdilik kullanmayın.",
    generalElectricalStep2: "Sadece bir nokta mı yoksa tüm alan mı etkilendi kontrol edin.",
    generalElectricalStep3: "Titreme, enerji kesintisi veya atan sigorta not edin.",
    generalElectricalStep4: "Görünür hasar varsa fotoğraf çekin.",
    generalElectricalClaim1: "Etkilenen alanı ve sorunun enerji yokluğu, titreme veya görünür hasar olup olmadığını belirtin.",
    generalElectricalDescription:
      "Etkilenen alanda elektrik veya aydınlatma sorunu var. Lütfen bağlantıyı kontrol edin veya onarım ayarlayın.",
    generalDamageIntro: "{subject} içinde kırık veya hasarlı bir eşya gibi duruyor.",
    generalDamageStep1: "Hasarlı kısmın net bir fotoğrafını çekin.",
    generalDamageStep2: "Eşya hâlâ kullanılabilir mi yoksa düzgün çalışmıyor mu not edin.",
    generalDamageStep3: "Sıkışan veya gevşek parçalara zorlamayın.",
    generalDamageClaim1: "Neyin kırık veya hasarlı olduğunu belirtin; mümkünse foto ekleyin.",
    generalDamageDescription:
      "Etkilenen eşyada görünür hasar var. Lütfen inceleyin ve sonraki adımı bildirin veya onarım ayarlayın.",
    applianceChoiceIntro: "Hangi cihaz çalışmıyor?",
    applianceChoiceDishwasher: "Bulaşık makinesi",
    applianceChoiceOven: "Fırın",
    applianceChoiceFridge: "Buzdolabı veya dondurucu",
    applianceChoiceWasher: "Çamaşır veya kurutma makinesi",
    applianceChoiceHob: "Ocak veya fırın üstü",
    applianceChoiceHood: "Davlumbaz",
    applianceChoiceOther: "Başka bir cihaz",
    claimFormTrySteps: "Şunları deneyebilirsiniz",
    claimFormForForm: "Form için",
    claimFormSuggestedDescription: "Önerilen problem açıklaması",
    claimFormHelpClosing: "İsterseniz form için uygun metin de önerebilirim.",
    claimFormHelpAction: "Form yardımını göster",
    claimFormNextStep: "Sorun sürerse bir şikayet oluşturabilirsiniz.",
    claimFormDamageStepsTitle: "Lütfen etkilenen eşya veya alanı örneğin şöyle adlandırın",
    claimFormCopyOutro:
      "Metni forma kopyalayabilirsiniz. Durum değişirse veya bir hata kodunda görürseniz bunu da ekleyin.",
    waterInletOutro: "Metni forma kopyalayabilirsiniz. Bir hata kodu görünüyorsa ekleyin.",
    knowledgeIntroStart: "Bu şuna benziyor: ",
    knowledgeCodeExplicit: " ve architecto bulaşık makinelerinde {code} hata koduyla eşleşiyor.",
    knowledgeCodeImplicit: ", architecto bulaşık makinelerinde sıklıkla {code} hata koduyla ilişkilendirilir.",
    dishwasherProblemPhrase: "bulaşık makinesi sorunu",
    dishwasherSuggestFallback:
      "architecto bulaşık makinem düzgün çalışmıyor. Lütfen cihazı kontrol edin ve sonraki adımı bildirin.",
    dishwasherSuggestWithIssue:
      "architecto bulaşık makinemde şu sorun var: {issue}. Lütfen cihazı kontrol edin ve sonraki adımı bildirin.",
  },
  es: {
    greetingReply: "Hola. Puedo ayudarte con la reclamación.",
    greetingFollowUp: "Cuéntame qué ocurre o pregunta por el texto, las fotos o la zona correcta de la cocina.",
    greetingExamples:
      "Por ejemplo: \"El fregadero pierde agua\", \"¿Qué fotos debo adjuntar?\" o \"¿Qué zona debo seleccionar?\"",
    unavailable: "La ayuda de reclamaciones no pudo responder a eso ahora mismo.",
    openingGeneral: "Esta es la forma más rápida de aclarar la reclamación para el servicio técnico.",
    openingArea: "Para {label}, esto es lo que el servicio técnico suele necesitar primero.",
    includeTitle: "Incluye",
    nextTitle: "Siguientes pasos sugeridos en el formulario",
    fallbackQuestion: "Indica qué no funciona, qué has observado y qué parte de la cocina está afectada.",
    itemStarted: "Cuándo empezó el problema y si es constante o intermitente.",
    itemVisibleDamage: "Qué está visiblemente dañado, suelto, con fugas, bloqueado o sin reacción.",
    itemPhotoSet: "Una foto general y una foto de detalle de la zona afectada.",
    itemErrorCode: "Cualquier mensaje en pantalla, luz intermitente o código de error si hay un aparato implicado.",
    itemNoiseSmell: "Si hay ruido, olor, calor o vibración inusuales.",
    itemLeak: "Dónde aparece el agua, si ocurre solo durante el uso o también en reposo y cuánta agua hay.",
    itemDishwasher: "Indica si el lavavajillas no arranca, no desagua, pierde agua o muestra un error.",
    itemWashingMachine: "Indica si la lavadora no centrifuga, no desagua, pierde agua o se detiene durante el programa.",
    itemOvenHob: "Indica si está afectado el horno o la placa, qué zona falla y si saltó algún fusible.",
    itemFridge: "Indica si el problema es de refrigeración, hielo, agua, ruido o junta de la puerta.",
    itemHood: "Indica si el problema es el ventilador, la extracción, la iluminación o el nivel de ruido.",
    itemSink: "Describe si el problema es una fuga, un atasco, mal olor o un grifo dañado.",
    itemCabinet: "Describe si el problema afecta a una bisagra, guía, alineación del frente, arañazo, grieta o herraje faltante.",
    nextMissingContract: "Añade primero el número de contrato para que el equipo pueda identificar la cocina.",
    nextMissingArea: "Si es posible, selecciona la zona afectada de la cocina para facilitar la gestión.",
    nextMissingSerial: "Añade el número de serie si hay un aparato eléctrico implicado.",
    nextMissingSerialImage: "Sube una foto de la placa del número de serie si la tienes.",
    nextMissingAttachments: "Adjunta al menos una foto si el problema es visible o físico.",
    nextMissingAvailability: "Añade disponibilidad por si se necesita una visita técnica.",
    nextMissingContact: "Deja al menos una forma de contacto para que el equipo pueda localizarte.",
    nextAttachmentReady: "Ya has añadido archivos, así que mantén la descripción escrita breve y precisa.",
    askFollowUp: "Si quieres, después puedo redactarte un texto modelo para la descripción final del problema.",
    briefPrompt: "Indica brevemente qué falla, qué zona de la cocina está afectada y qué has observado.",
    briefPromptWithArea: "Indica brevemente qué falla en {label} y qué has observado.",
    sampleWordingIntro: "Puedes usar este texto:",
    sampleWordingAreaFallback: "la zona afectada",
    sampleWordingAreaLabel: "Zona afectada",
    sampleWordingFallback:
      "El problema empezó [cuándo]. Es [constante/intermitente]. La zona afectada es [area]. He observado [incidencia visible]. Por favor, revisen el caso e indíquenme el siguiente paso.",
    sampleWordingOutro: "Por favor, revisen el caso e indíquenme el siguiente paso.",
    knowledgeOpening: "He encontrado información de solución de problemas de lavavajillas Amica que coincide con este caso.",
    knowledgeOpeningArea: "Para {label}, he encontrado información de solución de problemas de lavavajillas Amica.",
    knowledgeCodeTitle: "Guía coincidente",
    knowledgeSymptomsTitle: "Normalmente significa",
    knowledgeChecksTitle: "Comprueba primero",
    knowledgeCausesTitle: "Posible causa",
    knowledgeActionsTitle: "Medidas inmediatas",
    knowledgeGeneralCode: "Código",
    issueSubject_appliance: "el electrodoméstico",
    issueSubject_leak: "la fuga",
    issueSubject_sink_or_drain: "el fregadero o el desagüe",
    issueSubject_electrical_issue: "el problema eléctrico",
    issueSubject_this: "esto",
    issueSubject_sink_area: "la zona del fregadero",
    issueSubject_blockage: "la obstrucción",
    issueSubject_lighting: "la iluminación",
    issueSubject_oven: "el horno",
    issueSubject_fridge_or_freezer: "el frigorífico o congelador",
    issueSubject_washing_machine: "la lavadora",
    issueSubject_dryer: "la secadora",
    issueSubject_hob: "la placa",
    issueSubject_extractor: "la campana",
    issueSubject_kitchen: "la cocina",
    generalClarifyLead: "Para ayudarte más rápido, ¿cuál encaja mejor?",
    generalClarifyApplianceIntro: "",
    generalClarifyApplianceIntroWithSubject: "Lamento que tengas problemas con {subject}.",
    generalClarifyKitchenIntro: "Lamento que haya un problema en la cocina.",
    generalClarifyGenericIntro: "Lamento que tengas este problema.",
    generalClarifyApplianceDetail: "Si puedes, indica también qué hace el aparato o si aparece un código de error.",
    generalClarifyGenericDetail: "Si puedes, indica también qué elemento o zona está afectada.",
    generalClarifyApplianceOpt1: "No enciende o no funciona en absoluto.",
    generalClarifyApplianceOpt2: "No calienta, enfría o desagua bien.",
    generalClarifyApplianceOpt3: "Tiene fugas, hace ruido raro o huele raro.",
    generalClarifyApplianceOpt4: "Muestra un código de error en la pantalla.",
    generalClarifyApplianceOpt5: "Hay daño visible u otra incidencia.",
    generalClarifyKitchenOpt1: "Un electrodoméstico no funciona.",
    generalClarifyKitchenOpt2: "Hay una fuga o problema de agua.",
    generalClarifyKitchenOpt3: "El fregadero, grifo o desagüe está atascado o dañado.",
    generalClarifyKitchenOpt4: "Hay un problema eléctrico o de iluminación.",
    generalClarifyKitchenOpt5: "Algo está roto o dañado.",
    dishwasherClarifyIntro: "Lamento que tengas problemas con el lavavajillas.",
    dishwasherClarifyLead: "Para ayudarte más rápido, ¿cuál encaja mejor?",
    dishwasherOptionNotHeating: "No calienta o el agua sigue fría.",
    dishwasherOptionNoWater: "No entra agua.",
    dishwasherOptionNotDraining: "No desagua.",
    dishwasherOptionLeakPump: "Pierde agua, bombea sin parar o puede haber agua en la bandeja inferior.",
    dishwasherOptionCode: "Muestra un código de error en la pantalla.",
    dishwasherDetailPrompt: "Si puedes, indica el código de error o qué hace el lavavajillas.",
    dishwasherCodeAsk: "Puedo ayudarte. ¿Qué código de error aparece en la pantalla?",
    dishwasherCodeListIntro: "Códigos habituales de lavavajillas architecto:",
    dishwasherCodeOutro: "Indica el código y te daré los pasos adecuados y un texto para el formulario.",
    generalLeakIntro: "Parece una fuga cerca de {subject}.",
    generalLeakStep1: "Si es seguro, deja de usar el fregadero o la zona afectada por ahora.",
    generalLeakStep2: "Comprueba si el agua viene de la tubería, el desagüe o la conexión del grifo.",
    generalLeakStep3: "Seca el agua acumulada para limitar daños.",
    generalLeakStep4: "Haz una foto de la fuga o zona húmeda si puedes.",
    generalLeakClaim1: "Indica dónde está la fuga y adjunta una foto si puedes.",
    generalLeakDescription:
      "Hay una fuga de agua en la zona afectada. La superficie está húmeda; la fuga puede venir de tubería, desagüe o conexión. Solicita una revisión o reparación.",
    generalDrainageIntro: "Parece una obstrucción o problema de desagüe cerca de {subject}.",
    generalDrainageStep1: "Si el agua retrocede, no uses el fregadero o desagüe.",
    generalDrainageStep2: "Comprueba si está totalmente bloqueado o solo desagua despacio.",
    generalDrainageStep3: "Retira el agua estancada si es seguro.",
    generalDrainageStep4: "Haz una foto si se ve la obstrucción o desbordamiento.",
    generalDrainageClaim1: "Indica que el fregadero o desagüe está bloqueado o no desagua bien; incluye foto si puedes.",
    generalDrainageDescription:
      "El fregadero o desagüe está bloqueado o no desagua bien. El agua puede ir despacio o retroceder. Solicita una revisión o reparación.",
    generalElectricalIntro: "Parece un problema eléctrico o de iluminación con {subject}.",
    generalElectricalStep1: "Si es seguro, no uses la luz, interruptor o enchufe afectado por ahora.",
    generalElectricalStep2: "Comprueba si solo un punto está afectado o toda la zona.",
    generalElectricalStep3: "Anota parpadeos, falta de suministro o fusible disparado.",
    generalElectricalStep4: "Haz una foto si hay daño visible.",
    generalElectricalClaim1: "Indica la zona afectada y si no hay luz, hay parpadeos o daño visible.",
    generalElectricalDescription:
      "Hay un problema eléctrico o de iluminación en la zona afectada. Revisa la instalación o solicita una reparación.",
    generalDamageIntro: "Parece un objeto dañado o roto en {subject}.",
    generalDamageStep1: "Haz una foto clara de la parte dañada.",
    generalDamageStep2: "Anota si el objeto sigue siendo usable o ya no funciona bien.",
    generalDamageStep3: "No fuerces piezas móviles si están atascadas o sueltas.",
    generalDamageClaim1: "Indica qué está roto o dañado y adjunta foto si puedes.",
    generalDamageDescription:
      "Hay daño visible en el objeto afectado. Solicita una inspección o reparación.",
    applianceChoiceIntro: "¿Qué electrodoméstico no funciona?",
    applianceChoiceDishwasher: "Lavavajillas",
    applianceChoiceOven: "Horno",
    applianceChoiceFridge: "Frigorífico o congelador",
    applianceChoiceWasher: "Lavadora o secadora",
    applianceChoiceHob: "Placa o cocina",
    applianceChoiceHood: "Campana extractora",
    applianceChoiceOther: "Otro electrodoméstico",
    claimFormTrySteps: "Puedes probar",
    claimFormForForm: "Para el formulario",
    claimFormSuggestedDescription: "Descripción del problema sugerida",
    claimFormHelpClosing: "Si quieres, también te propongo texto para el formulario.",
    claimFormHelpAction: "Mostrar ayuda del formulario",
    claimFormNextStep: "Si el problema continúa, puedes crear una reclamación.",
    claimFormDamageStepsTitle: "Indica el elemento o zona afectada, por ejemplo",
    claimFormCopyOutro:
      "Puedes copiar esto en el formulario. Si algo cambia o ves un código de error, inclúyelo también.",
    waterInletOutro: "Copia este texto en el formulario. Si aparece un código de error, inclúyelo también.",
    knowledgeIntroStart: "Esto parece ",
    knowledgeCodeExplicit: " y coincide con el código de error {code} en lavavajillas architecto.",
    knowledgeCodeImplicit: ", a menudo relacionado con el código de error {code} en lavavajillas architecto.",
    dishwasherProblemPhrase: "problema de lavavajillas",
    dishwasherSuggestFallback:
      "Mi lavavajillas architecto no funciona bien. Por favor, revisen el aparato e indiquen el siguiente paso.",
    dishwasherSuggestWithIssue:
      "Mi lavavajillas architecto tiene este problema: {issue}. Por favor, revisen el aparato e indiquen el siguiente paso.",
  },
  fr: {
    greetingReply: "Bonjour. Je peux vous aider avec la réclamation.",
    greetingFollowUp: "Dites-moi ce qui ne fonctionne pas ou posez une question sur le texte, les photos ou la bonne zone de la cuisine.",
    greetingExamples:
      "Par exemple : \"L'évier fuit\", \"Quelles photos dois-je joindre ?\" ou \"Quelle zone dois-je sélectionner ?\"",
    unavailable: "L'assistant réclamation ne peut pas répondre à cela pour le moment.",
    openingGeneral: "Voici la façon la plus rapide de clarifier la réclamation pour le service.",
    openingArea: "Pour {label}, voici ce dont le service a généralement besoin en premier.",
    includeTitle: "À indiquer",
    nextTitle: "Étapes suivantes conseillées dans le formulaire",
    fallbackQuestion: "Indiquez ce qui ne fonctionne pas, ce que vous avez déjà observé et quelle partie de la cuisine est concernée.",
    itemStarted: "Depuis quand le problème existe et s'il est permanent ou intermittent.",
    itemVisibleDamage: "Ce qui est visiblement endommagé, desserré, en fuite, bloqué ou sans réaction.",
    itemPhotoSet: "Une photo d'ensemble et une photo rapprochée de la zone concernée.",
    itemErrorCode: "Tout message à l'écran, voyant clignotant ou code erreur si un appareil est concerné.",
    itemNoiseSmell: "S'il y a un bruit, une odeur, une chaleur ou des vibrations inhabituels.",
    itemLeak: "Où l'eau apparaît, si cela arrive seulement pendant l'utilisation ou aussi à l'arrêt, et quelle quantité d'eau est présente.",
    itemDishwasher: "Précisez si le lave-vaisselle ne démarre pas, ne vidange pas, fuit ou affiche une erreur.",
    itemWashingMachine: "Précisez si le lave-linge n'essore pas, ne vidange pas, fuit ou s'arrête pendant le programme.",
    itemOvenHob: "Indiquez si le four ou la plaque est concerné, quelle zone chauffe mal et si un fusible a sauté.",
    itemFridge: "Précisez si le problème concerne le froid, le givre, l'eau, le bruit ou le joint de porte.",
    itemHood: "Précisez si le problème concerne le ventilateur, l'aspiration, l'éclairage ou le niveau sonore.",
    itemSink: "Décrivez s'il s'agit d'une fuite, d'un bouchon, d'une mauvaise odeur ou d'un robinet endommagé.",
    itemCabinet: "Décrivez si le problème concerne une charnière, une coulisse, l'alignement de façade, une rayure, une fissure ou une ferrure manquante.",
    nextMissingContract: "Ajoutez d'abord le numéro de contrat pour que l'équipe puisse identifier la cuisine.",
    nextMissingArea: "Sélectionnez si possible la zone de cuisine concernée pour faciliter l'orientation du dossier.",
    nextMissingSerial: "Ajoutez le numéro de série si un appareil électrique est concerné.",
    nextMissingSerialImage: "Téléchargez si possible une photo de l'étiquette du numéro de série.",
    nextMissingAttachments: "Ajoutez au moins une photo si le problème est visible ou matériel.",
    nextMissingAvailability: "Ajoutez vos disponibilités si une visite technique peut être nécessaire.",
    nextMissingContact: "Laissez au moins un moyen de contact pour que l'équipe puisse vous joindre.",
    nextAttachmentReady: "Vous avez déjà ajouté des pièces jointes, gardez maintenant la description écrite courte et précise.",
    askFollowUp: "Si vous voulez, je peux ensuite rédiger un texte type pour la description finale du problème.",
    briefPrompt: "Indiquez brièvement ce qui ne fonctionne pas, quelle zone de la cuisine est concernée et ce que vous avez observé.",
    briefPromptWithArea: "Indiquez brièvement ce qui ne fonctionne pas sur {label} et ce que vous avez observé.",
    sampleWordingIntro: "Vous pouvez utiliser cette formulation :",
    sampleWordingAreaFallback: "la zone concernée",
    sampleWordingAreaLabel: "Zone concernée",
    sampleWordingFallback:
      "Le problème a commencé [quand]. Il est [constant/intermittent]. La zone concernée est [area]. J'ai constaté [observation visible]. Merci de vérifier le dossier et de m'indiquer la suite.",
    sampleWordingOutro: "Merci de vérifier le dossier et de m'indiquer la suite.",
    knowledgeOpening: "J'ai trouvé des informations de dépannage Amica pour lave-vaisselle qui correspondent à ce problème.",
    knowledgeOpeningArea: "Pour {label}, j'ai trouvé des informations de dépannage Amica pour lave-vaisselle.",
    knowledgeCodeTitle: "Guide correspondant",
    knowledgeSymptomsTitle: "Cela signifie généralement",
    knowledgeChecksTitle: "À vérifier d'abord",
    knowledgeCausesTitle: "Cause possible",
    knowledgeActionsTitle: "Mesures immédiates",
    knowledgeGeneralCode: "Code",
    issueSubject_appliance: "l'appareil",
    issueSubject_leak: "la fuite",
    issueSubject_sink_or_drain: "l'évier ou l'évacuation",
    issueSubject_electrical_issue: "le problème électrique",
    issueSubject_this: "ce problème",
    issueSubject_sink_area: "la zone de l'évier",
    issueSubject_blockage: "l'obstruction",
    issueSubject_lighting: "l'éclairage",
    issueSubject_oven: "le four",
    issueSubject_fridge_or_freezer: "le réfrigérateur ou congélateur",
    issueSubject_washing_machine: "le lave-linge",
    issueSubject_dryer: "le sèche-linge",
    issueSubject_hob: "la plaque de cuisson",
    issueSubject_extractor: "la hotte",
    issueSubject_kitchen: "la cuisine",
    generalClarifyLead: "Pour aller plus vite, laquelle de ces options correspond le mieux ?",
    generalClarifyApplianceIntro: "",
    generalClarifyApplianceIntroWithSubject: "Je suis désolé que vous ayez un problème avec {subject}.",
    generalClarifyKitchenIntro: "Je suis désolé qu'il y ait un problème dans la cuisine.",
    generalClarifyGenericIntro: "Je suis désolé que vous rencontriez ce problème.",
    generalClarifyApplianceDetail: "Si possible, précisez ce que fait l'appareil ou si un code erreur s'affiche.",
    generalClarifyGenericDetail: "Si possible, indiquez aussi l'objet ou la zone concerné(e).",
    generalClarifyApplianceOpt1: "Il ne s'allume pas ou ne fonctionne pas du tout.",
    generalClarifyApplianceOpt2: "Il ne chauffe pas, ne refroidit pas ou ne vidange pas correctement.",
    generalClarifyApplianceOpt3: "Il fuit, fait un bruit inhabituel ou sent mauvais.",
    generalClarifyApplianceOpt4: "Un code erreur s'affiche.",
    generalClarifyApplianceOpt5: "Il y a des dommages visibles ou autre chose ne va pas.",
    generalClarifyKitchenOpt1: "Un appareil ne fonctionne pas.",
    generalClarifyKitchenOpt2: "Il y a une fuite ou un problème d'eau.",
    generalClarifyKitchenOpt3: "Évier, robinet ou évacuation bouché(s) ou endommagé(s).",
    generalClarifyKitchenOpt4: "Il y a un problème d'électricité ou d'éclairage.",
    generalClarifyKitchenOpt5: "Quelque chose est cassé ou endommagé.",
    dishwasherClarifyIntro: "Je suis désolé que vous ayez un problème avec le lave-vaisselle.",
    dishwasherClarifyLead: "Pour aller plus vite, laquelle de ces options correspond le mieux ?",
    dishwasherOptionNotHeating: "Il ne chauffe pas ou l'eau reste froide.",
    dishwasherOptionNoWater: "Il n'arrive pas à prendre l'eau.",
    dishwasherOptionNotDraining: "Il ne vidange pas.",
    dishwasherOptionLeakPump: "Il fuit, pompe en continu ou il peut y avoir de l'eau dans le bac inférieur.",
    dishwasherOptionCode: "Un code erreur s'affiche.",
    dishwasherDetailPrompt: "Si possible, indiquez le code erreur ou ce que fait le lave-vaisselle.",
    dishwasherCodeAsk: "Je peux vous aider. Quel code erreur s'affiche ?",
    dishwasherCodeListIntro: "Codes fréquents des lave-vaisselle architecto :",
    dishwasherCodeOutro: "Indiquez le code et je vous donnerai les bonnes étapes et une formulation pour le formulaire.",
    generalLeakIntro: "Cela ressemble à une fuite près de {subject}.",
    generalLeakStep1: "Si c'est sûr, évitez d'utiliser l'évier ou le raccord concerné pour l'instant.",
    generalLeakStep2: "Vérifiez si l'eau vient de la canalisation, de l'évacuation ou du raccord du robinet.",
    generalLeakStep3: "Épongez l'eau stagnante pour limiter les dégâts.",
    generalLeakStep4: "Prenez une photo de la fuite ou de la zone humide si possible.",
    generalLeakClaim1: "Indiquez où se trouve la fuite et joignez une photo si possible.",
    generalLeakDescription:
      "Il y a une fuite d'eau dans la zone concernée. La surface est humide; l'eau peut venir de la canalisation, de l'évacuation ou du raccord. Veuillez organiser une inspection ou une réparation.",
    generalDrainageIntro: "Cela ressemble à un bouchon ou un problème d'évacuation près de {subject}.",
    generalDrainageStep1: "N'utilisez pas l'évier ou l'évacuation si l'eau remonte.",
    generalDrainageStep2: "Vérifiez si le bouchon est total ou si l'eau s'écoule lentement.",
    generalDrainageStep3: "Retirez l'eau stagnante si c'est sans danger.",
    generalDrainageStep4: "Prenez une photo si le bouchon ou le débordement est visible.",
    generalDrainageClaim1:
      "Indiquez que l'évier ou l'évacuation est bouché ou ne vidange pas correctement, et joignez une photo si possible.",
    generalDrainageDescription:
      "L'évier ou l'évacuation est bouché ou ne vidange pas correctement. L'eau peut s'écouler lentement ou remonter. Veuillez organiser une vérification ou une réparation.",
    generalElectricalIntro: "Cela ressemble à un problème électrique ou d'éclairage avec {subject}.",
    generalElectricalStep1: "Si c'est sans danger, n'utilisez pas pour l'instant la lumière, l'interrupteur ou la prise concerné(e).",
    generalElectricalStep2: "Vérifiez si un seul point ou toute la zone est concerné(e).",
    generalElectricalStep3: "Notez tout scintillement, coupure de courant ou fusible déclenché.",
    generalElectricalStep4: "Prenez une photo en cas de dommage visible.",
    generalElectricalClaim1:
      "Mentionnez la zone concernée et si le problème est une absence de courant, un scintillement ou un dommage visible.",
    generalElectricalDescription:
      "Il y a un problème électrique ou d'éclairage dans la zone concernée. Faites contrôler l'installation ou organisez une réparation.",
    generalDamageIntro: "Cela ressemble à un objet endommagé ou cassé dans {subject}.",
    generalDamageStep1: "Prenez une photo nette de la pièce endommagée.",
    generalDamageStep2: "Notez si l'objet est encore utilisable ou ne fonctionne plus correctement.",
    generalDamageStep3: "N'insistez pas sur les pièces mobiles si elles sont bloquées ou desserrées.",
    generalDamageClaim1: "Indiquez ce qui est cassé ou endommagé et joignez une photo si possible.",
    generalDamageDescription:
      "Il y a un dommage visible sur l'objet concerné. Faites inspecter et indiquez la suite ou organisez une réparation.",
    applianceChoiceIntro: "Quel appareil ne fonctionne pas ?",
    applianceChoiceDishwasher: "Lave-vaisselle",
    applianceChoiceOven: "Four",
    applianceChoiceFridge: "Réfrigérateur ou congélateur",
    applianceChoiceWasher: "Lave-linge ou sèche-linge",
    applianceChoiceHob: "Table de cuisson ou cuisinière",
    applianceChoiceHood: "Hotte aspirante",
    applianceChoiceOther: "Un autre appareil",
    claimFormTrySteps: "Vous pouvez essayer",
    claimFormForForm: "Pour le formulaire",
    claimFormSuggestedDescription: "Description du problème suggérée",
    claimFormHelpClosing: "Si besoin, je peux aussi proposer une formulation pour le formulaire.",
    claimFormHelpAction: "Afficher l'aide pour le formulaire",
    claimFormNextStep: "Si le problème continue, vous pouvez créer une réclamation.",
    claimFormDamageStepsTitle: "Indiquez l'objet ou la zone concerné(e), par exemple",
    claimFormCopyOutro:
      "Vous pouvez copier ceci dans le formulaire. Si quelque chose change ou si un code erreur apparaît, indiquez-le aussi.",
    waterInletOutro: "Vous pouvez copier ce texte dans le formulaire. Si un code erreur apparaît, ajoutez-le aussi.",
    knowledgeIntroStart: "Cela ressemble à ",
    knowledgeCodeExplicit: " et correspond au code erreur {code} sur les lave-vaisselle architecto.",
    knowledgeCodeImplicit: ", souvent lié au code erreur {code} sur les lave-vaisselle architecto.",
    dishwasherProblemPhrase: "problème de lave-vaisselle",
    dishwasherSuggestFallback:
      "Mon lave-vaisselle architecto ne fonctionne pas correctement. Merci de vérifier l'appareil et de m'indiquer la suite.",
    dishwasherSuggestWithIssue:
      "Mon lave-vaisselle architecto présente le problème suivant : {issue}. Merci de vérifier l'appareil et de m'indiquer la suite.",
  },
  ru: {
    greetingReply: "Здравствуйте. Я могу помочь с рекламацией.",
    greetingFollowUp: "Опишите, что не работает, или задайте вопрос по формулировке, фотографиям или нужной зоне кухни.",
    greetingExamples:
      "Например: \"Мойка протекает\", \"Какие фото приложить?\" или \"Какую зону выбрать?\"",
    unavailable: "Помощник по рекламациям сейчас не смог ответить на это.",
    openingGeneral: "Вот самый быстрый способ сделать рекламацию понятнее для сервиса.",
    openingArea: "Для {label} сервису обычно сначала нужна такая информация.",
    includeTitle: "Укажите",
    nextTitle: "Рекомендуемые следующие шаги в форме",
    fallbackQuestion: "Опишите, что именно не работает, что вы уже заметили и какая часть кухни затронута.",
    itemStarted: "Когда началась проблема и постоянная она или периодическая.",
    itemVisibleDamage: "Что именно видно: повреждение, люфт, протечка, засор или отсутствие реакции.",
    itemPhotoSet: "Одно общее фото и одно крупное фото затронутой зоны.",
    itemErrorCode: "Любое сообщение на дисплее, мигание или код ошибки, если затронут электроприбор.",
    itemNoiseSmell: "Есть ли необычный шум, запах, нагрев или вибрация.",
    itemLeak: "Где появляется вода, только во время работы или также в покое, и сколько воды видно.",
    itemDishwasher: "Укажите, что посудомоечная машина не запускается, не сливает воду, протекает или показывает ошибку.",
    itemWashingMachine: "Укажите, что стиральная машина не отжимает, не сливает воду, протекает или останавливается во время программы.",
    itemOvenHob: "Укажите, затронута духовка или варочная панель, какая зона не работает и выбивало ли предохранитель.",
    itemFridge: "Укажите, касается ли проблема охлаждения, наледи, воды, шума или уплотнителя двери.",
    itemHood: "Укажите, касается ли проблема вентилятора, тяги, подсветки или уровня шума.",
    itemSink: "Опишите, это протечка, засор, неприятный запах или поврежденный смеситель.",
    itemCabinet: "Опишите, касается ли проблема петли, направляющей, выравнивания фасада, царапины, трещины или отсутствующей фурнитуры.",
    nextMissingContract: "Сначала добавьте номер договора, чтобы команда могла определить конфигурацию кухни.",
    nextMissingArea: "Если возможно, выберите затронутую зону кухни, чтобы упростить маршрутизацию заявки.",
    nextMissingSerial: "Добавьте серийный номер, если затронут электроприбор.",
    nextMissingSerialImage: "По возможности загрузите фото таблички с серийным номером.",
    nextMissingAttachments: "Добавьте хотя бы одно фото, если проблема видимая или физическая.",
    nextMissingAvailability: "Добавьте время доступности, если может потребоваться визит техника.",
    nextMissingContact: "Оставьте хотя бы один способ связи, чтобы сервис мог с вами связаться.",
    nextAttachmentReady: "Вы уже добавили вложения, поэтому держите письменное описание коротким и точным.",
    askFollowUp: "Если хотите, следующим сообщением я подготовлю пример текста для итогового описания проблемы.",
    briefPrompt: "Кратко опишите, что не работает, какая зона кухни затронута и что вы уже заметили.",
    briefPromptWithArea: "Кратко опишите, что не работает в зоне {label}, и что вы уже заметили.",
    sampleWordingIntro: "Можно использовать такую формулировку:",
    sampleWordingAreaFallback: "затронутая зона",
    sampleWordingAreaLabel: "Затронутая зона",
    sampleWordingFallback:
      "Проблема появилась [когда]. Она [постоянная/периодическая]. Затронута [area]. Я заметил(а) [видимое наблюдение]. Пожалуйста, проверьте случай и сообщите следующий шаг.",
    sampleWordingOutro: "Пожалуйста, проверьте случай и сообщите следующий шаг.",
    knowledgeOpening: "Я нашел подходящую информацию по неисправностям посудомоечных машин Amica для этого случая.",
    knowledgeOpeningArea: "Для {label} я нашел подходящую информацию по неисправностям посудомоечных машин Amica.",
    knowledgeCodeTitle: "Подходящая инструкция",
    knowledgeSymptomsTitle: "Обычно это означает",
    knowledgeChecksTitle: "Сначала проверьте",
    knowledgeCausesTitle: "Возможная причина",
    knowledgeActionsTitle: "Срочные действия",
    knowledgeGeneralCode: "Код",
    issueSubject_appliance: "приборе",
    issueSubject_leak: "протечке",
    issueSubject_sink_or_drain: "мойке или сливе",
    issueSubject_electrical_issue: "проблеме с электрикой",
    issueSubject_this: "этой ситуации",
    issueSubject_sink_area: "зоне мойки",
    issueSubject_blockage: "засоре",
    issueSubject_lighting: "освещении",
    issueSubject_oven: "духовке",
    issueSubject_fridge_or_freezer: "холодильнике или морозильнике",
    issueSubject_washing_machine: "стиральной машине",
    issueSubject_dryer: "сушильной машине",
    issueSubject_hob: "варочной панели",
    issueSubject_extractor: "вытяжке",
    issueSubject_kitchen: "кухне",
    generalClarifyLead: "Чтобы я мог помочь быстрее, что подходит больше всего?",
    generalClarifyApplianceIntro: "",
    generalClarifyApplianceIntroWithSubject: "Сожалею, что у вас проблема с {subject}.",
    generalClarifyKitchenIntro: "Сожалею, что на кухне возникла проблема.",
    generalClarifyGenericIntro: "Сожалею, что у вас эта проблема.",
    generalClarifyApplianceDetail: "Если можете, опишите, что делает прибор, или указан ли код ошибки.",
    generalClarifyGenericDetail: "Если можете, укажите предмет или зону, которые затронуты.",
    generalClarifyApplianceOpt1: "Не включается или совсем не работает.",
    generalClarifyApplianceOpt2: "Не греет, не охлаждает или плохо сливает воду.",
    generalClarifyApplianceOpt3: "Протекает, странно шумит или необычно пахнет.",
    generalClarifyApplianceOpt4: "На дисплее показывается код ошибки.",
    generalClarifyApplianceOpt5: "Есть видимые повреждения или что-то ещё не так.",
    generalClarifyKitchenOpt1: "Не работает какой-то прибор.",
    generalClarifyKitchenOpt2: "Есть протечка или проблема с водой.",
    generalClarifyKitchenOpt3: "Мойка, кран или слив забиты или повреждены.",
    generalClarifyKitchenOpt4: "Проблема с электрикой или освещением.",
    generalClarifyKitchenOpt5: "Что-то сломано или повреждено.",
    dishwasherClarifyIntro: "Сожалею, что у вас проблема с посудомоечной машиной.",
    dishwasherClarifyLead: "Чтобы я мог помочь быстрее, что подходит больше всего?",
    dishwasherOptionNotHeating: "Не нагревает воду или вода остаётся холодной.",
    dishwasherOptionNoWater: "Не набирает воду.",
    dishwasherOptionNotDraining: "Не сливает воду.",
    dishwasherOptionLeakPump: "Протекает, постоянно качает или в поддоне может быть вода.",
    dishwasherOptionCode: "На дисплее показывается код ошибки.",
    dishwasherDetailPrompt: "Если можете, укажите код ошибки или опишите поведение машины.",
    dishwasherCodeAsk: "Могу помочь. Какой код ошибки отображается?",
    dishwasherCodeListIntro: "Частые коды посудомоечных машин architecto:",
    dishwasherCodeOutro: "Напишите код, и я подскажу шаги и формулировку для формы.",
    generalLeakIntro: "Похоже на протечку возле {subject}.",
    generalLeakStep1: "Если безопасно, временно не пользуйтесь затронутой мойкой или узлом.",
    generalLeakStep2: "Проверьте, идёт ли вода из трубы, слива или соединения крана.",
    generalLeakStep3: "Уберите лужи, чтобы снизить повреждения.",
    generalLeakStep4: "По возможности сфотографируйте протечку или мокрую зону.",
    generalLeakClaim1: "Укажите, где протекает, и по возможности приложите фото.",
    generalLeakDescription:
      "В затронутой зоне протечка воды. Поверхность мокрая; вода может идти из трубы, слива или соединения. Организуйте осмотр или ремонт.",
    generalDrainageIntro: "Похоже на засор или проблему со сливом возле {subject}.",
    generalDrainageStep1: "Если вода поднимается, не пользуйтесь мойкой или сливом.",
    generalDrainageStep2: "Проверьте, полный ли засор или вода уходит медленно.",
    generalDrainageStep3: "Если безопасно, удалите стоячую воду.",
    generalDrainageStep4: "Сфотографируйте засор или перелив, если это видно.",
    generalDrainageClaim1: "Укажите, что мойка или слив забиты или плохо уходят, и приложите фото по возможности.",
    generalDrainageDescription:
      "Мойка или слив забиты или плохо уходят. Вода может уходить медленно или подниматься обратно. Организуйте проверку или ремонт.",
    generalElectricalIntro: "Похоже на проблему с электрикой или освещением у {subject}.",
    generalElectricalStep1: "Если безопасно, временно не пользуйтесь затронутым светильником, выключателем или розеткой.",
    generalElectricalStep2: "Проверьте, один ли элемент не работает или вся зона.",
    generalElectricalStep3: "Отметьте мерцание, отсутствие питания или сработавший автомат.",
    generalElectricalStep4: "Сфотографируйте видимые повреждения.",
    generalElectricalClaim1: "Укажите зону и есть ли отсутствие питания, мерцание или видимые повреждения.",
    generalElectricalDescription:
      "В затронутой зоне проблема с электрикой или освещением. Проверьте подключение или организуйте ремонт.",
    generalDamageIntro: "Похоже на повреждённый предмет в {subject}.",
    generalDamageStep1: "Сделайте чёткое фото повреждённого места.",
    generalDamageStep2: "Отметьте, можно ли ещё пользоваться предметом или он работает неправильно.",
    generalDamageStep3: "Не прилагайте силу к подвижным частям, если они заклинили или болтаются.",
    generalDamageClaim1: "Укажите, что сломано или повреждено, и по возможности приложите фото.",
    generalDamageDescription:
      "На затронутом предмете есть видимые повреждения. Организуйте осмотр или ремонт.",
    applianceChoiceIntro: "Какой прибор не работает?",
    applianceChoiceDishwasher: "Посудомоечная машина",
    applianceChoiceOven: "Духовка",
    applianceChoiceFridge: "Холодильник или морозильник",
    applianceChoiceWasher: "Стиральная или сушильная машина",
    applianceChoiceHob: "Варочная панель или плита",
    applianceChoiceHood: "Вытяжка",
    applianceChoiceOther: "Другой прибор",
    claimFormTrySteps: "Можно попробовать",
    claimFormForForm: "Для формы",
    claimFormSuggestedDescription: "Предлагаемое описание проблемы",
    claimFormHelpClosing: "При необходимости могу предложить формулировку для формы.",
    claimFormHelpAction: "Показать подсказку по форме",
    claimFormNextStep: "Если проблема сохранится, можно создать рекламацию.",
    claimFormDamageStepsTitle: "Укажите затронутый предмет или зону, например",
    claimFormCopyOutro:
      "Можно скопировать это в форму. Если что-то изменится или появится код ошибки, тоже укажите.",
    waterInletOutro: "Скопируйте текст в форму. Если появляется код ошибки, укажите и его.",
    knowledgeIntroStart: "Похоже на ",
    knowledgeCodeExplicit: " и соответствует коду ошибки {code} у посудомоечных машин architecto.",
    knowledgeCodeImplicit: ", часто связанный с кодом ошибки {code} у посудомоечных машин architecto.",
    dishwasherProblemPhrase: "проблему с посудомоечной машиной",
    dishwasherSuggestFallback:
      "Моя посудомоечная машина architecto работает неправильно. Пожалуйста, проверьте прибор и сообщите следующий шаг.",
    dishwasherSuggestWithIssue:
      "У моей посудомоечной машины architecto такая проблема: {issue}. Пожалуйста, проверьте прибор и сообщите следующий шаг.",
  },
};

const KNOWLEDGE_TEXT = {
  en: {
    titles: {
      water_inlet: "Water inlet",
      heating_temperature: "Heating / temperature",
      leak_overflow: "Leak / overflow",
      drainage: "Drainage",
      reset_device: "Reset the appliance",
      clean_filters: "Clean the filters",
      check_base_tray: "Check the base tray",
    },
    details: {
      water_inlet_error: "The dishwasher reports a water inlet problem.",
      target_temperature_not_reached: "The required temperature is not being reached.",
      water_in_base_tray: "There is water in the base tray.",
      continuous_pumping: "The appliance may keep pumping continuously.",
      beeping_alarm: "The appliance may beep during the fault.",
      water_not_draining: "The water is not draining out.",
      check_water_tap: "Check whether the water tap is open and supplying water.",
      check_inlet_hose_kinks: "Check the inlet hose for kinks.",
      clean_hose_connection_filter: "Clean the filter screen at the hose connection.",
      clean_filters: "Clean the internal filters.",
      check_drain_hose: "Check the drain hose for blockages or kinks.",
      check_pump_blockage: "Check the pump area for blockages.",
      heater_may_be_defective: "A defective heating element may be the cause.",
      temperature_sensor_may_be_defective: "A defective temperature sensor may be the cause.",
      appliance_leak: "A leak in the appliance is the most likely cause.",
      hose_to_sump_connection_leak: "A leaking hose connection to the sump is a known possible cause.",
      report_error_code_e1: "Mention the E1 code in the claim.",
      report_error_code_e3: "Mention the E3 code in the claim.",
      report_error_code_e02: "Mention the E02 code in the claim.",
      check_base_tray_for_water: "If the unit keeps pumping even after power-off, check whether there is water in the base tray.",
      unplug_one_to_two_minutes: "Unplug the appliance for about 1 to 2 minutes to reset the electronics.",
      inspect_inner_filters_for_dirt: "Inspect the inside filters for dirt and buildup.",
      tilt_forward_to_drain_base_tray_water:
        "If it keeps pumping and there is water in the base tray, tilt the appliance slightly forward so the water can run out.",
    },
  },
  de: {
    titles: {
      water_inlet: "Wasserzulauf",
      heating_temperature: "Temperatur / Heizung",
      leak_overflow: "Undichtigkeit / Überlauf",
      drainage: "Wasserablauf",
      reset_device: "Gerät zurücksetzen",
      clean_filters: "Siebe reinigen",
      check_base_tray: "Bodenwanne prüfen",
    },
    details: {
      water_inlet_error: "Der Geschirrspüler meldet ein Problem beim Wasserzulauf.",
      target_temperature_not_reached: "Die erforderliche Temperatur wird nicht erreicht.",
      water_in_base_tray: "Es befindet sich Wasser in der Bodenwanne.",
      continuous_pumping: "Das Gerät kann dauerhaft weiterpumpen.",
      beeping_alarm: "Während des Fehlers kann das Gerät piepen.",
      water_not_draining: "Das Wasser wird nicht abgepumpt.",
      check_water_tap: "Prüfen, ob der Wasserhahn geöffnet ist und Wasser liefert.",
      check_inlet_hose_kinks: "Den Zulaufschlauch auf Knicke prüfen.",
      clean_hose_connection_filter: "Das Sieb im Schlauchanschluss reinigen.",
      clean_filters: "Die Innensiebe reinigen.",
      check_drain_hose: "Den Ablaufschlauch auf Verstopfungen oder Knicke prüfen.",
      check_pump_blockage: "Die Pumpe auf Verstopfungen prüfen.",
      heater_may_be_defective: "Mögliche Ursache ist ein defektes Heizelement.",
      temperature_sensor_may_be_defective: "Mögliche Ursache ist ein defekter Temperatursensor.",
      appliance_leak: "Am wahrscheinlichsten ist eine Undichtigkeit im Gerät.",
      hose_to_sump_connection_leak: "Eine mögliche bekannte Ursache ist ein undichter Verbindungsschlauch zum Pumpentopf.",
      report_error_code_e1: "Den Fehlercode E1 in der Reklamation angeben.",
      report_error_code_e3: "Den Fehlercode E3 in der Reklamation angeben.",
      report_error_code_e02: "Den Fehlercode E02 in der Reklamation angeben.",
      check_base_tray_for_water: "Wenn das Gerät auch nach dem Ausschalten weiterpumpt, prüfen, ob sich Wasser in der Bodenwanne befindet.",
      unplug_one_to_two_minutes: "Zum Reset den Stecker für etwa 1 bis 2 Minuten ziehen.",
      inspect_inner_filters_for_dirt: "Die Siebe im Innenraum auf Verschmutzungen prüfen.",
      tilt_forward_to_drain_base_tray_water:
        "Wenn das Gerät weiterpumpt und Wasser in der Bodenwanne steht, das Gerät leicht nach vorne kippen, damit das Wasser ablaufen kann.",
    },
  },
  tr: {
    titles: {
      water_inlet: "Su girişi",
      heating_temperature: "Isıtma / sıcaklık",
      leak_overflow: "Sızıntı / taşma",
      drainage: "Su tahliyesi",
      reset_device: "Cihazı sıfırlayın",
      clean_filters: "Filtreleri temizleyin",
      check_base_tray: "Alt hazneyi kontrol edin",
    },
    details: {
      water_inlet_error: "Bulaşık makinesi su giriş hatası bildiriyor.",
      target_temperature_not_reached: "Gerekli sıcaklığa ulaşılamıyor.",
      water_in_base_tray: "Alt haznede su bulunuyor.",
      continuous_pumping: "Cihaz sürekli pompalamaya devam edebilir.",
      beeping_alarm: "Arıza sırasında bip sesi duyulabilir.",
      water_not_draining: "Su boşaltılmıyor.",
      check_water_tap: "Su musluğunun açık olduğunu ve su verdiğini kontrol edin.",
      check_inlet_hose_kinks: "Su giriş hortumunda kıvrılma olup olmadığını kontrol edin.",
      clean_hose_connection_filter: "Hortum bağlantısındaki filtreyi temizleyin.",
      clean_filters: "İç filtreleri temizleyin.",
      check_drain_hose: "Tahliye hortumunda tıkanıklık veya kıvrılma olup olmadığını kontrol edin.",
      check_pump_blockage: "Pompayı tıkanıklık açısından kontrol edin.",
      heater_may_be_defective: "Nedeni arızalı bir ısıtıcı eleman olabilir.",
      temperature_sensor_may_be_defective: "Nedeni arızalı bir sıcaklık sensörü olabilir.",
      appliance_leak: "En olası neden cihaz içindeki bir sızıntıdır.",
      hose_to_sump_connection_leak: "Sump bağlantı hortumundaki kaçak bilinen olası bir nedendir.",
      report_error_code_e1: "Şikayette E1 hata kodunu belirtin.",
      report_error_code_e3: "Şikayette E3 hata kodunu belirtin.",
      report_error_code_e02: "Şikayette E02 hata kodunu belirtin.",
      check_base_tray_for_water: "Cihaz kapatıldıktan sonra bile pompalamaya devam ediyorsa alt haznede su olup olmadığını kontrol edin.",
      unplug_one_to_two_minutes: "Elektroniği sıfırlamak için cihazın fişini yaklaşık 1 ila 2 dakika çekin.",
      inspect_inner_filters_for_dirt: "İç filtreleri kir ve birikme açısından kontrol edin.",
      tilt_forward_to_drain_base_tray_water:
        "Pompalamaya devam ediyor ve alt haznede su varsa suyun boşalması için cihazı hafifçe öne doğru eğin.",
    },
  },
  es: {
    titles: {
      water_inlet: "Entrada de agua",
      heating_temperature: "Calentamiento / temperatura",
      leak_overflow: "Fuga / desbordamiento",
      drainage: "Desagüe",
      reset_device: "Reiniciar el aparato",
      clean_filters: "Limpiar los filtros",
      check_base_tray: "Comprobar la bandeja inferior",
    },
    details: {
      water_inlet_error: "El lavavajillas indica un problema de entrada de agua.",
      target_temperature_not_reached: "No se alcanza la temperatura necesaria.",
      water_in_base_tray: "Hay agua en la bandeja inferior.",
      continuous_pumping: "El aparato puede seguir bombeando continuamente.",
      beeping_alarm: "Durante el fallo puede emitir pitidos.",
      water_not_draining: "El agua no se está evacuando.",
      check_water_tap: "Comprueba que el grifo de agua esté abierto y suministre agua.",
      check_inlet_hose_kinks: "Comprueba si la manguera de entrada está doblada.",
      clean_hose_connection_filter: "Limpia el filtro de la conexión de la manguera.",
      clean_filters: "Limpia los filtros interiores.",
      check_drain_hose: "Comprueba si la manguera de desagüe tiene atascos o dobleces.",
      check_pump_blockage: "Comprueba si la bomba está bloqueada.",
      heater_may_be_defective: "La causa puede ser una resistencia defectuosa.",
      temperature_sensor_may_be_defective: "La causa puede ser un sensor de temperatura defectuoso.",
      appliance_leak: "La causa más probable es una fuga dentro del aparato.",
      hose_to_sump_connection_leak: "Una posible causa conocida es una fuga en la conexión de la manguera al sumidero.",
      report_error_code_e1: "Indica el código E1 en la reclamación.",
      report_error_code_e3: "Indica el código E3 en la reclamación.",
      report_error_code_e02: "Indica el código E02 en la reclamación.",
      check_base_tray_for_water: "Si el equipo sigue bombeando incluso apagado, comprueba si hay agua en la bandeja inferior.",
      unplug_one_to_two_minutes: "Desenchufa el aparato durante unos 1 a 2 minutos para reiniciar la electrónica.",
      inspect_inner_filters_for_dirt: "Revisa los filtros interiores por si hay suciedad acumulada.",
      tilt_forward_to_drain_base_tray_water:
        "Si sigue bombeando y hay agua en la bandeja inferior, inclina ligeramente el aparato hacia delante para que el agua salga.",
    },
  },
  fr: {
    titles: {
      water_inlet: "Arrivée d'eau",
      heating_temperature: "Chauffage / température",
      leak_overflow: "Fuite / débordement",
      drainage: "Vidange",
      reset_device: "Réinitialiser l'appareil",
      clean_filters: "Nettoyer les filtres",
      check_base_tray: "Vérifier le bac inférieur",
    },
    details: {
      water_inlet_error: "Le lave-vaisselle signale un problème d'arrivée d'eau.",
      target_temperature_not_reached: "La température nécessaire n'est pas atteinte.",
      water_in_base_tray: "Il y a de l'eau dans le bac inférieur.",
      continuous_pumping: "L'appareil peut continuer à pomper en permanence.",
      beeping_alarm: "L'appareil peut émettre des bips pendant le défaut.",
      water_not_draining: "L'eau n'est pas évacuée.",
      check_water_tap: "Vérifiez que le robinet d'eau est ouvert et alimente bien l'appareil.",
      check_inlet_hose_kinks: "Vérifiez que le tuyau d'arrivée d'eau n'est pas pincé.",
      clean_hose_connection_filter: "Nettoyez le filtre au raccord du tuyau.",
      clean_filters: "Nettoyez les filtres internes.",
      check_drain_hose: "Vérifiez que le tuyau de vidange n'est pas bouché ou plié.",
      check_pump_blockage: "Vérifiez si la pompe est obstruée.",
      heater_may_be_defective: "La cause peut être une résistance défectueuse.",
      temperature_sensor_may_be_defective: "La cause peut être une sonde de température défectueuse.",
      appliance_leak: "La cause la plus probable est une fuite dans l'appareil.",
      hose_to_sump_connection_leak: "Une cause possible connue est une fuite au raccord du tuyau vers le puisard.",
      report_error_code_e1: "Mentionnez le code E1 dans la réclamation.",
      report_error_code_e3: "Mentionnez le code E3 dans la réclamation.",
      report_error_code_e02: "Mentionnez le code E02 dans la réclamation.",
      check_base_tray_for_water: "Si l'appareil continue à pomper même éteint, vérifiez s'il y a de l'eau dans le bac inférieur.",
      unplug_one_to_two_minutes: "Débranchez l'appareil pendant environ 1 à 2 minutes pour réinitialiser l'électronique.",
      inspect_inner_filters_for_dirt: "Contrôlez l'encrassement des filtres internes.",
      tilt_forward_to_drain_base_tray_water:
        "S'il continue à pomper et qu'il y a de l'eau dans le bac inférieur, inclinez légèrement l'appareil vers l'avant pour évacuer l'eau.",
    },
  },
  ru: {
    titles: {
      water_inlet: "Подача воды",
      heating_temperature: "Нагрев / температура",
      leak_overflow: "Протечка / перелив",
      drainage: "Слив воды",
      reset_device: "Сбросить устройство",
      clean_filters: "Очистить фильтры",
      check_base_tray: "Проверить нижний поддон",
    },
    details: {
      water_inlet_error: "Посудомоечная машина сообщает о проблеме с подачей воды.",
      target_temperature_not_reached: "Не достигается требуемая температура.",
      water_in_base_tray: "В нижнем поддоне есть вода.",
      continuous_pumping: "Устройство может постоянно откачивать воду.",
      beeping_alarm: "Во время ошибки устройство может подавать звуковой сигнал.",
      water_not_draining: "Вода не сливается.",
      check_water_tap: "Проверьте, открыт ли кран подачи воды и есть ли подача воды.",
      check_inlet_hose_kinks: "Проверьте, нет ли перегибов на заливном шланге.",
      clean_hose_connection_filter: "Очистите фильтр в месте подключения шланга.",
      clean_filters: "Очистите внутренние фильтры.",
      check_drain_hose: "Проверьте сливной шланг на засоры и перегибы.",
      check_pump_blockage: "Проверьте насос на засоры.",
      heater_may_be_defective: "Причиной может быть неисправный нагревательный элемент.",
      temperature_sensor_may_be_defective: "Причиной может быть неисправный датчик температуры.",
      appliance_leak: "Наиболее вероятная причина - протечка внутри устройства.",
      hose_to_sump_connection_leak: "Известная возможная причина - протечка соединительного шланга к поддону.",
      report_error_code_e1: "Укажите код ошибки E1 в рекламации.",
      report_error_code_e3: "Укажите код ошибки E3 в рекламации.",
      report_error_code_e02: "Укажите код ошибки E02 в рекламации.",
      check_base_tray_for_water: "Если устройство продолжает качать даже после выключения, проверьте, есть ли вода в нижнем поддоне.",
      unplug_one_to_two_minutes: "Отключите устройство от сети примерно на 1-2 минуты, чтобы сбросить электронику.",
      inspect_inner_filters_for_dirt: "Проверьте внутренние фильтры на загрязнение.",
      tilt_forward_to_drain_base_tray_water:
        "Если насос продолжает работать и в нижнем поддоне есть вода, слегка наклоните устройство вперед, чтобы вода вытекла.",
    },
  },
};

function t(language) {
  return COPY[language] || COPY.en;
}

function issueSubjectLabel(copy, subjectKey) {
  const key = `issueSubject_${subjectKey}`;
  return copy[key] || copy.issueSubject_this || "";
}

function applySubjectTemplate(text, copy, subjectKey) {
  const normalized = normalizeText(text);
  if (!normalized.includes("{subject}")) {
    return normalized;
  }
  return normalized.replace("{subject}", issueSubjectLabel(copy, subjectKey));
}

function copyText(copy, key) {
  return copy[key] || COPY.en[key] || "";
}

function knowledgeText(language) {
  return KNOWLEDGE_TEXT[language] || KNOWLEDGE_TEXT.en;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeConversationMessages(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((message) => ({
      role: normalizeText(message?.role).toLowerCase(),
      text: normalizeText(message?.text),
    }))
    .filter((message) => message.text);
}

function normalizeLanguage(value) {
  const language = normalizeText(value).toLowerCase();
  return COPY[language] ? language : "en";
}

function hasDishwasherKeyword(text) {
  const normalized = normalizeLanguageHintText(text);
  return fuzzyTextHasAny(normalized, [
    "dishwasher",
    "geschirrspuler",
    "geschirrspulmaschine",
    "spulmaschine",
    "spulmachine",
    "spulmaschiene",
    "schpulmachine",
    "schpulmaschine",
  ]);
}

function normalizeLanguageHintText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTokens(value) {
  return normalizeLanguageHintText(value).split(" ").filter(Boolean);
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= b.length; column += 1) {
    rows[0][column] = column;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
    }
  }

  return rows[a.length][b.length];
}

function damerauLevenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );

      if (
        i > 1
        && j > 1
        && a[i - 1] === b[j - 2]
        && a[i - 2] === b[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[a.length][b.length];
}

function allowedTokenDistance(token) {
  if (token.length <= 4) return 1;
  if (token.length <= 8) return 2;
  return 3;
}

function fuzzyTokenEquals(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > allowedTokenDistance(a)) return false;
  return damerauLevenshteinDistance(a, b) <= Math.min(allowedTokenDistance(a), allowedTokenDistance(b));
}

function fuzzyTextIncludesPhrase(text, phrase) {
  const textTokens = normalizedTokens(text);
  const phraseTokens = normalizedTokens(phrase);
  if (!textTokens.length || !phraseTokens.length) return false;
  if (phraseTokens.length > textTokens.length) return false;

  for (let start = 0; start <= textTokens.length - phraseTokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < phraseTokens.length; offset += 1) {
      if (!fuzzyTokenEquals(textTokens[start + offset], phraseTokens[offset])) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function fuzzyTextHasAny(text, phrases) {
  return arrayValue(phrases).some((phrase) => fuzzyTextIncludesPhrase(text, phrase));
}

const SERVICE_CATEGORY_TERMS = {
  dishwasher: [
    "dishwasher",
    "dish washer",
    "geschirrspuler",
    "geschirrspueler",
    "geschirrspulmaschine",
    "spulmaschine",
    "spuelmaschine",
    "spulmachine",
    "lavavajillas",
    "lave vaisselle",
    "bulasik",
  ],
  "washing-machine": [
    "washing machine",
    "washer",
    "wash machine",
    "waschmaschine",
    "lavadora",
    "lave linge",
  ],
  "oven-hob": [
    "oven",
    "backofen",
    "hob",
    "cooktop",
    "cooker",
    "kochfeld",
    "herd",
  ],
  fridge: [
    "fridge",
    "refrigerator",
    "freezer",
    "kuhlschrank",
    "kuehlschrank",
    "gefrierschrank",
    "refrigirator",
  ],
  hood: [
    "hood",
    "extractor",
    "extractor hood",
    "ventilation",
    "dunstabzugshaube",
    "dunstabzug",
  ],
  sink: [
    "sink",
    "tap",
    "faucet",
    "drain",
    "spule",
    "spuele",
    "wasserhahn",
    "abfluss",
    "fregadero",
    "evier",
    "eviye",
  ],
  cabinet: [
    "cabinet",
    "cupboard",
    "drawer",
    "hinge",
    "front",
    "door",
    "schrank",
    "schublade",
    "scharnier",
  ],
};

function editDistanceAtMost(left, right, maxDistance) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > maxDistance) return false;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > maxDistance) return false;
    previous = current;
  }

  return previous[right.length] <= maxDistance;
}

function fuzzyTermDistance(term) {
  if (term.length >= 10) return 2;
  if (term.length >= 4) return 1;
  return 0;
}

function tokenMatchesServiceTerm(token, term) {
  const normalizedToken = normalizeLanguageHintText(token);
  const normalizedTerm = normalizeLanguageHintText(term);
  if (!normalizedToken || !normalizedTerm) return false;
  if (normalizedToken === normalizedTerm) return true;
  if (normalizedToken.length < 4 || normalizedTerm.length < 4) return false;
  if (normalizedToken[0] !== normalizedTerm[0]) return false;
  return editDistanceAtMost(normalizedToken, normalizedTerm, fuzzyTermDistance(normalizedTerm));
}

function hasServiceCategoryTerm(text, terms) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return false;

  const compactText = normalized.replace(/\s+/g, "");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return terms.some((term) => {
    const normalizedTerm = normalizeLanguageHintText(term);
    if (!normalizedTerm) return false;
    const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|\\s)${escapedTerm}(?=\\s|$)`).test(normalized)) {
      return true;
    }

    const termWords = normalizedTerm.split(/\s+/).filter(Boolean);
    if (termWords.length > 1) {
      const compactTerm = normalizedTerm.replace(/\s+/g, "");
      if (compactText.includes(compactTerm)) return true;
      return termWords.every((word) => tokens.some((token) => tokenMatchesServiceTerm(token, word)));
    }

    return tokens.some((token) => tokenMatchesServiceTerm(token, normalizedTerm));
  });
}

function detectServiceCategories(text) {
  return Object.entries(SERVICE_CATEGORY_TERMS)
    .filter(([, terms]) => hasServiceCategoryTerm(text, terms))
    .map(([category]) => category);
}

function detectExplicitLanguageSwitch(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return null;
  if (/\b(deutsch|deutch|german)\b/.test(normalized)) return "de";
  if (/\b(english|englisch)\b/.test(normalized)) return "en";
  return null;
}

function detectLikelyGerman(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return false;

  const strongGermanTerms = [
    "geschirrspuler",
    "fehlercode",
    "bodenwanne",
    "wasserzulauf",
    "zieht kein wasser",
    "pumpt nicht ab",
    "pumpt dauerhaft",
    "wasser bleibt kalt",
    "heizt nicht",
    "undicht",
  ];
  if (strongGermanTerms.some((term) => normalized.includes(term))) {
    return true;
  }

  const germanCueCount = (
    normalized.match(/\b(meine|mein|bitte|kannst|kant|du|auf|deutsch|deutch|ist|kapput|kaputt|zieht|wasser|heizt|nicht|bleibt|kalt|fehlercode|wird|angezeigt)\b/g) || []
  ).length;

  return germanCueCount >= 2;
}

function resolveAssistantLanguage({ requestedLanguage, question, conversationMessages }) {
  const userTexts = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .map((message) => message.text);
  const signals = [...userTexts, normalizeText(question)].filter(Boolean);

  let explicitPreference = null;
  for (const text of signals) {
    const detected = detectExplicitLanguageSwitch(text);
    if (detected) explicitPreference = detected;
  }
  if (explicitPreference) return explicitPreference;
  if (requestedLanguage === "de") return "de";
  if (detectLikelyGerman(signals.join("\n"))) return "de";
  return requestedLanguage;
}

function normalizeCode(raw) {
  const compact = normalizeText(raw).replace(/\s+/g, "").toUpperCase();
  const match = compact.match(/^E(\d{1,2})$/);
  if (!match) return compact;
  const digits = match[1];
  if (digits.length === 1) return `E${digits}`;
  if (digits === "01") return "E1";
  if (digits === "03") return "E3";
  if (digits === "04") return "E4";
  if (digits.length === 2 && digits.startsWith("0")) return `E0${digits[1]}`;
  return `E${digits}`;
}

function errorCodeAliases(code) {
  const normalized = normalizeCode(code);
  if (normalized === "E1") return ["E1", "E01"];
  if (normalized === "E2") return ["E2", "E02"];
  if (normalized === "E02") return ["E02", "E2"];
  if (normalized === "E3") return ["E3", "E03"];
  if (normalized === "E4") return ["E4", "E04"];
  return normalized ? [normalized] : [];
}

function replaceArchitectoBrandCopy(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  return normalized
    .replace(/architecto\s*\/\s*architecto/gi, "architecto")
    .replace(/Amica\/architecto/gi, "architecto")
    .replace(/Amica-Geschirrspülern/g, "architecto-Geschirrspülern")
    .replace(/Amica-Geschirrspüler/gi, "architecto-Geschirrspüler")
    .replace(/Amica dishwashers/gi, "architecto dishwashers")
    .replace(/Amica dishwasher/gi, "architecto dishwasher")
    .replace(/Amica-Fehlercodes/g, "architecto-Fehlercodes")
    .replace(/Amica/gi, "architecto");
}

function getTroubleshootingLanguage(language) {
  if (language === "de") return "de";
  if (language === "es") return "es";
  return "en";
}

function listTroubleshootingGuides(language, applianceType = "") {
  const normalizedLanguage = getTroubleshootingLanguage(language);
  const normalizedApplianceType = normalizeText(applianceType);
  const guides = arrayValue(SERVICE_CLAIM_TROUBLESHOOTING_DATA?.guides).filter((entry) =>
    entry?.brand === "Amica"
    && (!normalizedApplianceType || normalizeText(entry?.appliance_type) === normalizedApplianceType)
    && (entry?.language === normalizedLanguage || entry?.language === "en")
  );

  return guides.sort((a, b) => {
    const aPreferred = a?.language === normalizedLanguage ? 1 : 0;
    const bPreferred = b?.language === normalizedLanguage ? 1 : 0;
    return bPreferred - aPreferred;
  });
}

function listDishwasherTroubleshootingGuides(language) {
  return listTroubleshootingGuides(language, "dishwasher");
}

function findTroubleshootingGuide({ language, applianceType, code, issueKey }) {
  const normalizedCode = normalizeCode(code || "");
  const normalizedIssueKey = normalizeText(issueKey);

  return listTroubleshootingGuides(language, applianceType).find((entry) => {
    if (normalizedCode && normalizeCode(entry?.error_code || "") === normalizedCode) {
      return true;
    }
    return normalizedIssueKey && normalizeText(entry?.issue_key) === normalizedIssueKey;
  }) || null;
}

function findDishwasherTroubleshootingGuide({ language, code, issueKey }) {
  return findTroubleshootingGuide({
    language,
    applianceType: "dishwasher",
    code,
    issueKey,
  });
}

function buildGuideForMatch(match, language) {
  const guide = findTroubleshootingGuide({
    language,
    applianceType: match?.applianceType || match?.appliance_type,
    code: match?.code,
    issueKey: match?.titleKey,
  });
  if (!guide) return null;

  const normalizedCode = normalizeCode(guide.error_code || match?.code || "");
  const claimGuidance = normalizeText(guide.claim_guidance);
  const suggestedDescriptionTemplate = normalizeText(guide.optional_form_description);
  const suggestedDescription = normalizedCode
    ? suggestedDescriptionTemplate
      .replace(/\bE\d{1,2}\b/, normalizedCode)
      .replace(/error code E\d{1,2}/i, `error code ${normalizedCode}`)
    : suggestedDescriptionTemplate;

  return {
    ...guide,
    applianceType: normalizeText(match?.applianceType || match?.appliance_type || guide.appliance_type),
    errorCode: normalizedCode,
    description: replaceArchitectoBrandCopy(guide.description),
    troubleshootingSteps: arrayValue(guide.troubleshooting_steps),
    claimGuidance: claimGuidance ? [replaceArchitectoBrandCopy(claimGuidance.replace(/\bE\d{1,2}\b/, normalizedCode || ""))] : [],
    suggestedDescription: replaceArchitectoBrandCopy(suggestedDescription),
  };
}

function buildDishwasherGuideForMatch(match, language) {
  return buildGuideForMatch({ ...match, applianceType: "dishwasher" }, language);
}

function applianceTypeLabel(applianceType) {
  const labels = {
    dishwasher: "dishwasher",
    fridge: "fridge",
    freezer: "freezer",
    oven: "oven",
    hob: "hob",
    gas_hob: "gas hob",
    extractor_hood: "extractor hood",
    microwave: "microwave",
    cooker: "cooker",
    washing_machine: "washing machine",
    washer_dryer: "washer-dryer",
    tumble_dryer: "tumble dryer",
    wine_cooler: "wine cooler",
  };
  return labels[normalizeText(applianceType)] || "appliance";
}

function titleKeyLabel(titleKey) {
  const normalized = normalizeText(titleKey).replace(/_/g, " ");
  return normalized || "problem";
}

function formatKnowledgeIssueSummary(guide, match, language) {
  const title = normalizeText(guide?.title) || `${applianceTypeLabel(match?.applianceType)} ${titleKeyLabel(match?.titleKey)}`.trim();
  if (!title) {
    return t(language).dishwasherProblemPhrase;
  }
  if (language === "de") return title;
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function formatDishwasherIssueSummary(guide, language) {
  const title = normalizeText(guide?.title);
  const copy = t(language);
  if (!title) {
    return copy.dishwasherProblemPhrase;
  }
  if (language === "de") return title;
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function buildDishwasherErrorCodeList(language) {
  return listDishwasherTroubleshootingGuides(language)
    .filter((entry) => normalizeText(entry?.error_code))
    .map((entry) => `- ${normalizeCode(entry.error_code)}: ${normalizeText(entry.title)}`);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function isGreeting(question) {
  const normalized = normalizeLanguageHintText(question);
  if (!normalized) return false;
  if (/^hal{1,2}o?$/.test(normalized)) return true;
  const greetings = [
    "hi",
    "hello",
    "hey",
    "hallo",
    "hola",
    "buenos dias",
    "buenas",
    "merhaba",
    "salut",
    "bonjour",
    "coucou",
    "privet",
    "zdrazvstvuyte",
    "servus",
    "guten tag",
    "good morning",
    "good afternoon",
    "good evening",
  ];
  if (greetings.includes(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.length <= 3 && words.every((word) => greetings.includes(word) || /^hal{1,2}o?$/.test(word))) {
    return true;
  }

  return false;
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

function buildOutOfScopeAnswer(language) {
  const answers = {
    en:
      "I can only help with kitchen service claims.\n\nPlease tell me what is not working in the kitchen or which item is affected.",
    de:
      "Ich kann nur bei Küchenreklamationen helfen.\n\nBeschreiben Sie bitte, was in der Küche nicht funktioniert oder welcher Gegenstand betroffen ist.",
    tr:
      "Sadece mutfak servis talepleri konusunda yardimci olabilirim.\n\nLutfen mutfakta neyin calismadigini veya hangi parcanin etkilendigini yazin.",
    es:
      "Solo puedo ayudar con reclamaciones de servicio de cocina.\n\nIndica que no funciona en la cocina o que elemento esta afectado.",
    fr:
      "Je peux seulement aider pour les reclamations de service cuisine.\n\nIndiquez ce qui ne fonctionne pas dans la cuisine ou quel element est concerne.",
    ru:
      "Ya mogu pomoch tolko s servisnymi reklamatsiyami po kuhne.\n\nOpishite, chto ne rabotaet na kuhne ili kakoy predmet zatronut.",
  };
  return answers[language] || answers.en;
}

function hasServiceClaimContext(text) {
  const haystack = normalizeLanguageHintText(text);
  if (!haystack) return false;
  if (detectTextCategories(haystack).length) return true;
  return /\b(kitchen|claim|service|repair|technician|photo|picture|serial|contract|availability|appointment|appliance|dishwasher|sink|tap|faucet|drain|leak|water|blocked|clogged|electrical|lighting|light|socket|switch|broken|damaged|oven|hob|fridge|freezer|washing machine|dryer|extractor|hood|cabinet|drawer|hinge|error code|reclamation|reklamation|kuche|kueche|spule|spuele|spulmaschine|spuelmaschine|geschirrspuler|geschirrspueler|abfluss|undicht|wasser|defekt|kaputt|foto|seriennummer|lavavajillas|fregadero|desague|reclamacion|cocina|fuite|evier|reclamation|cuisine|lave vaisselle|mutfak|sikayet|eviye|bulasik|lavabo)\b/.test(
    haystack,
  );
}

function isClearlyOutOfScopeQuestion(question) {
  const haystack = normalizeLanguageHintText(question);
  if (!haystack || isGreeting(haystack) || hasServiceClaimContext(haystack)) return false;

  return /\b(weather|forecast|temperature outside|bitcoin|stock price|exchange rate|president|prime minister|latest news|write (?:me )?(?:a )?(?:poem|story|song|joke)|tell (?:me )?(?:a )?joke|recipe|cook pasta|how do i cook|football|soccer|basketball|movie|music|homework|math problem|translate this|order status|track my order|payment|invoice|refund|buy (?:a )?(?:new|another)?\s*kitchen|purchase (?:a )?(?:new|another)?\s*kitchen|configurator)\b/.test(
    haystack,
  );
}

function isSampleWordingRequest(question) {
  const normalized = normalizeText(question).toLowerCase();
  if (!normalized) return false;
  return /\b(sample|wording|phrase|write|beschreibung|formul|text)\b/.test(normalized);
}

function isClaimFormHelpRequest(question) {
  const normalized = normalizeLanguageHintText(question);
  if (!normalized) return false;
  return /\b(show claim form help|claim form help|formularhilfe anzeigen|formularhilfe|what should i write|what do i write|what should i put|was soll ich schreiben|welche formulierung|formulierung fur das formular|formulierung fuer das formular|formulierung|mostrar ayuda del formulario|ayuda del formulario|que debo escribir|que tengo que escribir|que pongo en el formulario)\b/.test(
    normalized,
  );
}

function buildSampleWording(copy, claim, focusLabel) {
  const description = normalizeText(claim?.problemDescription);
  const area = focusLabel || copy.sampleWordingAreaFallback;
  if (!description) {
    return `${copy.sampleWordingIntro}\n\n${copy.sampleWordingFallback.replace("[area]", area)}`;
  }

  const sentence = description.endsWith(".") ? description : `${description}.`;
  return `${copy.sampleWordingIntro}\n\n${sentence} ${copy.sampleWordingAreaLabel}: ${area}. ${copy.sampleWordingOutro}`;
}

function detectAreaCategory(area) {
  const rawHaystack = `${normalizeText(area?.name)} ${normalizeText(area?.code)}`;
  const fuzzyCategories = detectServiceCategories(rawHaystack);
  if (fuzzyCategories.length) return fuzzyCategories[0];
  const haystack = rawHaystack.toLowerCase();
  if (!haystack) return "generic";
  if (haystack.includes("dish") || haystack.includes("geschirr") || /sp[uü]lma|spuelma|spulma|schpulma|schpulmachine/.test(haystack)) return "dishwasher";
  if (haystack.includes("wm-") || haystack.includes("washing") || haystack.includes("wasch")) return "washing-machine";
  if (haystack.includes("oven") || haystack.includes("backofen") || haystack.includes("hob") || haystack.includes("koch")) return "oven-hob";
  if (haystack.includes("ref") || haystack.includes("fridge") || haystack.includes("kühl")) return "fridge";
  if (haystack.includes("hood") || haystack.includes("dunst")) return "hood";
  if (haystack.includes("sink") || haystack.includes("spül")) return "sink";
  if (haystack.includes("cab") || haystack.includes("drawer") || haystack.includes("schrank") || haystack.includes("front")) return "cabinet";
  return "generic";
}

function detectTextCategories(text) {
  const haystack = normalizeLanguageHintText(text);
  const categories = [...detectServiceCategories(text)];
  if (
    /dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaşık|lavavajillas|lave-vaisselle|посудомо/i.test(haystack)
    || hasDishwasherKeyword(text)
  ) {
    categories.push("dishwasher");
  }
  if (/washing machine|waschmaschine|lavadora|стиральн/i.test(haystack)) {
    categories.push("washing-machine");
  }
  if (/fridge|refrigerator|kühlschrank|réfrig|холодиль/i.test(haystack)) {
    categories.push("fridge");
  }
  return dedupe(categories);
}

function isApplianceCategory(category) {
  return ["dishwasher", "washing-machine", "oven-hob", "fridge", "hood"].includes(category);
}

function detectKnowledgeApplianceTypes(text, selectedAreas = []) {
  const haystack = normalizeLanguageHintText(text);
  const applianceTypes = [];
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);

  for (const category of areaCategories) {
    if (category === "dishwasher") applianceTypes.push("dishwasher");
    if (category === "washing-machine") applianceTypes.push("washing_machine", "washer_dryer", "tumble_dryer");
    if (category === "oven-hob") applianceTypes.push("oven", "hob", "gas_hob", "cooker", "microwave");
    if (category === "fridge") applianceTypes.push("fridge", "freezer", "wine_cooler");
    if (category === "hood") applianceTypes.push("extractor_hood");
  }

  if (fuzzyTextHasAny(haystack, ["dishwasher", "geschirrspuler", "geschirrspulmaschine", "spulmaschine"])) applianceTypes.push("dishwasher");
  if (fuzzyTextHasAny(haystack, ["fridge", "refrigerator", "kuehlschrank", "kuhlschrank"])) applianceTypes.push("fridge");
  if (fuzzyTextHasAny(haystack, ["freezer", "gefrierschrank", "fridge freezer", "ice melts", "food defrosted"])) applianceTypes.push("freezer");
  if (fuzzyTextHasAny(haystack, ["oven", "backofen"])) applianceTypes.push("oven");
  if (fuzzyTextHasAny(haystack, ["hob", "kochfeld", "cooktop", "induction"])) applianceTypes.push("hob");
  if (fuzzyTextHasAny(haystack, ["gas hob", "gaskochfeld", "burner", "gas smell", "smells like gas"])) applianceTypes.push("gas_hob");
  if (fuzzyTextHasAny(haystack, ["extractor hood", "hood", "extractor", "dunstabzug", "dunstabzugshaube"])) applianceTypes.push("extractor_hood");
  if (fuzzyTextHasAny(haystack, ["microwave", "mikrowelle"])) applianceTypes.push("microwave");
  if (fuzzyTextHasAny(haystack, ["cooker", "herd"])) applianceTypes.push("cooker");
  if (fuzzyTextHasAny(haystack, ["washing machine", "waschmaschine"])) applianceTypes.push("washing_machine");
  if (fuzzyTextHasAny(haystack, ["washer dryer", "waschtrockner"])) applianceTypes.push("washer_dryer");
  if (fuzzyTextHasAny(haystack, ["tumble dryer", "dryer", "trockner"])) applianceTypes.push("tumble_dryer");
  if (fuzzyTextHasAny(haystack, ["wine cooler", "weinkuhler", "weinkuehler"])) applianceTypes.push("wine_cooler");

  return dedupe(applianceTypes);
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function extractErrorCodes(text) {
  const matches = [];
  const eCodePattern = /(^|[^A-Z0-9])(E\s*0?\d{1,2})(?=$|[^A-Z0-9])/gi;
  let match = eCodePattern.exec(text);
  while (match) {
    matches.push(...errorCodeAliases(match[2]));
    match = eCodePattern.exec(text);
  }

  const namedCodePattern =
    /\b(?:error|error code|code|fehler|fehlercode)\s*[:#-]?\s*(\d{1,2})\b/gi;
  match = namedCodePattern.exec(text);
  while (match) {
    matches.push(...errorCodeAliases(`E${match[1]}`));
    match = namedCodePattern.exec(text);
  }

  return dedupe(matches);
}

function inferDishwasherCodesFromSymptoms(text) {
  const haystack = normalizeText(text).toLowerCase();
  const codes = [];

  if (/\btemperature\b|\bheating\b|water stays cold|not heating|does not heat|cold water|heizt nicht|wasser bleibt kalt/.test(haystack)) {
    codes.push("E3");
  }
  if (/\bnot taking in water\b|does not take in water|no water intake|water inlet|wasserzulauf|zulauf|not filling|zieht kein wasser/.test(haystack)) {
    codes.push("E1");
  }
  if (/\bnot draining\b|does not drain|drainage|drain problem|wasserablauf|ablauf|not pumping out|pumpt nicht ab/.test(haystack)) {
    codes.push("E02");
  }
  if (/\bleak\b|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray|undicht|wasser in der bodenwanne/.test(haystack)) {
    codes.push("E4");
  }

  return dedupe(codes);
}

function getConversationUserText(conversationMessages) {
  return normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.text)
    .join("\n")
    .trim();
}

function detectStructuredMenuChoice(text) {
  const normalized = normalizeLanguageHintText(text);
  if (!normalized) return null;

  if (normalized === "ein gerat funktioniert nicht") return "appliance_choice";
  if (normalized === "es gibt ein leck oder ein wasserproblem") return "leak_choice";
  if (normalized === "spule wasserhahn oder abfluss ist verstopft oder beschadigt") return "drainage_choice";
  if (normalized === "es gibt ein problem mit strom oder beleuchtung") return "electrical_choice";
  if (normalized === "etwas ist kaputt oder beschadigt") return "damage_choice";

  return null;
}

function classifyGeneralIssue({ question, claim, selectedAreas, conversationMessages }) {
  const conversationText = getConversationUserText(conversationMessages);
  const combinedText = `${conversationText}\n${normalizeText(question)}\n${normalizeText(claim?.problemDescription)}`.trim();
  const haystack = combinedText.toLowerCase();
  const structuredChoice = detectStructuredMenuChoice(question);
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  const textCategories = detectTextCategories(combinedText);
  const hasAppliance =
    /oven|backofen|fridge|refrigerator|freezer|washing machine|dryer|hob|cooktop|extractor|hood|appliance/i.test(combinedText)
    || hasDishwasherKeyword(combinedText)
    || dedupe([...areaCategories, ...textCategories]).some(isApplianceCategory);
  const hasKitchenArea = /kitchen|küche|room|maintenance|broken|help|problem/i.test(combinedText);
  const hasLeak = /\bleak|leaking|water leaking|water under|wet area|pipe leaking|under the sink|undicht|austritt/i.test(haystack);
  const hasDrainage = /\bblocked|clogged|drain|drainage|not draining|slow drain|backing up|ablauf|verstopf/i.test(haystack);
  const hasElectrical = /\belectrical|electricity|light|lighting|lamp|socket|switch|power|fuse|breaker|strom|licht/i.test(haystack);
  const hasDamage = /\bbroken|damaged|scratch|scratched|crack|hinge|drawer|door|window|furniture|cabinet|tap|sink|drain|kaputt|beschadigt|beschädigt/i.test(haystack);

  if (structuredChoice === "appliance_choice") {
    return { subjectKey: "appliance", type: "appliance_choice", specific: false };
  }
  if (structuredChoice === "leak_choice") {
    return { subjectKey: "leak", type: "leak", specific: true };
  }
  if (structuredChoice === "drainage_choice") {
    return { subjectKey: "sink_or_drain", type: "drainage", specific: true };
  }
  if (structuredChoice === "electrical_choice") {
    return { subjectKey: "electrical_issue", type: "electrical", specific: true };
  }
  if (structuredChoice === "damage_choice") {
    return { subjectKey: "this", type: "damage_choice", specific: false };
  }

  if (hasLeak) {
    return {
      subjectKey: /sink/i.test(haystack) ? "sink_area" : "leak",
      type: "leak",
      specific: true,
    };
  }
  if (hasDrainage) {
    return {
      subjectKey: /sink|drain|tap/i.test(haystack) ? "sink_or_drain" : "blockage",
      type: "drainage",
      specific: true,
    };
  }
  if (hasElectrical) {
    return {
      subjectKey: /light|lighting|lamp/i.test(haystack) ? "lighting" : "electrical_issue",
      type: "electrical",
      specific: true,
    };
  }
  if (hasAppliance) {
    let subjectKey = "appliance";
    const combinedCategories = dedupe([...textCategories, ...areaCategories]);
    if (combinedCategories.includes("oven-hob") || /oven|backofen/i.test(haystack)) subjectKey = "oven";
    else if (combinedCategories.includes("fridge") || /fridge|refrigerator|freezer/i.test(haystack)) subjectKey = "fridge_or_freezer";
    else if (combinedCategories.includes("washing-machine") || /washing machine/i.test(haystack)) subjectKey = "washing_machine";
    else if (/dryer/i.test(haystack)) subjectKey = "dryer";
    else if (/hob|cooktop/i.test(haystack)) subjectKey = "hob";
    else if (combinedCategories.includes("hood") || /extractor|hood/i.test(haystack)) subjectKey = "extractor";
    return { subjectKey, type: "appliance_vague", specific: false };
  }
  if (hasKitchenArea || hasDamage) {
    const isVagueDamage = /etwas ist kaputt|ich habe ein problem|es funktioniert nicht|in der kuche ist etwas kaputt|in der küche ist etwas kaputt/i.test(
      haystack,
    );
    const isKitchen = /kitchen/i.test(haystack);
    return {
      subjectKey: isKitchen ? "kitchen" : "this",
      type: hasDamage && !isVagueDamage ? "damage" : "area_vague",
      specific: hasDamage && !isVagueDamage && !/something is broken|problem in the kitchen|need help with maintenance/i.test(haystack),
    };
  }

  return {
    subjectKey: "this",
    type: "generic_vague",
    specific: false,
  };
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

  if (/\bnoise|smell|odor|geräusch|laut|vibration|geruch|heiss|hot/i.test(combinedText)) {
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

function formatQuotedBlock(title, text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return "";
  }
  return `${title}\n"${normalized}"`;
}

function prefixSuggestedDescriptionWithErrorCode(description, code, options = {}) {
  const normalizedDescription = normalizeText(description);
  const normalizedCode = normalizeCode(code);
  if (!normalizedDescription || !normalizedCode) {
    return normalizedDescription;
  }

  const prefixed = `${normalizedCode}: ${normalizedDescription}`.trim();
  if (options.boldPrefix) {
    return prefixed.replace(new RegExp(`^${normalizedCode}:`), `**${normalizedCode}:**`);
  }
  return prefixed;
}

function getClaimFormHelpClosingSentence(language) {
  return t(language).claimFormHelpClosing;
}

function buildClaimFormHelpActions(language, promptOverride = "") {
  const label = t(language).claimFormHelpAction;
  const prompt = normalizeText(promptOverride) || label;
  return [{ id: "claim_form_help", label, prompt }];
}

function buildClaimFormHelpPromptForMatch(language, topMatch) {
  const label = t(language).claimFormHelpAction;
  const code = normalizeCode(topMatch?.code);
  if (code) {
    return `${label} for ${applianceTypeLabel(topMatch?.applianceType)} error code ${code}`;
  }
  return `${label} for ${applianceTypeLabel(topMatch?.applianceType)}`;
}

function getClaimFormNextStep(language) {
  return t(language).claimFormNextStep;
}

function buildCompactSupportAnswer({
  language,
  intro,
  stepsTitle,
  steps,
  includeClaimFormHelpAction = false,
  claimFormHelpPrompt = "",
}) {
  const copy = t(language);
  const answer = [
    intro,
    formatSection(stepsTitle || copy.claimFormTrySteps, steps || []),
    copy.claimFormNextStep,
    copy.claimFormHelpClosing,
  ]
    .filter(Boolean)
    .join("\n\n");
  return includeClaimFormHelpAction
    ? {
      answer,
      actions: buildClaimFormHelpActions(language, claimFormHelpPrompt),
    }
    : { answer };
}

function normalizeAssistantReturn(value) {
  if (value && typeof value === "object" && typeof value.answer === "string") {
    return value;
  }
  return { answer: String(value ?? "") };
}

function buildClaimFormHelpAnswer({ language, claimGuidance, description }) {
  const copy = t(language);
  const normalizedDescription = normalizeText(description);
  const displayDescription = normalizedDescription.replace(
    /^([A-Z]\d{1,2}:)/,
    (match) => `**${match}**`,
  );
  const answer = [
    formatSection(copy.claimFormForForm, claimGuidance || []),
    formatQuotedBlock(copy.claimFormSuggestedDescription, displayDescription),
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    answer,
    ...(normalizedDescription ? { suggestedProblemDescription: normalizedDescription } : {}),
  };
}

function buildUnsupportedKnowledgeAnswer(language) {
  const copy = t(language);
  return [
    copyText(copy, "unsupportedKnowledge"),
    copyText(copy, "unsupportedKnowledgeAsk"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function hasOnlyDishwasherErrorCodeDisplayContext(text) {
  const haystack = normalizeText(text).toLowerCase();
  const mentionsDisplayError = /\berror code\b|shows an error|code on the display|display|anzeige|fehlercode/.test(haystack);
  const hasExplicitCode = extractErrorCodes(haystack).length > 0;
  const hasOtherSpecificSymptom = /\btemperature\b|\bheating\b|water stays cold|not heating|does not heat|cold water|\bnot taking in water\b|does not take in water|no water intake|water inlet|wasserzulauf|zulauf|not filling|\bnot draining\b|does not drain|drainage|drain problem|wasserablauf|ablauf|not pumping out|\bleak\b|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray/.test(
    haystack,
  );

  return mentionsDisplayError && !hasExplicitCode && !hasOtherSpecificSymptom;
}

function shouldAssumeDishwasherFromErrorCode(text, selectedAreas) {
  const normalizedText = normalizeText(text);
  const errorCodes = extractErrorCodes(normalizedText);
  if (!errorCodes.length) return false;

  const haystack = normalizedText.toLowerCase();
  const selectedAreaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  if (selectedAreaCategories.some((category) => category && category !== "dishwasher")) {
    return false;
  }

  const mentionsGeneralCategory =
    /\belectrical|electricity|light|lighting|lamp|socket|switch|power|fuse|breaker|strom|licht|leak|leaking|water issue|sink|tap|drain|blocked|clogged|damage|damaged|broken|oven|fridge|refrigerator|freezer|washing machine|dryer|hob|cooktop|extractor|hood/i.test(
      haystack,
    );
  if (mentionsGeneralCategory) {
    return false;
  }

  return /\berror\b|\bcode\b|\bdisplay\b|\bshown\b|\bi see\b|\bit says\b|^e\s*0?\d{1,2}$/i.test(haystack);
}

function buildGenericAnswer({ language, question, context, selectedAreas, claim }) {
  const copy = t(language);
  const focusLabel = normalizeText(context?.label);
  const questionText = normalizeText(question);

  if (isGreeting(questionText)) {
    return `${copy.greetingReply}\n\n${copy.greetingFollowUp}\n\n${copy.greetingExamples}`;
  }

  if (isSampleWordingRequest(questionText)) {
    return buildSampleWording(copy, claim || {}, focusLabel);
  }

  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const scopedAreas =
    context?.type === "area" && focusLabel
      ? selectedAreas.filter((area) => normalizeText(area.name) === focusLabel)
      : selectedAreas;
  const categories = dedupe([...scopedAreas.map(detectAreaCategory), ...detectTextCategories(combinedText)]);

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
    sections.unshift(
      context?.type === "area" && focusLabel
        ? copy.briefPromptWithArea.replace("{label}", focusLabel)
        : copy.briefPrompt,
    );
  }

  return sections.join("\n\n").trim();
}

function getDishwasherContext({ question, claim, selectedAreas }) {
  const questionText = normalizeText(question);
  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  const categories = dedupe([...areaCategories, ...detectTextCategories(combinedText)]);
  const explicitErrorCodes = extractErrorCodes(combinedText);
  const inferredErrorCodes = inferDishwasherCodesFromSymptoms(combinedText);
  const errorCodes = dedupe([...explicitErrorCodes, ...inferredErrorCodes]);
  const hasDishwasherContext =
    categories.includes("dishwasher")
    || /amica|dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaşık|lavavajillas|lave-vaisselle|посудомо/i.test(combinedText);

  return {
    combinedText,
    categories,
    explicitErrorCodes,
    inferredErrorCodes,
    errorCodes,
    hasDishwasherContext,
  };
}

function getDishwasherContextResolved({ question, claim, selectedAreas }) {
  const questionText = normalizeText(question);
  const descriptionText = normalizeText(claim?.problemDescription);
  const combinedText = `${questionText}\n${descriptionText}`.trim();
  const explicitErrorCodesFromQuestion = extractErrorCodes(questionText);
  const hasCurrentExplicitCodes = explicitErrorCodesFromQuestion.length > 0;
  const matchingText = hasCurrentExplicitCodes ? questionText : combinedText;
  const areaCategories = arrayValue(selectedAreas).map(detectAreaCategory);
  const categories = dedupe([...areaCategories, ...detectTextCategories(matchingText)]);
  const hasDishwasherContext =
    categories.includes("dishwasher")
    || /dishwasher|geschirrsp|spulmaschine|spuelmaschine|lavavajillas|lave-vaisselle/i.test(matchingText);
  const explicitErrorCodes = hasCurrentExplicitCodes
    ? explicitErrorCodesFromQuestion
    : extractErrorCodes(combinedText);
  const inferredErrorCodes = hasDishwasherContext && hasCurrentExplicitCodes
    ? inferDishwasherCodesFromSymptoms(questionText)
    : hasDishwasherContext
      ? inferDishwasherCodesFromSymptoms(combinedText)
      : [];
  const errorCodes = dedupe([...explicitErrorCodes, ...inferredErrorCodes]);

  return {
    combinedText: matchingText,
    categories,
    applianceTypes: detectKnowledgeApplianceTypes(matchingText, selectedAreas),
    explicitErrorCodes,
    inferredErrorCodes,
    errorCodes,
    sessionErrorCodes: errorCodes,
    hasDishwasherContext,
    hasCurrentExplicitCodes,
  };
}

function enrichDishwasherContextWithConversation(baseContext, conversationMessages) {
  const conversationText = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.text)
    .join("\n")
    .trim();
  const combinedText = `${conversationText}\n${baseContext.combinedText}`.trim();
  const categories = dedupe([...baseContext.categories, ...detectTextCategories(combinedText)]);
  const hasCurrentExplicitCodes = baseContext.hasCurrentExplicitCodes === true;
  const explicitErrorCodes = hasCurrentExplicitCodes
    ? baseContext.explicitErrorCodes
    : dedupe([...baseContext.explicitErrorCodes, ...extractErrorCodes(conversationText)]);
  const hasDishwasherContext =
    baseContext.hasDishwasherContext
    || categories.includes("dishwasher")
    || /amica|dishwasher|geschirrsp|geschirrsp[uü]l|geschirrspul|sp[uü]lmaschine|sp[uü]lmachine|sp[uü]lmaschiene|spulmaschine|spuelmaschine|bulaÅŸÄ±k|lavavajillas|lave-vaisselle|Ð¿Ð¾ÑÑƒÐ´Ð¾Ð¼Ð¾/i.test(combinedText);
  const inferredErrorCodes = hasCurrentExplicitCodes || !hasDishwasherContext
    ? baseContext.inferredErrorCodes
    : dedupe([...baseContext.inferredErrorCodes, ...inferDishwasherCodesFromSymptoms(conversationText)]);
  const errorCodes = dedupe([...explicitErrorCodes, ...inferredErrorCodes]);
  const sessionErrorCodes = dedupe([
    ...arrayValue(baseContext.explicitErrorCodes),
    ...arrayValue(baseContext.inferredErrorCodes),
    ...extractErrorCodes(conversationText),
    ...(hasDishwasherContext ? inferDishwasherCodesFromSymptoms(conversationText) : []),
  ]);

  return {
    combinedText: hasCurrentExplicitCodes ? baseContext.combinedText : combinedText,
    categories,
    applianceTypes: dedupe([
      ...arrayValue(baseContext.applianceTypes),
      ...detectKnowledgeApplianceTypes(hasCurrentExplicitCodes ? baseContext.combinedText : combinedText),
    ]),
    explicitErrorCodes,
    inferredErrorCodes,
    errorCodes,
    sessionErrorCodes,
    hasDishwasherContext,
  };
}

function hasLeakOverflowContext(text) {
  return /\bleak|leaking|overflow|base tray|bodenwanne|continuous pumping|pumps continuously|pumpt dauerhaft|water in the base tray|water in base tray|undicht|austritt|wasser in der bodenwanne/i.test(
    text,
  );
}

function hasSpecificDishwasherSymptom(text) {
  return /\be[0-9]{1,2}\b|temperature|heating|cold|water inlet|zulauf|drain|draining|ablauf|pump|pumping|leak|leaking|overflow|base tray|bodenwanne|undicht|display|error code|error|not start|does not start|not heating|water stays cold/i.test(
    text,
  );
}

function getIssueSummaryKeyLegacy(titleKey) {
  return formatDishwasherIssueSummary(
    findDishwasherTroubleshootingGuide({ language: "en", issueKey: titleKey }),
    "en",
  );
}

function getWaterInletResponseCopyLegacy(language, code) {
  const guide = buildGuideForMatch(
    { applianceType: "dishwasher", code: code || "E1", titleKey: "water_inlet" },
    language === "tr" ? "en" : language,
  );
  return {
    whatItMeans: guide?.description ? [guide.description] : [],
    actions: guide?.troubleshootingSteps || [],
    claimGuidance: guide?.claimGuidance || [],
    suggestedDescription: guide?.suggestedDescription || "",
  };
}

function getRelevantImmediateActionKeys(titleKey, context, matches) {
  const actionKeys = [];

  if (titleKey === "water_inlet") {
    actionKeys.push("check_water_tap", "check_inlet_hose_kinks", "clean_hose_connection_filter", "unplug_one_to_two_minutes");
  }
  if (titleKey === "heating_temperature") {
    actionKeys.push("unplug_one_to_two_minutes", "inspect_inner_filters_for_dirt");
  }
  if (titleKey === "drainage") {
    actionKeys.push("clean_filters", "check_drain_hose", "check_pump_blockage", "unplug_one_to_two_minutes");
  }
  if (titleKey === "leak_overflow") {
    actionKeys.push("check_base_tray_for_water");
    if (hasLeakOverflowContext(context.combinedText)) {
      actionKeys.push("tilt_forward_to_drain_base_tray_water");
    }
  }

  for (const entry of matches.immediateMatches) {
    for (const key of arrayValue(entry.actionKeys)) {
      if (key === "tilt_forward_to_drain_base_tray_water" && !hasLeakOverflowContext(context.combinedText)) {
        continue;
      }
      actionKeys.push(key);
    }
  }

  const dedupedKeys = dedupe(actionKeys);
  if (titleKey === "drainage" && dedupedKeys.includes("clean_filters")) {
    return dedupedKeys.filter((key) => key !== "inspect_inner_filters_for_dirt");
  }
  return dedupedKeys;
}

function buildClaimGuidanceItemsLegacy(copy, claim, categories, selectedAreas, topMatch, context, language) {
  const guide = buildGuideForMatch(topMatch, language);
  if (guide?.claimGuidance?.length) return guide.claimGuidance;

  const steps = [];

  if (topMatch?.code) {
    steps.push(`Mention ${normalizeCode(topMatch.code)} in your claim if it appears on the display or matches the issue.`);
  }
  if (!normalizeText(claim.contractNumber)) {
    steps.push(copy.nextMissingContract);
  }
  if (!selectedAreas.length) {
    steps.push(copy.nextMissingArea);
  }
  if (categories.some(isApplianceCategory) && !normalizeText(claim.serialNumber)) {
    steps.push(copy.nextMissingSerial);
  }
  if (!claim.attachmentCount) {
    if (topMatch?.code || /\bdisplay|error|code|anzeige|fehler/i.test(context.combinedText)) {
      steps.push("Attach a photo of the display or error if possible.");
    } else {
      steps.push(copy.nextMissingAttachments);
    }
  }
  if (!normalizeText(claim.availabilityDate) && !normalizeText(claim.availabilityTime)) {
    steps.push(copy.nextMissingAvailability);
  }
  if (!claim.hasPhone && !claim.hasEmail) {
    steps.push(copy.nextMissingContact);
  }

  return dedupe(steps).slice(0, 5);
}

function buildSuggestedProblemDescriptionLegacy(topMatch, context, language) {
  const guide = buildGuideForMatch(topMatch, language);
  if (guide?.suggestedDescription) {
    return prefixSuggestedDescriptionWithErrorCode(guide.suggestedDescription, topMatch?.code);
  }

  const fallback = normalizeText(context.combinedText).replace(/\s+/g, " ");
  const applianceLabel = applianceTypeLabel(topMatch?.applianceType);
  if (!fallback) {
    return prefixSuggestedDescriptionWithErrorCode(
      `My architecto ${applianceLabel} is not working properly. Please check the appliance and advise on the next step.`,
      topMatch?.code,
    );
  }
  return prefixSuggestedDescriptionWithErrorCode(
    `My architecto ${applianceLabel} has the following issue: ${fallback}. Please check the appliance and advise on the next step.`,
    topMatch?.code,
  );
}

function scoreKnowledgeEntry(entry, combinedText, errorCodes) {
  let score = 0;
  const normalizedCombinedText = normalizeLanguageHintText(combinedText);
  const matchedApplianceTypes = detectKnowledgeApplianceTypes(normalizedCombinedText);
  if (entry.code && errorCodes.includes(normalizeCode(entry.code))) {
    score += 1000;
  }

  for (const term of arrayValue(entry.triggerTerms)) {
    const normalizedTerm = normalizeText(term).toLowerCase();
    if (normalizedTerm && fuzzyTextIncludesPhrase(normalizedCombinedText, normalizedTerm)) {
      score += entry.topicType === "error_code" ? 40 : 15;
    }
  }

  if (entry.topicType === "immediate_step") {
    score += 5;
  }

  if (score > 0 && matchedApplianceTypes.includes(normalizeText(entry.applianceType))) {
    score += 80;
  } else if (score > 0 && matchedApplianceTypes.length > 0) {
    score -= 25;
  }

  return score;
}

function translateKnowledgeList(keys, language) {
  const dictionary = knowledgeText(language).details;
  return dedupe(arrayValue(keys).map((key) => dictionary[key] || null));
}

function renderKnowledgeEntry(entry, language, copy) {
  const knowledgeCopy = knowledgeText(language);
  const codeLabel = entry.code ? `${normalizeCode(entry.code)} (${knowledgeCopy.titles[entry.titleKey] || entry.titleKey})` : (knowledgeCopy.titles[entry.titleKey] || entry.titleKey);
  const sections = [`${copy.knowledgeGeneralCode}: ${codeLabel}`];

  const symptoms = translateKnowledgeList(entry.symptomKeys, language);
  const checks = translateKnowledgeList(entry.checkKeys, language);
  const causes = translateKnowledgeList(entry.causeKeys, language);
  const actions = translateKnowledgeList(entry.actionKeys, language);

  if (symptoms.length) sections.push(formatSection(copy.knowledgeSymptomsTitle, symptoms));
  if (checks.length) sections.push(formatSection(copy.knowledgeChecksTitle, checks));
  if (causes.length) sections.push(formatSection(copy.knowledgeCausesTitle, causes));
  if (actions.length) sections.push(formatSection(copy.knowledgeActionsTitle, actions));

  return sections.filter(Boolean).join("\n");
}

function selectKnowledgeMatches(entries, context) {
  const scored = entries
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(entry, context.combinedText.toLowerCase(), context.errorCodes),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.priority - a.entry.priority || a.entry.slug.localeCompare(b.entry.slug));

  const primaryMatches = [];
  const codeMatches = [];
  const immediateMatches = [];

  for (const item of scored) {
    if (item.entry.topicType === "error_code" || item.entry.topicType === "issue") {
      if (!primaryMatches.some((entry) => entry.slug === item.entry.slug)) {
        primaryMatches.push(item.entry);
      }
    }
    if (item.entry.topicType === "error_code") {
      if (!codeMatches.some((entry) => entry.slug === item.entry.slug)) {
        codeMatches.push(item.entry);
      }
      continue;
    }
    if (item.entry.topicType === "immediate_step" && !immediateMatches.some((entry) => entry.slug === item.entry.slug)) {
      immediateMatches.push(item.entry);
    }
  }

  if (context.errorCodes.includes("E4") && !immediateMatches.some((entry) => entry.titleKey === "check_base_tray")) {
    const fallbackBaseTray = entries.find((entry) => entry.titleKey === "check_base_tray");
    if (fallbackBaseTray) immediateMatches.push(fallbackBaseTray);
  }

  return {
    primaryMatches: primaryMatches.slice(0, 3),
    codeMatches: codeMatches.slice(0, 2),
    immediateMatches: immediateMatches.slice(0, 3),
  };
}

function getLatestExplicitDishwasherCode(question, conversationMessages, claim) {
  const currentQuestionCodes = extractErrorCodes(question);
  if (currentQuestionCodes.length) {
    return currentQuestionCodes[0];
  }

  const latestConversationCode = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice()
    .reverse()
    .flatMap((message) => extractErrorCodes(message.text))[0];
  if (latestConversationCode) {
    return latestConversationCode;
  }

  const claimCodes = extractErrorCodes(normalizeText(claim?.problemDescription));
  if (claimCodes.length) {
    return claimCodes[claimCodes.length - 1];
  }

  return "";
}

function prioritizeKnowledgeMatchesByCode(matches, preferredCode) {
  const normalizedPreferredCode = normalizeCode(preferredCode);
  if (!normalizedPreferredCode) {
    return matches;
  }
  const preferredAliases = new Set(errorCodeAliases(normalizedPreferredCode));

  const preferredMatch = arrayValue(matches?.codeMatches).find(
    (entry) => preferredAliases.has(normalizeCode(entry?.code)),
  );
  if (!preferredMatch) {
    return matches;
  }

  return {
    ...matches,
    primaryMatches: [
      preferredMatch,
      ...arrayValue(matches?.primaryMatches).filter((entry) => entry?.slug !== preferredMatch.slug),
    ],
    codeMatches: [
      preferredMatch,
      ...arrayValue(matches?.codeMatches).filter((entry) => entry?.slug !== preferredMatch.slug),
    ],
  };
}

function mergeKnowledgeEntries(databaseEntries, fallbackEntries) {
  const mergedBySlug = new Map();

  for (const entry of [...arrayValue(fallbackEntries), ...arrayValue(databaseEntries)]) {
    const slug = normalizeText(entry?.slug);
    if (!slug) continue;
    mergedBySlug.set(slug, entry);
  }

  return [...mergedBySlug.values()].sort((a, b) =>
    (Number(b?.priority || 0) - Number(a?.priority || 0))
    || String(a?.slug || "").localeCompare(String(b?.slug || ""))
  );
}

async function loadServiceClaimKnowledgeEntries(applianceTypes = []) {
  const normalizedApplianceTypes = dedupe(arrayValue(applianceTypes).map((value) => normalizeText(value)));
  const fallbackEntries = arrayValue(SERVICE_CLAIM_TROUBLESHOOTING_DATA?.lookupEntries).filter((entry) =>
    !normalizedApplianceTypes.length || normalizedApplianceTypes.includes(normalizeText(entry?.applianceType))
  );

  try {
    const databaseEntries = await prisma.serviceClaimKnowledgeEntry.findMany({
      where: {
        brand: "Amica",
        ...(normalizedApplianceTypes.length ? { applianceType: { in: normalizedApplianceTypes } } : {}),
        isActive: true,
      },
      orderBy: [
        { priority: "desc" },
        { slug: "asc" },
      ],
    });
    return mergeKnowledgeEntries(databaseEntries, fallbackEntries);
  } catch {
    return mergeKnowledgeEntries([], fallbackEntries);
  }
}

function buildKnowledgeAnswerLegacy({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const copy = t(language);
  const topMatch = matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  const issueSummary = getIssueSummaryKeyLegacy(topMatch.titleKey);
  const explicitCodeMentioned = arrayValue(dishwasherContext.explicitErrorCodes).includes(normalizeCode(topMatch.code));
  const intro = topMatch.code
    ? `${copy.knowledgeIntroStart}${issueSummary}${
        explicitCodeMentioned
          ? copy.knowledgeCodeExplicit.replace("{code}", normalizeCode(topMatch.code))
          : copy.knowledgeCodeImplicit.replace("{code}", normalizeCode(topMatch.code))
      }`
    : `${copy.knowledgeIntroStart}${issueSummary}.`;
  const troubleshootingActions = translateKnowledgeList(
    getRelevantImmediateActionKeys(topMatch.titleKey, dishwasherContext, matches),
    language,
  ).slice(0, 4);
  const claimGuidance = buildClaimGuidanceItems(copy, claim || {}, [], selectedAreas, topMatch, dishwasherContext, language);
  const suggestedDescription = buildSuggestedProblemDescription(topMatch, dishwasherContext, language);
  const displayedActions =
    topMatch.titleKey === "water_inlet"
      ? getWaterInletResponseCopy(language, topMatch.code).actions
      : troubleshootingActions;
  const outro = topMatch.titleKey === "water_inlet" ? copy.waterInletOutro : copy.claimFormCopyOutro;

  return buildSpecificSupportAnswer({
    language,
    intro,
    steps: displayedActions,
    claimGuidance,
    description: suggestedDescription,
    outro,
  });
}

function getIssueSummaryKeyByLanguage(titleKey, language) {
  return formatDishwasherIssueSummary(
    findTroubleshootingGuide({ language, applianceType: "dishwasher", issueKey: titleKey }),
    language,
  );
}

function buildClarifyingAnswer({ intro, lead, options, detailPrompt }) {
  const segments = [
    intro,
    lead,
    options.map((item) => `- ${item}`).join("\n"),
    detailPrompt,
  ].filter((segment) => normalizeText(segment) !== "");
  return segments.join("\n\n");
}

function buildSpecificSupportAnswer({ language, intro, stepsTitle, steps, claimTitle, claimGuidance, descriptionTitle, description, outro }) {
  const copy = t(language);
  return [
    intro,
    formatSection(stepsTitle || copy.claimFormTrySteps, steps),
    formatSection(claimTitle || copy.claimFormForForm, claimGuidance),
    formatQuotedBlock(descriptionTitle || copy.claimFormSuggestedDescription, description),
    outro == null ? copy.claimFormCopyOutro : outro,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildGeneralClarifyingAnswer(context, language) {
  const copy = t(language);
  const applianceIntro =
    language === "de"
      ? copy.generalClarifyApplianceIntro
      : applySubjectTemplate(copy.generalClarifyApplianceIntroWithSubject, copy, context.subjectKey);

  if (context.type === "appliance_vague") {
    return buildClarifyingAnswer({
      intro: applianceIntro,
      lead: copy.generalClarifyLead,
      options: [
        copy.generalClarifyApplianceOpt1,
        copy.generalClarifyApplianceOpt2,
        copy.generalClarifyApplianceOpt3,
        copy.generalClarifyApplianceOpt4,
        copy.generalClarifyApplianceOpt5,
      ],
      detailPrompt: copy.generalClarifyApplianceDetail,
    });
  }

  const genericIntro =
    context.subjectKey === "kitchen" ? copy.generalClarifyKitchenIntro : copy.generalClarifyGenericIntro;

  return buildClarifyingAnswer({
    intro: genericIntro,
    lead: copy.generalClarifyLead,
    options: [
      copy.generalClarifyKitchenOpt1,
      copy.generalClarifyKitchenOpt2,
      copy.generalClarifyKitchenOpt3,
      copy.generalClarifyKitchenOpt4,
      copy.generalClarifyKitchenOpt5,
    ],
    detailPrompt: copy.generalClarifyGenericDetail,
  });
}

function getGeneralSpecificSupportData(context, language) {
  if (language === "de") {
    if (context.type === "appliance_choice") {
      return {
        intro: "Welches Gerät funktioniert nicht?",
        options: [
          "Spülmaschine",
          "Backofen",
          "Kühlschrank oder Gefrierschrank",
          "Waschmaschine oder Trockner",
          "Kochfeld oder Herd",
          "Dunstabzugshaube",
          "Ein anderes Gerät",
        ],
      };
    }

    if (context.type === "leak") {
      return {
        intro: "Das klingt nach einem Leck oder Wasserproblem.",
        steps: [
          "Wenn Wasser austritt, benutzen Sie den betroffenen Bereich vorerst nicht weiter.",
          "Wischen Sie stehendes Wasser auf, wenn das sicher möglich ist.",
          "Prüfen Sie, wo das Wasser austritt, zum Beispiel unter der Spüle, am Wasserhahn, am Schlauch oder am Gerät.",
          "Machen Sie ein Foto der nassen Stelle oder der undichten Verbindung.",
        ],
        claimGuidance: ["Geben Sie an, wo das Wasser austritt und ob es dauerhaft tropft oder plötzlich ausgelaufen ist."],
        description:
          "Es gibt ein Leck oder Wasserproblem im betroffenen Bereich. Wasser tritt aus oder sammelt sich dort. Bitte prüfen Sie die Ursache und veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "drainage") {
      return {
        intro: "Das klingt nach einer Verstopfung oder einem Ablaufproblem.",
        steps: [
          "Benutzen Sie Spüle oder Ablauf nicht weiter, wenn sich das Wasser zurückstaut.",
          "Prüfen Sie, ob der Ablauf komplett blockiert ist oder nur langsam abläuft.",
          "Entfernen Sie stehendes Wasser, wenn das sicher möglich ist.",
          "Machen Sie ein Foto, falls die Verstopfung oder Überlaufspur sichtbar ist.",
        ],
        claimGuidance: ["Geben Sie an, dass Spüle oder Ablauf verstopft sind oder nicht richtig ablaufen, und fügen Sie wenn möglich ein Foto hinzu."],
        description:
          "Die Spüle oder der Ablauf ist verstopft oder läuft nicht richtig ab. Das Wasser läuft nur langsam ab oder staut sich zurück. Bitte prüfen Sie den Fall oder veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "electrical") {
      return {
        intro: "Das klingt nach einem Strom- oder Beleuchtungsproblem.",
        steps: [
          "Wenn es sicher ist, benutzen Sie die betroffene Leuchte, den Schalter oder die Steckdose vorerst nicht weiter.",
          "Prüfen Sie, ob nur ein einzelner Punkt betroffen ist oder der ganze Bereich.",
          "Notieren Sie Flackern, Stromausfall oder eine ausgelöste Sicherung.",
          "Machen Sie ein Foto, falls ein sichtbarer Schaden vorhanden ist.",
        ],
        claimGuidance: ["Geben Sie an, welcher Bereich betroffen ist und ob kein Strom vorhanden ist, etwas flackert oder ein sichtbarer Schaden vorliegt."],
        description:
          "Im betroffenen Bereich liegt ein Strom- oder Beleuchtungsproblem vor. Bitte prüfen Sie die Installation und teilen Sie mir die nächsten Schritte mit oder veranlassen Sie eine Reparatur.",
      };
    }

    if (context.type === "damage") {
      return {
        intro: "Was genau ist kaputt oder beschädigt?",
        steps: [
          "Schrank oder Tür",
          "Arbeitsplatte",
          "Gerät",
          "Fenster oder Tür",
          "Möbel",
          "Sonstiger Bereich",
        ],
      };
    }

    if (context.type === "damage_choice") {
      return {
        intro: "Was genau ist kaputt oder beschädigt?",
        steps: [
          "Schrank oder Tür",
          "Arbeitsplatte",
          "Gerät",
          "Fenster oder Tür",
          "Möbel",
          "Sonstiger Bereich",
        ],
      };
    }

    return null;
  }

  const copy = t(language);

  if (context.type === "appliance_choice") {
    return {
      intro: copy.applianceChoiceIntro,
      options: [
        copy.applianceChoiceDishwasher,
        copy.applianceChoiceOven,
        copy.applianceChoiceFridge,
        copy.applianceChoiceWasher,
        copy.applianceChoiceHob,
        copy.applianceChoiceHood,
        copy.applianceChoiceOther,
      ],
    };
  }

  if (context.type === "leak") {
    return {
      intro: applySubjectTemplate(copy.generalLeakIntro, copy, context.subjectKey),
      steps: [copy.generalLeakStep1, copy.generalLeakStep2, copy.generalLeakStep3, copy.generalLeakStep4],
      claimGuidance: [copy.generalLeakClaim1],
      description: copy.generalLeakDescription,
    };
  }

  if (context.type === "drainage") {
    return {
      intro: applySubjectTemplate(copy.generalDrainageIntro, copy, context.subjectKey),
      steps: [
        copy.generalDrainageStep1,
        copy.generalDrainageStep2,
        copy.generalDrainageStep3,
        copy.generalDrainageStep4,
      ],
      claimGuidance: [copy.generalDrainageClaim1],
      description: copy.generalDrainageDescription,
    };
  }

  if (context.type === "electrical") {
    return {
      intro: applySubjectTemplate(copy.generalElectricalIntro, copy, context.subjectKey),
      steps: [
        copy.generalElectricalStep1,
        copy.generalElectricalStep2,
        copy.generalElectricalStep3,
        copy.generalElectricalStep4,
      ],
      claimGuidance: [copy.generalElectricalClaim1],
      description: copy.generalElectricalDescription,
    };
  }

  if (context.type === "damage") {
    return {
      intro: applySubjectTemplate(copy.generalDamageIntro, copy, context.subjectKey),
      steps: [copy.generalDamageStep1, copy.generalDamageStep2, copy.generalDamageStep3],
      claimGuidance: [copy.generalDamageClaim1],
      description: copy.generalDamageDescription,
    };
  }

  return null;
}

function buildGeneralSpecificAnswer(context, language, formHelpOnly = false) {
  const support = getGeneralSpecificSupportData(context, language);
  if (!support) return "";

  if (context.type === "appliance_choice") {
    return buildClarifyingAnswer({
      intro: support.intro,
      lead: "",
      options: support.options,
      detailPrompt: "",
    });
  }

  if (context.type === "damage" || context.type === "damage_choice") {
    const copy = t(language);
    return buildSpecificSupportAnswer({
      language,
      intro: support.intro,
      stepsTitle: copy.claimFormDamageStepsTitle,
      steps: support.steps,
      claimTitle: "",
      claimGuidance: [],
      descriptionTitle: "",
      description: "",
      outro: "",
    });
  }

  if (formHelpOnly) {
    return buildClaimFormHelpAnswer({
      language,
      claimGuidance: support.claimGuidance,
      description: support.description,
    });
  }

  return buildCompactSupportAnswer({
    language,
    intro: support.intro,
    steps: support.steps,
    includeClaimFormHelpAction: false,
  });
}

function buildDishwasherClarifyingAnswer(language) {
  const copy = t(language);
  return buildClarifyingAnswer({
    intro: copy.dishwasherClarifyIntro,
    lead: copy.dishwasherClarifyLead,
    options: [
      copy.dishwasherOptionNotHeating,
      copy.dishwasherOptionNoWater,
      copy.dishwasherOptionNotDraining,
      copy.dishwasherOptionLeakPump,
      copy.dishwasherOptionCode,
    ],
    detailPrompt: copy.dishwasherDetailPrompt,
  });
}

function buildDishwasherErrorCodePromptAnswer(language) {
  const copy = t(language);
  const codeLines = buildDishwasherErrorCodeList(language);
  return [copy.dishwasherCodeAsk, [copy.dishwasherCodeListIntro, ...codeLines].join("\n"), copy.dishwasherCodeOutro].join(
    "\n\n",
  );
}

function getWaterInletResponseCopy(language, code) {
  const copy = t(language);
  const guide = buildGuideForMatch({ applianceType: "dishwasher", code: code || "E1", titleKey: "water_inlet" }, language);
  return {
    whatItMeans: guide?.description ? [guide.description] : [],
    actions: guide?.troubleshootingSteps || [],
    claimGuidance: guide?.claimGuidance || [],
    suggestedDescription: guide?.suggestedDescription || "",
    outro: copy.waterInletOutro,
  };
}

function buildClaimGuidanceItems(copy, claim, categories, selectedAreas, topMatch, context, language) {
  const guide = buildGuideForMatch(topMatch, language);
  return guide?.claimGuidance || [];
}

function buildSuggestedProblemDescription(topMatch, context, language) {
  const guide = buildGuideForMatch(topMatch, language);
  if (guide?.suggestedDescription) {
    return prefixSuggestedDescriptionWithErrorCode(guide.suggestedDescription, topMatch?.code);
  }

  const fallback = normalizeText(context.combinedText).replace(/\s+/g, " ");
  const applianceLabel = applianceTypeLabel(topMatch?.applianceType);
  if (!fallback) {
    return prefixSuggestedDescriptionWithErrorCode(
      `My architecto ${applianceLabel} is not working properly. Please check the appliance and advise on the next step.`,
      topMatch?.code,
    );
  }
  return prefixSuggestedDescriptionWithErrorCode(
    `My architecto ${applianceLabel} has the following issue: ${fallback}. Please check the appliance and advise on the next step.`,
    topMatch?.code,
  );
}

function hasDishwasherCode(context, code) {
  const aliases = new Set(errorCodeAliases(code).map(normalizeCode));
  return [
    ...arrayValue(context?.errorCodes),
    ...arrayValue(context?.sessionErrorCodes),
    ...arrayValue(context?.explicitErrorCodes),
  ].some((value) => aliases.has(normalizeCode(value)));
}

function getDishwasherClaimEvidence(codes) {
  const evidence = ["photo of display/error code", "product model/serial number", "short description of what the user already checked"];
  if (codes.some((code) => ["E02", "E2"].includes(normalizeCode(code)))) {
    evidence.push("photo or short note if water remains inside");
  }
  return [...new Set(evidence)];
}

function buildDishwasherCodeSuggestedDescription(codes) {
  const normalizedCodes = dedupe(codes.flatMap(errorCodeAliases)).filter((code) => ["E02", "E2", "E3"].includes(normalizeCode(code)));
  const hasDrainage = normalizedCodes.some((code) => ["E02", "E2"].includes(normalizeCode(code)));
  const hasHeating = normalizedCodes.some((code) => normalizeCode(code) === "E3");

  if (hasDrainage && hasHeating) {
    return "My architecto dishwasher shows E02/E2 and E3. It is not draining properly and also appears to have a heating/temperature issue. I checked the filters, drain hose, pump area, and reset the appliance, but the issue remains. Please arrange a service check.";
  }

  if (hasHeating) {
    return "My architecto dishwasher shows error E3 and does not heat properly. The water stays cold or the required temperature is not reached. I reset the appliance and checked the filters, but the issue remains. Please arrange a service check.";
  }

  return "";
}

function buildDirectDishwasherServiceAnswer({ language, topMatch, guide, dishwasherContext }) {
  const currentCode = normalizeCode(topMatch?.code);
  const hasDrainageAndHeating = hasDishwasherCode(dishwasherContext, "E02") && hasDishwasherCode(dishwasherContext, "E3");
  const shouldUseDirectServiceAnswer = currentCode === "E3" || hasDrainageAndHeating;
  if (!shouldUseDirectServiceAnswer) {
    return null;
  }

  const codes = hasDrainageAndHeating ? ["E02", "E3"] : [currentCode];
  const suggestedDescription = buildDishwasherCodeSuggestedDescription(codes);
  const evidenceSection = formatSection("Helpful claim evidence", getDishwasherClaimEvidence(codes));

  if (hasDrainageAndHeating) {
    return {
      answer: [
        "Your dishwasher has shown both E02/E2 and E3. E02/E2 indicates a drainage problem, and E3 indicates a heating/temperature problem.",
        "If you already checked the filters, drain hose, pump area, and tried a reset, please continue with a service claim.",
        NO_FURTHER_SAFE_SELF_CHECK,
        evidenceSection,
      ].filter(Boolean).join("\n\n"),
      actions: buildClaimFormHelpActions(language, buildClaimFormHelpPromptForMatch(language, topMatch)),
      suggestedProblemDescription: suggestedDescription,
    };
  }

  const steps = guide?.troubleshootingSteps?.length
    ? guide.troubleshootingSteps
    : ["Unplug the dishwasher for 1 to 2 minutes to reset it.", "Check and clean the internal filters."];

  return {
    answer: [
      "Error E3 is a heating/temperature issue.",
      formatSection("You can safely try", steps),
      "If E3 still appears or the water stays cold, there is no further safe self-check I can recommend. Please continue with a service claim.",
      evidenceSection,
    ].filter(Boolean).join("\n\n"),
    actions: buildClaimFormHelpActions(language, buildClaimFormHelpPromptForMatch(language, topMatch)),
    suggestedProblemDescription: suggestedDescription,
  };
}

function buildKnowledgeAnswer({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const topMatch = matches.primaryMatches?.[0] || matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  const copy = t(language);
  const guide = buildGuideForMatch(topMatch, language);
  const explicitCodeMentioned = arrayValue(dishwasherContext.explicitErrorCodes).includes(normalizeCode(topMatch.code));
  const issueSummary = formatKnowledgeIssueSummary(guide, topMatch, language);
  const intro = topMatch.code
    ? `${copy.knowledgeIntroStart}${issueSummary}${
        explicitCodeMentioned
          ? copy.knowledgeCodeExplicit.replace("{code}", normalizeCode(topMatch.code))
          : copy.knowledgeCodeImplicit.replace("{code}", normalizeCode(topMatch.code))
      }`
    : `${copy.knowledgeIntroStart}${issueSummary}.`;
  const troubleshootingActions = guide?.troubleshootingSteps?.length
    ? guide.troubleshootingSteps
    : translateKnowledgeList(getRelevantImmediateActionKeys(topMatch.titleKey, dishwasherContext, matches), language).slice(0, 4);
  const directDishwasherServiceAnswer = buildDirectDishwasherServiceAnswer({
    language,
    topMatch,
    guide,
    dishwasherContext,
  });
  if (directDishwasherServiceAnswer) {
    return directDishwasherServiceAnswer;
  }

  return buildCompactSupportAnswer({
    language,
    intro,
    steps: troubleshootingActions,
    includeClaimFormHelpAction: true,
    claimFormHelpPrompt: buildClaimFormHelpPromptForMatch(language, topMatch),
  });
}

function buildKnowledgeClaimFormHelpAnswer({ language, question, context, selectedAreas, claim, matches, dishwasherContext }) {
  const topMatch = matches.primaryMatches?.[0] || matches.codeMatches[0] || null;
  if (!topMatch) {
    return buildGenericAnswer({ language, question, context, selectedAreas, claim });
  }

  return buildClaimFormHelpAnswer({
    language,
    claimGuidance: buildClaimGuidanceItems({}, claim || {}, [], selectedAreas, topMatch, dishwasherContext, language),
    description: buildSuggestedProblemDescription(topMatch, dishwasherContext, language),
  });
}

function normalizeClaimsMatchText(value) {
  return normalizeLanguageHintText(value).replace(/\s+/g, "");
}

function claimsEntryApplianceTypes(entry) {
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "fridge_freezer") return ["fridge", "freezer"];
  if (itemType === "induction_hob") return ["hob"];
  if (itemType === "extractor_hood") return ["extractor_hood"];
  return [itemType].filter(Boolean);
}

function claimsAreaApplianceTypes(selectedAreas) {
  return dedupe(arrayValue(selectedAreas).flatMap((area) => {
    const category = detectAreaCategory(area);
    if (category === "dishwasher") return ["dishwasher"];
    if (category === "washing-machine") return ["washing_machine"];
    if (category === "oven-hob") return ["oven", "hob"];
    if (category === "fridge") return ["fridge", "freezer"];
    if (category === "hood") return ["extractor_hood"];
    return [];
  }));
}

function getClaimsConversationText(conversationMessages) {
  return normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => message.text)
    .join(" ");
}

const NO_FURTHER_SAFE_SELF_CHECK =
  "There is no further safe self-check I can recommend for this issue. Please continue with a service claim.";

function isUnresolvedClaimsSelfCheck(question) {
  const normalized = normalizeLanguageHintText(question);
  return /\b(still|again|same|continues|continued|remain|remains|unsolved|not solved|did not work|didnt work|not fixed|after checking|after reset|after cleaning|after trying|no)\b/.test(normalized);
}

function claimsTermScore(entry, currentText, combinedText) {
  const currentCompact = normalizeClaimsMatchText(currentText);
  const combinedCompact = normalizeClaimsMatchText(combinedText);
  let score = 0;

  for (const term of arrayValue(entry?.matchTerms)) {
    const normalized = normalizeLanguageHintText(term);
    const compact = normalizeClaimsMatchText(term);
    if (!compact) continue;
    if (currentCompact.includes(compact)) score += Math.min(80, 20 + compact.length);
    else if (combinedCompact.includes(compact)) score += Math.min(35, 10 + compact.length);
    else if (fuzzyTextHasAny(normalizeLanguageHintText(currentText), [normalized])) score += 18;
  }

  const problemText = normalizeLanguageHintText(entry?.problem);
  const currentNormalized = normalizeLanguageHintText(currentText);
  const combinedNormalized = normalizeLanguageHintText(combinedText);
  if (problemText.includes("not working") && /\bnot working\b|\bdoes not work\b|\bdoesnt work\b|\bis not working\b/.test(currentNormalized)) {
    score += 35;
  } else if (problemText.includes("not working") && /\bnot working\b|\bdoes not work\b|\bdoesnt work\b|\bis not working\b/.test(combinedNormalized)) {
    score += 20;
  }
  const ignoredIssueWords = new Set([
    "amica",
    "appliance",
    "dishwasher",
    "hood",
    "extractor",
    "fridge",
    "freezer",
    "refrigerator",
    "washing",
    "machine",
    "oven",
    "hob",
    "induction",
    "cooking",
    "zone",
    "error",
    "signal",
    "problem",
  ]);
  const issueWords = normalizedTokens(problemText)
    .filter((token) => token.length >= 4 && !ignoredIssueWords.has(token));
  const currentTokens = new Set(normalizedTokens(currentText));
  const combinedTokens = new Set(normalizedTokens(combinedText));
  for (const token of issueWords) {
    if (currentTokens.has(token)) score += 8;
    else if (combinedTokens.has(token)) score += 3;
  }

  return score;
}

function claimsDecisionRank(decision) {
  return {
    URGENT_CLAIM_STOP_USE: 4,
    CREATE_CLAIM_SERVICE: 3,
    SELF_CHECK_FIRST_CLAIM_IF_UNSOLVED: 2,
    NO_CLAIM_NORMAL: 1,
  }[decision] || 0;
}

function findClaimsChatbotKnowledgeMatch({ question, claim, selectedAreas, conversationMessages }) {
  const currentText = [
    question,
    normalizeText(claim?.problemDescription),
    arrayValue(selectedAreas).map((area) => `${area?.code || ""} ${area?.name || ""}`).join(" "),
  ].join(" ");
  const conversationText = getClaimsConversationText(conversationMessages);
  const combinedText = `${currentText} ${conversationText}`;
  const compactCombined = normalizeClaimsMatchText(combinedText);
  const explicitCodes = extractErrorCodes(currentText);
  const typedApplianceTypes = detectKnowledgeApplianceTypes(combinedText, selectedAreas);
  const areaApplianceTypes = claimsAreaApplianceTypes(selectedAreas);
  const applianceTypes = dedupe([...typedApplianceTypes, ...areaApplianceTypes]);

  const scored = arrayValue(CLAIMS_CHATBOT_KNOWLEDGE?.entries)
    .map((entry) => {
      const aliasMatched = arrayValue(entry?.aliases).some((alias) =>
        compactCombined.includes(normalizeClaimsMatchText(alias))
      );
      const applianceMatched = claimsEntryApplianceTypes(entry).some((type) => applianceTypes.includes(type));
      const entryCodeText = normalizeClaimsMatchText(`${entry?.problem || ""} ${arrayValue(entry?.matchTerms).join(" ")}`);
      const supportsExplicitCode =
        !explicitCodes.length || explicitCodes.some((code) => entryCodeText.includes(normalizeClaimsMatchText(code)));
      const score = claimsTermScore(entry, currentText, combinedText)
        + (aliasMatched ? 80 : 0)
        + (applianceMatched ? 30 : 0)
        + (normalizeText(entry?.chatbotDecision) === "URGENT_CLAIM_STOP_USE" && /smoke|burning|cracked|leak|power cord|electrical/.test(normalizeLanguageHintText(currentText)) ? 25 : 0);
      return { entry, score: supportsExplicitCode ? score : 0, aliasMatched, applianceMatched };
    })
    .filter((item) => item.score >= 35 && (item.aliasMatched || item.applianceMatched))
    .sort((a, b) =>
      b.score - a.score
      || claimsDecisionRank(b.entry?.chatbotDecision) - claimsDecisionRank(a.entry?.chatbotDecision)
      || String(a.entry?.id || "").localeCompare(String(b.entry?.id || ""))
    );

  return scored[0]?.entry || null;
}

function buildClaimsEvidenceList(entry) {
  return arrayValue(entry?.evidenceToRequest).slice(0, 4);
}

function buildClaimsClaimPrompt(entry) {
  return `Show claim-form help for ${entry.model}: ${entry.problem}`;
}

function claimsSafeUserCheck(entry) {
  const safeCheck = normalizeText(entry?.safeUserCheck);
  if (
    normalizeText(entry?.itemType) === "oven"
    && normalizeLanguageHintText(entry?.problem) === "appliance does not work"
    && !/function|temperature/i.test(safeCheck)
  ) {
    return "Make sure the oven function and temperature are selected correctly, and check whether the household fuse/power supply is working.";
  }
  return safeCheck;
}

function claimsProductLabel(entry) {
  const labels = {
    dishwasher: "dishwasher",
    extractor_hood: "extractor hood",
    fridge_freezer: "fridge-freezer",
    induction_hob: "induction hob",
    washing_machine: "washing machine",
    oven: "oven",
  };
  const itemLabel = labels[normalizeText(entry?.itemType)] || "appliance";
  return `${itemLabel} ${entry.model}`.trim();
}

function collectRelatedClaimsEntries({ primaryEntry, question, claim, selectedAreas, conversationMessages }) {
  const currentText = [
    question,
    normalizeText(claim?.problemDescription),
    getClaimsConversationText(conversationMessages),
    arrayValue(selectedAreas).map((area) => `${area?.code || ""} ${area?.name || ""}`).join(" "),
  ].join(" ");
  const compact = normalizeClaimsMatchText(currentText);
  const primaryAliases = new Set(arrayValue(primaryEntry?.aliases).map(normalizeClaimsMatchText));
  const primaryApplianceTypes = claimsEntryApplianceTypes(primaryEntry);

  const related = arrayValue(CLAIMS_CHATBOT_KNOWLEDGE?.entries)
    .filter((entry) => entry?.id !== primaryEntry?.id)
    .filter((entry) => {
      const sameAlias = arrayValue(entry?.aliases).some((alias) => primaryAliases.has(normalizeClaimsMatchText(alias)));
      const sameAppliance = claimsEntryApplianceTypes(entry).some((type) => primaryApplianceTypes.includes(type));
      return sameAlias || sameAppliance;
    })
    .map((entry) => ({ entry, score: claimsTermScore(entry, currentText, currentText) }))
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);

  const explicitCodes = extractErrorCodes(currentText);
  const codeRelated = arrayValue(CLAIMS_CHATBOT_KNOWLEDGE?.entries).filter((entry) => {
    if (entry?.id === primaryEntry?.id) return false;
    const sameAppliance = claimsEntryApplianceTypes(entry).some((type) => primaryApplianceTypes.includes(type));
    if (!sameAppliance) return false;
    const entryCodeText = normalizeClaimsMatchText(`${entry?.problem || ""} ${arrayValue(entry?.matchTerms).join(" ")}`);
    return explicitCodes.some((code) => entryCodeText.includes(normalizeClaimsMatchText(code)));
  });

  return [primaryEntry, ...related, ...codeRelated]
    .filter(Boolean)
    .filter((entry, index, entries) => entries.findIndex((item) => item?.id === entry?.id) === index)
    .filter((entry, index, entries) => entries.findIndex((item) => normalizeText(item?.problem) === normalizeText(entry?.problem)) === index)
    .slice(0, 4);
}

function combineEvidenceToRequest(entries) {
  return [...new Set(arrayValue(entries).flatMap((entry) => buildClaimsEvidenceList(entry)))].slice(0, 5);
}

function buildClaimsSuggestedDescription(entry, unresolved = false, relatedEntries = []) {
  const entries = relatedEntries.length ? relatedEntries : [entry];
  const symptoms = entries.map((item) => item.problem).filter(Boolean).join("; ");
  const checks = [...new Set(entries.map((item) => claimsSafeUserCheck(item)).filter(Boolean))].join(" ");
  const checked = unresolved && checks ? ` I checked/tried: ${checks}` : "";
  return `My architecto ${claimsProductLabel(entry)} has this issue: ${symptoms}.${checked} The issue still remains. Please arrange a service check or advise on the next step.`;
}

function formatSuggestedClaimDescription(description) {
  const normalized = normalizeText(description);
  return normalized ? formatQuotedBlock("Suggested problem description", normalized) : "";
}

function buildClaimsChatbotKnowledgeAnswer({ language, question, entry, claim, selectedAreas, conversationMessages }) {
  if (!entry) return null;
  const decision = normalizeText(entry.chatbotDecision);
  const unresolved = decision === "SELF_CHECK_FIRST_CLAIM_IF_UNSOLVED" && isUnresolvedClaimsSelfCheck(question);
  const relatedEntries = collectRelatedClaimsEntries({ primaryEntry: entry, question, claim, selectedAreas, conversationMessages });
  const evidence = combineEvidenceToRequest(relatedEntries);
  const evidenceSection = evidence.length ? formatSection("Helpful claim evidence", evidence) : "";
  const suggestedDescription = buildClaimsSuggestedDescription(entry, true, relatedEntries);
  const safeUserCheck = claimsSafeUserCheck(entry);
  const isOvenNotWorking =
    normalizeText(entry?.itemType) === "oven"
    && normalizeLanguageHintText(entry?.problem) === "appliance does not work";

  if (decision === "NO_CLAIM_NORMAL") {
    const abnormalEvidence = evidence.length
      ? `If it is unusually loud, new, repeated, continuous, or combined with another fault, please add ${evidence.join(", ")} and continue with a claim.`
      : "If it becomes abnormal, repeated, or combined with another fault, please continue with a claim.";
    return {
      answer: [
        `For the architecto ${claimsProductLabel(entry)}, this can be normal: ${entry.problem}.`,
        safeUserCheck,
        `This can be normal behaviour and does not require a claim by itself. ${entry.claimTrigger}`,
        abnormalEvidence,
      ].filter(Boolean).join("\n\n"),
    };
  }

  if (decision === "URGENT_CLAIM_STOP_USE") {
    return {
      answer: [
        `For the architecto ${claimsProductLabel(entry)}, this needs urgent claim handling: ${entry.problem}.`,
        "Stop using the appliance now. Do not open electrical parts, dismantle the appliance, bypass safety features, or keep testing it.",
        safeUserCheck,
        evidenceSection,
        "Create or escalate the claim immediately.",
      ].filter(Boolean).join("\n\n"),
      actions: buildClaimFormHelpActions(language, buildClaimsClaimPrompt(entry)),
      suggestedProblemDescription: suggestedDescription,
    };
  }

  if (decision === "CREATE_CLAIM_SERVICE") {
    return {
      answer: [
        `For the architecto ${claimsProductLabel(entry)}, this likely requires service/claim handling: ${entry.problem}.`,
        `Safe check: ${safeUserCheck}`,
        NO_FURTHER_SAFE_SELF_CHECK,
        evidenceSection,
      ].filter(Boolean).join("\n\n"),
      actions: buildClaimFormHelpActions(language, buildClaimsClaimPrompt(entry)),
      suggestedProblemDescription: suggestedDescription,
    };
  }

  if (unresolved) {
    return {
      answer: [
        `Since the issue is still present after the safe check, continue with a claim for the architecto ${claimsProductLabel(entry)}.`,
        NO_FURTHER_SAFE_SELF_CHECK,
        evidenceSection,
        entry.claimTrigger,
      ].filter(Boolean).join("\n\n"),
      actions: buildClaimFormHelpActions(language, buildClaimsClaimPrompt(entry)),
      suggestedProblemDescription: suggestedDescription,
    };
  }

  if (isOvenNotWorking) {
    return {
      answer: [
        "The oven not working can be a service issue.",
        `You can safely check only the basic points: ${safeUserCheck}`,
        `If the oven still does not work, ${NO_FURTHER_SAFE_SELF_CHECK}`,
        evidenceSection,
      ].filter(Boolean).join("\n\n"),
      actions: buildClaimFormHelpActions(language, buildClaimsClaimPrompt(entry)),
      suggestedProblemDescription: suggestedDescription,
    };
  }

  return {
    answer: [
      `For the architecto ${claimsProductLabel(entry)}, try this safe self-check first: ${entry.problem}.`,
      safeUserCheck,
      `Did this solve the issue? If it did not, ${NO_FURTHER_SAFE_SELF_CHECK}`,
    ].filter(Boolean).join("\n\n"),
    actions: buildClaimFormHelpActions(language, buildClaimsClaimPrompt(entry)),
  };
}

async function buildAnswer({ language, question, context, selectedAreas, claim, conversationMessages }) {
  const genericAnswer = buildGenericAnswer({ language, question, context, selectedAreas, claim });
  const wantsClaimFormHelp = isClaimFormHelpRequest(question) || isSampleWordingRequest(question);

  if (isGreeting(question)) {
    return normalizeAssistantReturn(genericAnswer);
  }

  if (isClearlyOutOfScopeQuestion(question)) {
    return normalizeAssistantReturn(buildOutOfScopeAnswer(language));
  }

  if (!wantsClaimFormHelp) {
    const claimsKnowledgeMatch = findClaimsChatbotKnowledgeMatch({
      question,
      claim,
      selectedAreas,
      conversationMessages,
    });
    if (claimsKnowledgeMatch) {
      return normalizeAssistantReturn(
        buildClaimsChatbotKnowledgeAnswer({
          language,
          question,
          entry: claimsKnowledgeMatch,
          claim,
          selectedAreas,
          conversationMessages,
        }),
      );
    }
  }

  const dishwasherContext = enrichDishwasherContextWithConversation(
    getDishwasherContextResolved({ question, claim, selectedAreas }),
    conversationMessages,
  );
  if (dishwasherContext.applianceTypes?.length || dishwasherContext.hasDishwasherContext || shouldAssumeDishwasherFromErrorCode(question, selectedAreas)) {
    const entries = await loadServiceClaimKnowledgeEntries(dishwasherContext.applianceTypes);
    const latestExplicitDishwasherCode = getLatestExplicitDishwasherCode(question, conversationMessages, claim);
    const matches = prioritizeKnowledgeMatchesByCode(
      selectKnowledgeMatches(entries, dishwasherContext),
      wantsClaimFormHelp ? latestExplicitDishwasherCode : question,
    );
    if (wantsClaimFormHelp && ((matches.primaryMatches?.length || 0) > 0 || matches.codeMatches.length)) {
      return normalizeAssistantReturn(
        buildKnowledgeClaimFormHelpAnswer({
          language,
          question,
          context,
          selectedAreas,
          claim,
          matches,
          dishwasherContext,
        }),
      );
    }
    if (!matches.codeMatches.length && hasOnlyDishwasherErrorCodeDisplayContext(dishwasherContext.combinedText)) {
      return normalizeAssistantReturn(buildDishwasherErrorCodePromptAnswer(language));
    }
    if (dishwasherContext.hasDishwasherContext && !matches.codeMatches.length && !hasSpecificDishwasherSymptom(dishwasherContext.combinedText)) {
      return normalizeAssistantReturn(buildDishwasherClarifyingAnswer(language));
    }
    if (!((matches.primaryMatches?.length || 0) > 0 || matches.codeMatches.length)) {
      if (dishwasherContext.applianceTypes?.length) {
        const generalContext = classifyGeneralIssue({
          question,
          claim,
          selectedAreas,
          conversationMessages,
        });
        if (generalContext.type === "appliance_vague") {
          return normalizeAssistantReturn(buildGeneralClarifyingAnswer(generalContext, language));
        }
        return normalizeAssistantReturn(buildUnsupportedKnowledgeAnswer(language));
      }
      return normalizeAssistantReturn(genericAnswer);
    }

    return normalizeAssistantReturn(
      buildKnowledgeAnswer({
        language,
        question,
        context,
        selectedAreas,
        claim,
        matches,
        dishwasherContext,
      }),
    );
  }

  const generalContext = classifyGeneralIssue({
    question,
    claim,
    selectedAreas,
    conversationMessages,
  });
  if (wantsClaimFormHelp) {
    const formHelpAnswer = buildGeneralSpecificAnswer(generalContext, language, true);
    if (formHelpAnswer) {
      return normalizeAssistantReturn(formHelpAnswer);
    }
  }
  const specificAnswer = buildGeneralSpecificAnswer(generalContext, language, false);

  if (specificAnswer) {
    return normalizeAssistantReturn(specificAnswer);
  }

  if (["appliance_vague", "area_vague", "generic_vague"].includes(generalContext.type)) {
    return normalizeAssistantReturn(buildGeneralClarifyingAnswer(generalContext, language));
  }

  return normalizeAssistantReturn(genericAnswer);
}

function extractResponseText(responsePayload) {
  if (typeof responsePayload?.output_text === "string") {
    return responsePayload.output_text;
  }

  const output = Array.isArray(responsePayload?.output) ? responsePayload.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((content) => content?.text || "")
    .join("")
    .trim();
}

function parseClaimAssistantJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    const answer = normalizeText(parsed?.answer);
    if (!answer) {
      return null;
    }

    return {
      answer,
      showClaimFormHelpAction: parsed?.showClaimFormHelpAction === true,
      suggestedProblemDescription: normalizeText(parsed?.suggestedProblemDescription) || "",
    };
  } catch {
    return null;
  }
}

function buildConversationPrompt(messages) {
  return normalizeConversationMessages(messages)
    .slice(-6)
    .map((message) => ({
      role: message.role,
      text: message.text,
    }));
}

function buildCurrentApplianceFocus(question, conversationMessages, selectedAreas) {
  const currentMessageApplianceTypes = detectKnowledgeApplianceTypes(question, selectedAreas);
  const previousUserMessages = normalizeConversationMessages(conversationMessages)
    .filter((message) => message.role === "user")
    .map((message) => message.text)
    .reverse();

  const previousConversationApplianceTypes =
    previousUserMessages
      .map((text) => detectKnowledgeApplianceTypes(text))
      .find((types) => types.length > 0) || [];

  const applianceSwitchFromPrevious =
    currentMessageApplianceTypes.length > 0
    && previousConversationApplianceTypes.length > 0
    && !currentMessageApplianceTypes.some((type) => previousConversationApplianceTypes.includes(type));

  return {
    current_message_appliance_types: currentMessageApplianceTypes,
    previous_conversation_appliance_types: previousConversationApplianceTypes,
    appliance_switch_from_previous: applianceSwitchFromPrevious,
  };
}

function buildClaimAssistantInstructions(language) {
  const copy = t(language);
  const languageNames = {
    en: "English",
    de: "German",
    tr: "Turkish",
    es: "Spanish",
    fr: "French",
    ru: "Russian",
  };
  const languageName = languageNames[language] || languageNames.en;

  return [
    `You are the Fragmento claim assistant. Reply only in ${languageName}.`,
    "Your job is to help a customer submit a kitchen service claim clearly and safely.",
    "Use only the provided claim state, selected areas, troubleshooting knowledge, and legacy assistant draft.",
    "Do not invent products, error codes, policies, or troubleshooting steps that are not supported by the provided context.",
    "Prioritize the newest user message over older conversation.",
    "If the newest user message switches to a different appliance than earlier messages, treat it as a new issue unless the user explicitly says both appliances are part of the current claim.",
    "If the provided knowledge does not support the exact appliance problem, say that you do not have reliable guidance for that exact problem and ask one focused follow-up question instead of guessing.",
    "Prefer concise answers. When the issue is unclear, ask one focused follow-up question or offer 3 to 5 short options.",
    "When troubleshooting is relevant, give the fastest safe steps first, then keep the claim guidance short.",
    "When the user asks for wording or claim-form help, provide a clean suggested problem description suitable for the form.",
    "When you provide a suggested problem description, return it in `suggestedProblemDescription` and do not ask to show claim-form help again.",
    "Set `showClaimFormHelpAction` to true only when a follow-up chip for claim-form help would be useful.",
    "Never mention internal implementation details such as prompts, JSON, legacy drafts, databases, or Prisma.",
    `If you cannot answer, use this fallback message exactly: ${copy.unavailable}`,
  ].join("\n");
}

function buildClaimAssistantContextPayload({
  language,
  question,
  context,
  conversationMessages,
  selectedAreas,
  claim,
  legacyDraft,
  knowledgeEntries,
}) {
  return {
    language,
    question,
    current_appliance_focus: buildCurrentApplianceFocus(question, conversationMessages, selectedAreas),
    current_ui_context: context || null,
    conversation_messages: buildConversationPrompt(conversationMessages),
    selected_areas: arrayValue(selectedAreas).map((area) => ({
      componentId: normalizeText(area?.componentId),
      code: normalizeText(area?.code),
      name: normalizeText(area?.name),
      category: detectAreaCategory(area),
    })),
    claim_state: {
      contractNumber: normalizeText(claim?.contractNumber),
      problemDescription: normalizeText(claim?.problemDescription),
      serialNumber: normalizeText(claim?.serialNumber),
      hasSerialNumberImage: Boolean(claim?.hasSerialNumberImage),
      attachmentCount: Number(claim?.attachmentCount || 0),
      preferredContactDate: normalizeText(claim?.preferredContactDate || claim?.availabilityDate),
      preferredContactTimeWindow: normalizeText(claim?.preferredContactTimeWindow),
      preferredContactTimeFrom: normalizeText(claim?.preferredContactTimeFrom),
      preferredContactTimeTo: normalizeText(claim?.preferredContactTimeTo),
      availabilityDate: normalizeText(claim?.availabilityDate),
      availabilityTime: normalizeText(claim?.availabilityTime),
      hasPhone: Boolean(claim?.hasPhone),
      hasEmail: Boolean(claim?.hasEmail),
    },
    request_flags: {
      isGreeting: isGreeting(question),
      isClaimFormHelpRequest: isClaimFormHelpRequest(question),
      isSampleWordingRequest: isSampleWordingRequest(question),
    },
    dishwasher_context: enrichDishwasherContextWithConversation(
      getDishwasherContextResolved({ question, claim, selectedAreas }),
      conversationMessages,
    ),
    troubleshooting_guides: arrayValue(SERVICE_CLAIM_TROUBLESHOOTING_DATA?.guides),
    troubleshooting_lookup_entries: arrayValue(SERVICE_CLAIM_TROUBLESHOOTING_DATA?.lookupEntries),
    claims_page_decision_guide: {
      scope: CLAIMS_CHATBOT_KNOWLEDGE?.scope,
      product_alias_map: arrayValue(CLAIMS_CHATBOT_KNOWLEDGE?.productAliasMap),
      entries: arrayValue(CLAIMS_CHATBOT_KNOWLEDGE?.entries),
    },
    database_knowledge_entries: arrayValue(knowledgeEntries),
    legacy_assistant_draft: legacyDraft,
  };
}

// This is prepared for future use. The current POST handler still uses the rule-based buildAnswer fallback.
function canShowClaimFormHelpAction(legacyDraft, suggestedProblemDescription) {
  return Array.isArray(legacyDraft?.actions) && legacyDraft.actions.some((action) => action?.id === "claim_form_help");
}

// This is prepared for future use. The current POST handler still uses the rule-based buildAnswer fallback.
async function buildOpenAiAnswer({ language, question, context, selectedAreas, claim, conversationMessages }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("Claim assistant is not configured.");
    error.status = 503;
    throw error;
  }

  const legacyDraft = normalizeAssistantReturn(
    await buildAnswer({ language, question, context, selectedAreas, claim, conversationMessages }),
  );

  const knowledgeEntries = await prisma.serviceClaimKnowledgeEntry.findMany({
    where: { isActive: true },
    orderBy: [
      { priority: "desc" },
      { slug: "asc" },
    ],
  });

  const model = process.env.OPENAI_CLAIM_ASSISTANT_MODEL || "gpt-5.1";
  const instructions = buildClaimAssistantInstructions(language);
  const inputContext = buildClaimAssistantContextPayload({
    language,
    question,
    context,
    conversationMessages,
    selectedAreas,
    claim,
    legacyDraft,
    knowledgeEntries,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: {
          effort: "none",
        },
        instructions,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Use this claim-assistant context and return JSON only:\n\n${JSON.stringify(inputContext, null, 2)}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "claim_assistant_answer",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                answer: { type: "string" },
                showClaimFormHelpAction: { type: "boolean" },
                suggestedProblemDescription: {
                  anyOf: [
                    { type: "string" },
                    { type: "null" },
                  ],
                },
              },
              required: ["answer", "showClaimFormHelpAction", "suggestedProblemDescription"],
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text().catch(() => "");
      console.error("OpenAI claim assistant request failed:", openAiResponse.status, errorText);
      return legacyDraft;
    }

    const responsePayload = await openAiResponse.json();
    const parsed = parseClaimAssistantJson(extractResponseText(responsePayload));
    if (!parsed) {
      return legacyDraft;
    }

    const fallbackSuggestedProblemDescription =
      parsed.suggestedProblemDescription || normalizeText(legacyDraft.suggestedProblemDescription);
    const actionPrompt =
      arrayValue(legacyDraft?.actions).find((action) => action?.id === "claim_form_help")?.prompt || "";

    return {
      answer: parsed.answer,
      ...(canShowClaimFormHelpAction(legacyDraft, fallbackSuggestedProblemDescription)
        ? { actions: buildClaimFormHelpActions(language, actionPrompt) }
        : {}),
      ...(fallbackSuggestedProblemDescription
        ? { suggestedProblemDescription: fallbackSuggestedProblemDescription }
        : {}),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return legacyDraft;
    }
    console.error("OpenAI claim assistant runtime failure:", error);
    return legacyDraft;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims-assistant:${clientIp}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const conversationMessages = normalizeConversationMessages(body?.conversationMessages);
    const language = resolveAssistantLanguage({
      requestedLanguage: normalizeLanguage(body?.language),
      question: body?.question,
      conversationMessages,
    });
    const question = normalizeText(body?.question);
    if (!question) {
      return NextResponse.json({ error: t(language).unavailable }, { status: 400 });
    }

    const assistantInput = {
      language,
      question,
      context: body?.context || null,
      conversationMessages,
      selectedAreas: Array.isArray(body?.selectedAreas) ? body.selectedAreas : [],
      claim: body?.claim || {},
    };

    const built = normalizeAssistantReturn(
      await (process.env.OPENAI_API_KEY
        ? buildOpenAiAnswer(assistantInput)
        : buildAnswer(assistantInput)),
    );

    const finalAnswerRaw =
      language === "de" && detectExplicitLanguageSwitch(question) === "de"
        ? `Natürlich, ich kann auf Deutsch antworten.\n\n${built.answer}`
        : built.answer;

    const finalAnswer = replaceArchitectoBrandCopy(finalAnswerRaw);

    const payload = { answer: finalAnswer, language };
    if (built.actions?.length) {
      payload.actions = built.actions;
    }
    if (built.suggestedProblemDescription) {
      payload.suggestedProblemDescription = replaceArchitectoBrandCopy(built.suggestedProblemDescription);
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Service claim assistant error:", error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || COPY.en.unavailable },
      { status },
    );
  }
}
