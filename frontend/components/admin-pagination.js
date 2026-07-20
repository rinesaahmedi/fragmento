import Link from "next/link";
import { buildAdminPageHref } from "../lib/admin-pagination";
import { AdminText } from "./admin-i18n";

export function AdminPagination({ basePath, searchParams = {}, page, pageSize, totalItems, totalPages }) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav aria-label="Pagination" style={paginationStyle}>
      <span style={summaryStyle}>{firstItem}-{lastItem} / {totalItems}</span>
      <div style={actionsStyle}>
        {page > 1 ? (
          <Link href={buildAdminPageHref(basePath, searchParams, page - 1)} scroll={false} style={linkStyle}>
            <AdminText i18nKey="pagination.previous" fallback="Previous" />
          </Link>
        ) : (
          <span aria-disabled="true" style={disabledStyle}><AdminText i18nKey="pagination.previous" fallback="Previous" /></span>
        )}
        <strong style={pageStyle}>
          <AdminText i18nKey="pagination.pageOf" fallback="Page {page} of {total}" values={{ page: String(page), total: String(totalPages) }} />
        </strong>
        {page < totalPages ? (
          <Link href={buildAdminPageHref(basePath, searchParams, page + 1)} scroll={false} style={linkStyle}>
            <AdminText i18nKey="pagination.next" fallback="Next" />
          </Link>
        ) : (
          <span aria-disabled="true" style={disabledStyle}><AdminText i18nKey="pagination.next" fallback="Next" /></span>
        )}
      </div>
    </nav>
  );
}

const paginationStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 16 };
const actionsStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const summaryStyle = { color: "var(--app-text-muted)", fontSize: 13, fontWeight: 700 };
const pageStyle = { color: "var(--app-text)", fontSize: 13, padding: "8px 4px" };
const linkStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 38, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--app-border-strong)", background: "var(--color-card)", color: "var(--app-accent)", textDecoration: "none", fontSize: 13, fontWeight: 800 };
const disabledStyle = { ...linkStyle, opacity: 0.45 };
