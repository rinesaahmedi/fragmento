"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import de from "../locales/public.de.json";
import en from "../locales/public.en.json";
import {
  PUBLIC_LANGUAGE_COOKIE_NAME,
  PUBLIC_LANGUAGE_STORAGE_KEY,
  normalizePublicLanguage,
} from "../lib/public-language";

const dictionaries = { de, en };
const PublicI18nContext = createContext(null);

function readPath(source, path) {
  return path.split(".").reduce((value, part) => value?.[part], source);
}

function persistLanguage(language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${PUBLIC_LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;
}

function syncKitchenUrlLanguage(language) {
  if (typeof window === "undefined") return;
  if (!window.location.pathname.startsWith("/kitchens/")) return;

  const url = new URL(window.location.href);
  if (url.searchParams.get("lang") === language) return;
  url.searchParams.set("lang", language);
  window.history.replaceState(window.history.state, "", url.toString());
}

export function PublicI18nProvider({ initialLanguage = "de", children }) {
  const [language, setLanguageState] = useState(normalizePublicLanguage(initialLanguage));

  useEffect(() => {
    const safeLanguage = normalizePublicLanguage(language);
    persistLanguage(safeLanguage);
    syncKitchenUrlLanguage(safeLanguage);
  }, [language]);

  const value = useMemo(() => {
    const dictionary = dictionaries[language] || dictionaries.de;

    return {
      language,
      setLanguage(nextLanguage) {
        setLanguageState(normalizePublicLanguage(nextLanguage));
      },
      translate(key, fallback = "", values) {
        let text = readPath(dictionary, key) || readPath(dictionaries.de, key) || fallback;

        if (values) {
          Object.entries(values).forEach(([valueKey, value]) => {
            text = String(text).replaceAll(`{${valueKey}}`, String(value));
          });
        }

        return text;
      },
    };
  }, [language]);

  return <PublicI18nContext.Provider value={value}>{children}</PublicI18nContext.Provider>;
}

export function usePublicI18n() {
  const value = useContext(PublicI18nContext);
  if (!value) {
    throw new Error("usePublicI18n must be used inside PublicI18nProvider");
  }
  return value;
}

export function PublicLanguageSwitcher() {
  const { language, setLanguage, translate } = usePublicI18n();

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "var(--app-text-muted, #6b6259)",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span>{translate("common.language", "Language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        style={{
          minHeight: 40,
          border: "1px solid rgba(177, 145, 116, 0.36)",
          borderRadius: 10,
          background: "rgba(255,255,255,0.92)",
          color: "#2e271f",
          padding: "8px 10px",
          fontWeight: 800,
        }}
      >
        <option value="de">{translate("common.german", "Deutsch")}</option>
        <option value="en">{translate("common.english", "English")}</option>
      </select>
    </label>
  );
}
