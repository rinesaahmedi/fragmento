"use client";

import { AdminI18nProvider, AdminLanguageSwitcher, AdminText, useAdminI18n } from "./admin-i18n";

export default function AdminLoginVerifyPanel({ errorMessage, maskedEmail }) {
  return (
    <AdminI18nProvider>
      <AdminLoginVerifyPanelContent errorMessage={errorMessage} maskedEmail={maskedEmail} />
    </AdminI18nProvider>
  );
}

function AdminLoginVerifyPanelContent({ errorMessage, maskedEmail }) {
  const { translate } = useAdminI18n();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "28px 18px",
        background: "var(--app-bg)",
        color: "var(--app-text)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <form
        action="/api/admin/login/verify"
        method="post"
        style={{
          width: "100%",
          maxWidth: 440,
          display: "grid",
          gap: 22,
          borderRadius: 8,
          padding: "28px",
          background: "var(--color-card)",
          border: "1px solid var(--app-border)",
          boxShadow: "var(--app-shadow-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <span
            style={{
              color: "var(--app-accent)",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <AdminText i18nKey="adminShellLogin.fragmentoAdmin" fallback="Fragmento Admin" />
          </span>
          <div>
            <AdminLanguageSwitcher />
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: "2rem", color: "var(--app-text)", lineHeight: 1.12 }}>
            <AdminText i18nKey="adminShellLogin.verifySignIn" fallback="Verify sign-in" />
          </h1>
          <p style={{ margin: 0, color: "var(--app-text-muted)", lineHeight: 1.45, fontSize: "0.98rem" }}>
            {translate(
              "adminShellLogin.verificationCodeSentTo",
              "We sent a 6-digit verification code to {email}.",
            ).replace("{email}", maskedEmail)}
          </p>
        </div>

        {errorMessage ? (
          <p
            style={{
              margin: 0,
              color: "var(--app-danger-text)",
              background: "linear-gradient(135deg, var(--app-danger-bg), rgba(255,255,255,0.92))",
              border: "1px solid rgba(180, 71, 57, 0.18)",
              padding: "12px 14px",
              borderRadius: 8,
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        <label style={{ display: "grid", gap: 8, color: "var(--app-text)", fontWeight: 700 }}>
          <span>{translate("adminShellLogin.verificationCode", "Verification code")}</span>
          <input
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="123456"
            maxLength={6}
            pattern="[0-9]{6}"
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="submit" style={buttonStyle}>
            {translate("adminShellLogin.verifyAndContinue", "Verify and continue")}
          </button>
          <a href="/admin/login" style={linkStyle}>
            {translate("adminShellLogin.backToSignIn", "Back to sign in")}
          </a>
        </div>
      </form>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  minHeight: 48,
  borderRadius: 8,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.82)",
  padding: "12px 14px",
  fontSize: "1.25rem",
  letterSpacing: "0.2em",
  color: "var(--app-text)",
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};

const buttonStyle = {
  border: 0,
  width: "fit-content",
  minHeight: 44,
  borderRadius: 8,
  padding: "0 22px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontSize: "0.98rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(143, 62, 44, 0.16)",
};

const linkStyle = {
  color: "var(--app-text-muted)",
  fontSize: "0.92rem",
  fontWeight: 700,
  textDecoration: "none",
};
