import { AdminShell } from "../../../components/admin-shell";
import {
  FlashMessage,
  FormField,
  actionRowStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  AdminSection,
} from "../../../components/admin-ui";
import { AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage({ searchParams }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={compactWrapStyle}>
          <AdminSection
            title={<AdminText i18nKey="accountAdmin.account" fallback="Account" />}
            description={<AdminText i18nKey="accountAdmin.changeEmailOrPassword" fallback="Change email or password." />}
          >
            <form action="/api/admin/account" method="post" style={formGridStyle}>
              <FormField label={<AdminText i18nKey="accountAdmin.loginEmail" fallback="Login email" />} wide>
                <input name="email" type="email" required defaultValue={admin.email} style={inputStyle} />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.currentPassword" fallback="Current password" />} wide>
                <input name="currentPassword" type="password" required placeholder="********" style={inputStyle} />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.newPassword" fallback="New password" />}>
                <input name="newPassword" type="password" placeholder="********" style={inputStyle} />
              </FormField>

              <FormField label={<AdminText i18nKey="accountAdmin.confirmNewPassword" fallback="Confirm new password" />}>
                <input name="confirmPassword" type="password" placeholder="********" style={inputStyle} />
              </FormField>

              <div style={{ ...actionRowStyle, gridColumn: "1 / -1" }}>
                <button type="submit" style={primaryButtonStyle}>
                  <AdminText i18nKey="accountAdmin.save" fallback="Save" />
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
  maxWidth: 820,
};
