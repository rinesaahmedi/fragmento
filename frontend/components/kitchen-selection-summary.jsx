"use client";

import { useState } from "react";
import styles from "./kitchen-configurator.module.css";
import {
  formatCurrency,
  getCatalogItemDetails,
  getItemBlendeTotal,
  getItemPriceWithoutBlende,
  getLocalizedBlendeDisplayLabel,
  getLocalizedItemName,
  getProductInfoDocuments,
  getProductInfoHref,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";
import { getPriceBreakdown } from "../lib/price-utils";

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
  // A sink *cabinet* is a real included component and must remain visible in
  // the summary. Only merge the synthetic sink-worktop/faucet entry with the
  // worktop; legacy SINK-* cabinet codes must not be swallowed here.
  const isSinkCabinet = componentKey === "sink-base" || name === "sink lower cabinet";
  const isSinkWorktop = code === "SINK-WORKTOP" || name.includes("sink and worktop") || name.includes("sink and waste system");
  return !isSinkCabinet && (componentKey === "sink-faucet" || isSinkWorktop);
}

function mergeStandardEquipmentItems(items, kitchenSlug = "") {
  // Burger 103898 has two distinct worktop sections plus a separate sink
  // cabinet; keep all three default rows visible instead of merging them.
  if (String(kitchenSlug || "").trim().toLowerCase() === "burger-103898") {
    return items;
  }

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
  const unitPrice = Number(item?.price || 0);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  return unitPrice * quantity;
}

function SummaryRow({ item, kitchenSlug, onRemove, onOpenInfo }) {
  const { translate, language } = usePublicI18n();
  const price = getEffectiveSummaryPrice(item);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  const isDefault = Boolean(item.isLocked);
  const isConfirmed = !isDefault && Boolean(item.isOrderLocked);
  const isLocked = isDefault || isConfirmed;
  const itemName = getLocalizedItemName(item, translate, language, false);
  const blendeLabel = getLocalizedBlendeDisplayLabel(item, language);
  const blendeTotal = getItemBlendeTotal(item);
  const cabinetOnlyPrice = getItemPriceWithoutBlende(item);
  const { articleNumber, dimensions } = getCatalogItemDetails(item, kitchenSlug);
  const itemDimensions = isLocked ? "" : dimensions;
  const infoPdfHref = getProductInfoHref(item);
  const productInfoDocuments = getProductInfoDocuments(item);
  const shouldShowCatalogMeta = !isLocked || isConfirmed;
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
        {quantity > 1 ? (
          <span className={styles.summaryQuantity}>
            {translate("configurator.summaryQuantity", "Quantity")}: {quantity}
          </span>
        ) : null}
        {shouldShowCatalogMeta && (articleNumber || blendeLabel) ? (
          <span className={styles.itemCode}>
            {articleNumber ? `${translate("common.article", "Article")}: ${articleNumber}` : ""}
            {articleNumber && blendeLabel ? " " : ""}
            {blendeLabel ? (
              <span className={styles.summaryInlineBlendeNote}>
                {translate("configurator.includesBlende", "Includes")}: {blendeLabel}
                {blendeTotal > 0 ? ` (${formatCurrency(blendeTotal)})` : ""}
              </span>
            ) : null}
          </span>
        ) : null}
        {shouldShowCatalogMeta && blendeTotal > 0 && !(isLocked && price <= 0) ? (
          <span className={styles.summaryBlendeBreakdown}>
            {translate("configurator.blendePriceBreakdown", "{cabinetPrice} + {blendePrice} filler", {
              cabinetPrice: formatCurrency(cabinetOnlyPrice * quantity),
              blendePrice: formatCurrency(blendeTotal * quantity),
            })}
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
  kitchenSlug,
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
  const mergedDefaultSelectedComponents = mergeStandardEquipmentItems(defaultSelectedComponents, kitchenSlug);
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
          <SummaryRow key={item.id} item={item} kitchenSlug={kitchenSlug} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {confirmedSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryConfirmedComponents", "Already confirmed components")}</div>
        ) : null}
        {confirmedSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} kitchenSlug={kitchenSlug} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {optionalSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryAdditionalComponents", "Additional components")}</div>
        ) : null}
        {optionalSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} kitchenSlug={kitchenSlug} onRemove={onRemoveComponent} onOpenInfo={onOpenProductInfo} />
        ))}

        {selectedAccessories.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryAccessories", "Accessories")}</div> : null}
        {selectedAccessories.map((item) => (
          <SummaryRow key={item.id} item={item} kitchenSlug={kitchenSlug} onRemove={onRemoveAccessory} onOpenInfo={onOpenProductInfo} />
        ))}

        {selectedServices.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryServices", "Services")}</div> : null}
        {selectedServices.map((item) => (
          <SummaryRow key={item.id} item={item} kitchenSlug={kitchenSlug} onRemove={onRemoveService} onOpenInfo={onOpenProductInfo} />
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
          {(() => {
            const { net, vat, total } = getPriceBreakdown(grandTotal);
            return (
              <>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.priceExclVat", "Price")}</span>
                  <span>{formatCurrency(net)}</span>
                </div>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.vatAmount", "VAT (19%)")}</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className={styles.summaryTotalLine}>
                  <span>{translate("common.totalPrice", "Total price")}</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </>
            );
          })()}
        </div>
        <button type="button" className={styles.primaryButton} onClick={onOpenOrderSection}>
          {translate("configurator.summaryContinueToOrder", "Continue to order")}
        </button>
      </div>
    </div>
  );
}
