"use client";

import Link from "next/link";
import { useState } from "react";

const COPY = {
  de: {
    eyebrow: "Widerruf",
    title: "Vertrag widerrufen",
    intro: "Mit diesem Formular erklären Sie den Widerruf Ihrer vollständigen Bestellung. Nach dem Absenden erhalten Sie zunächst eine Eingangsbestätigung. Die Bestellung ist erst storniert, wenn die Bearbeitung bestätigt wurde.",
    orderNumber: "Vertragsnummer*",
    orderPlaceholder: "z. B. 670123456",
    name: "Vor- und Nachname*",
    namePlaceholder: "Name wie in der Bestellung",
    email: "E-Mail-Adresse*",
    emailHelp: "An diese Adresse senden wir die Eingangsbestätigung und die endgültige Entscheidung.",
    reason: "Grund*",
    reasonPlaceholder: "Bitte geben Sie den Grund für Ihren Widerruf an.",
    continue: "Angaben prüfen",
    reviewTitle: "Widerruf prüfen",
    declaration: "Ich widerrufe die vollständige Bestellung.",
    edit: "Angaben ändern",
    confirm: "Widerruf bestätigen",
    sending: "Wird übermittelt...",
    successTitle: "Widerruf registriert",
    success: "Ihre Erklärung wurde registriert und wird geprüft. Die Bestellung ist noch nicht als storniert markiert.",
    reference: "Referenz",
    notificationPending: "Die Erklärung ist gespeichert. Mindestens eine E-Mail konnte noch nicht zugestellt werden und wird im Admin-Dashboard angezeigt.",
    back: "Zurück zu Fragmento",
    error: "Der Widerruf konnte nicht registriert werden.",
    german: "Deutsch",
    english: "English",
  },
  en: {
    eyebrow: "Withdrawal",
    title: "Withdraw from contract",
    intro: "Use this form to withdraw from your complete order. You will first receive an acknowledgement. The order is only marked as cancelled after processing has been confirmed.",
    orderNumber: "Contract number*",
    orderPlaceholder: "e.g. 670123456",
    name: "First and last name*",
    namePlaceholder: "Name used for the order",
    email: "Email address*",
    emailHelp: "We send the acknowledgement and final decision to this address.",
    reason: "Reason*",
    reasonPlaceholder: "Please tell us why you are withdrawing.",
    continue: "Review details",
    reviewTitle: "Review withdrawal",
    declaration: "I withdraw from the complete order.",
    edit: "Edit details",
    confirm: "Confirm withdrawal",
    sending: "Submitting...",
    successTitle: "Withdrawal registered",
    success: "Your declaration has been registered and will be reviewed. The order has not yet been marked as cancelled.",
    reference: "Reference",
    notificationPending: "The declaration is saved. At least one email could not yet be delivered and is visible in the admin dashboard.",
    back: "Back to Fragmento",
    error: "The withdrawal could not be registered.",
    german: "Deutsch",
    english: "English",
  },
};

export default function OrderCancellationForm({ initialLanguage = "de", initialContractNumber = "" }) {
  const language = initialLanguage === "en" ? "en" : "de";
  const copy = COPY[language];
  const [form, setForm] = useState({
    contractNumber: initialContractNumber,
    consumerName: "",
    email: "",
    reason: "",
  });
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

  const languageHref = (nextLanguage) => {
    const params = new URLSearchParams({ lang: nextLanguage });
    if (form.contractNumber) params.set("contract", form.contractNumber);
    return `/widerruf?${params.toString()}`;
  };

  return (
    <main className="withdrawal-page">
      <section className="withdrawal-card">
        <div className="withdrawal-language-switch" aria-label="Language">
          <Link className={language === "de" ? "is-active" : ""} href={languageHref("de")}>{copy.german}</Link>
          <Link className={language === "en" ? "is-active" : ""} href={languageHref("en")}>{copy.english}</Link>
        </div>

        <span className="withdrawal-eyebrow">{copy.eyebrow}</span>
        <h1>{result ? copy.successTitle : isReviewing ? copy.reviewTitle : copy.title}</h1>

        {result ? (
          <div className="withdrawal-success" role="status">
            <p>{copy.success}</p>
            <strong>{copy.reference}: {result.referenceNumber}</strong>
            {result.notificationPending ? <p className="withdrawal-warning">{copy.notificationPending}</p> : null}
            <Link className="withdrawal-primary-link" href="/">{copy.back}</Link>
          </div>
        ) : isReviewing ? (
          <div className="withdrawal-review">
            <p className="withdrawal-declaration">{copy.declaration}</p>
            <dl>
              <div><dt>{copy.orderNumber.replace("*", "")}</dt><dd>{form.contractNumber}</dd></div>
              <div><dt>{copy.name.replace("*", "")}</dt><dd>{form.consumerName}</dd></div>
              <div><dt>{copy.email.replace("*", "")}</dt><dd>{form.email}</dd></div>
              <div><dt>{copy.reason.replace("*", "")}</dt><dd>{form.reason}</dd></div>
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
            <form className="withdrawal-form" onSubmit={review}>
              <label>
                <span>{copy.orderNumber}</span>
                <input name="contractNumber" value={form.contractNumber} onChange={updateField} placeholder={copy.orderPlaceholder} maxLength={80} required />
              </label>
              <label>
                <span>{copy.name}</span>
                <input name="consumerName" value={form.consumerName} onChange={updateField} placeholder={copy.namePlaceholder} autoComplete="name" maxLength={160} required />
              </label>
              <label>
                <span>{copy.email}</span>
                <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength={254} required />
                <small>{copy.emailHelp}</small>
              </label>
              <label>
                <span>{copy.reason}</span>
                <textarea name="reason" value={form.reason} onChange={updateField} placeholder={copy.reasonPlaceholder} maxLength={2000} rows={4} required />
              </label>
              {error ? <p className="withdrawal-error" role="alert">{error}</p> : null}
              <button type="submit" className="withdrawal-primary-button">{copy.continue}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
