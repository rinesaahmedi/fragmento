import { OrderStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { getOrderById } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }) {
  const order = await getOrderById(params.id);
  if (!order) notFound();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>{order.orderNumber}</h1>
        <p style={{ margin: "8px 0" }}>{order.kitchen.name}</p>
        <p style={{ margin: "8px 0" }}>{`${order.firstName} ${order.lastName}`}</p>
        <p style={{ margin: "8px 0" }}>{order.email}</p>
        <p style={{ margin: "8px 0" }}>{`${order.address1}${order.address2 ? `, ${order.address2}` : ""}, ${order.postalCode} ${order.city}`}</p>
        <form action={`/api/admin/orders/${order.id}`} method="post" style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
          <input type="hidden" name="_intent" value="status" />
          <select name="status" defaultValue={order.status}>
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="submit">Update status</button>
        </form>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Items</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.itemType}</td>
                <td style={tdStyle}>{item.code}</td>
                <td style={tdStyle}>{item.nameSnapshot}</td>
                <td style={tdStyle}>{Number(item.priceSnapshot).toFixed(2)} EUR</td>
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
