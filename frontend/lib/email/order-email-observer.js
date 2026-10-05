// This observer only registers deferred work. It never opens a database
// connection or waits for tracking as part of sending/confirming an order.
export async function observeOrderEmailSend({ send, buildAttempt, schedule }) {
  const attemptedAt = new Date().toISOString();
  const observe = (result, failed) => {
    try {
      schedule(() => buildAttempt({ result, failed, attemptedAt }));
    } catch {
      // Missing request context or tracking configuration must not affect SMTP.
    }
  };
  let result;
  try {
    result = await send();
  } catch (error) {
    observe(null, true);
    throw error;
  }
  observe(result, false);
  return result;
}

function address(value) {
  return String(typeof value === "object" ? value?.address || "" : value || "").trim().toLowerCase();
}

export function buildOrderEmailDelivery({ recipients, result, failed, attemptedAt }) {
  const accepted = new Set((result?.accepted || []).map(address));
  const rejected = new Set((result?.rejected || []).map(address));
  return {
    attemptedAt,
    messageId: String(result?.messageId || ""),
    recipients: [
      { role: "customer", email: recipients.to },
      { role: "copy", email: recipients.cc || "" },
    ].map((target) => ({
      ...target,
      status: target.role === "copy" && !target.email ? "NOT_REQUIRED"
        : failed ? "FAILED"
          : accepted.has(address(target.email)) ? "SENT"
            : rejected.has(address(target.email)) ? "FAILED" : "UNKNOWN",
    })),
  };
}
