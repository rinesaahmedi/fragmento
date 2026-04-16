"use client";

import { Fragment, createContext, useContext, useEffect, useMemo, useState } from "react";
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

export function AdminLanguageSwitcher() {
  const { language, setLanguage, translate } = useAdminI18n();

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "var(--app-text-muted)",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span>{translate("adminShellLogin.language", "Language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        style={{
          minHeight: 42,
          border: "1px solid var(--app-border-strong)",
          borderRadius: 8,
          background: "rgba(255,255,255,0.88)",
          color: "var(--app-text)",
          padding: "8px 10px",
          fontWeight: 800,
        }}
      >
        <option value="en">{translate("adminShellLogin.english", "English")}</option>
        <option value="de">{translate("adminShellLogin.german", "Deutsch")}</option>
      </select>
    </label>
  );
}
