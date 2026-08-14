export const SERVICE_LANGUAGE_COOKIE_NAME = "serviceLanguage";
export const SERVICE_LANGUAGE_STORAGE_KEY = "serviceLanguage";

const SERVICE_LANGUAGES = new Set(["de", "en", "tr", "es", "fr", "ru"]);

export function normalizeServiceLanguage(value) {
  return SERVICE_LANGUAGES.has(value) ? value : "de";
}

export function persistServiceLanguage(language) {
  if (typeof window === "undefined") return;
  if (!canUseFunctionalCookies()) return;

  const normalizedLanguage = normalizeServiceLanguage(language);
  window.localStorage.setItem(SERVICE_LANGUAGE_STORAGE_KEY, normalizedLanguage);
  document.cookie = `${SERVICE_LANGUAGE_COOKIE_NAME}=${normalizedLanguage}; path=/service; max-age=31536000; samesite=lax`;
}
import { canUseFunctionalCookies } from "./cookie-consent";
