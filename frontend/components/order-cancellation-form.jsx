"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { activatePublicLanguage } from "../lib/public-language-state";

const COPY = {
  de: {
    eyebrow: "Widerruf",
    title: "Widerrufsformular",
    intro: "Geben Sie unten Ihre Daten ein.",
    addressedTo: "An",
    recipient: ["architecto by KA GmbH", "Senefelderstraße 2b", "38124 Braunschweig", "E-Mail: info@myarchitecto.de"],
    subjectTitle: "Angaben zum Widerruf",
    customerTitle: "Ihre Angaben",
    firstName: "Vorname*",
    lastName: "Nachname*",
    street: "Straße und Hausnummer*",
    city: "Ort*",
    postalCode: "Postleitzahl*",
    dateLegend: "Datum (optional)",
    requiredHint: "* Pflichtfeld",
    processingNote: "Sie erhalten eine Eingangsbestätigung per E-Mail.",
    orderNumber: "Vertragsnummer*",
    orderPlaceholder: "z. B. 670123456",
    goods: "Waren / Dienstleistung*",
    goodsPlaceholder: "Bitte beschreiben Sie die bestellten Waren oder die Dienstleistung.",
    orderedOn: "Bestellt am",
    receivedOn: "Erhalten am",
    name: "Name des/der Verbraucher(s)*",
    namePlaceholder: "Name wie in der Bestellung",
    address: "Anschrift des/der Verbraucher(s)*",
    addressPlaceholder: "Straße und Hausnummer, Postleitzahl und Ort",
    email: "E-Mail-Adresse*",
    emailHelp: "An diese Adresse senden wir die Eingangsbestätigung und die endgültige Entscheidung.",
    continue: "Angaben prüfen",
    reviewTitle: "Widerruf prüfen",
    declaration: "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):",
    edit: "Angaben ändern",
    confirm: "Widerruf bestätigen",
    sending: "Wird übermittelt...",
    successTitle: "Widerruf registriert",
    download: "PDF herunterladen",
    downloadError: "Das PDF konnte nicht erstellt werden.",
    success: "Wir benachrichtigen Sie nach der Prüfung per E-Mail.",
    reference: "Widerrufsreferenz",
    notificationPending: "Die Erklärung ist gespeichert. Mindestens eine E-Mail konnte noch nicht zugestellt werden und wird im Admin-Dashboard angezeigt.",
    back: "Zurück zu Fragmento",
    error: "Der Widerruf konnte nicht registriert werden.",
    german: "Deutsch",
    english: "English",
  },
  en: {
    eyebrow: "Withdrawal",
    title: "Withdrawal form",
    intro: "Enter your details below.",
    addressedTo: "To",
    recipient: ["architecto by KA GmbH", "Senefelderstraße 2b", "38124 Braunschweig", "Email: info@myarchitecto.de"],
    subjectTitle: "Withdrawal details",
    customerTitle: "Your details",
    firstName: "First name*",
    lastName: "Last name*",
    street: "Street and house number*",
    city: "City*",
    postalCode: "Postal code*",
    dateLegend: "Dates (optional)",
    requiredHint: "* Required field",
    processingNote: "You will receive an acknowledgement by email.",
    orderNumber: "Contract number*",
    orderPlaceholder: "e.g. 670123456",
    goods: "Goods / service*",
    goodsPlaceholder: "Please describe the ordered goods or service.",
    orderedOn: "Ordered on",
    receivedOn: "Received on",
    name: "Name of consumer(s)*",
    namePlaceholder: "Name used for the order",
    address: "Address of consumer(s)*",
    addressPlaceholder: "Street and number, postal code and city",
    email: "Email address*",
    emailHelp: "We send the acknowledgement and final decision to this address.",
    continue: "Review details",
    reviewTitle: "Review withdrawal",
    declaration: "I/We (*) hereby give notice that I/we (*) withdraw from my/our (*) contract for the purchase of the following goods (*) / the provision of the following service (*):",
    edit: "Edit details",
    confirm: "Confirm withdrawal",
    sending: "Submitting...",
    successTitle: "Withdrawal registered",
    download: "Download PDF",
    downloadError: "The PDF could not be created.",
    success: "We will notify you by email after the review.",
    reference: "Withdrawal reference",
    notificationPending: "The declaration is saved. At least one email could not yet be delivered and is visible in the admin dashboard.",
    back: "Back to Fragmento",
    error: "The withdrawal could not be registered.",
    german: "Deutsch",
    english: "English",
  },
};

export default function OrderCancellationForm({ initialLanguage = "de", initialContractNumber = "" }) {
  const [language, setLanguage] = useState(initialLanguage === "en" ? "en" : "de");
  const copy = COPY[language];
  const [form, setForm] = useState({
    contractNumber: initialContractNumber,
    productDescription: "",
    orderedOn: "",
    receivedOn: "",
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    postalCode: "",
    email: "",
  });
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const reviewName = `${form.firstName.trim().replace(/\s+/g, " ")} ${form.lastName.trim().replace(/\s+/g, " ")}`;
  const reviewContractNumber = form.contractNumber.trim().replace(/\s+/g, "").toUpperCase();
  const reviewGoods = form.productDescription.trim().replace(/\s+/g, " ");
  const reviewDeclaration = language === "en"
    ? `I, ${reviewName}, hereby withdraw from the contract for the following goods or services (${reviewGoods}), contract number ${reviewContractNumber}.`
    : `Ich, ${reviewName}, widerrufe hiermit den Vertrag über den Kauf der folgenden Waren bzw. die Erbringung der folgenden Dienstleistung (${reviewGoods}), Vertragsnummer ${reviewContractNumber}.`;

  useEffect(() => {
    activatePublicLanguage(language);
  }, [language]);

  function changeLanguage(nextLanguage) {
    if (nextLanguage === language) return;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", nextLanguage);
    window.history.replaceState(window.history.state, "", url.toString());
    setLanguage(nextLanguage);
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  function review(event) {
    event.preventDefault();
    setError("");
    setIsReviewing(true);
  }

  async function submitWithdrawal() {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/order-cancellations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || copy.error);
      setResult(payload);
    } catch (submissionError) {
      setError(submissionError.message || copy.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function downloadPdf() {
    try {
      const { createWithdrawalPdf } = await import("../lib/withdrawal-pdf");
      createWithdrawalPdf(result.withdrawal).save(`Widerruf-${result.referenceNumber}.pdf`);
    } catch {
      setError(copy.downloadError);
    }
  }

  return (
    <main className="withdrawal-page">
      <section className="withdrawal-card">
        <div className="withdrawal-language-switch" aria-label="Language">
          <button type="button" className={language === "de" ? "is-active" : ""} aria-pressed={language === "de"} onClick={() => changeLanguage("de")}>{copy.german}</button>
          <button type="button" className={language === "en" ? "is-active" : ""} aria-pressed={language === "en"} onClick={() => changeLanguage("en")}>{copy.english}</button>
        </div>

        <span className="withdrawal-eyebrow">{copy.eyebrow}</span>
        <h1>{result ? copy.successTitle : isReviewing ? copy.reviewTitle : copy.title}</h1>

        {result ? (
          <div className="withdrawal-success" role="status">
            <p>{copy.success}</p>
            <strong>{copy.reference}: {result.referenceNumber}</strong>
            {result.notificationPending ? <p className="withdrawal-warning">{copy.notificationPending}</p> : null}
            <button type="button" className="withdrawal-secondary-button" onClick={downloadPdf}>{copy.download}</button>
            {error ? <p className="withdrawal-error" role="alert">{error}</p> : null}
            <Link className="withdrawal-primary-link" href="/">{copy.back}</Link>
          </div>
        ) : isReviewing ? (
          <div className="withdrawal-review">
            <p className="withdrawal-declaration">{reviewDeclaration}</p>
            <dl>
              <div><dt>{copy.goods.replace("*", "")}</dt><dd>{form.productDescription}</dd></div>
              {form.orderedOn ? <div><dt>{copy.orderedOn}</dt><dd>{form.orderedOn}</dd></div> : null}
              {form.receivedOn ? <div><dt>{copy.receivedOn}</dt><dd>{form.receivedOn}</dd></div> : null}
              <div><dt>{copy.firstName.replace("*", "")}</dt><dd>{form.firstName}</dd></div>
              <div><dt>{copy.lastName.replace("*", "")}</dt><dd>{form.lastName}</dd></div>
              <div><dt>{copy.street.replace("*", "")}</dt><dd>{form.street}</dd></div>
              <div><dt>{copy.city.replace("*", "")}</dt><dd>{form.city}</dd></div>
              <div><dt>{copy.postalCode.replace("*", "")}</dt><dd>{form.postalCode}</dd></div>
              <div><dt>{copy.orderNumber.replace("*", "")}</dt><dd>{form.contractNumber}</dd></div>
              <div><dt>{copy.email.replace("*", "")}</dt><dd>{form.email}</dd></div>
            </dl>
            {error ? <p className="withdrawal-error" role="alert">{error}</p> : null}
            <div className="withdrawal-actions">
              <button type="button" className="withdrawal-secondary-button" onClick={() => setIsReviewing(false)} disabled={isSubmitting}>{copy.edit}</button>
              <button type="button" className="withdrawal-primary-button" onClick={submitWithdrawal} disabled={isSubmitting}>
                {isSubmitting ? copy.sending : copy.confirm}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="withdrawal-intro">{copy.intro}</p>
            <div className="withdrawal-recipient">
              <strong>{copy.addressedTo}:</strong>
              <address>{copy.recipient.map((line) => <span key={line}>{line}</span>)}</address>
            </div>
            <p className="withdrawal-declaration">{copy.declaration}</p>
            <form className="withdrawal-form" onSubmit={review}>
              <span className="withdrawal-required-hint">{copy.requiredHint}</span>

              <section className="withdrawal-form-section" aria-labelledby="withdrawal-customer-title">
                <header className="withdrawal-form-section__header">
                  <h2 id="withdrawal-customer-title">{copy.customerTitle}</h2>
                </header>
                <fieldset className="withdrawal-date-fields">
                  <legend>{copy.dateLegend}</legend>
                  <div className="withdrawal-form-row">
                    <label>
                      <span>{copy.orderedOn}</span>
                      <input name="orderedOn" type="date" value={form.orderedOn} onChange={updateField} />
                    </label>
                    <label>
                      <span>{copy.receivedOn}</span>
                      <input name="receivedOn" type="date" value={form.receivedOn} onChange={updateField} />
                    </label>
                  </div>
                </fieldset>
                <div className="withdrawal-form-row">
                  <label>
                    <span>{copy.firstName}</span>
                    <input name="firstName" value={form.firstName} onChange={updateField} autoComplete="given-name" maxLength={80} required />
                  </label>
                  <label>
                    <span>{copy.lastName}</span>
                    <input name="lastName" value={form.lastName} onChange={updateField} autoComplete="family-name" maxLength={80} required />
                  </label>
                </div>
                <label>
                  <span>{copy.street}</span>
                  <input name="street" value={form.street} onChange={updateField} autoComplete="address-line1" maxLength={500} required />
                </label>
                <div className="withdrawal-form-row">
                  <label>
                    <span>{copy.city}</span>
                    <input name="city" value={form.city} onChange={updateField} autoComplete="address-level2" maxLength={160} required />
                  </label>
                  <label>
                    <span>{copy.postalCode}</span>
                    <input name="postalCode" value={form.postalCode} onChange={updateField} autoComplete="postal-code" maxLength={20} required />
                  </label>
                </div>
                <label>
                  <span>{copy.orderNumber}</span>
                  <input name="contractNumber" value={form.contractNumber} onChange={updateField} placeholder={copy.orderPlaceholder} maxLength={80} required />
                </label>
                <label>
                  <span>{copy.email}</span>
                  <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={254} required />
                  <small>{copy.emailHelp}</small>
                </label>
              </section>
              <section className="withdrawal-form-section" aria-labelledby="withdrawal-subject-title">
                <header className="withdrawal-form-section__header">
                  <h2 id="withdrawal-subject-title">{copy.subjectTitle}</h2>
                </header>
                <label>
                  <span>{copy.goods}</span>
                  <textarea name="productDescription" value={form.productDescription} onChange={updateField} placeholder={copy.goodsPlaceholder} maxLength={2000} rows={3} required />
                </label>
              </section>
              <p className="withdrawal-processing-note">{copy.processingNote}</p>
              {error ? <p className="withdrawal-error" role="alert">{error}</p> : null}
              <button type="submit" className="withdrawal-primary-button">{copy.continue}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
