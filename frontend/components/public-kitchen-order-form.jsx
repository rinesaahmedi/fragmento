"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import { usePublicI18n } from "./public-i18n";
import { COUNTRY_CITY_OPTIONS, POSTAL_CODE_OPTIONS } from "./kitchen-order-form";
import { getPreferredDeliveryDateAfterWeeks } from "../lib/preferred-delivery.js";

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

function getDateInputMinValue(leadTimeDays = 0) {
  const today = new Date();
  const parsedLeadTimeDays = Math.max(0, Math.floor(Number(leadTimeDays) || 0));
  today.setDate(today.getDate() + parsedLeadTimeDays);
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInputValue(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addUtcMonths(date, amount) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function buildCalendarDays(monthDate) {
  const firstOfMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
  const mondayStartOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const firstCalendarDate = new Date(firstOfMonth);
  firstCalendarDate.setUTCDate(firstOfMonth.getUTCDate() - mondayStartOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCalendarDate);
    date.setUTCDate(firstCalendarDate.getUTCDate() + index);
    return date;
  });
}

const DEFAULT_DELIVERY_LEAD_TIME_WEEKS = 4;
const DELIVERY_WEEK_OPTION_COUNT = 3;

function getDateAfterWeeks(weeks) {
  return getPreferredDeliveryDateAfterWeeks(weeks);
}

function getDeliveryWeekLabel(weeks, translate) {
  return translate("order.deliveryAfterWeeks", "After {weeks} weeks", { weeks });
}

function getDeliveryLeadTimeWeeks(deliveryLeadTimeDays) {
  return Math.max(
    DEFAULT_DELIVERY_LEAD_TIME_WEEKS,
    Math.ceil(Math.max(0, Number(deliveryLeadTimeDays) || 0) / 7),
  );
}

function formatDateForDisplay(value, locale = "en-GB") {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCalendarMonth(date, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function CustomDatePicker({
  id,
  value,
  min,
  today,
  locale,
  translate,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const minimumDate = parseDateValue(min);
  const todayDate = parseDateValue(today);
  const initialMonth = selectedDate || minimumDate || todayDate || new Date();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date(Date.UTC(initialMonth.getUTCFullYear(), initialMonth.getUTCMonth(), 1)),
  );
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedValue = value || "";
  const todayValue = today || "";
  const minValue = min || "";
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  function selectDate(date) {
    const nextValue = toDateInputValue(date);
    if (minValue && nextValue < minValue) return;
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className={styles.customDatePicker}>
      <input id={id} name="preferred-delivery-date" type="hidden" value={selectedValue} readOnly />
      <button
        type="button"
        className={styles.datePickerTrigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          {selectedValue
            ? formatDateForDisplay(selectedValue, locale)
            : translate("order.selectPreferredDeliveryDate", "Select date")}
        </span>
        <span aria-hidden="true" className={styles.datePickerIcon}>▾</span>
      </button>

      {isOpen ? (
        <div className={styles.datePickerPopover} role="dialog" aria-label={translate("order.deliveryCalendar", "Delivery calendar")}>
          <div className={styles.datePickerHeader}>
            <button
              type="button"
              className={styles.datePickerNavButton}
              onClick={() => setVisibleMonth((current) => addUtcMonths(current, -1))}
              aria-label={translate("order.previousMonth", "Previous month")}
            >
              ‹
            </button>
            <strong>{formatCalendarMonth(visibleMonth, locale)}</strong>
            <button
              type="button"
              className={styles.datePickerNavButton}
              onClick={() => setVisibleMonth((current) => addUtcMonths(current, 1))}
              aria-label={translate("order.nextMonth", "Next month")}
            >
              ›
            </button>
          </div>

          <div className={styles.datePickerWeekdays} aria-hidden="true">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={styles.datePickerGrid}>
            {calendarDays.map((date) => {
              const dateValue = toDateInputValue(date);
              const isOutsideMonth = date.getUTCMonth() !== visibleMonth.getUTCMonth();
              const isDisabled = minValue && dateValue < minValue;
              const isToday = dateValue === todayValue;
              const isSelected = dateValue === selectedValue;
              const className = [
                styles.datePickerDay,
                isOutsideMonth ? styles.datePickerDayOutside : "",
                isDisabled ? styles.datePickerDayDisabled : "",
                isToday ? styles.datePickerDayToday : "",
                isSelected ? styles.datePickerDaySelected : "",
              ].filter(Boolean).join(" ");

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={className}
                  disabled={isDisabled}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(date)}
                >
                  {date.getUTCDate()}
                </button>
              );
            })}
          </div>

          <div className={styles.datePickerLegend}>
            <span className={styles.datePickerTodayMarker} aria-hidden="true" />
            <span>{translate("order.today", "Today")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CustomDeliveryWeekSelect({
  id,
  name,
  value,
  options,
  placeholder,
  invalid = false,
  onBlur,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectRef = useRef(null);
  const buttonRef = useRef(null);
  const listboxId = `${id}-listbox`;
  const selectedValue = value || "";
  const selectOptions = useMemo(() => [{ value: "", label: placeholder }, ...options], [options, placeholder]);
  const selectedOption = selectOptions.find((option) => option.value === selectedValue) || selectOptions[0];

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event) {
      if (!selectRef.current?.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(Math.max(0, selectOptions.findIndex((option) => option.value === selectedValue)));
  }, [isOpen, selectOptions, selectedValue]);

  function chooseOption(option) {
    onChange(option.value);
    setIsOpen(false);
    onBlur?.();
    buttonRef.current?.focus();
  }

  function moveActive(direction) {
    if (!selectOptions.length) return;
    setActiveIndex((current) => (current + direction + selectOptions.length) % selectOptions.length);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      else moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      else moveActive(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(selectOptions.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        chooseOption(selectOptions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      onBlur?.();
      buttonRef.current?.focus();
    }
  }

  return (
    <div className={styles.deliveryWeekSelect} ref={selectRef}>
      <input type="hidden" name={name} value={selectedValue} />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={styles.deliveryWeekTrigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-invalid={invalid}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedValue ? "" : styles.deliveryWeekPlaceholder}>{selectedOption.label}</span>
        <span className={styles.deliveryWeekChevron} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className={styles.deliveryWeekMenu} id={listboxId} role="listbox" aria-labelledby={id}>
          {selectOptions.map((option, index) => {
            const isSelected = option.value === selectedValue;
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value || "placeholder"}
                type="button"
                className={[
                  styles.deliveryWeekOption,
                  isSelected ? styles.deliveryWeekOptionSelected : "",
                  isActive ? styles.deliveryWeekOptionActive : "",
                ].filter(Boolean).join(" ")}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>
                <span className={styles.deliveryWeekOptionMark} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  deliveryLeadTimeDays = 0,
}) {
  const { translate, language } = usePublicI18n();
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
    preferredDeliveryDate: translate("order.fieldErrors.preferredDeliveryDate", "Please choose a preferred delivery week."),
    consent: translate("order.fieldErrors.consent", "Please confirm that you have read the privacy statement."),
    termsConsent: translate("order.fieldErrors.termsConsent", "Please confirm the terms and conditions."),
  }), [translate]);
  const countryOptions = uniqueOptions(Object.keys(COUNTRY_CITY_OPTIONS), customer.country);
  const cityOptions = uniqueOptions(COUNTRY_CITY_OPTIONS[customer.country] || [], customer.city);
  const postalCodeOptions = uniqueOptions(POSTAL_CODE_OPTIONS[customer.city] || [], customer.postalCode);
  const contractAddressLines = buildAddressLines(contractAddress, translate);
  const canUseContractAddress = contractAddressLines.length > 0;
  const savedAddressLines = buildAddressLines(customer, translate);
  const savedHelpText = translate("order.savedHelp", "");
  const dateLocale = language === "de" ? "de-DE" : "en-GB";
  const deliveryLeadTimeWeeks = getDeliveryLeadTimeWeeks(deliveryLeadTimeDays);
  const deliveryWeekOptions = Array.from(
    { length: DELIVERY_WEEK_OPTION_COUNT },
    (_, index) => deliveryLeadTimeWeeks + index,
  ).map((weeks) => ({
    weeks,
    value: getDateAfterWeeks(weeks),
    label: getDeliveryWeekLabel(weeks, translate),
  }));
  const selectedDeliveryWeekLabel =
    deliveryWeekOptions.find((option) => option.value === customer.preferredDeliveryDate)?.label ||
    formatDateForDisplay(customer.preferredDeliveryDate, dateLocale);

  function markFieldTouched(fieldKey) {
    setTouchedFields((current) => (current[fieldKey] ? current : { ...current, [fieldKey]: true }));
  }

  function hasFieldError(fieldKey, required = false) {
    if (!required) return false;
    if (!hasTriedSubmit && !touchedFields[fieldKey]) return false;
    return fieldKey === "consent" || fieldKey === "termsConsent" ? !customer[fieldKey] : !normalizeValue(customer[fieldKey]);
  }

  function hasRequiredValue(fieldKey) {
    return fieldKey === "consent" || fieldKey === "termsConsent" ? Boolean(customer[fieldKey]) : Boolean(normalizeValue(customer[fieldKey]));
  }

  function getMissingRequiredFields() {
    const requiredFields = ["firstName", "lastName", "email", "phone", "preferredDeliveryDate", "consent", "termsConsent"];
    if (!isUsingContractAddress) {
      requiredFields.push("address1", "country", "city", "postalCode");
    }

    return requiredFields.filter((fieldKey) => !hasRequiredValue(fieldKey));
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
    const missingRequiredFields = getMissingRequiredFields();
    if (missingRequiredFields.length) {
      event.preventDefault();
      missingRequiredFields.forEach(markFieldTouched);
      return;
    }

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
            {!isOrderSaved ? (
              <small className={styles.orderHelp}>
                {translate("order.requiredHint", "Fields marked with * are required.")}
              </small>
            ) : null}
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
                    {renderSavedDetail(
                      translate("order.preferredDeliveryWeek", "Preferred delivery week"),
                      selectedDeliveryWeekLabel,
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

          <div className={[styles.orderSectionCard, styles.deliverySectionCard].join(" ")}>
            <div className={styles.orderSectionHeader}>
              <div>
                <div className={styles.deliveryHeaderTitle}>
                  <h3>{translate("order.deliveryTitle", "Preferred delivery")}</h3>
                  <span>{translate("order.deliveryBadge", "Recommended")}</span>
                </div>
                <p>
                  {translate("order.deliveryWeekHelp", "Choose how many weeks after your order you would prefer delivery.")}
                </p>
              </div>
            </div>
            <div className={styles.sectionFields}>
              <div className={getFieldClassName("preferredDeliveryDate", true, [styles.field, styles.deliveryDateField].join(" "))}>
                <label htmlFor="preferredDeliveryDate">{translate("order.preferredDeliveryWeek", "Preferred delivery week")}*</label>
                <CustomDeliveryWeekSelect
                  id="preferredDeliveryDate"
                  name="preferred-delivery-date"
                  placeholder={translate("order.selectPreferredDeliveryWeek", "Select delivery week")}
                  options={deliveryWeekOptions}
                  value={customer.preferredDeliveryDate || ""}
                  onBlur={() => markFieldTouched("preferredDeliveryDate")}
                  onChange={(nextValue) => {
                    markFieldTouched("preferredDeliveryDate");
                    onUpdateCustomer("preferredDeliveryDate", nextValue);
                  }}
                  invalid={hasFieldError("preferredDeliveryDate", true)}
                />
                {renderFieldError("preferredDeliveryDate", true)}
              </div>
            </div>
          </div>

          <div className={styles.orderSectionCard}>
            <div className={styles.orderSectionHeader}>
              <div>
                <h3>{translate("order.paymentConsentTitle", "Order notes")}</h3>
                <p>{translate("order.paymentConsentHelp", "Add any special instructions, then confirm the privacy notice.")}</p>
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
                  placeholder={translate("order.notesPlaceholder", "Access instructions, contact windows, or other details.")}
                />
              </div>
            </div>
            <div className={styles.legalConsentGroup}>
              <div className={styles.checkboxRow}>
                <input
                  id="consent"
                  type="checkbox"
                  required
                  checked={customer.consent}
                  onBlur={() => markFieldTouched("consent")}
                  onChange={(event) => {
                    markFieldTouched("consent");
                    onUpdateCustomer("consent", event.target.checked);
                  }}
                />
                <label htmlFor="consent">
                  {translate("order.consentShortPrefix", "I have read the ")}
                  <a href="/datenschutz" target="_blank" rel="noreferrer">
                    {translate("order.privacyPolicy", "privacy policy")}
                  </a>
                  {translate("order.consentShortSuffix", ".*")}
                </label>
              </div>
              {renderFieldError("consent", true)}
              <div className={styles.checkboxRow}>
                <input
                  id="termsConsent"
                  type="checkbox"
                  required
                  checked={Boolean(customer.termsConsent)}
                  onBlur={() => markFieldTouched("termsConsent")}
                  onChange={(event) => {
                    markFieldTouched("termsConsent");
                    onUpdateCustomer("termsConsent", event.target.checked);
                  }}
                />
                <label htmlFor="termsConsent">
                  {translate("order.termsConsentPrefix", "I have read the ")}
                  <a href="/legal/architecto-agb-2026.pdf?v=2026052102" target="_blank" rel="noreferrer">
                    {translate("order.termsAndConditions", "terms and conditions")}
                  </a>
                  {translate("order.termsConsentSuffix", " and agree.*")}
                </label>
              </div>
              {renderFieldError("termsConsent", true)}
            </div>
            <div className={styles.orderSubmitRow}>
              <button type="submit" form="order-form" className={styles.orderSubmitButton} disabled={isSubmitting}>
                {isSubmitting ? translate("order.submitSaving", "Saving...") : translate("order.submit", "Complete paid order")}
              </button>
            </div>
            <small className={styles.orderHelp}>
              {translate(
                "order.stripeRedirectHint",
                "After payment, please wait until Stripe redirects you back to Fragmento. Your order is complete when you see the confirmation screen.",
              )}
            </small>
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
