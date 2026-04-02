import Link from "next/link";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/kitchens", label: "Kitchens" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/", label: "Public site" },
];

export default async function AdminProtectedLayout({ children }) {
  const admin = await requireAdminPage();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(222, 187, 145, 0.3), transparent 28%), linear-gradient(180deg, #f6efe5 0%, #f8f2ea 32%, #fcfaf6 100%)",
        color: "#261a13",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(16px)",
          background: "rgba(251, 247, 241, 0.82)",
          borderBottom: "1px solid rgba(120, 84, 45, 0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "7px 12px",
                borderRadius: 999,
                background: "#f1dfcd",
                color: "#805126",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Fragmento Admin
            </span>
            <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#533621",
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.72)",
                    border: "1px solid rgba(120, 84, 45, 0.1)",
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 14px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(120, 84, 45, 0.12)",
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 12, color: "#8a7159", textTransform: "uppercase", letterSpacing: "0.08em" }}>Signed in</span>
              <strong style={{ fontSize: 14 }}>{admin.email}</strong>
            </div>
            <form action="/api/admin/logout" method="post" style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "10px 14px",
                  background: "#8e5727",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "30px 24px 40px" }}>{children}</main>
    </div>
  );
}
