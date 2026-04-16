import crypto from "crypto";
import { ItemType, OrderStatus, Prisma } from "@prisma/client";
import { MONTAGE_REQUIRED_CODES } from "./catalog";
import { forwardOrderWebhook, sendOrderConfirmationEmail } from "./email/order-notifications";
import {
  CONTRACT_ERRORS,
  assertUsableKitchenContract,
  buildConfirmedItemCodeSets,
  contractValidationError,
  getContractOrderState,
  normalizeContractNumber,
} from "./kitchen-contracts";
import { prisma } from "./prisma";

const PAYMENT_METHODS = new Set(["paypal", "visa", "mastercard", "klarna"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function buildOrderNumber() {
  const timestamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "").slice(0, 17);
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `FRG-${timestamp}-${suffix}`;
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
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw validationError("Payment method is invalid");
  }
  return paymentMethod;
}

function validateConsent(value) {
  if (value !== true) {
    throw validationError("Consent is required");
  }
}

function normalizeSubmissionItems(items = []) {
  const seen = new Set();
  return items
    .map((item) => ({
      code: item?.code ? String(item.code) : null,
      name: item?.name ? String(item.name) : null,
    }))
    .filter((item) => {
      if (!item.code && !item.name) return false;
      const key = item.code || item.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function mapCatalogItem(catalogItems, submittedItem, itemType) {
  return (
    catalogItems.find((item) => item.itemType === itemType && item.code === submittedItem.code) ||
    catalogItems.find((item) => item.itemType === itemType && item.name === submittedItem.name) ||
    null
  );
}

function buildOrderForNotifications(orderRecord) {
  const toNotificationItem = (item) => ({
    code: item.code,
    name: item.nameSnapshot,
    price: Number(item.priceSnapshot),
    iconKey: item.kitchenItem?.iconKey || "",
  });

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
      notes: orderRecord.notes || "",
      paymentMethod: orderRecord.paymentMethod || "",
    },
    components: orderRecord.items
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map(toNotificationItem),
    accessories: orderRecord.items
      .filter((item) => item.itemType === ItemType.ACCESSORY)
      .map(toNotificationItem),
    services: orderRecord.items
      .filter((item) => item.itemType === ItemType.SERVICE)
      .map(toNotificationItem),
  };
}

async function getOrderRecordForOperations(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      kitchen: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: { kitchenItem: true },
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

function itemKey(item) {
  return `${item.itemType}:${item.code}`;
}

function withoutConfirmedBaseline(items, confirmedItemSets) {
  return items.filter((item) => !confirmedItemSets[item.itemType]?.has(item.code));
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
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen || kitchen.status !== "ACTIVE") {
    throw new Error("Kitchen not found");
  }

  const customer = orderPayload?.customer || {};
  validateConsent(customer.consent);
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
    notes: customer.notes ? String(customer.notes).trim() : "",
    paymentMethod: validatePaymentMethod(customer.paymentMethod),
  };

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

  const selectedComponentCodes = selectedComponents.map((item) => item.code);
  if (selectedServices.some((item) => item.code === "SVC-MONTAGE-001")) {
    const matchedCabinets = selectedComponentCodes.filter((code) => MONTAGE_REQUIRED_CODES.includes(code)).length;
    if (selectedComponents.length < 3 || matchedCabinets < 2) {
      throw validationError("Montage conditions are not met");
    }
  }

  const allSelected = [...selectedComponents, ...selectedAccessories, ...selectedServices];
  if (!allSelected.length) {
    throw validationError("At least one item must be selected");
  }

  const kitchenContract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: validatedCustomer.contractNumber },
    include: { kitchen: true },
  });

  assertUsableKitchenContract(kitchenContract);
  if (kitchenContract.kitchenId !== kitchen.id) {
    throw contractValidationError(CONTRACT_ERRORS.KITCHEN_MISMATCH);
  }

  let savedOrder = null;
  let savedNewItems = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const orderNumber = buildOrderNumber();
      savedOrder = await prisma.$transaction(async (tx) => {
        const contractOrderState = await getContractOrderState(kitchenContract.id, tx);
        const existingEditableOrder = contractOrderState.editableOrder;
        const confirmedItemSets = buildConfirmedItemCodeSets(contractOrderState.confirmedItems);
        const newSelectedItems = withoutConfirmedBaseline(allSelected, confirmedItemSets);
        const newSelectionKeys = new Set(newSelectedItems.map(itemKey));
        const submittedKeys = new Set(allSelected.map(itemKey));
        const missingBaselineItems = contractOrderState.confirmedItems.filter(
          (item) => !submittedKeys.has(itemKey(item)),
        );

        if (missingBaselineItems.length) {
          throw validationError("Confirmed items cannot be removed from this contract.");
        }

        if (!newSelectedItems.length && !existingEditableOrder) {
          throw validationError("Select at least one new item for this contract.");
        }

        const totalPrice = newSelectedItems.reduce((sum, item) => sum + Number(item.price), 0);
        const order = existingEditableOrder
          ? await tx.order.update({
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
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
                status: OrderStatus.NEW,
              },
            })
          : await tx.order.create({
              data: {
                orderNumber,
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
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
              },
            });

        if (existingEditableOrder) {
          await tx.orderItem.deleteMany({
            where: { orderId: order.id },
          });
        }

        if (newSelectedItems.length) {
          await tx.orderItem.createMany({
            data: newSelectedItems.map((item) => ({
              orderId: order.id,
              kitchenItemId: item.id,
              itemType: item.itemType,
              code: item.code,
              nameSnapshot: item.name,
              priceSnapshot: item.price,
              quantity: 1,
            })),
          });
        }

        savedNewItems = newSelectedItems.filter((item) => newSelectionKeys.has(itemKey(item)));

        return tx.order.findUnique({
          where: { id: order.id },
          include: {
            kitchen: true,
            items: {
              include: { kitchenItem: true },
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
    pdfBase64,
    pdfFilename,
    runEmail: false,
    runWebhook: true,
  });

  return {
    ...orderForNotifications,
    newItemCount: savedNewItems.length,
    notifications: notificationResult,
  };
}

export async function resendOrderEmail(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  const order = buildOrderForNotifications(orderRecord);

  await sendOrderConfirmationEmail({ order });

  return order;
}

export async function retryOrderWebhook(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  const order = buildOrderForNotifications(orderRecord);
  await forwardOrderWebhook(order);
  return order;
}

export async function updateOrderStatus(orderId, status) {
  const nextStatus = Object.values(OrderStatus).includes(status) ? status : OrderStatus.NEW;
  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
  });
}

export async function deleteOrder(orderId) {
  return prisma.order.delete({
    where: { id: orderId },
  });
}

export async function confirmOrder(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  if (orderRecord.status === OrderStatus.CONFIRMED) {
    return buildOrderForNotifications(orderRecord);
  }
  if (orderRecord.status === OrderStatus.CANCELLED) {
    throw validationError("Cancelled orders cannot be confirmed.");
  }

  const order = buildOrderForNotifications(orderRecord);
  await sendOrderConfirmationEmail({ order });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CONFIRMED },
  });

  return order;
}
