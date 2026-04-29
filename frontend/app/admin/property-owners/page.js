import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  secondaryButtonStyle,
  cardListStyle,
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
import Link from "next/link";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import AdminPropertyOwnerObjectBuilder from "../../../components/admin-property-owner-object-builder";
import AdminPropertyObjectsPreview, {
  AdminPropertyObjectDetailsPreview,
  AdminPropertyProjectsPreview,
} from "../../../components/admin-property-objects-preview";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

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

function ownerName(owner) {
  return owner.name || "";
}

function ownerContact(owner) {
  return [owner.address, owner.email].filter(Boolean);
}

function matchingObjects(owner, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];

  return (owner.propertyObjects || []).filter((object) => [
    object.projectName,
    object.projectCode,
    object.projectStatus,
    object.projectDescription,
    object.projectManagerName,
    object.name,
    object.contactPhone,
    object.country,
    object.city,
    object.postalCode,
    object.address1,
    object.address2,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle));
}

function buildSearchSummary(owner, query) {
  const needle = String(query || "").trim();
  if (!needle) return "";

  const matches = matchingObjects(owner, needle);
  if (!matches.length) return "";

  const firstMatch = matches[0];
  const location = [firstMatch.city, firstMatch.country].filter(Boolean).join(", ");
  const locationLabel = location || firstMatch.address1 || firstMatch.name;
  return `${needle} - ${matches.length} object${matches.length === 1 ? "" : "s"} matched in ${locationLabel} for ${owner.name}.`;
}

function buildOwnerSearchIndex(owner) {
  const ownerFields = [
    owner.name,
    owner.address,
    owner.email,
    owner.phone,
    owner.notes,
  ];

  const objectFields = (owner.propertyObjects || []).flatMap((object) => ([
    object.projectName,
    object.projectCode,
    object.projectStatus,
    object.projectDescription,
    object.projectManagerName,
    object.name,
    object.contactPhone,
    object.country,
    object.city,
    object.postalCode,
    object.address1,
    object.address2,
  ]));

  return [...ownerFields, ...objectFields]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterOwners(owners, filters) {
  return owners.filter((owner) => {
    const searchIndex = buildOwnerSearchIndex(owner);
    const matchesQuery = !filters.query || searchIndex.includes(filters.query.toLowerCase());
    const matchesLocation = !filters.location || (owner.propertyObjects || []).some((object) => String(object.country || "").trim() === filters.location);
    return matchesQuery && matchesLocation;
  });
}

export default async function AdminPropertyOwnersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    query: normalizeParam(resolvedSearchParams.q).trim(),
    location: normalizeParam(resolvedSearchParams.location).trim(),
    create: normalizeParam(resolvedSearchParams.create).trim(),
  };
  const owners = await listPropertyOwnersForAdmin();
  const filteredOwners = filterOwners(owners, filters);
  const availableLocations = [...new Set(
    owners.flatMap((owner) => (owner.propertyObjects || []).map((object) => String(object.country || "").trim()).filter(Boolean)),
  )].sort((left, right) => left.localeCompare(right));
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const createOpen = filters.create === "1";

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="propertyOwnersAdmin.propertyOwners" fallback="Property owners" />}
          description={<AdminText i18nKey="propertyOwnersAdmin.manageOwnersAttachedToReusableContractNumbers" fallback="Manage owners that can be attached to reusable contract numbers." />}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <details open={createOpen} style={createOwnerDetailsStyle}>
            <summary className="create-owner-summary" style={createOwnerSummaryStyle}>
              <AdminText i18nKey="propertyOwnersAdmin.addHousingCompany" fallback="Add housing company" />
            </summary>
            <div style={createOwnerBodyStyle}>
              <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.createOwnerPanelDescription" fallback="Open this panel only when you want to add a new housing company and optional objects." /></p>
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
            </div>
          </details>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="propertyOwnersAdmin.configuredCompanies" fallback="Configured housing companies" />}
          description={<>{filteredOwners.length} <AdminText i18nKey="propertyOwnersAdmin.companiesMatchFilters" fallback="housing company record(s) match the current filters." /></>}
        >
          <form action="/admin/property-owners" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
              <span style={filterHintStyle}><AdminText i18nKey="propertyOwnersAdmin.searchEverythingHint" fallback="Search across company name, address, notes, object names, city, postal code, and location fields." /></span>
            </div>
            <div style={filterGridStyle}>
              <FilterField label={<AdminText i18nKey="contractsAdmin.search" fallback="Search" />}>
                <input
                  name="q"
                  defaultValue={filters.query}
                  placeholder="Name, address, postal code, city, object..."
                  style={filterInputStyle}
                />
              </FilterField>
              <FilterField label={<AdminText i18nKey="propertyOwnersAdmin.location" fallback="Location" />}>
                <select name="location" defaultValue={filters.location} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="propertyOwnersAdmin.allLocations" fallback="All locations" /></option>
                  {availableLocations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </FilterField>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href="/admin/property-owners" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <colgroup>
                <col style={{ width: "16%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.owner" fallback="Owner" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.contact" fallback="Contact" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.project" fallback="Project" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.propertyObject" fallback="Object / Building" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.contracts" fallback="Contracts" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="propertyOwnersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!filteredOwners.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}><AdminText i18nKey="propertyOwnersAdmin.noPropertyOwnersMatchFilters" fallback="No housing companies match the current filters." /></td>
                  </tr>
                ) : null}
                {filteredOwners.map((owner) => (
                  <tr key={owner.id}>
                    <td style={tdStyle}>
                      <strong>{ownerName(owner)}</strong>
                      {filters.query ? <div style={matchSummaryStyle}>{buildSearchSummary(owner, filters.query)}</div> : null}
                    </td>
                    <td style={tdStyle}><ContactValue owner={owner} /></td>
                    <td style={tdStyle}>
                      <AdminPropertyProjectsPreview objects={owner.propertyObjects} priorityQuery={filters.query} />
                    </td>
                    <td style={tdStyle}>
                      <AdminPropertyObjectDetailsPreview objects={owner.propertyObjects} priorityQuery={filters.query} />
                    </td>
                    <td style={tdStyle}>{owner._count.contracts}</td>
                    <td style={tdStyle}>{formatDate(owner.createdAt)}</td>
                    <td style={tdStyle}>
                      <ActionLink href={`/admin/property-owners/${owner.id}`}>
                        <AdminText i18nKey="propertyOwnersAdmin.manage" fallback="Manage" />
                      </ActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={mobileCardListStyle}>
            {!filteredOwners.length ? <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noPropertyOwnersMatchFilters" fallback="No housing companies match the current filters." /></p> : null}
            {filteredOwners.map((owner) => (
              <article key={owner.id} style={itemCardStyle}>
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{ownerName(owner)}</strong>
                  {filters.query ? <div style={matchSummaryStyle}>{buildSearchSummary(owner, filters.query)}</div> : null}
                  <div style={subMetaStyle}>
                    <ContactValue owner={owner} />
                    <span>{owner._count.propertyObjects} <AdminText i18nKey="propertyOwnersAdmin.objectCount" fallback="object(s)" /></span>
                    <span>{owner._count.contracts} <AdminText i18nKey="kitchensAdmin.contractCount" fallback="contract(s)" /></span>
                    <span><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created" />: {formatDate(owner.createdAt)}</span>
                  </div>
                  <AdminPropertyObjectsPreview objects={owner.propertyObjects} priorityQuery={filters.query} />
                </div>
                <ActionLink href={`/admin/property-owners/${owner.id}`}>
                  <AdminText i18nKey="propertyOwnersAdmin.manage" fallback="Manage" />
                </ActionLink>
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

            .create-owner-summary::-webkit-details-marker {
              display: none;
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span>{label}</span>
      {children}
    </label>
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

const contactStackStyle = {
  display: "grid",
  gap: 2,
};

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const createOwnerDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createOwnerSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createOwnerBodyStyle = {
  display: "grid",
  gap: 18,
  paddingTop: 8,
};

const mobileCardListStyle = {
  gap: cardListStyle.gap,
};

const matchSummaryStyle = {
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45,
  marginTop: 4,
};
