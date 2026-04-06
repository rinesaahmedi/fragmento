import Link from "next/link";
import { getFormMessage } from "../../../../lib/admin-forms";
import { listKitchensForAdmin } from "../../../../lib/catalog";
import {
  AdminSection,
  FlashMessage,
  FormField,
  MetricCard,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  textareaStyle,
  thStyle,
} from "../../../../components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminKitchensPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const kitchens = await listKitchensForAdmin();
  const activeCount = kitchens.filter((kitchen) => kitchen.status === "ACTIVE").length;
  const totalItems = kitchens.reduce((sum, kitchen) => sum + kitchen._count.items, 0);
  const totalOrders = kitchens.reduce((sum, kitchen) => sum + kitchen._count.orders, 0);

  return (
    <div style={pageGridStyle}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.9fr)",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderRadius: 12,
            padding: 32,
            background: "var(--app-accent)",
            color: "var(--app-accent-contrast)",
            border: "1px solid var(--app-border)",
            display: "grid",
            gap: 24,
            alignContent: "space-between",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <span style={eyebrowStyle}>Kitchen Catalog</span>
            <h1 style={{ margin: 0, fontSize: "clamp(2.4rem, 4.6vw, 4.5rem)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>
              Design the structure behind every live kitchen.
            </h1>
            <p style={{ margin: 0, maxWidth: 620, color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>
              Manage your global culinary footprint with a centralized catalog. Control naming, routing, and operational status from a single editorial surface.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
            <MetricCard label="Active units" value={String(activeCount)} detail={`${kitchens.length - activeCount} offline or draft`} />
            <MetricCard label="Catalog depth" value={String(totalItems)} detail="Published component entries" />
            <MetricCard label="Orders" value={String(totalOrders)} detail="Tracked across all kitchens" />
          </div>
        </div>

        <AdminSection
          title="Create kitchen"
          description="Create the kitchen shell now, then refine its catalog once the route is live."
        >
          <form action="/api/admin/kitchens" method="post" style={{ display: "grid", gap: 16 }}>
            <FormField label="Kitchen name">
              <input name="name" placeholder="Fragmento Loft" required style={inputStyle} />
            </FormField>
            <FormField label="Slug">
              <input name="slug" placeholder="fragmento-loft" required style={inputStyle} />
            </FormField>
            <FormField label="Status">
              <select name="status" defaultValue="DRAFT" style={inputStyle}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </FormField>
            <FormField label="Description">
              <textarea name="description" placeholder="Short description" rows={4} style={textareaStyle} />
            </FormField>
            <button type="submit" style={primaryButtonStyle}>Confirm kitchen registration</button>
          </form>
        </AdminSection>
      </section>

      {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
      {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}

      <AdminSection
        title="Existing kitchens"
        description="Browse operational units, review route slugs, and jump directly into catalog editing."
        actions={[
          <span key="count" style={tableHintStyle}>
            {kitchens.length} total entries
          </span>,
        ]}
      >
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Kitchen</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Items</th>
                <th style={thStyle}>Orders</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {kitchens.map((kitchen) => (
                <tr key={kitchen.id}>
                  <td style={tdStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "var(--app-text)" }}>{kitchen.name}</strong>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>Created catalog entry</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <code style={codePillStyle}>{kitchen.slug}</code>
                  </td>
                  <td style={tdStyle}>
                    <span style={statusPill(kitchen.status)}>{kitchen.status}</span>
                  </td>
                  <td style={tdStyle}>{kitchen._count.items}</td>
                  <td style={tdStyle}>{kitchen._count.orders}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link href={`/admin/kitchens/${kitchen.id}`} style={tableLinkStyle}>
                        Edit
                      </Link>
                      <Link href={`/kitchens/${kitchen.slug}`} style={previewLinkStyle}>
                        Preview
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}

const eyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.76)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const codePillStyle = {
  display: "inline-flex",
  padding: "8px 10px",
  borderRadius: 999,
  background: "var(--app-surface-muted)",
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 700,
};

const tableHintStyle = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "var(--app-surface-muted)",
  color: "var(--app-accent)",
  fontWeight: 700,
  fontSize: 13,
};

const tableLinkStyle = {
  textDecoration: "none",
  color: "var(--app-accent)",
  fontWeight: 700,
};

const previewLinkStyle = {
  textDecoration: "none",
  color: "var(--app-text-muted)",
  fontWeight: 700,
};

function statusPill(status) {
  if (status === "ACTIVE") {
    return {
      display: "inline-flex",
      padding: "8px 12px",
      borderRadius: 999,
      background: "var(--app-success-bg)",
      color: "var(--app-success-text)",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.06em",
    };
  }

  if (status === "ARCHIVED") {
    return {
      display: "inline-flex",
      padding: "8px 12px",
      borderRadius: 999,
      background: "var(--app-neutral-bg)",
      color: "var(--app-neutral-text)",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.06em",
    };
  }

  return {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "var(--app-warning-bg)",
    color: "var(--app-warning-text)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
  };
}
