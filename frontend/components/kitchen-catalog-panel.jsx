"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  componentIdForItem,
  formatCurrency,
  getCatalogDisplayItem,
  getCatalogItemDetails,
  getLocalizedBlendeLabel,
  getLocalizedItemInfoText,
  getLocalizedItemName,
  getProductImagePaths,
  getProductInfoDocuments,
  getProductInfoHref,
  isLinkedComponentSelected,
  shouldShowProductAssistantLauncher,
  splitCatalogItemNameAndDimensions,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import {
  CUTLERY_VARIANTS,
  getCutleryVariant,
  getCutleryVariantLabel,
  isCutleryAccessoryItem,
  normalizeCutleryVariants,
} from "../lib/cutlery-accessories";
import {
  getServiceDisabledReason,
  SERVICE_CODE_MONTAGE,
  SERVICE_CODE_PICKUP,
} from "../lib/service-eligibility";
import { getCabinetWidthMm } from "../lib/cabinet-name-utils";
import { usePublicI18n } from "./public-i18n";

const DISHWASHER_BASE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 10 24 L 14 44 H 46 L 50 24 Z"/><line x1="18" y1="26" x2="20" y2="44"/><line x1="26" y1="26" x2="26" y2="44"/><line x1="34" y1="26" x2="34" y2="44"/><line x1="42" y1="26" x2="40" y2="44"/><line x1="12" y1="32" x2="48" y2="32"/><line x1="13" y1="38" x2="47" y2="38"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">GS</text></svg>';

const ICON_MARKUP = {
  dishwasher: DISHWASHER_BASE_MARKUP,
  refrigerator: '<img src="/img/foto6.png" alt="Kühlschrank">',
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
  wall_cabinet_single_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/><g stroke="#666" stroke-width="0.75"><line x1="30" y1="60" x2="30" y2="63"/><line x1="28" y1="63" x2="32" y2="63"/><line x1="26" y1="66" x2="22" y2="74"/><line x1="30" y1="66" x2="30" y2="75"/><line x1="34" y1="66" x2="38" y2="74"/></g></svg>',
  wall_cabinet_double_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/><rect x="0.5" y="60" width="59" height="2"/><g stroke="#666" stroke-width="0.75"><line x1="20" y1="62" x2="20" y2="64"/><line x1="18" y1="64" x2="22" y2="64"/><line x1="17" y1="67" x2="14" y2="73"/><line x1="20" y1="67" x2="20" y2="74"/><line x1="23" y1="67" x2="26" y2="73"/><line x1="40" y1="62" x2="40" y2="64"/><line x1="38" y1="64" x2="42" y2="64"/><line x1="37" y1="67" x2="34" y2="73"/><line x1="40" y1="67" x2="40" y2="74"/><line x1="43" y1="67" x2="46" y2="73"/></g></svg>',
  wall_cabinet_plain:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/></svg>',
  hood_wall_cabinet:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/><rect x="8" y="60.5" width="44" height="5"/><line x1="8" y1="65.5" x2="52" y2="65.5"/><g stroke="#666" stroke-width="0.75"><line x1="20" y1="70" x2="17" y2="79"/><line x1="30" y1="70" x2="30" y2="80"/><line x1="40" y1="70" x2="43" y2="79"/></g></svg>',
  washing_machine_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="14" x2="60" y2="14"/><line x1="10" y1="8" x2="25" y2="8" stroke-width="0.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 16 26 C 12 26 12 46 16 46 Z"/><circle cx="30" cy="36" r="14"/><circle cx="30" cy="36" r="10"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">WM</text></svg>',
  sink_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="21.5" y1="10" x2="38.5" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/></svg>',
  dishwasher_base: DISHWASHER_BASE_MARKUP,
  oven_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><rect x="44" y="6" width="4" height="4"/><rect x="52" y="6" width="4" height="4"/><line x1="0" y1="56" x2="60" y2="56"/><rect x="8" y="22" width="44" height="26"/><line x1="7" y1="24" x2="53" y2="24" stroke-linecap="round" stroke-width="1.5"/><rect x="12" y="26" width="36" height="18"/><line x1="22" y1="62" x2="38" y2="62" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="18" x2="60" y2="18"/><line x1="21.5" y1="10" x2="38.5" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/></svg>',
  worktop:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" fill="none" stroke="currentColor" stroke-width="1"><line x1="2" y1="7" x2="118" y2="7"/><line x1="2" y1="13" x2="118" y2="13"/><line x1="118" y1="7" x2="118" y2="13"/></svg>',
  drawer_base_two:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="18" x2="60" y2="18"/><line x1="21.5" y1="10" x2="38.5" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base_three:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="0" y1="44" x2="60" y2="44"/><line x1="21.5" y1="9" x2="38.5" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="50" y1="23.5" x2="50" y2="40.5" stroke-linecap="round" stroke-width="1.5"/><line x1="50" y1="49.5" x2="50" y2="66.5" stroke-linecap="round" stroke-width="1.5"/></svg>',
  tall_refrigerator:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 190" fill="none" stroke="currentColor" stroke-width="1"><line x1="3" y1="1" x2="57" y2="1"/><line x1="3" y1="1" x2="3" y2="186"/><line x1="57" y1="1" x2="57" y2="186"/><line x1="3" y1="186" x2="57" y2="186"/><line x1="8" y1="186" x2="8" y2="189" stroke-width="1.5"/><line x1="52" y1="186" x2="52" y2="189" stroke-width="1.5"/><line x1="3" y1="110" x2="57" y2="110"/><line x1="12" y1="108" x2="48" y2="108" stroke-linecap="round" stroke-width="1.5"/><line x1="12" y1="112" x2="48" y2="112" stroke-linecap="round" stroke-width="1.5"/></svg>',
  extractor_hood_chimney:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="24" y="0.5" width="12" height="39"/><line x1="24" y1="20" x2="36" y2="20"/><rect x="10" y="40" width="40" height="12"/><g stroke="#666" stroke-width="0.75"><line x1="18" y1="55" x2="15" y2="62"/><line x1="22" y1="55" x2="22" y2="63"/><line x1="26" y1="55" x2="29" y2="62"/><line x1="34" y1="55" x2="31" y2="62"/><line x1="38" y1="55" x2="38" y2="63"/><line x1="42" y1="55" x2="45" y2="62"/></g></svg>',
  wall_cabinet_standard:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="50" y1="31" x2="50" y2="48" stroke-linecap="round" stroke-width="1.5"/></svg>',
  under_cabinet_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="#666" stroke-width="0.75"><line x1="8" y1="0" x2="12" y2="0" stroke="currentColor" stroke-width="1"/><line x1="6" y1="4" x2="2" y2="14"/><line x1="10" y1="4" x2="10" y2="15"/><line x1="14" y1="4" x2="18" y2="14"/></svg>',
  sink_faucet:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="28" width="4" height="2" fill="white" stroke-width="1"/><rect x="9" y="24" width="2" height="4" fill="white" stroke-width="1"/><path d="M 10 24 L 10 10 C 10 4, 16 4, 16 10 L 16 14" stroke-linecap="round"/><line x1="10" y1="18" x2="5" y2="15" stroke-linecap="round"/></svg>',
  pickup: '<img src="/img/warehouse.png" alt="Abholung im Lager">',
  waste_system:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  cutlery_insert:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="4" height="18" rx="1"/><rect x="8" y="3" width="8" height="4" rx="1"/><rect x="8" y="8" width="3" height="3" rx="1"/><rect x="12" y="8" width="4" height="3" rx="1"/><rect x="8.5" y="12" width="3" height="9" rx="1"/><rect x="12.5" y="12" width="3" height="9" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>',
  lighting_set:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>',
  delivery_assembly:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2.2-12.2l-4 4-1.4-1.4-1.4 1.4 2.8 2.8 5.4-5.4-1.4-1.4z"/></svg>',
};
ICON_MARKUP.wall_cabinet_hood = ICON_MARKUP.hood_wall_cabinet;

const TOOLTIP_PREVIEW_BY_CODE = {
  "DISH-B-600-STD": "/product-info-previews/dishwasher-preview.png",
  "DISH-C-600-STD": "/product-info-previews/dishwasher-preview.png",
  "DISH-LS-600-STD": "/product-info-previews/dishwasher-preview.png",
  "REF-B-545-1800-700": "/product-info-previews/fridge-preview.png",
  "REF-C-545-1800-700": "/product-info-previews/fridge-preview.png",
  "HOOD-B-FH664621E": "/product-info-previews/hood-preview.png",
  "HOOD-C-FH664621E": "/product-info-previews/hood-preview.png",
  "WM-B-EWA34660W": "/product-info-previews/washing-machine-preview.png",
  "WM-C-EWA34660W": "/product-info-previews/washing-machine-preview.png",
  "OVEN-B-600-HOB": "/product-info-previews/oven-hob-preview.png",
  "OVEN-C-600-HOB": "/product-info-previews/oven-hob-preview.png",
};

const PRODUCT_ASSISTANT_AVATAR_SRC = "/img/Untitled%20design%20(5).png";

const WIDTH_SCALED_CABINET_ICON_KEYS = new Set([
  "dishwasher",
  "dishwasher_base",
  "drawer_base",
  "drawer_base_two",
  "drawer_base_three",
  "hood_wall_cabinet",
  "wall_cabinet_hood",
  "sink_base",
  "wall_cabinet_plain",
  "wall_cabinet_single_light",
  "wall_cabinet_double_light",
  "wall_cabinet_standard",
]);

function getCatalogCabinetIconWidthPx(item) {
  if (!WIDTH_SCALED_CABINET_ICON_KEYS.has(String(item?.iconKey || ""))) return null;
  const widthMm = Number(getCabinetWidthMm(item));
  if (!Number.isFinite(widthMm) || widthMm <= 0) return null;

  const clampedWidth = Math.min(Math.max(widthMm, 300), 600);
  return Math.round(34 + ((clampedWidth - 300) / 300) * 30);
}

function getCatalogIconMarkup(item, stretchWidthOnly) {
  const markup = ICON_MARKUP[item?.iconKey] || "";
  if (!stretchWidthOnly || !markup.trim().startsWith("<svg")) return markup;

  return markup.replace(
    /^<svg\b(?![^>]*\bpreserveAspectRatio=)/,
    '<svg preserveAspectRatio="none"',
  );
}

function localizeProductInfoDocumentLabel(label, translate) {
  const normalized = String(label || "").trim().toLowerCase();

  switch (normalized) {
    case "backofen e-label":
      return translate("configurator.productInfoLabelOvenELabel", "Oven E-Label");
    case "backofen pdf":
      return translate("configurator.productInfoLabelOvenPdf", "Oven PDF");
    case "kochfeld pdf":
      return translate("configurator.productInfoLabelHobPdf", "Hob PDF");
    case "produktinfo pdf":
      return translate("configurator.productInfoLabelProductPdf", "Product info PDF");
    case "e-label pdf":
      return translate("configurator.productInfoLabelELabelPdf", "E-Label PDF");
    default:
      return label;
  }
}

function getTooltipFacts(item) {
  return (Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : [])
    .map((fact) => String(fact || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function getTooltipPreviewSrc(item) {
  return TOOLTIP_PREVIEW_BY_CODE[item?.tooltipPreviewCode || item?.code] || "";
}

function getTooltipDocumentLabels(item, translate) {
  const documents = Array.isArray(item?.productInfoDocuments) && item.productInfoDocuments.length
    ? item.productInfoDocuments
    : getProductInfoDocuments(item);

  return documents
    .map((document) => localizeProductInfoDocumentLabel(document?.label, translate))
    .filter(Boolean);
}

function CatalogItem({
  item,
  selected,
  locked,
  disabled,
  compactIcon,
  price,
  hint,
  infoPdfHref,
  onClick,
  onOpenInfo,
  onOpenPhotos,
  productAssistantEnabled,
  onOpenProductAssistant,
}) {
  const { translate, language } = usePublicI18n();
  const itemName = getLocalizedItemName(item, translate, language, false);
  const blendeLabel = getLocalizedBlendeLabel(item, language);
  const itemInfoText = getLocalizedItemInfoText(item, translate);
  const itemDisplayName = splitCatalogItemNameAndDimensions(itemName);
  const { dimensions: itemDimensions } = getCatalogItemDetails(item);
  const cabinetIconWidthPx = getCatalogCabinetIconWidthPx(item);
  const className = [
    styles.itemCard,
    compactIcon ? styles.itemCardCompact : "",
    selected ? styles.itemCardSelected : "",
    locked ? styles.itemCardLocked : "",
    disabled ? styles.itemCardLocked : "",
  ]
    .filter(Boolean)
    .join(" ");
  const iconClassName = [
    styles.itemIcon,
    compactIcon ? styles.itemIconCompact : "",
    item.iconKey === "refrigerator" || item.iconKey === "tall_refrigerator" ? styles.itemIconTall : "",
    item.iconKey === "lighting_set" ? styles.itemIconLightingSet : "",
    String(item.iconKey || "").startsWith("drawer_base") ? styles.itemIconDrawerBase : "",
    cabinetIconWidthPx ? styles.itemIconScaledCabinet : "",
  ]
    .filter(Boolean)
    .join(" ");
  const iconStyle = cabinetIconWidthPx
    ? { "--catalog-cabinet-icon-width": `${cabinetIconWidthPx}px` }
    : undefined;
  const iconMarkup = getCatalogIconMarkup(item, Boolean(cabinetIconWidthPx));
  const tooltipFacts = getTooltipFacts(item);
  const tooltipPreviewSrc = getTooltipPreviewSrc(item);
  const productInfoDocuments = Array.isArray(item?.productInfoDocuments) && item.productInfoDocuments.length
    ? item.productInfoDocuments
    : getProductInfoDocuments(item);
  const productImagePaths = getProductImagePaths(item);
  const tooltipDocumentLabels = getTooltipDocumentLabels(item, translate);
  const productAssistantPublicName = item.assistantHoverExtractorHoodOnly
    ? translate("configurator.productAssistantExtractorHood", "Extractor hood")
    : itemDisplayName.title;
  const toggleLabel = selected
    ? `${translate("common.remove", "Remove")} -`
    : `${translate("configurator.add", "Add")} +`;
  const handleCardKeyDown = (event) => {
    if (locked || disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={locked || disabled ? -1 : 0}
      aria-disabled={locked || disabled}
      className={className}
      onClick={locked || disabled ? undefined : onClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className={styles.itemTop}>
        <span className={iconClassName} style={iconStyle} dangerouslySetInnerHTML={{ __html: iconMarkup }} />
        <div className={styles.itemText}>
          <strong>{itemDisplayName.title}</strong>
          {item.articleNumber ? <span className={styles.itemCode}>{translate("common.article", "Article")}: {item.articleNumber}</span> : null}
          {blendeLabel ? (
            <span className={styles.itemBlendeNote}>
              {translate("configurator.includesBlende", "Includes")}: {blendeLabel}
            </span>
          ) : null}
          {itemDimensions ? <span className={styles.itemDimensions}>{itemDimensions}</span> : null}
          {item.linkedInfoBadge ? (
            <span className={styles.itemLinkedBadge}>
              {translate("configurator.catalogItemInfo.includesExtractorHood", item.linkedInfoBadge)}
            </span>
          ) : null}
        </div>
        <span className={styles.itemPrice}>{formatCurrency(price ?? item.price)}</span>
      </div>
      <div className={styles.itemMeta}>
        <span className={locked ? styles.lockedPill : styles.togglePill}>
          {locked
            ? translate("configurator.fixed", "Fixed")
            : disabled
              ? translate("configurator.unavailable", "Unavailable")
              : toggleLabel}
        </span>
        {infoPdfHref ? (
          <span className={styles.itemInfoWrap}>
            <button
              type="button"
              className={styles.itemInfoTrigger}
              aria-label={translate("configurator.infoForItem", "Info about {name}", { name: itemDisplayName.title })}
              onClick={(event) => {
                event.stopPropagation();
                onOpenInfo?.({ item: { ...item, name: itemDisplayName.title, infoText: itemInfoText, productInfoDocuments }, price, infoPdfHref });
              }}
            >
              i
            </button>
            <span className={styles.itemInfoTooltip} role="tooltip">
              {tooltipPreviewSrc ? (
                <span className={styles.itemInfoTooltipPreview}>
                  <img
                    src={tooltipPreviewSrc}
                    alt=""
                    className={styles.itemInfoTooltipPreviewImage}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              ) : null}
              <span className={styles.itemInfoTooltipBody}>
                {itemInfoText ? <strong>{itemInfoText}</strong> : null}
                {tooltipDocumentLabels.length ? (
                  <span className={styles.itemInfoTooltipDocs}>
                    {tooltipDocumentLabels.map((label) => (
                      <span key={label} className={styles.itemInfoTooltipDocChip}>{label}</span>
                    ))}
                  </span>
                ) : null}
                {tooltipFacts.length ? (
                  <span className={styles.itemInfoTooltipFacts}>
                    {tooltipFacts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </span>
                ) : (
                  <span>{translate("common.clickForMoreInfo", "Click for more info.")}</span>
                )}
              </span>
            </span>
          </span>
        ) : null}
        {productImagePaths.length ? (
          <button
            type="button"
            className={styles.itemPhotoTrigger}
            aria-label={translate("configurator.photosForItem", "Photos of {name}", { name: itemDisplayName.title })}
            onClick={(event) => {
              event.stopPropagation();
              onOpenPhotos?.({
                title: itemDisplayName.title,
                images: productImagePaths,
              });
            }}
          >
            <span aria-hidden="true">{translate("configurator.photoButtonLabel", "Photo")}</span>
          </button>
        ) : null}
        <div className={styles.itemMetaAside}>
          {hint ? <span className={styles.ruleHint}>{hint}</span> : null}
          {productAssistantEnabled && onOpenProductAssistant ? (
            <span className={styles.itemInfoActions}>
              <span className={styles.itemAssistantWrap}>
                <span className={styles.itemAssistantPromptCloud} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.itemAssistantTrigger}
                  aria-label={translate("configurator.productAssistantItemButtonAria", "Open product help for {name}", { name: productAssistantPublicName })}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenProductAssistant({ ...item, name: productAssistantPublicName, productInfoDocuments });
                  }}
                >
                  <img src={PRODUCT_ASSISTANT_AVATAR_SRC} alt="" loading="lazy" decoding="async" />
                </button>
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CutleryInsertAccessoryCard({
  item,
  cutleryVariants = CUTLERY_VARIANTS,
  lines,
  locked,
  onToggleCutleryVariant,
  onUpdateCutleryLineQuantity,
  onOpenInfo,
}) {
  const { translate, language } = usePublicI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const variants = normalizeCutleryVariants(cutleryVariants);
  const itemName = translate("configurator.cutleryInsertTitle", "Cutlery insert");
  const itemInfoText = getLocalizedItemInfoText(item, translate);
  const selectedArticleNumbers = new Set(lines.map((line) => line.articleNumber));
  const selected = lines.length > 0;
  const linesTotal = lines.reduce((sum, line) => {
    const variant = getCutleryVariant(line.articleNumber, variants);
    return sum + (variant?.price || 0) * line.quantity;
  }, 0);
  const className = [
    styles.itemCard,
    styles.itemCardCompact,
    styles.cutleryCard,
    selected ? styles.itemCardSelected : "",
    locked ? styles.itemCardLocked : "",
  ]
    .filter(Boolean)
    .join(" ");
  const iconMarkup = ICON_MARKUP.cutlery_insert;
  const infoPdfHref = getProductInfoHref(item);

  function clampQuantity(value) {
    return Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
  }

  const dropdownTriggerLabel = (() => {
    if (!lines.length) {
      return translate("configurator.cutleryDropdownPlaceholder", "Choose widths...");
    }
    if (lines.length === 1) {
      const variant = getCutleryVariant(lines[0].articleNumber, variants);
      return variant
        ? `${variant.widthCm} cm`
        : getCutleryVariantLabel(variant, translate, language) || lines[0].articleNumber;
    }
    return translate("configurator.cutleryDropdownSelectedCount", "{count} widths selected", {
      count: lines.length,
    });
  })();

  useEffect(() => {
    if (!isDropdownOpen) return undefined;

    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isDropdownOpen]);

  return (
    <div className={className}>
      <div className={styles.itemTop}>
        <span className={[styles.itemIcon, styles.itemIconCompact].join(" ")} dangerouslySetInnerHTML={{ __html: iconMarkup }} />
        <div className={styles.itemText}>
          <strong>{itemName}</strong>
          <span className={styles.itemCode}>
            {translate("configurator.cutleryInsertHint", "Select one or more widths")}
          </span>
        </div>
        <span className={styles.itemPrice}>
          {selected
            ? formatCurrency(linesTotal)
            : translate("configurator.cutleryPriceFrom", "from {price}", {
                price: formatCurrency(variants[0]?.price || item.price),
              })}
        </span>
      </div>

      {!locked ? (
        <div className={styles.cutleryPanel} onClick={(event) => event.stopPropagation()}>
          <label className={styles.cutleryFieldLabel} htmlFor="cutlery-width-dropdown">
            {translate("configurator.cutleryDimension", "Width")}
          </label>
          <div className={styles.cutleryDropdownWrap} ref={dropdownRef}>
            <button
              id="cutlery-width-dropdown"
              type="button"
              className={[
                styles.cutleryDropdownTrigger,
                isDropdownOpen ? styles.cutleryDropdownTriggerOpen : "",
                lines.length ? styles.cutleryDropdownTriggerFilled : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen((open) => !open)}
            >
              <span className={styles.cutleryDropdownTriggerLabel}>{dropdownTriggerLabel}</span>
              <span className={styles.cutleryDropdownChevron} aria-hidden="true" />
            </button>
            {isDropdownOpen ? (
              <ul className={styles.cutleryDropdownMenu} role="listbox" aria-multiselectable="true">
                {variants.map((variant) => {
                  const isSelected = selectedArticleNumbers.has(variant.articleNumber);
                  const optionClassName = [
                    styles.cutleryDropdownOption,
                    isSelected ? styles.cutleryDropdownOptionSelected : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <li key={variant.articleNumber} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        className={optionClassName}
                        onClick={() => onToggleCutleryVariant?.(variant.articleNumber)}
                      >
                        <span className={styles.cutleryDropdownCheck} aria-hidden="true">
                          {isSelected ? "✓" : ""}
                        </span>
                        <span className={styles.cutleryDropdownOptionLabel}>
                          {getCutleryVariantLabel(variant, translate, language)}
                        </span>
                        <span className={styles.cutleryDropdownOptionPrice}>{formatCurrency(variant.price)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {lines.length ? (
        <div className={styles.cutlerySelectionList}>
          <p className={styles.cutlerySelectionTitle}>
            {translate("configurator.cutlerySelectedTitle", "Selected")}
          </p>
          {lines.map((line) => {
            const variant = getCutleryVariant(line.articleNumber, variants);
            const lineLabel = getCutleryVariantLabel(variant, translate, language);
            const lineTotal = (variant?.price || 0) * line.quantity;

            return (
              <div key={line.id} className={styles.cutlerySelectionRow}>
                <div className={styles.cutlerySelectionMain}>
                  <div className={styles.cutlerySelectionMeta}>
                    <strong>{variant?.widthCm ? `${variant.widthCm} cm` : lineLabel}</strong>
                    <span className={styles.cutlerySelectionArticle}>{line.articleNumber}</span>
                  </div>
                  {!locked ? (
                    <div className={styles.cutleryQuantityWrap}>
                      <button
                        type="button"
                        className={styles.cutleryQuantityButton}
                        aria-label={translate("configurator.cutleryDecreaseQuantity", "Decrease quantity")}
                        disabled={line.quantity <= 1}
                        onClick={() => onUpdateCutleryLineQuantity?.(line.articleNumber, line.quantity - 1)}
                      >
                        -
                      </button>
                      <input
                        className={styles.cutleryQuantityInput}
                        type="number"
                        min="1"
                        max="99"
                        value={line.quantity}
                        onChange={(event) => onUpdateCutleryLineQuantity?.(line.articleNumber, clampQuantity(event.target.value))}
                      />
                      <button
                        type="button"
                        className={styles.cutleryQuantityButton}
                        aria-label={translate("configurator.cutleryIncreaseQuantity", "Increase quantity")}
                        disabled={line.quantity >= 99}
                        onClick={() => onUpdateCutleryLineQuantity?.(line.articleNumber, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className={styles.cutlerySelectionQty}>
                      × {line.quantity}
                    </span>
                  )}
                </div>
                <div className={styles.cutlerySelectionEnd}>
                  <span className={styles.cutlerySelectionTotal}>{formatCurrency(lineTotal)}</span>
                  {!locked ? (
                    <button
                      type="button"
                      className={styles.cutleryLineRemove}
                      aria-label={translate("common.remove", "Remove")}
                      onClick={() => onToggleCutleryVariant?.(line.articleNumber)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {infoPdfHref ? (
        <div className={styles.cutleryCardFooter}>
          <span className={styles.itemInfoWrap}>
            <button
              type="button"
              className={styles.itemInfoTrigger}
              aria-label={translate("configurator.infoForItem", "Info about {name}", { name: itemName })}
              onClick={(event) => {
                event.stopPropagation();
                onOpenInfo?.({
                  item: {
                    ...item,
                    name: itemName,
                    infoText: itemInfoText,
                    productInfoDocuments: getProductInfoDocuments(item),
                  },
                  price: linesTotal || CUTLERY_VARIANTS[0]?.price || item.price,
                  infoPdfHref,
                });
              }}
            >
              i
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function KitchenCatalogPanel({
  kitchenConfig,
  kitchenSlug,
  visibleComponents,
  selectedComponents,
  selectedAccessories,
  selectedServices,
  selectedComponentIds,
  selectedAccessoryCodes,
  selectedServiceCodes,
  selectedDisplayCount,
  fixedComponentIds,
  orderLockedAccessoryCodes,
  orderLockedServiceCodes,
  setSelectedComponentIds,
  onToggleAccessory,
  onToggleService,
  cutleryVariants = CUTLERY_VARIANTS,
  cutleryLines = [],
  onToggleCutleryVariant,
  onUpdateCutleryLineQuantity,
  onOpenProductInfo,
  onOpenProductPhotos,
  onOpenProductAssistantFromItem,
  serviceEligibility,
  deliveryMinEligible = true,
  deliveryMinAmount = 1000,
}) {
  const { translate } = usePublicI18n();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.catalogEyebrow", "Catalog")}</p>
          <h2>{translate("configurator.catalogTitle", "Additional items for your built-in kitchen")}</h2>
        </div>
        <span className={styles.badge}>
          {selectedDisplayCount ?? selectedComponents.length + selectedAccessories.length + selectedServices.length}
        </span>
      </div>
      <div className={styles.catalog}>
        <section className={styles.catalogSection}>
          <h3>{translate("configurator.components", "Components")}</h3>
          <div className={styles.catalogGrid}>
            {visibleComponents.map((item) => {
              const componentId = componentIdForItem(item);
              const displayItem = getCatalogDisplayItem(kitchenConfig.components, kitchenSlug, item);

              return (
                <CatalogItem
                  key={item.id}
                  item={displayItem.item}
                  selected={isLinkedComponentSelected(kitchenSlug, selectedComponentIds, componentId)}
                  price={displayItem.price}
                  infoPdfHref={displayItem.infoPdfHref}
                  onOpenInfo={onOpenProductInfo}
                  onOpenPhotos={onOpenProductPhotos}
                  productAssistantEnabled={shouldShowProductAssistantLauncher(displayItem.item)}
                  onOpenProductAssistant={onOpenProductAssistantFromItem}
                  onClick={() =>
                    setSelectedComponentIds((current) =>
                      toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
                    )
                  }
                />
              );
            })}
          </div>
        </section>

        <section className={styles.catalogSection}>
          <h3>{translate("configurator.accessories", "Accessories")}</h3>
          <div className={styles.catalogGrid}>
            {kitchenConfig.accessories.map((item) => {
              if (isCutleryAccessoryItem(item)) {
                return (
                  <CutleryInsertAccessoryCard
                    key={item.id}
                    item={item}
                    cutleryVariants={cutleryVariants}
                    lines={cutleryLines}
                    locked={orderLockedAccessoryCodes.has(item.code)}
                    onToggleCutleryVariant={onToggleCutleryVariant}
                    onUpdateCutleryLineQuantity={onUpdateCutleryLineQuantity}
                    onOpenInfo={onOpenProductInfo}
                  />
                );
              }

              return (
                <CatalogItem
                  key={item.id}
                  item={item}
                  selected={selectedAccessoryCodes.includes(item.code)}
                  locked={orderLockedAccessoryCodes.has(item.code)}
                  compactIcon
                  infoPdfHref={getProductInfoHref(item)}
                  onOpenInfo={onOpenProductInfo}
                  onOpenPhotos={onOpenProductPhotos}
                  productAssistantEnabled={shouldShowProductAssistantLauncher(item)}
                  onOpenProductAssistant={onOpenProductAssistantFromItem}
                  onClick={() => onToggleAccessory(item.code)}
                />
              );
            })}
          </div>
        </section>

        <section className={styles.catalogSection}>
          <h3>{translate("configurator.services", "Services")}</h3>
          <div className={styles.catalogGrid}>
            {kitchenConfig.services.map((item) => {
              const isMontage = item.code === SERVICE_CODE_MONTAGE;
              const montageDeliveryMinBlocked = isMontage && !deliveryMinEligible;
              const disabledReason = montageDeliveryMinBlocked
                ? translate(
                    "configurator.serviceDeliveryMinError",
                    `Delivery, transport, assembly and connection requires a minimum order value of €${deliveryMinAmount}.`,
                    { amount: deliveryMinAmount },
                  )
                : getServiceDisabledReason(item.code, serviceEligibility, translate);
              const disabled =
                !selectedServiceCodes.includes(item.code) &&
                ((isMontage && (!serviceEligibility.montageEligible || montageDeliveryMinBlocked)) ||
                  (item.code === SERVICE_CODE_PICKUP && !serviceEligibility.pickupEligible));

              return (
                <CatalogItem
                  key={item.id}
                  item={item}
                  selected={selectedServiceCodes.includes(item.code)}
                  locked={orderLockedServiceCodes.has(item.code)}
                  disabled={disabled}
                  compactIcon
                  infoPdfHref={getProductInfoHref(item)}
                  onOpenInfo={onOpenProductInfo}
                  onOpenPhotos={onOpenProductPhotos}
                  productAssistantEnabled={shouldShowProductAssistantLauncher(item)}
                  onOpenProductAssistant={onOpenProductAssistantFromItem}
                  hint={
                    disabledReason ||
                    (item.code === SERVICE_CODE_PICKUP
                      ? translate("configurator.serviceHintPickup", "Only available with at least one component or accessory")
                      : "")
                  }
                  onClick={() => onToggleService(item.code)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
