import {
  AdminSection,
  FlashMessage,
  FormField,
  actionRowStyle,
  cardListStyle,
  dangerButtonStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  textareaStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ownerName(owner) {
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ");
}

function ownerContact(owner) {
  return [owner.email, owner.phone].filter(Boolean).join(" | ") || "No contact details";
}

export default async function AdminPropertyOwnersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const owners = await listPropertyOwnersForAdmin();
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title="Property owners"
          description="Manage owners that can be attached to reusable contract numbers."
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/api/admin/property-owners" method="post" style={formGridStyle}>
            <FormField label="First name">
              <input name="firstName" style={inputStyle} required />
            </FormField>
            <FormField label="Last name">
              <input name="lastName" style={inputStyle} required />
            </FormField>
            <FormField label="Email">
              <input name="email" type="email" style={inputStyle} />
            </FormField>
            <FormField label="Phone">
              <input name="phone" style={inputStyle} />
            </FormField>
            <FormField label="Notes" wide>
              <textarea name="notes" rows={3} style={textareaStyle} />
            </FormField>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" style={primaryButtonStyle}>Create owner</button>
            </div>
          </form>

          <div className="admin-list-table" style={{ ...tableWrapStyle, marginTop: 18 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Contracts</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!owners.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={5}>No property owners configured.</td>
                  </tr>
                ) : null}
                {owners.map((owner) => (
                  <tr key={owner.id}>
                    <td style={tdStyle}>
                      <strong>{ownerName(owner)}</strong>
                      {owner.notes ? <div style={subMetaStyle}>{owner.notes}</div> : null}
                    </td>
                    <td style={tdStyle}>{ownerContact(owner)}</td>
                    <td style={tdStyle}>{owner._count.contracts}</td>
                    <td style={tdStyle}>{formatDate(owner.createdAt)}</td>
                    <td style={tdStyle}>
                      <details style={editDetailsStyle}>
                        <summary style={editSummaryStyle}>Edit owner</summary>
                        <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={editFormStyle}>
                          <FormField label="First name">
                            <input name="firstName" defaultValue={owner.firstName} style={compactInputStyle} required />
                          </FormField>
                          <FormField label="Last name">
                            <input name="lastName" defaultValue={owner.lastName} style={compactInputStyle} required />
                          </FormField>
                          <FormField label="Email">
                            <input name="email" type="email" defaultValue={owner.email || ""} style={compactInputStyle} />
                          </FormField>
                          <FormField label="Phone">
                            <input name="phone" defaultValue={owner.phone || ""} style={compactInputStyle} />
                          </FormField>
                          <FormField label="Notes" wide>
                            <textarea name="notes" defaultValue={owner.notes || ""} rows={2} style={compactTextareaStyle} />
                          </FormField>
                          <div style={actionRowStyle}>
                            <button type="submit" style={primaryButtonStyle}>Save owner</button>
                            <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}>Delete owner</button>
                          </div>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap, marginTop: 18 }}>
            {!owners.length ? <p style={mutedTextStyle}>No property owners configured.</p> : null}
            {owners.map((owner) => (
              <article key={owner.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{ownerName(owner)}</strong>
                  <div style={subMetaStyle}>
                    <span>{ownerContact(owner)}</span>
                    <span>{owner._count.contracts} contract(s)</span>
                    <span>Created: {formatDate(owner.createdAt)}</span>
                  </div>
                  {owner.notes ? <p style={mutedTextStyle}>{owner.notes}</p> : null}
                </div>
                <details style={editDetailsStyle}>
                  <summary style={editSummaryStyle}>Edit owner</summary>
                  <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={editFormStyle}>
                    <FormField label="First name">
                      <input name="firstName" defaultValue={owner.firstName} style={compactInputStyle} required />
                    </FormField>
                    <FormField label="Last name">
                      <input name="lastName" defaultValue={owner.lastName} style={compactInputStyle} required />
                    </FormField>
                    <FormField label="Email">
                      <input name="email" type="email" defaultValue={owner.email || ""} style={compactInputStyle} />
                    </FormField>
                    <FormField label="Phone">
                      <input name="phone" defaultValue={owner.phone || ""} style={compactInputStyle} />
                    </FormField>
                    <FormField label="Notes" wide>
                      <textarea name="notes" defaultValue={owner.notes || ""} rows={2} style={compactTextareaStyle} />
                    </FormField>
                    <div style={actionRowStyle}>
                      <button type="submit" style={primaryButtonStyle}>Save owner</button>
                      <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}>Delete owner</button>
                    </div>
                  </form>
                </details>
              </article>
            ))}
          </div>

          <style>{`
            .admin-list-cards {
              display: none;
            }

            @media (max-width: 760px) {
              .admin-list-table {
                display: none;
              }

              .admin-list-cards {
                display: grid;
              }
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const editDetailsStyle = {
  display: "grid",
  gap: 8,
};

const editSummaryStyle = {
  color: "var(--app-accent)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const editFormStyle = {
  display: "grid",
  gap: 8,
  paddingTop: 8,
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: 42,
  padding: "6px 10px",
  fontSize: "0.92rem",
  lineHeight: 1.35,
};
