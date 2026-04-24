import { OrderStatus } from "@prisma/client";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  StatusBadge,
  actionRowStyle,
  dangerButtonStyle,
  itemCardStyle,
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
import { AdminText } from "../../../../components/admin-i18n";
import { OrderActionButton, OrderActionFeedback } from "../../../../components/admin-order-action-buttons";
import { OrderEmailReviewModal } from "../../../../components/order-email-review-modal";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getOrderById } from "../../../../lib/catalog";
import { buildOrderConfirmationEmailDraft, buildOrderConfirmationEmailStaticHtml } from "../../../../lib/email/order-notifications";
import { buildOrderForNotifications } from "../../../../lib/orders";

export const dynamic = "force-dynamic";

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

function formatOrdinal(value) {
  const number = Number(value || 0);
  if (!number) return "";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function ownerSummary(owner) {
  if (!owner) return "No owner selected";
  const name = owner.name || "";
  const contact = [owner.email, owner.phone].filter(Boolean).join(" | ");
  return contact ? `${name} | ${contact}` : name;
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
          <AdminSection title={<AdminText i18nKey="orderDetailAdmin.orderNotFound" fallback="Order not found" />} description={<AdminText i18nKey="orderDetailAdmin.requestedOrderDoesNotExist" fallback="The requested order does not exist." />}>
            <ActionLink href="/admin/orders"><AdminText i18nKey="orderDetailAdmin.backToOrders" fallback="Back to orders" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const canConfirm = order.status === OrderStatus.NEW;
  const canResendEmail = order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.EMAILED;
  const canCancel = order.status !== OrderStatus.CANCELLED;
  const notificationOrder = buildOrderForNotifications(order);
  const emailDraft = buildOrderConfirmationEmailDraft(notificationOrder);
  const emailStatic = await buildOrderConfirmationEmailStaticHtml(notificationOrder);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={`Order ${order.orderNumber}`}
          description={<AdminText i18nKey="orderDetailAdmin.fullSavedOrderDetailsFromPublicConfigurator" fallback="Full saved order details from the public configurator." />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/orders"><AdminText i18nKey="orderDetailAdmin.backToOrders" fallback="Back to orders" /></ActionLink>
              <ActionLink href={`/kitchens/${order.kitchen.slug}`}><AdminText i18nKey="orderDetailAdmin.openKitchen" fallback="Open kitchen" /></ActionLink>
            </div>
          }
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <form action={`/api/admin/orders/${order.id}`} method="post" style={actionPanelStyle}>
            <div style={actionSummaryStyle}>
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></span>
                <StatusBadge status={order.status} />
              </div>
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.total" fallback="Total" /></span>
                <strong>{formatCurrency(order.totalPrice)}</strong>
              </div>
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" /></span>
                <strong>{order.contractNumber || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</strong>
              </div>
            </div>
            <div style={actionButtonsStyle}>
              <OrderEmailReviewModal
                to={order.email}
                defaultSubject={emailDraft.subject}
                defaultBody={emailDraft.bodyText}
                staticHtml={emailStatic.html}
                canConfirm={canConfirm}
                canResendEmail={canResendEmail}
              />
              {canCancel ? (
                <OrderActionButton intent="cancel" style={dangerButtonStyle}>
                  <AdminText i18nKey="orderDetailAdmin.markCancelled" fallback="Mark cancelled" />
                </OrderActionButton>
              ) : null}
              <OrderActionButton
                intent="retry-webhook"
                style={secondaryButtonStyle}
                pendingKey="orderDetailAdmin.retryingWebhook"
                pendingFallback="Retrying webhook..."
              >
                <AdminText i18nKey="orderDetailAdmin.retryWebhook" fallback="Retry webhook" />
              </OrderActionButton>
            </div>
            <OrderActionFeedback />
          </form>

          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <strong style={{ fontSize: "1.1rem" }}><AdminText i18nKey="orderDetailAdmin.orderSummary" fallback="Order summary" /></strong>
                <div style={subMetaStyle}>
                  <span>{order.kitchen.name}</span>
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{order.items.length} <AdminText i18nKey="orderDetailAdmin.itemCount" fallback="Items" /></span>
                  {order.contractOrderSequence ? (
                    <span>{formatOrdinal(order.contractOrderSequence)} <AdminText i18nKey="orderDetailAdmin.orderForThisContract" fallback="order for this contract" /></span>
                  ) : null}
                </div>
              </div>

              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></span>
                  <div><StatusBadge status={order.status} /></div>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.total" fallback="Total" /></span>
                  <strong style={{ fontSize: "1.1rem" }}>{formatCurrency(order.totalPrice)}</strong>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" /></span>
                  <span>{order.contractNumber || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractOrder" fallback="Contract order" /></span>
                  <span>
                    {order.contractOrderSequence
                      ? <>{formatOrdinal(order.contractOrderSequence)} <AdminText i18nKey="orderDetailAdmin.orderForThisContract" fallback="order for this contract" /></>
                      : <AdminText i18nKey="orderDetailAdmin.notAvailable" fallback="Not available" />}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractAccess" fallback="Contract access" /></span>
                  <span>
                    {order.kitchenContract
                      ? order.kitchenContract.isActive
                        ? <AdminText i18nKey="orderDetailAdmin.linkedReusableActiveContract" fallback="Linked reusable active contract" />
                        : <AdminText i18nKey="orderDetailAdmin.linkedReusableInactiveContract" fallback="Linked reusable inactive contract" />
                      : <AdminText i18nKey="orderDetailAdmin.noLinkedContractRecord" fallback="No linked contract record" />}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.propertyOwner" fallback="Property owner" /></span>
                  <span>{ownerSummary(order.kitchenContract?.owner)}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="contractsAdmin.propertyObject" fallback="Property object" /></span>
                  <span>{order.kitchenContract?.propertyObject?.name || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.payment" fallback="Payment" /></span>
                  <span>{order.paymentMethod || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
              </div>
            </article>

            <article style={itemCardStyle}>
              <strong style={{ fontSize: "1.1rem" }}><AdminText i18nKey="orderDetailAdmin.customer" fallback="Customer" /></strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" /></span>
                  <span>{order.firstName} {order.lastName}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="adminShellLogin.email" fallback="Email" /></span>
                  <a href={`mailto:${order.email}`} style={inlineLinkStyle}>{order.email}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" /></span>
                  <a href={`tel:${order.phone}`} style={inlineLinkStyle}>{order.phone}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.address" fallback="Address" /></span>
                  <span>
                    {order.address1}
                    {order.address2 ? `, ${order.address2}` : ""}
                    {`, ${order.postalCode} ${order.city}`}
                    {order.country ? `, ${order.country}` : ""}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.notes" fallback="Notes" /></span>
                  <span>{order.notes || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
              </div>
            </article>
          </div>
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="orderDetailAdmin.orderItems" fallback="Order items" />}
          description={<AdminText i18nKey="orderDetailAdmin.snapshotOfAllItemsSavedWithThisOrder" fallback="Snapshot of all items saved with this order." />}
        >
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.item" fallback="Item" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.type" fallback="Type" /></th>
                  <th style={thStyle}><AdminText i18nKey="kitchenDetailAdmin.itemCode" fallback="Item Code" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.unitPrice" fallback="Unit price" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></th>
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

const actionPanelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,242,0.74))",
  padding: 18,
};

const actionSummaryStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const actionMetricStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const actionButtonsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};
