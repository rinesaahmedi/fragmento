import nodemailer from "nodemailer";

/**
 * Contracts starting with "111" are internal/test contracts. Their claim and order
 * e-mails are sent from a separate mailbox (SMTP_111_*, e.g. 315primex.eu@gmail.com)
 * instead of the customer-facing SMTP_* account (nachkauf@myarchitecto.de).
 * When SMTP_111_* is not configured, or that account refuses to send, the mail is
 * delivered through the default SMTP_* account so no e-mail is lost.
 */
export function isInternalContractNumber(contractNumber) {
  return String(contractNumber || "").trim().replace(/\s+/g, "").startsWith("111");
}

function buildSmtpConfig(prefix, env, profile) {
  return {
    profile,
    host: String(env[`${prefix}HOST`] || "smtp.gmail.com").trim(),
    port: Number.parseInt(env[`${prefix}PORT`] || "587", 10),
    secure: env[`${prefix}SECURE`] === "true",
    user: String(env[`${prefix}USER`] || "").trim(),
    // Google shows app passwords in groups of four; SMTP expects them without spaces.
    pass: profile === "internal" ? String(env[`${prefix}PASS`] || "").replace(/\s+/g, "") : String(env[`${prefix}PASS`] || ""),
    from: String(env[`${prefix}FROM`] || (profile === "internal" ? env[`${prefix}USER`] : "") || "").trim(),
  };
}

export function resolveDefaultSmtpConfig(env = process.env) {
  return buildSmtpConfig("SMTP_", env, "default");
}

export function resolveInternalSmtpConfig(env = process.env) {
  const config = buildSmtpConfig("SMTP_111_", env, "internal");
  return config.user && config.pass && config.from ? config : null;
}

/** SMTP account to use for a contract: the internal one for 111 contracts when configured. */
export function resolveSmtpConfigForContract(contractNumber, env = process.env) {
  if (isInternalContractNumber(contractNumber)) {
    const internal = resolveInternalSmtpConfig(env);
    if (internal) return internal;
  }
  return resolveDefaultSmtpConfig(env);
}

export function createSmtpTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

/**
 * Send `message` (without `from`) for a contract. `fromName` is the display name.
 * Falls back to the default account if the internal 111 account fails.
 * Returns { receipt, config } so callers can log/track which account was used.
 */
export async function sendMailForContract(contractNumber, message, { fromName = "Fragmento", env = process.env, createTransport = createSmtpTransport } = {}) {
  const primary = resolveSmtpConfigForContract(contractNumber, env);
  const send = (config) => createTransport(config).sendMail({ ...message, from: `"${fromName}" <${config.from}>` });

  try {
    return { receipt: await send(primary), config: primary };
  } catch (error) {
    if (primary.profile !== "internal") throw error;
    const fallback = resolveDefaultSmtpConfig(env);
    console.warn(`Internal SMTP (${primary.user}) failed for contract ${contractNumber}; retrying via ${fallback.user}:`, error.message);
    return { receipt: await send(fallback), config: fallback };
  }
}
