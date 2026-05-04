"use client";

import styles from "./kitchen-configurator.module.css";
import {
  formatCurrency,
} from "./kitchen-selection-utils";
import { usePublicI18n } from "./public-i18n";

function SummaryRow({ item, onRemove }) {
  const { translate } = usePublicI18n();
  const price = Number(item.price || 0);
  const isLocked = item.isLocked || item.isOrderLocked;
  const priceClassName = [
    styles.summaryPrice,
    isLocked && price <= 0 ? styles.summaryPriceIncluded : "",
  ]
    .filter(Boolean)
    .join(" ");
  const priceLabel = (isLocked && price <= 0)
    ? translate("configurator.summaryItemIncluded", "Included")
    : formatCurrency(price);
  let metaLabel = translate("configurator.summaryItemStandard", "Standard equipment");
  if (item.isOrderLocked) {
    metaLabel = translate("configurator.summaryItemConfirmed", "Already confirmed");
  } else if (!item.isLocked) {
    metaLabel = translate("configurator.summaryItemSelected", "Selected");
  } else if (price <= 0) {
    metaLabel = translate("configurator.summaryItemInBaseModel", "Included in the base model");
  }

  return (
    <div className={styles.summaryRow}>
      <div className={styles.summaryMeta}>
        <strong>{item.name}</strong>
        {item.code ? <span className={styles.itemCode}>{translate("common.code", "Code")}: {item.code}</span> : null}
        <span>{metaLabel}</span>
      </div>
      <strong className={priceClassName}>{priceLabel}</strong>
      {isLocked ? (
        <span className={[styles.summaryBadge, styles.summaryBadgeLocked].join(" ")}>
          {item.isOrderLocked
            ? translate("configurator.summaryBadgeConfirmed", "Confirmed")
            : translate("configurator.summaryBadgeStandard", "Standard")}
        </span>
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
  lockedSelectedComponents,
  optionalSelectedComponents,
  grandTotal,
  onRemoveComponent,
  onRemoveAccessory,
  onRemoveService,
  onOpenOrderSection,
}) {
  const { translate } = usePublicI18n();
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{translate("configurator.summaryEyebrow", "Summary")}</p>
          <h2>{translate("configurator.summaryTitle", "Your selection")}</h2>
        </div>
      </div>
      <div className={styles.summaryList}>
        {!selectedComponents.length && !selectedAccessories.length && !selectedServices.length ? (
          <div className={styles.emptyState}>{translate("configurator.summaryEmpty", "No items selected yet.")}</div>
        ) : null}

        {lockedSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryStandardEquipment", "Standard equipment")}</div>
        ) : null}
        {lockedSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} />
        ))}

        {optionalSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>{translate("configurator.summaryAdditionalComponents", "Additional components")}</div>
        ) : null}
        {optionalSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} />
        ))}

        {selectedAccessories.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryAccessories", "Accessories")}</div> : null}
        {selectedAccessories.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveAccessory} />
        ))}

        {selectedServices.length ? <div className={styles.summarySectionTitle}>{translate("configurator.summaryServices", "Services")}</div> : null}
        {selectedServices.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveService} />
        ))}
      </div>
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
