"use client";

import { useAdminI18n } from "./admin-i18n";

const DESCRIPTION_KEYS_BY_SLUG = {
  "fragmento-default": "kitchensAdmin.descriptions.fragmentoDefault",
  "kitchen-model-b": "kitchensAdmin.descriptions.linearKitchen",
  "kitchen-model-c": "kitchensAdmin.descriptions.splitKitchen",
};

const DESCRIPTION_KEYS_BY_TEXT = {
  "Seeded default kitchen based on the legacy configurator.": "kitchensAdmin.descriptions.fragmentoDefault",
  "Compact single-wall layout ideal for smaller spaces": "kitchensAdmin.descriptions.linearKitchen",
  "Two-part layout with separated zones for flexibility": "kitchensAdmin.descriptions.splitKitchen",
};

export function AdminKitchenDescription({ kitchen, fallback }) {
  const { translate } = useAdminI18n();
  const description = kitchen?.description || "";
  const key = DESCRIPTION_KEYS_BY_SLUG[kitchen?.slug] || DESCRIPTION_KEYS_BY_TEXT[description];

  return key ? translate(key, description || fallback) : (description || fallback);
}
