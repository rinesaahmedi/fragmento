"use client";

import styles from "./kitchen-configurator.module.css";
import {
  componentIdForItem,
  formatCurrency,
  getCatalogDisplayItem,
  isLinkedComponentSelected,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";

const DISHWASHER_BASE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 10 24 L 14 44 H 46 L 50 24 Z"/><line x1="18" y1="26" x2="20" y2="44"/><line x1="26" y1="26" x2="26" y2="44"/><line x1="34" y1="26" x2="34" y2="44"/><line x1="42" y1="26" x2="40" y2="44"/><line x1="12" y1="32" x2="48" y2="32"/><line x1="13" y1="38" x2="47" y2="38"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">GS</text></svg>';

const ICON_MARKUP = {
  dishwasher: DISHWASHER_BASE_MARKUP,
  refrigerator: '<img src="/img/foto6.png" alt="Kuehlschrank">',
  base_cabinet_30: '<img src="/img/foto1.png" alt="Unterschrank 30cm">',
  wall_cabinet_l: '<img src="/img/foto4.png" alt="Oberschrank links">',
  wall_cabinet_r: '<img src="/img/foto2.png" alt="Oberschrank rechts">',
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
  wall_cabinet_single_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><g stroke="#666" stroke-width="0.75"><line x1="30" y1="60" x2="30" y2="63"/><line x1="28" y1="63" x2="32" y2="63"/><line x1="26" y1="66" x2="22" y2="74"/><line x1="30" y1="66" x2="30" y2="75"/><line x1="34" y1="66" x2="38" y2="74"/></g></svg>',
  wall_cabinet_double_light:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/><rect x="0.5" y="60" width="59" height="2"/><g stroke="#666" stroke-width="0.75"><line x1="20" y1="62" x2="20" y2="64"/><line x1="18" y1="64" x2="22" y2="64"/><line x1="17" y1="67" x2="14" y2="73"/><line x1="20" y1="67" x2="20" y2="74"/><line x1="23" y1="67" x2="26" y2="73"/><line x1="40" y1="62" x2="40" y2="64"/><line x1="38" y1="64" x2="42" y2="64"/><line x1="37" y1="67" x2="34" y2="73"/><line x1="40" y1="67" x2="40" y2="74"/><line x1="43" y1="67" x2="46" y2="73"/></g></svg>',
  wall_cabinet_plain:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
  washing_machine_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="14" x2="60" y2="14"/><line x1="10" y1="8" x2="25" y2="8" stroke-width="0.5"/><g stroke="#ccc" stroke-width="0.5"><path d="M 16 26 C 12 26 12 46 16 46 Z"/><circle cx="30" cy="36" r="14"/><circle cx="30" cy="36" r="10"/></g><rect x="24" y="58" width="12" height="8" fill="white"/><text x="30" y="64" font-family="sans-serif" font-size="5" text-anchor="middle" fill="currentColor" stroke="none">WM</text></svg>',
  sink_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="20" y1="14" x2="40" y2="14" stroke-linecap="round" stroke-width="1.5"/></svg>',
  dishwasher_base: DISHWASHER_BASE_MARKUP,
  oven_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><rect x="44" y="6" width="4" height="4"/><rect x="52" y="6" width="4" height="4"/><line x1="0" y1="56" x2="60" y2="56"/><rect x="8" y="22" width="44" height="26"/><rect x="12" y="26" width="36" height="18"/><line x1="22" y1="62" x2="38" y2="62" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="24" x2="40" y2="24" stroke-linecap="round" stroke-width="1.5"/></svg>',
  worktop:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" fill="none" stroke="currentColor" stroke-width="1"><line x1="2" y1="7" x2="118" y2="7"/><line x1="2" y1="13" x2="118" y2="13"/><line x1="118" y1="7" x2="118" y2="13"/></svg>',
  drawer_base_two:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="18" x2="60" y2="18"/><line x1="20" y1="10" x2="40" y2="10" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="26" x2="40" y2="26" stroke-linecap="round" stroke-width="1.5"/></svg>',
  drawer_base_three:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 82" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="2"/><rect x="0.5" y="2.5" width="59" height="69"/><rect x="0.5" y="72.5" width="59" height="9"/><line x1="0" y1="16" x2="60" y2="16"/><line x1="0" y1="44" x2="60" y2="44"/><line x1="20" y1="9" x2="40" y2="9" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="30" x2="40" y2="30" stroke-linecap="round" stroke-width="1.5"/><line x1="20" y1="58" x2="40" y2="58" stroke-linecap="round" stroke-width="1.5"/></svg>',
  tall_refrigerator:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 190" fill="none" stroke="currentColor" stroke-width="1"><line x1="3" y1="1" x2="57" y2="1"/><line x1="3" y1="1" x2="3" y2="186"/><line x1="57" y1="1" x2="57" y2="186"/><line x1="3" y1="186" x2="57" y2="186"/><line x1="8" y1="186" x2="8" y2="189" stroke-width="1.5"/><line x1="52" y1="186" x2="52" y2="189" stroke-width="1.5"/><line x1="3" y1="110" x2="57" y2="110"/><line x1="12" y1="108" x2="48" y2="108" stroke-linecap="round" stroke-width="1.5"/><line x1="12" y1="112" x2="48" y2="112" stroke-linecap="round" stroke-width="1.5"/></svg>',
  extractor_hood_chimney:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none" stroke="currentColor" stroke-width="1"><rect x="24" y="0.5" width="12" height="39"/><line x1="24" y1="20" x2="36" y2="20"/><rect x="10" y="40" width="40" height="12"/><g stroke="#666" stroke-width="0.75"><line x1="18" y1="55" x2="15" y2="62"/><line x1="22" y1="55" x2="22" y2="63"/><line x1="26" y1="55" x2="29" y2="62"/><line x1="34" y1="55" x2="31" y2="62"/><line x1="38" y1="55" x2="38" y2="63"/><line x1="42" y1="55" x2="45" y2="62"/></g></svg>',
  wall_cabinet_standard:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="59" height="59"/><line x1="20" y1="50" x2="40" y2="50" stroke-linecap="round" stroke-width="1.5"/></svg>',
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

function CatalogItem({ item, selected, locked, price, hint, infoPdfHref, onClick }) {
  const className = [
    styles.itemCard,
    selected ? styles.itemCardSelected : "",
    locked ? styles.itemCardLocked : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={className} onClick={onClick} disabled={locked}>
      <div className={styles.itemTop}>
        <span className={styles.itemIcon} dangerouslySetInnerHTML={{ __html: ICON_MARKUP[item.iconKey] || "" }} />
        <div className={styles.itemText}>
          <strong>{item.name}</strong>
          {item.code ? <span className={styles.itemCode}>Code: {item.code}</span> : null}
          {item.infoText ? <p>{item.infoText}</p> : null}
        </div>
        <span className={styles.itemPrice}>{formatCurrency(price ?? item.price)}</span>
      </div>
      <div className={styles.itemMeta}>
        <span className={locked ? styles.lockedPill : styles.togglePill}>
          {locked ? "Fix" : selected ? "Entfernen" : "Hinzufuegen"}
        </span>
        <div className={styles.itemMetaAside}>
          {hint ? <span className={styles.ruleHint}>{hint}</span> : null}
          {infoPdfHref ? (
            <a
              href={infoPdfHref}
              target="_blank"
              rel="noreferrer"
              className={styles.itemPdfLink}
              onClick={(event) => event.stopPropagation()}
            >
              PDF
            </a>
          ) : null}
        </div>
      </div>
    </button>
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
  fixedComponentIds,
  orderLockedAccessoryCodes,
  orderLockedServiceCodes,
  setSelectedComponentIds,
  onToggleAccessory,
  onToggleService,
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div>
          <p className={styles.eyebrow}>Katalog</p>
          <h2>Bauteile und Optionen</h2>
        </div>
        <span className={styles.badge}>
          {selectedComponents.length + selectedAccessories.length + selectedServices.length}
        </span>
      </div>
      <div className={styles.catalog}>
        <section className={styles.catalogSection}>
          <h3>Komponenten</h3>
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
          <h3>Zubehoer</h3>
          <div className={styles.catalogGrid}>
            {kitchenConfig.accessories.map((item) => (
              <CatalogItem
                key={item.id}
                item={item}
                selected={selectedAccessoryCodes.includes(item.code)}
                locked={orderLockedAccessoryCodes.has(item.code)}
                onClick={() => onToggleAccessory(item.code)}
              />
            ))}
          </div>
        </section>

        <section className={styles.catalogSection}>
          <h3>Dienstleistungen</h3>
          <div className={styles.catalogGrid}>
            {kitchenConfig.services.map((item) => (
              <CatalogItem
                key={item.id}
                item={item}
                selected={selectedServiceCodes.includes(item.code)}
                locked={orderLockedServiceCodes.has(item.code)}
                hint={
                  item.code === "SVC-MONTAGE-001"
                    ? "Mindestens 3 Artikel, davon 2 Schrank-Komponenten"
                    : item.code === "SVC-PICKUP-001"
                      ? "Nur mit mindestens einem ausgewaehlten Artikel"
                      : ""
                }
                onClick={() => onToggleService(item.code)}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
