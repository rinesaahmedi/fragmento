import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  StatusBadge,
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
import Link from "next/link";
import { Fragment } from "react";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
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

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatOrdinal(value) {
  const number = Number(value || 0);
  if (!number) return "";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
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

function contactAddressLines(address) {
  if (!address) return [];
  const nameLine = [address.firstName, address.lastName].filter(Boolean).join(" ");
  const streetLine = [address.address1, address.address2].filter(Boolean).join(", ");
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(" ");
  return [nameLine, streetLine, cityLine, address.country].filter(Boolean);
}

function addressSections(contract) {
  const sections = [];
  const contractLines = contractAddressLines(contract);
  if (contractLines.length) {
    sections.push({ label: "Contract address", lines: contractLines });
  }

  const paymentLines = contactAddressLines(contract.latestOrderAddress);
  if (paymentLines.length) {
    sections.push({ label: "Payment address", lines: paymentLines });
  }

  return sections.length ? sections : [{ label: "", lines: ["No address captured"] }];
}

function compactAddressSummary(contract) {
  return addressSections(contract)
    .map((section) => (section.label ? `${section.label}: ${section.lines.join(" | ")}` : section.lines.join(" | ")))
    .join(" / ");
}

function AddressColumn({ lines, emptyText }) {
  const displayLines = lines.length ? lines : [emptyText];

  return (
    <div style={addressBlockStyle}>
      <div style={lines.length ? addressLinesStyle : emptyAddressStyle}>
        {displayLines.map((line, index) => (
          <span key={typeof line === "string" ? line : `empty-${index}`}>{line}</span>
        ))}
      </div>
    </div>
  );
}

function ownerName(owner) {
  if (!owner) return "No owner selected";
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ");
}

function ownerSummary(owner) {
  return ownerName(owner);
}

function ownerOptionSummary(owner) {
  return ownerName(owner);
}

function usageLabel(orderCount) {
  const count = Number(orderCount || 0);
  if (count === 0) return "Unused";
  if (count === 1) return "Used once";
  return `Used ${count} times`;
}

function orderCustomerName(order) {
  return [order.firstName, order.lastName].filter(Boolean).join(" ") || "-";
}

function ContractOrders({ contract }) {
  const orders = contract.orders || [];

  if (!orders.length) {
    return (
      <p style={emptyOrdersStyle}>
        <AdminText i18nKey="contractsAdmin.noOrdersForThisContract" fallback="No orders for this contract yet." />
      </p>
    );
  }

  return (
    <div style={contractOrdersListStyle}>
      {orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.id}`} className="contract-order-link" style={contractOrderLinkStyle}>
          <span style={contractOrderMainStyle}>
            <strong>{order.orderNumber}</strong>
            <span>{formatOrdinal(order.contractOrderSequence)} <AdminText i18nKey="orderDetailAdmin.orderForThisContract" fallback="order for this contract" /></span>
          </span>
          <span style={contractOrderMetaStyle}>
            <StatusBadge status={order.status} />
            <span>{orderCustomerName(order)}</span>
            <span>{formatCurrency(order.totalPrice)}</span>
            <span>{formatDate(order.createdAt)}</span>
          </span>
        </Link>
      ))}
    </div>
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

function OwnerSelect({ owners, defaultValue = "", compact = false }) {
  return (
    <FormField label={<AdminText i18nKey="orderDetailAdmin.propertyOwner" fallback="Property owner" />}>
      <select name="ownerId" defaultValue={defaultValue || ""} style={compact ? compactInputStyle : inputStyle}>
        <option value=""><AdminText i18nKey="contractsAdmin.noOwnerSelected" fallback="No owner selected" /></option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {ownerOptionSummary(owner)}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function KitchenSelect({ kitchens, defaultValue = "", compact = false, required = true }) {
  return (
    <FormField label={<AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" />}>
      <select name="kitchenId" defaultValue={defaultValue || ""} style={compact ? compactInputStyle : inputStyle} required={required}>
        <option value=""><AdminText i18nKey="contractsAdmin.selectKitchen" fallback="Select kitchen" /></option>
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
          title={<AdminText i18nKey="contractsAdmin.contractNumbers" fallback="Contract numbers" />}
          description={<AdminText i18nKey="contractsAdmin.createFilterAndEditReusableContractNumbersFromOnePlace" fallback="Create, filter, and edit reusable contract numbers from one place." />}
          actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="dashboard.manageOwners" fallback="Manage owners" /></ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action="/admin/contracts" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}><AdminText i18nKey="contractsAdmin.filters" fallback="Filters" /></span>
              <span style={filterHintStyle}><AdminText i18nKey="contractsAdmin.narrowTheContractListBelow" fallback="Narrow the contract list below" /></span>
            </div>
            <div style={filterGridStyle}>
              <FilterField label={<AdminText i18nKey="contractsAdmin.search" fallback="Search" />}>
                <input name="q" defaultValue={filters.query} placeholder="Contract, kitchen, owner, city..." style={filterInputStyle} />
              </FilterField>
              <FilterField label={<AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" />}>
                <select name="kitchenId" defaultValue={filters.kitchenId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
                  {kitchens.map((kitchen) => (
                    <option key={kitchen.id} value={kitchen.id}>
                      {kitchen.name}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Owner" />}>
                <select name="ownerId" defaultValue={filters.ownerId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="contractsAdmin.allOwners" fallback="All owners" /></option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {ownerOptionSummary(owner)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label={<AdminText i18nKey="dashboard.status" fallback="Status" />}>
                <select name="status" defaultValue={filters.status} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
                  <option value="active"><AdminText i18nKey="contractsAdmin.active" fallback="Active" /></option>
                  <option value="inactive"><AdminText i18nKey="contractsAdmin.inactive" fallback="Inactive" /></option>
                </select>
              </FilterField>
              <FilterField label={<AdminText i18nKey="contractsAdmin.usage" fallback="Usage" />}>
                <select name="usage" defaultValue={filters.usage} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="contractsAdmin.allUsage" fallback="All usage" /></option>
                  <option value="unused"><AdminText i18nKey="contractsAdmin.unused" fallback="Unused" /></option>
                  <option value="used"><AdminText i18nKey="contractsAdmin.used" fallback="Used" /></option>
                  <option value="once"><AdminText i18nKey="contractsAdmin.usedOnce" fallback="Used once" /></option>
                  <option value="multiple"><AdminText i18nKey="contractsAdmin.usedTwoPlusTimes" fallback="Used 2+ times" /></option>
                </select>
              </FilterField>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href="/admin/contracts" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>
        </AdminSection>

        <AdminSection>
          <details style={createContractDetailsStyle}>
            <summary className="create-contract-summary" style={createContractSummaryStyle}>
              <AdminText i18nKey="contractsAdmin.addContractNumber" fallback="Add contract number" />
            </summary>
            <div style={createContractBodyStyle}>
              <p style={createContractDescriptionStyle}>
                <AdminText i18nKey="contractsAdmin.selectKitchenAddContractAddressAndAttachPropertyOwner" fallback="Select the kitchen, add the contract address, and attach a property owner." />
              </p>
              <form action="/api/admin/contracts" method="post" style={formGridStyle}>
                <KitchenSelect kitchens={kitchens} defaultValue={filters.kitchenId} />
                <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
                  <input name="contractNumber" placeholder="ABC-123" style={inputStyle} required />
                </FormField>
                <AdminContractAddressFields />
                <OwnerSelect owners={owners} defaultValue={filters.ownerId} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="contractsAdmin.createContract" fallback="Create contract" /></button>
                </div>
              </form>
            </div>
          </details>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="contractsAdmin.configuredContracts" fallback="Configured contracts" />}
          description={<>{contracts.length} <AdminText i18nKey="contractsAdmin.contractNumbersMatchCurrentFilters" fallback="contract number(s) match the current filters." /></>}
        >
          <div className="admin-list-table" style={tableWrapStyle}>
            <table style={contractTableStyle}>
              <colgroup>
                <col style={contractNumberColumnStyle} />
                <col style={kitchenColumnStyle} />
                <col style={statusColumnStyle} />
                <col style={ownerColumnStyle} />
                <col style={contractAddressColumnStyle} />
                <col style={paymentAddressColumnStyle} />
                <col style={usageColumnStyle} />
                <col style={createdColumnStyle} />
                <col style={actionColumnStyle} />
              </colgroup>
              <thead>
                <tr>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.contract" fallback="Contract" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="dashboard.status" fallback="Status" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.owner" fallback="Owner" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.contractAddress" fallback="Contract address" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.paymentAddress" fallback="Payment address" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.usage" fallback="Usage" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.created" fallback="Created" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="contractsAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!contracts.length ? (
                  <tr>
                    <td style={compactTableTdStyle} colSpan={9}><AdminText i18nKey="contractsAdmin.noContractNumbersMatchCurrentFilters" fallback="No contract numbers match the current filters." /></td>
                  </tr>
                ) : null}
                {contracts.map((contract) => (
                  <Fragment key={contract.id}>
                    <tr>
                      <td style={compactTableTdStyle}><strong>{contract.contractNumber}</strong></td>
                      <td style={compactTdStyle}>{contract.kitchen.name}</td>
                      <td style={compactTdStyle}><StatusBadge status={contract.isActive ? "ACTIVE" : "ARCHIVED"} /></td>
                      <td style={ownerTdStyle}>{ownerSummary(contract.owner)}</td>
                      <td style={addressTdStyle}>
                        <AddressColumn lines={contractAddressLines(contract)} emptyText={<AdminText i18nKey="contractsAdmin.noContractAddress" fallback="No contract address" />} />
                      </td>
                      <td style={addressTdStyle}>
                        <AddressColumn lines={contactAddressLines(contract.latestOrderAddress)} emptyText={<AdminText i18nKey="contractsAdmin.noPaymentAddress" fallback="No payment address" />} />
                      </td>
                      <td style={compactTdStyle}>
                        <span style={contract._count.orders ? usagePillUsedStyle : usagePillUnusedStyle}>
                          {usageLabel(contract._count.orders)}
                        </span>
                      </td>
                      <td style={compactTdStyle}>{formatDate(contract.createdAt)}</td>
                      <td style={actionTdStyle}>
                        <div style={contractActionStackStyle}>
                          <form action={`/api/admin/contracts/${contract.id}`} method="post">
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button
                              type="submit"
                              name="_intent"
                              value={contract.isActive ? "deactivate" : "reactivate"}
                              style={contractToggleButtonStyle}
                            >
                              {contract.isActive ? <AdminText i18nKey="contractsAdmin.deactivate" fallback="Deactivate" /> : <AdminText i18nKey="contractsAdmin.reactivate" fallback="Reactivate" />}
                            </button>
                          </form>
                          <details style={contractDeleteDetailsStyle}>
                            <summary style={contractDeleteSummaryStyle}><AdminText i18nKey="contractsAdmin.delete" fallback="Delete" /></summary>
                            <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractDeleteFormStyle}>
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button type="submit" name="_intent" value="delete" style={contractDeleteButtonStyle}>
                                <AdminText i18nKey="contractsAdmin.confirmDelete" fallback="Confirm delete" />
                              </button>
                            </form>
                          </details>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={contractUtilityTdStyle} colSpan={9}>
                        <div style={contractUtilityBarStyle}>
                          {contract._count.orders ? (
                            <details style={contractOrdersDetailsStyle}>
                              <summary className="contract-utility-summary" style={contractOrdersSummaryStyle}>
                                <AdminText i18nKey="contractsAdmin.viewOrdersForThisContract" fallback="View orders for this contract" />
                              </summary>
                              <ContractOrders contract={contract} />
                            </details>
                          ) : null}
                          <details style={contractEditDetailsStyle}>
                            <summary className="contract-utility-summary" style={contractEditSummaryStyle}>
                              <AdminText i18nKey="contractsAdmin.editContractDetailsFor" fallback="Edit contract details for" /> {contract.contractNumber}
                            </summary>
                            <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractEditFormStyle}>
                              <input type="hidden" name="_intent" value="update" />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
                                <input name="contractNumber" defaultValue={contract.contractNumber} style={compactInputStyle} required />
                              </FormField>
                              <AdminContractAddressFields contract={contract} compact />
                              <OwnerSelect owners={owners} defaultValue={contract.ownerId || ""} compact />
                              <div style={contractEditActionStyle}>
                                <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="contractsAdmin.saveContract" fallback="Save contract" /></button>
                              </div>
                            </form>
                          </details>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-list-cards" style={{ gap: cardListStyle.gap }}>
            {!contracts.length ? <p style={mutedTextStyle}><AdminText i18nKey="contractsAdmin.noContractNumbersMatchCurrentFilters" fallback="No contract numbers match the current filters." /></p> : null}
            {contracts.map((contract) => (
              <article key={contract.id} style={itemCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <strong>{contract.contractNumber}</strong>
                    <div style={subMetaStyle}>
                      <span>{contract.kitchen.name}</span>
                      <span><AdminText i18nKey="contractsAdmin.ownerLabel" fallback="Owner:" /> {ownerName(contract.owner)}</span>
                      <span>{compactAddressSummary(contract)}</span>
                      <span><AdminText i18nKey="contractsAdmin.createdLabel" fallback="Created:" /> {formatDate(contract.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={contract.isActive ? "ACTIVE" : "ARCHIVED"} />
                </div>
                <details style={contractOrdersDetailsStyle}>
                  <summary style={contractOrdersSummaryStyle}>
                    <span style={contract._count.orders ? usagePillUsedStyle : usagePillUnusedStyle}>
                      {usageLabel(contract._count.orders)}
                    </span>
                  </summary>
                  <ContractOrders contract={contract} />
                </details>
                <form action={`/api/admin/contracts/${contract.id}`} method="post">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button
                    type="submit"
                    name="_intent"
                    value={contract.isActive ? "deactivate" : "reactivate"}
                    style={secondaryButtonStyle}
                  >
                    {contract.isActive ? <AdminText i18nKey="contractsAdmin.deactivate" fallback="Deactivate" /> : <AdminText i18nKey="contractsAdmin.reactivate" fallback="Reactivate" />}
                  </button>
                </form>
                <details style={contractDeleteDetailsStyle}>
                  <summary style={contractDeleteSummaryStyle}><AdminText i18nKey="contractsAdmin.deleteContractNumber" fallback="Delete contract number" /></summary>
                  <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractDeleteFormStyle}>
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" name="_intent" value="delete" style={contractDeleteButtonStyle}>
                      <AdminText i18nKey="contractsAdmin.confirmDelete" fallback="Confirm delete" />
                    </button>
                  </form>
                </details>
                <details style={contractEditDetailsStyle}>
                  <summary style={contractEditSummaryStyle}><AdminText i18nKey="contractsAdmin.editContractDetails" fallback="Edit contract details" /></summary>
                  <form action={`/api/admin/contracts/${contract.id}`} method="post" style={contractEditFormStyle}>
                    <input type="hidden" name="_intent" value="update" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
                      <input name="contractNumber" defaultValue={contract.contractNumber} style={compactInputStyle} required />
                    </FormField>
                    <AdminContractAddressFields contract={contract} compact />
                    <OwnerSelect owners={owners} defaultValue={contract.ownerId || ""} compact />
                    <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="contractsAdmin.saveContract" fallback="Save contract" /></button>
                  </form>
                </details>
              </article>
            ))}
          </div>

          <style>{`
            .create-contract-summary::-webkit-details-marker {
              display: none;
            }

            .admin-list-cards {
              display: none;
            }

            .contract-utility-summary::-webkit-details-marker {
              display: none;
            }

            .contract-utility-summary::before {
              content: "›";
              display: inline-flex;
              margin-right: 8px;
              transition: transform 120ms ease;
            }

            details[open] > .contract-utility-summary::before {
              transform: rotate(90deg);
            }

            @media (max-width: 760px) {
              .admin-list-table {
                display: none;
              }

              .admin-list-cards {
                display: grid;
              }

              .contract-order-link {
                grid-template-columns: 1fr !important;
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

const createContractDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createContractSummaryStyle = {
  ...primaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createContractBodyStyle = {
  display: "grid",
  gap: 18,
  paddingTop: 8,
};

const createContractDescriptionStyle = {
  ...mutedTextStyle,
  margin: 0,
};

const contractActionStackStyle = {
  display: "grid",
  gap: 8,
  width: 124,
};

const contractTableStyle = {
  ...tableStyle,
  tableLayout: "fixed",
  minWidth: 1180,
};

const contractNumberColumnStyle = { width: "8%" };
const kitchenColumnStyle = { width: "8%" };
const statusColumnStyle = { width: "7%" };
const ownerColumnStyle = { width: "13%" };
const contractAddressColumnStyle = { width: "18%" };
const paymentAddressColumnStyle = { width: "18%" };
const usageColumnStyle = { width: "7%" };
const createdColumnStyle = { width: "8%" };
const actionColumnStyle = { width: "13%" };

const compactThStyle = {
  ...thStyle,
  padding: "12px 14px",
  letterSpacing: "0.08em",
};

const compactTableTdStyle = {
  ...tdStyle,
  padding: "14px 14px",
};

const compactTdStyle = {
  ...compactTableTdStyle,
  width: "1%",
  whiteSpace: "normal",
};

const ownerTdStyle = {
  ...compactTableTdStyle,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};

const addressTdStyle = {
  ...compactTableTdStyle,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  paddingRight: 10,
};

const actionTdStyle = {
  ...compactTableTdStyle,
  paddingRight: 10,
  whiteSpace: "nowrap",
};

const contractUtilityTdStyle = {
  padding: "0 16px 12px",
  borderBottom: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.72))",
};

const contractUtilityBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 10,
  alignItems: "start",
};

const contractEditDetailsStyle = {
  display: "grid",
  gap: 10,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "rgba(255,255,255,0.74)",
  padding: 0,
};

const contractEditSummaryStyle = {
  color: "var(--app-accent)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  listStyle: "none",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  width: "100%",
};

const contractEditFormStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
  padding: "0 12px 12px",
};

const contractEditActionStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gridColumn: "1 / -1",
};

const contractToggleButtonStyle = {
  ...secondaryButtonStyle,
  width: "100%",
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: "0.92rem",
};

const contractDeleteDetailsStyle = {
  display: "grid",
  gap: 6,
};

const contractDeleteSummaryStyle = {
  color: "#9f2d20",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const contractDeleteFormStyle = {
  display: "grid",
};

const contractDeleteButtonStyle = {
  ...secondaryButtonStyle,
  width: "100%",
  minHeight: 38,
  borderRadius: 8,
  padding: "8px 10px",
  color: "#9f2d20",
  borderColor: "rgba(159, 45, 32, 0.28)",
  background: "rgba(159, 45, 32, 0.06)",
  fontSize: "0.88rem",
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

const contractOrdersDetailsStyle = {
  display: "grid",
  gap: 10,
  borderRadius: 8,
  border: "1px solid rgba(45, 108, 121, 0.14)",
  background: "rgba(255,255,255,0.74)",
  padding: 0,
};

const contractOrdersSummaryStyle = {
  color: "var(--app-info-text)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  listStyle: "none",
  minHeight: 46,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  width: "100%",
};

const contractOrdersListStyle = {
  display: "grid",
  gap: 8,
  padding: "0 12px 12px",
};

const contractOrderLinkStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(190px, 1fr) minmax(260px, 2fr)",
  gap: 12,
  alignItems: "center",
  textDecoration: "none",
  color: "var(--app-text)",
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.9)",
  padding: "10px 12px",
};

const contractOrderMainStyle = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const contractOrderMetaStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const emptyOrdersStyle = {
  ...mutedTextStyle,
  margin: 0,
};

const addressBlockStyle = {
  display: "grid",
  minWidth: 0,
};

const addressLinesStyle = {
  display: "grid",
  gap: 2,
  color: "var(--app-text)",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

const emptyAddressStyle = {
  ...addressLinesStyle,
  color: "var(--app-text-muted)",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 38,
  padding: "6px 10px",
  fontSize: "0.92rem",
};
