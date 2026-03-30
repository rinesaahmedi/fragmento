import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }) {
  const filters = {
    kitchenId: searchParams?.kitchenId || "",
    status: searchParams?.status || "",
    dateFrom: searchParams?.dateFrom || "",
    dateTo: searchParams?.dateTo || "",
  };

  const [kitchens, orders] = await Promise.all([listKitchensForAdmin(), getOrdersForAdmin(filters)]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>Orders</h1>
        <form method="get" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <select name="kitchenId" defaultValue={filters.kitchenId}>
            <option value="">All kitchens</option>
            {kitchens.map((kitchen) => (
              <option key={kitchen.id} value={kitchen.id}>
                {kitchen.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status}>
            <option value="">All statuses</option>
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input type="date" name="dateFrom" defaultValue={filters.dateFrom} />
          <input type="date" name="dateTo" defaultValue={filters.dateTo} />
          <button type="submit">Apply filters</button>
        </form>
      </section>

      <section style={panelStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Order</th>
              <th style={thStyle}>Kitchen</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={tdStyle}>
                  <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                </td>
                <td style={tdStyle}>{order.kitchen.name}</td>
                <td style={tdStyle}>{`${order.firstName} ${order.lastName}`}</td>
                <td style={tdStyle}>{order.status}</td>
                <td style={tdStyle}>{new Date(order.createdAt).toLocaleString("de-DE")}</td>
                <td style={tdStyle}>{Number(order.totalPrice).toFixed(2)} EUR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const panelStyle = {
  background: "#fffdf9",
  border: "1px solid #e5d5c5",
  borderRadius: 16,
  padding: 20,
};

const thStyle = { textAlign: "left", borderBottom: "1px solid #e9ddd1", padding: "10px 8px" };
const tdStyle = { borderBottom: "1px solid #f0e7dd", padding: "10px 8px" };
