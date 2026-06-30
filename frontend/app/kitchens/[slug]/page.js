import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import KitchenConfigurator from "../../../components/kitchen-configurator";
import { getKitchenBySlug, serializeKitchenForLegacy } from "../../../lib/catalog";
import {
  getContractOrderState,
  getKitchenContractForAccess,
  normalizeContractNumber,
} from "../../../lib/kitchen-contracts";
import { loadKitchenSvgMarkup } from "../../../lib/load-kitchen-svg";
import { getDeliveryLeadTimeDays, getDeliveryMinOrderSettings } from "../../../lib/admin-settings";
import { prisma } from "../../../lib/prisma";
import { PUBLIC_LANGUAGE_COOKIE_NAME, normalizePublicLanguage } from "../../../lib/public-language";

export const dynamic = "force-dynamic";

function serializeOrderItems(items = [], locked = false) {
  return items.map((item) => ({
    itemType: String(item.itemType || "").toLowerCase(),
    code: item.code || "",
    name: item.nameSnapshot || "",
    articleNumber: item.kitchenItem?.articleNumber || "",
    quantity: item.quantity || 1,
    locked,
    sourceOrderId: item.sourceOrderId || "",
    sourceOrderNumber: item.sourceOrderNumber || "",
  }));
}

function serializeInitialOrder(order, confirmedItems = []) {
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customer: {
      contractNumber: order.contractNumber || "",
      firstName: order.firstName || "",
      lastName: order.lastName || "",
      email: order.email || "",
      phone: order.phone || "",
      address1: order.address1 || "",
      address2: order.address2 || "",
      postalCode: order.postalCode || "",
      city: order.city || "",
      country: order.country || "",
      preferredDeliveryDate: order.preferredDeliveryDate
        ? order.preferredDeliveryDate.toISOString().slice(0, 10)
        : "",
      notes: order.notes || "",
      paymentMethod: order.paymentMethod || "",
    },
    items: [
      ...serializeOrderItems(confirmedItems, true),
      ...serializeOrderItems(order.items || [], false),
    ],
  };
}

function serializeConfirmedBaseline(confirmedItems = []) {
  return {
    items: serializeOrderItems(confirmedItems, true),
  };
}

function serializeContractAddress(contract) {
  if (!contract) return null;

  const project = contract.project || null;
  const propertyObject = project?.propertyObject || null;
  const housingCompany = project?.housingCompany || null;
  const unitParts = [
    contract.building ? `Building ${contract.building}` : "",
    contract.floor ? `Floor ${contract.floor}` : "",
    contract.unitNumber ? `Unit ${contract.unitNumber}` : "",
  ].filter(Boolean);

  const hasDetails = [
    contract.contractNumber,
    project?.name,
    propertyObject?.name,
    housingCompany?.name,
    propertyObject?.country,
    propertyObject?.city,
    propertyObject?.postalCode,
    propertyObject?.address1,
    propertyObject?.address2,
    contract.building,
    contract.floor,
    contract.unitNumber,
    contract.notes,
  ].some(Boolean);

  if (!hasDetails) return null;

  return {
    contractNumber: contract.contractNumber || "",
    projectName: project?.name || "",
    objectName: propertyObject?.name || "",
    housingCompanyName: housingCompany?.name || "",
    country: propertyObject?.country || "",
    city: propertyObject?.city || "",
    postalCode: propertyObject?.postalCode || "",
    address1: propertyObject?.address1 || "",
    address2: propertyObject?.address2 || "",
    building: contract.building || "",
    floor: contract.floor || "",
    unitNumber: contract.unitNumber || "",
    notes: contract.notes || "",
    unitLabel: unitParts.join(", "),
  };
}

export default async function KitchenPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const kitchen = await getKitchenBySlug(slug);

  if (!kitchen || kitchen.status !== "ACTIVE") {
    notFound();
  }

  const kitchenConfig = serializeKitchenForLegacy(kitchen);
  const [svgMarkup, deliveryMinOrderSettings, deliveryLeadTimeDays] = await Promise.all([
    loadKitchenSvgMarkup(slug),
    getDeliveryMinOrderSettings(),
    getDeliveryLeadTimeDays(),
  ]);
  let initialContractNumber = normalizeContractNumber(resolvedSearchParams?.contractNumber);
  const returnOrderNumber = String(resolvedSearchParams?.order || "").trim();
  const initialLanguage = resolvedSearchParams?.lang
    ? normalizePublicLanguage(String(resolvedSearchParams.lang))
    : normalizePublicLanguage(cookieStore.get(PUBLIC_LANGUAGE_COOKIE_NAME)?.value);
  let initialOrder = null;
  let initialContractAddress = null;

  if (!initialContractNumber && returnOrderNumber) {
    const returnOrder = await prisma.order.findUnique({
      where: { orderNumber: returnOrderNumber },
      select: {
        contractNumber: true,
        kitchenId: true,
      },
    });
    if (returnOrder?.kitchenId === kitchen.id) {
      initialContractNumber = returnOrder.contractNumber || "";
    }
  }

  if (initialContractNumber) {
    try {
      const contract = await getKitchenContractForAccess(initialContractNumber);
      if (contract.kitchenId === kitchen.id) {
        const contractOrderState = await getContractOrderState(contract.id);
        initialOrder = contractOrderState.editableOrder
          ? serializeInitialOrder(contractOrderState.editableOrder, contractOrderState.confirmedItems)
          : serializeConfirmedBaseline(contractOrderState.confirmedItems);
        initialContractAddress = serializeContractAddress(contract);
      }
    } catch (error) {
      console.warn(`Could not load editable order for contract ${initialContractNumber}:`, error);
    }
  }

  return (
    <KitchenConfigurator
      kitchenConfig={kitchenConfig}
      svgMarkup={svgMarkup}
      initialLanguage={initialLanguage}
      initialContractNumber={initialContractNumber}
      initialOrder={initialOrder}
      initialContractAddress={initialContractAddress}
      deliveryMinOrderSettings={deliveryMinOrderSettings}
      deliveryLeadTimeDays={deliveryLeadTimeDays}
    />
  );
}
