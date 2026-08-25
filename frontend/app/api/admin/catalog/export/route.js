import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { DEFAULT_KITCHEN_PROGRAMM_ID } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatBoolean(value) {
  return value ? "Yes" : "No";
}

function formatDimensionPart(value) {
  if (value === null || value === undefined || value === "") return "";
  const cm = Number(value) / 10;
  if (!Number.isFinite(cm) || cm <= 0) return "";
  return Number.isInteger(cm)
    ? String(cm)
    : String(Number(cm.toFixed(2))).replace(/\.0+$/, "");
}

function formatDimensions(row) {
  const parts = [
    formatDimensionPart(row.widthMm),
    formatDimensionPart(row.heightMm),
    formatDimensionPart(row.depthMm),
  ].filter(Boolean);
  return parts.length ? `${parts.join(" x ")} cm` : "";
}

function appendSheet(workbook, sheetName, rows, widths) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = widths.map((width) => ({ wch: width }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: Math.max((rows[0]?.length || 1) - 1, 0) },
    }),
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

export async function GET(request) {
  await requireAdminApi();
  const programmId = new URL(request.url).searchParams.get("programmId")?.trim() || DEFAULT_KITCHEN_PROGRAMM_ID;

  const [articles, blenden, services] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        ca."articleNumber",
        ca."name",
        ca."nameDe",
        ca."description",
        ca."widthMm",
        ca."heightMm",
        ca."depthMm",
        capp."price",
        ca."itemType",
        ca."isFixedPricePackage",
        capp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogArticle" ca
      INNER JOIN "CatalogArticleProgramPrice" capp
        ON capp."catalogArticleId" = ca."id"
        AND capp."programmId" = ${programmId}
      LEFT JOIN "KitchenItem" ki ON ki."catalogArticleId" = ca."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND linked_kitchen."programmId" = ${programmId}
        )
      GROUP BY ca."id", capp."price", capp."isActive"
      ORDER BY ca."itemType" ASC, ca."articleNumber" ASC
    `,
    prisma.$queryRaw`
      SELECT
        cb."code",
        cb."name",
        cb."nameDe",
        cb."description",
        cbp."price",
        cbp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogBlende" cb
      INNER JOIN "CatalogBlendeProgramPrice" cbp
        ON cbp."catalogBlendeId" = cb."id"
        AND cbp."programmId" = ${programmId}
      LEFT JOIN "KitchenItem" ki ON ki."catalogBlendeId" = cb."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND linked_kitchen."programmId" = ${programmId}
        )
      GROUP BY cb."id", cbp."price", cbp."isActive"
      ORDER BY cb."code" ASC
    `,
    prisma.$queryRaw`
      SELECT
        cs."code",
        cs."name",
        cs."nameDe",
        cs."description",
        csp."price",
        csp."isActive",
        COUNT(ki."id")::int AS "linkedKitchenItems"
      FROM "CatalogService" cs
      INNER JOIN "CatalogServiceProgramPrice" csp
        ON csp."catalogServiceId" = cs."id"
        AND csp."programmId" = ${programmId}
      LEFT JOIN "KitchenItem" ki ON ki."catalogServiceId" = cs."id"
        AND EXISTS (
          SELECT 1 FROM "Kitchen" linked_kitchen
          WHERE linked_kitchen."id" = ki."kitchenId"
            AND linked_kitchen."programmId" = ${programmId}
        )
      GROUP BY cs."id", csp."price", csp."isActive"
      ORDER BY cs."code" ASC
    `,
  ]);

  const workbook = XLSX.utils.book_new();

  appendSheet(
    workbook,
    "Articles",
    [
      ["Article number", "Name", "German name", "Description", "Width cm", "Height cm", "Depth cm", "Dimensions W x H x D", "Item type", "Price", "Fixed package", "Active", "Linked KitchenItems"],
      ...articles.map((article) => [
        article.articleNumber,
        article.name,
        article.nameDe || "",
        article.description || "",
        formatDimensionPart(article.widthMm),
        formatDimensionPart(article.heightMm),
        formatDimensionPart(article.depthMm),
        formatDimensions(article),
        article.itemType,
        formatMoney(article.price),
        formatBoolean(article.isFixedPricePackage),
        formatBoolean(article.isActive),
        article.linkedKitchenItems,
      ]),
    ],
    [26, 36, 36, 42, 12, 12, 12, 24, 16, 12, 16, 12, 20],
  );

  appendSheet(
    workbook,
    "Blenden",
    [
      ["Code", "Name", "German name", "Description", "Price", "Active", "Linked KitchenItems"],
      ...blenden.map((blende) => [
        blende.code,
        blende.name,
        blende.nameDe || "",
        blende.description || "",
        formatMoney(blende.price),
        formatBoolean(blende.isActive),
        blende.linkedKitchenItems,
      ]),
    ],
    [18, 32, 32, 42, 12, 12, 20],
  );

  appendSheet(
    workbook,
    "Services",
    [
      ["Code", "Name", "German name", "Description", "Price", "Active", "Linked KitchenItems"],
      ...services.map((service) => [
        service.code,
        service.name,
        service.nameDe || "",
        service.description || "",
        formatMoney(service.price),
        formatBoolean(service.isActive),
        service.linkedKitchenItems,
      ]),
    ],
    [18, 44, 44, 42, 12, 12, 20],
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fragmento-catalog-${programmId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
