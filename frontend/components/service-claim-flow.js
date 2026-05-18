"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ServiceClaimKitchenPicker from "./service-claim-kitchen-picker";
import { speakAssistantTextWithTts } from "./assistant-tts";
import {
  composeProblemDescriptionFromParts,
  composeProblemDescriptionWithAreas,
  splitKitchenAreasFromProblemDescription,
} from "../lib/service-claim-problem-description";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "Deutsch", flagSrc: "https://flagcdn.com/w40/de.png" },
  { code: "en", label: "English", flagSrc: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "T\u00fcrk\u00e7e", flagSrc: "https://flagcdn.com/w40/tr.png" },
  { code: "es", label: "Espa\u00f1ol", flagSrc: "https://flagcdn.com/w40/es.png" },
  { code: "fr", label: "Fran\u00e7ais", flagSrc: "https://flagcdn.com/w40/fr.png" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flagSrc: "https://flagcdn.com/w40/ru.png" },
];

const MAX_CLAIM_ATTACHMENT_COUNT = 5;
const MAX_CLAIM_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const CLAIM_ATTACHMENT_ACCEPT = "image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx";
const SERIAL_NUMBER_IMAGE_ACCEPT = "image/*";

const CLAIM_AREA_LABELS_BY_CODE = {
  de: {
    "CAB-WALL-B-L-600": "Oberschrank links",
    "CAB-WALL-B-ML-600": "Oberschrank mittig links",
    "CAB-WALL-B-MR-600": "Oberschrank mittig rechts",
    "CAB-WALL-B-R-600": "Oberschrank rechts",
    "CAB-HOOD-B-600": "Oberschrank f\u00fcr Dunstabzugshaube",
    "CAB-WALL-C-L-600": "Oberschrank links",
    "CAB-WALL-C-ML-600": "Oberschrank mittig links",
    "CAB-WALL-C-MR-600": "Oberschrank mittig rechts",
    "CAB-WALL-C-R-600": "Oberschrank rechts",
    "SINKBASE-B-600": "Sp\u00fclenunterschrank",
    "SINKBASE-C-600": "Sp\u00fclenunterschrank",
    "SINK-B-BOTTON-45": "Sp\u00fcle und M\u00fclltrennsystem",
    "SINK-C-BOTTON-45": "Sp\u00fcle und M\u00fclltrennsystem",
    "DISH-B-600-STD": "Geschirrsp\u00fcler",
    "DISH-C-600-STD": "Geschirrsp\u00fcler",
    "CAB-BASE-B-STR": "Stauraum-Unterschrank",
    "REF-B-545-1800-700": "K\u00fchlschrank",
    "REF-C-545-1800-700": "K\u00fchlschrank",
    "WM-B-EWA34660W": "Waschmaschine",
    "WM-C-EWA34660W": "Waschmaschine",
    "OVEN-B-600-HOB": "Einbaubackofen und Kochfeld",
    "OVEN-C-600-HOB": "Einbaubackofen und Kochfeld",
  },
};

function formatClaimAreaName(area, fallbackName, language) {
  const code = String(area?.code || "").trim().toUpperCase();
  return CLAIM_AREA_LABELS_BY_CODE[language]?.[code] || fallbackName || code;
}

const CLAIM_FILENAME_PATTERN = /\.(pdf|png|jpe?g|gif|webp|bmp|tiff?|txt|docx?|xlsx?)$/i;

const CONTRACT_NUMBER_HELP_IMAGES = [
  { src: "/help/contract-number/contract-number-example-1.png", altKey: "contractNumberHelpAlt1" },
  { src: "/help/contract-number/contract-number-example-2.png", altKey: "contractNumberHelpAlt2" },
  { src: "/img/CONTRACT%20NR%20IMG.png", altKey: "contractNumberHelpAlt3" },
];
const CONTRACT_HELP_SLIDE_COUNT = CONTRACT_NUMBER_HELP_IMAGES.length;
const SERIAL_NUMBER_HELP_IMAGES = [
  { src: "/img/AMICA%20SR%20NR.webp", altKey: "serialNumberHelpAlt1" },
  { src: "/img/AMICA%20FRIDGE.webp", altKey: "serialNumberHelpAlt2" },
];
const SERIAL_HELP_SLIDE_COUNT = SERIAL_NUMBER_HELP_IMAGES.length;

function isClientAllowedAttachment(file) {
  const mime = (file.type || "").toLowerCase();
  if (mime === "image/svg+xml") {
    return false;
  }
  if (mime.startsWith("image/")) {
    return true;
  }
  return CLAIM_FILENAME_PATTERN.test(file.name);
}

function RequiredFieldMark({ title }) {
  return (
    <abbr className="service-field__required-mark" title={title}>
      *
    </abbr>
  );
}

function OptionalFieldSuffix({ text }) {
  return <span className="service-field__optional-mark">{text}</span>;
}

const COPY = {
  de: {
    eyebrow: "Fragmento Service",
    title: "Willkommen bei architecto",
    intro:
      "Wähle den passenden Weg für dein Anliegen. Du kannst mit einer Bestellung oder einem Zusatzkauf weitermachen oder direkt eine Reklamation an unser Support-Team senden.",
    purchaseBadge: "Nachkauf",
    purchaseTitle: "Zusatzkauf",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "\u00d6ffne den K\u00fcchenkonfigurator und fahre mit zus\u00e4tzlichen Komponenten oder Zubeh\u00f6r fort.",
    complaintBadge: "Reklamation",
    complaintTitle: "Reklamation melden",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "F\u00fcr Defekte, Sch\u00e4den oder fehlende Teile: Nutze das Reklamationsformular und sende den Fall an den Support.",
    purchasePanelTitle: "Weiter zum Kaufprozess",
    purchasePanelText: "Wenn der Mieter zus\u00e4tzliche Artikel statt einer Reklamation ben\u00f6tigt, geht es hier zum Konfigurator.",
    openConfigurator: "Konfigurator \u00f6ffnen",
    back: "Zur\u00fcck",
    formTitle: "KD Formular",
    formIntro: "F\u00fclle unten die wichtigsten Reklamationsdaten aus.",
    requiredFieldTitle: "Pflichtfeld",
    fieldOptionalSuffix: " (optional)",
    contractNumber: "Kaufvertragsnummer",
    contractPlaceholder: "e.g. 670 123456",
    contractNumberHelpTrigger: "Wo finde ich die Nummer?",
    contractNumberHelpAria: "Hilfe: Kaufvertragsnummer im Dokument finden",
    contractNumberHelpTitle: "Kaufvertragsnummer finden",
    contractNumberHelpBody: "So findest du die Nummer in deinen Unterlagen (Beispiele aus dem Vertrag):",
    contractNumberHelpClose: "Schlie\u00dfen",
    contractNumberHelpAlt1: "Beispiel 1: Vertragsnummer im Dokument",
    contractNumberHelpAlt2: "Beispiel 2: Vertragsnummer im Dokument",
    contractNumberHelpAlt3: "Beispiel 3: Vertragsnummer im Dokument",
    contractNumberHelpPrev: "Vorheriges Beispiel",
    contractNumberHelpNext: "N\u00e4chstes Beispiel",
    contractNumberHelpSlideDot: "Beispiel {n} von {total}",
    givenName: "Vorname",
    givenNamePlaceholder: "Vorname",
    surname: "Nachname",
    surnamePlaceholder: "Nachname",
    gender: "Anrede",
    genderPlaceholder: "Bitte w\u00e4hlen",
    genderFemale: "Weiblich",
    genderMale: "M\u00e4nnlich",
    genderPreferNot: "Keine Angabe",
    phone: "Telefonnummer",
    phonePlaceholder: "+49 ...",
    email: "E-Mail-Adresse",
    emailPlaceholder: "name@beispiel.de",
    preferredContactTime: "Bevorzugte Kontaktzeit",
    preferredContactTimeHelper:
      "Bitte teilen Sie uns mit, wann Sie am besten erreichbar sind, damit unser Team Sie zu einem passenden Zeitpunkt kontaktieren kann.",
    preferredContactDate: "Bevorzugtes Datum",
    preferredContactTimeWindow: "Bevorzugtes Zeitfenster",
    preferredContactTimeWindowPlaceholder: "Bitte wählen",
    preferredContactTimeWindowMorning: "Vormittag, 08:00–12:00",
    preferredContactTimeWindowAfternoon: "Nachmittag, 12:00–17:00",
    preferredContactTimeWindowEvening: "Abend, 17:00–20:00",
    preferredContactTimeWindowCustom: "Eigene Uhrzeit",
    preferredContactTimeFrom: "Von",
    preferredContactTimeTo: "Bis",
    preferredContactTimeCustomRequired: "Bitte geben Sie bei eigener Uhrzeit sowohl Von als auch Bis an.",
    preferredContactTimeCustomOrder: "Die Bis-Uhrzeit muss später als die Von-Uhrzeit sein.",
    clientAddress: "Adresse des Kunden",
    clientCountry: "Land",
    clientCountryPlaceholder: "Deutschland",
    clientAddressLine1: "Adresszeile 1",
    clientAddressLine1Placeholder: "Stra\u00dfe und Hausnummer",
    clientAddressLine2: "Adresszeile 2",
    clientAddressLine2Placeholder: "Zusatz, Aufgang, etc.",
    clientPostalCode: "PLZ",
    clientPostalCodePlaceholder: "z.B. 10115",
    clientCity: "Ort",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Stockwerk",
    clientFloorPlaceholder: "z.B. 3",
    clientUnitNumber: "Wohnungsnummer",
    clientUnitNumberPlaceholder: "z.B. 3B",
    landlordSection: "Vermieter (optional)",
    landlordPersonGroup: "Vermieter",
    landlordContactPersonGroup: "Ansprechperson",
    landlordContactGender: "Anrede",
    landlordGivenName: "Vorname",
    landlordGivenNamePlaceholder: "Vorname",
    landlordSurname: "Nachname",
    landlordSurnamePlaceholder: "Nachname",
    landlordCompanyName: "Firmenname",
    landlordCompanyNamePlaceholder: "Firma / Hausverwaltung",
    landlordContactGivenName: "Vorname",
    landlordContactGivenNamePlaceholder: "Vorname",
    landlordContactSurname: "Nachname",
    landlordContactSurnamePlaceholder: "Nachname",
    landlordPhone: "Telefon Ansprechperson",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-Mail Ansprechperson",
    landlordEmailPlaceholder: "kontakt@beispiel.de",
    hausmeisterSection: "Hausmeister (optional)",
    hausmeisterGivenName: "Vorname",
    hausmeisterGivenNamePlaceholder: "Vorname",
    hausmeisterSurname: "Nachname",
    hausmeisterSurnamePlaceholder: "Nachname",
    hausmeisterPhone: "Telefon Hausmeister",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-Mail Hausmeister",
    hausmeisterEmailPlaceholder: "hausmeister@beispiel.de",
    problemDescription: "Problembeschreibung in Stichworten",
    problemPlaceholder: "Beschreibe das Problem kurz",
    serialNumber: "Seriennummer(n) des E-Ger\u00e4tes",
    serialPlaceholder: "Seriennummer eingeben",
    serialNumberAdd: "Hinzuf\u00fcgen",
    serialNumberRequired: "Bitte gib mindestens eine Seriennummer ein oder lade ein Foto der Seriennummer hoch.",
    serialNumberImage: "Foto der Seriennummer(n)",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Hilfe: Wo finde ich die Seriennummer?",
    serialNumberHelpTitle: "Seriennummer finden",
    serialNumberHelpBody: "Die Seriennummer finden Sie meist auf dem Typenschild im Ger\u00e4t oder an der Innenwand. Die Beispiele unten zeigen typische Positionen.",
    serialNumberHelpAlt1: "Beispiel: Seriennummer auf dem Typenschild",
    serialNumberHelpAlt2: "Beispiel: Seriennummer im K\u00fchlschrank",
    attachments: "Anh\u00e4nge (optional)",
    attachmentsHint: "PDF, Bilder oder Office-Dateien \u2014 bis zu 5 Dateien, je max. 4 MB.",
    attachmentsClear: "Alle entfernen",
    attachmentsSelected: "{count} Datei(en) ausgew\u00e4hlt",
    attachmentsErrorTooMany: "Maximal 5 Anh\u00e4nge m\u00f6glich.",
    attachmentsErrorFileTooLarge: "Jede Datei darf h\u00f6chstens 4 MB gro\u00df sein.",
    attachmentsErrorType: "Dateityp nicht erlaubt (z. B. PDF, Bilder, Word/Excel).",
    submit: "Reklamation senden",
    submitting: "Wird gesendet...",
    contactError: "Bitte gib mindestens eine Telefonnummer oder E-Mail-Adresse an.",
    contractLookupLoading: "Vertragsnummer wird gepr\u00fcft...",
    contractLookupSuccess: "Adresse aus den hinterlegten Vertragsdaten eingef\u00fcllt. Du kannst die Felder weiter bearbeiten.",
    contractLookupError: "Die Vertragsnummer wurde nicht gefunden.",
    kitchenPlanEyebrow: "K\u00fcchenmodell",
    kitchenPlanTitle: "Problemstelle in der K\u00fcche markieren",
    kitchenPlanReset: "Auswahl zur\u00fccksetzen",
    kitchenPlanSelectedLabel: "Ausgew\u00e4hlt",
    kitchenPlanSelectedNone: "Noch keine Bereiche ausgew\u00e4hlt.",
    kitchenAreasLinePrefix: "K\u00fcchenbereiche:",
    problemDescriptionFieldLabel: "Weitere Details",
    submitError: "Deine Reklamation konnte nicht gesendet werden.",
    submitSuccess: "Deine Reklamation wurde erfolgreich \u00fcbermittelt.",
    claimAssistantTitle: "Reklamations-Agent",
    claimAssistantContextTitle: "Bereich w\u00e4hlen",
    claimAssistantContextClaim: "Gesamte Reklamation",
    claimAssistantCloseAria: "Reklamations-Agent schlie\u00dfen",
    claimAssistantLauncher: "Reklamationshilfe",
    claimAssistantLauncherPrompt: "Frag mich",
    claimAssistantIntro:
      "Ich helfe dir, den Defekt klar zu beschreiben und die passenden Fotos oder Angaben f\u00fcr den Service zu erg\u00e4nzen.",
    claimAssistantIntroSelected: "Du fokussierst dich auf {label}. Frag mich, was du angeben oder fotografieren solltest.",
    claimAssistantPlaceholder: "Frage zu dieser Reklamation stellen...",
    claimAssistantLoading: "Hinweise werden vorbereitet...",
    claimAssistantSend: "Senden",
    claimAssistantVoiceStart: "Sprachchat starten",
    claimAssistantVoiceStop: "Zuhören beenden",
    claimAssistantVoiceListening: "Ich höre zu...",
    claimAssistantVoiceUnsupported: "Sprachchat wird in diesem Browser nicht unterstützt.",
    claimAssistantVoicePermission: "Mikrofonfreigabe wird für den Sprachchat benötigt.",
    claimAssistantVoiceError: "Die Spracheingabe konnte nicht gestartet werden.",
    claimAssistantErrorUnavailable: "Die Reklamationshilfe konnte dazu gerade keine Antwort geben.",
  },
  en: {
    eyebrow: "Fragmento Service",
    title: "Welcome to architecto",
    intro:
      "Choose the path that fits your request. You can continue with an order or additional purchase, or send a claim directly to our support team.",
    purchaseBadge: "Additional purchase",
    purchaseTitle: "Additional purchase",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "Open the kitchen configurator and continue with extra components or accessories.",
    complaintBadge: "Complaint",
    complaintTitle: "File a complaint",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "For damage, defects, or missing parts, use the complaint form and send the case to support.",
    purchasePanelTitle: "Continue to the purchase flow",
    purchasePanelText: "If the tenant needs additional items instead of a complaint, continue to the configurator.",
    openConfigurator: "Open configurator",
    back: "Back",
    formTitle: "KD Form",
    formIntro: "Fill in the main complaint details below.",
    requiredFieldTitle: "Required field",
    fieldOptionalSuffix: " (optional)",
    contractNumber: "Purchase contract number",
    contractPlaceholder: "e.g. 670 123456",
    contractNumberHelpTrigger: "Where to find it?",
    contractNumberHelpAria: "Help: where your purchase contract number appears on your documents",
    contractNumberHelpTitle: "Finding your contract number",
    contractNumberHelpBody: "These examples show where the number usually appears on your paperwork.",
    contractNumberHelpClose: "Close",
    contractNumberHelpAlt1: "Example 1: contract number on document",
    contractNumberHelpAlt2: "Example 2: contract number on document",
    contractNumberHelpAlt3: "Example 3: contract number on document",
    contractNumberHelpPrev: "Previous example",
    contractNumberHelpNext: "Next example",
    contractNumberHelpSlideDot: "Example {n} of {total}",
    givenName: "Name",
    givenNamePlaceholder: "Name",
    surname: "Surname",
    surnamePlaceholder: "Surname",
    gender: "Gender",
    genderPlaceholder: "Select\u2026",
    genderFemale: "Female",
    genderMale: "Male",
    genderPreferNot: "Prefer not to say",
    phone: "Phone number",
    phonePlaceholder: "+49 ...",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    preferredContactTime: "Preferred contact time",
    preferredContactTimeHelper:
      "Please let us know when you are best reachable, so our team can contact you at a suitable time.",
    preferredContactDate: "Preferred date",
    preferredContactTimeWindow: "Preferred time window",
    preferredContactTimeWindowPlaceholder: "Select…",
    preferredContactTimeWindowMorning: "Morning, 08:00–12:00",
    preferredContactTimeWindowAfternoon: "Afternoon, 12:00–17:00",
    preferredContactTimeWindowEvening: "Evening, 17:00–20:00",
    preferredContactTimeWindowCustom: "Custom time",
    preferredContactTimeFrom: "From",
    preferredContactTimeTo: "To",
    preferredContactTimeCustomRequired: "Please enter both From and To for a custom time.",
    preferredContactTimeCustomOrder: "The To time must be later than the From time.",
    clientAddress: "Client address",
    clientCountry: "Country",
    clientCountryPlaceholder: "Germany",
    clientAddressLine1: "Address line 1",
    clientAddressLine1Placeholder: "Street and house number",
    clientAddressLine2: "Address line 2",
    clientAddressLine2Placeholder: "Apartment, entrance, etc.",
    clientPostalCode: "Postal code",
    clientPostalCodePlaceholder: "e.g. 10115",
    clientCity: "City",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Floor",
    clientFloorPlaceholder: "e.g. 3",
    clientUnitNumber: "Unit number",
    clientUnitNumberPlaceholder: "e.g. 3B",
    landlordSection: "Landlord (optional)",
    landlordPersonGroup: "Landlord",
    landlordContactPersonGroup: "Contact person",
    landlordContactGender: "Gender",
    landlordGivenName: "First name",
    landlordGivenNamePlaceholder: "First name",
    landlordSurname: "Surname",
    landlordSurnamePlaceholder: "Surname",
    landlordCompanyName: "Company name",
    landlordCompanyNamePlaceholder: "Company / property management",
    landlordContactGivenName: "First name",
    landlordContactGivenNamePlaceholder: "First name",
    landlordContactSurname: "Surname",
    landlordContactSurnamePlaceholder: "Surname",
    landlordPhone: "Contact person phone",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Contact person email",
    landlordEmailPlaceholder: "contact@example.com",
    hausmeisterSection: "Property manager (optional)",
    hausmeisterGivenName: "Name",
    hausmeisterGivenNamePlaceholder: "Name",
    hausmeisterSurname: "Surname",
    hausmeisterSurnamePlaceholder: "Surname",
    hausmeisterPhone: "Property manager phone",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Property manager email",
    hausmeisterEmailPlaceholder: "manager@example.com",
    problemDescription: "Problem description",
    problemPlaceholder: "Describe the issue briefly",
    serialNumber: "Serial number(s) of the appliance",
    serialPlaceholder: "Enter a serial number",
    serialNumberAdd: "Add",
    serialNumberRequired: "Please enter at least one serial number or upload a photo of the serial number.",
    serialNumberImage: "Photo of the serial number(s)",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Help: where to find the serial number",
    serialNumberHelpTitle: "Finding the serial number",
    serialNumberHelpBody: "You can usually find the serial number on the appliance rating plate or on an inside wall. The examples below show typical locations.",
    serialNumberHelpAlt1: "Example: serial number on the appliance label",
    serialNumberHelpAlt2: "Example: serial number inside the fridge",
    attachments: "Attachments (optional)",
    attachmentsHint: "PDFs, images, or office files \u2014 up to 5 files, 4 MB each.",
    attachmentsClear: "Remove all",
    attachmentsSelected: "{count} file(s) selected",
    attachmentsErrorTooMany: "You can attach at most 5 files.",
    attachmentsErrorFileTooLarge: "Each file must be 4 MB or smaller.",
    attachmentsErrorType: "This file type is not allowed. Use PDF, images, or common office formats.",
    contractLookupLoading: "Checking contract number...",
    contractLookupSuccess: "Address autofilled from the saved contract data. You can still edit the fields.",
    kitchenPlanEyebrow: "Kitchen model",
    kitchenPlanTitle: "Mark where the problem is",
    kitchenPlanReset: "Clear selection",
    kitchenPlanSelectedLabel: "Selected",
    kitchenPlanSelectedNone: "No areas selected yet.",
    kitchenAreasLinePrefix: "Kitchen areas:",
    problemDescriptionFieldLabel: "Additional details",
    contractLookupError: "Contract number was not found.",
    submit: "Send complaint",
    submitting: "Submitting...",
    contactError: "Please provide at least a phone number or an email address.",
    submitError: "Your complaint could not be submitted.",
    submitSuccess: "Your complaint has been submitted successfully.",
    claimAssistantTitle: "Claim Agent",
    claimAssistantContextTitle: "Choose a focus",
    claimAssistantContextClaim: "Entire claim",
    claimAssistantCloseAria: "Close Claim Agent",
    claimAssistantLauncher: "Claim help",
    claimAssistantLauncherPrompt: "Ask me",
    claimAssistantIntro:
      "I can help you describe the issue clearly and suggest which photos or details to add for service support.",
    claimAssistantIntroSelected: "You're focusing on {label}. Ask me what to include or how to describe the issue.",
    claimAssistantPlaceholder: "Ask about this claim...",
    claimAssistantLoading: "Preparing suggestions...",
    claimAssistantSend: "Send",
    claimAssistantVoiceStart: "Start voice chat",
    claimAssistantVoiceStop: "Stop listening",
    claimAssistantVoiceListening: "Listening...",
    claimAssistantVoiceUnsupported: "Voice chat is not supported in this browser.",
    claimAssistantVoicePermission: "Microphone permission is needed to use voice chat.",
    claimAssistantVoiceError: "Voice input could not be started.",
    claimAssistantErrorUnavailable: "The claim helper could not answer that right now.",
  },
  tr: {
    eyebrow: "Fragmento Servis",
    title: "architecto'ya Ho\u015f Geldiniz",
    intro:
      "Talebinize uygun yolu se\u00e7in. Sipari\u015f veya ek sat\u0131n alma ile devam edebilir ya da do\u011frudan destek ekibine \u015fikayet g\u00f6nderebilirsiniz.",
    purchaseBadge: "Ek sat\u0131n alma",
    purchaseTitle: "Ek sat\u0131n alma",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "Mutfak yap\u0131land\u0131r\u0131c\u0131s\u0131n\u0131 a\u00e7\u0131n ve ek bile\u015fenler veya aksesuarlarla devam edin.",
    complaintBadge: "\u015eikayet",
    complaintTitle: "\u015eikayet bildir",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "Hasar, ar\u0131za veya eksik par\u00e7alar i\u00e7in \u015fikayet formunu kullan\u0131n ve durumu deste\u011fe g\u00f6nderin.",
    purchasePanelTitle: "Sat\u0131n alma ak\u0131\u015f\u0131na devam et",
    purchasePanelText: "Kirac\u0131n\u0131n \u015fikayet yerine ek \u00fcr\u00fcnlere ihtiyac\u0131 varsa, yap\u0131land\u0131r\u0131c\u0131ya devam edin.",
    openConfigurator: "Yap\u0131land\u0131r\u0131c\u0131y\u0131 a\u00e7",
    back: "Geri",
    formTitle: "Servis Formu",
    formIntro: "Ana \u015fikayet bilgilerini a\u015fa\u011f\u0131ya girin.",
    requiredFieldTitle: "Zorunlu alan",
    fieldOptionalSuffix: " (iste\u011fe ba\u011fl\u0131)",
    contractNumber: "Sat\u0131n alma s\u00f6zle\u015fme numaras\u0131",
    contractPlaceholder: "\u00f6rn. 736267",
    contractNumberHelpTrigger: "Numaray\u0131 nerede bulurum?",
    contractNumberHelpAria: "Yard\u0131m: s\u00f6zle\u015fme numaras\u0131 belgede nerede",
    contractNumberHelpTitle: "S\u00f6zle\u015fme numaras\u0131n\u0131 bulma",
    contractNumberHelpBody: "Numara genellikle belgelerinizde \u015fu \u015fekilde g\u00f6r\u00fcn\u00fcr (\u00f6rnekler):",
    contractNumberHelpClose: "Kapat",
    contractNumberHelpAlt1: "\u00d6rnek 1: belgedeki s\u00f6zle\u015fme numaras\u0131",
    contractNumberHelpAlt2: "\u00d6rnek 2: belgedeki s\u00f6zle\u015fme numaras\u0131",
    contractNumberHelpAlt3: "\u00d6rnek 3: belgedeki s\u00f6zle\u015fme numaras\u0131",
    contractNumberHelpPrev: "\u00d6nceki \u00f6rnek",
    contractNumberHelpNext: "Sonraki \u00f6rnek",
    contractNumberHelpSlideDot: "\u00d6rnek {n} / {total}",
    givenName: "Ad",
    givenNamePlaceholder: "Ad",
    surname: "Soyad",
    surnamePlaceholder: "Soyad",
    gender: "Cinsiyet",
    genderPlaceholder: "Se\u00e7in",
    genderFemale: "Kad\u0131n",
    genderMale: "Erkek",
    genderPreferNot: "Belirtmek istemiyorum",
    phone: "Telefon numaras\u0131",
    phonePlaceholder: "+49 ...",
    email: "E-posta adresi",
    emailPlaceholder: "isim@example.com",
    availability: "Uygunluk",
    availabilityDate: "Tarih",
    availabilityTime: "Saat",
    clientAddress: "M\u00fc\u015fteri adresi",
    clientCountry: "\u00dclke",
    clientCountryPlaceholder: "Almanya",
    clientAddressLine1: "Adres sat\u0131r\u0131 1",
    clientAddressLine1Placeholder: "Sokak ve bina no",
    clientAddressLine2: "Adres sat\u0131r\u0131 2",
    clientAddressLine2Placeholder: "Daire, giri\u015f, vb.",
    clientPostalCode: "Posta kodu",
    clientPostalCodePlaceholder: "\u00f6rn. 10115",
    clientCity: "\u015eehir",
    clientCityPlaceholder: "Berlin",
    clientFloor: "Kat",
    clientFloorPlaceholder: "\u00f6rn. 3",
    clientUnitNumber: "Daire no",
    clientUnitNumberPlaceholder: "\u00f6rn. 3B",
    landlordSection: "Ev sahibi (iste\u011fe ba\u011fl\u0131)",
    landlordPersonGroup: "Ev sahibi",
    landlordContactPersonGroup: "\u0130leti\u015fim ki\u015fisi",
    landlordContactGender: "Cinsiyet",
    landlordGivenName: "Ad",
    landlordGivenNamePlaceholder: "Ad",
    landlordSurname: "Soyad",
    landlordSurnamePlaceholder: "Soyad",
    landlordCompanyName: "Firma ad\u0131",
    landlordCompanyNamePlaceholder: "Firma / site y\u00f6netimi",
    landlordContactGivenName: "Ad",
    landlordContactGivenNamePlaceholder: "Ad",
    landlordContactSurname: "Soyad",
    landlordContactSurnamePlaceholder: "Soyad",
    landlordPhone: "\u0130leti\u015fim ki\u015fisi telefonu",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "\u0130leti\u015fim ki\u015fisi e-postas\u0131",
    landlordEmailPlaceholder: "iletisim@example.com",
    hausmeisterSection: "Bina g\u00f6revlisi (iste\u011fe ba\u011fl\u0131)",
    hausmeisterGivenName: "Ad",
    hausmeisterGivenNamePlaceholder: "Ad",
    hausmeisterSurname: "Soyad",
    hausmeisterSurnamePlaceholder: "Soyad",
    hausmeisterPhone: "Bina g\u00f6revlisi telefonu",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Bina g\u00f6revlisi e-postas\u0131",
    hausmeisterEmailPlaceholder: "gorevli@example.com",
    problemDescription: "Sorun a\u00e7\u0131klamas\u0131",
    problemPlaceholder: "Sorunu k\u0131saca a\u00e7\u0131klay\u0131n",
    serialNumber: "Cihaz seri numaras\u0131 / numaralar\u0131",
    serialPlaceholder: "Bir seri numaras\u0131 girin",
    serialNumberAdd: "Ekle",
    serialNumberRequired: "L\u00fctfen en az bir seri numaras\u0131 girin veya seri numaras\u0131n\u0131n foto\u011fraf\u0131n\u0131 y\u00fckleyin.",
    serialNumberImage: "Seri numaras\u0131 / numaralar\u0131 foto\u011fraf\u0131",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Yard\u0131m: seri numaras\u0131 nerede bulunur?",
    serialNumberHelpTitle: "Seri numaras\u0131n\u0131 bulma",
    serialNumberHelpBody: "Seri numaras\u0131n\u0131 genelde cihaz etiketinde veya i\u00e7 taraftaki bir y\u00fczeyde bulabilirsiniz. A\u015fa\u011f\u0131daki \u00f6rnekler tipik konumlar\u0131 g\u00f6sterir.",
    serialNumberHelpAlt1: "\u00d6rnek: cihaz etiketindeki seri numaras\u0131",
    serialNumberHelpAlt2: "\u00d6rnek: buzdolab\u0131 i\u00e7indeki seri numaras\u0131",
    attachments: "Ekler (iste\u011fe ba\u011fl\u0131)",
    attachmentsHint: "PDF, g\u00f6rsel veya ofis dosyalar\u0131 \u2014 en fazla 5 dosya, dosya ba\u015f\u0131na en fazla 4 MB.",
    attachmentsClear: "T\u00fcm\u00fcn\u00fc kald\u0131r",
    attachmentsSelected: "{count} dosya se\u00e7ildi",
    attachmentsErrorTooMany: "En fazla 5 dosya ekleyebilirsiniz.",
    attachmentsErrorFileTooLarge: "Her dosya en fazla 4 MB olabilir.",
    attachmentsErrorType: "Bu dosya t\u00fcr\u00fcne izin verilmiyor (PDF, g\u00f6rsel, Word/Excel vb.).",
    submit: "\u015eikayeti g\u00f6nder",
    submitting: "G\u00f6nderiliyor...",
    contactError: "L\u00fctfen en az bir telefon numaras\u0131 veya e-posta adresi girin.",
    submitError: "\u015eikayetiniz g\u00f6nderilemedi.",
    submitSuccess: "\u015eikayetiniz ba\u015far\u0131yla g\u00f6nderildi.",
  },
  es: {
    eyebrow: "Servicio Fragmento",
    title: "Bienvenido a architecto",
    intro:
      "Elige la opci\u00f3n adecuada para tu solicitud. Puedes continuar con un pedido o una compra adicional, o enviar una reclamaci\u00f3n al equipo de soporte.",
    purchaseBadge: "Compra adicional",
    purchaseTitle: "Compra adicional",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "Abre el configurador de cocina y contin\u00faa con componentes o accesorios adicionales.",
    complaintBadge: "Reclamaci\u00f3n",
    complaintTitle: "Enviar reclamaci\u00f3n",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "Para da\u00f1os, defectos o piezas faltantes, usa el formulario de reclamaci\u00f3n y env\u00eda el caso a soporte.",
    purchasePanelTitle: "Continuar al proceso de compra",
    purchasePanelText: "Si el inquilino necesita art\u00edculos adicionales en lugar de una reclamaci\u00f3n, contin\u00faa al configurador.",
    openConfigurator: "Abrir configurador",
    back: "Atr\u00e1s",
    formTitle: "Formulario de servicio",
    formIntro: "Complete a continuaci\u00f3n los datos principales de la reclamaci\u00f3n.",
    requiredFieldTitle: "Campo obligatorio",
    fieldOptionalSuffix: " (opcional)",
    contractNumber: "N\u00famero de contrato de compra",
    contractPlaceholder: "p. ej. 736267",
    contractNumberHelpTrigger: "\u00bfD\u00f3nde aparece?",
    contractNumberHelpAria: "Ayuda: d\u00f3nde ver el n\u00famero de contrato en el documento",
    contractNumberHelpTitle: "Encontrar el n\u00famero de contrato",
    contractNumberHelpBody: "Estos ejemplos muestran d\u00f3nde suele figurar el n\u00famero en su documentaci\u00f3n:",
    contractNumberHelpClose: "Cerrar",
    contractNumberHelpAlt1: "Ejemplo 1: n\u00famero de contrato en el documento",
    contractNumberHelpAlt2: "Ejemplo 2: n\u00famero de contrato en el documento",
    contractNumberHelpAlt3: "Ejemplo 3: n\u00famero de contrato en el documento",
    contractNumberHelpPrev: "Ejemplo anterior",
    contractNumberHelpNext: "Ejemplo siguiente",
    contractNumberHelpSlideDot: "Ejemplo {n} de {total}",
    givenName: "Nombre",
    givenNamePlaceholder: "Nombre",
    surname: "Apellidos",
    surnamePlaceholder: "Apellidos",
    gender: "Sexo",
    genderPlaceholder: "Seleccione",
    genderFemale: "Mujer",
    genderMale: "Hombre",
    genderPreferNot: "Prefiero no decirlo",
    phone: "N\u00famero de tel\u00e9fono",
    phonePlaceholder: "+49 ...",
    email: "Direcci\u00f3n de correo electr\u00f3nico",
    emailPlaceholder: "nombre@ejemplo.com",
    availability: "Disponibilidad",
    availabilityDate: "Fecha",
    availabilityTime: "Hora",
    clientAddress: "Direcci\u00f3n del cliente",
    clientCountry: "Pa\u00eds",
    clientCountryPlaceholder: "Alemania",
    clientAddressLine1: "Direcci\u00f3n l\u00ednea 1",
    clientAddressLine1Placeholder: "Calle y n\u00famero",
    clientAddressLine2: "Direcci\u00f3n l\u00ednea 2",
    clientAddressLine2Placeholder: "Apartamento, entrada, etc.",
    clientPostalCode: "C\u00f3digo postal",
    clientPostalCodePlaceholder: "p. ej. 10115",
    clientCity: "Ciudad",
    clientCityPlaceholder: "Berl\u00edn",
    clientFloor: "Piso",
    clientFloorPlaceholder: "p. ej. 3",
    clientUnitNumber: "N\u00famero de unidad",
    clientUnitNumberPlaceholder: "p. ej. 3B",
    landlordSection: "Propietario (opcional)",
    landlordPersonGroup: "Propietario",
    landlordContactPersonGroup: "Persona de contacto",
    landlordContactGender: "Sexo",
    landlordGivenName: "Nombre",
    landlordGivenNamePlaceholder: "Nombre",
    landlordSurname: "Apellidos",
    landlordSurnamePlaceholder: "Apellidos",
    landlordCompanyName: "Nombre de la empresa",
    landlordCompanyNamePlaceholder: "Empresa / administraci\u00f3n de fincas",
    landlordContactGivenName: "Nombre",
    landlordContactGivenNamePlaceholder: "Nombre",
    landlordContactSurname: "Apellidos",
    landlordContactSurnamePlaceholder: "Apellidos",
    landlordPhone: "Tel\u00e9fono de la persona de contacto",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Correo de la persona de contacto",
    landlordEmailPlaceholder: "contacto@ejemplo.com",
    hausmeisterSection: "Encargado (opcional)",
    hausmeisterGivenName: "Nombre",
    hausmeisterGivenNamePlaceholder: "Nombre",
    hausmeisterSurname: "Apellidos",
    hausmeisterSurnamePlaceholder: "Apellidos",
    hausmeisterPhone: "Tel\u00e9fono del encargado",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "Correo del encargado",
    hausmeisterEmailPlaceholder: "encargado@ejemplo.com",
    problemDescription: "Descripci\u00f3n del problema",
    problemPlaceholder: "Describa brevemente el problema",
    serialNumber: "N\u00famero(s) de serie del electrodom\u00e9stico",
    serialPlaceholder: "Introduzca un n\u00famero de serie",
    serialNumberAdd: "A\u00f1adir",
    serialNumberRequired: "Introduzca al menos un n\u00famero de serie o suba una foto del n\u00famero de serie.",
    serialNumberImage: "Foto del n\u00famero o de los n\u00fameros de serie",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Ayuda: d\u00f3nde encontrar el n\u00famero de serie",
    serialNumberHelpTitle: "Encontrar el n\u00famero de serie",
    serialNumberHelpBody: "Normalmente puede encontrar el n\u00famero de serie en la placa del aparato o en una pared interior. Los ejemplos siguientes muestran ubicaciones t\u00edpicas.",
    serialNumberHelpAlt1: "Ejemplo: n\u00famero de serie en la etiqueta del aparato",
    serialNumberHelpAlt2: "Ejemplo: n\u00famero de serie dentro del frigor\u00edfico",
    attachments: "Adjuntos (opcional)",
    attachmentsHint: "PDF, im\u00e1genes u oficina: hasta 5 archivos, 4 MB cada uno.",
    attachmentsClear: "Quitar todos",
    attachmentsSelected: "{count} archivo(s) seleccionado(s)",
    attachmentsErrorTooMany: "Puede adjuntar como m\u00e1ximo 5 archivos.",
    attachmentsErrorFileTooLarge: "Cada archivo debe tener 4 MB o menos.",
    attachmentsErrorType: "Tipo de archivo no permitido (p. ej. PDF, im\u00e1genes, Word/Excel).",
    submit: "Enviar reclamaci\u00f3n",
    submitting: "Enviando...",
    contactError: "Indique al menos un n\u00famero de tel\u00e9fono o una direcci\u00f3n de correo electr\u00f3nico.",
    submitError: "No se pudo enviar la reclamaci\u00f3n.",
    submitSuccess: "La reclamaci\u00f3n se ha enviado correctamente.",
  },
  fr: {
    eyebrow: "Service Fragmento",
    title: "Bienvenue chez architecto",
    intro:
      "Choisissez le parcours adapt\u00e9 \u00e0 votre demande. Vous pouvez poursuivre une commande ou un achat compl\u00e9mentaire, ou envoyer une r\u00e9clamation \u00e0 notre \u00e9quipe de support.",
    purchaseBadge: "Achat compl\u00e9mentaire",
    purchaseTitle: "Achat compl\u00e9mentaire",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "Ouvrez le configurateur de cuisine et continuez avec des composants ou accessoires suppl\u00e9mentaires.",
    complaintBadge: "R\u00e9clamation",
    complaintTitle: "D\u00e9poser une r\u00e9clamation",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "Pour un dommage, un d\u00e9faut ou une pi\u00e8ce manquante, utilisez le formulaire de r\u00e9clamation et envoyez le dossier au support.",
    purchasePanelTitle: "Continuer vers le processus d'achat",
    purchasePanelText: "Si le locataire a besoin d'articles suppl\u00e9mentaires plut\u00f4t que d'une r\u00e9clamation, continuez vers le configurateur.",
    openConfigurator: "Ouvrir le configurateur",
    back: "Retour",
    formTitle: "Formulaire SAV",
    formIntro: "Renseignez ci-dessous les principales informations de r\u00e9clamation.",
    requiredFieldTitle: "Champ obligatoire",
    fieldOptionalSuffix: " (facultatif)",
    contractNumber: "Num\u00e9ro de contrat d'achat",
    contractPlaceholder: "ex. 736267",
    contractNumberHelpTrigger: "O\u00f9 la trouver ?",
    contractNumberHelpAria: "Aide : o\u00f9 trouver le num\u00e9ro de contrat sur le document",
    contractNumberHelpTitle: "Trouver le num\u00e9ro de contrat",
    contractNumberHelpBody: "Ces exemples montrent o\u00f9 le num\u00e9ro appara\u00eet g\u00e9n\u00e9ralement sur vos documents :",
    contractNumberHelpClose: "Fermer",
    contractNumberHelpAlt1: "Exemple 1 : num\u00e9ro de contrat sur le document",
    contractNumberHelpAlt2: "Exemple 2 : num\u00e9ro de contrat sur le document",
    contractNumberHelpAlt3: "Exemple 3 : num\u00e9ro de contrat sur le document",
    contractNumberHelpPrev: "Exemple pr\u00e9c\u00e9dent",
    contractNumberHelpNext: "Exemple suivant",
    contractNumberHelpSlideDot: "Exemple {n} sur {total}",
    givenName: "Pr\u00e9nom",
    givenNamePlaceholder: "Pr\u00e9nom",
    surname: "Nom",
    surnamePlaceholder: "Nom",
    gender: "Genre",
    genderPlaceholder: "S\u00e9lectionnez",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderPreferNot: "Je pr\u00e9f\u00e8re ne pas r\u00e9pondre",
    phone: "Num\u00e9ro de t\u00e9l\u00e9phone",
    phonePlaceholder: "+49 ...",
    email: "Adresse e-mail",
    emailPlaceholder: "nom@exemple.com",
    availability: "Disponibilit\u00e9",
    availabilityDate: "Date",
    availabilityTime: "Heure",
    clientAddress: "Adresse du client",
    clientCountry: "Pays",
    clientCountryPlaceholder: "Allemagne",
    clientAddressLine1: "Adresse ligne 1",
    clientAddressLine1Placeholder: "Rue et num\u00e9ro",
    clientAddressLine2: "Adresse ligne 2",
    clientAddressLine2Placeholder: "Appartement, entr\u00e9e, etc.",
    clientPostalCode: "Code postal",
    clientPostalCodePlaceholder: "ex. 10115",
    clientCity: "Ville",
    clientCityPlaceholder: "Berlin",
    clientFloor: "\u00c9tage",
    clientFloorPlaceholder: "ex. 3",
    clientUnitNumber: "Num\u00e9ro d'unit\u00e9",
    clientUnitNumberPlaceholder: "ex. 3B",
    landlordSection: "Propri\u00e9taire (facultatif)",
    landlordPersonGroup: "Propri\u00e9taire",
    landlordContactPersonGroup: "Personne de contact",
    landlordContactGender: "Genre",
    landlordGivenName: "Pr\u00e9nom",
    landlordGivenNamePlaceholder: "Pr\u00e9nom",
    landlordSurname: "Nom",
    landlordSurnamePlaceholder: "Nom",
    landlordCompanyName: "Nom de l'entreprise",
    landlordCompanyNamePlaceholder: "Entreprise / gestion immobili\u00e8re",
    landlordContactGivenName: "Pr\u00e9nom",
    landlordContactGivenNamePlaceholder: "Pr\u00e9nom",
    landlordContactSurname: "Nom",
    landlordContactSurnamePlaceholder: "Nom",
    landlordPhone: "T\u00e9l\u00e9phone du contact",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail du contact",
    landlordEmailPlaceholder: "contact@exemple.com",
    hausmeisterSection: "Gardien (facultatif)",
    hausmeisterGivenName: "Pr\u00e9nom",
    hausmeisterGivenNamePlaceholder: "Pr\u00e9nom",
    hausmeisterSurname: "Nom",
    hausmeisterSurnamePlaceholder: "Nom",
    hausmeisterPhone: "T\u00e9l\u00e9phone du gardien",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail du gardien",
    hausmeisterEmailPlaceholder: "gardien@exemple.com",
    problemDescription: "Description du probl\u00e8me",
    problemPlaceholder: "D\u00e9crivez bri\u00e8vement le probl\u00e8me",
    serialNumber: "Num\u00e9ro(s) de s\u00e9rie de l'appareil",
    serialPlaceholder: "Saisissez un num\u00e9ro de s\u00e9rie",
    serialNumberAdd: "Ajouter",
    serialNumberRequired: "Veuillez saisir au moins un num\u00e9ro de s\u00e9rie ou envoyer une photo du num\u00e9ro de s\u00e9rie.",
    serialNumberImage: "Photo du ou des num\u00e9ros de s\u00e9rie",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Aide : o\u00f9 trouver le num\u00e9ro de s\u00e9rie",
    serialNumberHelpTitle: "Trouver le num\u00e9ro de s\u00e9rie",
    serialNumberHelpBody: "Vous trouverez g\u00e9n\u00e9ralement le num\u00e9ro de s\u00e9rie sur la plaque signal\u00e9tique de l'appareil ou sur une paroi int\u00e9rieure. Les exemples ci-dessous montrent les emplacements les plus courants.",
    serialNumberHelpAlt1: "Exemple : num\u00e9ro de s\u00e9rie sur l'\u00e9tiquette de l'appareil",
    serialNumberHelpAlt2: "Exemple : num\u00e9ro de s\u00e9rie \u00e0 l'int\u00e9rieur du r\u00e9frig\u00e9rateur",
    attachments: "Pi\u00e8ces jointes (facultatif)",
    attachmentsHint: "PDF, images ou bureautique : jusqu'\u00e0 5 fichiers, 4 Mo chacun.",
    attachmentsClear: "Tout retirer",
    attachmentsSelected: "{count} fichier(s) s\u00e9lectionn\u00e9(s)",
    attachmentsErrorTooMany: "Vous pouvez joindre au maximum 5 fichiers.",
    attachmentsErrorFileTooLarge: "Chaque fichier doit faire 4 Mo ou moins.",
    attachmentsErrorType: "Type de fichier non autoris\u00e9 (PDF, images, Word/Excel, etc.).",
    submit: "Envoyer la r\u00e9clamation",
    submitting: "Envoi en cours...",
    contactError: "Veuillez fournir au moins un num\u00e9ro de t\u00e9l\u00e9phone ou une adresse e-mail.",
    submitError: "La r\u00e9clamation n'a pas pu \u00eatre envoy\u00e9e.",
    submitSuccess: "La r\u00e9clamation a \u00e9t\u00e9 envoy\u00e9e avec succ\u00e8s.",
  },
  ru: {
    eyebrow: "\u0421\u0435\u0440\u0432\u0438\u0441 Fragmento",
    title: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 architecto",
    intro:
      "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u0443\u0442\u044c \u0434\u043b\u044f \u0432\u0430\u0448\u0435\u0433\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0430. \u0412\u044b \u043c\u043e\u0436\u0435\u0442\u0435 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0437\u0430\u043a\u0430\u0437 \u0438\u043b\u0438 \u0434\u043e\u043f\u043e\u043a\u0443\u043f\u043a\u0443, \u0438\u043b\u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e \u0432 \u0441\u043b\u0443\u0436\u0431\u0443 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0438.",
    purchaseBadge: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0430",
    purchaseTitle: "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u043e\u043a\u0443\u043f\u043a\u0430",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440 \u043a\u0443\u0445\u043d\u0438 \u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0441 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u043c\u0438 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0430\u043c\u0438 \u0438\u043b\u0438 \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u0430\u043c\u0438.",
    complaintBadge: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f",
    complaintTitle: "\u041f\u043e\u0434\u0430\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "\u0414\u043b\u044f \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0439, \u0434\u0435\u0444\u0435\u043a\u0442\u043e\u0432 \u0438\u043b\u0438 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439 \u0438\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0444\u043e\u0440\u043c\u0443 \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438 \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0437\u0430\u044f\u0432\u043a\u0443 \u0432 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0443.",
    purchasePanelTitle: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0443 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    purchasePanelText: "\u0415\u0441\u043b\u0438 \u0430\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440\u0443 \u043d\u0443\u0436\u043d\u044b \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u0432\u043c\u0435\u0441\u0442\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438, \u043f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440.",
    openConfigurator: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440",
    back: "\u041d\u0430\u0437\u0430\u0434",
    formTitle: "\u0421\u0435\u0440\u0432\u0438\u0441\u043d\u0430\u044f \u0444\u043e\u0440\u043c\u0430",
    formIntro: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043d\u0438\u0436\u0435 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438.",
    requiredFieldTitle: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043b\u0435",
    fieldOptionalSuffix: " (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    contractNumber: "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    contractPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 736267",
    contractNumberHelpTrigger: "\u0413\u0434\u0435 \u043d\u0430\u0439\u0442\u0438?",
    contractNumberHelpAria: "\u0421\u043f\u0440\u0430\u0432\u043a\u0430: \u0433\u0434\u0435 \u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430",
    contractNumberHelpTitle: "\u041a\u0430\u043a \u043d\u0430\u0439\u0442\u0438 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430",
    contractNumberHelpBody: "\u041d\u0430 \u043f\u0440\u0438\u043c\u0435\u0440\u0430\u0445 \u043d\u0438\u0436\u0435 \u0432\u0438\u0434\u043d\u043e, \u0433\u0434\u0435 \u043e\u0431\u044b\u0447\u043d\u043e \u0443\u043a\u0430\u0437\u0430\u043d \u043d\u043e\u043c\u0435\u0440 \u0432 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0445:",
    contractNumberHelpClose: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    contractNumberHelpAlt1: "\u041f\u0440\u0438\u043c\u0435\u0440 1: \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
    contractNumberHelpAlt2: "\u041f\u0440\u0438\u043c\u0435\u0440 2: \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
    contractNumberHelpAlt3: "\u041f\u0440\u0438\u043c\u0435\u0440 3: \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043d\u0430 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0435",
    contractNumberHelpPrev: "\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u043f\u0440\u0438\u043c\u0435\u0440",
    contractNumberHelpNext: "\u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439 \u043f\u0440\u0438\u043c\u0435\u0440",
    contractNumberHelpSlideDot: "\u041f\u0440\u0438\u043c\u0435\u0440 {n} \u0438\u0437 {total}",
    givenName: "\u0418\u043c\u044f",
    givenNamePlaceholder: "\u0418\u043c\u044f",
    surname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    surnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    gender: "\u041f\u043e\u043b",
    genderPlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435",
    genderFemale: "\u0416\u0435\u043d\u0441\u043a\u0438\u0439",
    genderMale: "\u041c\u0443\u0436\u0441\u043a\u043e\u0439",
    genderPreferNot: "\u041f\u0440\u0435\u0434\u043f\u043e\u0447\u0438\u0442\u0430\u044e \u043d\u0435 \u0443\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c",
    phone: "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430",
    phonePlaceholder: "+49 ...",
    email: "\u0410\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b",
    emailPlaceholder: "name@example.com",
    availability: "\u041a\u043e\u0433\u0434\u0430 \u0441 \u0432\u0430\u043c\u0438 \u043c\u043e\u0436\u043d\u043e \u0441\u0432\u044f\u0437\u0430\u0442\u044c\u0441\u044f",
    availabilityDate: "\u0414\u0430\u0442\u0430",
    availabilityTime: "\u0412\u0440\u0435\u043c\u044f",
    clientAddress: "\u0410\u0434\u0440\u0435\u0441 \u043a\u043b\u0438\u0435\u043d\u0442\u0430",
    clientCountry: "\u0421\u0442\u0440\u0430\u043d\u0430",
    clientCountryPlaceholder: "\u0413\u0435\u0440\u043c\u0430\u043d\u0438\u044f",
    clientAddressLine1: "\u0410\u0434\u0440\u0435\u0441, \u0441\u0442\u0440\u043e\u043a\u0430 1",
    clientAddressLine1Placeholder: "\u0423\u043b\u0438\u0446\u0430 \u0438 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u043c\u0430",
    clientAddressLine2: "\u0410\u0434\u0440\u0435\u0441, \u0441\u0442\u0440\u043e\u043a\u0430 2",
    clientAddressLine2Placeholder: "\u041a\u0432\u0430\u0440\u0442\u0438\u0440\u0430, \u043f\u043e\u0434\u044a\u0435\u0437\u0434 \u0438 \u0442.\u0434.",
    clientPostalCode: "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441",
    clientPostalCodePlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 10115",
    clientCity: "\u0413\u043e\u0440\u043e\u0434",
    clientCityPlaceholder: "\u0411\u0435\u0440\u043b\u0438\u043d",
    clientFloor: "\u042d\u0442\u0430\u0436",
    clientFloorPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 3",
    clientUnitNumber: "\u041d\u043e\u043c\u0435\u0440 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b",
    clientUnitNumberPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 3B",
    landlordSection: "\u0410\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044c (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    landlordGivenName: "\u0418\u043c\u044f",
    landlordGivenNamePlaceholder: "\u0418\u043c\u044f",
    landlordSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u043e\u0433\u043e \u043b\u0438\u0446\u0430",
    landlordPhonePlaceholder: "+49 ...",
    landlordCompanyName: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438",
    landlordCompanyNamePlaceholder: "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f / \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c\u044e",
    landlordContactGivenName: "\u0418\u043c\u044f",
    landlordContactGivenNamePlaceholder: "\u0418\u043c\u044f",
    landlordContactSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordContactSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordEmail: "E-mail \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u043e\u0433\u043e \u043b\u0438\u0446\u0430",
    landlordEmailPlaceholder: "contact@example.com",
    hausmeisterSection: "\u0425\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440 (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    hausmeisterGivenName: "\u0418\u043c\u044f",
    hausmeisterGivenNamePlaceholder: "\u0418\u043c\u044f",
    hausmeisterSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    hausmeisterSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    hausmeisterPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterPhonePlaceholder: "+49 ...",
    hausmeisterEmail: "E-mail \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440\u0430",
    hausmeisterEmailPlaceholder: "hausmeister@example.com",
    problemDescription: "\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u044b",
    problemPlaceholder: "\u041a\u0440\u0430\u0442\u043a\u043e \u043e\u043f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443",
    serialNumber: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 / \u043d\u043e\u043c\u0435\u0440\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0430",
    serialPlaceholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
    serialNumberAdd: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c",
    serialNumberRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0438\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043e\u0442\u043e \u0448\u0438\u043b\u044c\u0434\u0438\u043a\u0430.",
    serialNumberImage: "\u0424\u043e\u0442\u043e \u0441\u0435\u0440\u0438\u0439\u043d\u043e\u0433\u043e \u043d\u043e\u043c\u0435\u0440\u0430 / \u043d\u043e\u043c\u0435\u0440\u043e\u0432",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "\u0421\u043f\u0440\u0430\u0432\u043a\u0430: \u0433\u0434\u0435 \u043d\u0430\u0439\u0442\u0438 \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
    serialNumberHelpTitle: "\u041a\u0430\u043a \u043d\u0430\u0439\u0442\u0438 \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
    serialNumberHelpBody: "\u0421\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u043e\u0431\u044b\u0447\u043d\u043e \u0443\u043a\u0430\u0437\u0430\u043d \u043d\u0430 \u0437\u0430\u0432\u043e\u0434\u0441\u043a\u043e\u0439 \u0442\u0430\u0431\u043b\u0438\u0447\u043a\u0435 \u043f\u0440\u0438\u0431\u043e\u0440\u0430 \u0438\u043b\u0438 \u043d\u0430 \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0435\u0439 \u0441\u0442\u0435\u043d\u043a\u0435. \u041d\u0438\u0436\u0435 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u0442\u0438\u043f\u0438\u0447\u043d\u044b\u0435 \u043c\u0435\u0441\u0442\u0430.",
    serialNumberHelpAlt1: "\u041f\u0440\u0438\u043c\u0435\u0440: \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u043d\u0430 \u0442\u0430\u0431\u043b\u0438\u0447\u043a\u0435 \u043f\u0440\u0438\u0431\u043e\u0440\u0430",
    serialNumberHelpAlt2: "\u041f\u0440\u0438\u043c\u0435\u0440: \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0432\u043d\u0443\u0442\u0440\u0438 \u0445\u043e\u043b\u043e\u0434\u0438\u043b\u044c\u043d\u0438\u043a\u0430",
    attachments: "\u0412\u043b\u043e\u0436\u0435\u043d\u0438\u044f (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    attachmentsHint: "PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u043e\u0444\u0438\u0441\u043d\u044b\u0435 \u0444\u0430\u0439\u043b\u044b \u2014 \u0434\u043e 5 \u0444\u0430\u0439\u043b\u043e\u0432, \u0434\u043e 4 \u041c\u0411 \u043a\u0430\u0436\u0434\u044b\u0439.",
    attachmentsClear: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435",
    attachmentsSelected: "\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432: {count}",
    attachmentsErrorTooMany: "\u041d\u0435 \u0431\u043e\u043b\u0435\u0435 5 \u0432\u043b\u043e\u0436\u0435\u043d\u0438\u0439.",
    attachmentsErrorFileTooLarge: "\u041a\u0430\u0436\u0434\u044b\u0439 \u0444\u0430\u0439\u043b \u2014 \u043d\u0435 \u0431\u043e\u043b\u0435\u0435 4 \u041c\u0411.",
    attachmentsErrorType: "\u0422\u0438\u043f \u0444\u0430\u0439\u043b\u0430 \u043d\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043d (PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f, Word/Excel).",
    submit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    submitting: "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430...",
    contactError: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430 \u0438\u043b\u0438 \u0430\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b.",
    submitError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e.",
    submitSuccess: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430.",
  },
};

const INITIAL_FORM = {
  contractNumber: "",
  givenName: "",
  surname: "",
  gender: "",
  phone: "",
  email: "",
  preferredContactDate: "",
  preferredContactTimeWindow: "",
  preferredContactTimeFrom: "",
  preferredContactTimeTo: "",
  clientCountry: "",
  clientAddressLine1: "",
  clientAddressLine2: "",
  clientPostalCode: "",
  clientCity: "",
  clientFloor: "",
  clientUnitNumber: "",
  landlordGivenName: "",
  landlordSurname: "",
  landlordCompanyName: "",
  landlordContactGender: "",
  landlordContactGivenName: "",
  landlordContactSurname: "",
  landlordPhone: "",
  landlordEmail: "",
  hausmeisterGivenName: "",
  hausmeisterSurname: "",
  hausmeisterPhone: "",
  hausmeisterEmail: "",
  problemDescription: "",
  serialNumber: "",
};

const EMPTY_CONTRACT_LOOKUP = {
  status: "idle",
  contractNumber: "",
  message: "",
  kitchenPlan: null,
};

const EMPTY_CLAIM_ASSISTANT_MESSAGES = [];

function buildAutofillFieldsFromContract(contract) {
  const address = contract?.address || {};

  return {
    clientCountry: String(address.country || "").trim(),
    clientAddressLine1: String(address.address1 || "").trim(),
    clientAddressLine2: String(address.address2 || "").trim(),
    clientPostalCode: String(address.postalCode || "").trim(),
    clientCity: String(address.city || "").trim(),
    clientFloor: String(contract?.floor || "").trim(),
    clientUnitNumber: String(contract?.unitNumber || "").trim(),
  };
}

function normalizeSerialNumberList(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");
}

function parseSerialNumberList(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function autoResizeTextarea(element) {
  if (!element) {
    return;
  }
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

function isPreferredContactCustom(windowValue) {
  return String(windowValue || "").trim() === "custom";
}

function formatIsoDateToShort(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }
  return `${match[3]}/${match[2]}/${match[1].slice(-2)}`;
}

function formatShortDateToIso(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) {
    return "";
  }
  return `20${match[3]}-${match[2]}-${match[1]}`;
}

function normalizeShortDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export default function ServiceClaimFlow() {
  const [language, setLanguage] = useState("de");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractLookup, setContractLookup] = useState(EMPTY_CONTRACT_LOOKUP);
  const [problemComponentIds, setProblemComponentIds] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [serialNumberImage, setSerialNumberImage] = useState(null);
  const [attachmentFieldKey, setAttachmentFieldKey] = useState(0);
  const [serialNumberImageFieldKey, setSerialNumberImageFieldKey] = useState(0);
  const [isContractNumberHelpOpen, setIsContractNumberHelpOpen] = useState(false);
  const [isSerialNumberHelpOpen, setIsSerialNumberHelpOpen] = useState(false);
  const [contractHelpSlide, setContractHelpSlide] = useState(0);
  const [serialHelpSlide, setSerialHelpSlide] = useState(0);
  const [isClaimAssistantOpen, setIsClaimAssistantOpen] = useState(false);
  const [claimAssistantMessages, setClaimAssistantMessages] = useState(EMPTY_CLAIM_ASSISTANT_MESSAGES);
  const [claimAssistantQuestion, setClaimAssistantQuestion] = useState("");
  const [isClaimAssistantLoading, setIsClaimAssistantLoading] = useState(false);
  const [isClaimAssistantVoiceSupported, setIsClaimAssistantVoiceSupported] = useState(false);
  const [isClaimAssistantListening, setIsClaimAssistantListening] = useState(false);
  const [claimAssistantVoiceError, setClaimAssistantVoiceError] = useState("");
  const [selectedClaimAssistantContextKey, setSelectedClaimAssistantContextKey] = useState("claim");
  const [serialNumberDraft, setSerialNumberDraft] = useState("");
  const languageMenuRef = useRef(null);
  const contractLookupTimeoutRef = useRef(null);
  const contractLookupRequestIdRef = useRef(0);
  const contractHelpTouchXRef = useRef(null);
  const claimAssistantRecognitionRef = useRef(null);
  const claimAssistantAudioRef = useRef(null);
  const claimAssistantLastVoiceSubmitRef = useRef({ text: "", submittedAt: 0 });
  const preferredContactDatePickerRef = useRef(null);

  const copy = COPY[language] || COPY.en;
  const fallbackCopy = COPY.en;
  const formValues = { ...INITIAL_FORM, ...form };
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
  const isComplaintMode = mode === "complaint";
  const hasContactMethod = useMemo(
    () => Boolean(formValues.phone.trim() || formValues.email.trim()),
    [formValues.email, formValues.phone],
  );
  const normalizedContractNumber = formValues.contractNumber.trim();
  const kitchenAreasLinePrefix = copy.kitchenAreasLinePrefix || fallbackCopy.kitchenAreasLinePrefix;
  const activeKitchenPlan = useMemo(() => {
    if (
      contractLookup.status === "found" &&
      contractLookup.contractNumber === normalizedContractNumber
    ) {
      return contractLookup.kitchenPlan;
    }
    return null;
  }, [
    contractLookup.status,
    contractLookup.contractNumber,
    contractLookup.kitchenPlan,
    normalizedContractNumber,
  ]);
  const selectedProblemAreas = useMemo(() => {
    if (!activeKitchenPlan?.selectableComponents?.length || !problemComponentIds.length) {
      return [];
    }
    const selectedIds = new Set(problemComponentIds);
    return activeKitchenPlan.selectableComponents
      .filter((entry) => selectedIds.has(entry.componentId))
      .map((entry) => ({
        ...entry,
        label: formatClaimAreaName(entry, entry.name, language),
      }));
  }, [activeKitchenPlan, problemComponentIds, language]);
  const claimAssistantContextOptions = useMemo(() => {
    return [
      { key: "claim", label: t("claimAssistantContextClaim"), type: "claim" },
      ...selectedProblemAreas.map((area) => ({
        key: area.componentId,
        label: area.label,
        type: "area",
        area,
      })),
    ];
  }, [selectedProblemAreas, language]);
  const selectedClaimAssistantContext =
    claimAssistantContextOptions.find((option) => option.key === selectedClaimAssistantContextKey)
    || claimAssistantContextOptions[0];
  const claimAssistantIntroText =
    selectedClaimAssistantContext?.type === "area"
      ? t("claimAssistantIntroSelected").replace("{label}", selectedClaimAssistantContext.label)
      : t("claimAssistantIntro");
  const serialNumberEntries = useMemo(
    () => parseSerialNumberList(formValues.serialNumber),
    [formValues.serialNumber],
  );
  const isPreferredContactCustomTime = isPreferredContactCustom(formValues.preferredContactTimeWindow);
  const parsedProblemDescription = useMemo(
    () => splitKitchenAreasFromProblemDescription(formValues.problemDescription),
    [formValues.problemDescription],
  );
  const selectedProblemAreasWithDetails = useMemo(() => {
    return selectedProblemAreas.map((area) => ({
      ...area,
      detail: parsedProblemDescription.areaDetailsByName.get(area.label) || "",
    }));
  }, [parsedProblemDescription, selectedProblemAreas]);

  function t(key) {
    if (Object.prototype.hasOwnProperty.call(copy, key)) {
      return copy[key];
    }
    if (Object.prototype.hasOwnProperty.call(fallbackCopy, key)) {
      return fallbackCopy[key];
    }
    return "";
  }

  const requiredFieldTitle = t("requiredFieldTitle");
  const fieldOptionalSuffix = t("fieldOptionalSuffix");

  function getPreferredContactWindowLabel(windowValue) {
    if (windowValue === "morning") return t("preferredContactTimeWindowMorning");
    if (windowValue === "afternoon") return t("preferredContactTimeWindowAfternoon");
    if (windowValue === "evening") return t("preferredContactTimeWindowEvening");
    if (windowValue === "custom") return t("preferredContactTimeWindowCustom");
    return "";
  }

  function buildPreferredContactSummary() {
    const preferredContactDate = String(formValues.preferredContactDate || "").trim();
    const preferredContactTimeWindow = String(formValues.preferredContactTimeWindow || "").trim();
    const preferredContactTimeFrom = String(formValues.preferredContactTimeFrom || "").trim();
    const preferredContactTimeTo = String(formValues.preferredContactTimeTo || "").trim();

    if (!preferredContactDate && !preferredContactTimeWindow) {
      return "";
    }

    const summaryParts = [];
    if (preferredContactDate) {
      summaryParts.push(preferredContactDate);
    }
    if (preferredContactTimeWindow) {
      summaryParts.push(
        preferredContactTimeWindow === "custom"
          ? `${t("preferredContactTimeWindowCustom")}${preferredContactTimeFrom && preferredContactTimeTo ? ` (${preferredContactTimeFrom}–${preferredContactTimeTo})` : ""}`
          : getPreferredContactWindowLabel(preferredContactTimeWindow),
      );
    }
    return summaryParts.join(" | ");
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      if (contractLookupTimeoutRef.current) {
        window.clearTimeout(contractLookupTimeoutRef.current);
      }
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!isContractNumberHelpOpen) {
      return undefined;
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsContractNumberHelpOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isContractNumberHelpOpen]);

  useEffect(() => {
    if (!isComplaintMode) {
      setIsContractNumberHelpOpen(false);
    }
  }, [isComplaintMode]);

  useEffect(() => {
    if (!isComplaintMode) {
      setIsClaimAssistantOpen(false);
      setClaimAssistantQuestion("");
      setIsClaimAssistantLoading(false);
      setIsClaimAssistantListening(false);
      setClaimAssistantVoiceError("");
      setSelectedClaimAssistantContextKey("claim");
    }
  }, [isComplaintMode]);

  useEffect(() => {
    if (isClaimAssistantOpen) {
      return;
    }
    claimAssistantRecognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
    setIsClaimAssistantListening(false);
    setClaimAssistantVoiceError("");
  }, [isClaimAssistantOpen]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsClaimAssistantVoiceSupported(Boolean(SpeechRecognition && window?.speechSynthesis));

    const stopClaimAssistantVoice = () => {
      claimAssistantRecognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
    };

    window.addEventListener("beforeunload", stopClaimAssistantVoice);
    window.addEventListener("pagehide", stopClaimAssistantVoice);

    return () => {
      stopClaimAssistantVoice();
      window.removeEventListener("beforeunload", stopClaimAssistantVoice);
      window.removeEventListener("pagehide", stopClaimAssistantVoice);
    };
  }, []);

  useEffect(() => {
    if (claimAssistantContextOptions.some((option) => option.key === selectedClaimAssistantContextKey)) {
      return;
    }
    setSelectedClaimAssistantContextKey("claim");
  }, [claimAssistantContextOptions, selectedClaimAssistantContextKey]);

  useEffect(() => {
    setProblemComponentIds([]);
  }, [contractLookup.contractNumber]);

  useEffect(() => {
    if (!isComplaintMode) {
      return undefined;
    }
    const plan = activeKitchenPlan;
    if (!plan?.selectableComponents?.length) {
      return undefined;
    }

    const metaById = new Map(plan.selectableComponents.map((entry) => [entry.componentId, entry]));

    setForm((prev) => {
      const next = composeProblemDescriptionWithAreas(
        kitchenAreasLinePrefix,
        problemComponentIds,
        metaById,
        prev.problemDescription,
        (area, fallbackName) => formatClaimAreaName(area, fallbackName, language),
      );
      if (next === prev.problemDescription) {
        return prev;
      }
      return { ...prev, problemDescription: next };
    });
    return undefined;
  }, [
    isComplaintMode,
    activeKitchenPlan,
    problemComponentIds,
    kitchenAreasLinePrefix,
    language,
  ]);

  function handleModeSelect(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
  }

  function handleFieldChange(field, value) {
    setForm((current) => {
      const next = {
        ...current,
        [field]: field === "preferredContactDate" ? normalizeShortDateInput(value) : value,
      };
      if (field === "preferredContactTimeWindow" && value !== "custom") {
        next.preferredContactTimeFrom = "";
        next.preferredContactTimeTo = "";
      }
      return next;
    });

    if (field === "contractNumber") {
      const nextContractNumber = value.trim();
      contractLookupRequestIdRef.current += 1;

      if (contractLookupTimeoutRef.current) {
        window.clearTimeout(contractLookupTimeoutRef.current);
      }

      if (!nextContractNumber) {
        setContractLookup({ ...EMPTY_CONTRACT_LOOKUP });
      } else {
        setContractLookup({
          status: "loading",
          contractNumber: nextContractNumber,
          message: "",
          kitchenPlan: null,
        });

        const requestId = contractLookupRequestIdRef.current;
        contractLookupTimeoutRef.current = window.setTimeout(async () => {
          try {
            const response = await fetch(`/api/service-claims/contracts/${encodeURIComponent(nextContractNumber)}`);
            const payload = await response.json();

            if (requestId !== contractLookupRequestIdRef.current) {
              return;
            }

            if (!response.ok) {
              throw new Error(payload.error || t("contractLookupError"));
            }

            setForm((current) => {
              if (current.contractNumber.trim() !== nextContractNumber) {
                return current;
              }

              return {
                ...current,
                ...buildAutofillFieldsFromContract(payload.contract),
              };
            });

            setContractLookup({
              status: "found",
              contractNumber: nextContractNumber,
              message: "",
              kitchenPlan: payload.kitchenPlan || null,
            });
          } catch (lookupError) {
            if (requestId !== contractLookupRequestIdRef.current) {
              return;
            }

            setContractLookup({
              status: "missing",
              contractNumber: nextContractNumber,
              message: lookupError.message || t("contractLookupError"),
              kitchenPlan: null,
            });
          }
        }, 450);
      }
    }

    if (error) {
      setError("");
    }
  }

  function updateProblemDescriptionWithSelectedAreas(areaDetailsByComponentId, userText) {
    const plan = activeKitchenPlan;
    if (!plan?.selectableComponents?.length) {
      handleFieldChange("problemDescription", userText);
      return;
    }

    const metaById = new Map(plan.selectableComponents.map((entry) => [entry.componentId, entry]));
    const areaDetailsByName = new Map();

    for (const componentId of problemComponentIds) {
      const meta = metaById.get(componentId);
      if (!meta) {
        continue;
      }
      areaDetailsByName.set(
        formatClaimAreaName(meta, meta.name, language),
        areaDetailsByComponentId[componentId] || "",
      );
    }

    handleFieldChange(
      "problemDescription",
      composeProblemDescriptionFromParts(
        kitchenAreasLinePrefix,
        problemComponentIds,
        metaById,
        areaDetailsByName,
        userText,
        (area, fallbackName) => formatClaimAreaName(area, fallbackName, language),
      ),
    );
  }

  function handleProblemAreaDetailChange(componentId, value) {
    const nextDetailsByComponentId = Object.fromEntries(
      selectedProblemAreasWithDetails.map((area) => [area.componentId, area.detail]),
    );
    nextDetailsByComponentId[componentId] = value;
    updateProblemDescriptionWithSelectedAreas(nextDetailsByComponentId, parsedProblemDescription.userText);
  }

  function handleAdditionalProblemDetailsChange(value) {
    const currentDetailsByComponentId = Object.fromEntries(
      selectedProblemAreasWithDetails.map((area) => [area.componentId, area.detail]),
    );
    updateProblemDescriptionWithSelectedAreas(currentDetailsByComponentId, value);
  }

  function handleAttachmentsSelected(event) {
    const picked = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!picked.length) {
      return;
    }

    setError("");
    setAttachments((prev) => {
      const next = [...prev];
      let message = "";
      for (const file of picked) {
        const currentCount = next.length + (serialNumberImage ? 1 : 0);
        if (currentCount >= MAX_CLAIM_ATTACHMENT_COUNT) {
          message = copy.attachmentsErrorTooMany;
          break;
        }
        if (file.size > MAX_CLAIM_ATTACHMENT_BYTES) {
          message = copy.attachmentsErrorFileTooLarge;
          continue;
        }
        if (!isClientAllowedAttachment(file)) {
          message = copy.attachmentsErrorType;
          continue;
        }
        next.push(file);
      }
      if (message) {
        queueMicrotask(() => setError(message));
      }
      return next;
    });
  }

  function handleSerialNumberImageSelected(event) {
    const picked = event.target.files?.[0] || null;
    event.target.value = "";
    if (!picked) {
      return;
    }

    if (picked.size > MAX_CLAIM_ATTACHMENT_BYTES) {
      setError(copy.attachmentsErrorFileTooLarge);
      return;
    }

    if (!picked.type?.toLowerCase().startsWith("image/") || !isClientAllowedAttachment(picked)) {
      setError(copy.attachmentsErrorType);
      return;
    }

    if (!serialNumberImage && attachments.length + 1 > MAX_CLAIM_ATTACHMENT_COUNT) {
      setError(copy.attachmentsErrorTooMany);
      return;
    }

    setError("");
    setSerialNumberImage(picked);
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeSerialNumberImage() {
    setSerialNumberImage(null);
    setSerialNumberImageFieldKey((key) => key + 1);
    setError("");
  }

  function clearAttachments() {
    setAttachments([]);
    setAttachmentFieldKey((key) => key + 1);
    setError("");
  }

  function syncSerialNumberEntries(entries) {
    handleFieldChange("serialNumber", normalizeSerialNumberList(entries.join("\n")));
  }

  function addSerialNumberEntry(rawValue = serialNumberDraft) {
    const nextEntry = String(rawValue || "").trim();
    if (!nextEntry) {
      return;
    }

    const alreadyExists = serialNumberEntries.some(
      (entry) => entry.toLowerCase() === nextEntry.toLowerCase(),
    );
    if (alreadyExists) {
      setSerialNumberDraft("");
      return;
    }

    syncSerialNumberEntries([...serialNumberEntries, nextEntry]);
    setSerialNumberDraft("");
  }

  function removeSerialNumberEntry(index) {
    syncSerialNumberEntries(serialNumberEntries.filter((_, entryIndex) => entryIndex !== index));
  }

  function goContractHelpPrev() {
    setContractHelpSlide((s) => Math.max(0, s - 1));
  }

  function goContractHelpNext() {
    setContractHelpSlide((s) => Math.min(CONTRACT_HELP_SLIDE_COUNT - 1, s + 1));
  }

  function goSerialHelpPrev() {
    setSerialHelpSlide((s) => Math.max(0, s - 1));
  }

  function goSerialHelpNext() {
    setSerialHelpSlide((s) => Math.min(SERIAL_HELP_SLIDE_COUNT - 1, s + 1));
  }

  function onContractHelpTouchStart(event) {
    contractHelpTouchXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onSerialHelpTouchStart(event) {
    contractHelpTouchXRef.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onContractHelpTouchEnd(event) {
    const start = contractHelpTouchXRef.current;
    contractHelpTouchXRef.current = null;
    if (start == null) {
      return;
    }
    const end = event.changedTouches[0]?.clientX;
    if (typeof end !== "number") {
      return;
    }
    const delta = end - start;
    const threshold = 56;
    if (delta < -threshold) {
      goContractHelpNext();
    } else if (delta > threshold) {
      goContractHelpPrev();
    }
  }

  function onSerialHelpTouchEnd(event) {
    const start = contractHelpTouchXRef.current;
    contractHelpTouchXRef.current = null;
    if (start == null) {
      return;
    }
    const end = event.changedTouches[0]?.clientX;
    if (typeof end !== "number") {
      return;
    }
    const delta = end - start;
    const threshold = 56;
    if (delta < -threshold) {
      goSerialHelpNext();
    } else if (delta > threshold) {
      goSerialHelpPrev();
    }
  }

  function contractHelpSlideAriaLabel(index) {
    return t("contractNumberHelpSlideDot")
      .replace("{n}", String(index + 1))
      .replace("{total}", String(CONTRACT_HELP_SLIDE_COUNT));
  }

  function serialHelpSlideAriaLabel(index) {
    return t("contractNumberHelpSlideDot")
      .replace("{n}", String(index + 1))
      .replace("{total}", String(SERIAL_HELP_SLIDE_COUNT));
  }

  function buildClientAddress() {
    return [
      formValues.clientAddressLine1.trim(),
      formValues.clientAddressLine2.trim(),
      `${formValues.clientPostalCode.trim()} ${formValues.clientCity.trim()}`.trim(),
      formValues.clientCountry.trim(),
      [
        formValues.clientFloor.trim() ? `Floor: ${formValues.clientFloor.trim()}` : "",
        formValues.clientUnitNumber.trim() ? `Unit: ${formValues.clientUnitNumber.trim()}` : "",
      ].filter(Boolean).join(", "),
    ].filter(Boolean).join(", ");
  }

  function buildSubmittedProblemDescription() {
    const description = String(formValues.problemDescription || "").trim();
    const preferredContact = buildPreferredContactSummary();
    if (!preferredContact) {
      return description;
    }
    if (/^Erreichbarkeit\s*:/im.test(description)) {
      return description;
    }
    return `${description}\n\nErreichbarkeit: ${preferredContact}`.trim();
  }

  function getClaimAssistantSpeechLanguage() {
    if (language === "de") return "de-DE";
    if (language === "tr") return "tr-TR";
    if (language === "es") return "es-ES";
    if (language === "fr") return "fr-FR";
    if (language === "ru") return "ru-RU";
    return "en-US";
  }

  function formatClaimAssistantSpokenText(text) {
    return String(text || "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function speakClaimAssistantAnswer(text) {
    const answer = formatClaimAssistantSpokenText(text);
    if (!answer) {
      return;
    }

    speakAssistantTextWithTts(answer, {
      audioRef: claimAssistantAudioRef,
      language: getClaimAssistantSpeechLanguage(),
      fallbackRate: 0.96,
    });
  }

  async function submitClaimAssistantQuestion(rawQuestion, options = {}) {
    const question = String(rawQuestion || "").trim();
    if (!question || isClaimAssistantLoading) {
      return;
    }

    const nextUserMessage = { role: "user", text: question };
    const nextConversationMessages = claimAssistantMessages
      .filter((message) => message?.role && message?.text)
      .slice(-6)
      .map((message) => ({ role: message.role, text: message.text }));

    setClaimAssistantMessages((current) => [...current, nextUserMessage]);
    setClaimAssistantQuestion("");
    setIsClaimAssistantLoading(true);
    setClaimAssistantVoiceError("");

    try {
      const response = await fetch("/api/service-claims/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          question,
          context: selectedClaimAssistantContext,
          conversationMessages: nextConversationMessages,
          selectedAreas: selectedProblemAreas.map((area) => ({
            componentId: area.componentId,
            code: area.code,
            name: area.label,
          })),
          claim: {
            contractNumber: normalizedContractNumber,
            problemDescription: buildSubmittedProblemDescription(),
            serialNumber: String(formValues.serialNumber || "").trim(),
            hasSerialNumberImage: Boolean(serialNumberImage),
            attachmentCount: attachments.length + (serialNumberImage ? 1 : 0),
            preferredContactDate: String(formValues.preferredContactDate || "").trim(),
            preferredContactTimeWindow: String(formValues.preferredContactTimeWindow || "").trim(),
            preferredContactTimeFrom: String(formValues.preferredContactTimeFrom || "").trim(),
            preferredContactTimeTo: String(formValues.preferredContactTimeTo || "").trim(),
            availabilityDate: String(formValues.preferredContactDate || "").trim(),
            availabilityTime: buildPreferredContactSummary(),
            hasPhone: Boolean(String(formValues.phone || "").trim()),
            hasEmail: Boolean(String(formValues.email || "").trim()),
          },
        }),
      });

      const responseText = await response.text();
      let payload = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(t("claimAssistantErrorUnavailable"));
      }
      if (!response.ok) {
        throw new Error(payload.error || t("claimAssistantErrorUnavailable"));
      }

      if (payload.language && payload.language !== language) {
        setLanguage(payload.language);
      }

      setClaimAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.answer || t("claimAssistantErrorUnavailable"),
          ...(Array.isArray(payload.actions) && payload.actions.length ? { actions: payload.actions } : {}),
        },
      ]);
      if (options.speakAnswer) {
        speakClaimAssistantAnswer(payload.answer || t("claimAssistantErrorUnavailable"));
      }
    } catch (assistantError) {
      setClaimAssistantMessages((current) => [
        ...current,
        { role: "assistant", text: assistantError.message || t("claimAssistantErrorUnavailable"), tone: "error" },
      ]);
    } finally {
      setIsClaimAssistantLoading(false);
    }
  }

  async function handleClaimAssistantSubmit(event) {
    event.preventDefault();
    if (isClaimAssistantListening) {
      claimAssistantRecognitionRef.current?.stop?.();
      return;
    }
    const question = claimAssistantQuestion.trim();
    const lastVoiceSubmit = claimAssistantLastVoiceSubmitRef.current;
    if (
      question
      && lastVoiceSubmit.text === question
      && Date.now() - lastVoiceSubmit.submittedAt < 4000
    ) {
      setClaimAssistantQuestion("");
      return;
    }
    await submitClaimAssistantQuestion(question, { speakAnswer: true });
  }

  function toggleClaimAssistantVoice() {
    if (isClaimAssistantListening) {
      claimAssistantRecognitionRef.current?.stop?.();
      setIsClaimAssistantListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setClaimAssistantVoiceError(t("claimAssistantVoiceUnsupported"));
      return;
    }

    if (isClaimAssistantLoading) {
      return;
    }

    window.speechSynthesis.cancel();
    const recognition = new SpeechRecognition();
    claimAssistantRecognitionRef.current = recognition;
    recognition.lang = getClaimAssistantSpeechLanguage();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setClaimAssistantVoiceError("");
      setIsClaimAssistantListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) {
          isFinal = true;
        }
      }

      const nextQuestion = transcript.trim();
      if (!nextQuestion) {
        return;
      }

      setClaimAssistantQuestion(nextQuestion);
      if (isFinal) {
        recognition.stop();
        claimAssistantLastVoiceSubmitRef.current = { text: nextQuestion, submittedAt: Date.now() };
        setClaimAssistantQuestion("");
        submitClaimAssistantQuestion(nextQuestion, { speakAnswer: true });
      }
    };

    recognition.onerror = (event) => {
      const message =
        event?.error === "not-allowed"
          ? t("claimAssistantVoicePermission")
          : t("claimAssistantVoiceError");
      setClaimAssistantVoiceError(message);
      setIsClaimAssistantListening(false);
    };

    recognition.onend = () => {
      setIsClaimAssistantListening(false);
    };

    recognition.start();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      contractLookup.status === "missing"
      && contractLookup.contractNumber === normalizedContractNumber
    ) {
      setError(contractLookup.message || t("contractLookupError"));
      return;
    }

    if (!hasContactMethod) {
      setError(copy.contactError);
      return;
    }

    if (isPreferredContactCustomTime) {
      const preferredContactTimeFrom = String(formValues.preferredContactTimeFrom || "").trim();
      const preferredContactTimeTo = String(formValues.preferredContactTimeTo || "").trim();
      if (!preferredContactTimeFrom || !preferredContactTimeTo) {
        setError(t("preferredContactTimeCustomRequired"));
        return;
      }
      if (preferredContactTimeTo <= preferredContactTimeFrom) {
        setError(t("preferredContactTimeCustomOrder"));
        return;
      }
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      const normalizedSerialNumbers = normalizeSerialNumberList(
        [formValues.serialNumber, serialNumberDraft].filter(Boolean).join("\n"),
      );
      if (!normalizedSerialNumbers && !serialNumberImage) {
        setError(t("serialNumberRequired"));
        setIsSubmitting(false);
        return;
      }
      const payload = {
        ...form,
        clientAddress: buildClientAddress(),
        clientCountry: formValues.clientCountry.trim(),
        clientCity: formValues.clientCity.trim(),
        clientPostalCode: formValues.clientPostalCode.trim(),
        problemDescription: buildSubmittedProblemDescription(),
        serialNumber: normalizedSerialNumbers,
        hasSerialNumberImage: serialNumberImage ? "true" : "false",
        language,
      };
      for (const [key, value] of Object.entries(payload)) {
        formData.append(key, value == null ? "" : String(value));
      }
      const plan =
        contractLookup.status === "found" && contractLookup.contractNumber === normalizedContractNumber
          ? contractLookup.kitchenPlan
          : null;
      if (plan?.selectableComponents?.length) {
        const metaById = new Map(plan.selectableComponents.map((entry) => [entry.componentId, entry]));
        const problemAreas = problemComponentIds.map((id) => metaById.get(id)).filter(Boolean);
        formData.append("problemAreasJson", JSON.stringify(problemAreas));
      } else {
        formData.append("problemAreasJson", "[]");
      }
      if (serialNumberImage) {
        formData.append("attachments", serialNumberImage);
      }
      for (const file of attachments) {
        formData.append("attachments", file);
      }

      const response = await fetch("/api/service-claims", {
        method: "POST",
        body: formData,
      });

      const payloadResponse = await response.json();

      if (!response.ok) {
        throw new Error(payloadResponse.error || copy.submitError);
      }

      setSuccessMessage(payloadResponse.message || copy.submitSuccess);
      setForm(INITIAL_FORM);
      setSerialNumberDraft("");
      setAttachments([]);
      setSerialNumberImage(null);
      setProblemComponentIds([]);
      setAttachmentFieldKey((key) => key + 1);
      setSerialNumberImageFieldKey((key) => key + 1);
      setContractLookup(EMPTY_CONTRACT_LOOKUP);
    } catch (submitError) {
      setError(submitError.message || copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="service-page">
      <section className="service-hero">
        <div
          ref={languageMenuRef}
          className={`service-language-switcher${isLanguageMenuOpen ? " is-open" : ""}`}
          aria-label="Language switcher"
        >
          <button
            type="button"
            className="service-language-switcher__trigger"
            onClick={() => setIsLanguageMenuOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={isLanguageMenuOpen}
          >
            <img src={selectedLanguage.flagSrc} alt="" aria-hidden="true" />
            <span>{selectedLanguage.label}</span>
          </button>
          <div className="service-language-switcher__menu" role="listbox" aria-activedescendant={`language-option-${language}`}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                id={`language-option-${option.code}`}
                type="button"
                role="option"
                aria-selected={language === option.code}
                className={`service-language-switcher__option${language === option.code ? " is-active" : ""}`}
                onClick={() => {
                  setLanguage(option.code);
                  setIsLanguageMenuOpen(false);
                }}
              >
                <img src={option.flagSrc} alt="" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="service-hero__top">
          <div className="service-hero__content">
            <div className="service-hero__brand">
              <Image src="/img/LOGO_1.png" alt="Architecto" width={220} height={72} className="service-hero__logo" />
              <span className="service-hero__brand-note">{"by K\u00fcchen Aktuell"}</span>
            </div>
            <h1>{copy.title}</h1>
          </div>

          <div className="service-hero__mascot" aria-hidden="true">
            <Image
              src="/img/Untitled%20design%20(4).png"
              alt=""
              width={220}
              height={312}
              className="service-hero__mascot-image"
            />
          </div>
        </div>

        <div className="service-choice-grid">
          <button
            type="button"
            className={`service-choice-card service-choice-card--purchase${mode === "nachkauf" ? " is-active" : ""}`}
            onClick={() => handleModeSelect("nachkauf")}
          >
            <Image
              src="/img/fragmentologo-cropped.png"
              alt="Fragmento"
              width={168}
              height={54}
              className="service-choice-card__logo"
            />
            <strong>{copy.purchaseTitle}</strong>
            <p>{copy.purchaseText}</p>
          </button>
          <button
            type="button"
            className={`service-choice-card service-choice-card--complaint${isComplaintMode ? " is-active" : ""}`}
            onClick={() => handleModeSelect("complaint")}
          >
            <Image
              src="/img/260513-asc-logo-03 copy.png"
              alt="Architecto Service Center"
              width={168}
              height={54}
              className="service-choice-card__logo service-choice-card__logo--complaint"
            />
            
            <strong>{copy.complaintTitle}</strong>
            <p>{copy.complaintText}</p>
          </button>
        </div>
      </section>

      {mode === "nachkauf" ? (
        <section className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.purchaseBrand}</p>
            <h2>{copy.purchasePanelTitle}</h2>
            <p>{copy.purchasePanelText}</p>
          </div>
          <div className="service-panel__actions">
            <Link href="/" className="service-button service-button--primary">
              {copy.openConfigurator}
            </Link>
            <button
              type="button"
              className="service-button service-button--secondary"
              onClick={() => setMode("")}
            >
              {copy.back}
            </button>
          </div>
        </section>
      ) : null}

      {isComplaintMode ? (
        <section className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.complaintBrand}</p>
            <h2>{copy.formTitle}</h2>
            <p>{copy.formIntro}</p>
          </div>

          <form className="service-form" onSubmit={handleSubmit}>
            <label className="service-field service-field--contract-number">
              <span className="service-field__label-row service-field__label-row--contract">
                <span className="service-field__label-main">
                  {copy.contractNumber}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <button
                  type="button"
                  className="service-field__help-link"
                  aria-label={t("contractNumberHelpAria")}
                  onClick={() => {
                    setContractHelpSlide(0);
                    setIsContractNumberHelpOpen(true);
                  }}
                >
                  {t("contractNumberHelpTrigger")}
                </button>
              </span>
              <input
                type="text"
                value={formValues.contractNumber}
                onChange={(event) => handleFieldChange("contractNumber", event.target.value)}
                placeholder={copy.contractPlaceholder}
                required
              />
              {contractLookup.status === "loading" ? (
                <p className="service-form__hint">{t("contractLookupLoading")}</p>
              ) : null}
              {contractLookup.status === "found" && contractLookup.contractNumber === normalizedContractNumber ? (
                <p className="service-form__success">{t("contractLookupSuccess")}</p>
              ) : null}
              {contractLookup.status === "missing" && contractLookup.contractNumber === normalizedContractNumber ? (
                <p className="service-form__error">{contractLookup.message || t("contractLookupError")}</p>
              ) : null}
            </label>

            <div className="service-field-grid service-field-grid--3">
              <label className="service-field">
                <span>
                  {copy.gender}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <select
                  value={formValues.gender}
                  onChange={(event) => handleFieldChange("gender", event.target.value)}
                  required
                >
                  <option value="">{copy.genderPlaceholder}</option>
                  <option value="female">{copy.genderFemale}</option>
                  <option value="male">{copy.genderMale}</option>
                  <option value="prefer_not_to_say">{copy.genderPreferNot}</option>
                </select>
              </label>

              <label className="service-field">
                <span>
                  {copy.givenName}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="text"
                  value={formValues.givenName}
                  onChange={(event) => handleFieldChange("givenName", event.target.value)}
                  placeholder={copy.givenNamePlaceholder}
                  required
                />
              </label>

              <label className="service-field">
                <span>
                  {copy.surname}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="text"
                  value={formValues.surname}
                  onChange={(event) => handleFieldChange("surname", event.target.value)}
                  placeholder={copy.surnamePlaceholder}
                  required
                />
              </label>
            </div>

            <div className="service-field-grid">
              <label className="service-field">
                <span>
                  {copy.phone}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="tel"
                  value={formValues.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder={copy.phonePlaceholder}
                />
              </label>

              <label className="service-field">
                <span>
                  {copy.email}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                />
              </label>
            </div>

            <section className="service-form__section service-form__section--preferred-contact">
              <div className="service-form__section-copy">
                <p className="service-form__section-title">
                  {t("preferredContactTime")}
                  <OptionalFieldSuffix text={fieldOptionalSuffix} />
                </p>
                <p className="service-form__section-helper">{t("preferredContactTimeHelper")}</p>
              </div>
              <div className="service-field-grid service-field-grid--preferred-contact">
                <label className="service-field">
                  <span>{t("preferredContactDate")}</span>
                  <div className="service-field__date-picker">
                    <input
                      type="text"
                      value={formValues.preferredContactDate}
                      onChange={(event) => handleFieldChange("preferredContactDate", event.target.value)}
                      placeholder="dd/mm/yy"
                      inputMode="numeric"
                      maxLength={8}
                    />
                    <button
                      type="button"
                      className="service-field__date-picker-button"
                      aria-label={t("preferredContactDate")}
                      onClick={() => preferredContactDatePickerRef.current?.showPicker?.()}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M7 2v3M17 2v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z" />
                      </svg>
                    </button>
                    <input
                      ref={preferredContactDatePickerRef}
                      className="service-field__date-picker-native"
                      type="date"
                      tabIndex={-1}
                      aria-hidden="true"
                      value={formatShortDateToIso(formValues.preferredContactDate)}
                      onChange={(event) => handleFieldChange("preferredContactDate", formatIsoDateToShort(event.target.value))}
                    />
                  </div>
                </label>
                <label className="service-field">
                  <span>{t("preferredContactTimeWindow")}</span>
                  <select
                    value={formValues.preferredContactTimeWindow}
                    onChange={(event) => handleFieldChange("preferredContactTimeWindow", event.target.value)}
                  >
                    <option value="">{t("preferredContactTimeWindowPlaceholder")}</option>
                    <option value="morning">{t("preferredContactTimeWindowMorning")}</option>
                    <option value="afternoon">{t("preferredContactTimeWindowAfternoon")}</option>
                    <option value="evening">{t("preferredContactTimeWindowEvening")}</option>
                    <option value="custom">{t("preferredContactTimeWindowCustom")}</option>
                  </select>
                </label>
              </div>
              {isPreferredContactCustomTime ? (
                <div className="service-field-grid service-field-grid--preferred-contact-custom">
                  <label className="service-field">
                    <span>{t("preferredContactTimeFrom")}</span>
                    <input
                      type="time"
                      value={formValues.preferredContactTimeFrom}
                      onChange={(event) => handleFieldChange("preferredContactTimeFrom", event.target.value)}
                      required
                    />
                  </label>
                  <label className="service-field">
                    <span>{t("preferredContactTimeTo")}</span>
                    <input
                      type="time"
                      value={formValues.preferredContactTimeTo}
                      onChange={(event) => handleFieldChange("preferredContactTimeTo", event.target.value)}
                      required
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.clientAddress}</p>
              <div className="service-field-grid service-field-grid--client-location">
                <label className="service-field">
                  <span>
                    {copy.clientCountry}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    value={formValues.clientCountry}
                    onChange={(event) => handleFieldChange("clientCountry", event.target.value)}
                    placeholder={copy.clientCountryPlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>
                    {copy.clientCity}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    value={formValues.clientCity}
                    onChange={(event) => handleFieldChange("clientCity", event.target.value)}
                    placeholder={copy.clientCityPlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>
                    {copy.clientPostalCode}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    value={formValues.clientPostalCode}
                    onChange={(event) => handleFieldChange("clientPostalCode", event.target.value)}
                    placeholder={copy.clientPostalCodePlaceholder}
                    required
                  />
                </label>
              </div>

              <div className="service-field-grid service-field-grid--client-address-details">
                <label className="service-field">
                  <span>
                    {copy.clientFloor}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    value={formValues.clientFloor}
                    onChange={(event) => handleFieldChange("clientFloor", event.target.value)}
                    placeholder={copy.clientFloorPlaceholder}
                    required
                  />
                </label>

                <label className="service-field">
                  <span>
                    {copy.clientUnitNumber}
                    <OptionalFieldSuffix text={fieldOptionalSuffix} />
                  </span>
                  <input
                    type="text"
                    value={formValues.clientUnitNumber}
                    onChange={(event) => handleFieldChange("clientUnitNumber", event.target.value)}
                    placeholder={copy.clientUnitNumberPlaceholder}
                  />
                </label>
              </div>

              <label className="service-field">
                <span>
                  {copy.clientAddressLine1}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="text"
                  value={formValues.clientAddressLine1}
                  onChange={(event) => handleFieldChange("clientAddressLine1", event.target.value)}
                  placeholder={copy.clientAddressLine1Placeholder}
                  required
                />
              </label>

              <label className="service-field">
                <span>
                  {copy.clientAddressLine2}
                  <OptionalFieldSuffix text={fieldOptionalSuffix} />
                </span>
                <input
                  type="text"
                  value={formValues.clientAddressLine2}
                  onChange={(event) => handleFieldChange("clientAddressLine2", event.target.value)}
                  placeholder={copy.clientAddressLine2Placeholder}
                />
              </label>
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.landlordSection}</p>
              <p className="service-form__field-group-label">{t("landlordPersonGroup")}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{t("landlordGivenName")}</span>
                  <input
                    type="text"
                    value={formValues.landlordGivenName}
                    onChange={(event) => handleFieldChange("landlordGivenName", event.target.value)}
                    placeholder={t("landlordGivenNamePlaceholder")}
                  />
                </label>

                <label className="service-field">
                  <span>{t("landlordSurname")}</span>
                  <input
                    type="text"
                    value={formValues.landlordSurname}
                    onChange={(event) => handleFieldChange("landlordSurname", event.target.value)}
                    placeholder={t("landlordSurnamePlaceholder")}
                  />
                </label>
              </div>

              <label className="service-field service-field--landlord-company">
                <span>{t("landlordCompanyName")}</span>
                <input
                  type="text"
                  value={formValues.landlordCompanyName}
                  onChange={(event) => handleFieldChange("landlordCompanyName", event.target.value)}
                  placeholder={t("landlordCompanyNamePlaceholder")}
                />
              </label>

              <p className="service-form__field-group-label">{t("landlordContactPersonGroup")}</p>
              <div className="service-field-grid service-field-grid--3">
                <label className="service-field">
                  <span>{t("landlordContactGender")}</span>
                  <select
                    value={formValues.landlordContactGender}
                    onChange={(event) => handleFieldChange("landlordContactGender", event.target.value)}
                  >
                    <option value="">{copy.genderPlaceholder}</option>
                    <option value="female">{copy.genderFemale}</option>
                    <option value="male">{copy.genderMale}</option>
                    <option value="prefer_not_to_say">{copy.genderPreferNot}</option>
                  </select>
                </label>

                <label className="service-field">
                  <span>{t("landlordContactGivenName")}</span>
                  <input
                    type="text"
                    value={formValues.landlordContactGivenName}
                    onChange={(event) => handleFieldChange("landlordContactGivenName", event.target.value)}
                    placeholder={t("landlordContactGivenNamePlaceholder")}
                  />
                </label>

                <label className="service-field">
                  <span>{t("landlordContactSurname")}</span>
                  <input
                    type="text"
                    value={formValues.landlordContactSurname}
                    onChange={(event) => handleFieldChange("landlordContactSurname", event.target.value)}
                    placeholder={t("landlordContactSurnamePlaceholder")}
                  />
                </label>
              </div>

              <div className="service-field-grid service-field-grid--phone-email">
                <label className="service-field">
                  <span>{copy.landlordPhone}</span>
                  <input
                    type="tel"
                    value={formValues.landlordPhone}
                    onChange={(event) => handleFieldChange("landlordPhone", event.target.value)}
                    placeholder={copy.landlordPhonePlaceholder}
                  />
                </label>

                <label className="service-field">
                  <span>{copy.landlordEmail}</span>
                  <input
                    type="email"
                    value={formValues.landlordEmail}
                    onChange={(event) => handleFieldChange("landlordEmail", event.target.value)}
                    placeholder={copy.landlordEmailPlaceholder}
                  />
                </label>
              </div>
            </section>

            <section className="service-form__section">
              <p className="service-form__section-title">{copy.hausmeisterSection}</p>
              <div className="service-field-grid">
                <label className="service-field">
                  <span>{copy.hausmeisterGivenName}</span>
                  <input
                    type="text"
                    value={formValues.hausmeisterGivenName}
                    onChange={(event) => handleFieldChange("hausmeisterGivenName", event.target.value)}
                    placeholder={copy.hausmeisterGivenNamePlaceholder}
                  />
                </label>

                <label className="service-field">
                  <span>{copy.hausmeisterSurname}</span>
                  <input
                    type="text"
                    value={formValues.hausmeisterSurname}
                    onChange={(event) => handleFieldChange("hausmeisterSurname", event.target.value)}
                    placeholder={copy.hausmeisterSurnamePlaceholder}
                  />
                </label>
              </div>

              <div className="service-field-grid service-field-grid--phone-email">
                <label className="service-field">
                  <span>{copy.hausmeisterPhone}</span>
                  <input
                    type="tel"
                    value={formValues.hausmeisterPhone}
                    onChange={(event) => handleFieldChange("hausmeisterPhone", event.target.value)}
                    placeholder={copy.hausmeisterPhonePlaceholder}
                  />
                </label>

                <label className="service-field">
                  <span>{copy.hausmeisterEmail}</span>
                  <input
                    type="email"
                    value={formValues.hausmeisterEmail}
                    onChange={(event) => handleFieldChange("hausmeisterEmail", event.target.value)}
                    placeholder={copy.hausmeisterEmailPlaceholder}
                  />
                </label>
              </div>
            </section>

            <section className="service-form__section service-form__section--problem-kitchen">
              {contractLookup.status === "found" &&
              contractLookup.contractNumber === normalizedContractNumber &&
              contractLookup.kitchenPlan ? (
                <>
                  <p className="service-form__section-title">{copy.problemDescription}</p>
                  <ServiceClaimKitchenPicker
                    kitchenPlan={contractLookup.kitchenPlan}
                    value={problemComponentIds}
                    onChange={setProblemComponentIds}
                    labels={{
                      eyebrow: t("kitchenPlanEyebrow"),
                      title: contractLookup.kitchenPlan.kitchenName || t("kitchenPlanTitle"),
                      reset: t("kitchenPlanReset"),
                    }}
                  />
                </>
              ) : null}
              {selectedProblemAreasWithDetails.length ? (
                <>
                  {selectedProblemAreasWithDetails.map((area) => (
                    <label key={area.componentId} className="service-field service-field--problem-area-row">
                      <span className="service-field__problem-area-label">
                        <span className="service-field__problem-area-label-text">
                          {area.label}
                          <RequiredFieldMark title={requiredFieldTitle} />
                        </span>
                      </span>
                      <textarea
                        className="service-field__problem-area-input"
                        value={area.detail}
                        onChange={(event) => {
                          autoResizeTextarea(event.target);
                          handleProblemAreaDetailChange(area.componentId, event.target.value);
                        }}
                        ref={(element) => autoResizeTextarea(element)}
                        placeholder={copy.problemPlaceholder}
                        rows={1}
                        required
                      />
                    </label>
                  ))}
                  <label className="service-field service-field--problem-area-row">
                    <span className="service-field__problem-area-label">
                      {t("problemDescriptionFieldLabel")}
                      <OptionalFieldSuffix text={fieldOptionalSuffix} />
                    </span>
                    <textarea
                      className="service-field__problem-area-input"
                      value={parsedProblemDescription.userText}
                      onChange={(event) => {
                        autoResizeTextarea(event.target);
                        handleAdditionalProblemDetailsChange(event.target.value);
                      }}
                      ref={(element) => autoResizeTextarea(element)}
                      placeholder={copy.problemPlaceholder}
                      rows={1}
                    />
                  </label>
                </>
              ) : (
                <label className="service-field">
                  <span>
                    {contractLookup.status === "found" &&
                    contractLookup.contractNumber === normalizedContractNumber &&
                    contractLookup.kitchenPlan
                      ? t("problemDescriptionFieldLabel")
                      : copy.problemDescription}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <textarea
                    value={formValues.problemDescription}
                    onChange={(event) => handleFieldChange("problemDescription", event.target.value)}
                    placeholder={copy.problemPlaceholder}
                    rows={6}
                    required
                  />
                </label>
              )}
            </section>

            <div className="service-field-grid">
              <label className="service-field service-field--serial-number">
                <span className="service-field__label-row service-field__label-row--serial">
                  <span className="service-field__label-main">
                    {copy.serialNumber}
                  </span>
                  <button
                    type="button"
                    className="service-field__help-badge"
                    aria-expanded={isSerialNumberHelpOpen}
                    aria-controls="service-serial-help-title"
                    aria-label={t("serialNumberHelpAria")}
                    onClick={() => {
                      setSerialHelpSlide(0);
                      setIsSerialNumberHelpOpen(true);
                    }}
                  >
                    {t("serialNumberHelpTrigger")}
                  </button>
                </span>
                <div className="service-serial-field">
                  <div className="service-serial-field__input-row">
                    <input
                      type="text"
                      value={serialNumberDraft}
                      onChange={(event) => setSerialNumberDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addSerialNumberEntry();
                        }
                      }}
                      placeholder={copy.serialPlaceholder}
                    />
                    <button
                      type="button"
                      className="service-serial-field__add"
                      onClick={() => addSerialNumberEntry()}
                      disabled={!serialNumberDraft.trim()}
                    >
                      {t("serialNumberAdd")}
                    </button>
                  </div>
                  {serialNumberEntries.length ? (
                    <ul className="service-serial-field__list">
                      {serialNumberEntries.map((entry, index) => (
                        <li key={`${entry}-${index}`} className="service-serial-field__item">
                          <span className="service-serial-field__value">{entry}</span>
                          <button
                            type="button"
                            className="service-serial-field__remove"
                            onClick={() => removeSerialNumberEntry(index)}
                            aria-label="Remove serial number"
                          >
                            &times;
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </label>

              <div className="service-field service-field--attachments">
                <span>
                  {t("serialNumberImage")}
                </span>
                <input
                  key={serialNumberImageFieldKey}
                  type="file"
                  className="service-field__file"
                  accept={SERIAL_NUMBER_IMAGE_ACCEPT}
                  onChange={handleSerialNumberImageSelected}
                />
                {serialNumberImage ? (
                  <div className="service-attachments">
                    <ul className="service-attachments__list">
                      <li className="service-attachments__item">
                        <span className="service-attachments__name">{serialNumberImage.name}</span>
                        <button
                          type="button"
                          className="service-attachments__remove"
                          onClick={removeSerialNumberImage}
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="service-field service-field--attachments service-field--claim-attachments">
              <span>{copy.attachments}</span>
              <p className="service-form__hint service-form__hint--attachments">{copy.attachmentsHint}</p>
              <input
                key={attachmentFieldKey}
                type="file"
                className="service-field__file"
                accept={CLAIM_ATTACHMENT_ACCEPT}
                multiple
                onChange={handleAttachmentsSelected}
              />
              {attachments.length > 0 ? (
                <div className="service-attachments">
                  <p className="service-attachments__summary">
                    {copy.attachmentsSelected.replace("{count}", String(attachments.length))}
                  </p>
                  <ul className="service-attachments__list">
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className="service-attachments__item">
                        <span className="service-attachments__name">{file.name}</span>
                        <button
                          type="button"
                          className="service-attachments__remove"
                          onClick={() => removeAttachment(index)}
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="service-button service-button--secondary service-attachments__clear"
                    onClick={clearAttachments}
                  >
                    {copy.attachmentsClear}
                  </button>
                </div>
              ) : null}
            </div>

            {error ? <p className="service-form__error">{error}</p> : null}
            {successMessage ? <p className="service-form__success">{successMessage}</p> : null}

            <div className="service-form__actions">
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={() => setMode("")}
                disabled={isSubmitting}
              >
                {copy.back}
              </button>
              <button type="submit" className="service-button service-button--primary" disabled={isSubmitting}>
                {isSubmitting ? copy.submitting : copy.submit}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>

      {isComplaintMode ? (
        <div className={`service-claim-agent${isClaimAssistantOpen ? " is-open" : ""}`}>
          {isClaimAssistantOpen ? (
            <div
              className="service-claim-agent__panel"
              role="dialog"
              aria-modal="false"
              aria-labelledby="service-claim-agent-title"
            >
              <div className="service-claim-agent__header">
                <div className="service-claim-agent__title-wrap">
                  <span className="service-claim-agent__header-avatar" aria-hidden="true">
                    <img src="/img/worker-icon-transparent.png" alt="" />
                  </span>
                  <div className="service-claim-agent__title-block">
                    <h2 id="service-claim-agent-title">{t("claimAssistantTitle")}</h2>
                    <div className="service-claim-agent__section-label">{t("claimAssistantContextTitle")}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="service-claim-agent__close"
                  aria-label={t("claimAssistantCloseAria")}
                  onClick={() => setIsClaimAssistantOpen(false)}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="service-claim-agent__context-options">
                {claimAssistantContextOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`service-claim-agent__context-button${selectedClaimAssistantContext?.key === option.key ? " is-active" : ""}`}
                    onClick={() => setSelectedClaimAssistantContextKey(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="service-claim-agent__messages" aria-live="polite">
                {!claimAssistantMessages.length ? (
                  <div className="service-claim-agent__message service-claim-agent__message--assistant">
                    <span>{claimAssistantIntroText}</span>
                  </div>
                ) : null}
                {claimAssistantMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.text}-${message.actions?.map((a) => a.id).join(",") || ""}`}
                    className={[
                      "service-claim-agent__message",
                      message.role === "user"
                        ? "service-claim-agent__message--user"
                        : "service-claim-agent__message--assistant",
                      message.tone === "error" ? "service-claim-agent__message--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="service-claim-agent__message-stack">
                      <span>{message.text}</span>
                      {message.role === "assistant" && message.actions?.length ? (
                        <div className="service-claim-agent__message-actions">
                          {message.actions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              className="service-claim-agent__action-chip"
                              disabled={isClaimAssistantLoading}
                              onClick={() => submitClaimAssistantQuestion(action.prompt || action.label, { speakAnswer: true })}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {isClaimAssistantLoading ? (
                  <div className="service-claim-agent__message service-claim-agent__message--assistant">
                    <span>{t("claimAssistantLoading")}</span>
                  </div>
                ) : null}
              </div>

              <form className="service-claim-agent__composer" onSubmit={handleClaimAssistantSubmit}>
                <input
                  value={claimAssistantQuestion}
                  onChange={(event) => setClaimAssistantQuestion(event.target.value)}
                  maxLength={400}
                  placeholder={t("claimAssistantPlaceholder")}
                  disabled={isClaimAssistantLoading}
                />
                <button
                  type="button"
                  className={`service-claim-agent__voice-button${isClaimAssistantListening ? " is-active" : ""}`}
                  aria-label={
                    isClaimAssistantListening
                      ? t("claimAssistantVoiceStop")
                      : t("claimAssistantVoiceStart")
                  }
                  aria-pressed={isClaimAssistantListening}
                  title={
                    isClaimAssistantListening
                      ? t("claimAssistantVoiceListening")
                      : t("claimAssistantVoiceStart")
                  }
                  onClick={toggleClaimAssistantVoice}
                  disabled={!isClaimAssistantVoiceSupported || isClaimAssistantLoading}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
                    <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0" />
                    <path d="M12 18v3" />
                    <path d="M9 21h6" />
                  </svg>
                </button>
                <button
                  type="submit"
                  className="service-button service-button--primary"
                  disabled={!claimAssistantQuestion.trim() || isClaimAssistantLoading || isClaimAssistantListening}
                >
                  {t("claimAssistantSend")}
                </button>
              </form>
              {isClaimAssistantListening || claimAssistantVoiceError ? (
                <div
                  className="service-claim-agent__voice-status"
                  role={claimAssistantVoiceError ? "alert" : "status"}
                >
                  {claimAssistantVoiceError || t("claimAssistantVoiceListening")}
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            className="service-claim-agent__launcher"
            aria-expanded={isClaimAssistantOpen}
            aria-label={t("claimAssistantLauncher")}
            onClick={() => setIsClaimAssistantOpen((current) => !current)}
          >
            <span className="service-claim-agent__launcher-bubble">{t("claimAssistantLauncherPrompt")}</span>
            <span className="service-claim-agent__launcher-avatar" aria-hidden="true">
              <img src="/img/worker-icon-transparent.png" alt="" />
            </span>
          </button>
        </div>
      ) : null}

      {isContractNumberHelpOpen ? (
        <div className="service-contract-help" role="presentation">
          <button
            type="button"
            className="service-contract-help__backdrop"
            tabIndex={-1}
            aria-label={t("contractNumberHelpClose")}
            onClick={() => setIsContractNumberHelpOpen(false)}
          />
          <div
            className="service-contract-help__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-contract-help-title"
          >
            <div className="service-contract-help__head">
              <h3 id="service-contract-help-title" className="service-contract-help__title">
                {t("contractNumberHelpTitle")}
              </h3>
              <button
                type="button"
                className="service-contract-help__close"
                aria-label={t("contractNumberHelpClose")}
                onClick={() => setIsContractNumberHelpOpen(false)}
              >
                &times;
              </button>
            </div>
            <p className="service-contract-help__intro">{t("contractNumberHelpBody")}</p>
            <p className="service-contract-help__sr" aria-live="polite">
              {contractHelpSlideAriaLabel(contractHelpSlide)}
            </p>
            <div className="service-contract-help__carousel">
              <button
                type="button"
                className="service-contract-help__arrow service-contract-help__arrow--prev"
                onClick={goContractHelpPrev}
                disabled={contractHelpSlide <= 0}
                aria-label={t("contractNumberHelpPrev")}
              >
                &#8249;
              </button>
              <div
                className="service-contract-help__viewport"
                onTouchStart={onContractHelpTouchStart}
                onTouchEnd={onContractHelpTouchEnd}
              >
                <div
                  className="service-contract-help__track"
                  style={{
                    width: `${CONTRACT_HELP_SLIDE_COUNT * 100}%`,
                    transform: `translateX(-${(100 * contractHelpSlide) / CONTRACT_HELP_SLIDE_COUNT}%)`,
                  }}
                >
                  {CONTRACT_NUMBER_HELP_IMAGES.map((entry) => (
                    <figure
                      key={entry.src}
                      className="service-contract-help__figure service-contract-help__slide"
                      style={{ flex: `0 0 ${100 / CONTRACT_HELP_SLIDE_COUNT}%` }}
                    >
                      <img
                        src={entry.src}
                        alt={t(entry.altKey)}
                        className="service-contract-help__img"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    </figure>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="service-contract-help__arrow service-contract-help__arrow--next"
                onClick={goContractHelpNext}
                disabled={contractHelpSlide >= CONTRACT_HELP_SLIDE_COUNT - 1}
                aria-label={t("contractNumberHelpNext")}
              >
                &#8250;
              </button>
            </div>
            <div className="service-contract-help__dots" role="tablist" aria-label={t("contractNumberHelpTitle")}>
              {CONTRACT_NUMBER_HELP_IMAGES.map((_, index) => (
                <button
                  key={String(index)}
                  type="button"
                  role="tab"
                  aria-selected={index === contractHelpSlide}
                  aria-label={contractHelpSlideAriaLabel(index)}
                  className={`service-contract-help__dot${index === contractHelpSlide ? " is-active" : ""}`}
                  onClick={() => setContractHelpSlide(index)}
                />
              ))}
            </div>
            <div className="service-contract-help__actions">
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={() => setIsContractNumberHelpOpen(false)}
              >
                {t("contractNumberHelpClose")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isSerialNumberHelpOpen ? (
        <div className="service-contract-help" role="presentation">
          <button
            type="button"
            className="service-contract-help__backdrop"
            tabIndex={-1}
            aria-label={t("contractNumberHelpClose")}
            onClick={() => setIsSerialNumberHelpOpen(false)}
          />
          <div
            className="service-contract-help__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-serial-help-title"
          >
            <div className="service-contract-help__head">
              <h3 id="service-serial-help-title" className="service-contract-help__title">
                {t("serialNumberHelpTitle")}
              </h3>
              <button
                type="button"
                className="service-contract-help__close"
                aria-label={t("contractNumberHelpClose")}
                onClick={() => setIsSerialNumberHelpOpen(false)}
              >
                &times;
              </button>
            </div>
            <p className="service-contract-help__intro">{t("serialNumberHelpBody")}</p>
            <p className="service-contract-help__sr" aria-live="polite">
              {serialHelpSlideAriaLabel(serialHelpSlide)}
            </p>
            <div className="service-contract-help__carousel">
              <button
                type="button"
                className="service-contract-help__arrow service-contract-help__arrow--prev"
                onClick={goSerialHelpPrev}
                disabled={serialHelpSlide <= 0}
                aria-label={t("contractNumberHelpPrev")}
              >
                &#8249;
              </button>
              <div
                className="service-contract-help__viewport"
                onTouchStart={onSerialHelpTouchStart}
                onTouchEnd={onSerialHelpTouchEnd}
              >
                <div
                  className="service-contract-help__track"
                  style={{
                    width: `${SERIAL_HELP_SLIDE_COUNT * 100}%`,
                    transform: `translateX(-${(100 * serialHelpSlide) / SERIAL_HELP_SLIDE_COUNT}%)`,
                  }}
                >
                  {SERIAL_NUMBER_HELP_IMAGES.map((entry) => (
                    <figure
                      key={entry.src}
                      className="service-contract-help__figure service-contract-help__slide"
                      style={{ flex: `0 0 ${100 / SERIAL_HELP_SLIDE_COUNT}%` }}
                    >
                      <img
                        src={entry.src}
                        alt={t(entry.altKey)}
                        className="service-contract-help__img"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    </figure>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="service-contract-help__arrow service-contract-help__arrow--next"
                onClick={goSerialHelpNext}
                disabled={serialHelpSlide >= SERIAL_HELP_SLIDE_COUNT - 1}
                aria-label={t("contractNumberHelpNext")}
              >
                &#8250;
              </button>
            </div>
            <div className="service-contract-help__dots" role="tablist" aria-label={t("serialNumberHelpTitle")}>
              {SERIAL_NUMBER_HELP_IMAGES.map((_, index) => (
                <button
                  key={String(index)}
                  type="button"
                  role="tab"
                  aria-selected={index === serialHelpSlide}
                  aria-label={serialHelpSlideAriaLabel(index)}
                  className={`service-contract-help__dot${index === serialHelpSlide ? " is-active" : ""}`}
                  onClick={() => setSerialHelpSlide(index)}
                />
              ))}
            </div>
            <div className="service-contract-help__actions">
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={() => setIsSerialNumberHelpOpen(false)}
              >
                {t("contractNumberHelpClose")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
