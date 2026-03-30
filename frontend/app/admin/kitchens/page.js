import Link from "next/link";
import { listKitchensForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminKitchensPage() {
  const kitchens = await listKitchensForAdmin();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>Create kitchen</h1>
        <form action="/api/admin/kitchens" method="post" style={formGridStyle}>
          <input name="name" placeholder="Kitchen name" required />
          <input name="slug" placeholder="kitchen-slug" required />
          <select name="status" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <textarea name="description" placeholder="Short description" rows={3} />
          <button type="submit">Create kitchen</button>
        </form>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Existing kitchens</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Items</th>
              <th style={thStyle}>Orders</th>
            </tr>
          </thead>
          <tbody>
            {kitchens.map((kitchen) => (
              <tr key={kitchen.id}>
                <td style={tdStyle}>
                  <Link href={`/admin/kitchens/${kitchen.id}`}>{kitchen.name}</Link>
                </td>
                <td style={tdStyle}>{kitchen.slug}</td>
                <td style={tdStyle}>{kitchen.status}</td>
                <td style={tdStyle}>{kitchen._count.items}</td>
                <td style={tdStyle}>{kitchen._count.orders}</td>
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

const formGridStyle = { display: "grid", gap: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { textAlign: "left", borderBottom: "1px solid #e9ddd1", padding: "10px 8px" };
const tdStyle = { borderBottom: "1px solid #f0e7dd", padding: "10px 8px" };
