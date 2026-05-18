"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminI18nProvider, AdminLanguageSwitcher, AdminText, useAdminI18n } from "./admin-i18n";

const navItems = [
  { href: "/admin", labelKey: "adminShellLogin.dashboard", fallback: "Dashboard", icon: GridIcon },
  { href: "/admin/kitchens", labelKey: "adminShellLogin.kitchens", fallback: "Kitchens", icon: KitchenIcon },
  { href: "/admin/contracts", labelKey: "adminShellLogin.contracts", fallback: "Contracts", icon: ContractsIcon },
  { href: "/admin/property-owners", labelKey: "adminShellLogin.owners", fallback: "Owners", icon: OwnersIcon },
  { href: "/admin/orders", labelKey: "adminShellLogin.orders", fallback: "Orders", icon: OrdersIcon },
  { href: "/admin/claims", labelKey: "adminShellLogin.claims", fallback: "Claims", icon: ClaimsIcon },
  { href: "/admin/account", labelKey: "adminShellLogin.account", fallback: "Account", icon: AccountIcon },
  { href: "/", labelKey: "adminShellLogin.publicSite", fallback: "Public site", icon: GlobeIcon },
];
const DESKTOP_SIDEBAR_WIDTH = "clamp(240px, 18vw, 300px)";

export function AdminShellClient({ adminEmail, initialLanguage = "en", children }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <AdminI18nProvider initialLanguage={initialLanguage}>
      <AdminShellContent adminEmail={adminEmail}>{children}</AdminShellContent>
    </AdminI18nProvider>
  );
}

function AdminShellContent({ adminEmail, children }) {
  const pathname = usePathname();
  const { translate } = useAdminI18n();

  return (
    <div
      className="admin-shell"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
        overflowY: "visible",
        isolation: "isolate",
        background: "var(--app-bg)",
        color: "var(--app-text)",
        fontFamily: "Manrope, sans-serif",
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
            background: "radial-gradient(circle, rgba(232, 222, 212, 0.55) 0%, rgba(232, 222, 212, 0.18) 34%, transparent 68%)",
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
            background: "radial-gradient(circle, rgba(139, 113, 92, 0.16) 0%, rgba(139, 113, 92, 0.05) 34%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <div
        className="admin-shell__layout"
        style={{
          width: "100%",
          margin: 0,
          padding: "0 0 40px 0",
          position: "relative",
        }}
      >
        <nav
          aria-label={translate("adminShellLogin.mobileAdminNavigation", "Mobile admin navigation")}
          className="admin-shell__mobile-nav"
          style={{
            display: "none",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={`mobile-${item.href}`}
                href={item.href}
                prefetch={false}
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 52,
                  padding: "10px 14px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                  background: active
                    ? "var(--color-primary-soft)"
                    : "var(--color-card)",
                  color: active ? "var(--app-accent)" : "var(--app-text)",
                  border: `1px solid ${active ? "var(--app-border-strong)" : "var(--app-border)"}`,
                  fontWeight: active ? 700 : 600,
                  boxShadow: active ? "0 10px 22px rgba(84, 59, 40, 0.08)" : "var(--app-shadow-soft)",
                  flex: "0 0 auto",
                  boxSizing: "border-box",
                }}
              >
                <Icon active={active} />
                <span>{translate(item.labelKey, item.fallback)}</span>
              </Link>
            );
          })}
        </nav>

        <aside
          className="admin-shell__sidebar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: DESKTOP_SIDEBAR_WIDTH,
            display: "grid",
            gridTemplateRows: "auto auto 1fr auto",
            gap: 18,
            alignContent: "start",
            height: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "0 20px 20px",
            background: "var(--color-sidebar-bg)",
            borderRight: "1px solid var(--color-border)",
            zIndex: 30,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              padding: "24px 8px 6px",
            }}
          >
            <img
              src="/img/fragmentologo-cropped.png"
              alt="Fragmento"
              style={{
                display: "block",
                width: "100%",
                maxWidth: 220,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <section
            style={{
              padding: "10px 8px 4px",
              display: "grid",
              gap: 4,
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
              <AdminText i18nKey="adminShellLogin.adminWorkspace" fallback="Admin workspace" />
            </span>
          </section>

          <nav
            aria-label={translate("adminShellLogin.sidebar", "Sidebar")}
            style={{
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "stretch",
              alignSelf: "start",
            }}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    minHeight: 56,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: active
                      ? "var(--color-primary-soft)"
                      : "transparent",
                    color: active ? "var(--app-accent)" : "var(--app-text)",
                    border: `1px solid ${active ? "var(--app-border-strong)" : "transparent"}`,
                    fontWeight: active ? 700 : 600,
                    boxShadow: active ? "0 10px 22px rgba(84, 59, 40, 0.08)" : "none",
                    boxSizing: "border-box",
                  }}
                >
                  <Icon active={active} />
                  <span style={sidebarLabelStyle}>{translate(item.labelKey, item.fallback)}</span>
                </Link>
              );
            })}
          </nav>

          <div
            className="admin-shell__primex-badge"
            style={{
              display: "grid",
              gap: 8,
              justifyItems: "center",
              justifySelf: "center",
              alignSelf: "end",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--app-text-muted)",
                lineHeight: 1,
              }}
            >
              <AdminText i18nKey="adminShellLogin.poweredBy" fallback="Powered by" />
            </span>
            <img
              src="/primex-agentic-logo.png"
              alt="Primex Agentic AI"
              style={{
                display: "block",
                width: 96,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </aside>

        <div
          className="admin-shell__main-column"
          style={{
            minWidth: 0,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            marginLeft: DESKTOP_SIDEBAR_WIDTH,
            minHeight: "100vh",
          }}
        >
          <header
            className="admin-shell__topbar"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px clamp(20px, 3vw, 40px) 0",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 16,
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
                <AdminLanguageSwitcher />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "var(--app-text-muted)",
                      lineHeight: 1.4,
                      fontWeight: 600,
                    }}
                  >
                    {adminEmail}
                  </span>
                  <Link href="/admin/account" style={topbarLinkStyle}>
                    <AdminText i18nKey="adminShellLogin.account" fallback="Account" />
                  </Link>
                  <form action="/api/admin/logout" method="post" style={{ margin: 0 }}>
                  <button
                    type="submit"
                    style={{
                      border: "1px solid var(--app-border-strong)",
                      borderRadius: 8,
                      padding: "11px 18px",
                      background: "var(--color-card)",
                      color: "var(--app-text)",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "var(--app-shadow-soft)",
                    }}
                  >
                    <AdminText i18nKey="adminShellLogin.logout" fallback="Logout" />
                  </button>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <main
            className="admin-shell__content"
            style={{
              minWidth: 0,
              padding: "28px clamp(20px, 3vw, 40px) 0 clamp(20px, 2.5vw, 36px)",
            }}
          >
            {children}
          </main>
        </div>

        <style>{`
          @media (max-width: 960px) {
            .admin-shell__mobile-nav {
              display: flex !important;
            }

            .admin-shell__sidebar {
              display: none !important;
            }

            .admin-shell__main-column {
              margin-left: 0 !important;
            }

            .admin-shell__primex-badge {
              order: 3;
            }
          }

          @media (max-width: 640px) {
            .admin-shell__layout {
              padding-bottom: 28px !important;
              gap: 16px !important;
            }

            .admin-shell__content {
              padding: 20px 16px 0 !important;
            }

            .admin-shell__primex-badge {
              width: 100%;
              justify-items: start;
            }
          }
        `}</style>
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
          ? "var(--color-primary-soft)"
          : "rgba(255,255,255,0.78)",
        color: active ? "var(--app-accent)" : "var(--app-text-muted)",
        border: `1px solid ${active ? "rgba(107,79,58,0.16)" : "rgba(107,79,58,0.08)"}`,
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

function ClaimsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 2.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 2.5H10V4H6V2.5Z" fill="currentColor" />
        <rect x="3" y="3.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 9.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function ContractsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 5.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 8H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 10.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function OwnersIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 13C2.9 10.8 4.1 9.5 6 9.5C7.9 9.5 9.1 10.8 9.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 6.5C11.8807 6.5 13 7.61929 13 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function AccountIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 13C3.5 10.5 5.1 9.25 8 9.25C10.9 9.25 12.5 10.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

const topbarLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  padding: "11px 16px",
  background: "var(--color-card)",
  color: "var(--app-text)",
  fontWeight: 700,
  border: "1px solid var(--app-border-strong)",
  boxShadow: "var(--app-shadow-soft)",
};

const sidebarLabelStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
