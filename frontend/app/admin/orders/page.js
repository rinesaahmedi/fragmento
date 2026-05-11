import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  StatusBadge,
  cardListStyle,
  dangerButtonStyle,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  primaryButtonStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
import { getOrdersForAdmin, listKitchensForAdmin } from "../../../lib/catalog";
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

function getOrderContractLabel(order) {
  const contractNumber = String(order?.contractNumber || order?.kitchenContract?.contractNumber || "").trim();
  return contractNumber ? `Contract ${contractNumber}` : "";
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
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
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId).trim(),
    status: normalizeParam(resolvedSearchParams.status).trim(),
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const [orders, kitchens] = await Promise.all([
    getOrdersForAdmin(filters),
    listKitchensForAdmin(),
  ]);
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="ordersAdmin.orders" fallback="Orders" />}
          description={<>{orders.length} <AdminText i18nKey="ordersAdmin.ordersMatchCurrentFilters" fallback="order(s) match the current filters." /></>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/admin/orders" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
              <span style={filterHintStyle}><AdminText i18nKey="ordersAdmin.filterOrdersByCustomerContractAddressAndDate" fallback="Filter orders by customer, contract, address, kitchen, status, or date." /></span>
            </div>
            <div style={filterGridStyle}>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.search" fallback="Search" /></span>
                <input
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Order, customer, city, contract..."
                  style={filterInputStyle}
                />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></span>
                <select name="kitchenId" defaultValue={filters.kitchenId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
                  {kitchens.map((kitchen) => (
                    <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                  ))}
                </select>
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="dashboard.status" fallback="Status" /></span>
                <select name="status" defaultValue={filters.status} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
                  <option value="NEW"><AdminText i18nKey="dashboard.statusNew" fallback="New" /></option>
                  <option value="EMAILED"><AdminText i18nKey="dashboard.statusEmailed" fallback="Emailed" /></option>
                  <option value="CONFIRMED"><AdminText i18nKey="dashboard.statusConfirmed" fallback="Confirmed" /></option>
                  <option value="CANCELLED"><AdminText i18nKey="dashboard.statusCancelled" fallback="Cancelled" /></option>
                </select>
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
                <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
                <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
              </label>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href="/admin/orders" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

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
                  <th style={thStyle}><AdminText i18nKey="contractAddressFields.city" fallback="City" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.created" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!orders.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={9}><AdminText i18nKey="ordersAdmin.noOrdersFound" fallback="No orders found." /></td>
                  </tr>
                ) : null}
                {orders.map((order) => (
                  <tr key={order.id} style={orderRowStyle}>
                    <td style={tdStyle}>
                      <Link href={`/admin/orders/${order.id}`} style={orderLinkStyle}>
                        <strong>{order.orderNumber}</strong>
                      </Link>
                      {getOrderContractLabel(order) ? (
                        <div style={contractMetaStyle}>
                          <AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" />{" "}
                          <span style={{ fontWeight: 800 }}>{String(order.contractNumber || order.kitchenContract?.contractNumber || "").trim()}</span>
                        </div>
                      ) : null}
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
                    <td style={tdStyle}>{order.city || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</td>
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
                      {getOrderContractLabel(order) ? (
                        <span style={contractMetaStyle}>
                          <AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" />{" "}
                          <span style={{ fontWeight: 800 }}>{String(order.contractNumber || order.kitchenContract?.contractNumber || "").trim()}</span>
                        </span>
                      ) : null}
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
                    <span>{order.city || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
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

const contractMetaStyle = {
  marginTop: 6,
  color: "var(--app-text-muted)",
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

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
  marginBottom: 16,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};
