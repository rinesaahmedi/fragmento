"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./kitchen-configurator.module.css";

const ICON_MARKUP = {
  dishwasher: '<img src="/img/foto3.png" alt="Spuelmaschine">',
  refrigerator: '<img src="/img/foto6.png" alt="Kuehlschrank">',
  base_cabinet_30: '<img src="/img/foto1.png" alt="Unterschrank 30cm">',
  wall_cabinet_l: '<img src="/img/foto4.png" alt="Oberschrank links">',
  wall_cabinet_r: '<img src="/img/foto2.png" alt="Oberschrank rechts">',
  extractor_hood: '<img src="/img/foto5.png" alt="Dunstabzugshaube">',
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

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function normalizeColor(value) {
  if (!value) return "";
  const color = String(value).trim().toLowerCase();
  if (!color.startsWith("rgb")) return color;
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return color;
  const toHex = (channel) => `0${Number.parseInt(channel, 10).toString(16)}`.slice(-2);
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function componentIdForColor(colorKey) {
  return `component-${String(colorKey || "")
    .replace(/[^a-z0-9#]/gi, "")
    .toLowerCase()}`;
}

function selectedMap(items, codes) {
  return items.filter((item) => codes.includes(item.code));
}

function applyGroupVisualState(group, { selected, hovered, locked }) {
  if (!group) return;

  const emphasisStroke = selected ? "#2c251e" : hovered ? "#27935a" : "";
  const emphasisWidth = selected ? "2.2" : hovered ? "2.6" : "";
  const nextOpacity = locked ? "0.95" : selected ? "1" : hovered ? "0.96" : "0.78";

  group.style.opacity = nextOpacity;
  group.style.filter = hovered ? "drop-shadow(0 0 14px rgba(63, 136, 90, 0.22))" : "none";

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((element) => {
    if (element.classList.contains("component-hitbox")) {
      element.style.fill = selected
        ? "rgba(42, 145, 85, 0.12)"
        : hovered
          ? "rgba(39, 147, 90, 0.1)"
          : locked
            ? "rgba(120, 90, 64, 0.04)"
            : "rgba(171, 107, 46, 0.02)";
      element.style.stroke = selected
        ? "rgba(42, 145, 85, 0.52)"
        : hovered
          ? "rgba(39, 147, 90, 0.45)"
          : locked
            ? "rgba(120, 90, 64, 0.1)"
            : "rgba(171, 107, 46, 0.06)";
      element.style.strokeWidth = "1.2px";
      return;
    }

    if (!element.dataset.originalStroke) {
      element.dataset.originalStroke = element.getAttribute("stroke") || "";
    }
    if (!element.dataset.originalStrokeWidth) {
      element.dataset.originalStrokeWidth = element.getAttribute("stroke-width") || "0.5";
    }

    element.style.stroke = emphasisStroke || element.dataset.originalStroke;
    element.style.strokeWidth = emphasisWidth || `${element.dataset.originalStrokeWidth}px`;
    element.style.vectorEffect = "non-scaling-stroke";
  });
}

export default function KitchenConfigurator({ kitchenConfig, svgMarkup }) {
  const svgHostRef = useRef(null);
  const lockedComponentIds = [
    ...(kitchenConfig.lockedBaseColors || []),
    ...kitchenConfig.components.filter((item) => item.isLocked && item.colorKey).map((item) => item.colorKey),
  ].map((color) => componentIdForColor(normalizeColor(color)));

  const [selectedComponentIds, setSelectedComponentIds] = useState(lockedComponentIds);
  const [selectedAccessoryCodes, setSelectedAccessoryCodes] = useState([]);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState([]);
  const [hoveredComponentId, setHoveredComponentId] = useState("");
  const [planTooltip, setPlanTooltip] = useState(null);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({
    contractNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    paymentMethod: "",
    consent: false,
  });

  const selectedComponents = kitchenConfig.components.filter((item) =>
    selectedComponentIds.includes(componentIdForColor(normalizeColor(item.colorKey))),
  );
  const selectedAccessories = selectedMap(kitchenConfig.accessories, selectedAccessoryCodes);
  const selectedServices = selectedMap(kitchenConfig.services, selectedServiceCodes);
  const lockedComponentIdsKey = lockedComponentIds.join("|");
  const selectedComponentCodes = selectedComponents.map((item) => item.code);
  const hoveredComponent =
    kitchenConfig.components.find(
      (item) => componentIdForColor(normalizeColor(item.colorKey)) === hoveredComponentId,
    ) || null;
  const montageEligible =
    selectedComponents.length >= 3 &&
    selectedComponentCodes.filter((code) => kitchenConfig.montageRequiredCodes.includes(code)).length >= 2;
  const hasAnyBaseSelection = selectedComponents.length > 0 || selectedAccessories.length > 0;
  const grandTotal = [...selectedComponents, ...selectedAccessories, ...selectedServices].reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) {
      return;
    }

    const namespace = "http://www.w3.org/2000/svg";
    const byColor = new Map();
    svg.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse").forEach((element) => {
      if (element.closest("[data-component-id]")) return;
      const color = normalizeColor(element.getAttribute("stroke"));
      if (!color) return;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color).push(element);
    });

    for (const item of kitchenConfig.components) {
      const colorKey = normalizeColor(item.colorKey);
      if (!colorKey) continue;

      const componentId = componentIdForColor(colorKey);
      let group = svg.querySelector(`[data-component-id="${componentId}"]`);

      if (!group && byColor.has(colorKey)) {
        const elements = byColor.get(colorKey);
        const firstElement = elements[0];
        const parent = firstElement?.parentNode;
        if (!firstElement || !parent) continue;

        group = document.createElementNS(namespace, "g");
        group.dataset.componentId = componentId;
        parent.insertBefore(group, firstElement);
        elements.forEach((element) => group.appendChild(element));
      }

      if (group) {
        group.classList.add("kitchen-component");
        const existingHitbox = group.querySelector(".component-hitbox");
        if (existingHitbox) {
          existingHitbox.remove();
        }

        if (typeof group.getBBox === "function") {
          const box = group.getBBox();
          const hitbox = document.createElementNS(namespace, "rect");
          hitbox.classList.add("component-hitbox");
          hitbox.setAttribute("x", String(box.x - 6));
          hitbox.setAttribute("y", String(box.y - 6));
          hitbox.setAttribute("width", String(box.width + 12));
          hitbox.setAttribute("height", String(box.height + 12));
          hitbox.setAttribute("rx", "8");
          hitbox.setAttribute("ry", "8");
          hitbox.setAttribute("fill", "transparent");
          hitbox.setAttribute("stroke", "transparent");
          group.insertBefore(hitbox, group.firstChild);
        }

        applyGroupVisualState(group, {
          selected: selectedComponentIds.includes(componentId),
          hovered: hoveredComponentId === componentId,
          locked: lockedComponentIds.includes(componentId),
        });
      }
    }

    const onClick = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group) return;

      const componentId = group.dataset.componentId;
      if (lockedComponentIds.includes(componentId)) return;

      setSelectedComponentIds((current) =>
        current.includes(componentId)
          ? current.filter((id) => id !== componentId)
          : [...current, componentId],
      );
    };

    const onPointerMove = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group || !host.contains(group)) {
        setHoveredComponentId("");
        setPlanTooltip(null);
        return;
      }

      const componentId = group.dataset.componentId || "";
      setHoveredComponentId(componentId);

      const svgRect = svg.getBoundingClientRect();
      const box = typeof group.getBBox === "function" ? group.getBBox() : null;
      if (!box) {
        setPlanTooltip(null);
        return;
      }

      const viewBox = svg.viewBox?.baseVal;
      const scaleX = viewBox?.width ? svgRect.width / viewBox.width : 1;
      const scaleY = viewBox?.height ? svgRect.height / viewBox.height : 1;
      const left = box.x * scaleX + box.width * scaleX * 0.5;
      const top = box.y * scaleY - 12;

      setPlanTooltip({ left, top });
    };

    const onPointerLeave = () => {
      setHoveredComponentId("");
      setPlanTooltip(null);
    };

    host.addEventListener("click", onClick, true);
    host.addEventListener("mousemove", onPointerMove, true);
    host.addEventListener("mouseleave", onPointerLeave, true);
    return () => {
      host.removeEventListener("click", onClick, true);
      host.removeEventListener("mousemove", onPointerMove, true);
      host.removeEventListener("mouseleave", onPointerLeave, true);
    };
  }, [kitchenConfig.components, lockedComponentIdsKey]);

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!svg) return;

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id");
      const selected = selectedComponentIds.includes(componentId);
      const locked = lockedComponentIds.includes(componentId);
      const hovered = hoveredComponentId === componentId;

      group.classList.toggle("selected", selected);
      group.classList.toggle("locked", locked);
      group.classList.toggle("hovered", hovered);
      applyGroupVisualState(group, { selected, hovered, locked });
    });
  }, [hoveredComponentId, lockedComponentIdsKey, selectedComponentIds]);

  useEffect(() => {
    if (!montageEligible && selectedServiceCodes.includes("service-montage")) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== "service-montage"));
    }
    if (!hasAnyBaseSelection && selectedServiceCodes.includes("service-pickup")) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== "service-pickup"));
    }
  }, [hasAnyBaseSelection, montageEligible, selectedServiceCodes]);

  function toggleAccessory(itemCode) {
    setSelectedAccessoryCodes((current) =>
      current.includes(itemCode) ? current.filter((code) => code !== itemCode) : [...current, itemCode],
    );
  }

  function toggleService(itemCode) {
    if (itemCode === "service-montage" && !montageEligible) {
      setStatus("Montage ist erst ab mindestens 3 Artikeln moeglich, davon 2 Schrank-Komponenten.");
      setStatusTone("error");
      return;
    }

    if (itemCode === "service-pickup" && !hasAnyBaseSelection) {
      setStatus("Abholung kann erst hinzugefuegt werden, wenn mindestens ein Artikel ausgewaehlt wurde.");
      setStatusTone("error");
      return;
    }

    setStatus("");
    setStatusTone("idle");

    setSelectedServiceCodes((current) => {
      const exists = current.includes(itemCode);
      if (exists) return current.filter((code) => code !== itemCode);
      if (itemCode === "service-montage") return [...current.filter((code) => code !== "service-pickup"), itemCode];
      if (itemCode === "service-pickup") return [...current.filter((code) => code !== "service-montage"), itemCode];
      return [...current, itemCode];
    });
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function removeComponent(item) {
    const componentId = componentIdForColor(normalizeColor(item.colorKey));
    if (lockedComponentIds.includes(componentId)) {
      return;
    }
    setSelectedComponentIds((current) => current.filter((id) => id !== componentId));
  }

  function removeAccessory(item) {
    setSelectedAccessoryCodes((current) => current.filter((code) => code !== item.code));
  }

  function removeService(item) {
    setSelectedServiceCodes((current) => current.filter((code) => code !== item.code));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!grandTotal) {
      setStatus("Waehle zuerst mindestens einen Artikel aus.");
      setStatusTone("error");
      return;
    }

    if (!customer.consent) {
      setStatus("Bitte bestaetige die Datenschutzeinwilligung.");
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("Bestellung wird gesendet...");
    setStatusTone("idle");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchen_slug: kitchenConfig.kitchen.slug,
          order_payload: {
            customer: {
              contractNumber: customer.contractNumber,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              address1: customer.address1,
              address2: customer.address2,
              postalCode: customer.postalCode,
              city: customer.city,
              paymentMethod: customer.paymentMethod,
            },
            components: selectedComponents,
            accessories: selectedAccessories,
            services: selectedServices,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Bestellung konnte nicht gespeichert werden.");
      }

      const emailIssue = payload.notifications?.emailError;
      const webhookIssue = payload.notifications?.webhookError;

      if (emailIssue || webhookIssue) {
        const notes = [emailIssue ? `E-Mail: ${emailIssue}` : "", webhookIssue ? `Webhook: ${webhookIssue}` : ""]
          .filter(Boolean)
          .join(" | ");
        setStatus(`Bestellung gespeichert. Auftragsnummer: ${payload.orderNumber}. Hinweis: ${notes}`);
      } else {
        setStatus(`Bestellung gespeichert. Auftragsnummer: ${payload.orderNumber}`);
      }
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message || "Bestellung konnte nicht gesendet werden.");
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCatalogItem(item, options = {}) {
    const className = [
      styles.itemCard,
      options.selected ? styles.itemCardSelected : "",
      options.locked ? styles.itemCardLocked : "",
      options.hovered ? styles.itemCardHovered : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        key={item.id}
        type="button"
        className={className}
        onClick={options.onClick}
        disabled={options.locked}
        onMouseEnter={options.onMouseEnter}
        onMouseLeave={options.onMouseLeave}
      >
        <div className={styles.itemTop}>
          <span className={styles.itemIcon} dangerouslySetInnerHTML={{ __html: ICON_MARKUP[item.iconKey] || "" }} />
          <div className={styles.itemText}>
            <strong>{item.name}</strong>
            {item.infoText ? <p>{item.infoText}</p> : null}
          </div>
          <span className={styles.itemPrice}>{formatCurrency(item.price)}</span>
        </div>
        <div className={styles.itemMeta}>
          <span className={options.locked ? styles.lockedPill : styles.togglePill}>
            {options.locked ? "Fix" : options.selected ? "Entfernen" : "Hinzufuegen"}
          </span>
          {options.hint ? <span className={styles.ruleHint}>{options.hint}</span> : null}
        </div>
      </button>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            Zurueck
          </Link>
          <div className={styles.brand}>
            <img src="/img/fragmentologo.png" alt="Fragmento" />
            <div className={styles.brandText}>
              <h1>{kitchenConfig.kitchen.name}</h1>
              <p>{kitchenConfig.kitchen.description || "Konfiguriere deine Kueche direkt aus dem aktuellen Katalog."}</p>
            </div>
          </div>
          <div className={styles.pricePill}>
            <span>Gesamtpreis</span>
            <strong>{formatCurrency(grandTotal)}</strong>
          </div>
        </header>

        <section className={styles.layout}>
          <div className={styles.stage}>
            <div className={styles.stageHeader}>
              <div>
                <p className={styles.eyebrow}>Plan</p>
                <h2>Interaktive Kuechenansicht</h2>
              </div>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => {
                  setSelectedAccessoryCodes([]);
                  setSelectedServiceCodes([]);
                  setSelectedComponentIds(lockedComponentIds);
                  setStatus("");
                  setStatusTone("idle");
                }}
              >
                Auswahl zuruecksetzen
              </button>
            </div>
            <div className={styles.stageBody}>
              <div className={styles.svgCard}>
                <div ref={svgHostRef} className={styles.svgCanvas} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
                {hoveredComponent && planTooltip ? (
                  <div
                    className={styles.planTooltip}
                    style={{ left: `${planTooltip.left}px`, top: `${planTooltip.top}px` }}
                  >
                    <strong>{hoveredComponent.name}</strong>
                    <span>{formatCurrency(hoveredComponent.price)}</span>
                  </div>
                ) : null}
              </div>
              <div className={styles.stageLegend}>
                <span className={styles.legendChip}>
                  <span className={styles.legendSwatch} />
                  Im Plan anklicken oder rechts auswaehlen
                </span>
                <span className={styles.legendChip}>
                  <span className={styles.legendDot} />
                  Fixe Bestandteile bleiben immer aktiv
                </span>
              </div>
            </div>
          </div>

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
                  {kitchenConfig.components.map((item) => {
                    const componentId = componentIdForColor(normalizeColor(item.colorKey));
                    const locked = lockedComponentIds.includes(componentId);

                    return renderCatalogItem(item, {
                      selected: selectedComponentIds.includes(componentId),
                      locked,
                      hovered: hoveredComponentId === componentId,
                      onClick: () =>
                        setSelectedComponentIds((current) =>
                          current.includes(componentId)
                            ? current.filter((id) => id !== componentId)
                            : [...current, componentId],
                        ),
                      onMouseEnter: () => setHoveredComponentId(componentId),
                      onMouseLeave: () => {
                        setHoveredComponentId("");
                        setPlanTooltip(null);
                      },
                    });
                  })}
                </div>
              </section>

              <section className={styles.catalogSection}>
                <h3>Zubehoer</h3>
                <div className={styles.catalogGrid}>
                  {kitchenConfig.accessories.map((item) =>
                    renderCatalogItem(item, {
                      selected: selectedAccessoryCodes.includes(item.code),
                      onClick: () => toggleAccessory(item.code),
                    }),
                  )}
                </div>
              </section>

              <section className={styles.catalogSection}>
                <h3>Dienstleistungen</h3>
                <div className={styles.catalogGrid}>
                  {kitchenConfig.services.map((item) =>
                    renderCatalogItem(item, {
                      selected: selectedServiceCodes.includes(item.code),
                      onClick: () => toggleService(item.code),
                      hint:
                        item.code === "service-montage"
                          ? "Mindestens 3 Artikel, davon 2 Schrank-Komponenten"
                          : item.code === "service-pickup"
                            ? "Nur mit mindestens einem ausgewaehlten Artikel"
                            : "",
                    }),
                  )}
                </div>
              </section>
            </div>
          </aside>
        </section>

        <section className={styles.summaryGrid}>
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

              {selectedComponents.length ? <div className={styles.summarySectionTitle}>Komponenten</div> : null}
              {selectedComponents.map((item) => (
                <div key={item.id} className={styles.summaryRow}>
                  <div className={styles.summaryMeta}>
                    <strong>{item.name}</strong>
                    <span>{item.isLocked ? "Fixer Bestandteil" : "Ausgewaehlt"}</span>
                  </div>
                  <strong className={styles.summaryPrice}>{formatCurrency(item.price)}</strong>
                  <button
                    type="button"
                    className={styles.summaryRemove}
                    onClick={() => removeComponent(item)}
                    disabled={item.isLocked}
                  >
                    {item.isLocked ? "Fix" : "Entfernen"}
                  </button>
                </div>
              ))}

              {selectedAccessories.length ? <div className={styles.summarySectionTitle}>Zubehoer</div> : null}
              {selectedAccessories.map((item) => (
                <div key={item.id} className={styles.summaryRow}>
                  <div className={styles.summaryMeta}>
                    <strong>{item.name}</strong>
                  </div>
                  <strong className={styles.summaryPrice}>{formatCurrency(item.price)}</strong>
                  <button type="button" className={styles.summaryRemove} onClick={() => removeAccessory(item)}>
                    Entfernen
                  </button>
                </div>
              ))}

              {selectedServices.length ? <div className={styles.summarySectionTitle}>Dienstleistungen</div> : null}
              {selectedServices.map((item) => (
                <div key={item.id} className={styles.summaryRow}>
                  <div className={styles.summaryMeta}>
                    <strong>{item.name}</strong>
                  </div>
                  <strong className={styles.summaryPrice}>{formatCurrency(item.price)}</strong>
                  <button type="button" className={styles.summaryRemove} onClick={() => removeService(item)}>
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.orderPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Bestellung</p>
                <h2>Kundendaten</h2>
              </div>
            </div>
            <div className={styles.totalsCard}>
              <span>Aktuelle Summe</span>
              <strong>{formatCurrency(grandTotal)}</strong>
              <div className={styles.totalsActions}>
                <button type="submit" form="order-form" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? "Wird gesendet..." : "Bestellung absenden"}
                </button>
              </div>
            </div>

            <form id="order-form" className={styles.orderForm} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="contractNumber">Vertragsnummer</label>
                <input id="contractNumber" value={customer.contractNumber} onChange={(event) => updateCustomer("contractNumber", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="paymentMethod">Zahlungsart</label>
                <select id="paymentMethod" value={customer.paymentMethod} onChange={(event) => updateCustomer("paymentMethod", event.target.value)}>
                  <option value="">Bitte waehlen</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="klarna">Klarna</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="firstName">Vorname</label>
                <input id="firstName" required value={customer.firstName} onChange={(event) => updateCustomer("firstName", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="lastName">Nachname</label>
                <input id="lastName" required value={customer.lastName} onChange={(event) => updateCustomer("lastName", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="email">E-Mail</label>
                <input id="email" type="email" required value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="phone">Telefon</label>
                <input id="phone" required value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} />
              </div>
              <div className={styles.fieldFull}>
                <label htmlFor="address1">Adresse</label>
                <input id="address1" required value={customer.address1} onChange={(event) => updateCustomer("address1", event.target.value)} />
              </div>
              <div className={styles.fieldFull}>
                <label htmlFor="address2">Adresszusatz</label>
                <input id="address2" value={customer.address2} onChange={(event) => updateCustomer("address2", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="postalCode">PLZ</label>
                <input id="postalCode" required value={customer.postalCode} onChange={(event) => updateCustomer("postalCode", event.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="city">Ort</label>
                <input id="city" required value={customer.city} onChange={(event) => updateCustomer("city", event.target.value)} />
              </div>
              <div className={styles.checkboxRow}>
                <input
                  id="consent"
                  type="checkbox"
                  checked={customer.consent}
                  onChange={(event) => updateCustomer("consent", event.target.checked)}
                />
                <label htmlFor="consent">
                  Ich bestaetige, dass meine Angaben zur Bearbeitung der Bestellung verwendet werden duerfen.
                </label>
              </div>
            </form>

            <div
              className={[
                styles.status,
                statusTone === "error" ? styles.statusError : "",
                statusTone === "success" ? styles.statusSuccess : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {status}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
