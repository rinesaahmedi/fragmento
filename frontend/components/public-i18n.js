"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

function FlagBadge({ country, active = false }) {
  const flagSrcByCountry = {
    de: "https://flagcdn.com/w40/de.png",
    gb: "https://flagcdn.com/w40/gb.png",
  };
  const flagSrc = flagSrcByCountry[country];

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: 24,
        height: 24,
        borderRadius: "999px",
        overflow: "hidden",
        background: "#fff",
        boxShadow: active ? "none" : "0 4px 8px rgba(48, 34, 21, 0.08)",
      }}
    >
      {flagSrc ? (
        <img
          src={flagSrc}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
    </span>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="8"
      viewBox="0 0 12 8"
      style={{
        display: "block",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M1.5 1.5L6 6L10.5 1.5"
        fill="none"
        stroke="#6b4f3a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PublicLanguageSwitcher() {
  const { language, setLanguage, translate } = usePublicI18n();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const languageOptions = [
    { value: "de", label: translate("common.german", "Deutsch"), country: "de" },
    { value: "en", label: translate("common.english", "English"), country: "gb" },
  ];
  const currentLanguage = languageOptions.find((option) => option.value === language) || languageOptions[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        zIndex: isOpen ? 40 : "auto",
        display: "inline-grid",
        gridTemplateColumns: "auto auto",
        alignItems: "center",
        gap: 12,
        minHeight: 48,
        padding: "8px 10px 8px 14px",
        border: "1px solid rgba(177, 145, 116, 0.24)",
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,244,236,0.94) 100%)",
        boxShadow: "0 14px 30px rgba(84, 59, 40, 0.1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        style={{
          color: "var(--app-text-muted, #6b6259)",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {translate("common.language", "Language")}
      </span>

      <div style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            minHeight: 40,
            minWidth: 154,
            padding: "8px 12px 8px 10px",
            border: isOpen ? "1px solid rgba(122, 77, 39, 0.38)" : "1px solid rgba(122, 77, 39, 0.24)",
            borderRadius: 999,
            background: "rgba(255,255,255,0.98)",
            color: "#2e271f",
            boxShadow: isOpen
              ? "0 12px 26px rgba(122, 77, 39, 0.12), inset 0 1px 0 rgba(255,255,255,0.98)"
              : "inset 0 1px 0 rgba(255,255,255,0.92)",
            lineHeight: 1.1,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <FlagBadge country={currentLanguage.country} />
            <span>{currentLanguage.label}</span>
          </span>
          <ChevronIcon open={isOpen} />
        </button>

        {isOpen ? (
          <div
            role="menu"
            aria-label={translate("common.language", "Language")}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              zIndex: 20,
              display: "grid",
              gap: 8,
              minWidth: 228,
              padding: 12,
              border: "1px solid rgba(177, 145, 116, 0.24)",
              borderRadius: 24,
              background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,243,236,0.97) 100%)",
              boxShadow: "0 22px 42px rgba(84, 59, 40, 0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            {languageOptions.map((option) => {
              const isActive = option.value === language;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    setLanguage(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    minHeight: 42,
                    padding: "8px 12px",
                    border: isActive ? "1px solid rgba(111, 90, 71, 0.24)" : "1px solid transparent",
                    borderRadius: 14,
                    background: isActive ? "linear-gradient(180deg, #8b7968 0%, #756353 100%)" : "transparent",
                    color: isActive ? "#fffdf8" : "#3f342a",
                    font: "inherit",
                    fontSize: 15,
                    fontWeight: isActive ? 800 : 700,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <FlagBadge country={option.country} active={isActive} />
                    <span>{option.label}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "999px",
                      background: isActive ? "#fff6ea" : "transparent",
                      boxShadow: isActive ? "0 0 0 3px rgba(255,246,234,0.16)" : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
