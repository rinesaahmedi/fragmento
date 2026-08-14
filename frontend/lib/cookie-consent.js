export const COOKIE_CONSENT_COOKIE_NAME = "fragmentoCookieConsent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const FUNCTIONAL_COOKIE_NAMES = ["fragmentoLanguage", "serviceLanguage"];

function readCookie(name) {
  if (typeof document === "undefined") return "";

  const encodedName = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedName))
    ?.slice(encodedName.length) || "";
}

export function getCookieConsentPreferences() {
  const value = readCookie(COOKIE_CONSENT_COOKIE_NAME);
  if (value === "functional") return { responded: true, functional: true };
  if (value === "necessary") return { responded: true, functional: false };
  return { responded: false, functional: false };
}

export function canUseFunctionalCookies() {
  return getCookieConsentPreferences().functional;
}

export function saveCookieConsentPreferences({ functional }) {
  if (typeof document === "undefined") return;

  const value = functional ? "functional" : "necessary";
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;

  if (!functional) {
    FUNCTIONAL_COOKIE_NAMES.forEach((name) => {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
      document.cookie = `${name}=; path=/service; max-age=0; samesite=lax`;
    });
  }
}
