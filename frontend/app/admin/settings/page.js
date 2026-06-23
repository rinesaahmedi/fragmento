import { AdminText } from "../../../components/admin-i18n";
import { AdminShell } from "../../../components/admin-shell";
import {
  AdminSection,
  FlashMessage,
  actionRowStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
} from "../../../components/admin-ui";
import { getFormMessage } from "../../../lib/admin-forms";
import { getDirectOrderConfirmationEnabled } from "../../../lib/admin-settings";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const directOrderConfirmationEnabled = await getDirectOrderConfirmationEnabled();

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={compactWrapStyle}>
          <AdminSection
            title={<AdminText i18nKey="settingsAdmin.settings" fallback="Settings" />}
            description={<AdminText i18nKey="settingsAdmin.orderConfirmationDescription" fallback="Control how public kitchen orders are confirmed." />}
          >
            <form action="/api/admin/settings/order-confirmation" method="post" style={formStyle}>
              <label style={toggleCardStyle}>
                <input
                  name="directOrderConfirmationEnabled"
                  type="checkbox"
                  defaultChecked={directOrderConfirmationEnabled}
                  style={checkboxStyle}
                />
                <span style={toggleTextStyle}>
                  <strong><AdminText i18nKey="settingsAdmin.directOrderConfirmation" fallback="Send order confirmations automatically" /></strong>
                  <span style={mutedTextStyle}>
                    <AdminText
                      i18nKey="settingsAdmin.directOrderConfirmationHelp"
                      fallback="When enabled, the customer confirmation email is sent immediately after public checkout and the order is marked confirmed after the email succeeds. The agent webhook still runs."
                    />
                  </span>
                </span>
              </label>

              <div style={actionRowStyle}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="settingsAdmin.saveSettings" fallback="Save settings" />
                </button>
              </div>
            </form>
          </AdminSection>
        </div>
      </div>
    </AdminShell>
  );
}

const compactWrapStyle = {
  maxWidth: 860,
};

const formStyle = {
  display: "grid",
  gap: 18,
};

const toggleCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "var(--app-surface)",
  padding: 18,
  cursor: "pointer",
};

const checkboxStyle = {
  width: 22,
  height: 22,
  marginTop: 2,
  accentColor: "var(--color-primary)",
};

const toggleTextStyle = {
  display: "grid",
  gap: 8,
  lineHeight: 1.5,
};
