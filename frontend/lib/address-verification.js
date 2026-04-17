export const ADDRESS_VERIFICATION_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  VALID: "valid",
  PARTIAL_MATCH: "partial_match",
  INVALID: "invalid",
  SERVICE_UNAVAILABLE: "service_unavailable",
};

export const ADDRESS_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

const COUNTRY_PROVIDER_CONFIG = {
  deutschland: { providerCode: "de", providerName: "Germany" },
  germany: { providerCode: "de", providerName: "Germany" },
  oesterreich: { providerCode: "at", providerName: "Austria" },
  austria: { providerCode: "at", providerName: "Austria" },
  schweiz: { providerCode: "ch", providerName: "Switzerland" },
  switzerland: { providerCode: "ch", providerName: "Switzerland" },
  ungarn: { providerCode: "hu", providerName: "Hungary" },
  hungary: { providerCode: "hu", providerName: "Hungary" },
  kosovo: { providerCode: "xk", providerName: "Kosovo" },
  tschechien: { providerCode: "cz", providerName: "Czechia" },
  czechia: { providerCode: "cz", providerName: "Czechia" },
  "czech republic": { providerCode: "cz", providerName: "Czechia" },
  slowakei: { providerCode: "sk", providerName: "Slovakia" },
  slovakia: { providerCode: "sk", providerName: "Slovakia" },
  polen: { providerCode: "pl", providerName: "Poland" },
  poland: { providerCode: "pl", providerName: "Poland" },
};

function trimValue(value) {
  return String(value ?? "").trim();
}

export function buildAddressVerificationSnapshot(input = {}) {
  return {
    contractNumber: trimValue(input.contractNumber),
    address1: trimValue(input.address1),
    address2: trimValue(input.address2),
    postalCode: trimValue(input.postalCode),
    city: trimValue(input.city),
    country: trimValue(input.country),
  };
}

export function addressVerificationSnapshotKey(snapshot) {
  const normalized = buildAddressVerificationSnapshot(snapshot);
  return JSON.stringify(normalized);
}

export function normalizeComparisonText(value) {
  return trimValue(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizePostalCode(value) {
  return trimValue(value).replace(/\s+/g, "").toUpperCase();
}

export function getProviderCountryConfig(country) {
  return COUNTRY_PROVIDER_CONFIG[normalizeComparisonText(country)] || null;
}

export function buildAddressVerificationState(status = ADDRESS_VERIFICATION_STATUS.IDLE, overrides = {}) {
  return {
    status,
    message: "",
    suggestion: "",
    verification: null,
    ...overrides,
  };
}
