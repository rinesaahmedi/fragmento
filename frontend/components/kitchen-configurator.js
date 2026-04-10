"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import KitchenCatalogPanel from "./kitchen-catalog-panel";
import styles from "./kitchen-configurator.module.css";
import KitchenOrderForm from "./kitchen-order-form";
import { blobToBase64, generateOrderPdf } from "./kitchen-order-pdf";
import KitchenSelectionSummary from "./kitchen-selection-summary";
import {
  componentIdForItem,
  componentIdForKey,
  formatCurrency,
  isHiddenLinkedComponent,
  normalizeColor,
  selectedMap,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import KitchenSvgStage from "./kitchen-svg-stage";
import { PLAN_VIEWPORT_BY_SLUG } from "./kitchen-svg-plan-utils";

function buildInitialCustomer(contractNumber) {
  return {
    contractNumber,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    country: "",
    notes: "",
    paymentMethod: "",
    consent: false,
  };
}

export default function KitchenConfigurator({ kitchenConfig, svgMarkup, initialContractNumber = "" }) {
  const orderSectionRef = useRef(null);
  const kitchenSlug = String(kitchenConfig.kitchen.slug || "").trim().toLowerCase();
  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenConfig.kitchen.slug];
  const lockedComponentIds = [
    ...(kitchenConfig.lockedBaseColors || []),
    ...kitchenConfig.components
      .filter((item) => item.isLocked)
      .map((item) => (item.componentKey ? item.componentKey : normalizeColor(item.colorKey))),
  ].map((value) => componentIdForKey(value));

  const [selectedComponentIds, setSelectedComponentIds] = useState(lockedComponentIds);
  const [selectedAccessoryCodes, setSelectedAccessoryCodes] = useState([]);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState([]);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderSectionOpen, setIsOrderSectionOpen] = useState(false);
  const [customer, setCustomer] = useState(buildInitialCustomer(initialContractNumber));

  useEffect(() => {
    if (!initialContractNumber) return;
    setCustomer((current) => {
      if (current.contractNumber === initialContractNumber) return current;
      return { ...current, contractNumber: initialContractNumber };
    });
  }, [initialContractNumber]);

  const selectedComponents = kitchenConfig.components.filter((item) =>
    selectedComponentIds.includes(componentIdForItem(item)),
  );
  const selectedAccessories = selectedMap(kitchenConfig.accessories, selectedAccessoryCodes);
  const selectedServices = selectedMap(kitchenConfig.services, selectedServiceCodes);
  const lockedSelectedComponents = selectedComponents.filter((item) => item.isLocked);
  const optionalSelectedComponents = selectedComponents.filter((item) => !item.isLocked);
  const lockedComponentIdsKey = lockedComponentIds.join("|");
  const selectedComponentCodes = selectedComponents.map((item) => item.code);
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !lockedComponentIds.includes(componentId) && !isHiddenLinkedComponent(kitchenSlug, componentId);
  });
  const montageEligible =
    selectedComponents.length >= 3 &&
    selectedComponentCodes.filter((code) => kitchenConfig.montageRequiredCodes.includes(code)).length >= 2;
  const hasAnyBaseSelection = selectedComponents.length > 0 || selectedAccessories.length > 0;
  const grandTotal = [...selectedComponents, ...selectedAccessories, ...selectedServices].reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  useEffect(() => {
    setSelectedComponentIds((current) => {
      const next = [...new Set([...lockedComponentIds, ...current])];
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        return current;
      }
      return next;
    });
  }, [lockedComponentIds, lockedComponentIdsKey]);

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
    const componentId = componentIdForItem(item);
    if (lockedComponentIds.includes(componentId)) {
      return;
    }
    setSelectedComponentIds((current) =>
      toggleLinkedComponentSelection(kitchenSlug, current, componentId, lockedComponentIds),
    );
  }

  function removeAccessory(item) {
    setSelectedAccessoryCodes((current) => current.filter((code) => code !== item.code));
  }

  function removeService(item) {
    setSelectedServiceCodes((current) => current.filter((code) => code !== item.code));
  }

  function resetSelection() {
    setSelectedAccessoryCodes([]);
    setSelectedServiceCodes([]);
    setSelectedComponentIds(lockedComponentIds);
    setStatus("");
    setStatusTone("idle");
  }

  function openOrderSection() {
    setIsOrderSectionOpen(true);
    window.requestAnimationFrame(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

    if (!customer.paymentMethod) {
      setStatus("Bitte waehle eine Zahlungsmethode aus.");
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("Bestellung wird gesendet...");
    setStatusTone("idle");

    try {
      const pdfOrder = {
        orderNumber: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
        createdAt: new Date().toLocaleString("de-DE"),
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
          country: customer.country,
          notes: customer.notes,
          paymentMethod: customer.paymentMethod,
        },
        components: selectedComponents,
        accessories: selectedAccessories,
        services: selectedServices,
        total: grandTotal,
      };
      const pdf = await generateOrderPdf(pdfOrder);
      const pdfBase64 = await blobToBase64(pdf.blob);

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
              country: customer.country,
              notes: customer.notes,
              paymentMethod: customer.paymentMethod,
              consent: customer.consent,
            },
            components: selectedComponents,
            accessories: selectedAccessories,
            services: selectedServices,
          },
          pdf_base64: pdfBase64,
          pdf_filename: pdf.filename,
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

        <section className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <KitchenSvgStage
              svgMarkup={svgMarkup}
              kitchenConfig={kitchenConfig}
              kitchenSlug={kitchenSlug}
              planViewport={planViewport}
              lockedComponentIds={lockedComponentIds}
              selectedComponentIds={selectedComponentIds}
              setSelectedComponentIds={setSelectedComponentIds}
              onResetSelection={resetSelection}
            />

            <KitchenSelectionSummary
              selectedComponents={selectedComponents}
              selectedAccessories={selectedAccessories}
              selectedServices={selectedServices}
              lockedSelectedComponents={lockedSelectedComponents}
              optionalSelectedComponents={optionalSelectedComponents}
              onRemoveComponent={removeComponent}
              onRemoveAccessory={removeAccessory}
              onRemoveService={removeService}
              onOpenOrderSection={openOrderSection}
            />
          </div>

          <div className={styles.sideColumn}>
            <KitchenCatalogPanel
              kitchenConfig={kitchenConfig}
              kitchenSlug={kitchenSlug}
              visibleComponents={visibleComponents}
              selectedComponents={selectedComponents}
              selectedAccessories={selectedAccessories}
              selectedServices={selectedServices}
              selectedComponentIds={selectedComponentIds}
              selectedAccessoryCodes={selectedAccessoryCodes}
              selectedServiceCodes={selectedServiceCodes}
              lockedComponentIds={lockedComponentIds}
              setSelectedComponentIds={setSelectedComponentIds}
              onToggleAccessory={toggleAccessory}
              onToggleService={toggleService}
            />
          </div>
        </section>

        {isOrderSectionOpen ? (
          <KitchenOrderForm
            orderSectionRef={orderSectionRef}
            customer={customer}
            isSubmitting={isSubmitting}
            status={status}
            statusTone={statusTone}
            onSubmit={handleSubmit}
            onUpdateCustomer={updateCustomer}
          />
        ) : null}
      </div>
    </div>
  );
}
