import Link from "next/link";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [kitchens, orders] = await Promise.all([listKitchensForAdmin(), getOrdersForAdmin()]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <MetricCard label="Kitchens" value={kitchens.length} />
        <MetricCard label="Orders" value={orders.length} />
        <MetricCard label="New orders" value={orders.filter((order) => order.status === "NEW").length} />
        <MetricCard label="Emailed" value={orders.filter((order) => order.status === "EMAILED").length} />
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          <Link href="/admin/orders">View all</Link>
        </div>
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
                  <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                </td>
                <td style={tdStyle}>{order.kitchen.name}</td>
                <td style={tdStyle}>{`${order.firstName} ${order.lastName}`}</td>
                <td style={tdStyle}>{order.status}</td>
                <td style={tdStyle}>{Number(order.totalPrice).toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: "#fffdf9", border: "1px solid #e5d5c5", borderRadius: 16, padding: 18 }}>
      <div style={{ color: "#7b7268", marginBottom: 8 }}>{label}</div>
      <strong style={{ fontSize: "2rem" }}>{value}</strong>
    </div>
  );
}

const panelStyle = {
  background: "#fffdf9",
  border: "1px solid #e5d5c5",
  borderRadius: 16,
  padding: 20,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 16,
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #e9ddd1",
  padding: "10px 8px",
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #f0e7dd",
};
