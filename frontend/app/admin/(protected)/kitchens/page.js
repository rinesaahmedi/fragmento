import Link from "next/link";
import { getFormMessage } from "../../../../lib/admin-forms";
import { listKitchensForAdmin } from "../../../../lib/catalog";

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
    <div style={{ display: "grid", gap: 24 }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderRadius: 30,
            padding: "30px 30px 28px",
            background:
              "linear-gradient(140deg, rgba(101, 60, 28, 0.96), rgba(58, 36, 19, 0.94)), linear-gradient(180deg, #7c491f, #2d1a10)",
            color: "#fff7ef",
            boxShadow: "0 22px 55px rgba(88, 54, 25, 0.18)",
            display: "grid",
            gap: 20,
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <span style={eyebrowStyle}>Kitchen Catalog</span>
            <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 4vw, 3.5rem)", lineHeight: 1 }}>
              Design the structure behind every live kitchen.
            </h1>
            <p style={{ margin: 0, maxWidth: 620, color: "rgba(255,247,239,0.78)", lineHeight: 1.7 }}>
              Create new kitchen experiences, control status, and keep the catalog clean before customers reach the configurator.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <MetricCard label="Kitchens" value={String(kitchens.length)} />
            <MetricCard label="Active" value={String(activeCount)} />
            <MetricCard label="Items" value={String(totalItems)} />
            <MetricCard label="Orders" value={String(totalOrders)} />
          </div>
        </div>

        <section
          style={{
            borderRadius: 28,
            padding: 24,
            background: "rgba(255, 252, 247, 0.95)",
            border: "1px solid #eadbc8",
            boxShadow: "0 18px 44px rgba(109, 78, 45, 0.12)",
            display: "grid",
            gap: 16,
            alignContent: "start",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: "1.7rem", color: "#251a13" }}>Create kitchen</h2>
            <p style={{ margin: 0, color: "#6d655c", lineHeight: 1.6 }}>
              Add a new kitchen entry and publish it later when the catalog is ready.
            </p>
          </div>

          <form action="/api/admin/kitchens" method="post" style={{ display: "grid", gap: 14 }}>
            <label style={fieldStyle}>
              <span>Kitchen name</span>
              <input name="name" placeholder="Fragmento Loft" required style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Slug</span>
              <input name="slug" placeholder="fragmento-loft" required style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Status</span>
              <select name="status" defaultValue="DRAFT" style={inputStyle}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label style={fieldStyle}>
              <span>Description</span>
              <textarea name="description" placeholder="Short description" rows={4} style={textareaStyle} />
            </label>
            <button type="submit" style={buttonStyle}>Create kitchen</button>
          </form>
        </section>
      </section>

      {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
      {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}

      <section
        style={{
          borderRadius: 28,
          padding: 24,
          background: "rgba(255, 252, 247, 0.95)",
          border: "1px solid #eadbc8",
          boxShadow: "0 18px 44px rgba(109, 78, 45, 0.08)",
          display: "grid",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: 0, fontSize: "1.7rem", color: "#251a13" }}>Existing kitchens</h2>
            <p style={{ margin: 0, color: "#6d655c", lineHeight: 1.6 }}>
              Jump into a kitchen to edit its catalog, lock options, or preview the public route.
            </p>
          </div>
          <span style={tableHintStyle}>{kitchens.length} total entries</span>
        </div>

        <div style={{ overflowX: "auto", borderRadius: 20, border: "1px solid #efe1d0" }}>
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
                <tr key={kitchen.id} style={{ background: "rgba(255,255,255,0.74)" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "#251a13" }}>{kitchen.name}</strong>
                      <span style={{ color: "#8a7159", fontSize: 13 }}>Created catalog entry</span>
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
                      <Link href={`/kitchens/${kitchen.slug}`} style={secondaryLinkStyle}>
                        Preview
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FlashMessage({ tone, message }) {
  const palette =
    tone === "error"
      ? { color: "#9f2d2d", background: "#fff1f1", border: "#efcaca" }
      : { color: "#1f6b3b", background: "#eefaf1", border: "#cce9d3" };

  return (
    <div
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 18,
        padding: "14px 18px",
      }}
    >
      {message}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 18,
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ fontSize: 13, color: "rgba(255,247,239,0.7)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
      <strong style={{ fontSize: "2rem", lineHeight: 1 }}>{value}</strong>
    </div>
  );
}

const eyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "#f8d9b6",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const fieldStyle = {
  display: "grid",
  gap: 8,
  color: "#362a22",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minHeight: 54,
  borderRadius: 16,
  border: "1px solid #dcc8b3",
  background: "#fffdfb",
  padding: "14px 16px",
  color: "#241913",
  fontSize: "1rem",
};

const textareaStyle = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid #dcc8b3",
  background: "#fffdfb",
  padding: "14px 16px",
  color: "#241913",
  fontSize: "1rem",
  resize: "vertical",
};

const buttonStyle = {
  border: 0,
  borderRadius: 16,
  minHeight: 54,
  padding: "14px 18px",
  background: "linear-gradient(135deg, #9a5e24 0%, #74411a 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  boxShadow: "0 18px 30px rgba(140, 88, 34, 0.18)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 820,
  background: "#fffdfa",
};

const thStyle = {
  textAlign: "left",
  padding: "16px 18px",
  fontSize: 13,
  color: "#8c735e",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: "1px solid #efe1d0",
  background: "#f8efe5",
};

const tdStyle = {
  padding: "18px",
  borderBottom: "1px solid #f3e6d7",
  color: "#352720",
};

const codePillStyle = {
  display: "inline-flex",
  padding: "8px 10px",
  borderRadius: 999,
  background: "#f5ece2",
  color: "#74411a",
  fontSize: 13,
  fontWeight: 700,
};

const tableHintStyle = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#f4e7d8",
  color: "#7a4d24",
  fontWeight: 700,
  fontSize: 13,
};

const tableLinkStyle = {
  textDecoration: "none",
  color: "#8c5523",
  fontWeight: 800,
};

const secondaryLinkStyle = {
  textDecoration: "none",
  color: "#5d4635",
  fontWeight: 700,
};

function statusPill(status) {
  if (status === "ACTIVE") {
    return {
      display: "inline-flex",
      padding: "8px 12px",
      borderRadius: 999,
      background: "#eaf7ee",
      color: "#207244",
      fontSize: 13,
      fontWeight: 800,
    };
  }

  if (status === "ARCHIVED") {
    return {
      display: "inline-flex",
      padding: "8px 12px",
      borderRadius: 999,
      background: "#f0ece8",
      color: "#6a5d52",
      fontSize: 13,
      fontWeight: 800,
    };
  }

  return {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#fff4df",
    color: "#8b641c",
    fontSize: 13,
    fontWeight: 800,
  };
}
