"use client";

import { useState } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  formatCurrency,
  getCatalogItemDetails,
  getLocalizedItemName,
  getProductInfoDocuments,
  getProductInfoHref,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";

function isWorktopSummaryItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = String(item?.name || item?.nameSnapshot || "").trim().toLowerCase();
  return componentKey === "worktop" || code.startsWith("TOP-") || name.startsWith("worktop");
}

function isSinkSummaryItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = String(item?.name || item?.nameSnapshot || "").trim().toLowerCase();
  return componentKey === "sink-faucet" || code.startsWith("SINK-") || name.includes("sink and worktop") || name.includes("sink and waste system");
}

function mergeStandardEquipmentItems(items) {
  const worktopItem = items.find(isWorktopSummaryItem);
  const sinkItem = items.find(isSinkSummaryItem);

  if (!worktopItem || !sinkItem) {
    return items;
  }

  const mergedItem = {
    ...sinkItem,
    id: `${sinkItem.id || "sink"}-with-${worktopItem.id || "worktop"}`,
    name: "Worktop",
    nameDe: "Arbeitsplatte",
    code: [sinkItem.code, worktopItem.code].filter(Boolean).join(" + "),
    articleNumber: "",
    widthMm: null,
    heightMm: null,
    depthMm: null,
    blendeCode: null,
    blendeLabel: null,
    blendePrice: null,
    price: 0,
  };

  const mergedItems = [];
  let insertedMergedItem = false;

  for (const item of items) {
    if (item === worktopItem || item === sinkItem) {
      if (!insertedMergedItem) {
        mergedItems.push(mergedItem);
        insertedMergedItem = true;
      }
      continue;
    }

    mergedItems.push(item);
  }

  return mergedItems;
}

function getEffectiveSummaryPrice(item) {
  if (item?.isLocked || item?.isOrderLocked) {
    return 0;
  }
  return Number(item?.price || 0);
}

function SummaryRow({ item, onRemove, onOpenInfo }) {
  const { translate, language } = usePublicI18n();
  const price = getEffectiveSummaryPrice(item);
  const isDefault = Boolean(item.isLocked);
  const isConfirmed = !isDefault && Boolean(item.isOrderLocked);
  const isLocked = isDefault || isConfirmed;
  const itemName = getLocalizedItemName(item, translate, language, false);
  const { articleNumber, dimensions } = getCatalogItemDetails(item);
  const itemDimensions = isLocked ? "" : dimensions;
  const infoPdfHref = getProductInfoHref(item);
  const productInfoDocuments = getProductInfoDocuments(item);
  const priceClassName = [
    styles.summaryPrice,
    isLocked && price <= 0 ? styles.summaryPriceIncluded : "",
  ]
    .filter(Boolean)
    .join(" ");
  const priceLabel = (isLocked && price <= 0)
    ? isConfirmed
      ? translate("configurator.summaryItemConfirmed", "Already confirmed")
      : translate("configurator.summaryItemIncluded", "Included")
    : formatCurrency(price);

  return (
    <div className={styles.summaryRow}>
      <div className={styles.summaryMeta}>
        <strong>{itemName}</strong>
        {!isLocked && (articleNumber || item.blendeLabel) ? (
          <span className={styles.itemCode}>
            {articleNumber ? `${translate("common.article", "Article")}: ${articleNumber}` : ""}
            {articleNumber && item.blendeLabel ? " " : ""}
            {item.blendeLabel ? (
              <span className={styles.summaryInlineBlendeNote}>
                {translate("configurator.includesBlende", "Includes blende")}: {item.blendeLabel}
              </span>
            ) : null}
          </span>
        ) : null}
        {itemDimensions ? <span className={styles.itemDimensions}>{itemDimensions}</span> : null}
      </div>
      <strong className={priceClassName}>{priceLabel}</strong>
      {isLocked ? (
        <div className={styles.summaryLockedActions}>
          {infoPdfHref ? (
            <button
              type="button"
              className={styles.summaryInfoButton}
              onClick={() =>
                onOpenInfo?.({
                  item: {
                    ...item,
                    name: itemName,
                    productInfoDocuments,
                  },
                  price,
                  infoPdfHref,
                })
              }
            >
              {translate("configurator.productInfoOpenShort", "Info")}
          </button>
          ) : null}
          <span className={[styles.summaryBadge, styles.summaryBadgeLocked].join(" ")}>
            {isConfirmed
              ? translate("configurator.summaryBadgeConfirmed", "Confirmed")
              : translate("configurator.summaryBadgeStandard", "Standard")}
          </span>
        </div>
      ) : (
        <button type="button" className={styles.summaryRemove} onClick={() => onRemove(item)}>
          {translate("common.remove", "Remove")}
        </button>
      )}
    </div>
  );
}

export default function KitchenSelectionSummary({
  selectedComponents,
  selectedAccessories,
  selectedServices,
  defaultSelectedComponents,
  confirmedSelectedComponents,
  optionalSelectedComponents,
  grandTotal,
  onRemoveComponent,
  onRemoveAccessory,
  onRemoveService,
  onOpenOrderSection,
  onOpenProductInfo,
}) {
  const { translate } = usePublicI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const mergedDefaultSelectedComponents = mergeStandardEquipmentItems(defaultSelectedComponents);
  const selectedItemCount =
    selectedComponents.length + selectedAccessories.length + selectedServices.length;
  const shouldCollapseSummary = selectedItemCount > 6;
  const summaryListClassName = [
    styles.summaryList,
    shouldCollapseSummary && !isExpanded ? styles.summaryListCollapsed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={[styles.panel, styles.summaryPanel].join(" ")}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.summaryEyebrow", "Summary")}</p>
          <h2>{translate("configurator.summaryTitle", "Your selection")}</h2>
        </div>
      </div>
      <div className={summaryListClassName}>
        {!selectedComponents.length && !selectedAccessories.length && !selectedServices.length ? (
          <div className={styles.emptyState}>{translate("configurator.summaryEmpty", "No items selected yet.")}</div>
        ) : null}

        {mergedDefaultSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryStandardEquipment", "Default components")}</div>
        ) : null}
        {mergedDefaultSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {confirmedSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryConfirmedComponents", "Already confirmed components")}</div>
        ) : null}
        {confirmedSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {optionalSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryAdditionalComponents", "Additional components")}</div>
        ) : null}
        {optionalSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {selectedAccessories.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryAccessories", "Accessories")}</div> : null}
        {selectedAccessories.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveAccessory} onOpenInfo={onOpenProductInfo} />
        ))}

        {selectedServices.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryServices", "Services")}</div> : null}
        {selectedServices.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveService} onOpenInfo={onOpenProductInfo} />
        ))}
      </div>
      {shouldCollapseSummary ? (
        <div className={styles.summaryToggleRow}>
          <button
            type="button"
            className={styles.summaryToggleButton}
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded
              ? translate("configurator.summaryShowLess", "Show less")
              : translate("configurator.summaryShowAll", "Show all")}
          </button>
        </div>
      ) : null}
      <div className={styles.summaryActions}>
        <div className={styles.summaryTotal}>
          <span>{translate("common.totalPrice", "Total price")}</span>
          <strong>{formatCurrency(grandTotal)}</strong>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onOpenOrderSection}>
          {translate("configurator.summaryContinueToOrder", "Continue to order")}
        </button>
      </div>
    </div>
  );
}
