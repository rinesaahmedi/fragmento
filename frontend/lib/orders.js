import crypto from "crypto";
import { ItemType, OrderStatus, Prisma } from "@prisma/client";
import { MONTAGE_REQUIRED_CODES } from "./catalog";
import { forwardOrderWebhook, sendOrderConfirmationEmail } from "./email/order-notifications";
import {
  CONTRACT_ERRORS,
  assertUsableKitchenContract,
  contractValidationError,
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
      paymentMethod: orderRecord.paymentMethod || "",
    },
    components: orderRecord.items
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
    accessories: orderRecord.items
      .filter((item) => item.itemType === ItemType.ACCESSORY)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
    services: orderRecord.items
      .filter((item) => item.itemType === ItemType.SERVICE)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
  };
}

async function getOrderRecordForOperations(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      kitchen: true,
      items: { orderBy: { createdAt: "asc" } },
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
  const totalPrice = allSelected.reduce((sum, item) => sum + Number(item.price), 0);

  const kitchenContract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: validatedCustomer.contractNumber },
    include: { kitchen: true },
  });

  assertUsableKitchenContract(kitchenContract);
  if (kitchenContract.kitchenId !== kitchen.id) {
    throw contractValidationError(CONTRACT_ERRORS.KITCHEN_MISMATCH);
  }

  let createdOrder = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const orderNumber = buildOrderNumber();
      createdOrder = await prisma.$transaction(async (tx) => {
        const contractUpdate = await tx.kitchenContract.updateMany({
          where: {
            id: kitchenContract.id,
            kitchenId: kitchen.id,
            isActive: true,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        if (contractUpdate.count !== 1) {
          throw contractValidationError(CONTRACT_ERRORS.USED);
        }

        const order = await tx.order.create({
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
            paymentMethod: validatedCustomer.paymentMethod,
            totalPrice,
          },
        });

        await tx.orderItem.createMany({
          data: allSelected.map((item) => ({
            orderId: order.id,
            kitchenItemId: item.id,
            itemType: item.itemType,
            code: item.code,
            nameSnapshot: item.name,
            priceSnapshot: item.price,
            quantity: 1,
          })),
        });

        return tx.order.findUnique({
          where: { id: order.id },
          include: {
            kitchen: true,
            items: true,
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

  if (!createdOrder) {
    throw new Error("Order could not be created");
  }

  const orderForNotifications = buildOrderForNotifications(createdOrder);
  const notificationResult = await processOrderNotifications({
    order: orderForNotifications,
    pdfBase64,
    pdfFilename,
    runEmail: true,
    runWebhook: true,
  });

  if (notificationResult.emailSent) {
    await prisma.order.update({
      where: { id: createdOrder.id },
      data: { status: OrderStatus.EMAILED },
    });
  }

  return {
    ...orderForNotifications,
    notifications: notificationResult,
  };
}

export async function resendOrderEmail(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  const order = buildOrderForNotifications(orderRecord);

  await sendOrderConfirmationEmail({ order });

  if (orderRecord.status === OrderStatus.NEW) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.EMAILED },
    });
  }

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
