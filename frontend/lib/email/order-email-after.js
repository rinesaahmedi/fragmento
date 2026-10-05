import { after } from "next/server.js";

// Pass a FUNCTION to after(), never an already-started promise. No storage
// module is even loaded until Next finishes the original request/response.
async function saveAttempt(attempt) {
  const { saveOrderEmailAttempt } = await import("./order-email-store.js");
  await saveOrderEmailAttempt(attempt);
}

export function scheduleOrderEmailAttempt(buildAttempt, { defer = after, save = saveAttempt } = {}) {
  defer(async () => {
    try {
      const attempt = buildAttempt();
      await save(attempt);
    } catch {
      console.warn("Email tracking unavailable; the original sending result is unchanged.");
    }
  });
}
