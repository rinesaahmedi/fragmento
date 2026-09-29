import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  pageGridStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { CancellationRequestPanel } from "../../../components/admin-order-cancellation-panel";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listCancellationRequestsForAdmin } from "../../../lib/order-cancellations";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

const STATUS_FILTERS = [
  { status: "RECEIVED", key: "orderCancellationsAdmin.filterOpen", fallback: "Open" },
  { status: "APPROVED", key: "orderCancellationsAdmin.filterApproved", fallback: "Approved" },
  { status: "REJECTED", key: "orderCancellationsAdmin.filterRejected", fallback: "Rejected" },
  { status: "ALL", key: "orderCancellationsAdmin.filterAll", fallback: "All" },
];

function getFilterHref(status) {
  return status && status !== "RECEIVED" ? `/admin/order-cancellations?status=${status}` : "/admin/order-cancellations";
}

export default async function AdminOrderCancellationsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const requestedStatus = normalizeParam(resolvedSearchParams.status).trim().toUpperCase();
  const activeStatus = ["RECEIVED", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus) ? requestedStatus : "RECEIVED";

  const allRequests = await listCancellationRequestsForAdmin();
  const counts = allRequests.reduce(
    (summary, request) => {
      const status = String(request.status).toUpperCase();
      if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
      return summary;
    },
    { RECEIVED: 0, APPROVED: 0, REJECTED: 0 },
  );
  const requests = activeStatus === "ALL"
    ? allRequests
    : allRequests.filter((request) => String(request.status).toUpperCase() === activeStatus);

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="orderCancellationsAdmin.title" fallback="Withdrawals" />}
          description={<AdminText i18nKey="orderCancellationsAdmin.description" fallback="Review withdrawal requests. Orders are only cancelled after approval." />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={filterRowStyle}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = activeStatus === filter.status;
              return (
                <Link
                  key={filter.status}
                  href={getFilterHref(filter.status)}
                  scroll={false}
                  style={isActive ? filterActiveStyle : filterStyle}
                >
                  <AdminText i18nKey={filter.key} fallback={filter.fallback} />
                  <span style={filterCountStyle}>{filter.status === "ALL" ? allRequests.length : counts[filter.status]}</span>
                </Link>
              );
            })}
          </div>

          {requests.length ? (
            <CancellationRequestPanel requests={requests} returnPath={getFilterHref(activeStatus)} />
          ) : (
            <p style={{ margin: 0, color: "var(--app-text-muted)" }}>
              <AdminText i18nKey="orderCancellationsAdmin.empty" fallback="No withdrawal requests match this filter." />
            </p>
          )}
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const filterRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const filterStyle = {
  textDecoration: "none",
  borderRadius: 999,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.82)",
  color: "var(--app-text-muted)",
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  padding: "7px 12px",
  fontSize: 13,
  fontWeight: 800,
};

const filterCountStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  minHeight: 22,
  borderRadius: 999,
  background: "rgba(143, 62, 44, 0.09)",
  fontSize: 11,
};

const filterActiveStyle = {
  ...filterStyle,
  border: "1px solid rgba(143, 62, 44, 0.22)",
  background: "rgba(143, 62, 44, 0.11)",
  color: "var(--app-accent)",
};
