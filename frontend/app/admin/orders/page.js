import Link from "next/link";
import {
  AdminSection,
  StatusBadge,
  cardListStyle,
  itemCardStyle,
  pageGridStyle,
  subMetaStyle,
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

function formatArticleCodes(items = []) {
  const codes = [...new Set(items.map((item) => item.code).filter(Boolean))];
  return codes.length ? codes.join(", ") : "No article codes";
}

function formatOrdinal(value) {
  const number = Number(value || 0);
  if (!number) return "";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function getContractOrderLabel(order) {
  if (!order.contractOrderSequence) return "";
  return `${formatOrdinal(order.contractOrderSequence)} order for contract`;
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
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Order</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Kitchen</th>
                  <th style={thStyle}>Article Codes</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Created</th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}>No orders found.</td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} style={orderRowStyle}>
                    <td style={tdStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                      {order.contractOrderSequence ? (
                        <div style={contractSequenceStyle}>{getContractOrderLabel(order)}</div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      <div>{order.firstName} {order.lastName}</div>
                      <div style={{ color: "var(--app-text-muted)", marginTop: 6 }}>{order.email}</div>
                    </td>
                    <td style={tdStyle}>{order.kitchen.name}</td>
                    <td style={tdStyle}>
                      <span style={articleCodesStyle}>{formatArticleCodes(order.items)}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge status={order.status} /></td>
                    <td style={tdStyle}>{formatCurrency(order.totalPrice)}</td>
                    <td style={tdStyle}>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!orders.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}>No orders found.</p> : null}
            {orders.map((order) => (
              <article key={order.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong style={{ fontSize: "1.05rem" }}>{order.orderNumber}</strong>
                      </Link>
                      {order.contractOrderSequence ? (
                        <span style={contractSequenceStyle}>{getContractOrderLabel(order)}</span>
                      ) : null}
                      <div style={subMetaStyle}>
                        <span>{order.firstName} {order.lastName}</span>
                        <span>{order.kitchen.name}</span>
                      </div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={subMetaStyle}>
                    <span>{order.email}</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div style={articleCodesStyle}>{formatArticleCodes(order.items)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{formatCurrency(order.totalPrice)}</strong>
                    <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                      Open details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <style>{`
            .admin-list-cards {
              display: none;
            }

            @media (max-width: 760px) {
              .admin-list-table {
                display: none;
              }

              .admin-list-cards {
                display: grid;
              }
            }
          `}</style>
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

const articleCodesStyle = {
  color: "var(--app-text)",
  fontSize: 13,
  lineHeight: 1.5,
  overflowWrap: "anywhere",
};

const contractSequenceStyle = {
  display: "inline-flex",
  width: "fit-content",
  marginTop: 8,
  padding: "6px 9px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--app-info-bg), rgba(255,255,255,0.78))",
  color: "var(--app-info-text)",
  border: "1px solid rgba(45, 108, 121, 0.14)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
};
