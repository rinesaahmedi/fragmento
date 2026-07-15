"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminSelect from "./admin-select";
import ServiceClaimKitchenPicker from "./service-claim-kitchen-picker";
import { speakAssistantTextWithTts, stopAssistantSpeech } from "./assistant-tts";
import { buildServiceClaimAutofillFromContract } from "../lib/service-claim-contract-autofill";
import {
  collapseServiceClaimLinkedComponents,
  getServiceClaimLinkedComponentIds,
} from "../lib/service-claim-kitchen-plan-selection";
import { normalizeServiceClaimContractNumber } from "../lib/service-claims";
import { countElectricalApplianceProblemAreas } from "../lib/service-claim-serial-number";
import { getContractNumberStickyState } from "../lib/service-claim-sticky";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "Deutsch", flagSrc: "https://flagcdn.com/w40/de.png" },
  { code: "en", label: "English", flagSrc: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "T\u00fcrk\u00e7e", flagSrc: "https://flagcdn.com/w40/tr.png" },
  { code: "es", label: "Espa\u00f1ol", flagSrc: "https://flagcdn.com/w40/es.png" },
  { code: "fr", label: "Fran\u00e7ais", flagSrc: "https://flagcdn.com/w40/fr.png" },
  { code: "ru", label: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flagSrc: "https://flagcdn.com/w40/ru.png" },
];

const MAX_CLAIM_ATTACHMENT_COUNT = 20;
const MAX_CLAIM_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const CLAIM_ATTACHMENT_ACCEPT = "image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx";
const SERIAL_NUMBER_IMAGE_ACCEPT = "image/*";
const CLIENT_ADDRESS_REQUIRED_FIELDS = [
  "clientCountry",
  "clientCity",
  "clientPostalCode",
  "clientFloor",
  "clientAddressLine1",
];
const CLIENT_CONTACT_REQUIRED_FIELDS = ["gender", "givenName", "surname", "phone", "email"];
const CLAIM_REQUIRED_FIELDS = [...CLIENT_CONTACT_REQUIRED_FIELDS, ...CLIENT_ADDRESS_REQUIRED_FIELDS];

const CLAIM_AREA_LABELS_BY_CODE = {
  de: {
    "CAB-WALL-B-L-600": "Oberschrank links",
    "CAB-WALL-B-ML-600": "Oberschrank mittig links",
    "CAB-WALL-B-MR-600": "Oberschrank mittig rechts",
    "CAB-WALL-B-R-600": "Oberschrank rechts",
    "CAB-HOOD-B-600": "Oberschrank f\u00fcr Flachschirmhaube 60 cm",
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
    "REF-B-545-1800-700": "Standk\u00fchlschrank 178 cm",
    "REF-C-545-1800-700": "Standk\u00fchlschrank 178 cm",
    "WM-B-EWA34660W": "Waschmaschine",
    "WM-C-EWA34660W": "Waschmaschine",
    "OVEN-B-600-HOB": "Einbaubackofen und Kochfeld",
    "OVEN-C-600-HOB": "Einbaubackofen und Kochfeld",
    "SINK-WORKTOP": "Sp\u00fcle",
  },
};

function formatGermanClaimAreaName(area, fallbackName) {
  const code = String(area?.code || "").trim().toUpperCase();
  const componentId = String(area?.componentId || "").trim();
  const normalizedName = String(fallbackName || area?.name || "").trim().toLowerCase();
  const claimPartNameDe = String(area?.nameDe || "").trim();

  if ((area?.claimPartKey || componentId.startsWith("component-claim-")) && claimPartNameDe) {
    return claimPartNameDe;
  }

  if (componentId === "component-claim-sink") {
    return "Sp\u00fcle";
  }
  if (componentId === "component-claim-sink-cabinet") {
    return "Sp\u00fclenunterschrank";
  }
  if (componentId === "component-claim-faucet") {
    return "Armatur";
  }
  if (componentId === "component-claim-oven") {
    return "Backofen";
  }
  if (componentId === "component-claim-oven-drawer") {
    return "Schublade unter Backofen";
  }
  if (componentId === "component-claim-cooktop") {
    return "Kochfeld";
  }
  if (componentId === "component-claim-worktop-left") {
    return "Arbeitsplatte links";
  }
  if (componentId === "component-claim-worktop-right") {
    return "Arbeitsplatte rechts";
  }
  if (componentId === "component-claim-worktop-end-panel") {
    return "Unterschrank-Wange";
  }

  const exactLabel = CLAIM_AREA_LABELS_BY_CODE.de?.[code];
  if (exactLabel) {
    return exactLabel;
  }

  if (componentId === "component-refrigerator" || code.startsWith("REF-")) {
    return "Standk\u00fchlschrank 178 cm";
  }
  if (componentId === "component-sink-faucet" || code === "SINK-WORKTOP") {
    return "Sp\u00fcle";
  }
  if (componentId === "component-worktop" || code.startsWith("TOP-")) {
    return "Arbeitsplatte";
  }
  if (componentId === "component-sink-base" || code.startsWith("SINKBASE-")) {
    return "Sp\u00fclenunterschrank";
  }
  if (componentId === "component-extractor-hood" || code.startsWith("HOOD-")) {
    return "Flachschirmhaube";
  }
  if (componentId === "component-oven-module" || componentId === "component-oven-base" || code.startsWith("OVEN-")) {
    return "Einbaubackofen und Kochfeld";
  }
  if (code.startsWith("DISH-") || componentId === "component-dishwasher-base" || normalizedName.includes("dishwasher")) {
    return "Vollintegrierter Geschirrsp\u00fcler";
  }
  if (code.startsWith("WM-") || componentId === "component-wm-base" || normalizedName.includes("washing machine")) {
    return "Waschmaschine";
  }
  if (code.startsWith("CAB-HOOD-")) {
    return "Oberschrank f\u00fcr Flachschirmhaube 60 cm";
  }
  if (code.startsWith("CAB-BASE-") || normalizedName.includes("lower cabinet with drawer")) {
    const width = normalizedName.match(/\b(30|40|45|50|60|80)\b/)?.[1] || "";
    return width ? `Unterschrank mit Schublade ${width} cm` : "Unterschrank mit Schublade";
  }
  if (code.startsWith("CAB-WALL-") || componentId.startsWith("component-wall-cabinet-") || normalizedName.includes("wall cabinet")) {
    const number = normalizedName.match(/\b(\d+)\b/)?.[1] || "";
    return number ? `Oberschrank ${number} cm` : "Oberschrank";
  }

  return fallbackName || code;
}

function formatClaimAreaName(area, fallbackName, language) {
  const code = String(area?.code || "").trim().toUpperCase();
  if (language === "de") {
    return formatGermanClaimAreaName(area, fallbackName);
  }
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

function ServiceAttachmentChips({
  files,
  summary,
  maxCount,
  clearLabel,
  onRemove,
  onClearAll,
  viewLabel = "View",
  viewAriaLabel = "View file",
  closePreviewLabel = "Close",
  previewUnavailableText = "This file type cannot be previewed in the browser.",
  removeLabel = "Remove file",
  expandLabel = "View more",
  collapseLabel = "View less",
  inlineExpandToggle = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const collapsedVisibleCount = 2;

  useEffect(() => {
    if (files.length <= collapsedVisibleCount) {
      setExpanded(false);
    }
  }, [files.length]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewFile]);

  useEffect(() => {
    if (previewFile && !files.includes(previewFile)) {
      setPreviewFile(null);
    }
  }, [files, previewFile]);

  useEffect(() => {
    if (!previewFile) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPreviewFile(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewFile]);

  if (!files.length) {
    return null;
  }
  const shouldCollapse = files.length > collapsedVisibleCount;
  const indexedFiles = files.map((file, index) => ({ file, index }));
  const visibleFiles = shouldCollapse && !expanded ? indexedFiles.slice(0, collapsedVisibleCount) : indexedFiles;
  const previewMime = String(previewFile?.type || "").toLowerCase().split(";")[0].trim();
  const canPreviewAsImage = previewMime.startsWith("image/");
  const canPreviewInFrame =
    previewMime === "application/pdf" ||
    previewMime.startsWith("text/");
  const expandToggleButton = shouldCollapse ? (
    <button
      type="button"
      className="service-attachments__toggle"
      onClick={() => setExpanded((current) => !current)}
    >
      {expanded ? collapseLabel : `${expandLabel} (${files.length - collapsedVisibleCount})`}
    </button>
  ) : null;

  return (
    <div
      className={[
        "service-attachments",
        inlineExpandToggle ? "service-attachments--inline-expand" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="service-attachments__header">
        <p className="service-attachments__summary">
          {summary}
          {typeof maxCount === "number" ? ` (${files.length}/${maxCount})` : ""}
        </p>
        {typeof onClearAll === "function" ? (
          <button type="button" className="service-attachments__clear" onClick={onClearAll}>
            {clearLabel}
          </button>
        ) : null}
      </div>
      <ul className="service-attachments__list">
        {visibleFiles.map(({ file, index }) => (
          <li key={`${file.name}-${file.size}-${index}`} className="service-attachments__item">
            <span className="service-attachments__name" title={file.name}>
              {file.name}
            </span>
            <button
              type="button"
              className="service-attachments__view"
              onClick={() => setPreviewFile(file)}
              aria-label={`${viewAriaLabel}: ${file.name}`}
            >
              {viewLabel}
            </button>
            <button
              type="button"
              className="service-attachments__remove"
              onClick={() => onRemove(index)}
              aria-label={removeLabel}
            >
              &times;
            </button>
          </li>
        ))}
        {inlineExpandToggle && expandToggleButton ? (
          <li className="service-attachments__toggle-item">{expandToggleButton}</li>
        ) : null}
      </ul>
      {!inlineExpandToggle && expandToggleButton}
      {previewFile ? (
        <div className="service-file-preview" role="presentation">
          <button
            type="button"
            className="service-file-preview__backdrop"
            aria-label={closePreviewLabel}
            onClick={() => setPreviewFile(null)}
          />
          <div
            className="service-file-preview__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${viewAriaLabel}: ${previewFile.name}`}
          >
            <div className="service-file-preview__head">
              <div className="service-file-preview__title" title={previewFile.name}>
                {previewFile.name}
              </div>
              <button
                type="button"
                className="service-file-preview__close"
                aria-label={closePreviewLabel}
                onClick={() => setPreviewFile(null)}
              >
                &times;
              </button>
            </div>
            <div className="service-file-preview__body">
              {previewUrl && canPreviewAsImage ? (
                <img src={previewUrl} alt={previewFile.name} className="service-file-preview__image" />
              ) : null}
              {previewUrl && !canPreviewAsImage && canPreviewInFrame ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  className="service-file-preview__frame"
                />
              ) : null}
              {!canPreviewAsImage && !canPreviewInFrame ? (
                <div className="service-file-preview__unsupported">
                  <strong>{previewFile.name}</strong>
                  <span>{previewUnavailableText}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ServiceYesNoChoice({ question, value, yesLabel, noLabel, onChange }) {
  const isYes = value === "yes";
  const isNo = value === "no" || !value;

  return (
    <div className="service-yes-no-field">
      <p className="service-yes-no-field__question">{question}</p>
      <div className="service-yes-no-field__control" role="radiogroup" aria-label={question}>
        <button
          type="button"
          className={`service-yes-no-field__option${isNo ? " is-active" : ""}`}
          aria-pressed={isNo}
          onClick={() => onChange("no")}
        >
          {noLabel}
        </button>
        <button
          type="button"
          className={`service-yes-no-field__option${isYes ? " is-active" : ""}`}
          aria-pressed={isYes}
          onClick={() => onChange("yes")}
        >
          {yesLabel}
        </button>
      </div>
    </div>
  );
}

const EMPTY_HAUSMEISTER_FIELDS = {
  hausmeisterGivenName: "",
  hausmeisterSurname: "",
  hausmeisterPhone: "",
  hausmeisterEmail: "",
};

const COPY = {
  de: {
    eyebrow: "Fragmento Service",
    title: "Willkommen bei architecto",
    intro:
      "Wähle den passenden Weg für dein Anliegen. Du kannst mit einer Bestellung oder einem Zusatzkauf weitermachen oder direkt eine Reklamation an unser Support-Team senden.",
    purchaseBadge: "Nachkauf",
    purchaseTitle: "Zusatzkauf",
    purchaseBrand: "FRAGMENTO BY ARCHITECTO",
    purchaseText: "K\u00fcchenkonfigurator \u00f6ffnen und Zubeh\u00f6r erg\u00e4nzen.",
    purchaseCta: "Konfigurator \u00f6ffnen",
    complaintBadge: "Reklamation",
    complaintTitle: "Reklamation melden",
    complaintBrand: "ARCHITECTO SERVICE CENTER",
    complaintText: "Defekte, Sch\u00e4den oder fehlende Teile melden.",
    complaintCta: "Reklamation starten",
    registerBadge: "Registrierung",
    registerTitle: "K\u00fcche registrieren",
    registerBrand: "ARCHITECTO REGISTRIERUNG",
    registerText: "Kaufvertragsnummer mit deinen Kontaktdaten verkn\u00fcpfen.",
    registerCta: "Jetzt registrieren",
    registerPanelTitle: "K\u00fcche auf mich registrieren",
    registerPanelText: "Trage die Kaufvertragsnummer, deine Kontaktdaten und die Wohnungsdaten zur Pr\u00fcfung ein. Die Nummer bleibt gleich, aber die aktive Registrierung wechselt zu dir.",
    registerFullName: "Vollst\u00e4ndiger Name",
    registerFullNamePlaceholder: "Vorname Nachname",
    registerFullNameRequired: "Bitte gib deinen vollst\u00e4ndigen Namen ein.",
    registerAddressNote: "Adresse / Wohnung",
    registerAddressNotePlaceholder: "Optional: Adresse, Etage oder Wohnungsnummer",
    registerEmailRequired: "Bitte gib eine E-Mail-Adresse f\u00fcr die Best\u00e4tigung ein.",
    registerVerificationPostalCode: "Postleitzahl",
    registerVerificationPostalCodePlaceholder: "z. B. 10115",
    registerVerificationUnit: "Stra\u00dfe / Wohnung",
    registerVerificationUnitPlaceholder: "z. B. Demo Street 2",
    registerVerificationRequired: "Bitte gib Postleitzahl und Stra\u00dfe, Wohnung oder Etage zur Pr\u00fcfung ein.",
    registerCode: "E-Mail-Code",
    registerCodePlaceholder: "6-stelliger Code",
    registerCodeRequired: "Bitte gib den E-Mail-Code ein.",
    registerVerifySubmit: "Registrierung best\u00e4tigen",
    registerVerifySubmitting: "Best\u00e4tigung...",
    registerSubmit: "K\u00fcche registrieren",
    registerSubmitting: "Registrierung...",
    registerSuccess: "Diese K\u00fcche ist jetzt auf dich registriert.",
    registeredNextSuccess: "Diese K\u00fcche ist jetzt auf dich registriert. Vorherige aktive Registrierungen f\u00fcr diesen Vertrag wurden geschlossen.",
    registeredNextTitle: "K\u00fcche registriert",
    registeredNextText: "Deine K\u00fcche ist verkn\u00fcpft. W\u00e4hle jetzt den passenden Bereich.",
    registeredNextOrderLabel: "Zusatzkauf",
    registeredNextOrderTitle: "Ich m\u00f6chte etwas bestellen",
    registeredNextOrderText: "F\u00fcr Zubeh\u00f6r, Zusatzteile oder weitere Komponenten. Der Konfigurator wird direkt mit deiner Vertragsnummer ge\u00f6ffnet.",
    registeredNextOrderCta: "Zum Konfigurator",
    registeredNextClaimLabel: "Reklamation",
    registeredNextClaimTitle: "Ich m\u00f6chte eine Reklamation einreichen",
    registeredNextClaimText: "F\u00fcr Defekte, Sch\u00e4den, fehlende Teile oder Reklamationen. Das Reklamationsformular startet mit deinen Registrierungsdaten.",
    registeredNextClaimCta: "Reklamationsformular \u00f6ffnen",
    registerError: "Die K\u00fcche konnte nicht registriert werden.",
    purchasePanelTitle: "Weiter zum Kaufprozess",
    purchasePanelText: "Wenn der Mieter zus\u00e4tzliche Artikel statt einer Reklamation ben\u00f6tigt, geht es hier zum Konfigurator.",
    openConfigurator: "Konfigurator \u00f6ffnen",
    back: "Zur\u00fcck",
    formTitle: "KD Formular",
    formIntro: "F\u00fclle unten die wichtigsten Reklamationsdaten aus.",
    requiredFieldTitle: "Pflichtfeld",
    requiredFieldMissing: "Bitte f\u00fclle dieses Pflichtfeld aus.",
    requiredFieldsAlertTitle: "Pflichtfeld fehlt",
    requiredFieldsAlertText: "Bitte erg\u00e4nze die markierten Pflichtfelder.",
    requiredFieldsAlertAction: "Zum Feld",
    fieldOptionalSuffix: " (optional)",
    contractNumber: "Kaufvertragsnummer",
    contractPlaceholder: "e.g. 670123456",
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
    salutationMr: "Herr",
    salutationMrs: "Frau",
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
    preferredContactCalendarClear: "Löschen",
    preferredContactCalendarToday: "Heute",
    preferredContactCalendarPrevMonth: "Vorheriger Monat",
    preferredContactCalendarNextMonth: "Nächster Monat",
    preferredContactTimePickerPlaceholder: "00:00",
    preferredContactTimePickerClear: "Löschen",
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
    landlordContactPersonGroup: "Ansprechperson",
    landlordCompanyName: "Firmenname",
    landlordCompanyNamePlaceholder: "Firma / Hausverwaltung",
    landlordCompanyPhone: "Telefon",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "E-Mail",
    landlordCompanyEmailPlaceholder: "kontakt@beispiel.de",
    landlordContactGivenName: "Vorname",
    landlordContactGivenNamePlaceholder: "Vorname",
    landlordContactSurname: "Nachname",
    landlordContactSurnamePlaceholder: "Nachname",
    landlordPhone: "Telefon Ansprechperson",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-Mail Ansprechperson",
    landlordEmailPlaceholder: "kontakt@beispiel.de",
    hausmeisterSection: "Hausmeister",
    hausmeisterInvolvedQuestion: "Hausverwaltung beteiligt?",
    hausmeisterYes: "Ja",
    hausmeisterNo: "Nein",
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
    serialNumberRequired: "Bitte gib genau eine Seriennummer ein oder lade genau ein Foto der Seriennummer hoch.",
    serialNumberCountRequired: "Bitte gib genau {count} Seriennummer(n) f\u00fcr die ausgew\u00e4hlten Elektroger\u00e4te ein oder lade entsprechend viele Seriennummern-Fotos hoch.",
    serialNumberEvidenceLimitReached: "Du hast bereits alle {count} erforderlichen Seriennummern-Nachweise angegeben. Um ein Foto hochzuladen, entferne zuerst eine eingegebene Seriennummer oder ein vorhandenes Seriennummern-Foto.",
    serialNumberImage: "Foto der Seriennummer(n)",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Hilfe: Wo finde ich die Seriennummer?",
    serialNumberHelpTitle: "Seriennummer finden",
    serialNumberHelpBody: "Die Seriennummer finden Sie meist auf dem Typenschild im Ger\u00e4t oder an der Innenwand. Die Beispiele unten zeigen typische Positionen.",
    serialNumberHelpAlt1: "Beispiel: Seriennummer auf dem Typenschild",
    serialNumberHelpAlt2: "Beispiel: Seriennummer im K\u00fchlschrank",
    attachments: "Anh\u00e4nge (optional)",
    uploadFile: "Datei hochladen",
    problemAreaAttachmentRequired: "Bitte lade mindestens eine Datei f\u00fcr diesen K\u00fcchenteil hoch.",
    attachmentsHint: "PDF, Bilder oder Office-Dateien \u2014 bis zu 20 Dateien, je max. 4 MB.",
    attachmentsClear: "Alle entfernen",
    attachmentsViewMore: "Mehr anzeigen",
    attachmentsViewLess: "Weniger anzeigen",
    attachmentsSelected: "{count} Datei(en) ausgew\u00e4hlt",
    attachmentsErrorTooMany: "Maximal 20 Anh\u00e4nge m\u00f6glich.",
    attachmentsErrorFileTooLarge: "Jede Datei darf h\u00f6chstens 4 MB gro\u00df sein.",
    attachmentsErrorType: "Dateityp nicht erlaubt (z. B. PDF, Bilder, Word/Excel).",
    submit: "Reklamation senden",
    submitting: "Wird gesendet...",
    contactError: "Bitte gib Telefonnummer und E-Mail-Adresse an.",
    contractLookupLoading: "Vertragsnummer wird gepr\u00fcft...",
    contractLookupSuccess: "Adresse und Vermieterdaten aus den hinterlegten Vertragsdaten eingef\u00fcllt. Du kannst die Felder weiter bearbeiten.",
    contractLookupError: "Die Vertragsnummer wurde nicht gefunden.",
    kitchenPlanEyebrow: "K\u00fcchenmodell",
    kitchenPlanTitle: "Problemstelle in der K\u00fcche markieren",
    kitchenPlanReset: "Auswahl zur\u00fccksetzen",
    removeProblemAreaAria: "{label} entfernen",
    kitchenPlanSinkOption: "Sp\u00fcle",
    kitchenPlanCooktopOption: "Kochfeld",
    kitchenPlanWorktopEndPanelOption: "Unterschrank-Wange",
    kitchenPlanFilterOption: "Filter f\u00fcr Dunstabzugshaube",
    kitchenPlanFurnitureFrontOption: "M\u00f6belfront (Geschirrsp\u00fcler)",
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
    claimAssistantVoiceUnsupported: "Sprachchat ist in deinem Browser nicht verfügbar.",
    claimAssistantVoicePermission: "Bitte erlaube den Mikrofonzugriff, um den Sprachchat zu nutzen.",
    claimAssistantVoiceError: "Die Spracheingabe konnte nicht starten. Bitte versuche es erneut.",
    claimAssistantErrorUnavailable: "Die Reklamationshilfe konnte dazu gerade keine Antwort geben.",
    tourStart: "Hilfe / Tour starten",
    tourStartAria: "Tour der Serviceseite starten",
    tourVideoTitle: "Video-Guide der Serviceseite",
    tourVideoClose: "Video-Guide schliessen",
    tourVideoUnsupported: "Dein Browser kann dieses Video nicht abspielen.",
    tourStepProgress: "Schritt {current} von {total}",
    tourNext: "Weiter",
    tourSkip: "Tour überspringen",
    tourFinish: "Fertig",
    tourPurchaseTitle: "Zusatzartikel bestellen",
    tourPurchaseDescription: "Öffne hier den Konfigurator, um zusätzliche Küchenkomponenten, Zubehör oder Services zu deiner bestehenden Küche hinzuzufügen.",
    tourComplaintTitle: "Problem melden",
    tourComplaintDescription: "Melde hier Schäden, Defekte, fehlende Teile, Geräteprobleme oder andere Servicefälle. Du kannst Details und Fotos hinzufügen.",
    tourRegisterTitle: "Küche registrieren",
    tourRegisterDescription: "Verknüpfe hier deine Kaufvertragsnummer mit deinen aktuellen Kontaktdaten, damit das Serviceteam deine Küche schneller zuordnen kann.",
    removeFileAria: "Datei entfernen",
    viewFile: "Ansehen",
    viewFileAria: "Datei ansehen",
    closeFilePreview: "Vorschau schlie\u00dfen",
    filePreviewUnavailable: "Dieser Dateityp kann im Browser nicht als Vorschau angezeigt werden.",
    removeSerialNumberAria: "Seriennummer entfernen",
    stickyContractDismissAria: "Fixiertes Feld für Kaufvertragsnummer deaktivieren",
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
    registerBadge: "Registration",
    registerTitle: "Register my kitchen",
    registerBrand: "ARCHITECTO REGISTRATION",
    registerText: "Connect the purchase contract number to your current contact details.",
    registerCta: "Register now",
    registerPanelTitle: "Register this kitchen to me",
    registerPanelText: "Enter the purchase contract number, your contact details, and the apartment details for verification. The contract number stays the same, but the active registration moves to you.",
    registerFullName: "Full name",
    registerFullNamePlaceholder: "First name Last name",
    registerFullNameRequired: "Please enter your full name.",
    registerAddressNote: "Address / apartment",
    registerAddressNotePlaceholder: "Optional: address, floor, or apartment number",
    registerEmailRequired: "Please provide an email address for verification.",
    registerVerificationPostalCode: "Postal code",
    registerVerificationPostalCodePlaceholder: "e.g. 10115",
    registerVerificationUnit: "Street / apartment",
    registerVerificationUnitPlaceholder: "e.g. Demo Street 2",
    registerVerificationRequired: "Please enter the postal code and street, apartment, or floor for verification.",
    registerCode: "Email code",
    registerCodePlaceholder: "6-digit code",
    registerCodeRequired: "Please enter the email verification code.",
    registerVerifySubmit: "Confirm registration",
    registerVerifySubmitting: "Confirming...",
    registerSubmit: "Register kitchen",
    registerSubmitting: "Registering...",
    registerSuccess: "This kitchen is now registered to you.",
    registeredNextSuccess: "This kitchen is now registered to you. Previous active registrations for this contract were closed.",
    registeredNextTitle: "Kitchen registered",
    registeredNextText: "Your kitchen is connected. Choose the area that matches what you need.",
    registeredNextOrderLabel: "Purchase",
    registeredNextOrderTitle: "I want to order something",
    registeredNextOrderText: "For accessories, add-ons, or additional components. The configurator opens with your registered contract number.",
    registeredNextOrderCta: "Open configurator",
    registeredNextClaimLabel: "Claim",
    registeredNextClaimTitle: "I want to submit a claim",
    registeredNextClaimText: "For defects, damage, missing parts, or complaints. The claim form starts with your registration details.",
    registeredNextClaimCta: "Open claim form",
    registerError: "The kitchen could not be registered.",
    purchasePanelTitle: "Continue to the purchase flow",
    purchasePanelText: "If the tenant needs additional items instead of a complaint, continue to the configurator.",
    openConfigurator: "Open configurator",
    back: "Back",
    formTitle: "Complaint Form",
    formIntro: "Fill in the main complaint details below.",
    requiredFieldTitle: "Required field",
    requiredFieldMissing: "Please complete this required field.",
    requiredFieldsAlertTitle: "Required field missing",
    requiredFieldsAlertText: "Please complete the highlighted required fields.",
    requiredFieldsAlertAction: "Go to field",
    fieldOptionalSuffix: " (optional)",
    contractNumber: "Purchase contract number",
    contractPlaceholder: "e.g. 670123456",
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
    gender: "Salutation",
    genderPlaceholder: "Select\u2026",
    salutationMr: "Mr",
    salutationMs: "Ms",
    salutationMrs: "Mrs",
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
    preferredContactCalendarClear: "Clear",
    preferredContactCalendarToday: "Today",
    preferredContactCalendarPrevMonth: "Previous month",
    preferredContactCalendarNextMonth: "Next month",
    preferredContactTimePickerPlaceholder: "00:00",
    preferredContactTimePickerClear: "Clear",
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
    landlordContactPersonGroup: "Contact person",
    landlordCompanyName: "Company name",
    landlordCompanyNamePlaceholder: "Company / property management",
    landlordCompanyPhone: "Phone",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "Email",
    landlordCompanyEmailPlaceholder: "contact@example.com",
    landlordContactGivenName: "First name",
    landlordContactGivenNamePlaceholder: "First name",
    landlordContactSurname: "Surname",
    landlordContactSurnamePlaceholder: "Surname",
    landlordPhone: "Contact person phone",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Contact person email",
    landlordEmailPlaceholder: "contact@example.com",
    hausmeisterSection: "Property manager",
    hausmeisterInvolvedQuestion: "Property manager involved?",
    hausmeisterYes: "Yes",
    hausmeisterNo: "No",
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
    serialNumberRequired: "Please enter exactly one serial number or upload exactly one photo of the serial number.",
    serialNumberCountRequired: "Please provide exactly {count} serial number(s) for the selected electrical appliance(s), using typed numbers and/or serial number photos.",
    serialNumberEvidenceLimitReached: "You have already provided all {count} required serial number entries. To upload a photo, first remove a typed serial number or an existing serial number photo.",
    serialNumberImage: "Photo of the serial number(s)",
    serialNumberHelpTrigger: "i",
    serialNumberHelpAria: "Help: where to find the serial number",
    serialNumberHelpTitle: "Finding the serial number",
    serialNumberHelpBody: "You can usually find the serial number on the appliance rating plate or on an inside wall. The examples below show typical locations.",
    serialNumberHelpAlt1: "Example: serial number on the appliance label",
    serialNumberHelpAlt2: "Example: serial number inside the fridge",
    attachments: "Attachments (optional)",
    uploadFile: "Upload file",
    problemAreaAttachmentRequired: "Please upload at least one file for this kitchen component.",
    attachmentsHint: "PDFs, images, or office files \u2014 up to 20 files, 4 MB each.",
    attachmentsClear: "Remove all",
    attachmentsViewMore: "View more",
    attachmentsViewLess: "View less",
    attachmentsSelected: "{count} file(s) selected",
    attachmentsErrorTooMany: "You can attach at most 20 files.",
    attachmentsErrorFileTooLarge: "Each file must be 4 MB or smaller.",
    attachmentsErrorType: "This file type is not allowed. Use PDF, images, or common office formats.",
    contractLookupLoading: "Checking contract number...",
    contractLookupSuccess: "Address and landlord details autofilled from the saved contract data. You can still edit the fields.",
    kitchenPlanEyebrow: "Kitchen model",
    kitchenPlanTitle: "Mark where the problem is",
    kitchenPlanReset: "Clear selection",
    removeProblemAreaAria: "Remove {label}",
    kitchenPlanSinkOption: "Sink",
    kitchenPlanCooktopOption: "Cooktop",
    kitchenPlanWorktopEndPanelOption: "Cabinet side panel",
    kitchenPlanFilterOption: "Extractor Hood Filter",
    kitchenPlanFurnitureFrontOption: "Furniture Front (Dishwasher)",
    kitchenPlanSelectedLabel: "Selected",
    kitchenPlanSelectedNone: "No areas selected yet.",
    kitchenAreasLinePrefix: "Kitchen areas:",
    problemDescriptionFieldLabel: "Additional details",
    contractLookupError: "Contract number was not found.",
    submit: "Send complaint",
    submitting: "Submitting...",
    contactError: "Please provide both a phone number and an email address.",
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
    claimAssistantVoiceUnsupported: "Voice chat is not available in your browser.",
    claimAssistantVoicePermission: "Please allow microphone access to use voice chat.",
    claimAssistantVoiceError: "Voice input could not start. Please try again.",
    claimAssistantErrorUnavailable: "The claim helper could not answer that right now.",
    tourStart: "Help / Start tour",
    tourStartAria: "Start service page tour",
    tourVideoTitle: "Service page video guide",
    tourVideoClose: "Close video guide",
    tourVideoUnsupported: "Your browser cannot play this video.",
    tourStepProgress: "Step {current} of {total}",
    tourNext: "Next",
    tourSkip: "Skip tour",
    tourFinish: "Finish",
    tourPurchaseTitle: "Order extra items",
    tourPurchaseDescription: "Use this section to open the configurator and add extra kitchen components, accessories, or related services to your existing kitchen setup.",
    tourComplaintTitle: "Report a problem",
    tourComplaintDescription: "Use this section to file a complaint for damage, defects, missing parts, appliance issues, or other service problems. You can add details and photos so the support team can help.",
    tourRegisterTitle: "Register your kitchen",
    tourRegisterDescription: "Use this section to connect your purchase contract number with your current contact details. This helps the service team identify your kitchen faster.",
    removeFileAria: "Remove file",
    viewFile: "View",
    viewFileAria: "View file",
    closeFilePreview: "Close preview",
    filePreviewUnavailable: "This file type cannot be previewed in the browser.",
    removeSerialNumberAria: "Remove serial number",
    stickyContractDismissAria: "Disable fixed contract number box",
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
    registerBadge: "Kay\u0131t",
    registerTitle: "Mutfa\u011f\u0131m\u0131 kaydet",
    registerBrand: "ARCHITECTO KAYIT",
    registerText: "Sat\u0131n alma s\u00f6zle\u015fme numaras\u0131n\u0131 mevcut ileti\u015fim bilgilerinizle ba\u011flay\u0131n.",
    registerCta: "\u015eimdi kaydet",
    registerPanelTitle: "Bu mutfa\u011f\u0131 bana kaydet",
    registerPanelText: "Sat\u0131n alma s\u00f6zle\u015fme numaras\u0131n\u0131, ileti\u015fim bilgilerinizi ve daire bilgilerini girin. S\u00f6zle\u015fme numaras\u0131 ayn\u0131 kal\u0131r, aktif kay\u0131t size ge\u00e7er.",
    registerFullName: "Ad soyad",
    registerFullNamePlaceholder: "Ad Soyad",
    registerFullNameRequired: "L\u00fctfen ad\u0131n\u0131z\u0131 ve soyad\u0131n\u0131z\u0131 girin.",
    registerAddressNote: "Adres / daire",
    registerAddressNotePlaceholder: "\u0130ste\u011fe ba\u011fl\u0131: adres, kat veya daire numaras\u0131",
    registerEmailRequired: "L\u00fctfen onay i\u00e7in bir e-posta adresi girin.",
    registerVerificationPostalCode: "Posta kodu",
    registerVerificationPostalCodePlaceholder: "\u00f6rn. 10115",
    registerVerificationUnit: "Sokak / daire",
    registerVerificationUnitPlaceholder: "\u00f6rn. Demo Street 2",
    registerVerificationRequired: "L\u00fctfen posta kodunu ve sokak, daire veya kat bilgisini girin.",
    registerCode: "E-posta kodu",
    registerCodePlaceholder: "6 haneli kod",
    registerCodeRequired: "L\u00fctfen e-posta kodunu girin.",
    registerVerifySubmit: "Kayd\u0131 onayla",
    registerVerifySubmitting: "Onaylan\u0131yor...",
    registerSubmit: "Mutfa\u011f\u0131 kaydet",
    registerSubmitting: "Kaydediliyor...",
    registerSuccess: "Bu mutfak art\u0131k sizin ad\u0131n\u0131za kay\u0131tl\u0131.",
    registeredNextSuccess: "Bu mutfak art\u0131k sizin ad\u0131n\u0131za kay\u0131tl\u0131. Bu s\u00f6zle\u015fme i\u00e7in \u00f6nceki aktif kay\u0131tlar kapat\u0131ld\u0131.",
    registeredNextTitle: "Mutfak kaydedildi",
    registeredNextText: "Mutfa\u011f\u0131n\u0131z ba\u011fland\u0131. \u0130htiyac\u0131n\u0131za uygun alan\u0131 se\u00e7in.",
    registeredNextOrderLabel: "Sat\u0131n alma",
    registeredNextOrderTitle: "Bir \u015fey sipari\u015f etmek istiyorum",
    registeredNextOrderText: "Aksesuarlar, ek par\u00e7alar veya ilave bile\u015fenler i\u00e7in. Yap\u0131land\u0131r\u0131c\u0131 kay\u0131tl\u0131 s\u00f6zle\u015fme numaran\u0131zla a\u00e7\u0131l\u0131r.",
    registeredNextOrderCta: "Yap\u0131land\u0131r\u0131c\u0131y\u0131 a\u00e7",
    registeredNextClaimLabel: "Talep",
    registeredNextClaimTitle: "Talep olu\u015fturmak istiyorum",
    registeredNextClaimText: "Defekt, hasar, eksik par\u00e7alar veya \u015fikayetler i\u00e7in. Talep formu kay\u0131t bilgilerinizle ba\u015flar.",
    registeredNextClaimCta: "Talep formunu a\u00e7",
    registerError: "Mutfak kaydedilemedi.",
    purchasePanelTitle: "Sat\u0131n alma ak\u0131\u015f\u0131na devam et",
    purchasePanelText: "Kirac\u0131n\u0131n \u015fikayet yerine ek \u00fcr\u00fcnlere ihtiyac\u0131 varsa, yap\u0131land\u0131r\u0131c\u0131ya devam edin.",
    openConfigurator: "Yap\u0131land\u0131r\u0131c\u0131y\u0131 a\u00e7",
    back: "Geri",
    formTitle: "Servis Formu",
    formIntro: "Ana \u015fikayet bilgilerini a\u015fa\u011f\u0131ya girin.",
    requiredFieldTitle: "Zorunlu alan",
    requiredFieldMissing: "L\u00fctfen bu zorunlu alan\u0131 doldurun.",
    requiredFieldsAlertTitle: "Zorunlu alan eksik",
    requiredFieldsAlertText: "L\u00fctfen i\u015faretli zorunlu alanlar\u0131 doldurun.",
    requiredFieldsAlertAction: "Alana git",
    fieldOptionalSuffix: " (iste\u011fe ba\u011fl\u0131)",
    contractNumber: "Sat\u0131n alma s\u00f6zle\u015fme numaras\u0131",
    contractPlaceholder: "\u00f6rn. 736272",
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
    gender: "Hitap",
    genderPlaceholder: "Se\u00e7in",
    salutationMr: "Bay",
    salutationMrs: "Bayan",
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
    landlordContactPersonGroup: "\u0130leti\u015fim ki\u015fisi",
    landlordCompanyName: "Firma ad\u0131",
    landlordCompanyNamePlaceholder: "Firma / site y\u00f6netimi",
    landlordCompanyPhone: "Telefon",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "E-posta",
    landlordCompanyEmailPlaceholder: "iletisim@example.com",
    landlordContactGivenName: "Ad",
    landlordContactGivenNamePlaceholder: "Ad",
    landlordContactSurname: "Soyad",
    landlordContactSurnamePlaceholder: "Soyad",
    landlordPhone: "\u0130leti\u015fim ki\u015fisi telefonu",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "\u0130leti\u015fim ki\u015fisi e-postas\u0131",
    landlordEmailPlaceholder: "iletisim@example.com",
    hausmeisterSection: "Bina g\u00f6revlisi",
    hausmeisterInvolvedQuestion: "Bina g\u00f6revlisi dahil mi?",
    hausmeisterYes: "Evet",
    hausmeisterNo: "Hay\u0131r",
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
    attachmentsHint: "PDF, g\u00f6rsel veya ofis dosyalar\u0131 \u2014 en fazla 20 dosya, dosya ba\u015f\u0131na en fazla 4 MB.",
    attachmentsClear: "T\u00fcm\u00fcn\u00fc kald\u0131r",
    attachmentsViewMore: "Daha fazla g\u00f6ster",
    attachmentsViewLess: "Daha az g\u00f6ster",
    attachmentsSelected: "{count} dosya se\u00e7ildi",
    attachmentsErrorTooMany: "En fazla 20 dosya ekleyebilirsiniz.",
    attachmentsErrorFileTooLarge: "Her dosya en fazla 4 MB olabilir.",
    attachmentsErrorType: "Bu dosya t\u00fcr\u00fcne izin verilmiyor (PDF, g\u00f6rsel, Word/Excel vb.).",
    submit: "\u015eikayeti g\u00f6nder",
    submitting: "G\u00f6nderiliyor...",
    contactError: "L\u00fctfen telefon numaras\u0131 ve e-posta adresi girin.",
    submitError: "\u015eikayetiniz g\u00f6nderilemedi.",
    submitSuccess: "\u015eikayetiniz ba\u015far\u0131yla g\u00f6nderildi.",
    claimAssistantTitle: "\u015eikayet asistan\u0131",
    claimAssistantContextTitle: "Odak se\u00e7in",
    claimAssistantContextClaim: "T\u00fcm \u015fikayet",
    claimAssistantCloseAria: "\u015eikayet asistan\u0131n\u0131 kapat",
    claimAssistantLauncher: "\u015eikayet yard\u0131m\u0131",
    claimAssistantLauncherPrompt: "Bana sor",
    claimAssistantIntro:
      "Sorunu net anlatman\u0131za ve servis i\u00e7in hangi foto\u011fraflar\u0131n veya ayr\u0131nt\u0131lar\u0131n eklenece\u011fini \u00f6nermeme yard\u0131mc\u0131 olabilirim.",
    claimAssistantIntroSelected:
      "{label} \u00fczerinde odaklan\u0131yorsunuz. Ne eklemeniz veya nas\u0131l tarif etmeniz gerekti\u011fini bana sorun.",
    claimAssistantPlaceholder: "Bu \u015fikayet hakk\u0131nda soru sorun...",
    claimAssistantLoading: "\u00d6neriler haz\u0131rlan\u0131yor...",
    claimAssistantSend: "G\u00f6nder",
    claimAssistantVoiceStart: "Sesli sohbeti ba\u015flat",
    claimAssistantVoiceStop: "Dinlemeyi durdur",
    claimAssistantVoiceListening: "Dinleniyor...",
    claimAssistantVoiceUnsupported: "Bu taray\u0131c\u0131da sesli sohbet desteklenmiyor.",
    claimAssistantVoicePermission: "Sesli sohbet i\u00e7in mikrofon izni gerekir.",
    claimAssistantVoiceError: "Sesli giri\u015f ba\u015flat\u0131lamad\u0131.",
    claimAssistantErrorUnavailable: "\u015eikayet yard\u0131mc\u0131s\u0131 \u015fu anda yan\u0131t veremedi.",
    tourStart: "Yard\u0131m / Turu ba\u015flat",
    tourStartAria: "Servis sayfas\u0131 turunu ba\u015flat",
    tourStepProgress: "Ad\u0131m {current} / {total}",
    tourNext: "Devam",
    tourSkip: "Turu ge\u00e7",
    tourFinish: "Bitir",
    tourPurchaseTitle: "Ek \u00fcr\u00fcn sipari\u015f et",
    tourPurchaseDescription: "Mevcut mutfa\u011f\u0131n\u0131za ek mutfak par\u00e7alar\u0131, aksesuarlar veya ilgili hizmetler eklemek i\u00e7in yap\u0131land\u0131r\u0131c\u0131y\u0131 burada a\u00e7\u0131n.",
    tourComplaintTitle: "Sorun bildir",
    tourComplaintDescription: "Hasar, ar\u0131za, eksik par\u00e7a, cihaz sorunu veya di\u011fer servis konular\u0131 i\u00e7in buradan \u015fikayet olu\u015fturun. Detay ve foto\u011fraf ekleyebilirsiniz.",
    tourRegisterTitle: "Mutfa\u011f\u0131 kaydet",
    tourRegisterDescription: "Servis ekibinin mutfa\u011f\u0131n\u0131z\u0131 daha h\u0131zl\u0131 bulabilmesi i\u00e7in sat\u0131n alma s\u00f6zle\u015fmesi numaran\u0131z\u0131 g\u00fcncel ileti\u015fim bilgilerinizle ba\u011flay\u0131n.",
    removeFileAria: "Dosyay\u0131 kald\u0131r",
    viewFile: "G\u00f6r",
    viewFileAria: "Dosyay\u0131 g\u00f6r",
    closeFilePreview: "\u00d6nizlemeyi kapat",
    filePreviewUnavailable: "Bu dosya t\u00fcr\u00fc taray\u0131c\u0131da \u00f6nizlenemez.",
    removeSerialNumberAria: "Seri numaras\u0131n\u0131 kald\u0131r",
    stickyContractDismissAria: "Sabit s\u00f6zle\u015fme numaras\u0131 alan\u0131n\u0131 kapat",
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
    registerBadge: "Registro",
    registerTitle: "Registrar mi cocina",
    registerBrand: "REGISTRO ARCHITECTO",
    registerText: "Vincula el n\u00famero de contrato de compra con tus datos de contacto actuales.",
    registerCta: "Registrar ahora",
    registerPanelTitle: "Registrar esta cocina a mi nombre",
    registerPanelText: "Introduce el n\u00famero de contrato de compra, tus datos de contacto y los datos del apartamento. El n\u00famero de contrato permanece igual, pero el registro activo pasa a tu nombre.",
    registerFullName: "Nombre completo",
    registerFullNamePlaceholder: "Nombre Apellidos",
    registerFullNameRequired: "Introduce tu nombre completo.",
    registerAddressNote: "Direcci\u00f3n / apartamento",
    registerAddressNotePlaceholder: "Opcional: direcci\u00f3n, piso o n\u00famero de apartamento",
    registerEmailRequired: "Introduce una direcci\u00f3n de correo para la confirmaci\u00f3n.",
    registerVerificationPostalCode: "C\u00f3digo postal",
    registerVerificationPostalCodePlaceholder: "p. ej. 10115",
    registerVerificationUnit: "Calle / apartamento",
    registerVerificationUnitPlaceholder: "p. ej. Demo Street 2",
    registerVerificationRequired: "Introduce el c\u00f3digo postal y la calle, apartamento o piso.",
    registerCode: "C\u00f3digo de correo",
    registerCodePlaceholder: "C\u00f3digo de 6 d\u00edgitos",
    registerCodeRequired: "Introduce el c\u00f3digo recibido por correo.",
    registerVerifySubmit: "Confirmar registro",
    registerVerifySubmitting: "Confirmando...",
    registerSubmit: "Registrar cocina",
    registerSubmitting: "Registrando...",
    registerSuccess: "Esta cocina ya est\u00e1 registrada a tu nombre.",
    registeredNextSuccess: "Esta cocina ya est\u00e1 registrada a tu nombre. Los registros activos anteriores de este contrato se han cerrado.",
    registeredNextTitle: "Cocina registrada",
    registeredNextText: "Tu cocina est\u00e1 vinculada. Elige el \u00e1rea que se ajusta a lo que necesitas.",
    registeredNextOrderLabel: "Compra",
    registeredNextOrderTitle: "Quiero pedir algo",
    registeredNextOrderText: "Para accesorios, complementos o componentes adicionales. El configurador se abre con tu n\u00famero de contrato registrado.",
    registeredNextOrderCta: "Abrir configurador",
    registeredNextClaimLabel: "Reclamaci\u00f3n",
    registeredNextClaimTitle: "Quiero presentar una reclamaci\u00f3n",
    registeredNextClaimText: "Para defectos, da\u00f1os, piezas faltantes o quejas. El formulario de reclamaci\u00f3n se inicia con tus datos de registro.",
    registeredNextClaimCta: "Abrir formulario de reclamaci\u00f3n",
    registerError: "No se pudo registrar la cocina.",
    purchasePanelTitle: "Continuar al proceso de compra",
    purchasePanelText: "Si el inquilino necesita art\u00edculos adicionales en lugar de una reclamaci\u00f3n, contin\u00faa al configurador.",
    openConfigurator: "Abrir configurador",
    back: "Atr\u00e1s",
    formTitle: "Formulario de servicio",
    formIntro: "Complete a continuaci\u00f3n los datos principales de la reclamaci\u00f3n.",
    requiredFieldTitle: "Campo obligatorio",
    requiredFieldMissing: "Complete este campo obligatorio.",
    requiredFieldsAlertTitle: "Falta un campo obligatorio",
    requiredFieldsAlertText: "Complete los campos obligatorios marcados.",
    requiredFieldsAlertAction: "Ir al campo",
    fieldOptionalSuffix: " (opcional)",
    contractNumber: "N\u00famero de contrato de compra",
    contractPlaceholder: "p. ej. 736272",
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
    gender: "Tratamiento",
    genderPlaceholder: "Seleccione",
    salutationMr: "Sr.",
    salutationMrs: "Sra.",
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
    landlordContactPersonGroup: "Persona de contacto",
    landlordCompanyName: "Nombre de la empresa",
    landlordCompanyNamePlaceholder: "Empresa / administraci\u00f3n de fincas",
    landlordCompanyPhone: "Tel\u00e9fono",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "Correo",
    landlordCompanyEmailPlaceholder: "contacto@ejemplo.com",
    landlordContactGivenName: "Nombre",
    landlordContactGivenNamePlaceholder: "Nombre",
    landlordContactSurname: "Apellidos",
    landlordContactSurnamePlaceholder: "Apellidos",
    landlordPhone: "Tel\u00e9fono de la persona de contacto",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "Correo de la persona de contacto",
    landlordEmailPlaceholder: "contacto@ejemplo.com",
    hausmeisterSection: "Encargado",
    hausmeisterInvolvedQuestion: "\u00bfHay encargado involucrado?",
    hausmeisterYes: "S\u00ed",
    hausmeisterNo: "No",
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
    attachmentsHint: "PDF, im\u00e1genes u oficina: hasta 20 archivos, 4 MB cada uno.",
    attachmentsClear: "Quitar todos",
    attachmentsViewMore: "Ver m\u00e1s",
    attachmentsViewLess: "Ver menos",
    attachmentsSelected: "{count} archivo(s) seleccionado(s)",
    attachmentsErrorTooMany: "Puede adjuntar como m\u00e1ximo 20 archivos.",
    attachmentsErrorFileTooLarge: "Cada archivo debe tener 4 MB o menos.",
    attachmentsErrorType: "Tipo de archivo no permitido (p. ej. PDF, im\u00e1genes, Word/Excel).",
    submit: "Enviar reclamaci\u00f3n",
    submitting: "Enviando...",
    contactError: "Indique un n\u00famero de tel\u00e9fono y una direcci\u00f3n de correo electr\u00f3nico.",
    submitError: "No se pudo enviar la reclamaci\u00f3n.",
    submitSuccess: "La reclamaci\u00f3n se ha enviado correctamente.",
    claimAssistantTitle: "Asistente de reclamaciones",
    claimAssistantContextTitle: "Elija un enfoque",
    claimAssistantContextClaim: "Toda la reclamaci\u00f3n",
    claimAssistantCloseAria: "Cerrar asistente de reclamaciones",
    claimAssistantLauncher: "Ayuda con la reclamaci\u00f3n",
    claimAssistantLauncherPrompt: "Preg\u00fanteme",
    claimAssistantIntro:
      "Puedo ayudarle a describir el problema con claridad y sugerir qu\u00e9 fotos o datos a\u00f1adir para el servicio t\u00e9cnico.",
    claimAssistantIntroSelected:
      "Se centra en {label}. Preg\u00fanteme qu\u00e9 incluir o c\u00f3mo describir el problema.",
    claimAssistantPlaceholder: "Pregunte sobre esta reclamaci\u00f3n...",
    claimAssistantLoading: "Preparando sugerencias...",
    claimAssistantSend: "Enviar",
    claimAssistantVoiceStart: "Iniciar chat de voz",
    claimAssistantVoiceStop: "Dejar de escuchar",
    claimAssistantVoiceListening: "Escuchando...",
    claimAssistantVoiceUnsupported: "El chat de voz no es compatible con este navegador.",
    claimAssistantVoicePermission: "Se necesita permiso del micr\u00f3fono para el chat de voz.",
    claimAssistantVoiceError: "No se pudo iniciar la entrada de voz.",
    claimAssistantErrorUnavailable: "El asistente de reclamaciones no pudo responder ahora.",
    tourStart: "Ayuda / Iniciar tour",
    tourStartAria: "Iniciar tour de la p\u00e1gina de servicio",
    tourStepProgress: "Paso {current} de {total}",
    tourNext: "Siguiente",
    tourSkip: "Omitir tour",
    tourFinish: "Finalizar",
    tourPurchaseTitle: "Pedir art\u00edculos extra",
    tourPurchaseDescription: "Abra aqu\u00ed el configurador para a\u00f1adir componentes de cocina, accesorios o servicios relacionados a su cocina existente.",
    tourComplaintTitle: "Informar de un problema",
    tourComplaintDescription: "Use esta secci\u00f3n para reclamar da\u00f1os, defectos, piezas faltantes, problemas de electrodom\u00e9sticos u otros casos de servicio. Puede a\u00f1adir detalles y fotos.",
    tourRegisterTitle: "Registrar su cocina",
    tourRegisterDescription: "Conecte aqu\u00ed su n\u00famero de contrato con sus datos de contacto actuales para que el equipo de servicio identifique su cocina m\u00e1s r\u00e1pido.",
    removeFileAria: "Quitar archivo",
    viewFile: "Ver",
    viewFileAria: "Ver archivo",
    closeFilePreview: "Cerrar vista previa",
    filePreviewUnavailable: "Este tipo de archivo no se puede previsualizar en el navegador.",
    removeSerialNumberAria: "Quitar n\u00famero de serie",
    stickyContractDismissAria: "Desactivar el campo fijo del n\u00famero de contrato",
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
    registerBadge: "Enregistrement",
    registerTitle: "Enregistrer ma cuisine",
    registerBrand: "ENREGISTREMENT ARCHITECTO",
    registerText: "Associez le num\u00e9ro de contrat d'achat \u00e0 vos coordonn\u00e9es actuelles.",
    registerCta: "Enregistrer maintenant",
    registerPanelTitle: "Enregistrer cette cuisine \u00e0 mon nom",
    registerPanelText: "Saisissez le num\u00e9ro de contrat d'achat, vos coordonn\u00e9es et les informations de l'appartement. Le num\u00e9ro de contrat reste le m\u00eame, mais l'enregistrement actif passe \u00e0 votre nom.",
    registerFullName: "Nom complet",
    registerFullNamePlaceholder: "Pr\u00e9nom Nom",
    registerFullNameRequired: "Veuillez saisir votre nom complet.",
    registerAddressNote: "Adresse / appartement",
    registerAddressNotePlaceholder: "Facultatif : adresse, \u00e9tage ou num\u00e9ro d'appartement",
    registerEmailRequired: "Veuillez saisir une adresse e-mail pour la confirmation.",
    registerVerificationPostalCode: "Code postal",
    registerVerificationPostalCodePlaceholder: "ex. 10115",
    registerVerificationUnit: "Rue / appartement",
    registerVerificationUnitPlaceholder: "ex. Demo Street 2",
    registerVerificationRequired: "Veuillez saisir le code postal et la rue, l'appartement ou l'\u00e9tage.",
    registerCode: "Code e-mail",
    registerCodePlaceholder: "Code \u00e0 6 chiffres",
    registerCodeRequired: "Veuillez saisir le code re\u00e7u par e-mail.",
    registerVerifySubmit: "Confirmer l'enregistrement",
    registerVerifySubmitting: "Confirmation...",
    registerSubmit: "Enregistrer la cuisine",
    registerSubmitting: "Enregistrement...",
    registerSuccess: "Cette cuisine est maintenant enregistr\u00e9e \u00e0 votre nom.",
    registeredNextSuccess: "Cette cuisine est maintenant enregistr\u00e9e \u00e0 votre nom. Les enregistrements actifs pr\u00e9c\u00e9dents pour ce contrat ont \u00e9t\u00e9 cl\u00f4tur\u00e9s.",
    registeredNextTitle: "Cuisine enregistr\u00e9e",
    registeredNextText: "Votre cuisine est associ\u00e9e. Choisissez la zone qui correspond \u00e0 votre besoin.",
    registeredNextOrderLabel: "Achat",
    registeredNextOrderTitle: "Je souhaite commander quelque chose",
    registeredNextOrderText: "Pour des accessoires, des compl\u00e9ments ou des composants suppl\u00e9mentaires. Le configurateur s'ouvre avec votre num\u00e9ro de contrat enregistr\u00e9.",
    registeredNextOrderCta: "Ouvrir le configurateur",
    registeredNextClaimLabel: "R\u00e9clamation",
    registeredNextClaimTitle: "Je souhaite d\u00e9poser une r\u00e9clamation",
    registeredNextClaimText: "Pour des d\u00e9fauts, dommages, pi\u00e8ces manquantes ou r\u00e9clamations. Le formulaire de r\u00e9clamation commence avec vos donn\u00e9es d'enregistrement.",
    registeredNextClaimCta: "Ouvrir le formulaire de r\u00e9clamation",
    registerError: "La cuisine n'a pas pu \u00eatre enregistr\u00e9e.",
    purchasePanelTitle: "Continuer vers le processus d'achat",
    purchasePanelText: "Si le locataire a besoin d'articles suppl\u00e9mentaires plut\u00f4t que d'une r\u00e9clamation, continuez vers le configurateur.",
    openConfigurator: "Ouvrir le configurateur",
    back: "Retour",
    formTitle: "Formulaire SAV",
    formIntro: "Renseignez ci-dessous les principales informations de r\u00e9clamation.",
    requiredFieldTitle: "Champ obligatoire",
    requiredFieldMissing: "Veuillez remplir ce champ obligatoire.",
    requiredFieldsAlertTitle: "Champ obligatoire manquant",
    requiredFieldsAlertText: "Veuillez compl\u00e9ter les champs obligatoires signal\u00e9s.",
    requiredFieldsAlertAction: "Aller au champ",
    fieldOptionalSuffix: " (facultatif)",
    contractNumber: "Num\u00e9ro de contrat d'achat",
    contractPlaceholder: "ex. 736272",
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
    gender: "Civilit\u00e9",
    genderPlaceholder: "S\u00e9lectionnez",
    salutationMr: "M.",
    salutationMrs: "Mme",
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
    landlordContactPersonGroup: "Personne de contact",
    landlordCompanyName: "Nom de l'entreprise",
    landlordCompanyNamePlaceholder: "Entreprise / gestion immobili\u00e8re",
    landlordCompanyPhone: "T\u00e9l\u00e9phone",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "E-mail",
    landlordCompanyEmailPlaceholder: "contact@exemple.com",
    landlordContactGivenName: "Pr\u00e9nom",
    landlordContactGivenNamePlaceholder: "Pr\u00e9nom",
    landlordContactSurname: "Nom",
    landlordContactSurnamePlaceholder: "Nom",
    landlordPhone: "T\u00e9l\u00e9phone du contact",
    landlordPhonePlaceholder: "+49 ...",
    landlordEmail: "E-mail du contact",
    landlordEmailPlaceholder: "contact@exemple.com",
    hausmeisterSection: "Gardien",
    hausmeisterInvolvedQuestion: "Gardien concern\u00e9 ?",
    hausmeisterYes: "Oui",
    hausmeisterNo: "Non",
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
    attachmentsHint: "PDF, images ou bureautique : jusqu'\u00e0 20 fichiers, 4 Mo chacun.",
    attachmentsClear: "Tout retirer",
    attachmentsViewMore: "Voir plus",
    attachmentsViewLess: "Voir moins",
    attachmentsSelected: "{count} fichier(s) s\u00e9lectionn\u00e9(s)",
    attachmentsErrorTooMany: "Vous pouvez joindre au maximum 20 fichiers.",
    attachmentsErrorFileTooLarge: "Chaque fichier doit faire 4 Mo ou moins.",
    attachmentsErrorType: "Type de fichier non autoris\u00e9 (PDF, images, Word/Excel, etc.).",
    submit: "Envoyer la r\u00e9clamation",
    submitting: "Envoi en cours...",
    contactError: "Veuillez fournir un num\u00e9ro de t\u00e9l\u00e9phone et une adresse e-mail.",
    submitError: "La r\u00e9clamation n'a pas pu \u00eatre envoy\u00e9e.",
    submitSuccess: "La r\u00e9clamation a \u00e9t\u00e9 envoy\u00e9e avec succ\u00e8s.",
    claimAssistantTitle: "Assistant r\u00e9clamation",
    claimAssistantContextTitle: "Choisir un focus",
    claimAssistantContextClaim: "R\u00e9clamation enti\u00e8re",
    claimAssistantCloseAria: "Fermer l'assistant r\u00e9clamation",
    claimAssistantLauncher: "Aide r\u00e9clamation",
    claimAssistantLauncherPrompt: "Posez votre question",
    claimAssistantIntro:
      "Je peux vous aider \u00e0 d\u00e9crire le probl\u00e8me clairement et sugg\u00e9rer quelles photos ou pr\u00e9cisions ajouter pour le service.",
    claimAssistantIntroSelected:
      "Vous vous concentrez sur {label}. Demandez-moi quoi inclure ou comment d\u00e9crire le probl\u00e8me.",
    claimAssistantPlaceholder: "Question sur cette r\u00e9clamation...",
    claimAssistantLoading: "Pr\u00e9paration des suggestions...",
    claimAssistantSend: "Envoyer",
    claimAssistantVoiceStart: "D\u00e9marrer la conversation vocale",
    claimAssistantVoiceStop: "Arr\u00eater l'\u00e9coute",
    claimAssistantVoiceListening: "J'\u00e9coute...",
    claimAssistantVoiceUnsupported: "La conversation vocale n'est pas prise en charge dans ce navigateur.",
    claimAssistantVoicePermission: "L'autorisation du microphone est n\u00e9cessaire pour la conversation vocale.",
    claimAssistantVoiceError: "Impossible de d\u00e9marrer la saisie vocale.",
    claimAssistantErrorUnavailable: "L'assistant r\u00e9clamation ne peut pas r\u00e9pondre pour le moment.",
    tourStart: "Aide / D\u00e9marrer la visite",
    tourStartAria: "D\u00e9marrer la visite de la page de service",
    tourStepProgress: "\u00c9tape {current} sur {total}",
    tourNext: "Suivant",
    tourSkip: "Ignorer la visite",
    tourFinish: "Terminer",
    tourPurchaseTitle: "Commander des articles suppl\u00e9mentaires",
    tourPurchaseDescription: "Ouvrez ici le configurateur pour ajouter des composants de cuisine, des accessoires ou des services \u00e0 votre cuisine existante.",
    tourComplaintTitle: "Signaler un probl\u00e8me",
    tourComplaintDescription: "Utilisez cette section pour signaler des dommages, d\u00e9fauts, pi\u00e8ces manquantes, probl\u00e8mes d'appareil ou autres demandes de service. Vous pouvez ajouter des d\u00e9tails et des photos.",
    tourRegisterTitle: "Enregistrer votre cuisine",
    tourRegisterDescription: "Associez ici votre num\u00e9ro de contrat \u00e0 vos coordonn\u00e9es actuelles afin que l'\u00e9quipe de service identifie votre cuisine plus rapidement.",
    removeFileAria: "Retirer le fichier",
    viewFile: "Voir",
    viewFileAria: "Voir le fichier",
    closeFilePreview: "Fermer l'aper\u00e7u",
    filePreviewUnavailable: "Ce type de fichier ne peut pas \u00eatre pr\u00e9visualis\u00e9 dans le navigateur.",
    removeSerialNumberAria: "Retirer le num\u00e9ro de s\u00e9rie",
    stickyContractDismissAria: "D\u00e9sactiver le champ fixe du num\u00e9ro de contrat",
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
    registerBadge: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f",
    registerTitle: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043c\u043e\u044e \u043a\u0443\u0445\u043d\u044e",
    registerBrand: "\u0420\u0415\u0413\u0418\u0421\u0422\u0420\u0410\u0426\u0418\u042f ARCHITECTO",
    registerText: "\u0421\u0432\u044f\u0436\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438 \u0441 \u0432\u0430\u0448\u0438\u043c\u0438 \u0442\u0435\u043a\u0443\u0449\u0438\u043c\u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u043c\u0438 \u0434\u0430\u043d\u043d\u044b\u043c\u0438.",
    registerCta: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
    registerPanelTitle: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u044d\u0442\u0443 \u043a\u0443\u0445\u043d\u044e \u043d\u0430 \u043c\u0435\u043d\u044f",
    registerPanelText: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438, \u0432\u0430\u0448\u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u044b \u0438 \u0434\u0430\u043d\u043d\u044b\u0435 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b. \u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043e\u0441\u0442\u0430\u0435\u0442\u0441\u044f \u0442\u0435\u043c \u0436\u0435, \u043d\u043e \u0430\u043a\u0442\u0438\u0432\u043d\u0430\u044f \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043f\u0435\u0440\u0435\u0439\u0434\u0435\u0442 \u043a \u0432\u0430\u043c.",
    registerFullName: "\u041f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f",
    registerFullNamePlaceholder: "\u0418\u043c\u044f \u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    registerFullNameRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f.",
    registerAddressNote: "\u0410\u0434\u0440\u0435\u0441 / \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u0430",
    registerAddressNotePlaceholder: "\u041d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e: \u0430\u0434\u0440\u0435\u0441, \u044d\u0442\u0430\u0436 \u0438\u043b\u0438 \u043d\u043e\u043c\u0435\u0440 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b",
    registerEmailRequired: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 e-mail \u0434\u043b\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f.",
    registerVerificationPostalCode: "\u041f\u043e\u0447\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441",
    registerVerificationPostalCodePlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 10115",
    registerVerificationUnit: "\u0423\u043b\u0438\u0446\u0430 / \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u0430",
    registerVerificationUnitPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 Demo Street 2",
    registerVerificationRequired: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0438\u043d\u0434\u0435\u043a\u0441 \u0438 \u0443\u043b\u0438\u0446\u0443, \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u0443 \u0438\u043b\u0438 \u044d\u0442\u0430\u0436.",
    registerCode: "\u041a\u043e\u0434 \u0438\u0437 e-mail",
    registerCodePlaceholder: "6-\u0437\u043d\u0430\u0447\u043d\u044b\u0439 \u043a\u043e\u0434",
    registerCodeRequired: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0438\u0437 e-mail.",
    registerVerifySubmit: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044e",
    registerVerifySubmitting: "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435...",
    registerSubmit: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u0443\u0445\u043d\u044e",
    registerSubmitting: "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f...",
    registerSuccess: "\u042d\u0442\u0430 \u043a\u0443\u0445\u043d\u044f \u0442\u0435\u043f\u0435\u0440\u044c \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0430 \u043d\u0430 \u0432\u0430\u0441.",
    registeredNextSuccess: "\u042d\u0442\u0430 \u043a\u0443\u0445\u043d\u044f \u0442\u0435\u043f\u0435\u0440\u044c \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0430 \u043d\u0430 \u0432\u0430\u0441. \u041f\u0440\u0435\u0436\u043d\u0438\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u043f\u043e \u044d\u0442\u043e\u043c\u0443 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0443 \u0437\u0430\u043a\u0440\u044b\u0442\u044b.",
    registeredNextTitle: "\u041a\u0443\u0445\u043d\u044f \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u0430",
    registeredNextText: "\u0412\u0430\u0448\u0430 \u043a\u0443\u0445\u043d\u044f \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u0430. \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0430\u0437\u0434\u0435\u043b, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432\u0430\u0448\u0435\u0439 \u043f\u043e\u0442\u0440\u0435\u0431\u043d\u043e\u0441\u0442\u0438.",
    registeredNextOrderLabel: "\u041f\u043e\u043a\u0443\u043f\u043a\u0430",
    registeredNextOrderTitle: "\u042f \u0445\u043e\u0447\u0443 \u0447\u0442\u043e-\u0442\u043e \u0437\u0430\u043a\u0430\u0437\u0430\u0442\u044c",
    registeredNextOrderText: "\u0414\u043b\u044f \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043e\u0432, \u0434\u043e\u043f\u043e\u043b\u043d\u0435\u043d\u0438\u0439 \u0438\u043b\u0438 \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u043e\u0432. \u041a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u0448\u0438\u043c \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u043c \u043d\u043e\u043c\u0435\u0440\u043e\u043c \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430.",
    registeredNextOrderCta: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440",
    registeredNextClaimLabel: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f",
    registeredNextClaimTitle: "\u042f \u0445\u043e\u0447\u0443 \u043f\u043e\u0434\u0430\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    registeredNextClaimText: "\u0414\u043b\u044f \u0434\u0435\u0444\u0435\u043a\u0442\u043e\u0432, \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0439, \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439 \u0438\u043b\u0438 \u0436\u0430\u043b\u043e\u0431. \u0424\u043e\u0440\u043c\u0430 \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438 \u043d\u0430\u0447\u043d\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u0448\u0438\u0445 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445.",
    registeredNextClaimCta: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u0440\u043c\u0443 \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438",
    registerError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u0443\u0445\u043d\u044e.",
    purchasePanelTitle: "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u043f\u0440\u043e\u0446\u0435\u0441\u0441\u0443 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    purchasePanelText: "\u0415\u0441\u043b\u0438 \u0430\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440\u0443 \u043d\u0443\u0436\u043d\u044b \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u0432\u043c\u0435\u0441\u0442\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438, \u043f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u0432 \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440.",
    openConfigurator: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440",
    back: "\u041d\u0430\u0437\u0430\u0434",
    formTitle: "\u0421\u0435\u0440\u0432\u0438\u0441\u043d\u0430\u044f \u0444\u043e\u0440\u043c\u0430",
    formIntro: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043d\u0438\u0436\u0435 \u043e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438.",
    requiredFieldTitle: "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043b\u0435",
    requiredFieldMissing: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u044d\u0442\u043e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043b\u0435.",
    requiredFieldsAlertTitle: "\u041d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u043e \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043b\u0435",
    requiredFieldsAlertText: "\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043e\u0442\u043c\u0435\u0447\u0435\u043d\u043d\u044b\u0435 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u043b\u044f.",
    requiredFieldsAlertAction: "\u041a \u043f\u043e\u043b\u044e",
    fieldOptionalSuffix: " (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)",
    contractNumber: "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438",
    contractPlaceholder: "\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 736272",
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
    gender: "\u041e\u0431\u0440\u0430\u0449\u0435\u043d\u0438\u0435",
    genderPlaceholder: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435",
    salutationMr: "\u0413-\u043d",
    salutationMrs: "\u0413-\u0436\u0430",
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
    landlordPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u043e\u0433\u043e \u043b\u0438\u0446\u0430",
    landlordPhonePlaceholder: "+49 ...",
    landlordCompanyName: "\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438",
    landlordCompanyNamePlaceholder: "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f / \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043d\u0435\u0434\u0432\u0438\u0436\u0438\u043c\u043e\u0441\u0442\u044c\u044e",
    landlordCompanyPhone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    landlordCompanyPhonePlaceholder: "+49 ...",
    landlordCompanyEmail: "E-mail",
    landlordCompanyEmailPlaceholder: "contact@example.com",
    landlordContactGivenName: "\u0418\u043c\u044f",
    landlordContactGivenNamePlaceholder: "\u0418\u043c\u044f",
    landlordContactSurname: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordContactSurnamePlaceholder: "\u0424\u0430\u043c\u0438\u043b\u0438\u044f",
    landlordEmail: "E-mail \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u043e\u0433\u043e \u043b\u0438\u0446\u0430",
    landlordEmailPlaceholder: "contact@example.com",
    hausmeisterSection: "\u0425\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440",
    hausmeisterInvolvedQuestion: "\u0423\u043a\u0430\u0437\u0430\u043d \u0445\u0430\u0443\u0441\u043c\u0430\u0439\u0441\u0442\u0435\u0440?",
    hausmeisterYes: "\u0414\u0430",
    hausmeisterNo: "\u041d\u0435\u0442",
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
    attachmentsHint: "PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f \u0438\u043b\u0438 \u043e\u0444\u0438\u0441\u043d\u044b\u0435 \u0444\u0430\u0439\u043b\u044b \u2014 \u0434\u043e 20 \u0444\u0430\u0439\u043b\u043e\u0432, \u0434\u043e 4 \u041c\u0411 \u043a\u0430\u0436\u0434\u044b\u0439.",
    attachmentsClear: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435",
    attachmentsViewMore: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0435\u0449\u0435",
    attachmentsViewLess: "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043c\u0435\u043d\u044c\u0448\u0435",
    attachmentsSelected: "\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432: {count}",
    attachmentsErrorTooMany: "\u041d\u0435 \u0431\u043e\u043b\u0435\u0435 20 \u0432\u043b\u043e\u0436\u0435\u043d\u0438\u0439.",
    attachmentsErrorFileTooLarge: "\u041a\u0430\u0436\u0434\u044b\u0439 \u0444\u0430\u0439\u043b \u2014 \u043d\u0435 \u0431\u043e\u043b\u0435\u0435 4 \u041c\u0411.",
    attachmentsErrorType: "\u0422\u0438\u043f \u0444\u0430\u0439\u043b\u0430 \u043d\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043d (PDF, \u0438\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u044f, Word/Excel).",
    submit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e",
    submitting: "\u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430...",
    contactError: "\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430 \u0438 \u0430\u0434\u0440\u0435\u0441 \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b.",
    submitError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e.",
    submitSuccess: "\u0420\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0430.",
    claimAssistantTitle: "\u041f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438",
    claimAssistantContextTitle: "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043e\u043a\u0443\u0441",
    claimAssistantContextClaim: "\u0412\u0441\u044f \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f",
    claimAssistantCloseAria:
      "\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u043e\u043c\u043e\u0449\u043d\u0438\u043a\u0430 \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438",
    claimAssistantLauncher: "\u041f\u043e\u043c\u043e\u0449\u044c \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438",
    claimAssistantLauncherPrompt: "\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u043c\u0435\u043d\u044f",
    claimAssistantIntro:
      "\u042f \u043f\u043e\u043c\u043e\u0433\u0443 \u0447\u0451\u0442\u043a\u043e \u043e\u043f\u0438\u0441\u0430\u0442\u044c \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443 \u0438 \u043f\u043e\u0434\u0441\u043a\u0430\u0436\u0443, \u043a\u0430\u043a\u0438\u0435 \u0444\u043e\u0442\u043e \u0438\u043b\u0438 \u0434\u0435\u0442\u0430\u043b\u0438 \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0434\u043b\u044f \u0441\u0435\u0440\u0432\u0438\u0441\u0430.",
    claimAssistantIntroSelected:
      "\u0412\u044b \u0441\u043e\u0441\u0440\u0435\u0434\u043e\u0442\u043e\u0447\u0435\u043d\u044b \u043d\u0430 {label}. \u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435, \u0447\u0442\u043e \u0443\u043a\u0430\u0437\u0430\u0442\u044c \u0438\u043b\u0438 \u043a\u0430\u043a \u043e\u043f\u0438\u0441\u0430\u0442\u044c \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443.",
    claimAssistantPlaceholder: "\u0412\u043e\u043f\u0440\u043e\u0441 \u043f\u043e \u044d\u0442\u043e\u0439 \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u0438...",
    claimAssistantLoading: "\u0413\u043e\u0442\u043e\u0432\u0438\u043c \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438...",
    claimAssistantSend: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
    claimAssistantVoiceStart: "\u041d\u0430\u0447\u0430\u0442\u044c \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0447\u0430\u0442",
    claimAssistantVoiceStop: "\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0440\u043e\u0441\u043b\u0443\u0448\u0438\u0432\u0430\u043d\u0438\u0435",
    claimAssistantVoiceListening: "\u0421\u043b\u0443\u0448\u0430\u044e...",
    claimAssistantVoiceUnsupported:
      "\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0447\u0430\u0442 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0432 \u044d\u0442\u043e\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    claimAssistantVoicePermission:
      "\u0414\u043b\u044f \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0433\u043e \u0447\u0430\u0442\u0430 \u043d\u0443\u0436\u0435\u043d \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443.",
    claimAssistantVoiceError: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0439 \u0432\u0432\u043e\u0434.",
    claimAssistantErrorUnavailable:
      "\u041f\u043e\u043c\u043e\u0449\u043d\u0438\u043a \u043f\u043e \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044f\u043c \u0441\u0435\u0439\u0447\u0430\u0441 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u043e\u0442\u0432\u0435\u0442\u0438\u0442\u044c.",
    tourStart: "\u0421\u043f\u0440\u0430\u0432\u043a\u0430 / \u041d\u0430\u0447\u0430\u0442\u044c \u0442\u0443\u0440",
    tourStartAria: "\u041d\u0430\u0447\u0430\u0442\u044c \u0442\u0443\u0440 \u043f\u043e \u0441\u0435\u0440\u0432\u0438\u0441\u043d\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435",
    tourVideoTitle: "\u0412\u0438\u0434\u0435\u043e\u0433\u0438\u0434 \u043f\u043e \u0441\u0435\u0440\u0432\u0438\u0441\u043d\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435",
    tourVideoClose: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u0432\u0438\u0434\u0435\u043e\u0433\u0438\u0434",
    tourVideoUnsupported: "\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043c\u043e\u0436\u0435\u0442 \u0432\u043e\u0441\u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u044d\u0442\u043e \u0432\u0438\u0434\u0435\u043e.",
    tourStepProgress: "\u0428\u0430\u0433 {current} \u0438\u0437 {total}",
    tourNext: "\u0414\u0430\u043b\u0435\u0435",
    tourSkip: "\u041f\u0440\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0442\u0443\u0440",
    tourFinish: "\u0413\u043e\u0442\u043e\u0432\u043e",
    tourPurchaseTitle: "\u0417\u0430\u043a\u0430\u0437\u0430\u0442\u044c \u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b",
    tourPurchaseDescription: "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0437\u0434\u0435\u0441\u044c \u043a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0442\u043e\u0440, \u0447\u0442\u043e\u0431\u044b \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043a \u0432\u0430\u0448\u0435\u0439 \u043a\u0443\u0445\u043d\u0435 \u0434\u0435\u0442\u0430\u043b\u0438, \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b \u0438\u043b\u0438 \u0441\u0435\u0440\u0432\u0438\u0441\u044b.",
    tourComplaintTitle: "\u0421\u043e\u043e\u0431\u0449\u0438\u0442\u044c \u043e \u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0435",
    tourComplaintDescription: "\u0417\u0434\u0435\u0441\u044c \u043c\u043e\u0436\u043d\u043e \u043e\u0444\u043e\u0440\u043c\u0438\u0442\u044c \u0440\u0435\u043a\u043b\u0430\u043c\u0430\u0446\u0438\u044e \u043f\u043e \u043f\u043e\u0432\u043e\u0434\u0443 \u043f\u043e\u0432\u0440\u0435\u0436\u0434\u0435\u043d\u0438\u0439, \u0434\u0435\u0444\u0435\u043a\u0442\u043e\u0432, \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0449\u0438\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439, \u043f\u0440\u043e\u0431\u043b\u0435\u043c \u0441 \u0442\u0435\u0445\u043d\u0438\u043a\u043e\u0439 \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0438\u0445 \u0441\u0435\u0440\u0432\u0438\u0441\u043d\u044b\u0445 \u0441\u043b\u0443\u0447\u0430\u0435\u0432. \u041c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0434\u0435\u0442\u0430\u043b\u0438 \u0438 \u0444\u043e\u0442\u043e.",
    tourRegisterTitle: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u0443\u0445\u043d\u044e",
    tourRegisterDescription: "\u0421\u0432\u044f\u0436\u0438\u0442\u0435 \u043d\u043e\u043c\u0435\u0440 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430 \u0441 \u0432\u0430\u0448\u0438\u043c\u0438 \u0442\u0435\u043a\u0443\u0449\u0438\u043c\u0438 \u043a\u043e\u043d\u0442\u0430\u043a\u0442\u043d\u044b\u043c\u0438 \u0434\u0430\u043d\u043d\u044b\u043c\u0438, \u0447\u0442\u043e\u0431\u044b \u0441\u0435\u0440\u0432\u0438\u0441\u043d\u0430\u044f \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u0431\u044b\u0441\u0442\u0440\u0435\u0435 \u043d\u0430\u0448\u043b\u0430 \u0432\u0430\u0448\u0443 \u043a\u0443\u0445\u043d\u044e.",
    removeFileAria: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0444\u0430\u0439\u043b",
    viewFile: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c",
    viewFileAria: "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0444\u0430\u0439\u043b",
    closeFilePreview: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440",
    filePreviewUnavailable: "\u042d\u0442\u043e\u0442 \u0442\u0438\u043f \u0444\u0430\u0439\u043b\u0430 \u043d\u0435\u043b\u044c\u0437\u044f \u043f\u0440\u0435\u0434\u0432\u0430\u0440\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
    removeSerialNumberAria: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0441\u0435\u0440\u0438\u0439\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
    stickyContractDismissAria: "\u041e\u0442\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u043f\u043e\u043b\u0435 \u043d\u043e\u043c\u0435\u0440\u0430 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430",
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
  landlordCompanyName: "",
  landlordCompanyPhone: "",
  landlordCompanyEmail: "",
  landlordContactGivenName: "",
  landlordContactSurname: "",
  landlordPhone: "",
  landlordEmail: "",
  hausmeisterInvolved: "no",
  hausmeisterGivenName: "",
  hausmeisterSurname: "",
  hausmeisterPhone: "",
  hausmeisterEmail: "",
  problemDescription: "",
  serialNumber: "",
  registrationGivenName: "",
  registrationSurname: "",
  registrationEmail: "",
  registrationPhone: "",
  registrationVerificationPostalCode: "",
  registrationVerificationUnit: "",
  registrationVerificationCode: "",
};

const EMPTY_CONTRACT_LOOKUP = {
  status: "idle",
  contractNumber: "",
  message: "",
  kitchenPlan: null,
};

const EMPTY_CLAIM_ASSISTANT_MESSAGES = [];
const PREFERRED_CONTACT_TIME_OPTIONS = buildTimeOptions();

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

function renderClaimAssistantMessageText(text) {
  const value = String(text || "");
  const segments = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return segments.map((segment, index) => {
    if (/^\*\*[^*]+\*\*$/.test(segment)) {
      return <strong key={`msg-${index}`}>{segment.slice(2, -2)}</strong>;
    }
    return <span key={`msg-${index}`}>{segment}</span>;
  });
}

function isPreferredContactCustom(windowValue) {
  return String(windowValue || "").trim() === "custom";
}

function mergeNonEmptyAutofillValues(current, autofill) {
  return Object.fromEntries(
    Object.entries(autofill || {}).filter(([key, value]) => {
      if (String(value || "").trim()) {
        return true;
      }
      return !String(current?.[key] || "").trim();
    }),
  );
}

function parseShortDate(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatDateToShort(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function startOfCalendarMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate) {
  const firstDayOfMonth = startOfCalendarMonth(monthDate);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function isSameCalendarDay(left, right) {
  if (!(left instanceof Date) || !(right instanceof Date)) {
    return false;
  }
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isBeforeCalendarDay(left, right) {
  if (!(left instanceof Date) || !(right instanceof Date)) {
    return false;
  }
  return (
    new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime()
    < new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime()
  );
}

function getWeekdayLabels(language) {
  const baseSunday = new Date(2026, 4, 17);
  const formatter = new Intl.DateTimeFormat(language || "en", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseSunday);
    date.setDate(baseSunday.getDate() + index);
    return formatter.format(date).replace(/\.$/, "");
  });
}

function getCalendarMonthLabel(date, language) {
  return new Intl.DateTimeFormat(language || "en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildTimeOptions() {
  return Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, "0")}:00`);
}

function parseTimeValue(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) {
    return { time: "" };
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    return { time: "" };
  }
  return {
    time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
  };
}

function convertTimeToMinutes(value) {
  const parsed = parseTimeValue(value);
  if (!parsed.time) {
    return Number.NaN;
  }
  const [hours, minutes] = parsed.time.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

function isTimeAfter(value, minimumValue) {
  const minutes = convertTimeToMinutes(value);
  const minimumMinutes = convertTimeToMinutes(minimumValue);
  return Number.isFinite(minutes) && Number.isFinite(minimumMinutes) && minutes > minimumMinutes;
}

function getPreferredContactTimeCandidate({ nextValue, minimumValue }) {
  if (!minimumValue) {
    return nextValue;
  }

  if (isTimeAfter(nextValue, minimumValue)) {
    return nextValue;
  }

  return "";
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

const SERVICE_TOUR_VIDEO_SRC = "/video/fragmento-tutorial-ru-faststart.mp4";

function ServiceVideoGuide({ isOpen, copy, onClose, onFinish }) {
  const videoRef = useRef(null);
  const title = copy.tourVideoTitle || COPY.en.tourVideoTitle;
  const closeLabel = copy.tourVideoClose || COPY.en.tourVideoClose;
  const unsupportedText = copy.tourVideoUnsupported || COPY.en.tourVideoUnsupported;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = false;
      video.volume = 1;
      const playPromise = video.play();
      playPromise?.catch?.(() => {});
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (video) {
        video.pause();
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="service-video-guide__backdrop" aria-hidden="true" />
      <section className="service-video-guide" role="dialog" aria-label={title}>
        <button
          type="button"
          className="service-video-guide__close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          &times;
        </button>
        <video
          ref={videoRef}
          className="service-video-guide__media"
          src={SERVICE_TOUR_VIDEO_SRC}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onCanPlay={() => {
            const video = videoRef.current;
            if (!video || !video.paused) return;
            video.muted = false;
            video.volume = 1;
            const playPromise = video.play();
            playPromise?.catch?.(() => {});
          }}
          onEnded={onFinish}
        >
          {unsupportedText}
        </video>
      </section>
    </>
  );
}

export default function ServiceClaimFlow() {
  const [language, setLanguage] = useState("de");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [completedRegistration, setCompletedRegistration] = useState(null);
  const [contractLookup, setContractLookup] = useState(EMPTY_CONTRACT_LOOKUP);
  const [problemComponentIds, setProblemComponentIds] = useState([]);
  const [problemAreaDetailsByComponentId, setProblemAreaDetailsByComponentId] = useState({});
  const [problemAreaAttachmentsByComponentId, setProblemAreaAttachmentsByComponentId] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [serialNumberImages, setSerialNumberImages] = useState([]);
  const [attachmentFieldKey, setAttachmentFieldKey] = useState(0);
  const [serialNumberImageFieldKey, setSerialNumberImageFieldKey] = useState(0);
  const [problemAreaAttachmentFieldKeysByComponentId, setProblemAreaAttachmentFieldKeysByComponentId] = useState({});
  const [isContractNumberStickyEnabled, setIsContractNumberStickyEnabled] = useState(true);
  const [isContractNumberCurrentlyStuck, setIsContractNumberCurrentlyStuck] = useState(false);
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
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [showClaimRequiredErrors, setShowClaimRequiredErrors] = useState(false);
  const [isClaimRequiredAlertDismissed, setIsClaimRequiredAlertDismissed] = useState(false);
  const [showProblemAreaAttachmentErrors, setShowProblemAreaAttachmentErrors] = useState(false);
  const [isPreferredContactCalendarOpen, setIsPreferredContactCalendarOpen] = useState(false);
  const [preferredContactCalendarMonth, setPreferredContactCalendarMonth] = useState(() =>
    startOfCalendarMonth(new Date()),
  );
  const [openPreferredContactTimeField, setOpenPreferredContactTimeField] = useState(null);
  const languageMenuRef = useRef(null);
  const contractLookupTimeoutRef = useRef(null);
  const contractLookupRequestIdRef = useRef(0);
  const contractHelpTouchXRef = useRef(null);
  const claimAssistantRecognitionRef = useRef(null);
  const claimAssistantAudioRef = useRef(null);
  const claimAssistantTtsAbortControllerRef = useRef(null);
  const claimAssistantLastVoiceSubmitRef = useRef({ text: "", submittedAt: 0 });
  const latestFormRef = useRef(INITIAL_FORM);
  const preferredContactCalendarRef = useRef(null);
  const preferredContactTimeFromRef = useRef(null);
  const preferredContactTimeToRef = useRef(null);
  const contractNumberStickySentinelRef = useRef(null);
  const clientAddressSectionRef = useRef(null);
  const hasSeenClientAddressSectionRef = useRef(false);
  const selectedServicePanelRef = useRef(null);
  const shouldScrollToSelectedPanelRef = useRef(false);

  const copy = COPY[language] || COPY.en;
  const fallbackCopy = COPY.en;
  const formValues = { ...INITIAL_FORM, ...form };
  const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
  const isComplaintMode = mode === "complaint";
  const isRegisterMode = mode === "register";
  const isRegisteredNextMode = mode === "registered-next";
  const selectedPreferredContactDate = useMemo(
    () => parseShortDate(formValues.preferredContactDate),
    [formValues.preferredContactDate],
  );
  const preferredContactWeekdayLabels = useMemo(() => getWeekdayLabels(language), [language]);
  const preferredContactCalendarDays = useMemo(
    () => buildCalendarDays(preferredContactCalendarMonth),
    [preferredContactCalendarMonth],
  );
  const preferredContactCalendarMonthLabel = useMemo(
    () => getCalendarMonthLabel(preferredContactCalendarMonth, language),
    [preferredContactCalendarMonth, language],
  );
  const preferredContactTimeFromParts = useMemo(
    () => parseTimeValue(formValues.preferredContactTimeFrom),
    [formValues.preferredContactTimeFrom],
  );
  const preferredContactTimeToParts = useMemo(
    () => parseTimeValue(formValues.preferredContactTimeTo),
    [formValues.preferredContactTimeTo],
  );
  const hasRequiredContactFields = useMemo(
    () => Boolean(formValues.phone.trim() && formValues.email.trim()),
    [formValues.email, formValues.phone],
  );
  const hasMissingClaimRequiredFields = useMemo(
    () => CLAIM_REQUIRED_FIELDS.some((fieldName) => !String(formValues[fieldName] || "").trim()),
    [
      formValues.clientAddressLine1,
      formValues.clientCity,
      formValues.clientCountry,
      formValues.clientFloor,
      formValues.clientPostalCode,
      formValues.email,
      formValues.gender,
      formValues.givenName,
      formValues.phone,
      formValues.surname,
    ],
  );
  const shouldShowClaimRequiredAlert =
    showClaimRequiredErrors
    && hasMissingClaimRequiredFields
    && !isClaimRequiredAlertDismissed;

  useEffect(() => {
    latestFormRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    if (!hasMissingClaimRequiredFields) {
      setIsClaimRequiredAlertDismissed(false);
    }
  }, [hasMissingClaimRequiredFields]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsTourOpen(true);
  }, []);

  function completeTour() {
    setIsTourOpen(false);
  }

  function startTour() {
    setIsTourOpen(true);
  }
  const normalizedContractNumber = normalizeServiceClaimContractNumber(formValues.contractNumber);
  const completedRegistrationContractNumber = normalizeServiceClaimContractNumber(
    completedRegistration?.contractNumber || normalizedContractNumber,
  );
  const completedRegistrationKitchenSlug = String(completedRegistration?.kitchenSlug || "").trim();
  const completedRegistrationOrderHref = completedRegistrationKitchenSlug
    ? `/kitchens/${encodeURIComponent(completedRegistrationKitchenSlug)}?contractNumber=${encodeURIComponent(completedRegistrationContractNumber)}`
    : "/";
  const isCurrentContractLookupResult = contractLookup.contractNumber === normalizedContractNumber;
  const shouldHideContractLookupFeedback = isContractNumberCurrentlyStuck;
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
    return collapseServiceClaimLinkedComponents(
      activeKitchenPlan.kitchenSlug,
      activeKitchenPlan.selectableComponents.filter((entry) => selectedIds.has(entry.componentId)),
    )
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
  const requiredSelectedSerialNumberCount = useMemo(
    () => countElectricalApplianceProblemAreas(selectedProblemAreas),
    [selectedProblemAreas],
  );
  const hasSelectedElectricalAppliances = requiredSelectedSerialNumberCount > 0;
  const applicableSerialNumberImages = hasSelectedElectricalAppliances ? serialNumberImages : [];
  const hasReachedRequiredSerialEvidenceCount =
    hasSelectedElectricalAppliances
    && serialNumberEntries.length + applicableSerialNumberImages.length >= requiredSelectedSerialNumberCount;
  const isPreferredContactCustomTime = isPreferredContactCustom(formValues.preferredContactTimeWindow);
  const selectedProblemAreasWithDetails = useMemo(() => {
    return selectedProblemAreas.map((area) => ({
      ...area,
      detail: problemAreaDetailsByComponentId[area.componentId] || "",
      attachments: problemAreaAttachmentsByComponentId[area.componentId] || [],
      attachmentFieldKey: problemAreaAttachmentFieldKeysByComponentId[area.componentId] || 0,
    }));
  }, [
    problemAreaAttachmentsByComponentId,
    problemAreaAttachmentFieldKeysByComponentId,
    problemAreaDetailsByComponentId,
    selectedProblemAreas,
  ]);
  const missingProblemAreaAttachmentIds = useMemo(
    () =>
      selectedProblemAreasWithDetails
        .filter((area) => !area.attachments.length)
        .map((area) => area.componentId),
    [selectedProblemAreasWithDetails],
  );
  const hasMissingProblemAreaAttachments = missingProblemAreaAttachmentIds.length > 0;
  useEffect(() => {
    if (!hasMissingProblemAreaAttachments) {
      setShowProblemAreaAttachmentErrors(false);
    }
  }, [hasMissingProblemAreaAttachments]);

  const problemAreaAttachmentCount = useMemo(
    () =>
      Object.values(problemAreaAttachmentsByComponentId).reduce(
        (sum, files) => sum + (Array.isArray(files) ? files.length : 0),
        0,
      ),
    [problemAreaAttachmentsByComponentId],
  );

  function isPreferredContactToTimeDisabled(nextValue) {
    if (!formValues.preferredContactTimeFrom) {
      return false;
    }
    return !getPreferredContactTimeCandidate({
      nextValue,
      minimumValue: formValues.preferredContactTimeFrom,
    });
  }

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

  function shouldShowClaimRequiredError(fieldName) {
    return showClaimRequiredErrors && !String(formValues[fieldName] || "").trim();
  }

  function getClaimRequiredErrorId(fieldName) {
    return `service-claim-${fieldName}-required`;
  }

  function handleClaimRequiredGroupBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsClaimRequiredAlertDismissed(false);
      setShowClaimRequiredErrors(true);
    }
  }

  function handleClaimFormInvalid(event) {
    if (event.target?.closest?.("[data-claim-required-group]")) {
      setIsClaimRequiredAlertDismissed(false);
      setShowClaimRequiredErrors(true);
    }
  }

  function focusFirstMissingClaimRequiredField() {
    setIsClaimRequiredAlertDismissed(false);
    setShowClaimRequiredErrors(true);
    window.requestAnimationFrame(() => {
      const firstMissingField = selectedServicePanelRef.current?.querySelector(
        '[data-claim-required-field][aria-invalid="true"]',
      );
      if (!firstMissingField) {
        return;
      }
      firstMissingField.scrollIntoView({ behavior: "smooth", block: "center" });
      firstMissingField.focus({ preventScroll: true });
    });
  }

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
      setIsContractNumberStickyEnabled(true);
      setIsContractNumberCurrentlyStuck(false);
      hasSeenClientAddressSectionRef.current = false;
      setIsClaimRequiredAlertDismissed(false);
      setShowClaimRequiredErrors(false);
    }
  }, [isComplaintMode]);

  useEffect(() => {
    if (!isComplaintMode) {
      return undefined;
    }

    const section = clientAddressSectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasSeenClientAddressSectionRef.current = true;
          return;
        }
        if (hasSeenClientAddressSectionRef.current && entry.boundingClientRect.top < 0) {
          setIsClaimRequiredAlertDismissed(false);
          setShowClaimRequiredErrors(true);
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [isComplaintMode]);

  useEffect(() => {
    if (!isComplaintMode || !isContractNumberStickyEnabled) {
      setIsContractNumberCurrentlyStuck(false);
      return undefined;
    }

    const stickyTopOffset = 12;
    const stickyEnterBuffer = 6;
    const stickyExitBuffer = 18;
    let frameId = null;

    function updateStickyState() {
      const sentinel = contractNumberStickySentinelRef.current;
      if (!sentinel) {
        setIsContractNumberCurrentlyStuck(false);
        return;
      }

      setIsContractNumberCurrentlyStuck((currentValue) =>
        getContractNumberStickyState({
          currentIsStuck: currentValue,
          sentinelTop: sentinel.getBoundingClientRect().top,
          stickyTopOffset,
          stickyEnterBuffer,
          stickyExitBuffer,
        }),
      );
    }

    function queueStickyStateUpdate() {
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateStickyState();
      });
    }

    updateStickyState();
    window.addEventListener("scroll", queueStickyStateUpdate, { passive: true });
    window.addEventListener("resize", queueStickyStateUpdate);
    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", queueStickyStateUpdate);
      window.removeEventListener("resize", queueStickyStateUpdate);
    };
  }, [isComplaintMode, isContractNumberStickyEnabled]);

  useEffect(() => {
    const selectedIds = new Set(selectedProblemAreas.map((area) => area.componentId));

    setProblemAreaDetailsByComponentId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([componentId]) => selectedIds.has(componentId)),
      ),
    );
    setProblemAreaAttachmentsByComponentId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([componentId]) => selectedIds.has(componentId)),
      ),
    );
    setProblemAreaAttachmentFieldKeysByComponentId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([componentId]) => selectedIds.has(componentId)),
      ),
    );
  }, [selectedProblemAreas]);

  useEffect(() => {
    if (!isComplaintMode) {
      closeClaimAssistant();
      setClaimAssistantQuestion("");
      setIsClaimAssistantLoading(false);
      setIsClaimAssistantListening(false);
      setClaimAssistantVoiceError("");
      setSelectedClaimAssistantContextKey("claim");
    }
  }, [isComplaintMode]);

  useEffect(() => {
    if (!isPreferredContactCalendarOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!preferredContactCalendarRef.current?.contains(event.target)) {
        setIsPreferredContactCalendarOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsPreferredContactCalendarOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPreferredContactCalendarOpen]);

  useEffect(() => {
    if (!isPreferredContactCalendarOpen) {
      return;
    }
    setPreferredContactCalendarMonth(startOfCalendarMonth(selectedPreferredContactDate || new Date()));
  }, [isPreferredContactCalendarOpen, selectedPreferredContactDate]);

  useEffect(() => {
    if (!openPreferredContactTimeField) {
      return undefined;
    }

    function handlePointerDown(event) {
      const activeRef =
        openPreferredContactTimeField === "from" ? preferredContactTimeFromRef.current : preferredContactTimeToRef.current;
      if (!activeRef?.contains(event.target)) {
        setOpenPreferredContactTimeField(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenPreferredContactTimeField(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openPreferredContactTimeField]);

  useEffect(() => {
    if (isClaimAssistantOpen) {
      return;
    }
    claimAssistantRecognitionRef.current?.abort?.();
    stopClaimAssistantSpeech();
    setIsClaimAssistantListening(false);
    setClaimAssistantVoiceError("");
  }, [isClaimAssistantOpen]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window === "undefined" ? null : window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsClaimAssistantVoiceSupported(Boolean(SpeechRecognition && window?.speechSynthesis));

    const stopClaimAssistantVoice = () => {
      claimAssistantRecognitionRef.current?.abort?.();
      stopClaimAssistantSpeech();
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
    setProblemAreaDetailsByComponentId({});
  }, [contractLookup.contractNumber]);

  useEffect(() => {
    if (!mode || mode === "registered-next" || !shouldScrollToSelectedPanelRef.current) {
      return undefined;
    }

    shouldScrollToSelectedPanelRef.current = false;
    const animationFrameId = window.requestAnimationFrame(() => {
      selectedServicePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  function scrollToSelectedServicePanel() {
    const animationFrameId = window.requestAnimationFrame(() => {
      selectedServicePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return animationFrameId;
  }

  function handleModeSelect(nextMode) {
    shouldScrollToSelectedPanelRef.current = true;
    setMode(nextMode);
    setError("");
    setSuccessMessage("");
    setPendingRegistration(null);
    setCompletedRegistration(null);

    if (mode === nextMode) {
      shouldScrollToSelectedPanelRef.current = false;
      scrollToSelectedServicePanel();
    }
  }

  function handleRegisteredClaimSelect() {
    setError("");
    setSuccessMessage("");
    setMode("complaint");
  }

  function handleHausmeisterInvolvedChange(nextValue) {
    setForm((current) => {
      if (nextValue === "no") {
        return {
          ...current,
          hausmeisterInvolved: "no",
          ...EMPTY_HAUSMEISTER_FIELDS,
        };
      }

      return {
        ...current,
        hausmeisterInvolved: "yes",
      };
    });

    if (error) {
      setError("");
    }
  }

  function handlePreferredContactCalendarToggle() {
    setIsPreferredContactCalendarOpen((current) => !current);
  }

  function handlePreferredContactCalendarSelect(date) {
    handleFieldChange("preferredContactDate", formatDateToShort(date));
    setPreferredContactCalendarMonth(startOfCalendarMonth(date));
    setIsPreferredContactCalendarOpen(false);
  }

  function handlePreferredContactCalendarClear() {
    handleFieldChange("preferredContactDate", "");
    setPreferredContactCalendarMonth(startOfCalendarMonth(new Date()));
    setIsPreferredContactCalendarOpen(false);
  }

  function handlePreferredContactCalendarToday() {
    const today = new Date();
    handlePreferredContactCalendarSelect(today);
  }

  function handlePreferredContactTimeToggle(field) {
    setOpenPreferredContactTimeField((current) => (current === field ? null : field));
  }

  function handlePreferredContactTimeSelect(field, nextValue) {
    const nextTime = getPreferredContactTimeCandidate({
      nextValue,
      minimumValue: field === "preferredContactTimeTo" ? formValues.preferredContactTimeFrom : "",
    });
    if (!nextTime) {
      return;
    }
    handleFieldChange(field, nextTime);
  }

  function handlePreferredContactTimeClear(field) {
    handleFieldChange(field, "");
    setOpenPreferredContactTimeField(null);
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
      if (
        field === "preferredContactTimeFrom"
        && next.preferredContactTimeTo
        && !isTimeAfter(next.preferredContactTimeTo, next.preferredContactTimeFrom)
      ) {
        next.preferredContactTimeTo = "";
      }
      return next;
    });

    if (field === "preferredContactTimeWindow" && value !== "custom") {
      setOpenPreferredContactTimeField(null);
    }

    if (field === "contractNumber") {
      const nextContractNumber = normalizeServiceClaimContractNumber(value);
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
              if (normalizeServiceClaimContractNumber(current.contractNumber) !== nextContractNumber) {
                return current;
              }

              return {
                ...current,
                ...mergeNonEmptyAutofillValues(
                  current,
                  buildServiceClaimAutofillFromContract(payload.contract),
                ),
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

  function handleProblemAreaDetailChange(componentId, value) {
    setProblemAreaDetailsByComponentId((current) => ({
      ...current,
      [componentId]: value,
    }));
    if (error) {
      setError("");
    }
  }

  function removeProblemArea(componentId) {
    const linkedComponentIds = new Set(
      getServiceClaimLinkedComponentIds(activeKitchenPlan?.kitchenSlug, componentId),
    );
    setProblemComponentIds((current) =>
      current.filter((currentComponentId) => !linkedComponentIds.has(currentComponentId)),
    );
  }

  function handleProblemAreaAttachmentsSelected(componentId, event) {
    const picked = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!picked.length) {
      return;
    }

    setError("");
    setProblemAreaAttachmentsByComponentId((current) => {
      const existingFiles = Array.isArray(current[componentId]) ? current[componentId] : [];
      const nextFiles = [...existingFiles];
      const otherProblemAreaFileCount = Object.entries(current).reduce((sum, [currentComponentId, files]) => {
        if (currentComponentId === componentId) {
          return sum;
        }
        return sum + (Array.isArray(files) ? files.length : 0);
      }, 0);
      const fixedAttachmentCount = attachments.length + applicableSerialNumberImages.length + otherProblemAreaFileCount;
      let message = "";

      for (const file of picked) {
        const currentCount = fixedAttachmentCount + nextFiles.length;
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
        nextFiles.push(file);
      }

      if (message) {
        queueMicrotask(() => setError(message));
      }

      return {
        ...current,
        [componentId]: nextFiles,
      };
    });
  }

  function handleAdditionalProblemDetailsChange(value) {
    handleFieldChange("problemDescription", value);
  }

  function appendSuggestedProblemDescription(value) {
    const nextSuggestion = String(value || "").trim();
    if (!nextSuggestion) {
      return;
    }

    setForm((current) => {
      const existingDescription = String(current.problemDescription || "").trim();
      if (!existingDescription) {
        return {
          ...current,
          problemDescription: nextSuggestion,
        };
      }

      const normalizedSuggestion = nextSuggestion.replace(/\s+/g, " ").trim().toLowerCase();
      const existingBlocks = existingDescription
        .split(/\n\s*\n+/)
        .map((block) => block.trim())
        .filter(Boolean);
      const hasSuggestionAlready = existingBlocks.some(
        (block) => block.replace(/\s+/g, " ").trim().toLowerCase() === normalizedSuggestion,
      );

      if (hasSuggestionAlready) {
        return current;
      }

      return {
        ...current,
        problemDescription: `${existingDescription}\n\n${nextSuggestion}`,
      };
    });

    if (error) {
      setError("");
    }
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
        const currentCount = next.length + applicableSerialNumberImages.length + problemAreaAttachmentCount;
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
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (!picked.length) {
      return;
    }

    setError("");
    setSerialNumberImages((prev) => {
      const next = [...prev];
      let message = "";
      for (const file of picked) {
        if (serialNumberEntries.length + next.length >= requiredSelectedSerialNumberCount) {
          message = t("serialNumberCountRequired").replace("{count}", String(requiredSelectedSerialNumberCount));
          break;
        }
        const currentCount = attachments.length + next.length + problemAreaAttachmentCount;
        if (currentCount >= MAX_CLAIM_ATTACHMENT_COUNT) {
          message = copy.attachmentsErrorTooMany;
          break;
        }
        if (file.size > MAX_CLAIM_ATTACHMENT_BYTES) {
          message = copy.attachmentsErrorFileTooLarge;
          continue;
        }
        if (!file.type?.toLowerCase().startsWith("image/") || !isClientAllowedAttachment(file)) {
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

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeProblemAreaAttachment(componentId, index) {
    setProblemAreaAttachmentsByComponentId((current) => {
      const nextFiles = (current[componentId] || []).filter((_, itemIndex) => itemIndex !== index);
      if (!nextFiles.length) {
        const next = { ...current };
        delete next[componentId];
        return next;
      }
      return {
        ...current,
        [componentId]: nextFiles,
      };
    });
    setProblemAreaAttachmentFieldKeysByComponentId((current) => ({
      ...current,
      [componentId]: (current[componentId] || 0) + 1,
    }));
    setError("");
  }

  function removeSerialNumberImage(index) {
    setSerialNumberImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setSerialNumberImageFieldKey((key) => key + 1);
    setError("");
  }

  function clearAttachments() {
    setAttachments([]);
    setAttachmentFieldKey((key) => key + 1);
    setError("");
  }

  function clearProblemAreaAttachments(componentId) {
    setProblemAreaAttachmentsByComponentId((current) => {
      if (!current[componentId]?.length) {
        return current;
      }
      const next = { ...current };
      delete next[componentId];
      return next;
    });
    setProblemAreaAttachmentFieldKeysByComponentId((current) => ({
      ...current,
      [componentId]: (current[componentId] || 0) + 1,
    }));
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
    if (serialNumberEntries.length + applicableSerialNumberImages.length >= requiredSelectedSerialNumberCount) {
      setError(t("serialNumberCountRequired").replace("{count}", String(requiredSelectedSerialNumberCount)));
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

  function buildSubmittedProblemDescription(formState = formValues) {
    const userDescription = String(formState.problemDescription || "").trim();
    const selectedAreasBlock = selectedProblemAreasWithDetails.length
      ? [
          kitchenAreasLinePrefix,
          ...selectedProblemAreasWithDetails.map(
            (area) => `${area.label}: ${String(area.detail || "").trim()}`,
          ),
        ].join("\n")
      : "";
    const description = [selectedAreasBlock, userDescription].filter(Boolean).join("\n\n").trim();
    const preferredContact = buildPreferredContactSummary();
    if (!preferredContact) {
      return description;
    }
    if (/^Erreichbarkeit\s*:/im.test(description)) {
      return description;
    }
    return `${description}\n\nErreichbarkeit: ${preferredContact}`.trim();
  }

  function buildProblemAreasPayload() {
    return selectedProblemAreasWithDetails.map((area) => ({
      componentId: area.componentId,
      code: area.code,
      name: area.name,
      detail: String(area.detail || "").trim(),
    }));
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
      abortControllerRef: claimAssistantTtsAbortControllerRef,
      language: getClaimAssistantSpeechLanguage(),
      fallbackRate: 1.03,
      ttsSpeed: 1.03,
    });
  }

  function stopClaimAssistantSpeech() {
    stopAssistantSpeech(claimAssistantAudioRef, claimAssistantTtsAbortControllerRef);
  }

  function closeClaimAssistant() {
    claimAssistantRecognitionRef.current?.abort?.();
    stopClaimAssistantSpeech();
    setIsClaimAssistantListening(false);
    setIsClaimAssistantOpen(false);
  }

  async function submitClaimAssistantQuestion(rawQuestion, options = {}) {
    const question = String(rawQuestion || "").trim();
    if (!question || isClaimAssistantLoading) {
      return;
    }

    const latestFormValues = latestFormRef.current || formValues;
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
            problemDescription: buildSubmittedProblemDescription(latestFormValues),
            serialNumber: String(latestFormValues.serialNumber || "").trim(),
            hasSerialNumberImage: applicableSerialNumberImages.length > 0,
            attachmentCount: attachments.length + applicableSerialNumberImages.length + problemAreaAttachmentCount,
            preferredContactDate: String(latestFormValues.preferredContactDate || "").trim(),
            preferredContactTimeWindow: String(latestFormValues.preferredContactTimeWindow || "").trim(),
            preferredContactTimeFrom: String(latestFormValues.preferredContactTimeFrom || "").trim(),
            preferredContactTimeTo: String(latestFormValues.preferredContactTimeTo || "").trim(),
            availabilityDate: String(latestFormValues.preferredContactDate || "").trim(),
            availabilityTime: buildPreferredContactSummary(),
            hasPhone: Boolean(String(latestFormValues.phone || "").trim()),
            hasEmail: Boolean(String(latestFormValues.email || "").trim()),
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

      const suggestedProblemDescription = String(payload.suggestedProblemDescription || "").trim();
      const assistantActions = Array.isArray(payload.actions) ? payload.actions : [];
      if (suggestedProblemDescription && !assistantActions.length) {
        appendSuggestedProblemDescription(suggestedProblemDescription);
      }

      setClaimAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.answer || t("claimAssistantErrorUnavailable"),
          ...(assistantActions.length ? { actions: assistantActions } : {}),
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
    await submitClaimAssistantQuestion(question);
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

    stopClaimAssistantSpeech();
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

    if (!hasRequiredContactFields) {
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
      if (convertTimeToMinutes(preferredContactTimeTo) <= convertTimeToMinutes(preferredContactTimeFrom)) {
        setError(t("preferredContactTimeCustomOrder"));
        return;
      }
    }

    if (hasMissingProblemAreaAttachments) {
      setShowProblemAreaAttachmentErrors(true);
      setError(t("problemAreaAttachmentRequired"));
      window.requestAnimationFrame(() => {
        const firstMissingUpload = selectedServicePanelRef.current?.querySelector(
          '[data-problem-area-upload-required="true"]',
        );
        firstMissingUpload?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstMissingUpload?.focus?.({ preventScroll: true });
      });
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      const normalizedSerialNumbers = hasSelectedElectricalAppliances
        ? normalizeSerialNumberList(
            [formValues.serialNumber, serialNumberDraft].filter(Boolean).join("\n"),
          )
        : "";
      const submittedSerialNumberCount = parseSerialNumberList(normalizedSerialNumbers).length;
      const submittedSerialEvidenceCount = submittedSerialNumberCount + applicableSerialNumberImages.length;
      if (submittedSerialEvidenceCount !== requiredSelectedSerialNumberCount) {
        setError(t("serialNumberCountRequired").replace("{count}", String(requiredSelectedSerialNumberCount)));
        setIsSubmitting(false);
        return;
      }
      const includeHausmeister = formValues.hausmeisterInvolved === "yes";
      const payload = {
        ...form,
        contractNumber: normalizedContractNumber,
        clientAddress: buildClientAddress(),
        clientCountry: formValues.clientCountry.trim(),
        clientCity: formValues.clientCity.trim(),
        clientPostalCode: formValues.clientPostalCode.trim(),
        problemDescription: buildSubmittedProblemDescription(),
        serialNumber: normalizedSerialNumbers,
        hasSerialNumberImage: applicableSerialNumberImages.length > 0 ? "true" : "false",
        language,
        ...(includeHausmeister ? {} : EMPTY_HAUSMEISTER_FIELDS),
      };
      for (const [key, value] of Object.entries(payload)) {
        if (key === "hausmeisterInvolved") {
          continue;
        }
        formData.append(key, value == null ? "" : String(value));
      }
      const plan =
        contractLookup.status === "found" && contractLookup.contractNumber === normalizedContractNumber
          ? contractLookup.kitchenPlan
          : null;
      if (plan?.selectableComponents?.length) {
        const metaById = new Map(plan.selectableComponents.map((entry) => [entry.componentId, entry]));
        const problemAreas = buildProblemAreasPayload()
          .map((area) => ({
            ...metaById.get(area.componentId),
            detail: area.detail,
          }))
          .filter(Boolean);
        formData.append("problemAreasJson", JSON.stringify(problemAreas));
      } else {
        formData.append("problemAreasJson", "[]");
      }
      if (hasSelectedElectricalAppliances) {
        for (const file of serialNumberImages) {
          formData.append("serialNumberImages", file);
        }
      }
      for (const file of attachments) {
        formData.append("generalAttachments", file);
      }
      for (const area of selectedProblemAreasWithDetails) {
        for (const file of area.attachments) {
          formData.append(`problemAreaAttachment:${area.componentId}`, file);
        }
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
      setShowClaimRequiredErrors(false);
      setIsClaimRequiredAlertDismissed(false);
      setShowProblemAreaAttachmentErrors(false);
      setForm(INITIAL_FORM);
      setSerialNumberDraft("");
      setAttachments([]);
      setSerialNumberImages([]);
      setProblemComponentIds([]);
      setProblemAreaDetailsByComponentId({});
      setProblemAreaAttachmentsByComponentId({});
      setProblemAreaAttachmentFieldKeysByComponentId({});
      setAttachmentFieldKey((key) => key + 1);
      setSerialNumberImageFieldKey((key) => key + 1);
      setContractLookup(EMPTY_CONTRACT_LOOKUP);
    } catch (submitError) {
      setError(submitError.message || copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegistrationSubmit(event) {
    event.preventDefault();

    if (pendingRegistration?.id) {
      await handleRegistrationVerificationSubmit();
      return;
    }

    if (
      contractLookup.status === "missing"
      && contractLookup.contractNumber === normalizedContractNumber
    ) {
      setError(contractLookup.message || t("contractLookupError"));
      return;
    }

    const givenName = String(formValues.registrationGivenName || "").trim();
    const surname = String(formValues.registrationSurname || "").trim();
    const fullName = [givenName, surname].filter(Boolean).join(" ");
    const email = String(formValues.registrationEmail || "").trim();
    const phone = String(formValues.registrationPhone || "").trim();
    const verificationPostalCode = String(formValues.registrationVerificationPostalCode || "").trim();
    const verificationUnit = String(formValues.registrationVerificationUnit || "").trim();

    if (!normalizedContractNumber) {
      setError(t("contractLookupError"));
      return;
    }
    if (!givenName || !surname) {
      setError(t("registerFullNameRequired"));
      return;
    }
    if (!verificationPostalCode || !verificationUnit) {
      setError(t("registerVerificationRequired"));
      return;
    }
    if (!email) {
      setError(t("registerEmailRequired"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/kitchen-registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractNumber: normalizedContractNumber,
          fullName,
          email,
          phone,
          verificationPostalCode,
          verificationAddress: verificationUnit,
        }),
      });
      const payloadResponse = await response.json();

      if (!response.ok) {
        throw new Error(payloadResponse.error || t("registerError"));
      }

      setPendingRegistration({
        id: payloadResponse.registration?.id,
        contractNumber: normalizedContractNumber,
        kitchenName: payloadResponse.registration?.kitchenName || "",
        kitchenSlug: payloadResponse.registration?.kitchenSlug || "",
        fullName,
        email,
        phone,
      });
      setSuccessMessage(payloadResponse.message || t("registerSuccess"));
    } catch (submitError) {
      setError(submitError.message || t("registerError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegistrationVerificationSubmit() {
    const code = String(formValues.registrationVerificationCode || "").trim();
    if (!code) {
      setError(t("registerCodeRequired"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/kitchen-registrations/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationId: pendingRegistration.id,
          code,
        }),
      });
      const payloadResponse = await response.json();

      if (!response.ok) {
        throw new Error(payloadResponse.error || t("registerError"));
      }

      const fullName = pendingRegistration.fullName || "";
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const verifiedRegistration = payloadResponse.registration || {};
      setSuccessMessage(t("registerSuccess"));
      setForm((current) => ({
        ...current,
        contractNumber: current.contractNumber || pendingRegistration.contractNumber || verifiedRegistration.contractNumber || "",
        givenName: current.givenName || nameParts[0] || "",
        surname: current.surname || nameParts.slice(1).join(" ") || "",
        email: current.email || pendingRegistration.email || "",
        phone: current.phone || pendingRegistration.phone || "",
        registrationGivenName: "",
        registrationSurname: "",
        registrationEmail: "",
        registrationPhone: "",
        registrationVerificationPostalCode: "",
        registrationVerificationUnit: "",
        registrationVerificationCode: "",
      }));
      setCompletedRegistration({
        id: verifiedRegistration.id || pendingRegistration.id,
        contractNumber: verifiedRegistration.contractNumber || pendingRegistration.contractNumber || normalizedContractNumber,
        kitchenName: verifiedRegistration.kitchenName || pendingRegistration.kitchenName || "",
        kitchenSlug: verifiedRegistration.kitchenSlug || pendingRegistration.kitchenSlug || "",
        fullName: verifiedRegistration.fullName || pendingRegistration.fullName || "",
        email: verifiedRegistration.email || pendingRegistration.email || "",
        phone: verifiedRegistration.phone || pendingRegistration.phone || "",
      });
      setPendingRegistration(null);
      setMode("registered-next");
    } catch (submitError) {
      setError(submitError.message || t("registerError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const languageSwitcher = (
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
  );

  return (
    <>
      <main className="service-page">
      {!isRegisteredNextMode ? (
      <section className="service-hero">
        {languageSwitcher}

        <div className="service-hero__top">
          <div className="service-hero__content">
            <div className="service-hero__brand">
              <Image src="/img/LOGO_1.png" alt="Architecto" width={220} height={72} className="service-hero__logo" />
              <span className="service-hero__brand-note">{"by K\u00fcchen Aktuell"}</span>
            </div>
            <h1>{copy.title}</h1>
          </div>

          <div className="service-hero__mascot">
            <Image
              src="/img/Untitled%20design%20(4).png"
              alt=""
              width={220}
              height={312}
              className="service-hero__mascot-image"
            />
            {!isTourOpen ? (
              <button
                type="button"
                className="service-tour-start service-tour-start--mascot"
                onClick={startTour}
                aria-label={t("tourStartAria")}
              >
                <span className="service-tour-start__icon" aria-hidden="true">&#9658;</span>
                <span>{t("tourStart")}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="service-choice-grid">
          <button
            type="button"
            className={[
              "service-choice-card service-choice-card--purchase",
              mode === "nachkauf" ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleModeSelect("nachkauf")}
          >
            <span className="service-choice-card__logo-slot">
              <Image
                src="/img/fragmentologo-cropped.png"
                alt="Fragmento"
                width={168}
                height={54}
                className="service-choice-card__logo"
              />
            </span>
            <strong>{copy.purchaseTitle}</strong>
            <p>{copy.purchaseText}</p>
            <span className="service-choice-card__cta">{copy.purchaseCta || copy.openConfigurator}</span>
          </button>
          <button
            type="button"
            className={[
              "service-choice-card service-choice-card--complaint",
              isComplaintMode ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleModeSelect("complaint")}
          >
            <span className="service-choice-card__logo-slot">
              <Image
                src="/img/260513-asc-logo-03 copy.png"
                alt="Architecto Service Center"
                width={168}
                height={54}
                className="service-choice-card__logo service-choice-card__logo--complaint"
              />
            </span>
            
            <strong>{copy.complaintTitle}</strong>
            <p>{copy.complaintText}</p>
            <span className="service-choice-card__cta">{copy.complaintCta || copy.complaintTitle}</span>
          </button>
          <button
            type="button"
            className={[
              "service-choice-card service-choice-card--register",
              isRegisterMode ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleModeSelect("register")}
          >
            <span className="service-choice-card__logo-slot service-choice-card__logo-slot--empty" aria-hidden="true" />
            <strong>{copy.registerTitle}</strong>
            <p>{copy.registerText}</p>
            <span className="service-choice-card__cta">{copy.registerCta || copy.registerTitle}</span>
          </button>
        </div>
      </section>
      ) : null}

      {mode === "nachkauf" ? (
        <section ref={selectedServicePanelRef} className="service-panel">
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

      {isRegisteredNextMode ? (
        <section className="service-panel service-panel--registered-next">
          {languageSwitcher}

          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.registerBrand}</p>
            <h2>{t("registeredNextTitle")}</h2>
            <p>{t("registeredNextText")}</p>
          </div>

          <p className="service-form__success">{t("registeredNextSuccess")}</p>

          <div className="service-next-choice-grid">
            <Link
              href={completedRegistrationOrderHref}
              className="service-next-choice service-next-choice--order"
            >
              <span className="service-next-choice__label">{t("registeredNextOrderLabel")}</span>
              <strong>{t("registeredNextOrderTitle")}</strong>
              <p>{t("registeredNextOrderText")}</p>
              <span className="service-button service-button--primary service-next-choice__button">
                {t("registeredNextOrderCta")}
              </span>
            </Link>
            <button
              type="button"
              className="service-next-choice service-next-choice--claim"
              onClick={handleRegisteredClaimSelect}
            >
              <span className="service-next-choice__label">{t("registeredNextClaimLabel")}</span>
              <strong>{t("registeredNextClaimTitle")}</strong>
              <p>{t("registeredNextClaimText")}</p>
              <span className="service-button service-button--secondary service-next-choice__button">
                {t("registeredNextClaimCta")}
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {isRegisterMode ? (
        <section ref={selectedServicePanelRef} className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.registerBrand}</p>
            <h2>{copy.registerPanelTitle}</h2>
            <p>{copy.registerPanelText}</p>
          </div>

          <form className="service-form service-form--registration" onSubmit={handleRegistrationSubmit}>
            <label className="service-field">
              <span className="service-field__label-row service-field__label-row--contract">
                <span className="service-field__label-main">
                  {copy.contractNumber}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <button
                  type="button"
                  className="service-field__help-badge"
                  onClick={() => setIsContractNumberHelpOpen(true)}
                  aria-label={copy.contractNumberHelpAria}
                  aria-haspopup="dialog"
                  aria-controls="service-contract-help-title"
                >
                  ?
                </button>
              </span>
              <input
                name="registrationContractNumber"
                value={formValues.contractNumber}
                onChange={(event) => handleFieldChange("contractNumber", event.target.value)}
                placeholder={copy.contractPlaceholder}
                required
              />
            </label>
            {contractLookup.status === "loading" ? (
              <p className="service-form__hint service-form__hint--contract-status">
                {t("contractLookupLoading")}
              </p>
            ) : null}
            {contractLookup.status === "found" && isCurrentContractLookupResult ? (
              <p className="service-form__success service-form__success--contract-status">
                {t("contractLookupSuccess")}
              </p>
            ) : null}
            {contractLookup.status === "missing" && isCurrentContractLookupResult ? (
              <p className="service-form__error service-form__error--contract-status">
                {contractLookup.message || t("contractLookupError")}
              </p>
            ) : null}

            <div className="service-field-grid service-field-grid--phone-email">
              <label className="service-field">
                <span>
                  {copy.givenName}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  name="registrationGivenName"
                  value={formValues.registrationGivenName}
                  onChange={(event) => handleFieldChange("registrationGivenName", event.target.value)}
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
                  name="registrationSurname"
                  value={formValues.registrationSurname}
                  onChange={(event) => handleFieldChange("registrationSurname", event.target.value)}
                  placeholder={copy.surnamePlaceholder}
                  required
                />
              </label>
            </div>

            <div className="service-field-grid service-field-grid--phone-email">
              <label className="service-field">
                <span>{copy.phone}</span>
                <input
                  name="registrationPhone"
                  type="tel"
                  value={formValues.registrationPhone}
                  onChange={(event) => handleFieldChange("registrationPhone", event.target.value)}
                  placeholder={copy.phonePlaceholder}
                />
              </label>
              <label className="service-field">
                <span>
                  {copy.email}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  name="registrationEmail"
                  type="email"
                  value={formValues.registrationEmail}
                  onChange={(event) => handleFieldChange("registrationEmail", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  required
                />
              </label>
            </div>

            <div className="service-field-grid service-field-grid--phone-email">
              <label className="service-field">
                <span>
                  {copy.registerVerificationPostalCode}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  name="registrationVerificationPostalCode"
                  value={formValues.registrationVerificationPostalCode}
                  onChange={(event) => handleFieldChange("registrationVerificationPostalCode", event.target.value)}
                  placeholder={copy.registerVerificationPostalCodePlaceholder}
                  required
                />
              </label>
              <label className="service-field">
                <span>
                  {copy.registerVerificationUnit}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  name="registrationVerificationUnit"
                  value={formValues.registrationVerificationUnit}
                  onChange={(event) => handleFieldChange("registrationVerificationUnit", event.target.value)}
                  placeholder={copy.registerVerificationUnitPlaceholder}
                  required
                />
              </label>
            </div>

            {pendingRegistration?.id ? (
              <label className="service-field">
                <span>
                  {copy.registerCode}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  name="registrationVerificationCode"
                  value={formValues.registrationVerificationCode}
                  onChange={(event) => handleFieldChange("registrationVerificationCode", event.target.value)}
                  placeholder={copy.registerCodePlaceholder}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </label>
            ) : null}

            {error ? <p className="service-form__error">{error}</p> : null}
            {successMessage ? <p className="service-form__success">{successMessage}</p> : null}

            <div className="service-form__actions">
              <button
                type="button"
                className="service-button service-button--secondary"
                onClick={() => {
                  setPendingRegistration(null);
                  setMode("");
                }}
              >
                {copy.back}
              </button>
              <button type="submit" className="service-button service-button--primary" disabled={isSubmitting}>
                {pendingRegistration?.id
                  ? (isSubmitting ? t("registerVerifySubmitting") : t("registerVerifySubmit"))
                  : (isSubmitting ? t("registerSubmitting") : t("registerSubmit"))}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {isComplaintMode ? (
        <section ref={selectedServicePanelRef} className="service-panel">
          <div className="service-panel__header">
            <p className="service-panel__eyebrow">{copy.complaintBrand}</p>
            <h2>{copy.formTitle}</h2>
            <p>{copy.formIntro}</p>
          </div>

          <form className="service-form" onSubmit={handleSubmit} onInvalidCapture={handleClaimFormInvalid}>
            <div
              ref={contractNumberStickySentinelRef}
              className="service-field__sticky-sentinel"
              aria-hidden="true"
            />
            <div
              className={[
                "service-field",
                "service-field--contract-number",
                isContractNumberCurrentlyStuck ? "service-field--contract-number-stuck" : "",
                !isContractNumberStickyEnabled ? "service-field--contract-number-static" : "",
              ].filter(Boolean).join(" ")}
            >
              {isContractNumberStickyEnabled && isContractNumberCurrentlyStuck ? (
                <button
                  type="button"
                  className="service-field__sticky-dismiss"
                  aria-label={t("stickyContractDismissAria")}
                  onClick={() => setIsContractNumberStickyEnabled(false)}
                >
                  &times;
                </button>
              ) : null}
              <label
                htmlFor="service-claim-contract-number"
                className="service-field__label-row service-field__label-row--contract"
              >
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
              </label>
              <input
                id="service-claim-contract-number"
                type="text"
                value={formValues.contractNumber}
                onChange={(event) => handleFieldChange("contractNumber", event.target.value)}
                placeholder={copy.contractPlaceholder}
                required
              />
            </div>
            {contractLookup.status === "loading" ? (
              <p
                className={[
                  "service-form__hint",
                  shouldHideContractLookupFeedback ? "service-form__feedback--hidden" : "",
                ].filter(Boolean).join(" ")}
                aria-hidden={shouldHideContractLookupFeedback ? "true" : undefined}
              >
                {t("contractLookupLoading")}
              </p>
            ) : null}
            {contractLookup.status === "found" && isCurrentContractLookupResult ? (
              <p
                className={[
                  "service-form__success",
                  shouldHideContractLookupFeedback ? "service-form__feedback--hidden" : "",
                ].filter(Boolean).join(" ")}
                aria-hidden={shouldHideContractLookupFeedback ? "true" : undefined}
              >
                {t("contractLookupSuccess")}
              </p>
            ) : null}
            {contractLookup.status === "missing" && isCurrentContractLookupResult ? (
              <p
                className={[
                  "service-form__error",
                  shouldHideContractLookupFeedback ? "service-form__feedback--hidden" : "",
                ].filter(Boolean).join(" ")}
                aria-hidden={shouldHideContractLookupFeedback ? "true" : undefined}
              >
                {contractLookup.message || t("contractLookupError")}
              </p>
            ) : null}

            <div
              className="service-field-grid service-field-grid--3"
              data-claim-required-group
              onBlur={handleClaimRequiredGroupBlur}
            >
              <label className="service-field">
                <span>
                  {copy.gender}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <AdminSelect
                  name="gender"
                  value={formValues.gender}
                  onChange={(event) => handleFieldChange("gender", event.target.value)}
                  placeholder={copy.genderPlaceholder}
                  aria-label={copy.gender}
                  className="service-select service-select--gender"
                  data-claim-required-field
                  aria-invalid={shouldShowClaimRequiredError("gender")}
                  aria-describedby={
                    shouldShowClaimRequiredError("gender") ? getClaimRequiredErrorId("gender") : undefined
                  }
                  required
                >
                  <option value="">{copy.genderPlaceholder}</option>
                  <option value="male">{copy.salutationMr}</option>
                  {language === "en" ? <option value="ms">{copy.salutationMs}</option> : null}
                  <option value="female">{copy.salutationMrs}</option>
                  <option value="prefer_not_to_say">{copy.genderPreferNot}</option>
                </AdminSelect>
                {shouldShowClaimRequiredError("gender") ? (
                  <span id={getClaimRequiredErrorId("gender")} className="service-field__error" role="alert">
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
              </label>

              <label className="service-field">
                <span>
                  {copy.givenName}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="text"
                  data-claim-required-field
                  value={formValues.givenName}
                  onChange={(event) => handleFieldChange("givenName", event.target.value)}
                  placeholder={copy.givenNamePlaceholder}
                  aria-invalid={shouldShowClaimRequiredError("givenName")}
                  aria-describedby={
                    shouldShowClaimRequiredError("givenName") ? getClaimRequiredErrorId("givenName") : undefined
                  }
                  required
                />
                {shouldShowClaimRequiredError("givenName") ? (
                  <span id={getClaimRequiredErrorId("givenName")} className="service-field__error" role="alert">
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
              </label>

              <label className="service-field">
                <span>
                  {copy.surname}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="text"
                  data-claim-required-field
                  value={formValues.surname}
                  onChange={(event) => handleFieldChange("surname", event.target.value)}
                  placeholder={copy.surnamePlaceholder}
                  aria-invalid={shouldShowClaimRequiredError("surname")}
                  aria-describedby={
                    shouldShowClaimRequiredError("surname") ? getClaimRequiredErrorId("surname") : undefined
                  }
                  required
                />
                {shouldShowClaimRequiredError("surname") ? (
                  <span id={getClaimRequiredErrorId("surname")} className="service-field__error" role="alert">
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
              </label>
            </div>

            <div
              className="service-field-grid service-field-grid--claim-serial-row"
              data-claim-required-group
              onBlur={handleClaimRequiredGroupBlur}
            >
              <label className="service-field">
                <span>
                  {copy.phone}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="tel"
                  data-claim-required-field
                  value={formValues.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder={copy.phonePlaceholder}
                  aria-invalid={shouldShowClaimRequiredError("phone")}
                  aria-describedby={
                    shouldShowClaimRequiredError("phone") ? getClaimRequiredErrorId("phone") : undefined
                  }
                  required
                />
                {shouldShowClaimRequiredError("phone") ? (
                  <span id={getClaimRequiredErrorId("phone")} className="service-field__error" role="alert">
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
              </label>

              <label className="service-field">
                <span>
                  {copy.email}
                  <RequiredFieldMark title={requiredFieldTitle} />
                </span>
                <input
                  type="email"
                  data-claim-required-field
                  value={formValues.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  placeholder={copy.emailPlaceholder}
                  aria-invalid={shouldShowClaimRequiredError("email")}
                  aria-describedby={
                    shouldShowClaimRequiredError("email") ? getClaimRequiredErrorId("email") : undefined
                  }
                  required
                />
                {shouldShowClaimRequiredError("email") ? (
                  <span id={getClaimRequiredErrorId("email")} className="service-field__error" role="alert">
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
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
              <div
                className={`service-field-grid service-field-grid--preferred-contact${
                  isPreferredContactCustomTime ? " service-field-grid--preferred-contact-custom-active" : ""
                }`}
              >
                <label className="service-field service-field--preferred-date">
                  <span>{t("preferredContactDate")}</span>
                  <div
                    ref={preferredContactCalendarRef}
                    className={`service-field__date-picker${isPreferredContactCalendarOpen ? " is-open" : ""}`}
                  >
                    <input
                      type="text"
                      value={formValues.preferredContactDate}
                      onChange={(event) => handleFieldChange("preferredContactDate", event.target.value)}
                      placeholder="dd/mm/yy"
                      inputMode="numeric"
                      maxLength={8}
                      onFocus={() => setIsPreferredContactCalendarOpen(true)}
                    />
                    <button
                      type="button"
                      className="service-field__date-picker-button"
                      aria-label={t("preferredContactDate")}
                      aria-expanded={isPreferredContactCalendarOpen}
                      aria-haspopup="dialog"
                      onClick={handlePreferredContactCalendarToggle}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M7 2v3M17 2v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z" />
                      </svg>
                    </button>
                    {isPreferredContactCalendarOpen ? (
                      <div className="service-field__calendar" role="dialog" aria-label={t("preferredContactDate")}>
                        <div className="service-field__calendar-header">
                          <button
                            type="button"
                            className="service-field__calendar-nav"
                            aria-label={copy.preferredContactCalendarPrevMonth || "Previous month"}
                            onClick={() => setPreferredContactCalendarMonth((current) => addMonths(current, -1))}
                          >
                            &#8249;
                          </button>
                          <span className="service-field__calendar-title">{preferredContactCalendarMonthLabel}</span>
                          <button
                            type="button"
                            className="service-field__calendar-nav"
                            aria-label={copy.preferredContactCalendarNextMonth || "Next month"}
                            onClick={() => setPreferredContactCalendarMonth((current) => addMonths(current, 1))}
                          >
                            &#8250;
                          </button>
                        </div>
                        <div className="service-field__calendar-weekdays" aria-hidden="true">
                          {preferredContactWeekdayLabels.map((label, index) => (
                            <span key={`${label}-${index}`}>{label}</span>
                          ))}
                        </div>
                        <div className="service-field__calendar-grid">
                          {preferredContactCalendarDays.map((entry) => {
                            const today = new Date();
                            const isToday = isSameCalendarDay(entry.date, today);
                            const isSelected = isSameCalendarDay(entry.date, selectedPreferredContactDate);
                            const isPast = isBeforeCalendarDay(entry.date, today);
                            return (
                              <button
                                key={entry.key}
                                type="button"
                                disabled={isPast}
                                className={[
                                  "service-field__calendar-day",
                                  entry.isCurrentMonth ? "" : "is-outside-month",
                                  isToday ? "is-today" : "",
                                  isSelected ? "is-selected" : "",
                                  isPast ? "is-disabled" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onClick={() => handlePreferredContactCalendarSelect(entry.date)}
                              >
                                {entry.date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                        <div className="service-field__calendar-actions">
                          <button
                            type="button"
                            className="service-field__calendar-action service-field__calendar-action--secondary"
                            onClick={handlePreferredContactCalendarClear}
                          >
                            {copy.preferredContactCalendarClear || "Clear"}
                          </button>
                          <button
                            type="button"
                            className="service-field__calendar-action"
                            onClick={handlePreferredContactCalendarToday}
                          >
                            {copy.preferredContactCalendarToday || "Today"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </label>
                <label className="service-field service-field--preferred-time-window">
                  <span>{t("preferredContactTimeWindow")}</span>
                  <AdminSelect
                    name="preferredContactTimeWindow"
                    value={formValues.preferredContactTimeWindow}
                    onChange={(event) => handleFieldChange("preferredContactTimeWindow", event.target.value)}
                    placeholder={t("preferredContactTimeWindowPlaceholder")}
                    aria-label={t("preferredContactTimeWindow")}
                    className="service-select service-select--preferred-time-window"
                  >
                    <option value="">{t("preferredContactTimeWindowPlaceholder")}</option>
                    <option value="morning">{t("preferredContactTimeWindowMorning")}</option>
                    <option value="afternoon">{t("preferredContactTimeWindowAfternoon")}</option>
                    <option value="evening">{t("preferredContactTimeWindowEvening")}</option>
                    <option value="custom">{t("preferredContactTimeWindowCustom")}</option>
                  </AdminSelect>
                </label>
                {isPreferredContactCustomTime ? (
                  <>
                    <label className="service-field service-field--preferred-time">
                      <span>{t("preferredContactTimeFrom")}</span>
                      <div
                        ref={preferredContactTimeFromRef}
                        className={`service-field__time-picker${openPreferredContactTimeField === "from" ? " is-open" : ""}`}
                      >
                        <input
                          type="text"
                          value={formValues.preferredContactTimeFrom}
                          onFocus={() => setOpenPreferredContactTimeField("from")}
                          placeholder={copy.preferredContactTimePickerPlaceholder || "hh:mm"}
                          readOnly
                          required
                        />
                        <button
                          type="button"
                          className="service-field__date-picker-button"
                          aria-label={t("preferredContactTimeFrom")}
                          aria-expanded={openPreferredContactTimeField === "from"}
                          aria-haspopup="listbox"
                          onClick={() => handlePreferredContactTimeToggle("from")}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                          </svg>
                        </button>
                        {openPreferredContactTimeField === "from" ? (
                          <div className="service-field__time-menu" role="listbox" aria-label={t("preferredContactTimeFrom")}>
                            <div className="service-field__time-columns">
                              <div className="service-field__time-column">
                                <span className="service-field__time-column-label">Time</span>
                                <div className="service-field__time-options">
                                  {PREFERRED_CONTACT_TIME_OPTIONS.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      className={`service-field__time-option${
                                        preferredContactTimeFromParts.time === option ? " is-selected" : ""
                                      }`}
                                      onClick={() => handlePreferredContactTimeSelect("preferredContactTimeFrom", option)}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="service-field__time-actions">
                              <button
                                type="button"
                                className="service-field__calendar-action service-field__calendar-action--secondary"
                                onClick={() => handlePreferredContactTimeClear("preferredContactTimeFrom")}
                              >
                                {copy.preferredContactTimePickerClear || "Clear"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </label>
                    <label className="service-field service-field--preferred-time">
                      <span>{t("preferredContactTimeTo")}</span>
                      <div
                        ref={preferredContactTimeToRef}
                        className={`service-field__time-picker${openPreferredContactTimeField === "to" ? " is-open" : ""}`}
                      >
                        <input
                          type="text"
                          value={formValues.preferredContactTimeTo}
                          onFocus={() => setOpenPreferredContactTimeField("to")}
                          placeholder={copy.preferredContactTimePickerPlaceholder || "hh:mm"}
                          readOnly
                          required
                        />
                        <button
                          type="button"
                          className="service-field__date-picker-button"
                          aria-label={t("preferredContactTimeTo")}
                          aria-expanded={openPreferredContactTimeField === "to"}
                          aria-haspopup="listbox"
                          onClick={() => handlePreferredContactTimeToggle("to")}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                          </svg>
                        </button>
                        {openPreferredContactTimeField === "to" ? (
                          <div className="service-field__time-menu" role="listbox" aria-label={t("preferredContactTimeTo")}>
                            <div className="service-field__time-columns">
                              <div className="service-field__time-column">
                                <span className="service-field__time-column-label">Time</span>
                                <div className="service-field__time-options">
                                  {PREFERRED_CONTACT_TIME_OPTIONS.map((option) => {
                                    const isDisabled = isPreferredContactToTimeDisabled(option);
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        className={`service-field__time-option${
                                          preferredContactTimeToParts.time === option ? " is-selected" : ""
                                        }`}
                                        disabled={isDisabled}
                                        aria-disabled={isDisabled}
                                        onClick={() => handlePreferredContactTimeSelect("preferredContactTimeTo", option)}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="service-field__time-actions">
                              <button
                                type="button"
                                className="service-field__calendar-action service-field__calendar-action--secondary"
                                onClick={() => handlePreferredContactTimeClear("preferredContactTimeTo")}
                              >
                                {copy.preferredContactTimePickerClear || "Clear"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </label>
                  </>
                ) : null}
              </div>
            </section>

            <section
              ref={clientAddressSectionRef}
              className="service-form__section"
              data-claim-required-group
              onBlur={handleClaimRequiredGroupBlur}
            >
              <p className="service-form__section-title">{copy.clientAddress}</p>
              <div className="service-field-grid service-field-grid--client-location">
                <label className="service-field">
                  <span>
                    {copy.clientCountry}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    data-claim-required-field
                    value={formValues.clientCountry}
                    onChange={(event) => handleFieldChange("clientCountry", event.target.value)}
                    placeholder={copy.clientCountryPlaceholder}
                    aria-invalid={shouldShowClaimRequiredError("clientCountry")}
                    aria-describedby={
                      shouldShowClaimRequiredError("clientCountry")
                        ? getClaimRequiredErrorId("clientCountry")
                        : undefined
                    }
                    required
                  />
                  {shouldShowClaimRequiredError("clientCountry") ? (
                    <span
                      id={getClaimRequiredErrorId("clientCountry")}
                      className="service-field__error"
                      role="alert"
                    >
                      {t("requiredFieldMissing")}
                    </span>
                  ) : null}
                </label>

                <label className="service-field">
                  <span>
                    {copy.clientCity}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    data-claim-required-field
                    value={formValues.clientCity}
                    onChange={(event) => handleFieldChange("clientCity", event.target.value)}
                    placeholder={copy.clientCityPlaceholder}
                    aria-invalid={shouldShowClaimRequiredError("clientCity")}
                    aria-describedby={
                      shouldShowClaimRequiredError("clientCity")
                        ? getClaimRequiredErrorId("clientCity")
                        : undefined
                    }
                    required
                  />
                  {shouldShowClaimRequiredError("clientCity") ? (
                    <span
                      id={getClaimRequiredErrorId("clientCity")}
                      className="service-field__error"
                      role="alert"
                    >
                      {t("requiredFieldMissing")}
                    </span>
                  ) : null}
                </label>

                <label className="service-field">
                  <span>
                    {copy.clientPostalCode}
                    <RequiredFieldMark title={requiredFieldTitle} />
                  </span>
                  <input
                    type="text"
                    data-claim-required-field
                    value={formValues.clientPostalCode}
                    onChange={(event) => handleFieldChange("clientPostalCode", event.target.value)}
                    placeholder={copy.clientPostalCodePlaceholder}
                    aria-invalid={shouldShowClaimRequiredError("clientPostalCode")}
                    aria-describedby={
                      shouldShowClaimRequiredError("clientPostalCode")
                        ? getClaimRequiredErrorId("clientPostalCode")
                        : undefined
                    }
                    required
                  />
                  {shouldShowClaimRequiredError("clientPostalCode") ? (
                    <span
                      id={getClaimRequiredErrorId("clientPostalCode")}
                      className="service-field__error"
                      role="alert"
                    >
                      {t("requiredFieldMissing")}
                    </span>
                  ) : null}
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
                    data-claim-required-field
                    value={formValues.clientFloor}
                    onChange={(event) => handleFieldChange("clientFloor", event.target.value)}
                    placeholder={copy.clientFloorPlaceholder}
                    aria-invalid={shouldShowClaimRequiredError("clientFloor")}
                    aria-describedby={
                      shouldShowClaimRequiredError("clientFloor")
                        ? getClaimRequiredErrorId("clientFloor")
                        : undefined
                    }
                    required
                  />
                  {shouldShowClaimRequiredError("clientFloor") ? (
                    <span
                      id={getClaimRequiredErrorId("clientFloor")}
                      className="service-field__error"
                      role="alert"
                    >
                      {t("requiredFieldMissing")}
                    </span>
                  ) : null}
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
                  data-claim-required-field
                  value={formValues.clientAddressLine1}
                  onChange={(event) => handleFieldChange("clientAddressLine1", event.target.value)}
                  placeholder={copy.clientAddressLine1Placeholder}
                  aria-invalid={shouldShowClaimRequiredError("clientAddressLine1")}
                  aria-describedby={
                    shouldShowClaimRequiredError("clientAddressLine1")
                      ? getClaimRequiredErrorId("clientAddressLine1")
                      : undefined
                  }
                  required
                />
                {shouldShowClaimRequiredError("clientAddressLine1") ? (
                  <span
                    id={getClaimRequiredErrorId("clientAddressLine1")}
                    className="service-field__error"
                    role="alert"
                  >
                    {t("requiredFieldMissing")}
                  </span>
                ) : null}
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

              <div className="service-field-grid service-field-grid--landlord-company">
                <label className="service-field">
                  <span>{t("landlordCompanyName")}</span>
                  <input
                    type="text"
                    value={formValues.landlordCompanyName}
                    onChange={(event) => handleFieldChange("landlordCompanyName", event.target.value)}
                    placeholder={t("landlordCompanyNamePlaceholder")}
                  />
                </label>

                <label className="service-field">
                  <span>{t("landlordCompanyPhone")}</span>
                  <input
                    type="tel"
                    value={formValues.landlordCompanyPhone}
                    onChange={(event) => handleFieldChange("landlordCompanyPhone", event.target.value)}
                    placeholder={t("landlordCompanyPhonePlaceholder")}
                  />
                </label>

                <label className="service-field">
                  <span>{t("landlordCompanyEmail")}</span>
                  <input
                    type="email"
                    value={formValues.landlordCompanyEmail}
                    onChange={(event) => handleFieldChange("landlordCompanyEmail", event.target.value)}
                    placeholder={t("landlordCompanyEmailPlaceholder")}
                  />
                </label>
              </div>

              <p className="service-form__field-group-label">{t("landlordContactPersonGroup")}</p>
              <div className="service-field-grid">
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

            <section className="service-form__section service-form__section--hausmeister">
              <p className="service-form__section-title">{copy.hausmeisterSection}</p>
              <ServiceYesNoChoice
                question={t("hausmeisterInvolvedQuestion")}
                value={formValues.hausmeisterInvolved}
                yesLabel={t("hausmeisterYes")}
                noLabel={t("hausmeisterNo")}
                onChange={handleHausmeisterInvolvedChange}
              />

              {formValues.hausmeisterInvolved === "yes" ? (
              <div className="service-form__section-copy">
              <div className="service-field-grid">
                <label className="service-field">
                  <span>
                    {copy.hausmeisterGivenName}
                    <OptionalFieldSuffix text={fieldOptionalSuffix} />
                  </span>
                  <input
                    type="text"
                    value={formValues.hausmeisterGivenName}
                    onChange={(event) => handleFieldChange("hausmeisterGivenName", event.target.value)}
                    placeholder={copy.hausmeisterGivenNamePlaceholder}
                  />
                </label>

                <label className="service-field">
                  <span>
                    {copy.hausmeisterSurname}
                    <OptionalFieldSuffix text={fieldOptionalSuffix} />
                  </span>
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
                  <span>
                    {copy.hausmeisterPhone}
                    <OptionalFieldSuffix text={fieldOptionalSuffix} />
                  </span>
                  <input
                    type="tel"
                    value={formValues.hausmeisterPhone}
                    onChange={(event) => handleFieldChange("hausmeisterPhone", event.target.value)}
                    placeholder={copy.hausmeisterPhonePlaceholder}
                  />
                </label>

                <label className="service-field">
                  <span>
                    {copy.hausmeisterEmail}
                    <OptionalFieldSuffix text={fieldOptionalSuffix} />
                  </span>
                  <input
                    type="email"
                    value={formValues.hausmeisterEmail}
                    onChange={(event) => handleFieldChange("hausmeisterEmail", event.target.value)}
                    placeholder={copy.hausmeisterEmailPlaceholder}
                  />
                </label>
              </div>
              </div>
              ) : null}
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
                    contractNumber={normalizedContractNumber}
                    labels={{
                      eyebrow: t("kitchenPlanEyebrow"),
                      title: contractLookup.kitchenPlan.kitchenName || t("kitchenPlanTitle"),
                      contractLabel: copy.contractNumber,
                      reset: t("kitchenPlanReset"),
                      sinkOption: t("kitchenPlanSinkOption"),
                      cooktopOption: t("kitchenPlanCooktopOption"),
                      worktopEndPanelOption: t("kitchenPlanWorktopEndPanelOption"),
                      filterOption: t("kitchenPlanFilterOption"),
                      furnitureFrontOption: t("kitchenPlanFurnitureFrontOption"),
                    }}
                  />
                </>
              ) : null}
              {selectedProblemAreasWithDetails.length ? (
                <>
                  {selectedProblemAreasWithDetails.map((area) => {
                    const isProblemAreaAttachmentMissing =
                      showProblemAreaAttachmentErrors && !area.attachments.length;
                    return (
                    <div key={area.componentId} className="service-field service-field--problem-area-row">
                      <label className="service-field__problem-area-label">
                        <span className="service-field__problem-area-label-text">
                          <span>
                            {area.label}
                            <RequiredFieldMark title={requiredFieldTitle} />
                          </span>
                          {area.articleCode ? (
                            <small className="service-field__problem-area-article-code">
                              {area.articleCode}
                            </small>
                          ) : null}
                        </span>
                      </label>
                      <div className="service-field__problem-area-stack">
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
                        <input
                          key={area.attachmentFieldKey}
                          type="file"
                          className="service-field__problem-area-file"
                          accept={CLAIM_ATTACHMENT_ACCEPT}
                          multiple
                          onChange={(event) => handleProblemAreaAttachmentsSelected(area.componentId, event)}
                          id={`problem-area-upload-${area.componentId}`}
                        />
                        <label
                          htmlFor={`problem-area-upload-${area.componentId}`}
                          className={[
                            "service-field__problem-area-upload-button",
                            isProblemAreaAttachmentMissing ? "is-required-missing" : "",
                          ].filter(Boolean).join(" ")}
                          title={copy.attachments}
                          data-problem-area-upload-required={isProblemAreaAttachmentMissing ? "true" : undefined}
                          aria-invalid={isProblemAreaAttachmentMissing ? "true" : undefined}
                        >
                          {t("uploadFile")}
                        </label>
                        <button
                          type="button"
                          className="service-field__problem-area-remove"
                          aria-label={t("removeProblemAreaAria").replace("{label}", area.label)}
                          title={t("removeProblemAreaAria").replace("{label}", area.label)}
                          onClick={() => removeProblemArea(area.componentId)}
                        >
                          <span aria-hidden="true">&times;</span>
                        </button>
                        {area.attachments.length ? (
                          <ServiceAttachmentChips
                            files={area.attachments}
                            summary={copy.attachmentsSelected.replace("{count}", String(area.attachments.length))}
                            maxCount={MAX_CLAIM_ATTACHMENT_COUNT}
                            clearLabel={copy.attachmentsClear}
                            onRemove={(index) => removeProblemAreaAttachment(area.componentId, index)}
                            onClearAll={() => clearProblemAreaAttachments(area.componentId)}
                            viewLabel={t("viewFile")}
                            viewAriaLabel={t("viewFileAria")}
                            closePreviewLabel={t("closeFilePreview")}
                            previewUnavailableText={t("filePreviewUnavailable")}
                            removeLabel={t("removeFileAria")}
                            expandLabel={copy.attachmentsViewMore}
                            collapseLabel={copy.attachmentsViewLess}
                            inlineExpandToggle
                          />
                        ) : null}
                        {isProblemAreaAttachmentMissing ? (
                          <span className="service-field__problem-area-error" role="alert">
                            {t("problemAreaAttachmentRequired")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                  <label className="service-field">
                    <span>
                      {t("problemDescriptionFieldLabel")}
                      <OptionalFieldSuffix text={fieldOptionalSuffix} />
                    </span>
                    <textarea
                      value={formValues.problemDescription}
                      onChange={(event) => handleAdditionalProblemDetailsChange(event.target.value)}
                      placeholder={copy.problemPlaceholder}
                      rows={6}
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

            <div className="service-serial-section">
              <div className="service-serial-section__column service-serial-section__column--left">
                {hasSelectedElectricalAppliances ? (
                  <label className="service-field service-field--serial-number">
                    <span className="service-field__label-row service-field__label-row--serial">
                      <span className="service-field__label-main">
                        {copy.serialNumber}
                        <RequiredFieldMark title={requiredFieldTitle} />
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
                    <p className="service-form__hint">
                      {t("serialNumberCountRequired").replace("{count}", String(requiredSelectedSerialNumberCount))}
                    </p>
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
                          disabled={serialNumberEntries.length + applicableSerialNumberImages.length >= requiredSelectedSerialNumberCount}
                        />
                        <button
                          type="button"
                          className="service-serial-field__add"
                          onClick={() => addSerialNumberEntry()}
                          disabled={
                            !serialNumberDraft.trim()
                            || serialNumberEntries.length + applicableSerialNumberImages.length >= requiredSelectedSerialNumberCount
                          }
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
                                aria-label={t("removeSerialNumberAria")}
                              >
                                &times;
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </label>
                ) : null}

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
                  <ServiceAttachmentChips
                    files={attachments}
                    summary={copy.attachmentsSelected.replace("{count}", String(attachments.length))}
                    maxCount={MAX_CLAIM_ATTACHMENT_COUNT}
                    clearLabel={copy.attachmentsClear}
                    onRemove={removeAttachment}
                    onClearAll={clearAttachments}
                    viewLabel={t("viewFile")}
                    viewAriaLabel={t("viewFileAria")}
                    closePreviewLabel={t("closeFilePreview")}
                    previewUnavailableText={t("filePreviewUnavailable")}
                    removeLabel={t("removeFileAria")}
                    expandLabel={copy.attachmentsViewMore}
                    collapseLabel={copy.attachmentsViewLess}
                  />
                </div>
              </div>

              {hasSelectedElectricalAppliances ? (
                <div className="service-serial-section__column service-serial-section__column--right">
                  <div className="service-field service-field--attachments service-field--serial-image-upload">
                    <span>
                      {t("serialNumberImage")}
                    </span>
                    <input
                      key={serialNumberImageFieldKey}
                      type="file"
                      className="service-field__file"
                      accept={SERIAL_NUMBER_IMAGE_ACCEPT}
                      multiple
                      onChange={handleSerialNumberImageSelected}
                      disabled={hasReachedRequiredSerialEvidenceCount}
                    />
                    {hasReachedRequiredSerialEvidenceCount ? (
                      <p className="service-form__hint service-form__hint--serial-limit" role="status">
                        {t("serialNumberEvidenceLimitReached").replace(
                          "{count}",
                          String(requiredSelectedSerialNumberCount),
                        )}
                      </p>
                    ) : null}
                    {serialNumberImages.length ? (
                      <ServiceAttachmentChips
                        files={serialNumberImages}
                        summary={copy.attachmentsSelected.replace("{count}", String(serialNumberImages.length))}
                        maxCount={MAX_CLAIM_ATTACHMENT_COUNT}
                        onRemove={removeSerialNumberImage}
                        viewLabel={t("viewFile")}
                        viewAriaLabel={t("viewFileAria")}
                        closePreviewLabel={t("closeFilePreview")}
                        previewUnavailableText={t("filePreviewUnavailable")}
                        removeLabel={t("removeFileAria")}
                        expandLabel={copy.attachmentsViewMore}
                        collapseLabel={copy.attachmentsViewLess}
                      />
                    ) : null}
                  </div>
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
      {isComplaintMode && shouldShowClaimRequiredAlert ? (
        <div className="service-required-alert" role="alert" aria-live="assertive">
          <div className="service-required-alert__content">
            <strong>{t("requiredFieldsAlertTitle")}</strong>
            <span>{t("requiredFieldsAlertText")}</span>
          </div>
          <button
            type="button"
            className="service-required-alert__action"
            onClick={focusFirstMissingClaimRequiredField}
          >
            {t("requiredFieldsAlertAction")}
          </button>
          <button
            type="button"
            className="service-required-alert__close"
            aria-label={t("contractNumberHelpClose") || "Close"}
            onClick={() => setIsClaimRequiredAlertDismissed(true)}
          >
            &times;
          </button>
        </div>
      ) : null}
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
                  onClick={closeClaimAssistant}
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
                    onClick={() => {
                      stopClaimAssistantSpeech();
                      setSelectedClaimAssistantContextKey(option.key);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="service-claim-agent__messages" aria-live="polite">
                {!claimAssistantMessages.length ? (
                  <div className="service-claim-agent__message service-claim-agent__message--assistant">
                    <div className="service-claim-agent__message-body">
                      {claimAssistantIntroText}
                    </div>
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
                      <div className="service-claim-agent__message-body">
                        {renderClaimAssistantMessageText(message.text)}
                      </div>
                      {message.role === "assistant" && message.actions?.length ? (
                        <div className="service-claim-agent__message-actions">
                          {message.actions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              className="service-claim-agent__action-chip"
                              disabled={isClaimAssistantLoading}
                              onClick={() => submitClaimAssistantQuestion(action.prompt || action.label)}
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
            onClick={() => {
              if (isClaimAssistantOpen) {
                closeClaimAssistant();
                return;
              }
              setIsClaimAssistantOpen(true);
            }}
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
      <ServiceVideoGuide
        isOpen={isTourOpen}
        copy={copy}
        onClose={completeTour}
        onFinish={completeTour}
      />
    </>
  );
}
