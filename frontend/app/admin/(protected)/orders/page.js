import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../../lib/catalog";
import {
  AdminSection,
  FormField,
  MetricCard,
  PageHero,
  StatusBadge,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    kitchenId: resolvedSearchParams.kitchenId || "",
    status: resolvedSearchParams.status || "",
    dateFrom: resolvedSearchParams.dateFrom || "",
    dateTo: resolvedSearchParams.dateTo || "",
  };

  const [kitchens, orders] = await Promise.all([listKitchensForAdmin(), getOrdersForAdmin(filters)]);

  return (
    <div style={pageGridStyle}>
      <PageHero
        eyebrow="Orders"
        title="Order management"
        description="Filter incoming orders, review customer details, and move each request through the fulfillment flow."
        stats={[
          <MetricCard key="all" label="All orders" value={String(orders.length)} />,
          <MetricCard key="new" label="New" value={String(orders.filter((order) => order.status === "NEW").length)} />,
          <MetricCard key="emailed" label="Emailed" value={String(orders.filter((order) => order.status === "EMAILED").length)} />,
          <MetricCard key="confirmed" label="Confirmed" value={String(orders.filter((order) => order.status === "CONFIRMED").length)} />,
          <MetricCard key="cancelled" label="Cancelled" value={String(orders.filter((order) => order.status === "CANCELLED").length)} />,
        ]}
      />

      <AdminSection title="Filters" description="Narrow the order list before opening individual records.">
        <form method="get" style={formGridStyle}>
          <FormField label="Kitchen">
            <select name="kitchenId" defaultValue={filters.kitchenId} style={inputStyle}>
              <option value="">All kitchens</option>
              {kitchens.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>
                  {kitchen.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select name="status" defaultValue={filters.status} style={inputStyle}>
              <option value="">All statuses</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Date from">
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} style={inputStyle} />
          </FormField>
          <FormField label="Date to">
            <input type="date" name="dateTo" defaultValue={filters.dateTo} style={inputStyle} />
          </FormField>
          <button type="submit" style={primaryButtonStyle}>Apply filters</button>
        </form>
      </AdminSection>

      <AdminSection title="Orders" description={`${orders.length} matching record(s).`}>
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Kitchen</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: "none", color: "var(--app-accent)", fontWeight: 700 }}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td style={tdStyle}>{order.kitchen.name}</td>
                  <td style={tdStyle}>{`${order.firstName} ${order.lastName}`}</td>
                  <td style={tdStyle}><StatusBadge status={order.status} /></td>
                  <td style={tdStyle}>{new Date(order.createdAt).toLocaleString("de-DE")}</td>
                  <td style={tdStyle}>{Number(order.totalPrice).toFixed(2)} EUR</td>
                  <td style={tdStyle}>
                    <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: "none", color: "var(--app-accent)", fontWeight: 700 }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
