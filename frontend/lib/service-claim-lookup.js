/** Minimum length before the public form triggers a contract lookup / visit tracking. */
export const SERVICE_CLAIM_LOOKUP_MIN_LENGTH = 8;

const LOOKUP_PLACEHOLDER_VALUES = new Set([
  "undefined",
  "null",
  "nan",
  "true",
  "false",
  "none",
  "n/a",
  "na",
  "unknown",
]);

export function normalizeServiceClaimContractNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

/**
 * True when a typed/requested value is worth looking up and recording as claim activity.
 * Rejects empty, placeholder strings (e.g. "undefined"), and short partial input while typing.
 */
export function isServiceClaimContractLookupReady(value) {
  const normalized = normalizeServiceClaimContractNumber(value);
  if (!normalized) return false;
  if (normalized.length < SERVICE_CLAIM_LOOKUP_MIN_LENGTH) return false;
  if (LOOKUP_PLACEHOLDER_VALUES.has(normalized.toLowerCase())) return false;
  return true;
}

/** Last-4 suffixes produced by known placeholder junk (for filtering old visit rows). */
export const SERVICE_CLAIM_JUNK_CONTRACT_LAST4 = new Set(
  [...LOOKUP_PLACEHOLDER_VALUES].map((value) => value.slice(-4).toLowerCase()),
);

export function isJunkServiceClaimVisitEvent(event = {}) {
  if (event.kitchenContractId) return false;
  const last4 = String(event.contractNumberLast4 || "").trim().toLowerCase();
  return Boolean(last4) && SERVICE_CLAIM_JUNK_CONTRACT_LAST4.has(last4);
}
