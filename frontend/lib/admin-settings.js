import { prisma } from "./prisma.js";

export const DIRECT_ORDER_CONFIRMATION_SETTING_KEY = "directOrderConfirmationEnabled";

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
