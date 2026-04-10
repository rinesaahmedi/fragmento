const globalStore = globalThis;

const rateLimitStore = globalStore.__fragmentoRateLimitStore || new Map();

if (!globalStore.__fragmentoRateLimitStore) {
  globalStore.__fragmentoRateLimitStore = rateLimitStore;
}

function cleanupExpiredEntries(now) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (!entry || entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRequestClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const realIp = request.headers.get("x-real-ip") || "";
  return forwardedFor.split(",")[0].trim() || realIp.trim() || "unknown";
}

export function enforceRateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (existing.count >= limit) {
    const error = new Error("Too many requests. Please try again later.");
    error.status = 429;
    throw error;
  }

  existing.count += 1;
}
