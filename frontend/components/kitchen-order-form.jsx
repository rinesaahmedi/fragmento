"use client";

import styles from "./kitchen-configurator.module.css";

const PAYMENT_METHOD_OPTIONS = [
  { value: "paypal", label: "PayPal" },
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "klarna", label: "Klarna" },
];

const PAYMENT_METHOD_STYLE_BY_VALUE = {
  paypal: "paypal",
  visa: "visa",
  mastercard: "mastercard",
  klarna: "klarna",
};

export default function KitchenOrderForm({
  orderSectionRef,
  customer,
  isSubmitting,
  status,
  statusTone,
  onSubmit,
  onUpdateCustomer,
}) {
  return (
    <section ref={orderSectionRef} className={styles.orderSectionWrap}>
      <div className={styles.orderPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Bestellung abschliessen</h2>
            <p className={styles.panelIntro}>
              Gib deine Kontaktdaten ein. Wir senden dir eine Bestellbestaetigung per E-Mail.
            </p>
          </div>
        </div>
        <form id="order-form" className={styles.orderForm} onSubmit={onSubmit}>
          <input
            id="contractNumber"
            type="hidden"
            value={customer.contractNumber}
            onChange={(event) => onUpdateCustomer("contractNumber", event.target.value)}
          />
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="firstName">Vorname*</label>
            <input id="firstName" required placeholder="Max" value={customer.firstName} onChange={(event) => onUpdateCustomer("firstName", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="lastName">Nachname*</label>
            <input id="lastName" required placeholder="Mustermann" value={customer.lastName} onChange={(event) => onUpdateCustomer("lastName", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="email">E-Mail*</label>
            <input id="email" type="email" required placeholder="max@example.com" value={customer.email} onChange={(event) => onUpdateCustomer("email", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldQuarter].join(" ")}>
            <label htmlFor="phone">Telefon*</label>
            <input id="phone" required placeholder="+49 170 1234567" value={customer.phone} onChange={(event) => onUpdateCustomer("phone", event.target.value)} />
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="address1">Adresse (Straße, Nr.)*</label>
            <input id="address1" required placeholder="Musterstraße 1" value={customer.address1} onChange={(event) => onUpdateCustomer("address1", event.target.value)} />
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="address2">Adresszusatz (optional)</label>
            <input id="address2" placeholder="Wohnung, Firma, etc." value={customer.address2} onChange={(event) => onUpdateCustomer("address2", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="postalCode">PLZ*</label>
            <input id="postalCode" required placeholder="10115" value={customer.postalCode} onChange={(event) => onUpdateCustomer("postalCode", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="city">Stadt*</label>
            <input id="city" required placeholder="Berlin" value={customer.city} onChange={(event) => onUpdateCustomer("city", event.target.value)} />
          </div>
          <div className={[styles.field, styles.fieldThird].join(" ")}>
            <label htmlFor="country">Land*</label>
            <input id="country" required placeholder="Deutschland" value={customer.country} onChange={(event) => onUpdateCustomer("country", event.target.value)} />
          </div>
          <div className={styles.fieldFull}>
            <label htmlFor="notes">Anmerkungen (optional)</label>
            <textarea
              id="notes"
              rows="3"
              value={customer.notes}
              onChange={(event) => onUpdateCustomer("notes", event.target.value)}
              placeholder="Hinweise zur Lieferung, Wunschtermine, etc."
            />
          </div>
          <div className={styles.checkboxRow}>
            <input
              id="consent"
              type="checkbox"
              checked={customer.consent}
              onChange={(event) => onUpdateCustomer("consent", event.target.checked)}
            />
            <label htmlFor="consent">
              Ich stimme der Verarbeitung meiner Daten zum Zweck der Bestellung zu.*
            </label>
          </div>
          <div className={styles.fieldFull}>
            <div className={styles.paymentSection}>
              <label>Zahlungsmethode auswaehlen*</label>
              <div className={styles.paymentOptions} role="radiogroup" aria-label="Zahlungsmethode">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const selected = customer.paymentMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        styles.paymentOption,
                        selected ? styles.paymentOptionSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onUpdateCustomer("paymentMethod", option.value)}
                      aria-pressed={selected}
                    >
                      <span
                        className={[
                          styles.paymentLogo,
                          styles[`paymentLogo${PAYMENT_METHOD_STYLE_BY_VALUE[option.value]?.charAt(0).toUpperCase()}${PAYMENT_METHOD_STYLE_BY_VALUE[option.value]?.slice(1)}`],
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className={styles.paymentLogoLabel}>{option.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.orderSubmitRow}>
            <button type="submit" form="order-form" className={styles.orderSubmitButton} disabled={isSubmitting}>
              {isSubmitting ? "Wird gesendet..." : "Bestellbestaetigung senden"}
            </button>
          </div>
          <small className={styles.orderHelp}>Mit * gekennzeichnete Felder sind Pflichtfelder.</small>
        </form>

        <div
          className={[
            styles.status,
            statusTone === "error" ? styles.statusError : "",
            statusTone === "success" ? styles.statusSuccess : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status}
        </div>
      </div>
    </section>
  );
}
