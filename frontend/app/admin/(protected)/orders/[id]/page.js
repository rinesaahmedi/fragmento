import { OrderStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { getFormMessage } from "../../../../../lib/admin-forms";
import { getOrderById } from "../../../../../lib/catalog";
import {
  actionRowStyle,
  AdminSection,
  FlashMessage,
  FormField,
  MetricCard,
  PageHero,
  StatusBadge,
  dangerButtonStyle,
  formGridStyle,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../../components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <div style={pageGridStyle}>
      <PageHero
        eyebrow="Order Detail"
        title={order.orderNumber}
        description={`Review the customer details, selected catalog items, and current order state for ${order.kitchen.name}.`}
        stats={[
          <MetricCard key="status" label="Status" value={order.status} />,
          <MetricCard key="total" label="Total" value={`${Number(order.totalPrice).toFixed(2)} EUR`} />,
          <MetricCard key="items" label="Items" value={String(order.items.length)} />,
          <MetricCard key="kitchen" label="Kitchen" value={order.kitchen.slug} />,
        ]}
      />

      {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
      {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

      <div style={splitGridStyle}>
        <AdminSection title="Customer" description="Primary customer and delivery information.">
          <div style={{ display: "grid", gap: 10 }}>
            <DetailRow label="Name" value={`${order.firstName} ${order.lastName}`} />
            <DetailRow label="Email" value={order.email} />
            <DetailRow label="Phone" value={order.phone} />
            <DetailRow
              label="Address"
              value={`${order.address1}${order.address2 ? `, ${order.address2}` : ""}, ${order.postalCode} ${order.city}`}
            />
            <DetailRow label="Kitchen" value={order.kitchen.name} />
          </div>
        </AdminSection>

        <AdminSection title="Order status" description="Keep fulfillment state aligned with the actual operational step.">
          <form action={`/api/admin/orders/${order.id}`} method="post" style={formGridStyle}>
            <input type="hidden" name="_intent" value="status" />
            <FormField label="Current status">
              <div
                style={{
                  ...inputStyle,
                  display: "flex",
                  alignItems: "center",
                  background: "var(--app-surface-muted)",
                }}
              >
                <StatusBadge status={order.status} />
              </div>
            </FormField>
            <FormField label="Update to">
              <select name="status" defaultValue={order.status} style={inputStyle}>
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </FormField>
            <button type="submit" style={primaryButtonStyle}>Update status</button>
          </form>

          <div style={actionRowStyle}>
            <form action={`/api/admin/orders/${order.id}`} method="post">
              <input type="hidden" name="_intent" value="resend-email" />
              <button type="submit" style={secondaryButtonStyle}>Resend email</button>
            </form>

            <form action={`/api/admin/orders/${order.id}`} method="post">
              <input type="hidden" name="_intent" value="retry-webhook" />
              <button type="submit" style={secondaryButtonStyle}>Retry webhook</button>
            </form>

            <form action={`/api/admin/orders/${order.id}`} method="post">
              <input type="hidden" name="_intent" value="confirm" />
              <button type="submit" style={primaryButtonStyle}>Mark confirmed</button>
            </form>

            <form action={`/api/admin/orders/${order.id}`} method="post">
              <input type="hidden" name="_intent" value="cancel" />
              <button type="submit" style={dangerButtonStyle}>Cancel order</button>
            </form>
          </div>
        </AdminSection>
      </div>

      <AdminSection title="Selected items" description="Catalog snapshot stored with the order at submission time.">
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}><StatusBadge status={item.itemType} /></td>
                  <td style={tdStyle}>{item.code}</td>
                  <td style={tdStyle}>{item.nameSnapshot}</td>
                  <td style={tdStyle}>{Number(item.priceSnapshot).toFixed(2)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "grid", gap: 4, paddingBottom: 12, borderBottom: "1px solid var(--app-border)" }}>
      <span style={{ color: "var(--app-text-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
      <strong style={{ color: "var(--app-text)", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}
