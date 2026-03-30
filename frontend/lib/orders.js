import { ItemType, OrderStatus } from "@prisma/client";
import { MONTAGE_REQUIRED_CODES } from "./catalog";
import { forwardOrderWebhook, sendOrderConfirmationEmail } from "./email/order-notifications";
import { prisma } from "./prisma";

function requireString(value, label) {
  if (!value || !String(value).trim()) {
    throw new Error(`${label} is required`);
  }
  return String(value).trim();
}

function buildOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = now.toTimeString().slice(0, 8).replaceAll(":", "");
  return `${date}-${time}`;
}

function normalizeSubmissionItems(items = []) {
  return items
    .map((item) => ({
      code: item?.code ? String(item.code) : null,
      name: item?.name ? String(item.name) : null,
    }))
    .filter((item) => item.code || item.name);
}

function mapCatalogItem(catalogItems, submittedItem, itemType) {
  return (
    catalogItems.find((item) => item.itemType === itemType && item.code === submittedItem.code) ||
    catalogItems.find((item) => item.itemType === itemType && item.name === submittedItem.name) ||
    null
  );
}

export async function createOrderFromSubmission({ kitchenSlug, orderPayload, pdfBase64, pdfFilename }) {
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
  const validatedCustomer = {
    contractNumber: customer.contractNumber ? String(customer.contractNumber).trim() : "",
    firstName: requireString(customer.firstName, "First name"),
    lastName: requireString(customer.lastName, "Last name"),
    email: requireString(customer.email, "Email"),
    phone: requireString(customer.phone, "Phone"),
    address1: requireString(customer.address1, "Address"),
    address2: customer.address2 ? String(customer.address2).trim() : "",
    postalCode: requireString(customer.postalCode, "Postal code"),
    city: requireString(customer.city, "City"),
    paymentMethod: customer.paymentMethod ? String(customer.paymentMethod).trim() : "",
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
    throw new Error("One or more selected items are invalid or inactive");
  }

  const selectedComponentCodes = selectedComponents.map((item) => item.code);
  if (selectedServices.some((item) => item.code === "service-montage")) {
    const matchedCabinets = selectedComponentCodes.filter((code) => MONTAGE_REQUIRED_CODES.includes(code)).length;
    if (selectedComponents.length < 3 || matchedCabinets < 2) {
      throw new Error("Montage conditions are not met");
    }
  }

  const allSelected = [...selectedComponents, ...selectedAccessories, ...selectedServices];
  const totalPrice = allSelected.reduce((sum, item) => sum + Number(item.price), 0);
  const orderNumber = buildOrderNumber();

  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        kitchenId: kitchen.id,
        status: OrderStatus.NEW,
        contractNumber: validatedCustomer.contractNumber || null,
        firstName: validatedCustomer.firstName,
        lastName: validatedCustomer.lastName,
        email: validatedCustomer.email,
        phone: validatedCustomer.phone,
        address1: validatedCustomer.address1,
        address2: validatedCustomer.address2 || null,
        postalCode: validatedCustomer.postalCode,
        city: validatedCustomer.city,
        paymentMethod: validatedCustomer.paymentMethod || null,
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

  const orderForNotifications = {
    orderNumber: createdOrder.orderNumber,
    createdAt: createdOrder.createdAt.toISOString(),
    total: Number(createdOrder.totalPrice),
    kitchen: { id: kitchen.id, slug: kitchen.slug, name: kitchen.name },
    customer: validatedCustomer,
    components: createdOrder.items
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
    accessories: createdOrder.items
      .filter((item) => item.itemType === ItemType.ACCESSORY)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
    services: createdOrder.items
      .filter((item) => item.itemType === ItemType.SERVICE)
      .map((item) => ({ code: item.code, name: item.nameSnapshot, price: Number(item.priceSnapshot) })),
  };

  await sendOrderConfirmationEmail({
    order: orderForNotifications,
    pdfBase64,
    pdfFilename,
  });

  await forwardOrderWebhook(orderForNotifications);

  await prisma.order.update({
    where: { id: createdOrder.id },
    data: { status: OrderStatus.EMAILED },
  });

  return orderForNotifications;
}
