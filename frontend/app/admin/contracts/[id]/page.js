import Link from "next/link";
import {
  ActionLink,
  AdminSection,
  FormField,
  actionRowStyle,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import AdminContractLinkFields from "../../../../components/admin-contract-link-fields";
import { AdminDateTime, AdminKitchenDisplayName, AdminStatusBadge, AdminText } from "../../../../components/admin-i18n";
import { requireAdminPage } from "../../../../lib/auth";
import { getKitchenContractForAdmin, listKitchensForAdmin, listProjectsForAdmin, listPropertyOwnersForAdmin } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function CountryName({ country }) {
  if (country === "Germany" || country === "Deutschland") return <AdminText i18nKey="contractsAdmin.germany" fallback="Germany" />;
  if (country === "Austria" || country === "\u00d6sterreich") return <AdminText i18nKey="contractsAdmin.austria" fallback="Austria" />;
  return country || "";
}

function ProjectStatusText({ status }) {
  const statusKey = String(status || "").toLowerCase();
  return <AdminText i18nKey={`status.${statusKey}`} fallback={statusKey.replace(/_/g, " ")} />;
}

function DetailField({ label, children }) {
  return (
    <div style={detailFieldStyle}>
      <span style={detailLabelStyle}>{label}</span>
      <div style={detailValueStyle}>{children || "-"}</div>
    </div>
  );
}

function AddressLines({ lines }) {
  const displayLines = lines.filter(Boolean);
  if (!displayLines.length) return "-";
  return (
    <div style={lineStackStyle}>
      {displayLines.map((line, index) => (
        <span key={`${String(line)}-${index}`}>{line}</span>
      ))}
    </div>
  );
}

function contractAddressLines(contract) {
  return [
    contract.projectName ? `Project: ${contract.projectCode ? `${contract.projectCode} - ` : ""}${contract.projectName}` : "",
    contract.projectStatus ? <>Status: <ProjectStatusText status={contract.projectStatus} /></> : "",
    contract.propertyObject?.name ? `Object / Building: ${contract.propertyObject.name}` : "",
    [contract.address1, contract.address2].filter(Boolean).join(", "),
    [contract.postalCode, contract.city].filter(Boolean).join(" "),
    contract.country ? <CountryName country={contract.country} /> : "",
    [contract.building ? `Building ${contract.building}` : "", contract.floor ? `Floor ${contract.floor}` : "", contract.unitNumber ? `Unit ${contract.unitNumber}` : ""].filter(Boolean).join(" | "),
  ];
}

function billingAddressLines(contract) {
  const address = contract.latestOrderAddress;
  if (!address) return [];
  return [
    [address.firstName, address.lastName].filter(Boolean).join(" "),
    [address.address1, address.address2].filter(Boolean).join(", "),
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country ? <CountryName country={address.country} /> : "",
  ];
}

function contactLines(registration) {
  if (!registration) return [];
  return [
    registration.fullName,
    registration.email,
    registration.phone,
    registration.addressNote,
    registration.verifiedAt ? <>Verified: <AdminDateTime value={registration.verifiedAt} /></> : "",
  ];
}

function OrderList({ orders }) {
  if (!orders?.length) {
    return <p style={mutedTextStyle}>No orders for this contract number yet.</p>;
  }
  return (
    <div style={listStyle}>
      {orders.map((order) => (
        <Link key={order.id} href={`/admin/orders/${order.id}`} style={listItemLinkStyle}>
          <strong>{order.orderNumber}</strong>
          <span style={itemMetaStyle}>
            <AdminStatusBadge status={order.status} />
            <span>{[order.firstName, order.lastName].filter(Boolean).join(" ") || "-"}</span>
            <span>{formatCurrency(order.totalPrice)}</span>
            <span><AdminDateTime value={order.createdAt} /></span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function RegistrationHistory({ contract }) {
  const active = contract.activeRegistration ? [contract.activeRegistration] : [];
  const pending = contract.pendingRegistrations || [];
  const previous = contract.previousRegistrations || [];
  const entries = [
    ...active.map((entry) => ({ ...entry, statusLabel: "Active owner" })),
    ...pending.map((entry) => ({ ...entry, statusLabel: "Pending email verification" })),
    ...previous.map((entry) => ({ ...entry, statusLabel: "Previous owner" })),
  ];

  if (!entries.length) {
    return <p style={mutedTextStyle}>No registration history yet.</p>;
  }

  return (
    <div style={listStyle}>
      {entries.map((entry) => (
        <div key={entry.id} style={historyItemStyle}>
          <div style={historyHeaderStyle}>
            <strong>{entry.fullName || "-"}</strong>
            <span style={historyStatusStyle}>{entry.statusLabel}</span>
          </div>
          <AddressLines lines={[
            entry.email,
            entry.phone,
            entry.addressNote,
            entry.verifiedAt ? <>Verified: <AdminDateTime value={entry.verifiedAt} /></> : "",
            entry.deactivatedAt ? <>Deactivated: <AdminDateTime value={entry.deactivatedAt} /></> : "",
            entry.verificationExpiresAt && !entry.verifiedAt ? <>Code expires: <AdminDateTime value={entry.verificationExpiresAt} /></> : "",
          ]} />
        </div>
      ))}
    </div>
  );
}

export default async function AdminContractDetailPage({ params }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const [contract, kitchens, owners, projects] = await Promise.all([
    getKitchenContractForAdmin(id),
    listKitchensForAdmin(),
    listPropertyOwnersForAdmin(),
    listProjectsForAdmin(),
  ]);

  if (!contract) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title="Contract not found">
            <ActionLink href="/admin/contracts">Back to contract numbers</ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const returnTo = `/admin/contracts/${contract.id}`;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={`Contract ${contract.contractNumber}`}
          description={<AdminKitchenDisplayName slug={contract.kitchen.slug} name={contract.kitchen.name} />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/contracts">Back to contract numbers</ActionLink>
              <ActionLink href="#orders">Orders</ActionLink>
              <ActionLink href="#registration-history">Registration history</ActionLink>
              <ActionLink href="#edit-contract">Edit contract</ActionLink>
            </div>
          }
        >
          <div style={summaryGridStyle}>
            <DetailField label="Status"><AdminStatusBadge status={contract.isActive ? "ACTIVE" : "INACTIVE"} /></DetailField>
            <DetailField label="Housing company">{contract.owner?.name || "No housing company selected"}</DetailField>
            <DetailField label="Created"><AdminDateTime value={contract.createdAt} /></DetailField>
            <DetailField label="Usage">{contract._count.orders ? `${contract._count.orders} order(s)` : "Unused"}</DetailField>
          </div>
        </AdminSection>

        <AdminSection title="Overview">
          <div style={overviewGridStyle}>
            <DetailField label="Contract address"><AddressLines lines={contractAddressLines(contract)} /></DetailField>
            <DetailField label="Billing address"><AddressLines lines={billingAddressLines(contract)} /></DetailField>
            <DetailField label="Registered owner"><AddressLines lines={contactLines(contract.activeRegistration)} /></DetailField>
            <DetailField label="Notes">{contract.notes || "-"}</DetailField>
          </div>
        </AdminSection>

        <AdminSection id="orders" title="Orders">
          <div id="orders" />
          <OrderList orders={contract.orders || []} />
        </AdminSection>

        <AdminSection title="Registration history">
          <div id="registration-history" />
          <RegistrationHistory contract={contract} />
        </AdminSection>

        <AdminSection title="Edit contract">
          <div id="edit-contract" />
          <form action={`/api/admin/contracts/${contract.id}`} method="post" style={editFormStyle}>
            <input type="hidden" name="_intent" value="update" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <FormField label="Contract number">
              <input name="contractNumber" defaultValue={contract.contractNumber} style={inputStyle} required />
            </FormField>
            <FormField label="Kitchen">
              <select name="kitchenId" defaultValue={contract.kitchenId} style={inputStyle} required>
                {kitchens.map((kitchen) => (
                  <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
                ))}
              </select>
            </FormField>
            <AdminContractLinkFields
              owners={owners}
              projects={projects}
              defaultHousingCompanyId={contract.housingCompanyId || ""}
              defaultProjectId={contract.projectId || ""}
              contract={contract}
            />
            <div style={editActionsStyle}>
              <button type="submit" style={primaryButtonStyle}>Save contract</button>
            </div>
          </form>

          <div style={dangerActionsStyle}>
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
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const summaryGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const overviewGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const detailFieldStyle = {
  display: "grid",
  gap: 7,
  minWidth: 0,
};

const detailLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.08em",
  lineHeight: 1.25,
  textTransform: "uppercase",
};

const detailValueStyle = {
  color: "var(--app-text)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.45,
};

const lineStackStyle = {
  display: "grid",
  gap: 4,
};

const listStyle = {
  display: "grid",
  gap: 10,
};

const listItemLinkStyle = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
  color: "var(--app-text)",
  textDecoration: "none",
};

const itemMetaStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const historyItemStyle = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 10,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
};

const historyHeaderStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const historyStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "var(--app-accent-soft)",
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
};

const editFormStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "end",
};

const editActionsStyle = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "flex-end",
};

const dangerActionsStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};
