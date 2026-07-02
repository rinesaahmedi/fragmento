const DAY_MS = 24 * 60 * 60 * 1000;

function parseUtcDateOnly(value) {
  if (!value) return null;
  const parsed = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

export function formatDateOnlyDe(value) {
  const date = parseUtcDateOnly(value);
  if (!date) return value || "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function moveToNextBusinessDay(date) {
  const nextDate = new Date(date);
  const day = nextDate.getUTCDay();
  if (day === 6) nextDate.setUTCDate(nextDate.getUTCDate() + 2);
  if (day === 0) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate;
}

export function getPreferredDeliveryDateAfterWeeks(weeks, baseDate = new Date()) {
  const parsedWeeks = Math.max(0, Math.floor(Number(weeks) || 0));
  const orderDate = parseUtcDateOnly(baseDate) || parseUtcDateOnly(new Date());
  const targetDate = new Date(Date.UTC(
    orderDate.getUTCFullYear(),
    orderDate.getUTCMonth(),
    orderDate.getUTCDate() + (parsedWeeks * 7),
  ));

  return moveToNextBusinessDay(targetDate).toISOString().slice(0, 10);
}

export function getPreferredDeliveryWeekDisplay(value, orderCreatedAt = null) {
  if (!value) return "";

  const selectedDate = parseUtcDateOnly(value);
  if (!selectedDate) return value;

  const baseDate = parseUtcDateOnly(orderCreatedAt) || parseUtcDateOnly(new Date());
  const selectedDateValue = selectedDate.toISOString().slice(0, 10);

  for (let weeks = 1; weeks <= 104; weeks += 1) {
    if (getPreferredDeliveryDateAfterWeeks(weeks, baseDate) === selectedDateValue) {
      return `Nach ${weeks} Wochen (${formatDateOnlyDe(selectedDateValue)})`;
    }
  }

  const dayDiff = Math.round((selectedDate.getTime() - baseDate.getTime()) / DAY_MS);
  const weeks = dayDiff / 7;
  if (Number.isInteger(weeks) && weeks >= 1) {
    return `Nach ${weeks} Wochen (${formatDateOnlyDe(selectedDateValue)})`;
  }

  return formatDateOnlyDe(selectedDateValue);
}
