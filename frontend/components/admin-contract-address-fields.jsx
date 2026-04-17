"use client";

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import { COUNTRY_CITY_OPTIONS, POSTAL_CODE_OPTIONS } from "./kitchen-order-form";
import {
  ADDRESS_VERIFICATION_STATUS,
  addressVerificationSnapshotKey,
  buildAddressVerificationSnapshot,
  buildAddressVerificationState,
} from "../lib/address-verification";

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

const verificationMessageBaseStyle = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(143, 62, 44, 0.14)",
  background: "rgba(255, 247, 241, 0.7)",
  color: "var(--app-text-muted)",
  fontSize: "0.84rem",
  lineHeight: 1.45,
};

const verifyButtonBaseStyle = {
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid rgba(143, 62, 44, 0.2)",
  background: "rgba(255,255,255,0.92)",
  color: "var(--app-accent)",
  padding: "9px 12px",
  font: "inherit",
  fontWeight: 800,
  cursor: "pointer",
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
  const markerRef = useRef(null);
  const [country, setCountry] = useState(normalizeAdminCountry(contract.country));
  const [city, setCity] = useState(contract.city || "");
  const [postalCode, setPostalCode] = useState(contract.postalCode || "");
  const [addressVerification, setAddressVerification] = useState(() => buildAddressVerificationState());
  const inputStyle = compact ? { ...defaultInputStyle, minHeight: 38, padding: "6px 10px", fontSize: "0.92rem" } : defaultInputStyle;
  const notesStyle = compact ? { ...textareaStyle, minHeight: 58, padding: "6px 10px", fontSize: "0.92rem" } : textareaStyle;

  const countryOptions = useMemo(
    () => uniqueOptions(ADMIN_COUNTRY_OPTIONS.map((option) => option.value), country),
    [country],
  );
  const countrySourceKey = COUNTRY_SOURCE_KEY_BY_VALUE[country] || country;
  const cityOptions = useMemo(() => uniqueOptions(COUNTRY_CITY_OPTIONS[countrySourceKey] || [], city), [countrySourceKey, city]);
  const postalCodeOptions = useMemo(() => uniqueOptions(POSTAL_CODE_OPTIONS[city] || [], postalCode), [city, postalCode]);
  const addressVerificationMessage = addressVerification.message || "";
  const addressVerificationSuggestion = addressVerification.suggestion || "";
  const isVerificationLoading = addressVerification.status === ADDRESS_VERIFICATION_STATUS.LOADING;
  const isVerificationValid = addressVerification.status === ADDRESS_VERIFICATION_STATUS.VALID;
  const isVerificationPartial = addressVerification.status === ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH;
  const isVerificationError =
    addressVerification.status === ADDRESS_VERIFICATION_STATUS.INVALID
    || addressVerification.status === ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE;

  function getFormSnapshot(form) {
    const formData = new FormData(form);
    return buildAddressVerificationSnapshot({
      contractNumber: formData.get("contractNumber"),
      address1: formData.get("address1"),
      address2: formData.get("address2"),
      postalCode: formData.get("postalCode"),
      city: formData.get("city"),
      country: formData.get("country"),
    });
  }

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    if (!form) return undefined;

    const relevantFieldNames = new Set(["contractNumber", "address1", "address2", "country", "city", "postalCode"]);

    const invalidateVerification = () => {
      setAddressVerification((current) => {
        const verifiedSnapshot = current?.verification?.snapshot;
        const currentSnapshot = getFormSnapshot(form);
        if (!verifiedSnapshot) {
          if (
            current.status === ADDRESS_VERIFICATION_STATUS.IDLE
            && !current.message
            && !current.suggestion
            && !current.verification
          ) {
            return current;
          }
          return buildAddressVerificationState();
        }

        if (addressVerificationSnapshotKey(verifiedSnapshot) === addressVerificationSnapshotKey(currentSnapshot)) {
          return current;
        }

        return buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.IDLE, {
          message: "Address changed. Verify it again before saving the contract.",
        });
      });
    };

    const handleFieldMutation = (event) => {
      const fieldName = event?.target?.name;
      if (!relevantFieldNames.has(fieldName)) return;
      invalidateVerification();
    };

    const handleSubmit = (event) => {
      const snapshot = getFormSnapshot(form);

      setAddressVerification((current) => {
        const verifiedSnapshot = current?.verification?.snapshot;
        if (
          current.status === ADDRESS_VERIFICATION_STATUS.VALID
          && verifiedSnapshot
          && addressVerificationSnapshotKey(verifiedSnapshot) === addressVerificationSnapshotKey(snapshot)
        ) {
          return current;
        }

        event.preventDefault();
        return buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: "Verify the contract address before submitting this form.",
        });
      });
    };

    form.addEventListener("input", handleFieldMutation);
    form.addEventListener("change", handleFieldMutation);
    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("input", handleFieldMutation);
      form.removeEventListener("change", handleFieldMutation);
      form.removeEventListener("submit", handleSubmit);
    };
  }, []);

  async function handleVerifyAddress() {
    const form = markerRef.current?.closest("form");
    if (!form) return;

    const snapshot = getFormSnapshot(form);
    if (!snapshot.contractNumber || !snapshot.country || !snapshot.city || !snapshot.postalCode) {
      setAddressVerification(
        buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: "Enter contract number, country, city, and postal code before verification.",
        }),
      );
      return;
    }

    setAddressVerification(
      buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.LOADING, {
        message: "Verifying contract address...",
      }),
    );

    try {
      const response = await fetch("/api/address-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const payload = await response.json();

      if (payload.status === ADDRESS_VERIFICATION_STATUS.VALID && payload.verification) {
        setAddressVerification(
          buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.VALID, {
            message: payload.message || "Address is valid.",
            suggestion: payload.suggestion || "",
            verification: payload.verification,
          }),
        );
        return;
      }

      setAddressVerification(
        buildAddressVerificationState(payload.status || ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: payload.message || "Address verification failed.",
          suggestion: payload.suggestion || "",
        }),
      );
    } catch (error) {
      setAddressVerification(
        buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE, {
          message: error.message || "The address verification service is unavailable right now.",
        }),
      );
    }
  }

  return (
    <div ref={markerRef} style={{ display: "contents" }}>
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
      <input
        type="hidden"
        name="addressVerification"
        value={addressVerification.verification ? JSON.stringify(addressVerification.verification) : ""}
        readOnly
      />
      <div style={{ ...baseFieldStyle, gridColumn: compact ? "1 / -1" : undefined }}>
        <button
          type="button"
          onClick={handleVerifyAddress}
          disabled={isVerificationLoading}
          style={{
            ...verifyButtonBaseStyle,
            minHeight: compact ? 38 : 42,
            padding: compact ? "6px 10px" : "9px 12px",
            background: isVerificationValid
              ? "rgba(47, 146, 81, 0.12)"
              : isVerificationPartial
                ? "rgba(200, 138, 25, 0.12)"
                : isVerificationError
                  ? "rgba(181, 59, 48, 0.08)"
                  : verifyButtonBaseStyle.background,
            borderColor: isVerificationValid
              ? "rgba(47, 146, 81, 0.28)"
              : isVerificationPartial
                ? "rgba(200, 138, 25, 0.3)"
                : isVerificationError
                  ? "rgba(181, 59, 48, 0.22)"
                  : "rgba(143, 62, 44, 0.2)",
            color: isVerificationValid ? "#22673a" : isVerificationPartial ? "#8a5a00" : isVerificationError ? "#a33f35" : verifyButtonBaseStyle.color,
            cursor: isVerificationLoading ? "progress" : "pointer",
            opacity: isVerificationLoading ? 0.76 : 1,
          }}
        >
          {isVerificationLoading
            ? translate("contractAddressFields.verifyingAddress", "Verifying address...")
            : translate("contractAddressFields.verifyAddress", "Verify address")}
        </button>
      </div>
      <div
        role="status"
        aria-live="polite"
        style={{
          ...verificationMessageBaseStyle,
          background: isVerificationValid
            ? "rgba(47, 146, 81, 0.08)"
            : isVerificationPartial
              ? "rgba(200, 138, 25, 0.12)"
              : isVerificationError
                ? "rgba(181, 59, 48, 0.08)"
                : verificationMessageBaseStyle.background,
          borderColor: isVerificationValid
            ? "rgba(47, 146, 81, 0.24)"
            : isVerificationPartial
              ? "rgba(200, 138, 25, 0.3)"
              : isVerificationError
                ? "rgba(181, 59, 48, 0.22)"
                : "rgba(143, 62, 44, 0.14)",
          color: isVerificationValid ? "#22673a" : isVerificationPartial ? "#8a5a00" : isVerificationError ? "#a33f35" : verificationMessageBaseStyle.color,
        }}
      >
        <strong>
          {addressVerificationMessage || translate("contractAddressFields.verifyAddressBeforeSaving", "Verify the address before saving the contract.")}
        </strong>
        {addressVerificationSuggestion ? (
          <span>{translate("contractAddressFields.suggestedMatch", "Suggested match")}: {addressVerificationSuggestion}</span>
        ) : null}
        {isVerificationPartial ? (
          <span>{translate("contractAddressFields.reviewStreetDetails", "Please review the street details and verify again if needed.")}</span>
        ) : null}
        {isVerificationError ? (
          <span>{translate("contractAddressFields.correctAddressAndRetry", "Correct the address details and run verification again.")}</span>
        ) : null}
      </div>
    </div>
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
