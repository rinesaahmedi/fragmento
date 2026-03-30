import Link from "next/link";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const admin = await requireAdminPage();

  return (
    <div style={{ minHeight: "100vh", background: "#f7f2eb", color: "#2f2a24", fontFamily: "Manrope, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          borderBottom: "1px solid #e5d5c5",
          background: "#fffdf9",
        }}
      >
        <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/kitchens">Kitchens</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/">Public site</Link>
        </nav>
        <form action="/api/admin/logout" method="post" style={{ margin: 0 }}>
          <span style={{ marginRight: 12, color: "#6e655d" }}>{admin.email}</span>
          <button type="submit">Logout</button>
        </form>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
