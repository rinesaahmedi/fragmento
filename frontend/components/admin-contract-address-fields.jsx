"use client";

import { useMemo, useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import { COUNTRY_CITY_OPTIONS, POSTAL_CODE_OPTIONS } from "./kitchen-order-form";

const ADMIN_COUNTRY_OPTIONS = [
  { value: "Germany", sourceKey: "Deutschland" },
  { value: "Austria", sourceKey: "Oesterreich" },
  { value: "Switzerland", sourceKey: "Schweiz" },
  { value: "Hungary", sourceKey: "Ungarn" },
  { value: "Kosovo", sourceKey: "Kosovo" },
  { value: "Czechia", sourceKey: "Tschechien" },
  { value: "Slovakia", sourceKey: "Slowakei" },
  { value: "Poland", sourceKey: "Polen" },
];

const COUNTRY_VALUE_BY_SOURCE_KEY = ADMIN_COUNTRY_OPTIONS.reduce((acc, option) => {
  acc[option.sourceKey] = option.value;
  return acc;
}, {});

const COUNTRY_SOURCE_KEY_BY_VALUE = ADMIN_COUNTRY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.sourceKey;
  return acc;
}, {});

const baseFieldStyle = {
  display: "grid",
  gap: 6,
  alignContent: "start",
};

const labelStyle = {
  color: "var(--app-text)",
  fontSize: 14,
  fontWeight: 800,
};

const defaultInputStyle = {
  width: "100%",
  minHeight: 52,
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "rgba(255, 255, 255, 0.92)",
  color: "var(--app-text)",
  padding: "10px 14px",
  font: "inherit",
  boxSizing: "border-box",
};

const textareaStyle = {
  ...defaultInputStyle,
  minHeight: 92,
  resize: "vertical",
};

function uniqueOptions(values = [], fallback = "") {
  return [...new Set([fallback, ...values].filter(Boolean))];
}

function normalizeAdminCountry(value) {
  return COUNTRY_VALUE_BY_SOURCE_KEY[value] || value || "";
}

function Field({ label, wide = false, children }) {
  return (
    <label style={{ ...baseFieldStyle, gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

export default function AdminContractAddressFields({ contract = {}, compact = false }) {
  const { translate } = useAdminI18n();
  const [country, setCountry] = useState(normalizeAdminCountry(contract.country));
  const [city, setCity] = useState(contract.city || "");
  const [postalCode, setPostalCode] = useState(contract.postalCode || "");
  const inputStyle = compact ? { ...defaultInputStyle, minHeight: 38, padding: "6px 10px", fontSize: "0.92rem" } : defaultInputStyle;
  const notesStyle = compact ? { ...textareaStyle, minHeight: 58, padding: "6px 10px", fontSize: "0.92rem" } : textareaStyle;

  const countryOptions = useMemo(
    () => uniqueOptions(ADMIN_COUNTRY_OPTIONS.map((option) => option.value), country),
    [country],
  );
  const countrySourceKey = COUNTRY_SOURCE_KEY_BY_VALUE[country] || country;
  const cityOptions = useMemo(() => uniqueOptions(COUNTRY_CITY_OPTIONS[countrySourceKey] || [], city), [countrySourceKey, city]);
  const postalCodeOptions = useMemo(() => uniqueOptions(POSTAL_CODE_OPTIONS[city] || [], postalCode), [city, postalCode]);

  return (
    <>
      <Field label={translate("contractAddressFields.country", "Country")}>
        <select
          name="country"
          value={country}
          style={inputStyle}
          onChange={(event) => {
            setCountry(event.target.value);
            setCity("");
            setPostalCode("");
          }}
        >
          <option value="">{translate("contractAddressFields.selectCountry", "Select country")}</option>
          {countryOptions.map((option) => (
            <option key={option} value={option}>{translateCountry(option, translate)}</option>
          ))}
        </select>
      </Field>

      <Field label={translate("contractAddressFields.city", "City")}>
        <select
          name="city"
          value={city}
          style={inputStyle}
          disabled={!country}
          onChange={(event) => {
            setCity(event.target.value);
            setPostalCode("");
          }}
        >
          <option value="">{country ? translate("contractAddressFields.selectCity", "Select city") : translate("contractAddressFields.selectCountryFirst", "Select country first")}</option>
          {cityOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </Field>

      <Field label={translate("contractAddressFields.postalCode", "Postal code")}>
        <select
          name="postalCode"
          value={postalCode}
          style={inputStyle}
          disabled={!city}
          onChange={(event) => setPostalCode(event.target.value)}
        >
          <option value="">{city ? translate("contractAddressFields.selectPostalCode", "Select postal code") : translate("contractAddressFields.selectCityFirst", "Select city first")}</option>
          {postalCodeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </Field>

      <Field label={translate("contractAddressFields.addressLine1", "Address line 1")}>
        <input name="address1" defaultValue={contract.address1 || ""} style={inputStyle} />
      </Field>
      <Field label={translate("contractAddressFields.addressLine2", "Address line 2")}>
        <input name="address2" defaultValue={contract.address2 || ""} style={inputStyle} />
      </Field>
      <Field label={translate("contractAddressFields.building", "Building")}>
        <input name="building" defaultValue={contract.building || ""} style={inputStyle} />
      </Field>
      <Field label={translate("contractAddressFields.floor", "Floor")}>
        <input name="floor" defaultValue={contract.floor || ""} style={inputStyle} />
      </Field>
      <Field label={translate("contractAddressFields.unitNumber", "Unit number")}>
        <input name="unitNumber" defaultValue={contract.unitNumber || ""} style={inputStyle} />
      </Field>
      <Field label={translate("contractAddressFields.notes", "Notes")} wide>
        <textarea name="notes" defaultValue={contract.notes || ""} rows={compact ? 2 : 3} style={notesStyle} />
      </Field>
    </>
  );
}

function translateCountry(country, translate) {
  const keys = {
    Germany: "germany",
    Austria: "austria",
    Switzerland: "switzerland",
    Hungary: "hungary",
    Kosovo: "kosovo",
    Czechia: "czechia",
    Slovakia: "slovakia",
    Poland: "poland",
  };
  const key = keys[country];
  return key ? translate(`contractAddressFields.${key}`, country) : country;
}
