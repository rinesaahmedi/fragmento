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
  return [owner.email, owner.phone].filter(Boolean).join(" | ") || "No contact details";
}

function propertyObjectAddress(object) {
  const streetLine = [object.address1, object.address2].filter(Boolean).join(", ");
  const cityLine = [object.postalCode, object.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, object.country].filter(Boolean).join(" | ");
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
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
              <textarea name="notes" rows={3} style={textareaStyle} />
            </FormField>
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
                      <td style={tdStyle}>{ownerContact(owner)}</td>
                      <td style={tdStyle}>
                        <PropertyObjectsPreview owner={owner} />
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
                    <span>{ownerContact(owner)}</span>
                    <span>{owner._count.propertyObjects} <AdminText i18nKey="propertyOwnersAdmin.objectCount" fallback="object(s)" /></span>
                    <span>{owner._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
                    <span><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" />: {formatDate(owner.createdAt)}</span>
                  </div>
                  {owner.notes ? <p style={mutedTextStyle}>{owner.notes}</p> : null}
                  <PropertyObjectsPreview owner={owner} />
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

function PropertyObjectsPreview({ owner }) {
  const objects = owner.propertyObjects || [];

  if (!objects.length) {
    return (
      <span style={emptyObjectPreviewStyle}>
        <AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." />
      </span>
    );
  }

  return (
    <div style={objectPreviewListStyle}>
      {objects.map((object) => {
        const address = propertyObjectAddress(object);
        return (
          <div key={object.id} style={objectPreviewCardStyle}>
            <div style={objectPreviewHeaderStyle}>
              <strong>{object.name}</strong>
              <span style={objectPreviewCountStyle}>
                {object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" />
              </span>
            </div>
            {address ? <span style={objectPreviewAddressStyle}>{address}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function CompanyManagement({ owner }) {
  return (
    <div style={managementStackStyle}>
      <details style={editDetailsStyle}>
        <summary style={editSummaryStyle}><AdminText i18nKey="propertyOwnersAdmin.editOwner" fallback="Edit housing company" /></summary>
        <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={editFormStyle}>
          <FormField label={<AdminText i18nKey="propertyOwnersAdmin.companyName" fallback="Company name" />}>
            <input name="name" defaultValue={owner.name} style={compactInputStyle} required />
          </FormField>
          <FormField label={<AdminText i18nKey="propertyOwnersAdmin.email" fallback="Email" />}>
            <input name="email" type="email" defaultValue={owner.email || ""} style={compactInputStyle} />
          </FormField>
          <FormField label={<AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" />}>
            <input name="phone" defaultValue={owner.phone || ""} style={compactInputStyle} />
          </FormField>
          <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
            <textarea name="notes" defaultValue={owner.notes || ""} rows={2} style={compactTextareaStyle} />
          </FormField>
          <div style={actionRowStyle}>
            <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveOwner" fallback="Save housing company" /></button>
            <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.deleteOwner" fallback="Delete housing company" /></button>
          </div>
        </form>
      </details>

      <details style={editDetailsStyle}>
        <summary style={editSummaryStyle}><AdminText i18nKey="propertyOwnersAdmin.manageObjects" fallback="Manage objects" /></summary>
        <div style={objectsStackStyle}>
          <form action={`/api/admin/property-owners/${owner.id}/objects`} method="post" style={objectFormStyle}>
            <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />}>
              <input name="name" placeholder="Building A" style={compactInputStyle} required />
            </FormField>
            <AdminContractAddressFields mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
            <div style={actionRowStyle}>
              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createObject" fallback="Create object" /></button>
            </div>
          </form>

          {!owner.propertyObjects?.length ? (
            <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." /></p>
          ) : null}

          {(owner.propertyObjects || []).map((object) => (
            <details key={object.id} style={objectDetailsStyle}>
              <summary style={objectSummaryStyle}>
                <strong>{object.name}</strong>
                <span>{object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
              </summary>
              <form action={`/api/admin/property-objects/${object.id}`} method="post" style={objectFormStyle}>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />}>
                  <input name="name" defaultValue={object.name} style={compactInputStyle} required />
                </FormField>
                <AdminContractAddressFields contract={object} mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
                <div style={actionRowStyle}>
                  <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveObject" fallback="Save object" /></button>
                  <button type="submit" name="_intent" value="delete" style={dangerButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.deleteObject" fallback="Delete object" /></button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </details>
    </div>
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

const objectPreviewListStyle = {
  display: "grid",
  gap: 6,
  minWidth: 320,
  maxWidth: 520,
};

const objectPreviewCardStyle = {
  display: "grid",
  gap: 3,
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(245,250,249,0.72))",
};

const objectPreviewHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  color: "var(--app-text)",
  fontSize: 13,
  lineHeight: 1.2,
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

const objectPreviewAddressStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const emptyObjectPreviewStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const managementStackStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};

const objectsStackStyle = {
  display: "grid",
  gap: 12,
  paddingTop: 8,
};

const objectFormStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
  padding: 10,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.72)",
};

const objectDetailsStyle = {
  display: "grid",
  gap: 8,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.78)",
};

const objectSummaryStyle = {
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  cursor: "pointer",
  color: "var(--app-text)",
  fontSize: 13,
};

const managementRowTdStyle = {
  padding: "0 20px 16px",
  borderBottom: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,249,245,0.72))",
};

const manageAnchorStyle = {
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};
