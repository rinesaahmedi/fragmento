import Link from "next/link";

export function PageHero({ eyebrow, title, description, actions, stats }) {
  return (
    <section
      style={{
        borderRadius: 12,
        padding: "32px",
        background: "var(--app-accent)",
        color: "var(--app-accent-contrast)",
        border: "1px solid var(--app-border)",
        display: "grid",
        gap: 24,
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
      ? { color: "var(--app-danger-text)", background: "var(--app-danger-bg)", border: "var(--app-border)" }
      : { color: "var(--app-success-text)", background: "var(--app-success-bg)", border: "var(--app-border)" };

  return (
    <div
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
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
        padding: "18px 20px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
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
  return <span style={statusPill(status)}>{status}</span>;
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
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
};
export const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 820, background: "var(--app-surface)" };
export const thStyle = {
  textAlign: "left",
  padding: "16px 20px",
  fontSize: 12,
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
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
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "0.98rem",
};
export const textareaStyle = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "0.98rem",
  resize: "vertical",
};
export const primaryButtonStyle = {
  border: "1px solid var(--app-accent)",
  borderRadius: 10,
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};
export const secondaryButtonStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  minHeight: 50,
  padding: "13px 18px",
  background: "transparent",
  color: "var(--app-accent)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};
export const dangerButtonStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--app-danger-bg)",
  color: "var(--app-danger-text)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};
export const mutedTextStyle = { margin: 0, color: "var(--app-text-muted)", lineHeight: 1.6 };
export const subMetaStyle = { display: "flex", gap: 10, flexWrap: "wrap", color: "var(--app-text-muted)", fontSize: 14 };
export const cardListStyle = { display: "grid", gap: 16 };
export const itemCardStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  padding: 20,
  background: "var(--app-surface)",
  display: "grid",
  gap: 16,
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
  background: "var(--app-surface-muted)",
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 700,
};

const panelStyle = {
  borderRadius: 12,
  padding: 24,
  background: "var(--app-surface)",
  border: "1px solid var(--app-border)",
  display: "grid",
  gap: 20,
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
  background: "rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.76)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const linkButtonStyle = {
  textDecoration: "none",
  borderRadius: 10,
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--app-surface)",
  color: "var(--app-accent)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};

const secondaryLinkStyle = {
  textDecoration: "none",
  borderRadius: 10,
  minHeight: 50,
  padding: "13px 18px",
  background: "transparent",
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
    return { ...base, background: "var(--app-success-bg)", color: "var(--app-success-text)" };
  }

  if (status === "ARCHIVED" || status === "CANCELLED") {
    return { ...base, background: "var(--app-neutral-bg)", color: "var(--app-neutral-text)" };
  }

  if (status === "EMAILED") {
    return { ...base, background: "var(--app-info-bg)", color: "var(--app-info-text)" };
  }

  return { ...base, background: "var(--app-warning-bg)", color: "var(--app-warning-text)" };
}

const typePillStyle = {
  background: "var(--app-surface-muted)",
  color: "var(--app-accent)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
};
