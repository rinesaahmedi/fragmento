"use client";

import { Fragment, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StatusBadgeLabel } from "./admin-ui";
import de from "../locales/admin.de.json";
import en from "../locales/admin.en.json";

const STORAGE_KEY = "adminLanguage";
const dictionaries = { de, en };
const AdminI18nContext = createContext(null);

function isSupportedLanguage(value) {
  return value === "de" || value === "en";
}

function readSavedLanguage(fallbackLanguage = "en") {
  if (typeof window === "undefined") {
    return fallbackLanguage;
  }

  const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (isSupportedLanguage(savedLanguage)) {
    return savedLanguage;
  }

  const cookieLanguage = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];

  return isSupportedLanguage(cookieLanguage) ? cookieLanguage : fallbackLanguage;
}

function readPath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

function persistLanguage(language) {
  window.localStorage.setItem(STORAGE_KEY, language);
  document.cookie = `${STORAGE_KEY}=${language}; path=/admin; max-age=31536000; samesite=lax`;
}

export function AdminI18nProvider({ initialLanguage = "en", children }) {
  const safeInitialLanguage = isSupportedLanguage(initialLanguage) ? initialLanguage : "en";
  const [language, setLanguageState] = useState(safeInitialLanguage);

  useEffect(() => {
    const savedLanguage = readSavedLanguage(safeInitialLanguage);
    persistLanguage(savedLanguage);
    if (savedLanguage !== language) {
      setLanguageState(savedLanguage);
    }
  }, [language, safeInitialLanguage]);

  function setLanguage(nextLanguage) {
    const safeLanguage = nextLanguage === "de" ? "de" : "en";
    setLanguageState(safeLanguage);
    persistLanguage(safeLanguage);
  }

  const value = useMemo(() => {
    const dictionary = dictionaries[language] || dictionaries.en;

    return {
      language,
      setLanguage,
      translate(key, fallback = "") {
        return readPath(dictionary, key) || readPath(dictionaries.en, key) || fallback;
      },
    };
  }, [language]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminI18n() {
  const value = useContext(AdminI18nContext);
  if (!value) {
    throw new Error("useAdminI18n must be used inside AdminI18nProvider");
  }
  return value;
}

export function AdminText({ i18nKey, fallback = "", as: Component = Fragment, values }) {
  const { translate } = useAdminI18n();
  let text = translate(i18nKey, fallback);

  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      text = text.replaceAll(`{${key}}`, value);
    });
  }

  return <Component>{text}</Component>;
}

export function AdminTranslation({ i18nKey, fallback = "", values }) {
  const { translate } = useAdminI18n();
  let text = translate(i18nKey, fallback);

  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      text = text.replaceAll(`{${key}}`, value);
    });
  }

  return text;
}

export function AdminPluralText({
  count,
  singularKey,
  pluralKey,
  singularFallback = "",
  pluralFallback = "",
  values,
}) {
  const { translate } = useAdminI18n();
  const numericCount = Number(count || 0);
  const key = numericCount === 1 ? singularKey : pluralKey;
  const fallback = numericCount === 1 ? singularFallback : pluralFallback;
  let text = translate(key, fallback);
  const replacements = { count: numericCount, ...values };

  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });

  return text;
}

export function AdminTranslatedInput({ placeholderKey, placeholderFallback = "", ...props }) {
  const { translate } = useAdminI18n();

  return <input {...props} placeholder={translate(placeholderKey, placeholderFallback)} />;
}

export function AdminStatusBadge({ status }) {
  const { translate } = useAdminI18n();
  const statusKey = String(status || "").toLowerCase();
  const label = translate(`status.${statusKey}`, status === "CONFIRMED" ? "Confirmed / emailed" : status);

  return <StatusBadgeLabel status={status} label={label} />;
}

function formatAdminDate(value, language = "en") {
  if (!value) return "-";

  const formatter = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Berlin",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));

  if (language === "de") {
    return `${parts.day}. ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
  }

  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

function getLocalizedKitchenDisplayName({ slug, name }, language = "en") {
  const normalizedSlug = String(slug || "").toLowerCase();
  const displayName = String(name || "").trim();
  const normalizedName = displayName.toLowerCase();
  const isTwoPartKitchen =
    normalizedSlug === "kitchen-model-c" ||
    ["two-part kitchen", "split kitchen", "zweiteilige küche", "zweiteilige kÃ¼che"].includes(normalizedName);
  const isStandardKitchen =
    normalizedSlug === "kitchen-model-b" ||
    ["standard kitchen", "linear kitchen", "standardküche", "standardkÃ¼che"].includes(normalizedName);
  const isDefaultDemoKitchen =
    normalizedSlug === "fragmento-default" ||
    [
      "default kitchen",
      "default demo kitchen",
      "fragmento default kitchen",
      "standard-demoküche",
      "standard-demokÃ¼che",
    ].includes(normalizedName);

  if (language === "de") {
    if (isTwoPartKitchen) return "Zweiteilige Küche";
    if (isStandardKitchen) return "Standardküche";
    if (isDefaultDemoKitchen) return "Standard-Demoküche";
  } else {
    if (isTwoPartKitchen) return "Two-Part Kitchen";
    if (isStandardKitchen) return "Standard Kitchen";
    if (isDefaultDemoKitchen) return "Default Demo Kitchen";
  }

  if (language === "de") {
    if (normalizedSlug === "kitchen-model-c" || normalizedName === "two-part kitchen" || normalizedName === "split kitchen") {
      return "Zweiteilige Küche";
    }

    if (normalizedSlug === "kitchen-model-b" || normalizedName === "standard kitchen" || normalizedName === "linear kitchen") {
      return "Standardküche";
    }

    if (
      normalizedSlug === "fragmento-default" ||
      normalizedName === "default kitchen" ||
      normalizedName === "default demo kitchen" ||
      normalizedName === "fragmento default kitchen"
    ) {
      return "Standard-Demoküche";
    }
  }

  if (normalizedSlug === "kitchen-model-c" || displayName === "Zweiteilige Küche") {
    return "Two-Part Kitchen";
  }

  if (normalizedSlug === "kitchen-model-b" || displayName === "Standardküche") {
    return "Standard Kitchen";
  }

  if (normalizedSlug === "fragmento-default" || displayName === "Default Kitchen" || displayName === "Fragmento Default Kitchen") {
    return "Default Demo Kitchen";
  }

  return displayName;
}

export function AdminDateTime({ value }) {
  const { language } = useAdminI18n();

  return formatAdminDate(value, language);
}

export function AdminKitchenDisplayName({ slug, name }) {
  const { language } = useAdminI18n();

  return getLocalizedKitchenDisplayName({ slug, name }, language);
}

export function AdminKitchenNameInput({ slug, name, style, required = false }) {
  const { language } = useAdminI18n();
  const localizedName = getLocalizedKitchenDisplayName({ slug, name }, language);
  const lastLocalizedNameRef = useRef(localizedName);
  const [value, setValue] = useState(localizedName);

  useEffect(() => {
    if (value === lastLocalizedNameRef.current) {
      setValue(localizedName);
    }
    lastLocalizedNameRef.current = localizedName;
  }, [localizedName, value]);

  return (
    <input
      name="name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      style={style}
      required={required}
    />
  );
}

export function AdminLanguageSwitcher() {
  const { language, setLanguage, translate } = useAdminI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const languageOptions = [
    { value: "en", code: "EN", label: translate("adminShellLogin.english", "English") },
    { value: "de", code: "DE", label: translate("adminShellLogin.german", "Deutsch") },
  ];
  const selectedLanguage = languageOptions.find((option) => option.value === language) || languageOptions[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setIsOpen(false);
  }

  return (
    <div className={`admin-language-switcher${isOpen ? " is-open" : ""}`} ref={menuRef}>
      <span className="admin-language-switcher__label">{translate("adminShellLogin.language", "Language")}</span>
      <button
        type="button"
        className="admin-language-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={translate("adminShellLogin.language", "Language")}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="admin-language-switcher__code">{selectedLanguage.code}</span>
        <span className="admin-language-switcher__current">{selectedLanguage.label}</span>
        <span className="admin-language-switcher__chevron" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="admin-language-switcher__menu" role="listbox" aria-label={translate("adminShellLogin.language", "Language")}>
          {languageOptions.map((option) => {
            const isActive = option.value === language;

            return (
              <button
                type="button"
                key={option.value}
                className={`admin-language-switcher__option${isActive ? " is-active" : ""}`}
                role="option"
                aria-selected={isActive}
                onClick={() => selectLanguage(option.value)}
              >
                <span className="admin-language-switcher__code">{option.code}</span>
                <span>{option.label}</span>
                <span className="admin-language-switcher__active-dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
      <style>{`
        .admin-language-switcher {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--app-text-muted);
          font-size: 13px;
          font-weight: 800;
          line-height: 1;
        }

        .admin-language-switcher__label {
          white-space: nowrap;
        }

        .admin-language-switcher__trigger,
        .admin-language-switcher__option {
          appearance: none;
          border: 0;
          font: inherit;
          color: var(--app-text);
        }

        .admin-language-switcher__trigger {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid var(--app-border-strong);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.94);
          padding: 8px 12px 8px 10px;
          box-shadow: var(--app-shadow-soft);
          cursor: pointer;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }

        .admin-language-switcher__trigger:hover,
        .admin-language-switcher__trigger:focus-visible,
        .admin-language-switcher.is-open .admin-language-switcher__trigger {
          border-color: rgba(115, 80, 55, 0.42);
          background: var(--color-card);
          box-shadow: 0 12px 28px rgba(48, 33, 24, 0.12);
          outline: none;
        }

        .admin-language-switcher__code {
          width: 30px;
          min-width: 30px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: rgba(115, 80, 55, 0.12);
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .admin-language-switcher__current {
          min-width: 58px;
          text-align: left;
        }

        .admin-language-switcher__chevron {
          width: 8px;
          height: 8px;
          border-right: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
          transform: translateY(-2px) rotate(45deg);
          opacity: 0.62;
          transition: transform 160ms ease;
        }

        .admin-language-switcher.is-open .admin-language-switcher__chevron {
          transform: translateY(2px) rotate(225deg);
        }

        .admin-language-switcher__menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          z-index: 60;
          width: 180px;
          display: grid;
          gap: 4px;
          border: 1px solid var(--app-border-strong);
          border-radius: 10px;
          background: var(--color-card);
          padding: 6px;
          box-shadow: 0 18px 42px rgba(48, 33, 24, 0.18);
        }

        .admin-language-switcher__menu::before {
          content: "";
          position: absolute;
          right: 18px;
          top: -6px;
          width: 10px;
          height: 10px;
          border-left: 1px solid var(--app-border-strong);
          border-top: 1px solid var(--app-border-strong);
          background: var(--color-card);
          transform: rotate(45deg);
        }

        .admin-language-switcher__option {
          position: relative;
          z-index: 1;
          min-height: 38px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) 8px;
          align-items: center;
          gap: 9px;
          border-radius: 7px;
          background: transparent;
          padding: 7px 9px;
          text-align: left;
          cursor: pointer;
        }

        .admin-language-switcher__option:hover,
        .admin-language-switcher__option:focus-visible,
        .admin-language-switcher__option.is-active {
          background: rgba(115, 80, 55, 0.1);
          outline: none;
        }

        .admin-language-switcher__active-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: transparent;
        }

        .admin-language-switcher__option.is-active .admin-language-switcher__active-dot {
          background: var(--color-primary);
        }

        @media (max-width: 720px) {
          .admin-language-switcher {
            width: 100%;
            justify-content: space-between;
          }

          .admin-language-switcher__trigger {
            flex: 1;
            justify-content: space-between;
          }

          .admin-language-switcher__menu {
            left: 0;
            right: auto;
            width: 100%;
            min-width: 180px;
          }
        }
      `}</style>
    </div>
  );
}
