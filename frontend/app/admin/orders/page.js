import Link from "next/link";
import {
  AdminSection,
  StatusBadge,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { getOrdersForAdmin } from "../../../lib/catalog";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminOrdersPage() {
  const admin = await requireAdminPage();
  const orders = await getOrdersForAdmin();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title="Orders"
          description="Saved orders from the public configurator. This page is read-only for now, but it gives you the core operational view."
        >
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Order</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Kitchen</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={6}>No orders found.</td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} style={orderRowStyle}>
                    <td style={tdStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                    </td>
                    <td style={tdStyle}>
                      <div>{order.firstName} {order.lastName}</div>
                      <div style={{ color: "var(--app-text-muted)", marginTop: 6 }}>{order.email}</div>
                    </td>
                    <td style={tdStyle}>{order.kitchen.name}</td>
                    <td style={tdStyle}><StatusBadge status={order.status} /></td>
                    <td style={tdStyle}>{formatCurrency(order.totalPrice)}</td>
                    <td style={tdStyle}>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
};

const orderRowStyle = {
  transition: "background 160ms ease",
};
