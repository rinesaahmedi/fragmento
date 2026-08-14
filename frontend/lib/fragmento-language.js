export const FRAGMENTO_LANGUAGE_COOKIE_NAME = "fragmentoLanguage";
export const FRAGMENTO_LANGUAGE_STORAGE_KEY = "fragmentoLanguage";

const FRAGMENTO_LANGUAGES = new Set(["de", "en", "tr", "es", "fr", "ru"]);

export function normalizeFragmentoLanguage(value) {
  return FRAGMENTO_LANGUAGES.has(value) ? value : "de";
}

export function persistFragmentoLanguage(language) {
  if (typeof window === "undefined") return;
  if (!canUseFunctionalCookies()) return;

  const normalizedLanguage = normalizeFragmentoLanguage(language);
  window.localStorage.setItem(FRAGMENTO_LANGUAGE_STORAGE_KEY, normalizedLanguage);
  document.cookie = `${FRAGMENTO_LANGUAGE_COOKIE_NAME}=${normalizedLanguage}; path=/; max-age=31536000; samesite=lax`;
}
import { canUseFunctionalCookies } from "./cookie-consent";
