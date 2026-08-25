export function formatAdminDate(value, language = "en") {
  if (!value) return "-";

  const formatter = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    // PostgreSQL stores these values as local wall-clock timestamps. Prisma
    // exposes them with a Z suffix, so browser-local formatting would apply a
    // second timezone shift (for example 10:53 becomes 12:53 in summer).
    timeZone: "UTC",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));

  if (language === "de") {
    return `${parts.day}. ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
  }

  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}
