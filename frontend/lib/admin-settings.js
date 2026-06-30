import { prisma } from "./prisma.js";

export const DIRECT_ORDER_CONFIRMATION_SETTING_KEY = "directOrderConfirmationEnabled";
export const DELIVERY_MIN_ORDER_ENABLED_KEY = "deliveryMinOrderEnabled";
export const DELIVERY_MIN_ORDER_AMOUNT_KEY = "deliveryMinOrderAmount";
export const DELIVERY_MIN_ORDER_DEFAULT_AMOUNT = 1000;
export const DELIVERY_LEAD_TIME_DAYS_KEY = "deliveryLeadTimeDays";
export const DELIVERY_LEAD_TIME_DEFAULT_DAYS = 14;

const TRUE_VALUES = new Set(["true", "1", "yes", "on"]);
const FALSE_VALUES = new Set(["false", "0", "no", "off", ""]);

export function parseBooleanSetting(value, defaultValue = false) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined) return defaultValue;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return defaultValue;
}

export function parseNumberSetting(value, defaultValue) {
  if (value === null || value === undefined) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export function parseIntegerSetting(value, defaultValue) {
  const parsed = parseNumberSetting(value, defaultValue);
  return Math.floor(parsed);
}

export async function getDirectOrderConfirmationEnabled(client = prisma) {
  const setting = await client.appSetting.findUnique({
    where: { key: DIRECT_ORDER_CONFIRMATION_SETTING_KEY },
  });

  return parseBooleanSetting(setting?.value, false);
}

export async function setDirectOrderConfirmationEnabled(enabled, client = prisma) {
  const value = enabled ? "true" : "false";

  await client.appSetting.upsert({
    where: { key: DIRECT_ORDER_CONFIRMATION_SETTING_KEY },
    create: {
      key: DIRECT_ORDER_CONFIRMATION_SETTING_KEY,
      value,
    },
    update: { value },
  });

  return enabled;
}

export async function getDeliveryMinOrderSettings(client = prisma) {
  const [enabledSetting, amountSetting] = await Promise.all([
    client.appSetting.findUnique({ where: { key: DELIVERY_MIN_ORDER_ENABLED_KEY } }),
    client.appSetting.findUnique({ where: { key: DELIVERY_MIN_ORDER_AMOUNT_KEY } }),
  ]);

  return {
    enabled: parseBooleanSetting(enabledSetting?.value, false),
    amount: parseNumberSetting(amountSetting?.value, DELIVERY_MIN_ORDER_DEFAULT_AMOUNT),
  };
}

export async function setDeliveryMinOrderSettings({ enabled, amount }, client = prisma) {
  const enabledValue = enabled ? "true" : "false";
  const amountValue = String(Number(amount) || DELIVERY_MIN_ORDER_DEFAULT_AMOUNT);

  await Promise.all([
    client.appSetting.upsert({
      where: { key: DELIVERY_MIN_ORDER_ENABLED_KEY },
      create: { key: DELIVERY_MIN_ORDER_ENABLED_KEY, value: enabledValue },
      update: { value: enabledValue },
    }),
    client.appSetting.upsert({
      where: { key: DELIVERY_MIN_ORDER_AMOUNT_KEY },
      create: { key: DELIVERY_MIN_ORDER_AMOUNT_KEY, value: amountValue },
      update: { value: amountValue },
    }),
  ]);

  return { enabled, amount: Number(amountValue) };
}

export async function getDeliveryLeadTimeDays(client = prisma) {
  const setting = await client.appSetting.findUnique({
    where: { key: DELIVERY_LEAD_TIME_DAYS_KEY },
  });

  return parseIntegerSetting(setting?.value, DELIVERY_LEAD_TIME_DEFAULT_DAYS);
}

export async function setDeliveryLeadTimeDays(days, client = prisma) {
  const value = String(parseIntegerSetting(days, DELIVERY_LEAD_TIME_DEFAULT_DAYS));

  await client.appSetting.upsert({
    where: { key: DELIVERY_LEAD_TIME_DAYS_KEY },
    create: {
      key: DELIVERY_LEAD_TIME_DAYS_KEY,
      value,
    },
    update: { value },
  });

  return Number(value);
}
