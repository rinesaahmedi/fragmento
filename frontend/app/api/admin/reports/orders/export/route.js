import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  getOrderReportExportRows,
  loadOrderReportData,
  normalizeOrderReportFilters,
} from "../../../../../../lib/admin-order-reports";
import { requireAdminApi } from "../../../../../../lib/auth";
import { loadPublicVisitReportData } from "../../../../../../lib/public-visit-reports";

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function appendSheet(workbook, sheetName, rows, widths, autoFilterStartRow = 0) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const headerWidth = rows[autoFilterStartRow]?.length || rows[0]?.length || 1;
  worksheet["!cols"] = widths.map((width) => ({ wch: width }));
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: autoFilterStartRow, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: Math.max(headerWidth - 1, 0) },
    }),
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function getFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fragmento-order-report-${stamp}.xlsx`;
}

export async function GET(request) {
  await requireAdminApi();

  const filters = normalizeOrderReportFilters(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const [{ orders, summary }, visitReport] = await Promise.all([
    loadOrderReportData(filters),
    loadPublicVisitReportData(filters),
  ]);
  const { summary: visitSummary } = visitReport;
  const orderRows = getOrderReportExportRows(orders);
  const workbook = XLSX.utils.book_new();

  appendSheet(
    workbook,
    "Report",
    [
      ["Site visits", ""],
      ["Date from", filters.dateFrom || "All"],
      ["Date to", filters.dateTo || "All"],
      ["Status", filters.status || "All"],
      ["Estimated daily visitors", visitSummary.uniqueVisitors],
      ["Opened site", visitSummary.opened],
      ["Entered contract", visitSummary.submitted],
      ["Worked", visitSummary.accepted],
      ["Test", visitSummary.testAccepted],
      ["Did not work", visitSummary.rejected],
      ["Success rate", formatPercent(visitSummary.successRate)],
      [],
      ["Order summary", ""],
      ["Total orders", summary.totalOrders],
      ["Done orders", summary.doneOrders],
      ["Not done / unpaid orders", summary.notDoneUnpaidOrders],
      ["Net without VAT", formatMoney(summary.confirmedNet)],
      ["VAT total (19%)", formatMoney(summary.confirmedVat)],
      ["Total with VAT", formatMoney(summary.confirmedGross)],
      [],
      [
        "Order number",
        "Created at",
        "Status",
        "Payment status",
        "Customer",
        "Email",
        "Contract number",
        "City",
        "Country",
        "Item count",
        "Gross",
        "Net without VAT",
        "VAT (19%)",
      ],
      ...orderRows.map((row) => [
        row.orderNumber,
        formatDateTime(row.createdAt),
        row.status,
        row.paymentStatus,
        row.customer,
        row.email,
        row.contractNumber,
        row.city,
        row.country,
        row.itemCount,
        formatMoney(row.gross),
        formatMoney(row.net),
        formatMoney(row.vat),
      ]),
    ],
    [18, 26, 14, 16, 26, 34, 20, 18, 16, 12, 14, 16, 14],
    20,
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = getFilename();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
