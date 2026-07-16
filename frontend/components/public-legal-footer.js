"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LEGAL_RETURN_REQUEST_KEY = "fragmentoLegalReturnRequested";
const LEGAL_RETURN_PATH_KEY = "fragmentoLegalReturnPath";

export default function PublicLegalFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="public-legal-footer" aria-label="Rechtliche Hinweise">
      <div className="public-legal-footer__layout">
        <div className="public-legal-footer__partner" aria-label="Powered by Primex">
          <span className="public-legal-footer__partner-label">Powered by</span>
          <img
            src="/primex-agentic-logo.png"
            alt="Primex Agentic AI"
            className="public-legal-footer__partner-logo"
          />
        </div>
        <div className="public-legal-footer__links">
          <Link
            href="/impressum"
            className="public-legal-footer__link"
            onClick={() => rememberLegalReturnPath()}
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="public-legal-footer__link"
            onClick={() => rememberLegalReturnPath()}
          >
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
}

function rememberLegalReturnPath() {
  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem(LEGAL_RETURN_PATH_KEY, returnPath);

  if (window.location.pathname === "/") {
    window.sessionStorage.setItem(LEGAL_RETURN_REQUEST_KEY, "1");
  } else {
    window.sessionStorage.removeItem(LEGAL_RETURN_REQUEST_KEY);
  }
}
