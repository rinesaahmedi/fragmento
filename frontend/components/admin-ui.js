import Link from "next/link";

export function PageHero({ eyebrow, title, description, actions, stats }) {
  return (
    <section
      style={{
        borderRadius: 30,
        padding: "28px 30px",
        background:
          "linear-gradient(140deg, rgba(101, 60, 28, 0.96), rgba(58, 36, 19, 0.94)), linear-gradient(180deg, #7c491f, #2d1a10)",
        color: "#fff7ef",
        boxShadow: "0 22px 55px rgba(88, 54, 25, 0.18)",
        display: "grid",
        gap: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {eyebrow ? <span style={eyebrowStyle}>{eyebrow}</span> : null}
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 3.6vw, 3.2rem)", lineHeight: 1 }}>{title}</h1>
          {description ? (
            <p style={{ margin: 0, maxWidth: 720, color: "rgba(255,247,239,0.78)", lineHeight: 1.7 }}>{description}</p>
          ) : null}
        </div>
        {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {stats?.length ? <div style={metricGridStyle}>{stats}</div> : null}
    </section>
  );
}

export function AdminSection({ title, description, actions, children }) {
  return (
    <section style={panelStyle}>
      {(title || description || actions) ? (
        <div style={sectionHeaderStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            {title ? <h2 style={{ margin: 0, fontSize: "1.6rem", color: "#251a13" }}>{title}</h2> : null}
            {description ? <p style={mutedTextStyle}>{description}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FlashMessage({ tone, message }) {
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

export function MetricCard({ label, value, detail }) {
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
      {detail ? <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,247,239,0.72)" }}>{detail}</div> : null}
    </div>
  );
}

export function FormField({ label, children, wide = false }) {
  return (
    <label style={{ ...fieldStyle, gridColumn: wide ? "1 / -1" : "auto" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ActionLink({ href, children, secondary = false }) {
  return (
    <Link href={href} style={secondary ? secondaryLinkStyle : linkButtonStyle}>
      {children}
    </Link>
  );
}

export function StatusBadge({ status }) {
  return <span style={statusPill(status)}>{status}</span>;
}

export function TypeBadge({ label }) {
  return <span style={typePillStyle}>{label}</span>;
}

export const pageGridStyle = { display: "grid", gap: 24 };
export const splitGridStyle = {
  display: "grid",
  gap: 22,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};
export const formGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const denseGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const checkboxRowStyle = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };
export const actionRowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
export const tableWrapStyle = { overflowX: "auto", borderRadius: 20, border: "1px solid #efe1d0" };
export const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 820, background: "#fffdfa" };
export const thStyle = {
  textAlign: "left",
  padding: "16px 18px",
  fontSize: 13,
  color: "#8c735e",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: "1px solid #efe1d0",
  background: "#f8efe5",
};
export const tdStyle = {
  padding: "18px",
  borderBottom: "1px solid #f3e6d7",
  color: "#352720",
  verticalAlign: "top",
};
export const inputStyle = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid #dcc8b3",
  background: "#fffdfb",
  padding: "13px 15px",
  color: "#241913",
  fontSize: "0.98rem",
};
export const textareaStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #dcc8b3",
  background: "#fffdfb",
  padding: "13px 15px",
  color: "#241913",
  fontSize: "0.98rem",
  resize: "vertical",
};
export const primaryButtonStyle = {
  border: 0,
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "linear-gradient(135deg, #9a5e24 0%, #74411a 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "0 16px 26px rgba(140, 88, 34, 0.16)",
};
export const secondaryButtonStyle = {
  border: "1px solid #dfcbb7",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "#fffaf4",
  color: "#5a3d27",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};
export const dangerButtonStyle = {
  border: "1px solid #efcaca",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "#fff1f1",
  color: "#9f2d2d",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};
export const mutedTextStyle = { margin: 0, color: "#6d655c", lineHeight: 1.6 };
export const subMetaStyle = { display: "flex", gap: 10, flexWrap: "wrap", color: "#7c6a5b", fontSize: 14 };
export const cardListStyle = { display: "grid", gap: 16 };
export const itemCardStyle = {
  border: "1px solid #ece0d5",
  borderRadius: 18,
  padding: 18,
  background: "#fffdfa",
  display: "grid",
  gap: 14,
};
export const itemHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
export const emptyStateStyle = { margin: 0, color: "#6e655d" };
export const codePillStyle = {
  display: "inline-flex",
  padding: "8px 10px",
  borderRadius: 999,
  background: "#f5ece2",
  color: "#74411a",
  fontSize: 13,
  fontWeight: 700,
};

const panelStyle = {
  borderRadius: 28,
  padding: 24,
  background: "rgba(255, 252, 247, 0.95)",
  border: "1px solid #eadbc8",
  boxShadow: "0 18px 44px rgba(109, 78, 45, 0.08)",
  display: "grid",
  gap: 18,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const fieldStyle = {
  display: "grid",
  gap: 8,
  color: "#362a22",
  fontWeight: 700,
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

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

const linkButtonStyle = {
  textDecoration: "none",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "#fff7ee",
  color: "#71421c",
  border: "1px solid rgba(255,255,255,0.16)",
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
};

const secondaryLinkStyle = {
  textDecoration: "none",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "#fffaf4",
  color: "#5a3d27",
  border: "1px solid #dfcbb7",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};

function statusPill(status) {
  const base = {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
  };

  if (status === "ACTIVE" || status === "CONFIRMED") {
    return { ...base, background: "#eaf7ee", color: "#207244" };
  }

  if (status === "ARCHIVED" || status === "CANCELLED") {
    return { ...base, background: "#f0ece8", color: "#6a5d52" };
  }

  if (status === "EMAILED") {
    return { ...base, background: "#eef4fb", color: "#255b8a" };
  }

  return { ...base, background: "#fff4df", color: "#8b641c" };
}

const typePillStyle = {
  background: "#f4e7d8",
  color: "#6e431d",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
};
