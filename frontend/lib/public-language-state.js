const LANGUAGE_CODES = new Set(["de", "en", "tr", "es", "fr", "ru"]);
const ACTIVE_LANGUAGE_STORAGE_KEY = "fragmentoActivePublicLanguage";

function normalizeLanguage(value) {
  return LANGUAGE_CODES.has(value) ? value : "de";
}

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

export function activatePublicLanguage(language) {
  if (typeof window === "undefined") return;

  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = normalizedLanguage;
  window.sessionStorage.setItem(ACTIVE_LANGUAGE_STORAGE_KEY, normalizedLanguage);
  window.dispatchEvent(new CustomEvent("fragmento:public-language-change", { detail: { language: normalizedLanguage } }));
}

export function getActivePublicLanguage(pathname = "") {
  if (typeof window === "undefined") return "de";

  const activeLanguage = window.sessionStorage.getItem(ACTIVE_LANGUAGE_STORAGE_KEY);
  if (LANGUAGE_CODES.has(activeLanguage)) return activeLanguage;

  const cookieNames = pathname.startsWith("/service")
    ? ["serviceLanguage", "fragmentoLanguage", "publicLanguage"]
    : ["fragmentoLanguage", "publicLanguage", "serviceLanguage"];
  const cookieLanguage = cookieNames.map(readCookie).find((value) => LANGUAGE_CODES.has(value));
  return normalizeLanguage(cookieLanguage || document.documentElement.lang);
}
