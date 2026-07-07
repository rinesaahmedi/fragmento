import { ItemType, OrderStatus, Prisma } from "@prisma/client";
import {
  getDeliveryLeadTimeWeeks,
  getDeliveryMinOrderSettings,
} from "./admin-settings";
import { forwardOrderWebhook, sendOrderConfirmationEmail } from "./email/order-notifications";
import {
  getServiceEligibility,
  SERVICE_CODE_MONTAGE,
  SERVICE_CODE_PICKUP,
} from "./service-eligibility";
import {
  mergeSinkAndWorktopItems,
  SINK_AND_WORKTOP_CODE,
} from "./order-item-display";
import { buildNextContractOrderNumber } from "./order-numbering";
import { getPreferredDeliveryDateAfterWeeks } from "./preferred-delivery.js";
import {
  CONTRACT_ERRORS,
  assertUsableKitchenContract,
  buildConfirmedItemCodeSets,
  contractValidationError,
  getContractOrderState,
  normalizeContractNumber,
} from "./kitchen-contracts";
import {
  ORDER_KIND_LIVE,
  getOrderDelegate,
  getOrderItemDelegate,
  getOrderKindForContractNumber,
} from "./order-kind";
import { prisma } from "./prisma";
import {
  getAvailableCutleryVariantsForComponents,
  getCutleryVariant,
  isCutleryAccessoryCode,
  parseCutleryLineFromOrderItem,
} from "./cutlery-accessories";

const PAYMENT_METHOD_ALIASES = new Map([
  ["card", "card"],
  ["visa", "card"],
  ["mastercard", "card"],
  ["master card", "card"],
  ["paypal", "card"],
  ["klarna", "card"],
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELIVERY_WEEK_OPTION_COUNT = 3;

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireString(value, label) {
  if (!value || !String(value).trim()) {
    throw validationError(`${label} is required`);
  }
  return String(value).trim();
}

async function buildNextOrderNumberForContract(tx, kitchenContract, orderKind = ORDER_KIND_LIVE) {
  const orders = await getOrderDelegate(tx, orderKind).findMany({
    where: {
      kitchenContractId: kitchenContract.id,
      orderNumber: { startsWith: kitchenContract.contractNumber },
    },
    select: { orderNumber: true },
  });

  return buildNextContractOrderNumber(
    kitchenContract.contractNumber,
    orders.map((order) => order.orderNumber),
  );
}

function validateEmail(value) {
  const email = requireString(value, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw validationError("Email is invalid");
  }
  return email;
}

function validatePaymentMethod(value) {
  const paymentMethod = requireString(value, "Payment method").toLowerCase();
  const normalizedPaymentMethod = PAYMENT_METHOD_ALIASES.get(paymentMethod);
  if (!normalizedPaymentMethod) {
    throw validationError("Payment method is invalid");
  }
  return normalizedPaymentMethod;
}

function normalizePreferredDeliveryDate(value) {
  const normalized = value ? String(value).trim() : "";
  if (!normalized) {
    throw validationError("Preferred delivery week is required");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw validationError("Selected delivery week is invalid.");
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw validationError("Selected delivery week is invalid.");
  }

  return date;
}

function getMinimumPreferredDeliveryDate(leadTimeDays = 0, now = new Date()) {
  const days = Math.max(0, Math.floor(Number(leadTimeDays) || 0));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

function assertPreferredDeliveryWeekOption(preferredDeliveryDate, deliveryLeadTimeWeeks) {
  if (!preferredDeliveryDate) return;

  const orderDate = getMinimumPreferredDeliveryDate(0);
  const allowedDates = new Set(
    Array.from(
      { length: DELIVERY_WEEK_OPTION_COUNT },
      (_, index) => deliveryLeadTimeWeeks + index,
    ).map((weeks) => getPreferredDeliveryDateAfterWeeks(weeks, orderDate)),
  );

  if (!allowedDates.has(preferredDeliveryDate.toISOString().slice(0, 10))) {
    throw validationError(
      `Preferred delivery week must be after ${deliveryLeadTimeWeeks}, ${deliveryLeadTimeWeeks + 1}, or ${deliveryLeadTimeWeeks + 2} weeks.`,
    );
  }
}

function validateConsent(value) {
  if (value !== true) {
    throw validationError("Consent is required");
  }
}

function normalizeSubmissionItems(items = []) {
  const merged = new Map();

  for (const item of items) {
    const code = item?.code ? String(item.code) : null;
    const name = item?.name ? String(item.name) : null;
    if (!code && !name) continue;

    const articleNumber = item?.articleNumber ? String(item.articleNumber).trim().toUpperCase() : null;
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(item?.quantity || 1))));
    const price = item?.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null;
    const key = articleNumber ? `${code || ""}|${articleNumber}` : (code || name);

    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.quantity = Math.min(99, existing.quantity + quantity);
      continue;
    }

    merged.set(key, {
      code,
      name,
      articleNumber,
      price,
      quantity,
    });
  }

  return [...merged.values()];
}

function mapCatalogItem(catalogItems, submittedItem, itemType) {
  const matched =
    catalogItems.find((item) => item.itemType === itemType && item.code === submittedItem.code) ||
    catalogItems.find((item) => item.itemType === itemType && item.name === submittedItem.name) ||
    null;

  if (!matched) return null;
  const catalogArticle = matched.catalogArticleId ? matched.catalogArticle : null;
  const catalogService = matched.catalogServiceId ? matched.catalogService : null;
  const catalogBlende = matched.catalogBlendeId ? matched.catalogBlende : null;
  const catalogBlendeQuantity = Math.max(1, Number.parseInt(String(matched.catalogBlendeQuantity || 1), 10) || 1);
  const catalogPrice = (() => {
    if (catalogService?.price != null) return Number(catalogService.price);
    if (catalogArticle?.price == null) return submittedItem.price != null ? submittedItem.price : matched.price;
    const blendeTotal = catalogBlende?.price != null ? Number(catalogBlende.price) * catalogBlendeQuantity : 0;
    return Number(catalogArticle.price) + blendeTotal;
  })();

  return {
    ...matched,
    name: catalogArticle?.name || catalogService?.name || submittedItem.name || matched.name,
    nameDe: catalogArticle?.nameDe || catalogService?.nameDe || matched.nameDe || "",
    articleNumber: catalogArticle?.articleNumber || submittedItem.articleNumber || matched.articleNumber,
    price: catalogPrice,
    quantity: submittedItem.quantity || 1,
  };
}

function getOrderItemEffectivePrice(item) {
  if (item?.isLocked || item?.isOrderLocked || item?.kitchenItem?.isLocked) {
    return 0;
  }
  const unitPrice = Number(item?.priceSnapshot ?? item?.price ?? 0);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  return unitPrice * quantity;
}

export function buildOrderForNotifications(orderRecord) {
  const toNotificationItem = (item) => {
    const catalogArticle = item.kitchenItem?.catalogArticleId ? item.kitchenItem.catalogArticle : null;
    const catalogService = item.kitchenItem?.catalogServiceId ? item.kitchenItem.catalogService : null;
    const catalogBlende = item.kitchenItem?.catalogBlendeId ? item.kitchenItem.catalogBlende : null;
    const cutleryLine = parseCutleryLineFromOrderItem({
      code: item.code,
      articleNumber: item.articleNumber,
      name: item.nameSnapshot || item.name,
      nameSnapshot: item.nameSnapshot,
      quantity: item.quantity,
    });
    const cutleryVariant = cutleryLine ? getCutleryVariant(cutleryLine.articleNumber) : null;

    const displayName = catalogArticle?.name || catalogService?.name || item.nameSnapshot || item.name || item.kitchenItem?.name || item.nameDe || item.kitchenItem?.nameDe || "";

    return {
      code: item.code,
      articleNumber: cutleryLine?.articleNumber || catalogArticle?.articleNumber || item.kitchenItem?.articleNumber || item.articleNumber || "",
      name: displayName,
      nameDe: cutleryLine ? cutleryVariant?.nameDe || displayName : catalogArticle?.nameDe || catalogService?.nameDe || item.nameDe || item.kitchenItem?.nameDe || "",
      price: getOrderItemEffectivePrice(item),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      isLocked: Boolean(item.kitchenItem?.isLocked || item.isLocked),
      iconKey: item.kitchenItem?.iconKey || item.iconKey || "",
      componentKey: item.kitchenItem?.componentKey || item.componentKey || "",
      productImagePath: item.kitchenItem?.productImagePath || item.productImagePath || "",
      productInfoPdfPath: item.kitchenItem?.productInfoPdfPath || item.productInfoPdfPath || "",
      productInfoSummary: item.kitchenItem?.productInfoSummary || item.productInfoSummary || "",
      productInfoKeyFacts: Array.isArray(item.kitchenItem?.productInfoKeyFacts)
        ? item.kitchenItem.productInfoKeyFacts
        : (Array.isArray(item.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
      productInfoExtractedText: item.kitchenItem?.productInfoExtractedText || item.productInfoExtractedText || "",
      blendeCode: catalogBlende?.code || item.kitchenItem?.blendeCode || item.blendeCode || "",
      blendeLabel: catalogBlende?.nameDe || catalogBlende?.name || item.kitchenItem?.blendeLabel || item.blendeLabel || "",
      blendePrice: catalogBlende?.price != null
        ? Number(catalogBlende.price)
        : item.kitchenItem?.blendePrice != null
          ? Number(item.kitchenItem.blendePrice)
        : (item.blendePrice != null ? Number(item.blendePrice) : null),
    };
  };
  const notificationItems = mergeSinkAndWorktopItems(orderRecord.items || [], (sinkItem, worktopItem) => ({
    ...toNotificationItem(sinkItem),
    itemType: sinkItem.itemType,
    code: SINK_AND_WORKTOP_CODE,
    name: "Arbeitsplatte",
    nameDe: "Arbeitsplatte",
    price: getOrderItemEffectivePrice(sinkItem) + getOrderItemEffectivePrice(worktopItem),
  }));

  return {
    id: orderRecord.id,
    orderNumber: orderRecord.orderNumber,
    createdAt: orderRecord.createdAt.toISOString(),
    total: Number(orderRecord.totalPrice),
    kitchen: {
      id: orderRecord.kitchen.id,
      slug: orderRecord.kitchen.slug,
      name: orderRecord.kitchen.name,
    },
    customer: {
      contractNumber: orderRecord.contractNumber || "",
      firstName: orderRecord.firstName,
      lastName: orderRecord.lastName,
      email: orderRecord.email,
      phone: orderRecord.phone,
      address1: orderRecord.address1,
      address2: orderRecord.address2 || "",
      postalCode: orderRecord.postalCode,
      city: orderRecord.city,
      country: orderRecord.country || "",
      preferredDeliveryDate: orderRecord.preferredDeliveryDate
        ? orderRecord.preferredDeliveryDate.toISOString().slice(0, 10)
        : "",
      notes: orderRecord.notes || "",
      paymentMethod: orderRecord.paymentMethod || "",
    },
    components: notificationItems
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map(toNotificationItem),
    accessories: notificationItems
      .filter((item) => item.itemType === ItemType.ACCESSORY)
      .map(toNotificationItem),
    services: notificationItems
      .filter((item) => item.itemType === ItemType.SERVICE)
      .map(toNotificationItem),
  };
}

function readEmailOverrides(input = {}) {
  const subject = input?.subject ? String(input.subject).trim() : "";
  const bodyText = input?.bodyText ? String(input.bodyText) : "";
  const excludedAttachmentKeys = Array.isArray(input?.excludedAttachmentKeys)
    ? input.excludedAttachmentKeys.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  return {
    subject,
    bodyText,
    excludedAttachmentKeys,
  };
}

async function getOrderRecordForOperations(id, orderKind = ORDER_KIND_LIVE) {
  const order = await getOrderDelegate(prisma, orderKind).findUnique({
    where: { id },
    include: {
      kitchen: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          kitchenItem: {
            include: {
              catalogArticle: true,
              catalogBlende: true,
              catalogService: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

async function processOrderNotifications({ order, pdfBase64, pdfFilename, runEmail = true, runWebhook = true }) {
  const results = {
    emailSent: false,
    webhookSent: false,
    emailError: "",
    webhookError: "",
  };

  if (runEmail) {
    try {
      await sendOrderConfirmationEmail({ order, pdfBase64, pdfFilename });
      results.emailSent = true;
    } catch (error) {
      results.emailError = error instanceof Error ? error.message : "Email sending failed";
    }
  }

  if (runWebhook) {
    try {
      await forwardOrderWebhook(order);
      results.webhookSent = true;
    } catch (error) {
      results.webhookError = error instanceof Error ? error.message : "Webhook forwarding failed";
    }
  }

  return results;
}

export function buildOrderItemSelectionKey(item) {
  const cutleryLine = isCutleryAccessoryCode(item?.code)
    ? parseCutleryLineFromOrderItem(item)
    : null;
  const articleNumber = String(cutleryLine?.articleNumber || item?.articleNumber || "").trim().toUpperCase();
  if (articleNumber && isCutleryAccessoryCode(item.code)) {
    return `${item.itemType}:${item.code}:${articleNumber}`;
  }
  return `${item.itemType}:${item.code}`;
}

function withoutConfirmedBaseline(items, confirmedItemSets) {
  return items.filter((item) => !confirmedItemSets[item.itemType]?.has(item.code));
}

function buildConfirmedBaselineSelectionItem(item) {
  const kitchenItem = item?.kitchenItem || {};
  const catalogArticle = kitchenItem.catalogArticleId ? kitchenItem.catalogArticle : null;
  const catalogService = kitchenItem.catalogServiceId ? kitchenItem.catalogService : null;

  return {
    ...kitchenItem,
    id: kitchenItem.id || item.kitchenItemId,
    kitchenItemId: item.kitchenItemId,
    itemType: item.itemType,
    code: item.code,
    name: catalogArticle?.name || catalogService?.name || item.nameSnapshot || kitchenItem.name || item.code,
    nameDe: catalogArticle?.nameDe || catalogService?.nameDe || kitchenItem.nameDe || "",
    articleNumber: catalogArticle?.articleNumber || kitchenItem.articleNumber || item.articleNumber || "",
    price: Number(item.priceSnapshot || 0),
    priceSnapshot: Number(item.priceSnapshot || 0),
    quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
    isOrderLocked: true,
    kitchenItem,
  };
}

function withConfirmedBaselineSelection(selectedItems, confirmedItems) {
  const selectedKeys = new Set(selectedItems.map(buildOrderItemSelectionKey));
  const baselineItems = confirmedItems
    .map(buildConfirmedBaselineSelectionItem)
    .filter((item) => item.code && !selectedKeys.has(buildOrderItemSelectionKey(item)));

  return [...selectedItems, ...baselineItems];
}

export async function createOrderFromSubmission({ kitchenSlug, orderPayload, pdfBase64, pdfFilename }) {
  if (!kitchenSlug || !orderPayload || typeof orderPayload !== "object") {
    throw validationError("Order payload is invalid");
  }

  const kitchen = await prisma.kitchen.findUnique({
    where: { slug: kitchenSlug },
    include: {
      items: {
        where: { isActive: true },
        include: {
          catalogArticle: true,
          catalogBlende: true,
          catalogService: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen || kitchen.status !== "ACTIVE") {
    throw new Error("Kitchen not found");
  }

  const customer = orderPayload?.customer || {};
  validateConsent(customer.consent);
  validateConsent(customer.termsConsent);
  const contractNumber = normalizeContractNumber(customer.contractNumber);
  if (!contractNumber) {
    throw validationError(CONTRACT_ERRORS.REQUIRED);
  }
  const validatedCustomer = {
    contractNumber,
    firstName: requireString(customer.firstName, "First name"),
    lastName: requireString(customer.lastName, "Last name"),
    email: validateEmail(customer.email),
    phone: requireString(customer.phone, "Phone"),
    address1: requireString(customer.address1, "Address"),
    address2: customer.address2 ? String(customer.address2).trim() : "",
    postalCode: requireString(customer.postalCode, "Postal code"),
    city: requireString(customer.city, "City"),
    country: customer.country ? String(customer.country).trim() : "",
    preferredDeliveryDate: normalizePreferredDeliveryDate(customer.preferredDeliveryDate),
    notes: customer.notes ? String(customer.notes).trim() : "",
    paymentMethod: validatePaymentMethod(customer.paymentMethod),
  };
  const deliveryLeadTimeWeeks = await getDeliveryLeadTimeWeeks();
  assertPreferredDeliveryWeekOption(validatedCustomer.preferredDeliveryDate, deliveryLeadTimeWeeks);
  const submittedGroups = {
    components: normalizeSubmissionItems(orderPayload?.components),
    accessories: normalizeSubmissionItems(orderPayload?.accessories),
    services: normalizeSubmissionItems(orderPayload?.services),
  };

  const selectedComponents = submittedGroups.components.map((item) =>
    mapCatalogItem(kitchen.items, item, ItemType.COMPONENT),
  );
  const selectedAccessories = submittedGroups.accessories.map((item) =>
    mapCatalogItem(kitchen.items, item, ItemType.ACCESSORY),
  );
  const selectedServices = submittedGroups.services.map((item) =>
    mapCatalogItem(kitchen.items, item, ItemType.SERVICE),
  );

  if ([...selectedComponents, ...selectedAccessories, ...selectedServices].some((item) => !item)) {
    throw validationError("One or more selected items are invalid or inactive");
  }

  const availableCutleryVariants = getAvailableCutleryVariantsForComponents(selectedComponents);
  const availableCutleryByArticle = new Map(
    availableCutleryVariants.map((variant) => [variant.articleNumber, variant]),
  );
  for (const item of selectedAccessories) {
    if (!isCutleryAccessoryCode(item?.code)) continue;

    const cutleryLine = parseCutleryLineFromOrderItem(item);
    const variant = cutleryLine ? availableCutleryByArticle.get(cutleryLine.articleNumber) : null;
    if (!variant) {
      throw validationError("Selected cutlery insert width is not available for this kitchen.");
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    if (quantity > Math.max(1, Math.floor(Number(variant.maxQuantity || 1)))) {
      throw validationError("Selected cutlery insert quantity is not available for this kitchen.");
    }
  }

  const kitchenContract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: validatedCustomer.contractNumber },
    include: { kitchen: true },
  });

  assertUsableKitchenContract(kitchenContract);
  if (kitchenContract.kitchenId !== kitchen.id) {
    throw contractValidationError(CONTRACT_ERRORS.KITCHEN_MISMATCH);
  }
  const orderKind = getOrderKindForContractNumber(kitchenContract.contractNumber);

  const contractOrderState = await getContractOrderState(kitchenContract.id, prisma, orderKind);
  const confirmedItemSets = buildConfirmedItemCodeSets(contractOrderState.confirmedItems);
  const submittedSelected = [...selectedComponents, ...selectedAccessories, ...selectedServices];
  const allSelected = withConfirmedBaselineSelection(submittedSelected, contractOrderState.confirmedItems);
  const allSelectedComponents = allSelected.filter((item) => item.itemType === ItemType.COMPONENT);
  const allSelectedAccessories = allSelected.filter((item) => item.itemType === ItemType.ACCESSORY);
  const allSelectedServices = allSelected.filter((item) => item.itemType === ItemType.SERVICE);
  const serviceEligibility = getServiceEligibility({
    selectedComponents: allSelectedComponents.map((item) => ({
      ...item,
      isLocked: Boolean(item.isLocked),
      isOrderLocked: confirmedItemSets[ItemType.COMPONENT].has(item.code),
    })),
    selectedAccessories: allSelectedAccessories,
  });
  const selectedServiceCodes = allSelectedServices.map((item) => item.code);

  if (
    selectedServiceCodes.includes(SERVICE_CODE_MONTAGE) &&
    selectedServiceCodes.includes(SERVICE_CODE_PICKUP)
  ) {
    throw validationError("Montage and pickup cannot both be selected");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_MONTAGE) && !serviceEligibility.montageEligible) {
    throw validationError("Montage conditions are not met");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_PICKUP) && !serviceEligibility.pickupEligible) {
    throw validationError("Pickup conditions are not met");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_MONTAGE)) {
    const deliveryMinSettings = await getDeliveryMinOrderSettings();
    if (deliveryMinSettings.enabled) {
      const orderTotal = allSelected.reduce(
        (sum, item) => sum + getOrderItemEffectivePrice(item),
        0,
      );
      if (orderTotal < deliveryMinSettings.amount) {
        throw validationError(
          `Delivery, transport, assembly and connection requires a minimum order value of €${deliveryMinSettings.amount}.`,
        );
      }
    }
  }

  if (!allSelected.length) {
    throw validationError("At least one item must be selected");
  }

  let savedOrder = null;
  let savedNewItems = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      savedOrder = await prisma.$transaction(async (tx) => {
        const orderDelegate = getOrderDelegate(tx, orderKind);
        const orderItemDelegate = getOrderItemDelegate(tx, orderKind);
        const contractOrderState = await getContractOrderState(kitchenContract.id, tx, orderKind);
        const existingEditableOrder = contractOrderState.editableOrder;
        const confirmedItemSets = buildConfirmedItemCodeSets(contractOrderState.confirmedItems);
        const newSelectedItems = withoutConfirmedBaseline(allSelected, confirmedItemSets);
        const newSelectionKeys = new Set(newSelectedItems.map(buildOrderItemSelectionKey));
        const submittedKeys = new Set(allSelected.map(buildOrderItemSelectionKey));
        const missingBaselineItems = contractOrderState.confirmedItems.filter(
          (item) => !submittedKeys.has(buildOrderItemSelectionKey(item)),
        );

        if (missingBaselineItems.length) {
          throw validationError("Confirmed items cannot be removed from this contract.");
        }

        if (!newSelectedItems.length && !existingEditableOrder) {
          throw validationError("Select at least one new item for this contract.");
        }

        const totalPrice = newSelectedItems.reduce((sum, item) => sum + getOrderItemEffectivePrice(item), 0);
        const order = existingEditableOrder
          ? await orderDelegate.update({
              where: { id: existingEditableOrder.id },
              data: {
                firstName: validatedCustomer.firstName,
                lastName: validatedCustomer.lastName,
                email: validatedCustomer.email,
                phone: validatedCustomer.phone,
                address1: validatedCustomer.address1,
                address2: validatedCustomer.address2 || null,
                postalCode: validatedCustomer.postalCode,
                city: validatedCustomer.city,
                country: validatedCustomer.country || null,
                preferredDeliveryDate: validatedCustomer.preferredDeliveryDate,
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
                status: OrderStatus.NEW,
              },
            })
          : await orderDelegate.create({
              data: {
                orderNumber: await buildNextOrderNumberForContract(tx, kitchenContract, orderKind),
                kitchenId: kitchen.id,
                kitchenContractId: kitchenContract.id,
                status: OrderStatus.NEW,
                contractNumber: kitchenContract.contractNumber,
                firstName: validatedCustomer.firstName,
                lastName: validatedCustomer.lastName,
                email: validatedCustomer.email,
                phone: validatedCustomer.phone,
                address1: validatedCustomer.address1,
                address2: validatedCustomer.address2 || null,
                postalCode: validatedCustomer.postalCode,
                city: validatedCustomer.city,
                country: validatedCustomer.country || null,
                preferredDeliveryDate: validatedCustomer.preferredDeliveryDate,
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
              },
            });

        if (existingEditableOrder) {
          await orderItemDelegate.deleteMany({
            where: { orderId: order.id },
          });
        }

        if (newSelectedItems.length) {
          await orderItemDelegate.createMany({
            data: newSelectedItems.map((item) => ({
              orderId: order.id,
              kitchenItemId: item.id,
              itemType: item.itemType,
              code: item.code,
              nameSnapshot: item.name,
              priceSnapshot: Number(item.price),
              quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
            })),
          });
        }

        savedNewItems = newSelectedItems.filter((item) => newSelectionKeys.has(buildOrderItemSelectionKey(item)));

        return orderDelegate.findUnique({
          where: { id: order.id },
          include: {
            kitchen: true,
            items: {
              include: {
                kitchenItem: {
                  include: {
                    catalogArticle: true,
                    catalogBlende: true,
                    catalogService: true,
                  },
                },
              },
            },
          },
        });
      });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  if (!savedOrder) {
    throw new Error("Order could not be saved");
  }

  const orderForNotifications = buildOrderForNotifications(savedOrder);
  const notificationResult = await processOrderNotifications({
    order: orderForNotifications,
    pdfBase64: null,
    pdfFilename: null,
    runEmail: false,
    runWebhook: false,
  });

  return {
    ...orderForNotifications,
    orderKind,
    newItemCount: savedNewItems.length,
    notifications: notificationResult,
  };
}

export async function resendOrderEmail(orderId, emailOverrides = {}) {
  const orderRecord = await getOrderRecordForOperations(orderId, emailOverrides.orderKind || ORDER_KIND_LIVE);
  const order = buildOrderForNotifications(orderRecord);
  const { subject, bodyText, excludedAttachmentKeys } = readEmailOverrides(emailOverrides);

  await sendOrderConfirmationEmail({ order, subject, bodyText, excludedAttachmentKeys });

  return order;
}

export async function deleteAllOrders() {
  const [, deletedOrders] = await prisma.$transaction([
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
  ]);

  return deletedOrders.count;
}

export async function deleteAllTestOrders() {
  const [, deletedOrders] = await prisma.$transaction([
    prisma.testOrderItem.deleteMany({}),
    prisma.testOrder.deleteMany({}),
  ]);

  return deletedOrders.count;
}

export async function retryOrderWebhook(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  const order = buildOrderForNotifications(orderRecord);
  await forwardOrderWebhook(order);
  return order;
}

export async function updateOrderStatus(orderId, status, orderKind = ORDER_KIND_LIVE) {
  const nextStatus = Object.values(OrderStatus).includes(status) ? status : OrderStatus.NEW;
  return getOrderDelegate(prisma, orderKind).update({
    where: { id: orderId },
    data: { status: nextStatus },
  });
}

export async function deleteOrder(orderId, orderKind = ORDER_KIND_LIVE) {
  return getOrderDelegate(prisma, orderKind).delete({
    where: { id: orderId },
  });
}

export async function confirmOrder(orderId, emailOverrides = {}) {
  const orderKind = emailOverrides.orderKind || ORDER_KIND_LIVE;
  const orderRecord = await getOrderRecordForOperations(orderId, orderKind);
  if (orderRecord.status === OrderStatus.CONFIRMED) {
    return buildOrderForNotifications(orderRecord);
  }
  if (orderRecord.status === OrderStatus.CANCELLED) {
    throw validationError("Cancelled orders cannot be confirmed.");
  }

  const order = buildOrderForNotifications(orderRecord);
  const { subject, bodyText, excludedAttachmentKeys } = readEmailOverrides(emailOverrides);
  await sendOrderConfirmationEmail({ order, subject, bodyText, excludedAttachmentKeys });

  await getOrderDelegate(prisma, orderKind).update({
    where: { id: orderId },
    data: { status: OrderStatus.CONFIRMED },
  });

  return order;
}
