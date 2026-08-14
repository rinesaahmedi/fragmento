"use client";

import { useRouter } from "next/navigation";

const LEGAL_RETURN_PATH_KEY = "fragmentoLegalReturnPath";

export default function ImpressumBackLink({ label = "Zur\u00fcck" }) {
  const router = useRouter();

  function handleClick() {
    if (typeof window === "undefined") {
      router.push("/");
      return;
    }

    const storedReturnPath = window.sessionStorage.getItem(LEGAL_RETURN_PATH_KEY);
    window.sessionStorage.removeItem(LEGAL_RETURN_PATH_KEY);

    if (storedReturnPath?.startsWith("/") && !storedReturnPath.startsWith("/impressum")) {
      router.push(storedReturnPath);
      return;
    }

    const hasHistoryEntry = window.history.length > 1;
    const referrer = document.referrer;
    const isInternalReferrer = referrer ? new URL(referrer).origin === window.location.origin : false;

    if (hasHistoryEntry && isInternalReferrer) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <button type="button" className="legal-page__back-link" onClick={handleClick}>
      <span aria-hidden="true" className="legal-page__back-icon">
        ←
      </span>
      <span>{label}</span>
    </button>
  );
}
