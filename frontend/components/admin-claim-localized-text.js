"use client";

import { useAdminI18n } from "./admin-i18n";

const KITCHEN_AREA_NAMES = {
  "Sink Base Cabinet": "Spülenschrank",
  Dishwasher: "Geschirrspüler",
  "Built-in Oven and Hob": "Einbaubackofen und Kochfeld",
  "Wall Cabinet left": "Oberschrank links",
  "Wall Cabinet mid-left": "Oberschrank mittig links",
  "Wall Cabinet mid-right": "Oberschrank mittig rechts",
  "Wall Cabinet right": "Oberschrank rechts",
  "Upper Cabinet with Extractor Hood 60": "Oberschrank für Flachschirmhaube 60",
  "Extractor Hood": "Flachschirmhaube",
  "Chimney Extractor Hood": "Kamin-Dunstabzugshaube",
  "Washing Machine": "Waschmaschine",
  Worktop: "Arbeitsplatte",
  Refrigerator: "Standkühlschrank 178 cm",
  "Freestanding refrigerator 178cm": "Standkühlschrank 178 cm",
  "Sink and Waste System": "Spüle und Mülltrennsystem",
  "Sink and Worktop": "Spüle und Arbeitsplatte",
};

function localizeKitchenAreaNames(text, language) {
  if (language !== "de") return text;

  return Object.entries(KITCHEN_AREA_NAMES).reduce((value, [english, german]) => {
    return value.replaceAll(english, german);
  }, text);
}

function localizeClaimText(value, language) {
  const text = String(value || "");
  const prefix = language === "de" ? "Küchenbereiche:" : "Kitchen areas:";

  return localizeKitchenAreaNames(
    text.replace(/^Kitchen areas:/, prefix).replace(/^Küchenbereiche:/, prefix),
    language,
  );
}

export function AdminClaimLocalizedText({ text, style }) {
  const { language } = useAdminI18n();

  return <span style={style}>{localizeClaimText(text, language)}</span>;
}
