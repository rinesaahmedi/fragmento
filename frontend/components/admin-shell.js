"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: GridIcon },
  { href: "/admin/kitchens", label: "Kitchens", icon: KitchenIcon },
  { href: "/admin/orders", label: "Orders", icon: OrdersIcon },
  { href: "/", label: "Public site", icon: GlobeIcon },
];

export function AdminShell({ adminEmail, children }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        background: "var(--app-bg)",
        color: "var(--app-text)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: "8%",
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 195, 132, 0.14) 0%, rgba(255, 195, 132, 0.06) 34%, transparent 68%)",
            filter: "blur(16px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 220,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(86, 181, 164, 0.12) 0%, rgba(86, 181, 164, 0.04) 34%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255, 251, 247, 0.72)",
          borderBottom: "1px solid var(--app-border)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 10px 26px rgba(120, 81, 50, 0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            position: "relative",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <strong
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "var(--app-accent)",
                textShadow: "0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              Fragmento Admin
            </strong>
            <span style={{ color: "var(--app-text-muted)", fontSize: 14 }}>
              Modern editorial operations for kitchens and orders.
            </span>
          </div>

          <form action="/api/admin/logout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                border: "1px solid var(--app-border-strong)",
                borderRadius: 14,
                padding: "11px 18px",
                background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,243,232,0.72))",
                color: "var(--app-text)",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "var(--app-shadow-soft)",
              }}
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "28px 24px 40px",
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
          position: "relative",
        }}
      >
        <aside
          style={{
            position: "sticky",
            top: 92,
            display: "grid",
            gap: 18,
          }}
        >
          <section
            style={{
              borderRadius: 18,
              padding: 20,
              background: "linear-gradient(165deg, rgba(255,255,255,0.9), rgba(255,242,230,0.8))",
              border: "1px solid var(--app-border)",
              display: "grid",
              gap: 6,
              boxShadow: "var(--app-shadow-soft)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--app-text-muted)",
              }}
            >
              Admin workspace
            </span>
            <strong
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              System Admin
            </strong>
            <span style={{ color: "var(--app-text-muted)", lineHeight: 1.6 }}>{adminEmail}</span>
          </section>

          <nav
            aria-label="Sidebar"
            style={{
              borderRadius: 18,
              padding: 12,
              background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,246,236,0.8))",
              border: "1px solid var(--app-border)",
              display: "grid",
              gap: 8,
              boxShadow: "var(--app-shadow-soft)",
            }}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: active
                      ? "linear-gradient(135deg, rgba(143,62,44,0.1), rgba(232,155,53,0.12))"
                      : "rgba(255,255,255,0.28)",
                    color: active ? "var(--app-accent)" : "var(--app-text)",
                    border: `1px solid ${active ? "var(--app-border-strong)" : "rgba(255,255,255,0.2)"}`,
                    fontWeight: active ? 700 : 600,
                    boxShadow: active ? "0 12px 24px rgba(143, 62, 44, 0.08)" : "none",
                  }}
                >
                  <Icon active={active} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main style={{ minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
}

function isActivePath(pathname, href) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  if (href === "/") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function IconFrame({ children, active = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        background: active
          ? "linear-gradient(135deg, rgba(143,62,44,0.1), rgba(232,155,53,0.14))"
          : "rgba(255,255,255,0.76)",
        color: active ? "var(--app-accent)" : "var(--app-text-muted)",
        border: `1px solid ${active ? "rgba(143,62,44,0.1)" : "rgba(172,111,70,0.12)"}`,
      }}
    >
      {children}
    </span>
  );
}

function GridIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="9.5" y="2" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="2" y="9.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
      </svg>
    </IconFrame>
  );
}

function KitchenIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 2.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 2.5C12.1569 2.5 13.5 3.84315 13.5 5.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 7.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function OrdersIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function GlobeIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 2.5C9.62484 4.08024 10.5476 6.24031 10.5625 8C10.5476 9.75969 9.62484 11.9198 8 13.5C6.37516 11.9198 5.45244 9.75969 5.4375 8C5.45244 6.24031 6.37516 4.08024 8 2.5Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </IconFrame>
  );
}
