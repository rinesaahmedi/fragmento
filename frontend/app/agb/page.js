import ImpressumBackLink from "../../components/impressum-back-link";
import { getTermsAndConditions } from "../../lib/terms-and-conditions";
import { AGB_PDF_URL, WITHDRAWAL_URL, WITHDRAWAL_FORM_PDF_URL, legalLinkCopy } from "../../lib/legal-links";

function LegalParagraph({ text, language }) {
  const copy = legalLinkCopy[language] || legalLinkCopy.de;
  const parts = text.split(/(\/legal\/muster-widerrufsformular\.pdf|\/widerruf)/g);
  return <p style={{ whiteSpace: "pre-line" }}>{parts.map((part, index) => {
    if (part === WITHDRAWAL_FORM_PDF_URL) {
      return <a key={index} href={WITHDRAWAL_FORM_PDF_URL} target="_blank" rel="noopener noreferrer">{copy.form}</a>;
    }
    if (part === WITHDRAWAL_URL) {
      return <a key={index} href={`${WITHDRAWAL_URL}?lang=${language === "en" ? "en" : "de"}`}>{copy.online}</a>;
    }
    return part;
  })}</p>;
}

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const supportedLanguages = ["de", "en", "es", "fr", "ru", "tr"];
  const language = supportedLanguages.includes(params?.lang) ? params.lang : "de";
  const terms = getTermsAndConditions(language);

  return {
    title: `${terms.title} | Fragmento`,
    description: terms.subtitle,
  };
}

export default async function TermsAndConditionsPage({ searchParams }) {
  const params = await searchParams;
  const supportedLanguages = ["de", "en", "es", "fr", "ru", "tr"];
  const language = supportedLanguages.includes(params?.lang) ? params.lang : "de";
  const { title, subtitle, effectiveDate, sections } = getTermsAndConditions(language);
  const pageCopy = {
    de: { eyebrow: "Rechtliche Angaben", back: "Zurück" },
    en: { eyebrow: "Legal information", back: "Back" },
    es: { eyebrow: "Información legal", back: "Volver" },
    fr: { eyebrow: "Informations juridiques", back: "Retour" },
    ru: { eyebrow: "Правовая информация", back: "Назад" },
    tr: { eyebrow: "Yasal bilgiler", back: "Geri" },
  };
  const copy = pageCopy[language];

  return (
    <main className="legal-page terms-page" lang={language}>
      <article className="legal-page__card terms-page__card">
        <header className="terms-page__header">
          <p className="legal-page__eyebrow">{copy.eyebrow}</p>
          <ImpressumBackLink label={copy.back} />
          <h1>{title}</h1>
          <p className="terms-page__subtitle">{subtitle}</p>
          <p className="terms-page__date">{effectiveDate}</p>
          <p><a href={AGB_PDF_URL} target="_blank" rel="noopener noreferrer">{legalLinkCopy[language].terms}</a></p>
        </header>

        <div className="terms-page__body">
          {sections.map((section, index) => (
            <section key={section.title} id={`agb-${index + 1}`} className="legal-page__section terms-page__section">
              <h2><span>{index + 1}</span>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <LegalParagraph key={paragraph} text={paragraph} language={language} />)}
              {section.callout ? (
                <aside className="terms-page__callout">
                  <h3>{section.callout.title}</h3>
                  {section.callout.paragraphs.map((paragraph) => <LegalParagraph key={paragraph} text={paragraph} language={language} />)}
                </aside>
              ) : null}
              {section.note ? <p className="terms-page__note">{section.note}</p> : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
