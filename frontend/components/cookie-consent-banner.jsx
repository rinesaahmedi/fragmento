"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import translations from "../locales/cookie-consent.json";
import { getCookieConsentPreferences, saveCookieConsentPreferences } from "../lib/cookie-consent";
import { rememberPublicLegalReturnPath } from "../lib/public-legal-navigation";

function CookieIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="cookie-consent__icon">
      <path d="M13.8 2.7a5.1 5.1 0 0 0 6.8 6.8 8 8 0 1 1-6.8-6.8Z" fill="currentColor" />
      <circle cx="8.1" cy="12" r="1.1" fill="#fff" />
      <circle cx="12.2" cy="16" r="1.1" fill="#fff" />
      <circle cx="15.7" cy="11.9" r="1.1" fill="#fff" />
    </svg>
  );
}

export default function CookieConsentBanner({ language = "de", onConsentSaved }) {
  const copy = useMemo(() => translations[language] || translations.de, [language]);
  const [isVisible, setIsVisible] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [functionalCookies, setFunctionalCookies] = useState(true);

  useEffect(() => {
    const preferences = getCookieConsentPreferences();
    setFunctionalCookies(preferences.functional || !preferences.responded);
    setIsVisible(!preferences.responded);
  }, []);

  function save(functional) {
    saveCookieConsentPreferences({ functional });
    onConsentSaved?.({ functional });
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__brand"><CookieIcon /></div>
      <h2 id="cookie-consent-title" className="cookie-consent__title">{isManaging ? copy.preferencesTitle : copy.title}</h2>

      {isManaging ? (
        <div className="cookie-consent__preferences">
          <div className="cookie-consent__preference">
            <div><strong>{copy.necessaryTitle}</strong><p>{copy.necessaryDescription}</p></div>
            <span className="cookie-consent__always-active">{copy.alwaysActive}</span>
          </div>
          <label className="cookie-consent__preference">
            <div><strong>{copy.functionalTitle}</strong><p>{copy.functionalDescription}</p></div>
            <span className="cookie-consent__switch-wrap">
              <input type="checkbox" checked={functionalCookies} onChange={(event) => setFunctionalCookies(event.target.checked)} />
              <span className="cookie-consent__switch" aria-hidden="true" />
              <span className="cookie-consent__switch-label">{functionalCookies ? copy.on : copy.off}</span>
            </span>
          </label>
        </div>
      ) : (
        <p className="cookie-consent__description">{copy.description}</p>
      )}

      <Link href={`/datenschutz?lang=${encodeURIComponent(language)}`} className="cookie-consent__privacy-link" onClick={rememberPublicLegalReturnPath}>{copy.privacyLink}</Link>

      <div className="cookie-consent__actions">
        {isManaging ? (
          <button type="button" className="cookie-consent__button cookie-consent__button--primary" onClick={() => save(functionalCookies)}>{copy.save}</button>
        ) : (
          <>
            <button type="button" className="cookie-consent__button" onClick={() => save(false)}>{copy.reject}</button>
            <button type="button" className="cookie-consent__button" onClick={() => setIsManaging(true)}>{copy.manage}</button>
            <button type="button" className="cookie-consent__button cookie-consent__button--primary" onClick={() => save(true)}>{copy.acceptAll}</button>
          </>
        )}
      </div>
    </aside>
  );
}
