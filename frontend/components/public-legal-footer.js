"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import translations from "../locales/legal-footer.json";
import { getActivePublicLanguage } from "../lib/public-language-state";
import { rememberPublicLegalReturnPath } from "../lib/public-legal-navigation";

export default function PublicLegalFooter() {
  const pathname = usePathname();
  const [language, setLanguage] = useState("de");

  useEffect(() => {
    function updateLanguage(event) {
      setLanguage(event?.detail?.language || getActivePublicLanguage(pathname));
    }

    updateLanguage();
    window.addEventListener("fragmento:public-language-change", updateLanguage);
    return () => window.removeEventListener("fragmento:public-language-change", updateLanguage);
  }, [pathname]);

  const copy = translations[language] || translations.de;

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="public-legal-footer" aria-label={copy.label}>
      <div className="public-legal-footer__layout">
        <div className="public-legal-footer__partner" aria-label={copy.partner}>
          <span className="public-legal-footer__partner-label">{copy.poweredBy}</span>
          <img
            src="/primex-agentic-logo.png"
            alt={copy.partner}
            className="public-legal-footer__partner-logo"
          />
        </div>
        <div className="public-legal-footer__links">
          <Link
            href="/impressum"
            className="public-legal-footer__link"
            onClick={rememberPublicLegalReturnPath}
          >
            {copy.imprint}
          </Link>
          <Link
            href={`/datenschutz?lang=${encodeURIComponent(language)}`}
            className="public-legal-footer__link"
            onClick={rememberPublicLegalReturnPath}
          >
            {copy.privacy}
          </Link>
          <Link
            href={`/agb?lang=${encodeURIComponent(language)}`}
            className="public-legal-footer__link"
            onClick={rememberPublicLegalReturnPath}
          >
            {copy.terms}
          </Link>
        </div>
      </div>
    </footer>
  );
}
