import { prisma } from "./prisma";
import { normalizeServiceClaimContractNumber } from "./service-claim-lookup.js";

export { buildServiceClaimAutofillFromContract, splitPersonName } from "./service-claim-contract-autofill";
export {
  isJunkServiceClaimVisitEvent,
  isServiceClaimContractLookupReady,
  normalizeServiceClaimContractNumber,
  SERVICE_CLAIM_JUNK_CONTRACT_LAST4,
  SERVICE_CLAIM_LOOKUP_MIN_LENGTH,
} from "./service-claim-lookup.js";

export async function getServiceClaimContractDetails(contractNumber) {
  const normalizedContractNumber = normalizeServiceClaimContractNumber(contractNumber);
  if (!normalizedContractNumber) {
    return null;
  }

  const contract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: normalizedContractNumber },
    include: {
      kitchen: true,
      project: {
        include: {
          propertyObject: true,
          housingCompany: true,
        },
      },
      orders: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
      },
      registrations: {
        where: { isActive: true },
        orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });

  if (!contract) {
    return null;
  }

  const propertyObject = contract.project?.propertyObject || null;
  const latestOrder = contract.orders?.[0] || null;
  const activeRegistration = contract.registrations?.[0] || null;
  const hasPropertyObjectAddress = Boolean(
    propertyObject?.address1
    || propertyObject?.address2
    || propertyObject?.postalCode
    || propertyObject?.city
    || propertyObject?.country,
  );
  const addressSource = hasPropertyObjectAddress
    ? {
        source: "propertyObject",
        address1: propertyObject.address1 || "",
        address2: propertyObject.address2 || "",
        postalCode: propertyObject.postalCode || "",
        city: propertyObject.city || "",
        country: propertyObject.country || "",
      }
    : latestOrder
      ? {
          source: "latestOrder",
          address1: latestOrder.address1 || "",
          address2: latestOrder.address2 || "",
          postalCode: latestOrder.postalCode || "",
          city: latestOrder.city || "",
          country: latestOrder.country || "",
        }
      : {
          source: "none",
          address1: "",
          address2: "",
          postalCode: "",
          city: "",
          country: "",
        };

  const housingCompany = contract.project?.housingCompany || null;

  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    contractType: contract.contractType,
    isActive: contract.isActive,
    kitchenId: contract.kitchenId,
    kitchenName: contract.kitchen?.name || "",
    kitchenSlug: contract.kitchen?.slug || "",
    building: contract.building || propertyObject?.name || "",
    floor: contract.floor || "",
    unitNumber: contract.unitNumber || "",
    projectName: contract.project?.name || "",
    propertyObjectName: propertyObject?.name || "",
    housingCompanyName: housingCompany?.name || "",
    address: addressSource,
    landlord: housingCompany
      ? {
          companyName: housingCompany.name || "",
          email: housingCompany.email || "",
          phone: housingCompany.phone || "",
          managerName: contract.project?.managerName || "",
        }
      : null,
    registration: activeRegistration
      ? {
          fullName: activeRegistration.fullName || "",
          email: activeRegistration.email || "",
          phone: activeRegistration.phone || "",
          addressNote: activeRegistration.addressNote || "",
          registeredAt: activeRegistration.registeredAt,
        }
      : null,
  };
}
