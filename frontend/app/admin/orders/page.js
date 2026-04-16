import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  StatusBadge,
  cardListStyle,
  dangerButtonStyle,
  itemCardStyle,
  pageGridStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
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
  return formatOrdinal(order.contractOrderSequence);
}

function DeleteOrderAction({ orderId, compact = false }) {
  return (
    <details style={compact ? cardDeleteDetailsStyle : tableDeleteDetailsStyle}>
      <summary style={deleteSummaryStyle}>
        <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
      </summary>
      <form action={`/api/admin/orders/${orderId}`} method="post" style={deleteFormStyle}>
        <button type="submit" name="_intent" value="delete" style={deleteButtonStyle}>
          <AdminText i18nKey="ordersAdmin.confirmDelete" fallback="Confirm delete" />
        </button>
      </form>
    </details>
  );
}

export default async function AdminOrdersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const orders = await getOrdersForAdmin();
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="ordersAdmin.orders" fallback="Orders" />}
          description={<><AdminText i18nKey="ordersAdmin.savedOrdersFromPublicConfigurator" fallback="Saved orders from the public configurator." /> <AdminText i18nKey="ordersAdmin.reviewOrdersAndDeleteEntriesWhenNeeded" fallback="Review orders and delete entries when needed." /></>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.kitchen" fallback="Kitchen" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.articleCodes" fallback="Article Codes" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.total" fallback="Total" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.created" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} style={orderRowStyle}>
                    <td style={tdStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                      {order.contractOrderSequence ? (
                        <div style={contractSequenceStyle}>{getContractOrderLabel(order)} <AdminText i18nKey="ordersAdmin.orderForContract" fallback="order for contract" /></div>
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
                    <td style={{ ...tdStyle, width: 148 }}>
                      <DeleteOrderAction orderId={order.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!orders.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></p> : null}
            {orders.map((order) => (
              <article key={order.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong style={{ fontSize: "1.05rem" }}>{order.orderNumber}</strong>
                      </Link>
                      {order.contractOrderSequence ? (
                        <span style={contractSequenceStyle}>{getContractOrderLabel(order)} <AdminText i18nKey="ordersAdmin.orderForContract" fallback="order for contract" /></span>
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
                    <div style={cardActionRowStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <AdminText i18nKey="ordersAdmin.openDetails" fallback="Open details" />
                      </Link>
                      <DeleteOrderAction orderId={order.id} compact />
                    </div>
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

const tableDeleteDetailsStyle = {
  display: "grid",
  gap: 8,
  justifyItems: "start",
};

const cardDeleteDetailsStyle = {
  display: "grid",
  gap: 8,
};

const deleteSummaryStyle = {
  color: "var(--app-danger-text)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const deleteFormStyle = {
  paddingTop: 8,
};

const deleteButtonStyle = {
  ...dangerButtonStyle,
  minHeight: 38,
};

const cardActionRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
