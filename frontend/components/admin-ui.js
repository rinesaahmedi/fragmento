import Link from "next/link";

export function PageHero({ eyebrow, title, description, actions, stats }) {
  return (
    <section
      style={{
        borderRadius: 22,
        padding: "32px",
        background: "var(--app-hero-overlay), var(--app-hero-gradient)",
        color: "var(--app-accent-contrast)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        gap: 24,
        boxShadow: "var(--app-shadow)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {eyebrow ? <span style={eyebrowStyle}>{eyebrow}</span> : null}
          <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 4vw, 3.75rem)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>{title}</h1>
          {description ? (
            <p style={{ margin: 0, maxWidth: 720, color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>{description}</p>
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
            {title ? <h2 style={{ margin: 0, fontSize: "1.55rem", color: "var(--app-text)", letterSpacing: "-0.02em" }}>{title}</h2> : null}
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
      ? { color: "var(--app-danger-text)", background: "linear-gradient(135deg, var(--app-danger-bg), rgba(255,255,255,0.92))", border: "rgba(180, 71, 57, 0.18)" }
      : { color: "var(--app-success-text)", background: "linear-gradient(135deg, var(--app-success-bg), rgba(255,255,255,0.92))", border: "rgba(53, 113, 88, 0.18)" };

  return (
    <div
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 16,
        padding: "14px 18px",
        boxShadow: "var(--app-shadow-soft)",
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
        padding: "18px 20px",
        borderRadius: 18,
        background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.68)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
        {label}
      </div>
      <strong style={{ fontSize: "2.3rem", lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</strong>
      {detail ? <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{detail}</div> : null}
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
  const label = status === "CONFIRMED" ? "CONFIRMED / EMAILED" : status;
  return <span style={statusPill(status)}>{label}</span>;
}

export function TypeBadge({ label }) {
  return <span style={typePillStyle}>{label}</span>;
}

export const pageGridStyle = { display: "grid", gap: 24 };
export const splitGridStyle = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};
export const formGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const denseGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const checkboxRowStyle = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };
export const actionRowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
export const tableWrapStyle = {
  overflowX: "auto",
  borderRadius: 18,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,249,245,0.86))",
  boxShadow: "var(--app-shadow-soft)",
};
export const tableStyle = { width: "100%", borderCollapse: "collapse", background: "var(--app-surface)" };
export const thStyle = {
  textAlign: "left",
  padding: "16px 20px",
  fontSize: 12,
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,250,246,0.95), rgba(252,241,232,0.88))",
  fontWeight: 700,
};
export const tdStyle = {
  padding: "20px",
  borderBottom: "1px solid var(--app-border)",
  color: "var(--app-text)",
  verticalAlign: "top",
};
export const inputStyle = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.82)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "0.98rem",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};
export const textareaStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.82)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "0.98rem",
  resize: "vertical",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};
export const primaryButtonStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "linear-gradient(135deg, var(--app-accent) 0%, #b86438 100%)",
  color: "var(--app-accent-contrast)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "0 16px 30px rgba(143, 62, 44, 0.18)",
};
export const secondaryButtonStyle = {
  border: "1px solid var(--app-border-strong)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,243,232,0.72))",
  color: "var(--app-accent)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};
export const dangerButtonStyle = {
  border: "1px solid rgba(180, 71, 57, 0.12)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "linear-gradient(135deg, var(--app-danger-bg), rgba(255,255,255,0.92))",
  color: "var(--app-danger-text)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};
export const mutedTextStyle = { margin: 0, color: "var(--app-text-muted)", lineHeight: 1.6 };
export const subMetaStyle = { display: "flex", gap: 10, flexWrap: "wrap", color: "var(--app-text-muted)", fontSize: 14 };
export const cardListStyle = { display: "grid", gap: 16 };
export const itemCardStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 18,
  padding: 20,
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.88))",
  display: "grid",
  gap: 16,
  boxShadow: "var(--app-shadow-soft)",
};
export const itemHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
export const emptyStateStyle = { margin: 0, color: "var(--app-text-muted)" };
export const codePillStyle = {
  display: "inline-flex",
  padding: "8px 10px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--app-accent-soft), rgba(255,255,255,0.9))",
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid rgba(143, 62, 44, 0.12)",
};

const panelStyle = {
  borderRadius: 20,
  padding: 24,
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.88))",
  border: "1px solid var(--app-border)",
  display: "grid",
  gap: 20,
  boxShadow: "var(--app-shadow-soft)",
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
  color: "var(--app-text)",
  fontWeight: 700,
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const eyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  color: "rgba(255,248,242,0.84)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const linkButtonStyle = {
  textDecoration: "none",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,248,242,0.8))",
  color: "var(--app-accent)",
  border: "1px solid rgba(255,255,255,0.22)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "0 12px 24px rgba(59, 25, 17, 0.14)",
};

const secondaryLinkStyle = {
  textDecoration: "none",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(255,255,255,0.08)",
  color: "var(--app-accent-contrast)",
  border: "1px solid rgba(255,255,255,0.24)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};

function statusPill(status) {
  const base = {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
  };

  if (status === "ACTIVE" || status === "CONFIRMED") {
    return { ...base, background: "linear-gradient(135deg, var(--app-success-bg), rgba(255,255,255,0.78))", color: "var(--app-success-text)", border: "1px solid rgba(53, 113, 88, 0.14)" };
  }

  if (status === "ARCHIVED" || status === "CANCELLED") {
    return { ...base, background: "linear-gradient(135deg, var(--app-neutral-bg), rgba(255,255,255,0.72))", color: "var(--app-neutral-text)", border: "1px solid rgba(112, 89, 78, 0.12)" };
  }

  if (status === "EMAILED") {
    return { ...base, background: "linear-gradient(135deg, var(--app-info-bg), rgba(255,255,255,0.78))", color: "var(--app-info-text)", border: "1px solid rgba(45, 108, 121, 0.14)" };
  }

  return { ...base, background: "linear-gradient(135deg, var(--app-warning-bg), rgba(255,255,255,0.78))", color: "var(--app-warning-text)", border: "1px solid rgba(144, 98, 14, 0.12)" };
}

const typePillStyle = {
  background: "linear-gradient(135deg, var(--app-secondary-soft), rgba(255,255,255,0.88))",
  color: "var(--app-accent)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid rgba(43, 141, 128, 0.12)",
};
