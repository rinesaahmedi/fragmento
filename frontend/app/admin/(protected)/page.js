import Link from "next/link";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../lib/catalog";
import {
  AdminSection,
  MetricCard,
  PageHero,
  StatusBadge,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [kitchens, orders] = await Promise.all([listKitchensForAdmin(), getOrdersForAdmin()]);

  return (
    <div style={pageGridStyle}>
      <PageHero
        eyebrow="Overview"
        title="Admin dashboard"
        description="Track catalog readiness and recent customer activity from one place."
        stats={[
          <MetricCard key="kitchens" label="Kitchens" value={String(kitchens.length)} />,
          <MetricCard key="orders" label="Orders" value={String(orders.length)} />,
          <MetricCard key="new" label="New orders" value={String(orders.filter((order) => order.status === "NEW").length)} />,
          <MetricCard key="emailed" label="Emailed" value={String(orders.filter((order) => order.status === "EMAILED").length)} />,
        ]}
      />

      <AdminSection
        title="Recent orders"
        description="Latest customer activity across all kitchens."
        actions={[
          <Link key="view-all" href="/admin/orders" style={{ textDecoration: "none", color: "#8c5523", fontWeight: 800 }}>
            View all orders
          </Link>,
        ]}
      >
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Order</th>
                <th style={thStyle}>Kitchen</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: "none", color: "#8c5523", fontWeight: 800 }}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td style={tdStyle}>{order.kitchen.name}</td>
                  <td style={tdStyle}>{`${order.firstName} ${order.lastName}`}</td>
                  <td style={tdStyle}><StatusBadge status={order.status} /></td>
                  <td style={tdStyle}>{Number(order.totalPrice).toFixed(2)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
