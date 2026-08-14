export const LEGAL_RETURN_REQUEST_KEY = "fragmentoLegalReturnRequested";
export const LEGAL_RETURN_PATH_KEY = "fragmentoLegalReturnPath";

export function rememberPublicLegalReturnPath() {
  if (typeof window === "undefined") return;

  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem(LEGAL_RETURN_PATH_KEY, returnPath);

  if (window.location.pathname === "/") {
    window.sessionStorage.setItem(LEGAL_RETURN_REQUEST_KEY, "1");
  } else {
    window.sessionStorage.removeItem(LEGAL_RETURN_REQUEST_KEY);
  }
}
