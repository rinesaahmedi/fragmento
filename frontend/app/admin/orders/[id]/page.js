import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  StatusBadge,
  actionRowStyle,
  checkboxRowStyle,
  inputStyle,
  itemCardStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  subMetaStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getOrderById } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

const ORDER_STATUS_OPTIONS = Object.values(OrderStatus);

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const order = await getOrderById(id);

  if (!order) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title="Order not found" description="The requested order does not exist.">
            <ActionLink href="/admin/orders">Back to orders</ActionLink>
          </AdminSection>
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
          title={`Order ${order.orderNumber}`}
          description="Full saved order details from the public configurator."
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/orders">Back to orders</ActionLink>
              <ActionLink href={`/kitchens/${order.kitchen.slug}`}>Open kitchen</ActionLink>
            </div>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <strong style={{ fontSize: "1.1rem" }}>Order summary</strong>
                <div style={subMetaStyle}>
                  <span>{order.kitchen.name}</span>
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{order.items.length} item(s)</span>
                </div>
              </div>

              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}>Status</span>
                  <div><StatusBadge status={order.status} /></div>
                </div>
                <div>
                  <span style={detailLabelStyle}>Total</span>
                  <strong style={{ fontSize: "1.1rem" }}>{formatCurrency(order.totalPrice)}</strong>
                </div>
                <div>
                  <span style={detailLabelStyle}>Contract number</span>
                  <span>{order.contractNumber || "Not provided"}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Contract access</span>
                  <span>
                    {order.kitchenContract
                      ? order.kitchenContract.isActive
                        ? "Linked reusable active contract"
                        : "Linked reusable inactive contract"
                      : "No linked contract record"}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Payment</span>
                  <span>{order.paymentMethod || "Not provided"}</span>
                </div>
              </div>
            </article>

            <article style={itemCardStyle}>
              <strong style={{ fontSize: "1.1rem" }}>Customer</strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}>Name</span>
                  <span>{order.firstName} {order.lastName}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Email</span>
                  <a href={`mailto:${order.email}`} style={inlineLinkStyle}>{order.email}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}>Phone</span>
                  <a href={`tel:${order.phone}`} style={inlineLinkStyle}>{order.phone}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}>Address</span>
                  <span>
                    {order.address1}
                    {order.address2 ? `, ${order.address2}` : ""}
                    {`, ${order.postalCode} ${order.city}`}
                    {order.country ? `, ${order.country}` : ""}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}>Notes</span>
                  <span>{order.notes || "Not provided"}</span>
                </div>
              </div>
            </article>
          </div>
        </AdminSection>

        <AdminSection
          title="Order items"
          description="Snapshot of all items saved with this order."
        >
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Item Code</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Unit price</th>
                  <th style={thStyle}>Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <strong>{item.nameSnapshot}</strong>
                    </td>
                    <td style={tdStyle}>{item.itemType}</td>
                    <td style={tdStyle}>{item.code}</td>
                    <td style={tdStyle}>{item.quantity}</td>
                    <td style={tdStyle}>{formatCurrency(item.priceSnapshot)}</td>
                    <td style={tdStyle}>{formatCurrency(Number(item.priceSnapshot) * Number(item.quantity || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection
          title="Order actions"
          description="Update status or resend external notifications for this order."
        >
          <form action={`/api/admin/orders/${order.id}`} method="post" style={actionFormStyle}>
            <FormField label="Status">
              <select name="status" defaultValue={order.status} style={inputStyle}>
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <div style={{ ...actionRowStyle, alignSelf: "end" }}>
              <button type="submit" style={primaryButtonStyle}>Save status</button>
              <button type="submit" name="_intent" value="confirm" style={secondaryButtonStyle}>Mark confirmed</button>
              <button type="submit" name="_intent" value="cancel" style={secondaryButtonStyle}>Mark cancelled</button>
              <button type="submit" name="_intent" value="resend-email" style={secondaryButtonStyle}>Resend email</button>
              <button type="submit" name="_intent" value="retry-webhook" style={secondaryButtonStyle}>Retry webhook</button>
            </div>
          </form>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const detailGridStyle = {
  display: "grid",
  gap: 14,
};

const detailLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inlineLinkStyle = {
  color: "var(--app-accent)",
  textDecoration: "none",
};

const actionFormStyle = {
  display: "grid",
  gap: 16,
};
