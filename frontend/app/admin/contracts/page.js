import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  StatusBadge,
  actionRowStyle,
  cardListStyle,
  formGridStyle,
  inputStyle,
  itemCardStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import AdminContractAddressFields from "../../../components/admin-contract-address-fields";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listKitchenContractsForAdmin, listKitchensForAdmin, listPropertyOwnersForAdmin } from "../../../lib/catalog";

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

function contractAddressLines(contract) {
  const streetLine = [contract.address1, contract.address2].filter(Boolean).join(", ");
  const cityLine = [contract.postalCode, contract.city].filter(Boolean).join(" ");
  const unitLine = [
    contract.building ? `Building ${contract.building}` : "",
    contract.floor ? `Floor ${contract.floor}` : "",
    contract.unitNumber ? `Unit ${contract.unitNumber}` : "",
  ].filter(Boolean).join(" | ");

  return [streetLine, cityLine, contract.country, unitLine, contract.notes ? `Notes: ${contract.notes}` : ""].filter(Boolean);
}

function contractAddressSummary(contract) {
  const lines = contractAddressLines(contract);
  return lines.length ? lines.join(" | ") : "No address context";
}

function ownerName(owner) {
  if (!owner) return "No owner selected";
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ");
}

function ownerSummary(owner) {
  if (!owner) return "No owner selected";
  const contact = [owner.email, owner.phone].filter(Boolean).join(" | ");
  return contact ? `${ownerName(owner)} | ${contact}` : ownerName(owner);
}

function ownerOptionSummary(owner) {
  const contact = [owner.email, owner.phone].filter(Boolean).join(" | ");
  return contact ? `${ownerName(owner)} | ${contact}` : ownerName(owner);
}

function usageLabel(orderCount) {
  const count = Number(orderCount || 0);
  if (count === 0) return "Unused";
  if (count === 1) return "Used once";
  return `Used ${count} times`;
}

function OwnerSelect({ owners, defaultValue = "", compact = false }) {
  return (
    <FormField label="Property owner">
      <select name="ownerId" defaultValue={defaultValue || ""} style={compact ? compactInputStyle : inputStyle}>
        <option value="">No owner selected</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {ownerOptionSummary(owner)}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function KitchenSelect({ kitchens, defaultValue = "", compact = false }) {
  return (
    <FormField label="Kitchen">
      <select name="kitchenId" defaultValue={defaultValue || ""} style={compact ? compactInputStyle : inputStyle} required>
        <option value="">Select kitchen</option>
        {kitchens.map((kitchen) => (
          <option key={kitchen.id} value={kitchen.id}>
            {kitchen.name}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export default async function AdminContractsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId),
    ownerId: normalizeParam(resolvedSearchParams.ownerId),
    status: normalizeParam(resolvedSearchParams.status),
    usage: normalizeParam(resolvedSearchParams.usage),
    query: normalizeParam(resolvedSearchParams.q),
  };
  const returnTo = `/admin/contracts?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()}`;

  const [kitchens, owners, contracts] = await Promise.all([
    listKitchensForAdmin(),
    listPropertyOwnersForAdmin(),
    listKitchenContractsForAdmin(filters),
  ]);
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title="Contract numbers"
          description="Create, filter, and edit reusable contract numbers from one place."
          actions={<ActionLink href="/admin/property-owners">Manage owners</ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/admin/contracts" method="get" style={filterGridStyle}>
            <FormField label="Search">
              <input name="q" defaultValue={filters.query} placeholder="Contract, kitchen, owner, city..." style={inputStyle} />
            </FormField>
            <KitchenSelect kitchens={kitchens} defaultValue={filters.kitchenId} />
            <OwnerSelect owners={owners} defaultValue={filters.ownerId} />
            <FormField label="Status">
              <select name="status" defaultValue={filters.status} style={inputStyle}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
            <FormField label="Usage">
              <select name="usage" defaultValue={filters.usage} style={inputStyle}>
                <option value="">All usage</option>
                <option value="unused">Unused</option>
                <option value="used">Used</option>
                <option value="once">Used once</option>
                <option value="multiple">Used 2+ times</option>
              </select>
            </FormField>
            <div style={{ ...actionRowStyle, alignSelf: "end" }}>
              <button type="submit" style={primaryButtonStyle}>Apply filters</button>
              <ActionLink href="/admin/contracts">Clear filters</ActionLink>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Add contract number"
          description="Select the kitchen, add address context, and attach a property owner."
        >
          <form action="/api/admin/contracts" method="post" style={formGridStyle}>
            <KitchenSelect kitchens={kitchens} defaultValue={filters.kitchenId} />
            <FormField label="Contract number">
              <input name="contractNumber" placeholder="ABC-123" style={inputStyle} required />
            </FormField>
            <AdminContractAddressFields />
            <OwnerSelect owners={owners} defaultValue={filters.ownerId} />
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" style={primaryButtonStyle}>Create contract</button>
            </div>
          </form>
        </AdminSection>

        <AdminSection
          title="Configured contracts"
          description={`${contracts.length} contract number(s) match the current filters.`}
        >
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Contract</th>
                  <th style={thStyle}>Kitchen</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle}>Address</th>
                  <th style={thStyle}>Usage</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!contracts.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={8}>No contract numbers match the current filters.</td>
                  </tr>
                ) : null}
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td style={tdStyle}><strong>{contract.contractNumber}</strong></td>
                    <td style={tdStyle}>{contract.kitchen.name}</td>
                    <td style={tdStyle}><StatusBadge status={contract.isActive ? "ACTIVE" : "ARCHIVED"} /></td>
                    <td style={tdStyle}>{ownerSummary(contract.owner)}</td>
                    <td style={tdStyle}>{contractAddressSummary(contract)}</td>
                    <td style={tdStyle}>
                      <span style={contract._count.orders ? usagePillUsedStyle : usagePillUnusedStyle}>
                        {usageLabel(contract._count.orders)}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatDate(contract.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={contractActionStackStyle}>
                        <form action={`/api/admin/contracts/${contract.id}`} method="post">
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            type="submit"
                            name="_intent"
                            value={contract.isActive ? "deactivate" : "reactivate"}
                            style={secondaryButtonStyle}
                          >
                            {contract.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                        <details style={contractEditDetailsStyle}>
                          <summary style={contractEditSummaryStyle}>Edit details</summary>
                          <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractEditFormStyle}>
                            <input type="hidden" name="_intent" value="update" />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <FormField label="Contract number">
                              <input name="contractNumber" defaultValue={contract.contractNumber} style={compactInputStyle} required />
                            </FormField>
                            <AdminContractAddressFields contract={contract} compact />
                            <OwnerSelect owners={owners} defaultValue={contract.ownerId || ""} compact />
                            <button type="submit" style={primaryButtonStyle}>Save contract</button>
                          </form>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!contracts.length ? <p style={mutedTextStyle}>No contract numbers match the current filters.</p> : null}
            {contracts.map((contract) => (
              <article key={contract.id} style={itemCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong>{contract.contractNumber}</strong>
                    <div style={subMetaStyle}>
                      <span>{contract.kitchen.name}</span>
                      <span>Owner: {ownerName(contract.owner)}</span>
                      <span>{contractAddressSummary(contract)}</span>
                      <span>{usageLabel(contract._count.orders)}</span>
                      <span>Created: {formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={contract.isActive ? "ACTIVE" : "ARCHIVED"} />
                </div>
                <form action={`/api/admin/contracts/${contract.id}`} method="post">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    name="_intent"
                    value={contract.isActive ? "deactivate" : "reactivate"}
                    style={secondaryButtonStyle}
                  >
                    {contract.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
                <details style={contractEditDetailsStyle}>
                  <summary style={contractEditSummaryStyle}>Edit contract details</summary>
                  <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractEditFormStyle}>
                    <input type="hidden" name="_intent" value="update" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <FormField label="Contract number">
                      <input name="contractNumber" defaultValue={contract.contractNumber} style={compactInputStyle} required />
                    </FormField>
                    <AdminContractAddressFields contract={contract} compact />
                    <OwnerSelect owners={owners} defaultValue={contract.ownerId || ""} compact />
                    <button type="submit" style={primaryButtonStyle}>Save contract</button>
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

const filterGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  alignItems: "start",
};

const contractActionStackStyle = {
  display: "grid",
  gap: 8,
  minWidth: 220,
};

const contractEditDetailsStyle = {
  display: "grid",
  gap: 8,
};

const contractEditSummaryStyle = {
  color: "var(--app-accent)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const contractEditFormStyle = {
  display: "grid",
  gap: 8,
  paddingTop: 8,
};

const usagePillUsedStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 10px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--app-info-bg), rgba(255,255,255,0.78))",
  color: "var(--app-info-text)",
  border: "1px solid rgba(45, 108, 121, 0.14)",
  fontSize: 12,
  fontWeight: 800,
};

const usagePillUnusedStyle = {
  ...usagePillUsedStyle,
  background: "linear-gradient(135deg, var(--app-neutral-bg), rgba(255,255,255,0.72))",
  color: "var(--app-neutral-text)",
  border: "1px solid rgba(112, 89, 78, 0.12)",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};
