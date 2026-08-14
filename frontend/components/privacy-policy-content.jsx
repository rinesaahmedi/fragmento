"use client";

import { useEffect, useState } from "react";
import translations from "../locales/privacy-policy.json";
import { getActivePublicLanguage } from "../lib/public-language-state";
import ImpressumBackLink from "./impressum-back-link";

export default function PrivacyPolicyContent({ initialLanguage = "de" }) {
  const [language, setLanguage] = useState(() => translations[initialLanguage] ? initialLanguage : "de");
  const copy = translations[language] || translations.de;

  useEffect(() => {
    function updateLanguage(event) {
      setLanguage(event?.detail?.language || getActivePublicLanguage(window.location.pathname));
    }

    updateLanguage();
    window.addEventListener("fragmento:public-language-change", updateLanguage);
    return () => window.removeEventListener("fragmento:public-language-change", updateLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.documentTitle;
  }, [copy.documentTitle, language]);

  return (
    <main className="legal-page">
      <div className="legal-page__card">
        <p className="legal-page__eyebrow">{copy.eyebrow}</p>
        <ImpressumBackLink label={copy.back} />
        <h1>{copy.title}</h1>

        {copy.sections.map((section) => (
          <section key={section.title} className="legal-page__section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} style={{ whiteSpace: "pre-line" }}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
