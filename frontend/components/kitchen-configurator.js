"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  getServiceEligibility,
  SERVICE_CODE_MONTAGE,
  SERVICE_CODE_PICKUP,
} from "../lib/service-eligibility";
import {
  ADDRESS_VERIFICATION_STATUS,
  addressVerificationSnapshotKey,
  buildAddressVerificationSnapshot,
  buildAddressVerificationState,
} from "../lib/address-verification";

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

const ADDRESS_VERIFICATION_FIELD_KEYS = new Set([
  "address1",
  "address2",
  "country",
  "city",
  "postalCode",
]);
const ORDER_ADDRESS_FIELD_KEYS = ["address1", "address2", "country", "city", "postalCode"];

const ORDER_COUNTRY_BY_CONTRACT_COUNTRY = {
  Germany: "Deutschland",
  Austria: "Oesterreich",
  Switzerland: "Schweiz",
  Hungary: "Ungarn",
  Kosovo: "Kosovo",
  Czechia: "Tschechien",
  Slovakia: "Slowakei",
  Poland: "Polen",
};

function buildCustomerAddressFromContract(contractAddress) {
  if (!contractAddress) return {};

  return {
    country: ORDER_COUNTRY_BY_CONTRACT_COUNTRY[contractAddress.country] || contractAddress.country || "",
    city: contractAddress.city || "",
    postalCode: contractAddress.postalCode || "",
    address1: contractAddress.address1 || "",
    address2: contractAddress.address2 || "",
  };
}

function normalizeAddressValue(value) {
  return String(value ?? "").trim();
}

function hasContractAddress(contractAddress) {
  const contractCustomerAddress = buildCustomerAddressFromContract(contractAddress);
  return ORDER_ADDRESS_FIELD_KEYS.some((fieldKey) => normalizeAddressValue(contractCustomerAddress[fieldKey]));
}

function customerUsesContractAddress(customer, contractAddress) {
  if (!hasContractAddress(contractAddress)) return false;

  const contractCustomerAddress = buildCustomerAddressFromContract(contractAddress);
  return ORDER_ADDRESS_FIELD_KEYS.every(
    (fieldKey) => normalizeAddressValue(customer?.[fieldKey]) === normalizeAddressValue(contractCustomerAddress[fieldKey]),
  );
}

function buildInitialCustomerFromOrder(initialOrder, contractNumber) {
  return {
    ...buildInitialCustomer(contractNumber),
    ...(initialOrder?.customer || {}),
    contractNumber: initialOrder?.customer?.contractNumber || contractNumber,
    consent: false,
  };
}

function buildInitialCustomerState(initialOrder, contractNumber, contractAddress) {
  if (initialOrder) {
    return buildInitialCustomerFromOrder(initialOrder, contractNumber);
  }

  return {
    ...buildInitialCustomer(contractNumber),
    ...buildCustomerAddressFromContract(contractAddress),
  };
}

function buildInitialAddressPreference(initialOrder, contractNumber, contractAddress) {
  const initialCustomer = buildInitialCustomerState(initialOrder, contractNumber, contractAddress);
  return customerUsesContractAddress(initialCustomer, contractAddress);
}

function buildProductInfoState(payload) {
  if (!payload?.infoPdfHref || !payload?.item) return null;

  return {
    ...payload,
    title: payload.item.name || "Produktinformation",
    price: Number(payload.price ?? payload.item.price ?? 0),
    infoText: payload.item.infoText || "",
  };
}

function initialItemCodesByType(initialOrder, itemType) {
  return new Set(
    (initialOrder?.items || [])
      .filter((item) => item.itemType === itemType)
      .map((item) => item.code)
      .filter(Boolean),
  );
}

function lockedItemCodesByType(initialOrder, itemType) {
  return new Set(
    (initialOrder?.items || [])
      .filter((item) => item.itemType === itemType && item.locked)
      .map((item) => item.code)
      .filter(Boolean),
  );
}

function buildInitialComponentIds(kitchenConfig, lockedComponentIds, initialOrder) {
  const componentCodes = initialItemCodesByType(initialOrder, "component");
  const existingComponentIds = kitchenConfig.components
    .filter((item) => componentCodes.has(item.code))
    .map((item) => componentIdForItem(item));

  return [...new Set([...lockedComponentIds, ...existingComponentIds])];
}

function buildInitialCodes(kitchenConfig, initialOrder, itemType, configKey) {
  const itemCodes = initialItemCodesByType(initialOrder, itemType);
  return kitchenConfig[configKey].filter((item) => itemCodes.has(item.code)).map((item) => item.code);
}

function buildOrderLockedComponentIds(kitchenConfig, initialOrder) {
  const componentCodes = lockedItemCodesByType(initialOrder, "component");
  return kitchenConfig.components
    .filter((item) => componentCodes.has(item.code))
    .map((item) => componentIdForItem(item));
}

export default function KitchenConfigurator({
  kitchenConfig,
  svgMarkup,
  initialContractNumber = "",
  initialOrder = null,
  initialContractAddress = null,
}) {
  const orderSectionRef = useRef(null);
  const kitchenSlug = String(kitchenConfig.kitchen.slug || "").trim().toLowerCase();
  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenConfig.kitchen.slug];
  const lockedComponentIds = useMemo(
    () =>
      [
        ...(kitchenConfig.lockedBaseColors || []),
        ...kitchenConfig.components
          .filter((item) => item.isLocked)
          .map((item) => (item.componentKey ? item.componentKey : normalizeColor(item.colorKey))),
      ].map((value) => componentIdForKey(value)),
    [kitchenConfig],
  );
  const orderLockedComponentIds = useMemo(
    () => buildOrderLockedComponentIds(kitchenConfig, initialOrder),
    [kitchenConfig, initialOrder],
  );
  const fixedComponentIds = useMemo(
    () => [...new Set([...lockedComponentIds, ...orderLockedComponentIds])],
    [lockedComponentIds, orderLockedComponentIds],
  );
  const orderLockedAccessoryCodes = useMemo(
    () => lockedItemCodesByType(initialOrder, "accessory"),
    [initialOrder],
  );
  const orderLockedServiceCodes = useMemo(
    () => lockedItemCodesByType(initialOrder, "service"),
    [initialOrder],
  );

  const [selectedComponentIds, setSelectedComponentIds] = useState(() =>
    buildInitialComponentIds(kitchenConfig, fixedComponentIds, initialOrder),
  );
  const [selectedAccessoryCodes, setSelectedAccessoryCodes] = useState(() =>
    buildInitialCodes(kitchenConfig, initialOrder, "accessory", "accessories"),
  );
  const [selectedServiceCodes, setSelectedServiceCodes] = useState(() =>
    buildInitialCodes(kitchenConfig, initialOrder, "service", "services"),
  );
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderSectionOpen, setIsOrderSectionOpen] = useState(false);
  const [activeProductInfo, setActiveProductInfo] = useState(null);
  const [customer, setCustomer] = useState(() =>
    buildInitialCustomerState(initialOrder, initialContractNumber, initialContractAddress),
  );
  const [useContractAddressForOrder, setUseContractAddressForOrder] = useState(() =>
    buildInitialAddressPreference(initialOrder, initialContractNumber, initialContractAddress),
  );
  const [addressVerification, setAddressVerification] = useState(() =>
    buildAddressVerificationState(),
  );
  const addressSnapshot = useMemo(() => buildAddressVerificationSnapshot(customer), [customer]);
  const addressSnapshotKey = useMemo(
    () => addressVerificationSnapshotKey(addressSnapshot),
    [addressSnapshot],
  );

  useEffect(() => {
    if (initialOrder) {
      const nextCustomer = buildInitialCustomerFromOrder(initialOrder, initialContractNumber);
      setCustomer(nextCustomer);
      setUseContractAddressForOrder(customerUsesContractAddress(nextCustomer, initialContractAddress));
      setAddressVerification(buildAddressVerificationState());
      setSelectedComponentIds(buildInitialComponentIds(kitchenConfig, fixedComponentIds, initialOrder));
      setSelectedAccessoryCodes(buildInitialCodes(kitchenConfig, initialOrder, "accessory", "accessories"));
      setSelectedServiceCodes(buildInitialCodes(kitchenConfig, initialOrder, "service", "services"));
      return;
    }

    if (initialContractAddress) {
      setCustomer((current) => ({
        ...current,
        ...buildCustomerAddressFromContract(initialContractAddress),
        contractNumber: initialContractNumber,
      }));
      setUseContractAddressForOrder(true);
      setAddressVerification(buildAddressVerificationState());
      return;
    }

    if (!initialContractNumber) return;
    setCustomer((current) => {
      if (current.contractNumber === initialContractNumber) return current;
      return { ...current, contractNumber: initialContractNumber };
    });
    setUseContractAddressForOrder(false);
    setAddressVerification(buildAddressVerificationState());
  }, [initialContractNumber, initialOrder, initialContractAddress, kitchenConfig, fixedComponentIds]);

  useEffect(() => {
    const verifiedSnapshotKey = addressVerification?.verification?.snapshot
      ? addressVerificationSnapshotKey(addressVerification.verification.snapshot)
      : "";

    if (!verifiedSnapshotKey) return;
    if (verifiedSnapshotKey === addressSnapshotKey) return;

    setAddressVerification(buildAddressVerificationState());
  }, [addressSnapshotKey, addressVerification]);

  useEffect(() => {
    if (!activeProductInfo) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveProductInfo(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProductInfo]);

  const selectedComponents = kitchenConfig.components
    .filter((item) => selectedComponentIds.includes(componentIdForItem(item)))
    .map((item) => ({
      ...item,
      isOrderLocked: orderLockedComponentIds.includes(componentIdForItem(item)),
    }));
  const selectedAccessories = selectedMap(kitchenConfig.accessories, selectedAccessoryCodes).map((item) => ({
    ...item,
    isOrderLocked: orderLockedAccessoryCodes.has(item.code),
  }));
  const selectedServices = selectedMap(kitchenConfig.services, selectedServiceCodes).map((item) => ({
    ...item,
    isOrderLocked: orderLockedServiceCodes.has(item.code),
  }));
  const lockedSelectedComponents = selectedComponents.filter((item) => item.isLocked || item.isOrderLocked);
  const optionalSelectedComponents = selectedComponents.filter((item) => !item.isLocked && !item.isOrderLocked);
  const fixedComponentIdsKey = fixedComponentIds.join("|");
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !fixedComponentIds.includes(componentId) && !isHiddenLinkedComponent(kitchenSlug, componentId);
  });
  const serviceEligibility = useMemo(
    () =>
      getServiceEligibility({
        selectedComponents,
        selectedAccessories,
        montageRequiredCodes: kitchenConfig.montageRequiredCodes,
      }),
    [kitchenConfig.montageRequiredCodes, selectedAccessories, selectedComponents],
  );
  const grandTotal = [...selectedComponents, ...selectedAccessories, ...selectedServices].reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  useEffect(() => {
    setSelectedComponentIds((current) => {
      const next = [...new Set([...fixedComponentIds, ...current])];
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        return current;
      }
      return next;
    });
  }, [fixedComponentIds, fixedComponentIdsKey]);

  useEffect(() => {
    if (
      !serviceEligibility.montageEligible &&
      selectedServiceCodes.includes(SERVICE_CODE_MONTAGE)
    ) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== SERVICE_CODE_MONTAGE));
    }
    if (
      !serviceEligibility.pickupEligible &&
      selectedServiceCodes.includes(SERVICE_CODE_PICKUP)
    ) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== SERVICE_CODE_PICKUP));
    }
  }, [selectedServiceCodes, serviceEligibility]);

  function toggleAccessory(itemCode) {
    if (orderLockedAccessoryCodes.has(itemCode)) return;
    setSelectedAccessoryCodes((current) =>
      current.includes(itemCode) ? current.filter((code) => code !== itemCode) : [...current, itemCode],
    );
  }

  function toggleService(itemCode) {
    if (orderLockedServiceCodes.has(itemCode)) return;
    if (itemCode === SERVICE_CODE_MONTAGE && !serviceEligibility.montageEligible) {
      setStatus("Montage ist erst ab 3 zusaetzlichen Komponenten moeglich, davon 2 Schrank-Komponenten.");
      setStatusTone("error");
      return;
    }

    if (itemCode === SERVICE_CODE_PICKUP && !serviceEligibility.pickupEligible) {
      setStatus("Abholung kann erst hinzugefuegt werden, wenn mindestens ein Artikel ausgewaehlt wurde.");
      setStatusTone("error");
      return;
    }

    setStatus("");
    setStatusTone("idle");

    setSelectedServiceCodes((current) => {
      const exists = current.includes(itemCode);
      if (exists) return current.filter((code) => code !== itemCode);
      if (itemCode === SERVICE_CODE_MONTAGE) {
        return [...current.filter((code) => code !== SERVICE_CODE_PICKUP), itemCode];
      }
      if (itemCode === SERVICE_CODE_PICKUP) {
        return [...current.filter((code) => code !== SERVICE_CODE_MONTAGE), itemCode];
      }
      return [...current, itemCode];
    });
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));

    if (ADDRESS_VERIFICATION_FIELD_KEYS.has(field)) {
      setAddressVerification((current) => {
        const verifiedSnapshotKey = current?.verification?.snapshot
          ? addressVerificationSnapshotKey(current.verification.snapshot)
          : "";

        if (
          !verifiedSnapshotKey
          && current.status === ADDRESS_VERIFICATION_STATUS.IDLE
          && !current.message
          && !current.suggestion
          && !current.verification
        ) {
          return current;
        }

        if (!verifiedSnapshotKey || verifiedSnapshotKey === addressSnapshotKey) {
          return buildAddressVerificationState();
        }

        return current;
      });
    }
  }

  function useContractAddress() {
    if (!initialContractAddress) return;

    setCustomer((current) => ({
      ...current,
      ...buildCustomerAddressFromContract(initialContractAddress),
    }));
    setUseContractAddressForOrder(true);
    setAddressVerification(buildAddressVerificationState());
  }

  function editOrderAddress() {
    setUseContractAddressForOrder(false);
  }

  async function handleVerifyAddress() {
    if (!customer.contractNumber || !customer.address1 || !customer.country || !customer.city || !customer.postalCode) {
      setAddressVerification(
        buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: "Enter contract number, street, country, city, and postal code before verification.",
        }),
      );
      return;
    }

    setAddressVerification(
      buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.LOADING, {
        message: "Verifying address...",
      }),
    );

    try {
      const response = await fetch("/api/address-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressSnapshot),
      });
      const payload = await response.json();

      if (payload.status === ADDRESS_VERIFICATION_STATUS.VALID && payload.verification) {
        setAddressVerification(
          buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.VALID, {
            message: payload.message || "Address is valid.",
            suggestion: payload.suggestion || "",
            verification: payload.verification,
          }),
        );
        return;
      }

      setAddressVerification(
        buildAddressVerificationState(payload.status || ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: payload.message || "Address verification failed.",
          suggestion: payload.suggestion || "",
        }),
      );
    } catch (error) {
      setAddressVerification(
        buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE, {
          message: error.message || "The address verification service is unavailable right now.",
        }),
      );
    }
  }

  function removeComponent(item) {
    const componentId = componentIdForItem(item);
    if (fixedComponentIds.includes(componentId)) {
      return;
    }
    setSelectedComponentIds((current) =>
      toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
    );
  }

  function removeAccessory(item) {
    if (item.isOrderLocked) return;
    setSelectedAccessoryCodes((current) => current.filter((code) => code !== item.code));
  }

  function removeService(item) {
    if (item.isOrderLocked) return;
    setSelectedServiceCodes((current) => current.filter((code) => code !== item.code));
  }

  function resetSelection() {
    setSelectedAccessoryCodes([...orderLockedAccessoryCodes]);
    setSelectedServiceCodes([...orderLockedServiceCodes]);
    setSelectedComponentIds(fixedComponentIds);
    setStatus("");
    setStatusTone("idle");
  }

  function openOrderSection() {
    setIsOrderSectionOpen(true);
    window.requestAnimationFrame(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openProductInfo(payload) {
    const nextState = buildProductInfoState(payload);
    if (!nextState) return;
    setActiveProductInfo(nextState);
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

    if (
      addressVerification.status !== ADDRESS_VERIFICATION_STATUS.VALID
      || !addressVerification.verification
      || addressVerificationSnapshotKey(addressVerification.verification.snapshot) !== addressSnapshotKey
    ) {
      setStatus("Bitte verifiziere die Adresse vor dem Einreichen der Bestellung.");
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("Bestellung wird gespeichert...");
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
            addressVerification: addressVerification.verification,
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
        setStatus(`Bestellung gespeichert. Auftragsnummer: ${payload.orderNumber}. Die Bestaetigung folgt nach Pruefung.`);
      }
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message || "Bestellung konnte nicht gespeichert werden.");
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topNav} aria-label="Seitennavigation">
          <Link href="/" className={styles.backLink}>
            Zurueck
          </Link>
        </nav>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logoMark}>
              <img src="/img/fragmentologo.png" alt="Fragmento" />
            </span>
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
              fixedComponentIds={fixedComponentIds}
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
              grandTotal={grandTotal}
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
              fixedComponentIds={fixedComponentIds}
              orderLockedAccessoryCodes={orderLockedAccessoryCodes}
              orderLockedServiceCodes={orderLockedServiceCodes}
              setSelectedComponentIds={setSelectedComponentIds}
              onToggleAccessory={toggleAccessory}
              onToggleService={toggleService}
              onOpenProductInfo={openProductInfo}
              serviceEligibility={serviceEligibility}
            />
          </div>
        </section>

        {isOrderSectionOpen ? (
          <KitchenOrderForm
            orderSectionRef={orderSectionRef}
            customer={customer}
            contractAddress={initialContractAddress}
            isUsingContractAddress={useContractAddressForOrder}
            isSubmitting={isSubmitting}
            status={status}
            statusTone={statusTone}
            addressVerification={addressVerification}
            onSubmit={handleSubmit}
            onVerifyAddress={handleVerifyAddress}
            onUpdateCustomer={updateCustomer}
            onToggleUseContractAddress={(nextChecked) => {
              if (nextChecked) {
                useContractAddress();
                return;
              }
              editOrderAddress();
            }}
          />
        ) : null}

        {activeProductInfo ? (
          <div
            className={styles.productInfoOverlay}
            role="presentation"
            onClick={() => setActiveProductInfo(null)}
          >
            <div
              className={styles.productInfoDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-info-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.productInfoHeader}>
                <div>
                  <p className={styles.eyebrow}>Produktinformation</p>
                  <h2 id="product-info-title">{activeProductInfo.title}</h2>
                  {activeProductInfo.item.code ? (
                    <span className={styles.itemCode}>Code: {activeProductInfo.item.code}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.productInfoClose}
                  aria-label="Produktinformation schliessen"
                  onClick={() => setActiveProductInfo(null)}
                >
                  Schliessen
                </button>
              </div>

              <div className={styles.productInfoMeta}>
                <strong className={styles.productInfoPrice}>{formatCurrency(activeProductInfo.price)}</strong>
                {activeProductInfo.infoText ? <p>{activeProductInfo.infoText}</p> : null}
              </div>

              <div className={styles.productInfoActions}>
                <a
                  href={activeProductInfo.infoPdfHref}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.productInfoActionLink}
                >
                  PDF in neuem Tab oeffnen
                </a>
              </div>

              <div className={styles.productInfoViewer}>
                <iframe
                  src={activeProductInfo.infoPdfHref}
                  title={`Produktinformation ${activeProductInfo.title}`}
                  className={styles.productInfoFrame}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
