"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PublicLegalFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="public-legal-footer" aria-label="Rechtliche Hinweise">
      <div className="public-legal-footer__inner">
        <span className="public-legal-footer__copy">Fragmento</span>
        <Link href="/impressum" className="public-legal-footer__link" hidden>
          Impressum
        </Link>
      </div>
    </footer>
  );
}
