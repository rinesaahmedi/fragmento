import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  actionRowStyle,
  dangerButtonStyle,
  inputStyle,
  itemCardStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  subMetaStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminText } from "../../../../components/admin-i18n";
import AdminContractAddressFields from "../../../../components/admin-contract-address-fields";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getPropertyOwnerForAdmin, listKitchensForAdmin } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeRouteId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function propertyObjectAddress(object) {
  const streetLine = [object.address1, object.address2].filter(Boolean).join(", ");
  const cityLine = [object.postalCode, object.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, object.country].filter(Boolean).join(" | ");
}

function propertyObjectContact(object) {
  return object.contactPhone || "";
}

export default async function AdminPropertyOwnerDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id: rawId } = await params;
  const id = normalizeRouteId(rawId);
  const resolvedSearchParams = (await searchParams) || {};
  const [owner, kitchens] = await Promise.all([
    getPropertyOwnerForAdmin(id),
    listKitchensForAdmin(),
  ]);
  const createObjectOpen = normalizeParam(resolvedSearchParams.createObject) === "1";
  const createContractOpen = normalizeParam(resolvedSearchParams.createContract) === "1";
  const openObjectId = normalizeParam(resolvedSearchParams.openObject);

  if (!owner) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="propertyOwnersAdmin.ownerNotFound" fallback="Housing company not found" />}
            description={<AdminText i18nKey="propertyOwnersAdmin.ownerRecordDoesNotExist" fallback="The requested housing company record does not exist." />}
            actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="propertyOwnersAdmin.backToOwners" fallback="Back to housing companies" /></ActionLink>}
          />
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={owner.name}
          actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="propertyOwnersAdmin.backToOwners" fallback="Back to housing companies" /></ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={subMetaStyle}>
            <span>{owner._count.propertyObjects} <AdminText i18nKey="propertyOwnersAdmin.objectCount" fallback="object(s)" /></span>
            <span>{owner._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
            <span><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" />: {formatDate(owner.createdAt)}</span>
          </div>
        </AdminSection>

        <div style={splitGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="propertyOwnersAdmin.editOwner" fallback="Edit housing company" />}
          >
            <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={formGridStyle}>
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
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="contractsAdmin.addContractNumber" fallback="Add contract number" />}
            description="Create a contract number for this housing company, then choose which object it belongs to."
          >
            <details open={createContractOpen} style={createCompanyContractDetailsStyle}>
              <summary className="create-company-contract-summary" style={createCompanyContractSummaryStyle}>
                <AdminText i18nKey="contractsAdmin.createContractForCompany" fallback="Create contract" />
              </summary>
              <div style={createCompanyContractBodyStyle}>
                {!owner.propertyObjects?.length ? (
                  <p style={mutedTextStyle}>Create at least one object before linking a contract number here.</p>
                ) : (
                  <form action="/api/admin/contracts" method="post" style={contractCreateFormStyle}>
                    <input type="hidden" name="returnTo" value={`/admin/property-owners/${owner.id}`} />
                    <input type="hidden" name="housingCompanyId" value={owner.id} />
                    <FormField label={<AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" />}>
                      <select name="kitchenId" style={compactInputStyle} required>
                        <option value=""><AdminText i18nKey="contractsAdmin.selectKitchen" fallback="Select kitchen" /></option>
                        {kitchens.map((kitchen) => (
                          <option key={kitchen.id} value={kitchen.id}>
                            {kitchen.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
                      <input name="contractNumber" placeholder="ABC-123" style={compactInputStyle} required />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractsAdmin.propertyObject" fallback="Property object" />}>
                      <select name="propertyObjectId" style={compactInputStyle} required>
                        <option value=""><AdminText i18nKey="contractsAdmin.selectPropertyObject" fallback="Select object/building" /></option>
                        {(owner.propertyObjects || []).map((object) => (
                          <option key={object.id} value={object.id}>
                            {object.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.floor" fallback="Floor" />}>
                      <input name="floor" style={compactInputStyle} />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.unitNumber" fallback="Unit number" />}>
                      <input name="unitNumber" style={compactInputStyle} />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.notes" fallback="Notes" />} wide>
                      <textarea name="notes" rows={2} style={compactTextareaStyle} />
                    </FormField>
                    <div style={formActionRowStyle}>
                      <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="contractsAdmin.createContract" fallback="Create contract" /></button>
                    </div>
                  </form>
                )}
              </div>
            </details>
          </AdminSection>
        </div>

        <AdminSection
          title={<AdminText i18nKey="propertyOwnersAdmin.manageObjects" fallback="Manage objects" />}
          description={<AdminText i18nKey="propertyOwnersAdmin.manageObjectsDescription" fallback="Create new buildings and open only the object you need to edit." />}
        >
          <div style={objectWorkspaceStyle}>
            <section style={itemCardStyle}>
              <details open={createObjectOpen} style={createObjectDetailsStyle}>
                <summary className="create-object-summary" style={createObjectSummaryStyle}>
                  <AdminText i18nKey="propertyOwnersAdmin.addObject" fallback="Add object" />
                </summary>
                <div style={createObjectBodyStyle}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong style={objectSectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.createObject" fallback="Create object" /></strong>
                    <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.createObjectDescription" fallback="Add one building at a time with a verified address." /></p>
                  </div>

                  <form action={`/api/admin/property-owners/${owner.id}/objects`} method="post" style={objectFormStyle}>
                    <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object/building name" />} wide>
                      <input name="name" placeholder="Building A" style={compactInputStyle} required />
                    </FormField>
                    <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Object contact phone" />}>
                      <input name="contactPhone" placeholder="+49 170 1234567" style={compactInputStyle} />
                    </FormField>
                    <AdminContractAddressFields mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
                    <div style={formActionRowStyle}>
                      <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createObject" fallback="Create object" /></button>
                    </div>
                  </form>
                </div>
              </details>
            </section>

            <section style={itemCardStyle}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={objectSectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.existingObjects" fallback="Existing objects" /></strong>
                <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.existingObjectsDescription" fallback="Open an object card only when you need to update its address or remove it." /></p>
              </div>

              {!owner.propertyObjects?.length ? (
                <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." /></p>
              ) : null}

              <div style={objectEditorListStyle}>
                {(owner.propertyObjects || []).map((object) => (
                  <div key={object.id} style={objectListItemStyle}>
                    <div style={objectDetailsStyle}>
                      <div style={objectSummaryContentStyle}>
                        <strong>{object.name}</strong>
                        {propertyObjectAddress(object) ? <span style={objectSummaryMetaStyle}>{propertyObjectAddress(object)}</span> : null}
                        {propertyObjectContact(object) ? <span style={objectSummaryMetaStyle}>{propertyObjectContact(object)}</span> : null}
                      </div>
                      <div style={objectSummaryAsideStyle}>
                        <span style={objectPreviewCountStyle}>
                          {object._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" />
                        </span>
                        <ActionLink href={`/admin/property-owners/${owner.id}?openObject=${object.id}`} scroll={false}>
                          <AdminText i18nKey="propertyOwnersAdmin.manageObject" fallback="Manage object" />
                        </ActionLink>
                      </div>
                    </div>
                    {openObjectId === object.id ? (
                      <div style={objectEditorCardStyle}>
                        <div style={objectEditorHeaderStyle}>
                          <strong style={objectSectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.manageObject" fallback="Manage object" /></strong>
                          <ActionLink href={`/admin/property-owners/${owner.id}`} scroll={false}>
                            <AdminText i18nKey="propertyOwnersAdmin.hideObjectEditor" fallback="Hide editor" />
                          </ActionLink>
                        </div>
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
                          <div style={compactFooterStyle}>
                            <div style={actionRowStyle}>
                              <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveObject" fallback="Save object" /></button>
                              <button type="submit" name="_intent" value="delete" style={secondaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.deleteObject" fallback="Delete object" /></button>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </AdminSection>

        <style>{`
          .create-object-summary::-webkit-details-marker {
            display: none;
          }

          .create-company-contract-summary::-webkit-details-marker {
            display: none;
          }
        `}</style>
      </div>
    </AdminShell>
  );
}

const formGridStyle = {
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

const formActionRowStyle = {
  ...actionRowStyle,
  gridColumn: "1 / -1",
  paddingTop: 2,
};

const objectWorkspaceStyle = {
  display: "grid",
  gap: 16,
};

const createObjectDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createObjectSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createObjectBodyStyle = {
  display: "grid",
  gap: 18,
  paddingTop: 8,
};

const objectSectionTitleStyle = {
  color: "var(--app-text)",
  fontSize: 15,
};

const objectFormStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
};

const objectEditorListStyle = {
  display: "grid",
  gap: 12,
};

const objectListItemStyle = {
  display: "grid",
  gap: 10,
};

const objectDetailsStyle = {
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  alignItems: "flex-start",
  border: "1px solid rgba(45, 108, 121, 0.14)",
  borderRadius: 16,
  background: "rgba(255,255,255,0.82)",
  padding: "14px 16px",
};

const objectSummaryContentStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const objectSummaryAsideStyle = {
  display: "grid",
  gap: 10,
  justifyItems: "end",
};

const objectSummaryMetaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
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

const objectEditorCardStyle = {
  ...itemCardStyle,
  display: "grid",
  gap: 16,
  padding: 18,
};

const objectEditorHeaderStyle = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
};

const compactFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  gridColumn: "1 / -1",
  flexWrap: "wrap",
};

const contractCreateFormStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "start",
};

const createCompanyContractDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createCompanyContractSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createCompanyContractBodyStyle = {
  display: "grid",
  gap: 14,
  paddingTop: 8,
};
