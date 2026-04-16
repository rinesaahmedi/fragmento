"use client";

import styles from "./kitchen-configurator.module.css";
import {
  formatCurrency,
  getSummaryMetaLabel,
  getSummaryPriceLabel,
} from "./kitchen-selection-utils";

function SummaryRow({ item, onRemove }) {
  const price = Number(item.price || 0);
  const isLocked = item.isLocked || item.isOrderLocked;
  const priceClassName = [
    styles.summaryPrice,
    isLocked && price <= 0 ? styles.summaryPriceIncluded : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.summaryRow}>
      <div className={styles.summaryMeta}>
        <strong>{item.name}</strong>
        {item.code ? <span className={styles.itemCode}>Code: {item.code}</span> : null}
        <span>{getSummaryMetaLabel(item)}</span>
      </div>
      <strong className={priceClassName}>{getSummaryPriceLabel(item)}</strong>
      {isLocked ? (
        <span className={[styles.summaryBadge, styles.summaryBadgeLocked].join(" ")}>
          {item.isOrderLocked ? "Bestaetigt" : "Standard"}
        </span>
      ) : (
        <button type="button" className={styles.summaryRemove} onClick={() => onRemove(item)}>
          Entfernen
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
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Uebersicht</p>
          <h2>Deine Auswahl</h2>
        </div>
      </div>
      <div className={styles.summaryList}>
        {!selectedComponents.length && !selectedAccessories.length && !selectedServices.length ? (
          <div className={styles.emptyState}>Noch keine Artikel ausgewaehlt.</div>
        ) : null}

        {lockedSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>Standardausstattung</div>
        ) : null}
        {lockedSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} />
        ))}

        {optionalSelectedComponents.length ? (
          <div className={styles.summarySectionTitle}>Zusaetzliche Komponenten</div>
        ) : null}
        {optionalSelectedComponents.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveComponent} />
        ))}

        {selectedAccessories.length ? <div className={styles.summarySectionTitle}>Zubehoer</div> : null}
        {selectedAccessories.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveAccessory} />
        ))}

        {selectedServices.length ? <div className={styles.summarySectionTitle}>Dienstleistungen</div> : null}
        {selectedServices.map((item) => (
          <SummaryRow key={item.id} item={item} onRemove={onRemoveService} />
        ))}
      </div>
      <div className={styles.summaryActions}>
        <div className={styles.summaryTotal}>
          <span>Gesamtpreis</span>
          <strong>{formatCurrency(grandTotal)}</strong>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onOpenOrderSection}>
          Weiter zur Bestellung
        </button>
      </div>
    </div>
  );
}
