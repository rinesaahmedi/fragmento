import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ADDRESS_VERIFICATION_STATUS,
  ADDRESS_VERIFICATION_TTL_MS,
  addressVerificationSnapshotKey,
  buildAddressVerificationSnapshot,
  getProviderCountryConfig,
  normalizeComparisonText,
  normalizePostalCode,
} from "./address-verification";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function getAddressVerificationSecret() {
  return process.env.ADDRESS_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET || "fragmento-address-verification-dev";
}

function signVerificationPayload(snapshotKey, verifiedAt) {
  return createHmac("sha256", getAddressVerificationSecret())
    .update(`${snapshotKey}:${verifiedAt}`)
    .digest("hex");
}

function cityCandidates(address = {}) {
  return [
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
    address.state_district,
  ].filter(Boolean);
}

function houseNumberCandidates(address = {}) {
  return [
    address.house_number,
    address.housenumber,
  ].filter(Boolean);
}

function countryMatches(inputCountry, providerAddress) {
  const providerCountryCode = String(providerAddress?.country_code || "").trim().toLowerCase();
  const config = getProviderCountryConfig(inputCountry);

  if (config?.providerCode && providerCountryCode && config.providerCode === providerCountryCode) {
    return true;
  }

  const providerCountryName = normalizeComparisonText(providerAddress?.country);
  return providerCountryName && providerCountryName === normalizeComparisonText(config?.providerName || inputCountry);
}

function cityMatches(inputCity, providerAddress) {
  const normalizedInputCity = normalizeComparisonText(inputCity);
  if (!normalizedInputCity) return false;
  return cityCandidates(providerAddress).some((value) => normalizeComparisonText(value) === normalizedInputCity);
}

function postalMatches(inputPostalCode, providerAddress) {
  return normalizePostalCode(inputPostalCode) === normalizePostalCode(providerAddress?.postcode);
}

function streetMatches(inputAddress1, providerAddress, result = {}) {
  const normalizedInput = normalizeComparisonText(inputAddress1);
  if (!normalizedInput) return true;

  const road = normalizeComparisonText(providerAddress?.road || providerAddress?.pedestrian || providerAddress?.footway || providerAddress?.street);
  const houseNumber = normalizeComparisonText(houseNumberCandidates(providerAddress)[0]);
  const combinedRoad = [road, houseNumber].filter(Boolean).join(" ").trim();
  const reversedRoad = [houseNumber, road].filter(Boolean).join(" ").trim();
  const displayName = normalizeComparisonText(result?.display_name);

  if (!road && !displayName) {
    return false;
  }

  return normalizedInput === combinedRoad
    || normalizedInput === reversedRoad
    || normalizedInput === road
    || Boolean(displayName && displayName.includes(normalizedInput));
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function logVerificationDiagnostics(stage, payload) {
  if (!isDevelopment()) return;
  console.warn(`[address-verification:${stage}]`, JSON.stringify(payload, null, 2));
}

function buildSearchParams(snapshot, countryConfig, { includeStreet = true } = {}) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    layer: "address",
    city: snapshot.city,
    postalcode: snapshot.postalCode,
    country: countryConfig.providerName,
  });

  if (includeStreet && snapshot.address1) {
    params.set("street", snapshot.address1);
  }

  if (countryConfig.providerCode && countryConfig.providerCode !== "xk") {
    params.set("countrycodes", countryConfig.providerCode);
  }

  return params;
}

async function runSearch(params) {
  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "FragmentoAddressVerification/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("The address verification service did not respond successfully. Please try again shortly.");
  }

  const results = await response.json();
  return Array.isArray(results) ? results : [];
}

function classifyMatches(snapshot, matches) {
  const exactMatch = matches.find((result) => {
    const address = result?.address || {};
    return countryMatches(snapshot.country, address)
      && cityMatches(snapshot.city, address)
      && postalMatches(snapshot.postalCode, address)
      && streetMatches(snapshot.address1, address, result);
  });

  if (exactMatch) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.VALID,
      match: exactMatch,
      message: "Address is valid.",
      suggestion: formatSuggestion(exactMatch),
    };
  }

  const partialMatch = matches.find((result) => {
    const address = result?.address || {};
    return countryMatches(snapshot.country, address)
      && cityMatches(snapshot.city, address)
      && (
        streetMatches(snapshot.address1, address, result)
        || postalMatches(snapshot.postalCode, address)
      );
  });

  if (partialMatch) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH,
      match: partialMatch,
      message: "Address partially matched. Please verify street details.",
      suggestion: formatSuggestion(partialMatch),
    };
  }

  return {
    status: ADDRESS_VERIFICATION_STATUS.INVALID,
    match: null,
    message: "There is an issue with the postal code, city name, or country combination.",
    suggestion: matches[0] ? formatSuggestion(matches[0]) : "",
  };
}

function formatSuggestion(result) {
  const address = result?.address || {};
  const city = cityCandidates(address)[0] || "";
  const postalCode = address.postcode || "";
  const country = address.country || "";
  return [postalCode, city, country].filter(Boolean).join(" ");
}

export async function verifyAddressWithProvider(input = {}) {
  const snapshot = buildAddressVerificationSnapshot(input);
  const countryConfig = getProviderCountryConfig(snapshot.country);

  if (!snapshot.country || !snapshot.city || !snapshot.postalCode) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.INVALID,
      message: "Country, city, and postal code are required for address verification.",
      suggestion: "",
      provider: "nominatim",
    };
  }

  if (!countryConfig?.providerCode) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE,
      message: "Address verification is not available for the selected country right now.",
      suggestion: "",
      provider: "nominatim",
    };
  }

  let matches = [];
  try {
    matches = await runSearch(buildSearchParams(snapshot, countryConfig, { includeStreet: true }));
    if (!matches.length && snapshot.address1) {
      matches = await runSearch(buildSearchParams(snapshot, countryConfig, { includeStreet: false }));
    }
  } catch (error) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE,
      message: "The address verification service is currently unavailable. Please try again shortly.",
      suggestion: "",
      provider: "nominatim",
      rawError: error instanceof Error ? error.message : "Unknown network error",
    };
  }

  const classification = classifyMatches(snapshot, matches);

  if (classification.status === ADDRESS_VERIFICATION_STATUS.VALID) {
    return {
      status: ADDRESS_VERIFICATION_STATUS.VALID,
      message: classification.message,
      suggestion: classification.suggestion,
      provider: "nominatim",
    };
  }

  if (classification.status === ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH) {
    logVerificationDiagnostics("partial-match", {
      snapshot,
      classification,
      matches,
    });
    return {
      status: ADDRESS_VERIFICATION_STATUS.PARTIAL_MATCH,
      message: classification.message,
      suggestion: classification.suggestion,
      provider: "nominatim",
    };
  }

  logVerificationDiagnostics("invalid", {
    snapshot,
    classification,
    matches,
  });
  return {
    status: ADDRESS_VERIFICATION_STATUS.INVALID,
    message: classification.message,
    suggestion: classification.suggestion,
    provider: "nominatim",
  };
}

export function createAddressVerificationRecord(input = {}) {
  const snapshot = buildAddressVerificationSnapshot(input);
  const verifiedAt = new Date().toISOString();
  const snapshotKey = addressVerificationSnapshotKey(snapshot);
  const token = signVerificationPayload(snapshotKey, verifiedAt);

  return {
    status: ADDRESS_VERIFICATION_STATUS.VALID,
    provider: "nominatim",
    verifiedAt,
    snapshot,
    token,
  };
}

export function isAddressVerificationRecordValid(verification, customer) {
  if (!verification || verification.status !== ADDRESS_VERIFICATION_STATUS.VALID) {
    return false;
  }

  const snapshot = buildAddressVerificationSnapshot(customer);
  const submittedSnapshotKey = addressVerificationSnapshotKey(snapshot);
  const verifiedSnapshotKey = addressVerificationSnapshotKey(verification.snapshot);

  if (submittedSnapshotKey !== verifiedSnapshotKey) {
    return false;
  }

  const verifiedAt = String(verification.verifiedAt || "");
  const token = String(verification.token || "");
  if (!verifiedAt || !token) {
    return false;
  }

  const verifiedTimestamp = Date.parse(verifiedAt);
  if (!Number.isFinite(verifiedTimestamp)) {
    return false;
  }

  if (Date.now() - verifiedTimestamp > ADDRESS_VERIFICATION_TTL_MS) {
    return false;
  }

  const expectedToken = signVerificationPayload(verifiedSnapshotKey, verifiedAt);
  const providedTokenBuffer = Buffer.from(token, "hex");
  const expectedTokenBuffer = Buffer.from(expectedToken, "hex");

  if (providedTokenBuffer.length !== expectedTokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedTokenBuffer, expectedTokenBuffer);
}
