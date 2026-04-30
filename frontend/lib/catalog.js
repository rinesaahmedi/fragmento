import { KitchenStatus, ItemType, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const LOCKED_BASE_COLORS = ["springgreen", "red", "#7f001f", "#980026"];
export const MONTAGE_REQUIRED_CODES = [
  "CAB-BASE-030",
  "CAB-WALL-L-060",
  "CAB-WALL-R-060",
  "CAB-WALL-B-L-600",
  "CAB-WALL-B-ML-600",
  "CAB-HOOD-B-600",
  "CAB-WALL-B-MR-600",
  "CAB-WALL-B-R-600",
  "HOOD-B-FH664621E",
  "WM-B-EWA34660W",
  "SINKBASE-B-600",
  "DISH-B-600-STD",
  "OVEN-B-600-HOB",
  "CAB-BASE-B-STR",
  "HOOD-C-FH664621E",
  "CAB-COOK-C-L-600",
  "OVEN-C-600-HOB",
  "CAB-COOK-C-R-600",
  "CAB-WALL-C-L-600",
  "CAB-WALL-C-ML-600",
  "CAB-WALL-C-MR-600",
  "CAB-WALL-C-R-600",
  "WM-C-EWA34660W",
  "SINKBASE-C-600",
  "DISH-C-600-STD",
  "CAB-DRAWER-C-3D",
];
export const LEGACY_ICON_KEYS = [
  "dishwasher",
  "refrigerator",
  "base_cabinet_30",
  "wall_cabinet_l",
  "wall_cabinet_r",
  "extractor_hood",
  "wall_cabinet_single_light",
  "wall_cabinet_double_light",
  "wall_cabinet_plain",
  "washing_machine_base",
  "sink_base",
  "dishwasher_base",
  "oven_base",
  "drawer_base",
  "worktop",
  "drawer_base_two",
  "drawer_base_three",
  "tall_refrigerator",
  "extractor_hood_chimney",
  "wall_cabinet_standard",
  "under_cabinet_light",
  "sink_faucet",
  "waste_system",
  "cutlery_insert",
  "lighting_set",
  "delivery_assembly",
  "pickup",
];

export async function getActiveKitchens() {
  return prisma.kitchen.findMany({
    where: { status: KitchenStatus.ACTIVE },
    orderBy: { name: "asc" },
  });
}

export async function getKitchenBySlug(slug) {
  return prisma.kitchen.findUnique({
    where: { slug },
    include: {
      items: {
        where: { isActive: true },
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
}

export async function listKitchensForAdmin() {
  return prisma.kitchen.findMany({
    include: {
      _count: { select: { items: true, orders: true, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKitchenById(id) {
  const kitchen = await prisma.kitchen.findUnique({
    where: { id },
    include: {
      _count: { select: { items: true, orders: true, contracts: true } },
      contracts: {
        orderBy: [{ createdAt: "desc" }, { contractNumber: "asc" }],
      },
      items: {
        orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!kitchen) return null;
  return {
    ...kitchen,
    contracts: await attachHousingCompaniesToContracts(kitchen.contracts),
  };
}

export async function listPropertyOwnersForAdmin() {
  const companies = await prisma.$queryRaw`
    SELECT
      hc."id",
      hc."name",
      hc."address",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt",
      COUNT(DISTINCT pobj."id")::int AS "objectCount",
      COUNT(kc."id")::int AS "contractCount"
    FROM "HousingCompany" hc
    LEFT JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    GROUP BY hc."id"
    ORDER BY hc."createdAt" DESC, hc."name" ASC
  `;

  const objects = await prisma.$queryRaw`
    SELECT
      pobj."id",
      pobj."name",
      pobj."housingCompanyId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      pobj."createdAt",
      pobj."updatedAt",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyObject" pobj
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    GROUP BY pobj."id", prj."id"
    ORDER BY pobj."createdAt" DESC, pobj."name" ASC
  `;

  const objectsByCompanyId = new Map();
  objects.forEach((object) => {
    const companyObjects = objectsByCompanyId.get(object.housingCompanyId) || [];
    companyObjects.push({
      id: object.id,
      name: object.name,
      housingCompanyId: object.housingCompanyId,
      projectId: object.projectId || null,
      projectName: object.projectName || null,
      projectCode: object.projectCode || null,
      projectStatus: object.projectStatus || "active",
      projectDescription: object.projectDescription || null,
      projectManagerName: object.projectManagerName || null,
      contactPhone: object.contactPhone,
      country: object.country,
      city: object.city,
      postalCode: object.postalCode,
      address1: object.address1,
      address2: object.address2,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
      _count: { contracts: Number(object.contractCount || 0) },
    });
    objectsByCompanyId.set(object.housingCompanyId, companyObjects);
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    address: company.address,
    email: company.email,
    phone: company.phone,
    notes: company.notes,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    propertyObjects: objectsByCompanyId.get(company.id) || [],
    _count: {
      propertyObjects: Number(company.objectCount || 0),
      contracts: Number(company.contractCount || 0),
    },
  }));
}

function normalizeLookupId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export async function getPropertyOwnerForAdmin(id) {
  const normalizedId = normalizeLookupId(id);
  const owners = await listPropertyOwnersForAdmin();
  return owners.find((owner) => owner.id === normalizedId || owner.id === id) || null;
}

export async function listPropertyObjectsForAdmin(filters = {}) {
  const whereParts = [];
  if (filters.housingCompanyId) whereParts.push(Prisma.sql`pobj."housingCompanyId" = ${filters.housingCompanyId}`);
  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      pobj."id",
      pobj."name",
      pobj."housingCompanyId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."name" AS "housingCompanyName",
      hc."email" AS "housingCompanyEmail",
      hc."phone" AS "housingCompanyPhone",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyObject" pobj
    JOIN "HousingCompany" hc ON hc."id" = pobj."housingCompanyId"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    ${whereSql}
    GROUP BY pobj."id", hc."id", prj."id"
    ORDER BY hc."createdAt" DESC, pobj."createdAt" DESC, pobj."name" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    housingCompanyId: row.housingCompanyId,
    projectId: row.projectId || null,
    projectName: row.projectName || null,
    projectCode: row.projectCode || null,
    projectStatus: row.projectStatus || "active",
    projectDescription: row.projectDescription || null,
    projectManagerName: row.projectManagerName || null,
    contactPhone: row.contactPhone,
    country: row.country,
    city: row.city,
    postalCode: row.postalCode,
    address1: row.address1,
    address2: row.address2,
    housingCompany: {
      id: row.housingCompanyId,
      name: row.housingCompanyName,
      email: row.housingCompanyEmail,
      phone: row.housingCompanyPhone,
    },
    _count: { contracts: Number(row.contractCount || 0) },
  }));
}

export async function listProjectsForAdmin(filters = {}) {
  const whereParts = [];
  if (filters.housingCompanyId) whereParts.push(Prisma.sql`prj."housingCompanyId" = ${filters.housingCompanyId}`);
  if (filters.projectId) whereParts.push(Prisma.sql`prj."id" = ${filters.projectId}`);
  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      prj."id",
      prj."name",
      prj."projectCode",
      prj."status",
      prj."description",
      prj."managerName",
      prj."housingCompanyId",
      prj."propertyObjectId",
      prj."createdAt",
      prj."updatedAt",
      pobj."name" AS "propertyObjectName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."name" AS "housingCompanyName",
      hc."email" AS "housingCompanyEmail",
      hc."phone" AS "housingCompanyPhone",
      COUNT(kc."id")::int AS "contractCount"
    FROM "Project" prj
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    ${whereSql}
    GROUP BY prj."id", pobj."id", hc."id"
    ORDER BY hc."createdAt" DESC, prj."createdAt" DESC, prj."name" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    projectCode: row.projectCode || null,
    status: row.status || "active",
    description: row.description || null,
    managerName: row.managerName || null,
    housingCompanyId: row.housingCompanyId,
    propertyObjectId: row.propertyObjectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    propertyObject: {
      id: row.propertyObjectId,
      name: row.propertyObjectName,
      contactPhone: row.contactPhone,
      country: row.country,
      city: row.city,
      postalCode: row.postalCode,
      address1: row.address1,
      address2: row.address2,
      housingCompanyId: row.housingCompanyId,
    },
    housingCompany: {
      id: row.housingCompanyId,
      name: row.housingCompanyName,
      email: row.housingCompanyEmail,
      phone: row.housingCompanyPhone,
    },
    _count: { contracts: Number(row.contractCount || 0) },
  }));
}

export async function listKitchenContractsForAdmin(filters = {}) {
  const whereParts = [];
  const havingParts = [];
  if (filters.kitchenId) whereParts.push(Prisma.sql`kc."kitchenId" = ${filters.kitchenId}`);
  if (filters.housingCompanyId || filters.ownerId) whereParts.push(Prisma.sql`hc."id" = ${filters.housingCompanyId || filters.ownerId}`);
  if (filters.projectId) whereParts.push(Prisma.sql`prj."id" = ${filters.projectId}`);
  if (filters.status === "active") whereParts.push(Prisma.sql`kc."isActive" = true`);
  if (filters.status === "inactive") whereParts.push(Prisma.sql`kc."isActive" = false`);
  if (filters.usage === "unused") havingParts.push(Prisma.sql`COUNT(o."id") = 0`);
  if (filters.usage === "used") havingParts.push(Prisma.sql`COUNT(o."id") >= 1`);
  if (filters.usage === "once") havingParts.push(Prisma.sql`COUNT(o."id") = 1`);
  if (filters.usage === "multiple") havingParts.push(Prisma.sql`COUNT(o."id") >= 2`);
  if (filters.query) {
    const query = `%${filters.query}%`;
    whereParts.push(Prisma.sql`(
      kc."contractNumber" ILIKE ${query}
      OR prj."name" ILIKE ${query}
      OR prj."projectCode" ILIKE ${query}
      OR prj."status" ILIKE ${query}
      OR prj."description" ILIKE ${query}
      OR prj."managerName" ILIKE ${query}
      OR pobj."name" ILIKE ${query}
      OR pobj."country" ILIKE ${query}
      OR pobj."city" ILIKE ${query}
      OR pobj."postalCode" ILIKE ${query}
      OR pobj."address1" ILIKE ${query}
      OR hc."name" ILIKE ${query}
      OR k."name" ILIKE ${query}
    )`);
  }

  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;
  const havingSql = havingParts.length ? Prisma.sql`HAVING ${Prisma.join(havingParts, " AND ")}` : Prisma.empty;
  const rows = await prisma.$queryRaw`
    SELECT
      kc."id",
      kc."contractNumber",
      kc."kitchenId",
      kc."projectId",
      kc."isActive",
      kc."usedAt",
      kc."building",
      kc."floor",
      kc."unitNumber",
      kc."notes",
      kc."createdAt",
      kc."updatedAt",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      k."id" AS "kitchenRecordId",
      k."slug" AS "kitchenSlug",
      k."name" AS "kitchenName",
      pobj."id" AS "propertyObjectRecordId",
      pobj."name" AS "propertyObjectName",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."id" AS "housingCompanyRecordId",
      hc."name" AS "housingCompanyName",
      hc."email",
      hc."phone",
      hc."notes" AS "housingCompanyNotes",
      latest_order."firstName" AS "latestOrderFirstName",
      latest_order."lastName" AS "latestOrderLastName",
      latest_order."address1" AS "latestOrderAddress1",
      latest_order."address2" AS "latestOrderAddress2",
      latest_order."postalCode" AS "latestOrderPostalCode",
      latest_order."city" AS "latestOrderCity",
      latest_order."country" AS "latestOrderCountry",
      latest_order."createdAt" AS "latestOrderCreatedAt",
      COUNT(o."id")::int AS "orderCount"
    FROM "KitchenContract" kc
    JOIN "Kitchen" k ON k."id" = kc."kitchenId"
    JOIN "Project" prj ON prj."id" = kc."projectId"
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
    LEFT JOIN LATERAL (
      SELECT
        oo."firstName",
        oo."lastName",
        oo."address1",
        oo."address2",
        oo."postalCode",
        oo."city",
        oo."country",
        oo."createdAt"
      FROM "Order" oo
      WHERE oo."kitchenContractId" = kc."id"
      ORDER BY oo."createdAt" DESC, oo."id" DESC
      LIMIT 1
    ) latest_order ON true
    ${whereSql}
    GROUP BY
      kc."id",
      prj."id",
      k."id",
      pobj."id",
      hc."id",
      latest_order."firstName",
      latest_order."lastName",
      latest_order."address1",
      latest_order."address2",
      latest_order."postalCode",
      latest_order."city",
      latest_order."country",
      latest_order."createdAt"
    ${havingSql}
    ORDER BY kc."createdAt" DESC, kc."contractNumber" ASC
  `;

  const contracts = rows.map((row) => ({
    id: row.id,
    contractNumber: row.contractNumber,
    kitchenId: row.kitchenId,
    projectId: row.projectId || null,
    projectName: row.projectName || null,
    projectCode: row.projectCode || null,
    projectStatus: row.projectStatus || "active",
    projectDescription: row.projectDescription || null,
    projectManagerName: row.projectManagerName || null,
    housingCompanyId: row.housingCompanyRecordId,
    ownerId: row.housingCompanyRecordId,
    isActive: row.isActive,
    usedAt: row.usedAt,
    country: row.country,
    city: row.city,
    postalCode: row.postalCode,
    address1: row.address1,
    address2: row.address2,
    building: row.building,
    floor: row.floor,
    unitNumber: row.unitNumber,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    kitchen: {
      id: row.kitchenRecordId,
      slug: row.kitchenSlug,
      name: row.kitchenName,
    },
    propertyObject: row.propertyObjectRecordId
      ? {
          id: row.propertyObjectRecordId,
          name: row.propertyObjectName,
          projectId: row.projectId || null,
          projectName: row.projectName || null,
          projectCode: row.projectCode || null,
          projectStatus: row.projectStatus || "active",
          projectDescription: row.projectDescription || null,
          projectManagerName: row.projectManagerName || null,
          housingCompanyId: row.housingCompanyRecordId,
          country: row.country,
          city: row.city,
          postalCode: row.postalCode,
          address1: row.address1,
          address2: row.address2,
        }
      : null,
    project: {
      id: row.projectId,
      name: row.projectName || "",
      projectCode: row.projectCode || null,
      status: row.projectStatus || "active",
      description: row.projectDescription || null,
      managerName: row.projectManagerName || null,
      housingCompanyId: row.housingCompanyRecordId,
      propertyObjectId: row.propertyObjectRecordId,
      propertyObject: row.propertyObjectRecordId
        ? {
            id: row.propertyObjectRecordId,
            name: row.propertyObjectName,
            housingCompanyId: row.housingCompanyRecordId,
            country: row.country,
            city: row.city,
            postalCode: row.postalCode,
            address1: row.address1,
            address2: row.address2,
          }
        : null,
    },
    housingCompany: row.housingCompanyRecordId
      ? {
          id: row.housingCompanyRecordId,
          name: row.housingCompanyName,
          email: row.email,
          phone: row.phone,
          notes: row.housingCompanyNotes,
        }
      : null,
    owner: row.housingCompanyRecordId
      ? {
          id: row.housingCompanyRecordId,
          name: row.housingCompanyName,
          email: row.email,
          phone: row.phone,
          notes: row.housingCompanyNotes,
        }
      : null,
    latestOrderAddress: row.latestOrderAddress1
      ? {
          firstName: row.latestOrderFirstName,
          lastName: row.latestOrderLastName,
          address1: row.latestOrderAddress1,
          address2: row.latestOrderAddress2,
          postalCode: row.latestOrderPostalCode,
          city: row.latestOrderCity,
          country: row.latestOrderCountry,
          createdAt: row.latestOrderCreatedAt,
        }
      : null,
    _count: { orders: Number(row.orderCount || 0) },
  }));

  return attachOrdersToContracts(contracts);
}

async function attachOrdersToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  const orders = await prisma.order.findMany({
    where: { kitchenContractId: { in: contractIds } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPrice: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      kitchenContractId: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const ordersByContractId = new Map();
  orders.forEach((order) => {
    const contractOrders = ordersByContractId.get(order.kitchenContractId) || [];
    contractOrders.push({
      ...order,
      totalPrice: Number(order.totalPrice || 0),
      contractOrderSequence: contractOrders.length + 1,
    });
    ordersByContractId.set(order.kitchenContractId, contractOrders);
  });

  return contracts.map((contract) => ({
    ...contract,
    orders: [...(ordersByContractId.get(contract.id) || [])].reverse(),
  }));
}

async function attachHousingCompaniesToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  const rows = await prisma.$queryRaw`
    SELECT
      kc."id" AS "contractId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      prj."propertyObjectId",
      pobj."id" AS "propertyObjectRecordId",
      pobj."name" AS "propertyObjectName",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."id" AS "housingCompanyRecordId",
      hc."name" AS "housingCompanyName",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt"
    FROM "KitchenContract" kc
    JOIN "Project" prj ON prj."id" = kc."projectId"
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    WHERE kc."id" IN (${Prisma.join(contractIds)})
  `;
  const companyByContractId = new Map(
    rows.map((row) => [
      row.contractId,
      {
        projectId: row.projectId || null,
        projectName: row.projectName || null,
        projectCode: row.projectCode || null,
        projectStatus: row.projectStatus || "active",
        projectDescription: row.projectDescription || null,
        projectManagerName: row.projectManagerName || null,
        project: {
          id: row.projectId || null,
          name: row.projectName || null,
          projectCode: row.projectCode || null,
          status: row.projectStatus || "active",
          description: row.projectDescription || null,
          managerName: row.projectManagerName || null,
          housingCompanyId: row.housingCompanyRecordId || null,
          propertyObjectId: row.propertyObjectId || null,
          propertyObject: row.propertyObjectRecordId
            ? {
                id: row.propertyObjectRecordId,
                name: row.propertyObjectName,
                housingCompanyId: row.housingCompanyRecordId,
                country: row.country,
                city: row.city,
                postalCode: row.postalCode,
                address1: row.address1,
                address2: row.address2,
              }
            : null,
        },
        propertyObject: row.propertyObjectRecordId
          ? {
              id: row.propertyObjectRecordId,
              name: row.propertyObjectName,
              projectId: row.projectId || null,
              projectName: row.projectName || null,
              projectCode: row.projectCode || null,
              projectStatus: row.projectStatus || "active",
              projectDescription: row.projectDescription || null,
              projectManagerName: row.projectManagerName || null,
              housingCompanyId: row.housingCompanyRecordId,
              country: row.country,
              city: row.city,
              postalCode: row.postalCode,
              address1: row.address1,
              address2: row.address2,
            }
          : null,
        housingCompanyId: row.housingCompanyRecordId || null,
        housingCompany: row.housingCompanyRecordId
          ? {
              id: row.housingCompanyRecordId,
              name: row.housingCompanyName,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            }
          : null,
      },
    ]),
  );

  return contracts.map((contract) => ({
    ...contract,
    projectId: companyByContractId.get(contract.id)?.projectId || null,
    projectName: companyByContractId.get(contract.id)?.projectName || null,
    project: companyByContractId.get(contract.id)?.project || null,
    propertyObject: companyByContractId.get(contract.id)?.propertyObject || null,
    housingCompanyId: companyByContractId.get(contract.id)?.housingCompanyId || null,
    housingCompany: companyByContractId.get(contract.id)?.housingCompany || null,
    ownerId: companyByContractId.get(contract.id)?.housingCompanyId || null,
    owner: companyByContractId.get(contract.id)?.housingCompany || null,
    country: companyByContractId.get(contract.id)?.propertyObject?.country || null,
    city: companyByContractId.get(contract.id)?.propertyObject?.city || null,
    postalCode: companyByContractId.get(contract.id)?.propertyObject?.postalCode || null,
    address1: companyByContractId.get(contract.id)?.propertyObject?.address1 || null,
    address2: companyByContractId.get(contract.id)?.propertyObject?.address2 || null,
  }));
}

export function serializeKitchenForLegacy(kitchen) {
  const items = kitchen.items || [];
  const toClientItem = (item) => ({
    id: item.id,
    code: item.code,
    articleNumber: item.articleNumber || "",
    name: item.name,
    price: Number(item.price),
    infoText: item.infoText || "",
    productInfoPdfPath: item.productInfoPdfPath || "",
    productInfoSummary: item.productInfoSummary || "",
    productInfoKeyFacts: Array.isArray(item.productInfoKeyFacts) ? item.productInfoKeyFacts : [],
    productInfoExtractedText: item.productInfoExtractedText || "",
    productInfoUpdatedAt: item.productInfoUpdatedAt instanceof Date ? item.productInfoUpdatedAt.toISOString() : "",
    iconKey: item.iconKey || "",
    colorKey: item.colorKey || "",
    componentKey: item.componentKey || "",
    isLocked: item.isLocked,
    itemType: item.itemType.toLowerCase(),
  });

  return {
    kitchen: {
      id: kitchen.id,
      slug: kitchen.slug,
      name: kitchen.name,
      description: kitchen.description || "",
    },
    components: items.filter((item) => item.itemType === ItemType.COMPONENT).map(toClientItem),
    accessories: items.filter((item) => item.itemType === ItemType.ACCESSORY).map(toClientItem),
    services: items.filter((item) => item.itemType === ItemType.SERVICE).map(toClientItem),
    lockedBaseColors: LOCKED_BASE_COLORS,
    montageRequiredCodes: MONTAGE_REQUIRED_CODES,
  };
}

function buildOrderAdminSearch(query) {
  const contains = { contains: query, mode: "insensitive" };

  return [
    { orderNumber: contains },
    { firstName: contains },
    { lastName: contains },
    { email: contains },
    { city: contains },
    { postalCode: contains },
    { country: contains },
    { address1: contains },
    { address2: contains },
    {
      kitchen: {
        name: contains,
      },
    },
    {
      kitchenContract: {
        is: {
          OR: [
            { contractNumber: contains },
            {
              project: {
                is: {
                  OR: [
                    { name: contains },
                    { projectCode: contains },
                    { status: contains },
                    { description: contains },
                    { managerName: contains },
                    {
                      propertyObject: {
                        is: {
                          OR: [
                            { name: contains },
                            { city: contains },
                            { country: contains },
                            { postalCode: contains },
                            { address1: contains },
                            { address2: contains },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  ];
}

export async function getOrdersForAdmin(filters = {}) {
  const where = {};

  if (filters.kitchenId) where.kitchenId = filters.kitchenId;
  if (filters.status && Object.values(OrderStatus).includes(filters.status)) where.status = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const query = String(filters.q || "").trim();
  if (query) {
    where.OR = buildOrderAdminSearch(query);
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      kitchen: true,
      kitchenContract: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return addContractOrderSequence(await attachHousingCompaniesToOrderContracts(orders));
}

export async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      kitchen: true,
      kitchenContract: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;
  const [sequencedOrder] = await addContractOrderSequence(await attachHousingCompaniesToOrderContracts([order]));
  return sequencedOrder;
}

async function attachHousingCompaniesToOrderContracts(orders) {
  const contracts = orders.map((order) => order.kitchenContract).filter(Boolean);
  const hydratedContracts = await attachHousingCompaniesToContracts(contracts);
  const contractById = new Map(hydratedContracts.map((contract) => [contract.id, contract]));

  return orders.map((order) => ({
    ...order,
    kitchenContract: order.kitchenContractId ? contractById.get(order.kitchenContractId) || order.kitchenContract : order.kitchenContract,
  }));
}

async function addContractOrderSequence(orders) {
  const contractIds = [...new Set(orders.map((order) => order.kitchenContractId).filter(Boolean))];
  if (!contractIds.length) {
    return orders.map((order) => ({
      ...order,
      contractOrderSequence: null,
      contractOrderCount: null,
    }));
  }

  const allContractOrders = await prisma.order.findMany({
    where: {
      kitchenContractId: { in: contractIds },
    },
    select: {
      id: true,
      kitchenContractId: true,
      createdAt: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const sequenceByOrderId = new Map();
  const countByContractId = new Map();

  allContractOrders.forEach((order) => {
    const nextSequence = (countByContractId.get(order.kitchenContractId) || 0) + 1;
    countByContractId.set(order.kitchenContractId, nextSequence);
    sequenceByOrderId.set(order.id, nextSequence);
  });

  return orders.map((order) => ({
    ...order,
    contractOrderSequence: order.kitchenContractId ? sequenceByOrderId.get(order.id) || 1 : null,
    contractOrderCount: order.kitchenContractId ? countByContractId.get(order.kitchenContractId) || 1 : null,
  }));
}
