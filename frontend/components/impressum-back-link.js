"use client";

import { useRouter } from "next/navigation";

export default function ImpressumBackLink() {
  const router = useRouter();

  function handleClick() {
    if (typeof window === "undefined") {
      router.push("/");
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
      <span>Zurueck</span>
    </button>
  );
}
