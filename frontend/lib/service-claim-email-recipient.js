export function resolveServiceClaimEmailRecipient(contractNumber, env = process.env) {
  const normalizedContractNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  const envKey = normalizedContractNumber.startsWith("111")
    ? "SERVICE_REQUEST_EMAIL"
    : "SERVICE_REQUEST_OTHER_EMAIL";

  return String(env[envKey] || "").trim();
}
