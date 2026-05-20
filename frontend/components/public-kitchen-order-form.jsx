"use client";

import { useMemo, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import { usePublicI18n } from "./public-i18n";
import { COUNTRY_CITY_OPTIONS, POSTAL_CODE_OPTIONS } from "./kitchen-order-form";

const COUNTRY_LABELS = {
  Deutschland: "Germany",
  Oesterreich: "Austria",
  Schweiz: "Switzerland",
  Ungarn: "Hungary",
  Kosovo: "Kosovo",
  Tschechien: "Czechia",
  Slowakei: "Slovakia",
  Polen: "Poland",
};

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function uniqueOptions(values = [], fallback = "") {
  return [...new Set([fallback, ...values].filter(Boolean))];
}

function contractCountryToCustomerCountry(country) {
  if (!country) return "";
  return Object.entries(COUNTRY_LABELS).find(([, englishLabel]) => englishLabel === country)?.[0] || country;
}

function formatCountryLabel(country, translate) {
  const normalizedCountry = contractCountryToCustomerCountry(country);
  return translate(`countries.${normalizedCountry}`, COUNTRY_LABELS[normalizedCountry] || country || "");
}

function buildAddressLines(address, translate) {
  return [
    [address?.address1, address?.address2].filter(Boolean).join(", "),
    [address?.postalCode, address?.city].filter(Boolean).join(" "),
    formatCountryLabel(address?.country, translate),
  ].filter(Boolean);
}

export default function PublicKitchenOrderForm({
  orderSectionRef,
  customer,
  contractAddress,
  isUsingContractAddress,
  isSubmitting,
  status,
  statusTone,
  onSubmit,
  onUpdateCustomer,
  onToggleUseContractAddress,
}) {
  const { language, translate } = usePublicI18n();
  const [touchedFields, setTouchedFields] = useState({});
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [showSavedDetails, setShowSavedDetails] = useState(false);
  const fieldErrorMessages = useMemo(() => ({
    firstName: translate("order.fieldErrors.firstName", "Please enter the first name."),
    lastName: translate("order.fieldErrors.lastName", "Please enter the last name."),
    email: translate("order.fieldErrors.email", "Please enter the email address."),
    phone: translate("order.fieldErrors.phone", "Please enter the phone number."),
    address1: translate("order.fieldErrors.address1", "Please enter the street and house number."),
    country: translate("order.fieldErrors.country", "Please select a country."),
    city: translate("order.fieldErrors.city", "Please select a city."),
    postalCode: translate("order.fieldErrors.postalCode", "Please select a postal code."),
    consent: translate("order.fieldErrors.consent", "Please accept the privacy statement."),
  }), [translate]);
  const countryOptions = uniqueOptions(Object.keys(COUNTRY_CITY_OPTIONS), customer.country);
  const cityOptions = uniqueOptions(COUNTRY_CITY_OPTIONS[customer.country] || [], customer.city);
  const postalCodeOptions = uniqueOptions(POSTAL_CODE_OPTIONS[customer.city] || [], customer.postalCode);
  const contractAddressLines = buildAddressLines(contractAddress, translate);
  const canUseContractAddress = contractAddressLines.length > 0;
  const savedAddressLines = buildAddressLines(customer, translate);
  const savedHelpText = translate("order.savedHelp", "");

  function markFieldTouched(fieldKey) {
    setTouchedFields((current) => (current[fieldKey] ? current : { ...current, [fieldKey]: true }));
  }

  function hasFieldError(fieldKey, required = false) {
    if (!required) return false;
    if (!hasTriedSubmit && !touchedFields[fieldKey]) return false;
    return fieldKey === "consent" ? !customer.consent : !normalizeValue(customer[fieldKey]);
  }

  function getFieldClassName(fieldKey, required = false, baseClassName = styles.field) {
    return [
      baseClassName,
      hasFieldError(fieldKey, required) ? styles.fieldInvalid : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function renderFieldError(fieldKey, required = false) {
    if (!hasFieldError(fieldKey, required)) return null;

    return (
      <span className={styles.fieldError} role="alert">
        {fieldErrorMessages[fieldKey] || translate("order.fieldRequired", "This field is required.")}
      </span>
    );
  }

  function handleFormSubmit(event) {
    setHasTriedSubmit(true);
    onSubmit(event);
  }

  function renderSavedDetail(label, value) {
    return (
      <div className={styles.orderConfirmationDetail}>
        <dt>{label}</dt>
        <dd>{value || translate("order.notProvided", "Not provided")}</dd>
      </div>
    );
  }

  const isOrderSaved = statusTone === "success" && Boolean(status);

  return (
    <section ref={orderSectionRef} className={styles.orderSectionWrap}>
      <div className={styles.orderPanel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>{translate("order.title", "Complete order")}</h2>
          </div>
        </div>
        {isOrderSaved ? (
          <div className={styles.orderConfirmation} role="status" aria-live="polite">
            <div className={styles.orderConfirmationBadge} aria-hidden="true">OK</div>
            <div>
              <h3>{translate("order.savedTitle", "Thank you")}</h3>
              <p>{status}</p>
              {savedHelpText.trim() ? (
                <p className={styles.orderConfirmationHelp}>{savedHelpText}</p>
              ) : null}
              <button
                type="button"
                className={styles.orderConfirmationDetailsButton}
                aria-expanded={showSavedDetails}
                onClick={() => setShowSavedDetails((current) => !current)}
              >
                {showSavedDetails
                  ? translate("order.hideSavedDetails", "Hide order details")
                  : translate("order.showSavedDetails", "View order details")}
              </button>
              {showSavedDetails ? (
                <div className={styles.orderConfirmationDetails}>
                  <h4>{translate("order.savedDetailsTitle", "Submitted details")}</h4>
                  <dl>
                    {renderSavedDetail(translate("order.contractNumber", "Contract number"), customer.contractNumber)}
                    {renderSavedDetail(translate("order.contactPersonTitle", "Contact person"), [customer.firstName, customer.lastName].filter(Boolean).join(" "))}
                    {renderSavedDetail(translate("order.email", "Email*"), customer.email)}
                    {renderSavedDetail(translate("order.phone", "Phone*"), customer.phone)}
                    {renderSavedDetail(
                      translate("order.addressTitle", "Order / billing address"),
                      savedAddressLines.join(", ") || (isUsingContractAddress ? translate("order.usingContractAddress", "The contract address will be used for this order.") : ""),
                    )}
                    {renderSavedDetail(translate("order.notes", "Notes (optional)"), customer.notes)}
                  </dl>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            id="order-form"
            className={styles.orderForm}
            autoComplete="on"
            onSubmit={handleFormSubmit}
            onInvalidCapture={() => setHasTriedSubmit(true)}
          >
            <input id="contractNumber" type="hidden" value={customer.contractNumber} readOnly />

            <div className={styles.orderSectionCard}>
              <div className={styles.orderSectionHeader}>
                <div>
                  <h3>{translate("order.contactPersonTitle", "Contact person")}</h3>
                  <p>{translate("order.contactPersonHelp", "Who is ordering?")}</p>
                </div>
              </div>
              <div className={styles.sectionFields}>
                <div className={getFieldClassName("firstName", true, styles.field)}>
                  <label htmlFor="firstName">{translate("order.firstName", "First name*")}</label>
                  <input
                    id="firstName"
                    name="given-name"
                    autoComplete="given-name"
                    required
                    placeholder="Max"
                    value={customer.firstName}
                    onBlur={() => markFieldTouched("firstName")}
                    onChange={(event) => onUpdateCustomer("firstName", event.target.value)}
                    aria-invalid={hasFieldError("firstName", true)}
                  />
                  {renderFieldError("firstName", true)}
                </div>
                <div className={getFieldClassName("lastName", true, styles.field)}>
                  <label htmlFor="lastName">{translate("order.lastName", "Last name*")}</label>
                  <input
                    id="lastName"
                    name="family-name"
                    autoComplete="family-name"
                    required
                    placeholder="Mustermann"
                    value={customer.lastName}
                    onBlur={() => markFieldTouched("lastName")}
                    onChange={(event) => onUpdateCustomer("lastName", event.target.value)}
                    aria-invalid={hasFieldError("lastName", true)}
                  />
                  {renderFieldError("lastName", true)}
                </div>
                <div className={getFieldClassName("email", true, styles.field)}>
                  <label htmlFor="email">{translate("order.email", "Email*")}</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="max@example.com"
                    value={customer.email}
                    onBlur={() => markFieldTouched("email")}
                    onChange={(event) => onUpdateCustomer("email", event.target.value)}
                    aria-invalid={hasFieldError("email", true)}
                  />
                  {renderFieldError("email", true)}
                </div>
                <div className={getFieldClassName("phone", true, styles.field)}>
                  <label htmlFor="phone">{translate("order.phone", "Phone*")}</label>
                  <input
                    id="phone"
                    name="tel"
                    autoComplete="tel"
                    required
                    placeholder="+49 170 1234567"
                    value={customer.phone}
                    onBlur={() => markFieldTouched("phone")}
                    onChange={(event) => onUpdateCustomer("phone", event.target.value)}
                    aria-invalid={hasFieldError("phone", true)}
                  />
                  {renderFieldError("phone", true)}
                </div>
              </div>
            </div>

            <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>{translate("order.addressTitle", "Order / billing address")}</h3>
                <p>{translate("order.addressHelp", "Choose whether the contract address should be used for this order.")}</p>
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                id="use-object-address"
                type="checkbox"
                checked={isUsingContractAddress}
                disabled={!canUseContractAddress}
                onChange={(event) => onToggleUseContractAddress(event.target.checked)}
              />
              <label htmlFor="use-object-address">
                {translate("order.useContractAddress", "Use the property address as the order / billing address")}
              </label>
            </div>
            {isUsingContractAddress ? (
              <p className={styles.sectionHint}>{translate("order.usingContractAddress", "The contract address will be used for this order.")}</p>
            ) : (
              <div className={styles.sectionFields}>
                <div className={getFieldClassName("address1", true, styles.fieldFull)}>
                  <label htmlFor="address1">{translate("order.address1", "Address (street, no.)*")}</label>
                  <input
                    id="address1"
                    name="address-line1"
                    autoComplete="address-line1"
                    required
                    placeholder="Musterstraße 1"
                    value={customer.address1}
                    onBlur={() => markFieldTouched("address1")}
                    onChange={(event) => onUpdateCustomer("address1", event.target.value)}
                    aria-invalid={hasFieldError("address1", true)}
                  />
                  {renderFieldError("address1", true)}
                </div>
                <div className={getFieldClassName("address2", false, styles.fieldFull)}>
                  <label htmlFor="address2">{translate("order.address2", "Address line 2")}</label>
                  <input
                    id="address2"
                    name="address-line2"
                    autoComplete="address-line2"
                    placeholder={translate("order.address2Placeholder", "Apartment, company, etc.")}
                    value={customer.address2}
                    onBlur={() => markFieldTouched("address2")}
                    onChange={(event) => onUpdateCustomer("address2", event.target.value)}
                  />
                </div>
                <div className={getFieldClassName("country", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="country">{translate("order.country", "Country*")}</label>
                  <select
                    id="country"
                    name="country"
                    autoComplete="country-name"
                    required
                    value={customer.country}
                    onBlur={() => markFieldTouched("country")}
                    onChange={(event) => {
                      const nextCountry = event.target.value;
                      onUpdateCustomer("country", nextCountry);
                      onUpdateCustomer("city", "");
                      onUpdateCustomer("postalCode", "");
                    }}
                    aria-invalid={hasFieldError("country", true)}
                  >
                    <option value="">{translate("order.selectCountry", "Select country")}</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>{translate(`countries.${country}`, COUNTRY_LABELS[country] || country)}</option>
                    ))}
                  </select>
                  {renderFieldError("country", true)}
                </div>
                <div className={getFieldClassName("city", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="city">{translate("order.city", "City*")}</label>
                  <select
                    id="city"
                    name="address-level2"
                    autoComplete="address-level2"
                    required
                    value={customer.city}
                    disabled={!customer.country}
                    onBlur={() => markFieldTouched("city")}
                    onChange={(event) => {
                      onUpdateCustomer("city", event.target.value);
                      onUpdateCustomer("postalCode", "");
                    }}
                    aria-invalid={hasFieldError("city", true)}
                  >
                    <option value="">{customer.country ? translate("order.selectCity", "Select city") : translate("order.selectCountryFirst", "Select country first")}</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  {renderFieldError("city", true)}
                </div>
                <div className={getFieldClassName("postalCode", true, [styles.field, styles.fieldThird].join(" "))}>
                  <label htmlFor="postalCode">{translate("order.postalCode", "Postal code*")}</label>
                  <select
                    id="postalCode"
                    name="postal-code"
                    autoComplete="postal-code"
                    required
                    value={customer.postalCode}
                    disabled={!customer.city}
                    onBlur={() => markFieldTouched("postalCode")}
                    onChange={(event) => onUpdateCustomer("postalCode", event.target.value)}
                    aria-invalid={hasFieldError("postalCode", true)}
                  >
                    <option value="">{customer.city ? translate("order.selectPostalCode", "Select postal code") : translate("order.selectCityFirst", "Select city first")}</option>
                    {postalCodeOptions.map((postalCode) => (
                      <option key={postalCode} value={postalCode}>{postalCode}</option>
                    ))}
                  </select>
                  {renderFieldError("postalCode", true)}
                </div>
              </div>
            )}
          </div>

          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>{translate("order.paymentConsentTitle", "Order notes")}</h3>
                <p>{translate("order.paymentConsentHelp", "Add delivery details if needed, then confirm the privacy notice.")}</p>
              </div>
            </div>
            <div className={styles.sectionFields}>
              <div className={styles.fieldFull}>
                <label htmlFor="notes">{translate("order.notes", "Notes (optional)")}</label>
                <textarea
                  id="notes"
                  rows="3"
                  value={customer.notes}
                  onBlur={() => markFieldTouched("notes")}
                  onChange={(event) => onUpdateCustomer("notes", event.target.value)}
                  placeholder={translate("order.notesPlaceholder", "Delivery notes, preferred dates, etc.")}
                />
              </div>
            </div>
            <div className={styles.checkboxRow}>
              <input
                id="consent"
                type="checkbox"
                checked={customer.consent}
                onBlur={() => markFieldTouched("consent")}
                onChange={(event) => {
                  markFieldTouched("consent");
                  onUpdateCustomer("consent", event.target.checked);
                }}
              />
              <label htmlFor="consent">
                {translate("order.consentPrefix", "I have read the ")}
                <a
                  href={language === "de" ? "https://myarchitecto.de/datenschutz/" : "https://myarchitecto.de/en/privacy-policy/"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {translate("order.privacyPolicy", "privacy policy")}
                </a>
                {translate("order.consentSuffix", " and confirm that my order data may be used to process this order.*")}
              </label>
            </div>
            {renderFieldError("consent", true)}
            <div className={styles.orderSubmitRow}>
              <button type="submit" form="order-form" className={styles.orderSubmitButton} disabled={isSubmitting}>
                {isSubmitting ? translate("order.submitSaving", "Saving...") : translate("order.submit", "Order and pay")}
              </button>
            </div>
            <small className={styles.orderHelp}>{translate("order.requiredHint", "Fields marked with * are required.")}</small>
          </div>
          </form>
        )}

        {!isOrderSaved ? (
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
        ) : null}
      </div>
    </section>
  );
}
