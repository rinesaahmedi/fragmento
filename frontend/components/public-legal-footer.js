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
      <div className="public-legal-footer__inner">
        <span className="public-legal-footer__copy">Fragmento</span>
        <Link
          href="/impressum"
          className="public-legal-footer__link"
          onClick={() => {
            const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            window.sessionStorage.setItem(LEGAL_RETURN_PATH_KEY, returnPath);

            if (window.location.pathname === "/") {
              window.sessionStorage.setItem(LEGAL_RETURN_REQUEST_KEY, "1");
            } else {
              window.sessionStorage.removeItem(LEGAL_RETURN_REQUEST_KEY);
            }
          }}
        >
          Impressum
        </Link>
      </div>
    </footer>
  );
}
