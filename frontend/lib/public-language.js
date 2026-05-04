export const PUBLIC_LANGUAGE_STORAGE_KEY = "publicLanguage";
export const PUBLIC_LANGUAGE_COOKIE_NAME = "publicLanguage";

export function normalizePublicLanguage(value) {
  return value === "en" ? "en" : "de";
}
