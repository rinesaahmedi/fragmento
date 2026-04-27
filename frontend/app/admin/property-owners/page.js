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
import { AdminText } from "../../../components/admin-i18n";
import AdminContractAddressFields from "../../../components/admin-contract-address-fields";
import AdminPropertyOwnerObjectBuilder from "../../../components/admin-property-owner-object-builder";
import AdminPropertyObjectsPreview from "../../../components/admin-property-objects-preview";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../lib/catalog";
import { Fragment } from "react";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ownerName(owner) {
  return owner.name || "";
}

function ownerContact(owner) {
  return [owner.address, owner.email].filter(Boolean);
}

function propertyObjectAddress(object) {
  const streetLine = [object.address1, object.address2].filter(Boolean).join(", ");
  const cityLine = [object.postalCode, object.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, object.country].filter(Boolean).join(" | ");
}

function propertyObjectContact(object) {
  return object.contactPhone || "";
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
          title={<AdminText i18nKey="propertyOwnersAdmin.propertyOwners" fallback="Property owners" />}
          description={<AdminText i18nKey="propertyOwnersAdmin.manageOwnersAttachedToReusableContractNumbers" fallback="Manage owners that can be attached to reusable contract numbers." />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/api/admin/property-owners" method="post" style={formGridStyle}>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.companyName" fallback="Company name" />}>
              <input name="name" style={inputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.email" fallback="Email" />}>
              <input name="email" type="email" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" />}>
              <input name="phone" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.address" fallback="Address" />} wide>
              <input name="address" style={inputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
              <textarea name="notes" rows={3} style={textareaStyle} />
            </FormField>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminPropertyOwnerObjectBuilder />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createOwner" fallback="Create owner" /></button>
            </div>
          </form>

          <div className="admin-list-table" style={{ ...tableWrapStyle, marginTop: 18 }}>
            <table style={tableStyle}>
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.owner" fallback="Owner" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.contact" fallback="Contact" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.objects" fallback="Objects/Buildings" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.contracts" fallback="Contracts" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!owners.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={6}><AdminText i18nKey="propertyOwnersAdmin.noPropertyOwnersConfigured" fallback="No property owners configured." /></td>
                  </tr>
                ) : null}
                {owners.map((owner) => (
                  <Fragment key={owner.id}>
                    <tr>
                      <td style={tdStyle}>
                        <strong>{ownerName(owner)}</strong>
                        {owner.notes ? <div style={subMetaStyle}>{owner.notes}</div> : null}
                      </td>
                      <td style={tdStyle}><ContactValue owner={owner} /></td>
                      <td style={tdStyle}>
                        <AdminPropertyObjectsPreview objects={owner.propertyObjects} />
                      </td>
                      <td style={tdStyle}>{owner._count.contracts}</td>
                      <td style={tdStyle}>{formatDate(owner.createdAt)}</td>
                      <td style={tdStyle}>
                        <a href={`#company-controls-${owner.id}`} style={manageAnchorStyle}>
                          <AdminText i18nKey="propertyOwnersAdmin.manage" fallback="Manage" />
                        </a>
                      </td>
                    </tr>
                    <tr id={`company-controls-${owner.id}`}>
                      <td style={managementRowTdStyle} colSpan={6}>
                        <CompanyManagement owner={owner} />
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap, marginTop: 18 }}>
            {!owners.length ? <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noPropertyOwnersConfigured" fallback="No property owners configured." /></p> : null}
            {owners.map((owner) => (
              <article key={owner.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{ownerName(owner)}</strong>
                  <div style={subMetaStyle}>
                    <ContactValue owner={owner} />
                    <span>{owner._count.propertyObjects} <AdminText i18nKey="propertyOwnersAdmin.objectCount" fallback="object(s)" /></span>
                    <span>{owner._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
                    <span><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" />: {formatDate(owner.createdAt)}</span>
                  </div>
                  {owner.notes ? <p style={mutedTextStyle}>{owner.notes}</p> : null}
                  <AdminPropertyObjectsPreview objects={owner.propertyObjects} />
                </div>
                <CompanyManagement owner={owner} />
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

function CompanyManagement({ owner }) {
  return (
    <div style={managementStackStyle}>
      <details style={managementPanelStyle}>
        <summary style={managementSummaryStyle}>
          <span style={managementEyebrowStyle}>Company details</span>
          <strong style={managementTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.editOwner" fallback="Edit housing company" /></strong>
          <span style={managementHintStyle}>Update the company profile, contact details, and internal notes.</span>
        </summary>
        <div style={managementBodyStyle}>
          <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={editFormStyle}>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.companyName" fallback="Company name" />} wide>
              <input name="name" defaultValue={owner.name} style={compactInputStyle} required />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.email" fallback="Email" />}>
              <input name="email" type="email" defaultValue={owner.email || ""} style={compactInputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" />}>
              <input name="phone" defaultValue={owner.phone || ""} style={compactInputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.address" fallback="Address" />} wide>
              <input name="address" defaultValue={owner.address || ""} style={compactInputStyle} />
            </FormField>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
              <textarea name="notes" defaultValue={owner.notes || ""} rows={3} style={compactTextareaStyle} />
            </FormField>
            <div style={formActionRowStyle}>
              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveOwner" fallback="Save housing company" /></button>
              <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.deleteOwner" fallback="Delete housing company" /></button>
            </div>
          </form>
        </div>
      </details>

      <details style={managementPanelStyle}>
        <summary style={managementSummaryStyle}>
          <span style={managementEyebrowStyle}>Objects</span>
          <strong style={managementTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.manageObjects" fallback="Manage objects" /></strong>
          <span style={managementHintStyle}>Create new buildings and keep each object address tidy and easy to review.</span>
        </summary>
        <div style={managementBodyStyle}>
          <div style={objectsStackStyle}>
            <section style={objectSectionStyle}>
              <div style={objectSectionHeaderStyle}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={objectSectionTitleStyle}>Create new object</strong>
                  <p style={mutedTextStyle}>Add one building at a time with a verified address.</p>
                </div>
              </div>
              <form action={`/api/admin/property-owners/${owner.id}/objects`} method="post" style={objectFormStyle}>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />} wide>
                  <input name="name" placeholder="Building A" style={compactInputStyle} required />
                </FormField>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Object contact phone" />}>
                  <input
                    name="contactPhone"
                    placeholder="+49 170 1234567"
                    style={compactInputStyle}
                  />
                </FormField>
                <AdminContractAddressFields mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
                <div style={formActionRowStyle}>
                  <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createObject" fallback="Create object" /></button>
                </div>
              </form>
            </section>

            <section style={objectSectionStyle}>
              <div style={objectSectionHeaderStyle}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={objectSectionTitleStyle}>Existing objects</strong>
                  <p style={mutedTextStyle}>Open an object card only when you need to update its address or remove it.</p>
                </div>
              </div>

              {!owner.propertyObjects?.length ? (
                <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." /></p>
              ) : null}

              <div style={objectEditorListStyle}>
                {(owner.propertyObjects || []).map((object) => (
                  <details key={object.id} style={objectDetailsStyle}>
                    <summary style={objectSummaryStyle}>
                      <div style={objectSummaryContentStyle}>
                        <strong>{object.name}</strong>
                        {propertyObjectAddress(object) ? <span style={objectSummaryMetaStyle}>{propertyObjectAddress(object)}</span> : null}
                        {propertyObjectContact(object) ? <span style={objectSummaryMetaStyle}>{propertyObjectContact(object)}</span> : null}
                      </div>
                      <span style={objectPreviewCountStyle}>
                        {object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" />
                      </span>
                    </summary>
                    <form action={`/api/admin/property-objects/${object.id}`} method="post" style={objectFormStyle}>
                      <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />} wide>
                        <input name="name" defaultValue={object.name} style={compactInputStyle} required />
                      </FormField>
                      <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Object contact phone" />}>
                        <input
                          name="contactPhone"
                          defaultValue={object.contactPhone || ""}
                          placeholder="+49 170 1234567"
                          style={compactInputStyle}
                        />
                      </FormField>
                      <AdminContractAddressFields contract={object} mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
                      <div style={formActionRowStyle}>
                        <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveObject" fallback="Save object" /></button>
                        <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.deleteObject" fallback="Delete object" /></button>
                      </div>
                    </form>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>
      </details>
    </div>
  );
}

function ContactValue({ owner }) {
  const lines = ownerContact(owner);
  if (!lines.length) {
    return <AdminText i18nKey="propertyOwnersAdmin.noContactDetails" fallback="No contact details" />;
  }

  return (
    <span style={contactStackStyle}>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  );
}

const managementPanelStyle = {
  display: "grid",
  gap: 0,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  borderRadius: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,249,245,0.78))",
  boxShadow: "var(--app-shadow-soft)",
};

const managementSummaryStyle = {
  display: "grid",
  gap: 4,
  padding: "14px 16px",
  cursor: "pointer",
  color: "var(--app-text)",
};

const managementEyebrowStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const managementTitleStyle = {
  color: "var(--app-accent)",
  fontSize: 15,
  lineHeight: 1.2,
};

const managementHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.5,
};

const contactStackStyle = {
  display: "grid",
  gap: 2,
};

const managementBodyStyle = {
  display: "grid",
  gap: 16,
  padding: "0 16px 16px",
  borderTop: "1px solid rgba(143, 62, 44, 0.08)",
};

const editFormStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 44,
  padding: "8px 12px",
  fontSize: "0.92rem",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: 78,
  padding: "8px 12px",
  fontSize: "0.92rem",
  lineHeight: 1.35,
};

const objectPreviewCountStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "3px 7px",
  background: "rgba(45, 108, 121, 0.09)",
  color: "var(--app-info-text)",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const managementStackStyle = {
  display: "grid",
  gap: 14,
  alignItems: "start",
};

const objectsStackStyle = {
  display: "grid",
  gap: 16,
};

const objectFormStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
  padding: 18,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.8)",
};

const formActionRowStyle = {
  ...actionRowStyle,
  gridColumn: "1 / -1",
  paddingTop: 2,
};

const objectDetailsStyle = {
  display: "grid",
  gap: 0,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.82)",
  overflow: "hidden",
};

const objectSummaryStyle = {
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "14px 16px",
  cursor: "pointer",
  color: "var(--app-text)",
  fontSize: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,252,251,0.9))",
};

const objectSummaryContentStyle = {
  display: "grid",
  gap: 4,
};

const objectSummaryMetaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
};

const objectSectionStyle = {
  display: "grid",
  gap: 12,
};

const objectSectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const objectSectionTitleStyle = {
  color: "var(--app-text)",
  fontSize: 15,
};

const objectEditorListStyle = {
  display: "grid",
  gap: 12,
};

const managementRowTdStyle = {
  padding: "10px 20px 18px",
  borderBottom: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,249,245,0.72))",
};

const manageAnchorStyle = {
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};
