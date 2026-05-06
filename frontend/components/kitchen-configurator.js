"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import KitchenCatalogPanel from "./kitchen-catalog-panel";
import styles from "./kitchen-configurator.module.css";
import KitchenOrderForm from "./public-kitchen-order-form";
import { blobToBase64, generateOrderPdf } from "./kitchen-order-pdf";
import KitchenSelectionSummary from "./kitchen-selection-summary";
import {
  componentIdForItem,
  componentIdForKey,
  formatCurrency,
  getCatalogDisplayItem,
  getLocalizedItemName,
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
import { PublicI18nProvider, PublicLanguageSwitcher, usePublicI18n } from "./public-i18n";

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

const PRODUCT_INFO_PDF_REVISION = "20260506";

function withProductInfoPdfRevision(href) {
  const value = String(href || "").trim();
  if (!value) return "";

  const separator = value.includes("?") ? "&" : "?";
  return `${value}${separator}v=${PRODUCT_INFO_PDF_REVISION}`;
}

function buildProductInfoState(payload, translate) {
  if (!payload?.infoPdfHref || !payload?.item) return null;

  const rawProductInfoDocuments = Array.isArray(payload.item.productInfoDocuments)
    ? payload.item.productInfoDocuments.filter((document) => document?.href)
    : payload.infoPdfHref
      ? [{ label: "Produktinfo PDF", href: payload.infoPdfHref }]
      : [];
  const defaultProductInfoDocument =
    rawProductInfoDocuments.find((document) => String(document.label || "").toLowerCase().includes("produktinfo"))
    || rawProductInfoDocuments[0]
    || null;
  const productInfoDocuments = rawProductInfoDocuments.map((document) => ({
    ...document,
    label: localizeProductInfoDocumentLabel(document.label, translate),
    href: withProductInfoPdfRevision(document.href),
  }));

  return {
    ...payload,
    infoPdfHref: withProductInfoPdfRevision(payload.infoPdfHref),
    title:
      payload.item.productAssistantName
      || getLocalizedItemName(payload.item, translate)
      || translate("configurator.productInfoTitle", "Product information", { title: "" }).trim(),
    price: Number(payload.price ?? payload.item.price ?? 0),
    infoText: payload.item.infoText || "",
    productInfoSummary: payload.item.productInfoSummary || "",
    productInfoKeyFacts: Array.isArray(payload.item.productInfoKeyFacts) ? payload.item.productInfoKeyFacts : [],
    productInfoExtractedText: payload.item.productInfoExtractedText || "",
    productInfoItemId: payload.item.productInfoItemId || payload.item.id || "",
    productInfoDocuments,
    activeProductInfoDocumentHref:
      withProductInfoPdfRevision(defaultProductInfoDocument?.href) || withProductInfoPdfRevision(payload.infoPdfHref),
  };
}

function splitProductInfoSentences(value, limit = 3) {
  return String(value || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractProductInfoBullets(text, heading, limit = 6) {
  const lines = String(text || "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim().toLowerCase() === `${heading.toLowerCase()}:`);
  if (headingIndex < 0) return [];

  const bullets = [];
  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith("-") && trimmed.endsWith(":")) break;
    if (trimmed.startsWith("-")) {
      bullets.push(trimmed.replace(/^-\s*/, ""));
    }
    if (bullets.length >= limit) break;
  }
  return bullets;
}

function formatProductAssistantContextLabel(activeProductInfo, selectedItems) {
  if (activeProductInfo?.title) {
    return activeProductInfo.title;
  }

  const names = selectedItems.map((item) => item.name).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  return `${names[0]}, ${names[1]} und ${names.length - 2} weitere`;
}

function buildProductAssistantIntro(activeProductInfo, selectedItems) {
  const names = selectedItems.map((item) => item.name).filter(Boolean);
  if (activeProductInfo?.title) {
    return `Ich sehe, du hast ${activeProductInfo.title} geöffnet. Frag mich alles dazu.`;
  }
  if (names.length === 1) {
    return `Ich sehe, du hast ${names[0]} ausgewählt. Frag mich alles dazu.`;
  }
  if (names.length > 1) {
    return `Ich sehe, du hast ${names.join(", ")} ausgewählt. Frag mich alles dazu.`;
  }
  return "Wähle zuerst ein Produkt mit Produktinformation aus.";
}

const PRODUCT_ASSISTANT_INTRO =
  "Hallo! Ich kann dir Fragen zu den ausgewählten Produkten beantworten. Worüber möchtest du sprechen?";

function hasAssistantProductInfo(item) {
  const itemId = item?.productInfoItemId || item?.id;
  return Boolean(itemId && (item?.productInfoExtractedText || item?.productInfoSummary || item?.productInfoPdfPath));
}

function buildLocalizedProductAssistantIntro(activeProductInfo, selectedItems, translate) {
  const names = selectedItems
    .map((item) => item.productAssistantName || item.name)
    .filter(Boolean);

  if (activeProductInfo?.title) {
    return translate("configurator.productAssistantIntroOpened", "You're now looking at {label}. Ask me anything from its product information.", {
      label: activeProductInfo.title,
    });
  }

  if (names.length === 1) {
    return translate("configurator.productAssistantIntroSelectedOne", "You've selected {label}. Ask me anything from its product information.", {
      label: names[0],
    });
  }

  if (names.length > 1) {
    return translate("configurator.productAssistantIntroSelectedMany", "You've selected {labels}. Ask me anything from their product information.", {
      labels: names.join(", "),
    });
  }

  return translate("configurator.productAssistantIntroChooseDocumented", "Choose a product with product information first.");
}

function buildAssistantCatalogItems(kitchenConfig, kitchenSlug) {
  const itemsById = new Map();
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !isHiddenLinkedComponent(kitchenSlug, componentId);
  });

  for (const item of visibleComponents) {
    const displayItem = getCatalogDisplayItem(kitchenConfig.components, kitchenSlug, item)?.item;
    const itemId = displayItem?.productInfoItemId || displayItem?.id;
    if (!hasAssistantProductInfo(displayItem) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, displayItem);
  }

  for (const item of [...kitchenConfig.accessories, ...kitchenConfig.services]) {
    const itemId = item.productInfoItemId || item.id;
    if (!hasAssistantProductInfo(item) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, item);
  }

  return Array.from(itemsById.values());
}

function buildProductAssistantContextOptions(activeProductInfo, catalogItems, selectedItems, translate) {
  const itemsById = new Map();

  for (const item of catalogItems) {
    const itemId = item.productInfoItemId || item.id;
    if (!hasAssistantProductInfo(item) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, item);
  }

  const items = Array.from(itemsById.values());
  if (!items.length) return [];

  const options = [];
  const activeItemId = activeProductInfo?.productInfoItemId;
  options.push({
    key: "all-documented",
    label: translate("configurator.productAssistantAllProducts", "All documented products"),
    shortLabel: translate("configurator.productAssistantAllProducts", "All documented products"),
    itemIds: items.map((item) => item.productInfoItemId || item.id).filter(Boolean),
    type: "all",
  });

  if (activeItemId && itemsById.has(activeItemId)) {
    const activeItem = itemsById.get(activeItemId);
    const activeItemName =
      activeItem.productAssistantName
      || activeItem.name
      || activeProductInfo.title
      || translate("configurator.productAssistantCurrentProductFallback", "This product");
    options.push({
      key: `current-${activeItemId}`,
      label: translate("configurator.productAssistantCurrentProduct", "This product: {name}", { name: activeItemName }),
      shortLabel: activeItemName,
      itemIds: [activeItemId],
      isHighlighted: true,
      type: "current",
    });
  }

  for (const item of items) {
    const itemId = item.productInfoItemId || item.id;
    const itemLabel = item.productAssistantName || item.name || item.code || translate("configurator.productAssistantProductFallback", "Product");
    options.push({
      key: `item-${itemId}`,
      label: itemLabel,
      shortLabel: itemLabel,
      itemIds: [itemId],
      type: "item",
    });
  }

  return options;
}

function getDefaultProductAssistantContext(options) {
  return (
    options.find((option) => option.type === "current")
    || options.find((option) => option.type === "selected")
    || options.find((option) => option.type === "all")
    || options[0]
    || null
  );
}

function normalizeQuestionToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, "");
}

function answerFromProductInfoText(question, text) {
  const stopWords = new Set(["der", "die", "das", "ist", "sind", "und", "oder", "zum", "zur", "mit", "was", "wie", "welche", "welcher", "welches", "bitte"]);
  const questionTokens = String(question || "")
    .split(/\s+/)
    .map(normalizeQuestionToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
  if (!questionTokens.length) return "";

  const asksForName = questionTokens.some((token) =>
    ["name", "produktname", "productname", "modell", "model"].includes(token),
  );
  if (asksForName) {
    const productNameLine = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^(produktname|product name|modell|model):/i.test(line));

    if (productNameLine) {
      return productNameLine.replace(/^(produktname|product name|modell|model):\s*/i, "");
    }
  }

  const sentences = String(text || "")
    .replace(/\r?\n-/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().replace(/^\.\s*/, ""))
    .filter(Boolean);

  const bestSentence = sentences.find((sentence) => {
    const normalizedSentence = normalizeQuestionToken(sentence);
    return questionTokens.some((token) => normalizedSentence.includes(token));
  });

  return bestSentence || "Diese Information konnte ich in der Produktinformation nicht finden.";
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

export default function KitchenConfigurator({ initialLanguage = "de", ...props }) {
  return (
    <PublicI18nProvider initialLanguage={initialLanguage}>
      <KitchenConfiguratorContent {...props} />
    </PublicI18nProvider>
  );
}

function KitchenConfiguratorContent({
  kitchenConfig,
  svgMarkup,
  initialContractNumber = "",
  initialOrder = null,
  initialContractAddress = null,
}) {
  const { translate, language } = usePublicI18n();
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
  const [isProductAssistantOpen, setIsProductAssistantOpen] = useState(false);
  const [productAssistantMessages, setProductAssistantMessages] = useState([]);
  const [selectedProductAssistantContext, setSelectedProductAssistantContext] = useState(null);
  const [productInfoQuestion, setProductInfoQuestion] = useState("");
  const [productInfoIsLoading, setProductInfoIsLoading] = useState(false);
  const [productInfoError, setProductInfoError] = useState("");
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

  useEffect(() => {
    if (!isProductAssistantOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProductAssistantOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isProductAssistantOpen]);

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
  const selectedProductCount = selectedComponents.length + selectedAccessories.length + selectedServices.length;
  const selectedProductInfoItems = [...selectedComponents, ...selectedAccessories, ...selectedServices].filter(hasAssistantProductInfo);
  const assistantCatalogItems = useMemo(
    () => buildAssistantCatalogItems(kitchenConfig, kitchenSlug),
    [kitchenConfig, kitchenSlug],
  );
  const hasAnySelectedProducts = selectedProductCount > 0;
  const hasAnyAssistantProducts = assistantCatalogItems.length > 0;
  const productAssistantContextOptions = buildProductAssistantContextOptions(
    activeProductInfo,
    assistantCatalogItems,
    selectedProductInfoItems,
    translate,
  );
  const hasProductAssistantOptions = productAssistantContextOptions.length > 0;
  const productAssistantEmptyIntro = translate("configurator.productAssistantIntro", "Hi. I can answer questions about the available products and their documentation. What would you like to discuss?");
  const productAssistantPickerIntro = hasAnySelectedProducts
    ? buildLocalizedProductAssistantIntro(activeProductInfo, selectedProductInfoItems, translate)
    : productAssistantEmptyIntro;
  const productAssistantSuggestedContext = getDefaultProductAssistantContext(productAssistantContextOptions);
  const productAssistantSubtitle = translate(
    hasAnySelectedProducts
      ? "configurator.productAssistantSubtitle"
      : "configurator.productAssistantSubtitleCatalog",
    hasAnySelectedProducts
      ? "Questions about your current selection"
      : "Questions about product details and documentation",
  );
  const productAssistantOptionsKey = productAssistantContextOptions
    .map((option) => `${option.key}:${option.itemIds.join(",")}`)
    .join("|");
  const selectedProductInfoNames = selectedProductInfoItems.map((item) => item.productAssistantName || item.name).filter(Boolean);
  const selectedProductInfoNotes = selectedProductInfoItems.flatMap((item) =>
    extractProductInfoBullets(item.productInfoExtractedText, "Auswahlhinweise", 2).map((note) => ({
      key: `${item.code}-${note}`,
      text: `${item.name}: ${note}`,
    })),
  );
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
  useEffect(() => {
    if (hasProductAssistantOptions || hasAnyAssistantProducts) return;

    setProductAssistantMessages([]);
    setSelectedProductAssistantContext(null);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
    setIsProductAssistantOpen(false);
  }, [hasAnyAssistantProducts, hasProductAssistantOptions]);

  useEffect(() => {
    if (!isProductAssistantOpen) return;

    setSelectedProductAssistantContext(null);
    setProductAssistantMessages([]);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
  }, [isProductAssistantOpen, productAssistantOptionsKey, hasProductAssistantOptions]);
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
      setStatus(translate("configurator.serviceMontageError", "Assembly is available only from 3 extra components, including 2 cabinet components."));
      setStatusTone("error");
      return;
    }

    if (itemCode === SERVICE_CODE_PICKUP && !serviceEligibility.pickupEligible) {
      setStatus(translate("configurator.servicePickupError", "Pickup can only be added once at least one item has been selected."));
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
          message: translate("configurator.addressMissingFields", "Enter contract number, street, country, city, and postal code before verification."),
        }),
      );
      return;
    }

    setAddressVerification(
      buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.LOADING, {
        message: translate("configurator.addressVerifying", "Verifying address..."),
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
            message: translate("configurator.addressValid", "The address is valid."),
            suggestion: payload.suggestion || "",
            verification: payload.verification,
          }),
        );
        return;
      }

      setAddressVerification(
        buildAddressVerificationState(payload.status || ADDRESS_VERIFICATION_STATUS.INVALID, {
          message: translate("configurator.addressVerificationFailed", "Address verification failed."),
          suggestion: payload.suggestion || "",
        }),
      );
    } catch (_error) {
      setAddressVerification(
        buildAddressVerificationState(ADDRESS_VERIFICATION_STATUS.SERVICE_UNAVAILABLE, {
          message: translate("configurator.addressServiceUnavailable", "The address verification service is unavailable right now."),
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
    const nextState = buildProductInfoState(payload, translate);
    if (!nextState) return;
    setActiveProductInfo(nextState);
  }

  function selectProductInfoDocument(href) {
    setActiveProductInfo((current) => {
      if (!current || !href) return current;
      return {
        ...current,
        activeProductInfoDocumentHref: href,
      };
    });
  }

  function resetProductAssistantContext() {
    setSelectedProductAssistantContext(null);
    setProductAssistantMessages([]);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
  }

  function selectProductAssistantContext(option) {
    setSelectedProductAssistantContext(option);
    setProductAssistantMessages([
      {
        role: "assistant",
        text: translate("configurator.productAssistantContextConfirmed", "You're now asking about {label}. Ask me anything from its product information.", {
          label: option.shortLabel,
        }),
      },
    ]);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
  }

  function returnToProductAssistantPicker() {
    setSelectedProductAssistantContext(null);
    setProductAssistantMessages([]);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
  }

  function openProductAssistant() {
    if (!hasAnyAssistantProducts) return;
    setIsProductAssistantOpen(true);
    if (hasProductAssistantOptions) {
      resetProductAssistantContext();
    } else {
      setSelectedProductAssistantContext(null);
      setProductAssistantMessages([]);
      setProductInfoQuestion("");
      setProductInfoError("");
      setProductInfoIsLoading(false);
    }
  }

  async function handleProductInfoQuestionSubmit(event) {
    event.preventDefault();
    const question = productInfoQuestion.trim();
    if (!question || productInfoIsLoading) return;
    if (!selectedProductAssistantContext?.itemIds?.length) return;

    const itemIds = [...new Set(selectedProductAssistantContext.itemIds)].slice(0, 10);

    setProductInfoIsLoading(true);
    setProductInfoError("");
    setProductInfoQuestion("");
    setProductAssistantMessages((current) => [...current, { role: "user", text: question }]);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 26000);

    try {
      const response = await fetch("/api/product-info/ask", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          question,
          itemIds: [...new Set(itemIds)].slice(0, 10),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || translate("configurator.productAssistantErrorUnavailable", "The product question could not be answered."));
      }

      setProductAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload.answer || translate("configurator.productAssistantNoInfo", "No product information is available yet."),
        },
      ]);
    } catch (error) {
      const nextError =
        error?.name === "AbortError"
          ? translate("configurator.productAssistantErrorTimeout", "The request is taking too long. Please try again.")
          : error instanceof Error
            ? error.message
            : translate("configurator.productAssistantErrorUnavailable", "The product question could not be answered.");
      setProductInfoError(nextError);
      setProductAssistantMessages((current) => [...current, { role: "assistant", text: nextError, tone: "error" }]);
    } finally {
      window.clearTimeout(timeout);
      setProductInfoIsLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!grandTotal) {
      setStatus(translate("configurator.statusSelectItem", "Select at least one item first."));
      setStatusTone("error");
      return;
    }

    if (!customer.consent) {
      setStatus(translate("configurator.statusConfirmConsent", "Please confirm the data privacy consent."));
      setStatusTone("error");
      return;
    }

    if (!customer.paymentMethod) {
      setStatus(translate("configurator.statusSelectPayment", "Please choose a payment method."));
      setStatusTone("error");
      return;
    }

    if (
      addressVerification.status !== ADDRESS_VERIFICATION_STATUS.VALID
      || !addressVerification.verification
      || addressVerificationSnapshotKey(addressVerification.verification.snapshot) !== addressSnapshotKey
    ) {
      setStatus(translate("configurator.statusVerifyAddress", "Please verify the address before submitting the order."));
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus(translate("configurator.statusSavingOrder", "Saving order..."));
    setStatusTone("idle");

    try {
      const pdfOrder = {
        orderNumber: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
        createdAt: new Date().toLocaleString(language === "de" ? "de-DE" : "en-GB"),
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
        throw new Error(translate("configurator.statusSaveFailed", "The order could not be saved."));
      }

      const emailIssue = payload.notifications?.emailError;
      const webhookIssue = payload.notifications?.webhookError;

      if (emailIssue || webhookIssue) {
        const notes = [emailIssue ? `E-Mail: ${emailIssue}` : "", webhookIssue ? `Webhook: ${webhookIssue}` : ""]
          .filter(Boolean)
          .join(" | ");
        setStatus(translate("configurator.statusSavedWithIssues", "Order saved. Order number: {orderNumber}. Note: {notes}", {
          orderNumber: payload.orderNumber,
          notes,
        }));
      } else {
        setStatus(translate("configurator.statusSavedSuccess", "Order saved. Order number: {orderNumber}. Confirmation will follow after review.", {
          orderNumber: payload.orderNumber,
        }));
      }
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message || translate("configurator.statusSaveFailed", "The order could not be saved."));
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topNav} aria-label="Page navigation">
          <Link href="/" className={styles.backLink}>
            {translate("common.back", "Back")}
          </Link>
          <PublicLanguageSwitcher />
        </nav>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logoMark}>
              <img src="/img/fragmentologo.png" alt="Fragmento" />
            </span>
            <div className={styles.brandText}>
              <h1>{kitchenConfig.kitchen.name}</h1>
              <p>{kitchenConfig.kitchen.description || translate("configurator.headerDescription", "Configure your kitchen directly from the current catalog.")}</p>
            </div>
          </div>
          <div className={styles.pricePill}>
            <span>{translate("common.totalPrice", "Total price")}</span>
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
              onOpenProductInfo={openProductInfo}
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
                <h2 id="product-info-title">{activeProductInfo.title}</h2>
                <button
                  type="button"
                  className={styles.productInfoClose}
                  aria-label={translate("configurator.productInfoCloseAria", "Close product information")}
                  onClick={() => setActiveProductInfo(null)}
                >
                  {translate("common.close", "Close")}
                </button>
              </div>

              <div className={styles.productInfoContent}>
                <div className={styles.productInfoPdfColumn}>
                  <div className={styles.productInfoToolbar}>
                    {activeProductInfo.productInfoDocuments?.length > 1 ? (
                      <div className={styles.productInfoDocumentTabs}>
                        {activeProductInfo.productInfoDocuments.map((document) => {
                          const isActive = document.href === activeProductInfo.activeProductInfoDocumentHref;
                          return (
                            <button
                              key={document.href}
                              type="button"
                              className={isActive ? styles.productInfoDocumentTabActive : styles.productInfoDocumentTab}
                              onClick={() => selectProductInfoDocument(document.href)}
                            >
                              {document.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <div className={styles.productInfoActions}>
                      {activeProductInfo.productInfoDocuments?.length > 1 ? (
                        activeProductInfo.productInfoDocuments.map((document) => (
                          <a
                            key={document.href}
                            href={document.href}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.productInfoActionLink}
                          >
                            {translate("configurator.productInfoOpen", "Open {label}", { label: document.label })}
                          </a>
                        ))
                      ) : (
                        <a
                          href={activeProductInfo.activeProductInfoDocumentHref || activeProductInfo.infoPdfHref}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.productInfoActionLink}
                        >
                          {translate("common.openPdfInNewTab", "Open PDF in new tab")}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className={styles.productInfoViewer}>
                    <iframe
                      src={activeProductInfo.activeProductInfoDocumentHref || activeProductInfo.infoPdfHref}
                      title={translate("configurator.productInfoTitle", "Product information {title}", { title: activeProductInfo.title })}
                      className={styles.productInfoFrame}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {hasAnyAssistantProducts ? (
          <div
            className={[
              styles.productAssistantDock,
              isProductAssistantOpen ? styles.productAssistantDockOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isProductAssistantOpen ? (
              <div
                className={styles.productAssistantPanel}
                role="dialog"
                aria-modal="false"
                aria-labelledby="product-assistant-title"
              >
                <div className={styles.productAssistantHeader}>
                  <div>
                    <h2 id="product-assistant-title">
                      {translate("configurator.productAssistantTitle", "Product Agent")}
                    </h2>
                    <p>{productAssistantSubtitle}</p>
                  </div>
                  <div className={styles.productAssistantHeaderActions}>
                    <button
                      type="button"
                      className={styles.productAssistantMinimize}
                      aria-label={translate("configurator.productAssistantCloseAria", "Close Product Agent")}
                      onClick={() => setIsProductAssistantOpen(false)}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                </div>

                {!selectedProductAssistantContext && hasProductAssistantOptions ? (
                  <div className={styles.productAssistantContextSection}>
                    <div className={styles.productAssistantSectionLabel}>
                      {translate("configurator.productAssistantContextTitle", "Choose a product")}
                    </div>
                    <p className={styles.productAssistantPickerHint}>
                      {translate("configurator.productAssistantPickerHint", "Select what you want to talk about, then continue in chat.")}
                      {productAssistantSuggestedContext ? ` ${translate("configurator.productAssistantPickerSuggested", "You can start with: {label}.", { label: productAssistantSuggestedContext.shortLabel })}` : ""}
                    </p>
                    <div className={styles.productAssistantContextOptions}>
                      {productAssistantContextOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={[
                            styles.productAssistantContextButton,
                            option.type === "all" ? styles.productAssistantContextButtonDefault : styles.productAssistantContextButtonSecondary,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => selectProductAssistantContext(option)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedProductAssistantContext ? (
                  <div className={styles.productAssistantActiveContext}>
                    <button
                      type="button"
                      className={styles.productAssistantBackButton}
                      onClick={returnToProductAssistantPicker}
                    >
                      {translate("configurator.productAssistantBackToPicker", "Back to products")}
                    </button>
                    <div className={styles.productAssistantActiveContextMeta}>
                      <span className={styles.productAssistantSectionLabel}>
                        {translate("configurator.productAssistantActiveContext", "Talking about")}
                      </span>
                      <strong>{selectedProductAssistantContext.label}</strong>
                    </div>
                  </div>
                ) : null}

                <div className={styles.productAssistantMessages} aria-live="polite">
                  {!hasProductAssistantOptions ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>
                        {translate(
                          "configurator.productAssistantNoInfo",
                          "No product information is available for your current selection yet.",
                        )}
                      </span>
                    </div>
                  ) : null}
                  {!selectedProductAssistantContext && hasProductAssistantOptions ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>{productAssistantPickerIntro}</span>
                    </div>
                  ) : null}
                  {productAssistantMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.text}`}
                      className={[
                        styles.productAssistantMessage,
                        message.role === "user" ? styles.productAssistantMessageUser : styles.productAssistantMessageAssistant,
                        message.tone === "error" ? styles.productAssistantMessageError : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{message.text}</span>
                    </div>
                  ))}
                  {productInfoIsLoading ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>{translate("configurator.productAssistantLoading", "Loading answer...")}</span>
                    </div>
                  ) : null}
                </div>

                <form className={styles.productAssistantComposer} onSubmit={handleProductInfoQuestionSubmit}>
                  <input
                    value={productInfoQuestion}
                    onChange={(event) => setProductInfoQuestion(event.target.value)}
                    maxLength={500}
                    placeholder={translate("configurator.productAssistantPlaceholder", "Ask about this product...")}
                    disabled={!selectedProductAssistantContext || productInfoIsLoading || !hasProductAssistantOptions}
                  />
                  <button
                    type="submit"
                    disabled={
                      !productInfoQuestion.trim()
                      || productInfoIsLoading
                      || !selectedProductAssistantContext
                      || !hasProductAssistantOptions
                    }
                  >
                    {translate("configurator.productAssistantSend", "Send")}
                  </button>
                </form>
              </div>
            ) : null}

            <button
              type="button"
              className={styles.productAssistantLauncher}
              aria-expanded={isProductAssistantOpen}
              hidden
              onClick={() => {
                if (isProductAssistantOpen) {
                  setIsProductAssistantOpen(false);
                  return;
                }
                openProductAssistant();
              }}
            >
              {translate("configurator.productAssistantLauncher", "Product help")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
