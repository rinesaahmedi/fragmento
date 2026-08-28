import Link from "next/link";
import { AdminText } from "./admin-i18n";
import AdminConfirmSubmitButton from "./admin-confirm-submit-button";
import { cancellationEmailNeedsAttention, cancellationRequiresRefund } from "../lib/order-cancellations";

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

function StatusBadge({ status }) {
  const value = String(status || "").toUpperCase();
  if (value === "APPROVED") {
    return <span style={{ ...badgeStyle, ...approvedBadgeStyle }}><AdminText i18nKey="orderCancellationsAdmin.statusApproved" fallback="Approved" /></span>;
  }
  if (value === "REJECTED") {
    return <span style={{ ...badgeStyle, ...rejectedBadgeStyle }}><AdminText i18nKey="orderCancellationsAdmin.statusRejected" fallback="Rejected" /></span>;
  }
  return <span style={{ ...badgeStyle, ...receivedBadgeStyle }}><AdminText i18nKey="orderCancellationsAdmin.badgeReceived" fallback="Widerruf eingegangen" /></span>;
}

function EmailStatusRow({ labelKey, labelFallback, status, sentAt }) {
  const value = String(status || "PENDING").toUpperCase();
  const tone = value === "SENT" ? emailSentStyle : value === "FAILED" ? emailFailedStyle : emailPendingStyle;
  return (
    <div style={emailRowStyle}>
      <span style={emailLabelStyle}><AdminText i18nKey={labelKey} fallback={labelFallback} /></span>
      <span style={{ ...emailStatusPillStyle, ...tone }}>{value}</span>
      {sentAt ? <span style={emailSentAtStyle}>{formatDateTime(sentAt)}</span> : null}
    </div>
  );
}

function Detail({ labelKey, labelFallback, children }) {
  if (!children) return null;
  return (
    <div>
      <span style={detailLabelStyle}><AdminText i18nKey={labelKey} fallback={labelFallback} /></span>
      <span style={detailValueStyle}>{children}</span>
    </div>
  );
}

export function CancellationRequestPanel({ requests = [], returnPath = "/admin/order-cancellations", showOrderLink = true }) {
  if (!requests.length) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {requests.map((request) => {
        const isOpen = String(request.status).toUpperCase() === "RECEIVED";
        const needsAttention = cancellationEmailNeedsAttention(request);
        const refundRequired = cancellationRequiresRefund(request);
        const canApprove = Boolean(request.orderId);

        return (
          <article key={request.id} style={cardStyle}>
            <header style={cardHeaderStyle}>
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <span style={referenceStyle}>{request.referenceNumber}</span>
                <span style={cardMetaStyle}>{formatDateTime(request.receivedAt)}</span>
              </div>
              <StatusBadge status={request.status} />
            </header>

            {refundRequired ? (
              <div style={{ ...noticeStyle, ...refundNoticeStyle }}>
                <AdminText i18nKey="orderCancellationsAdmin.refundRequired" fallback="Refund required: the order was paid. Cancel the order but process the refund manually." />
              </div>
            ) : null}

            <div style={detailGridStyle}>
              <Detail labelKey="orderDetailAdmin.contractNumber" labelFallback="Contract number">{request.submittedContractNumber}</Detail>
              <Detail labelKey="kitchenDetailAdmin.name" labelFallback="Name">{request.consumerName}</Detail>
              <Detail labelKey="adminShellLogin.email" labelFallback="Email">
                <a href={`mailto:${request.confirmationEmail}`} style={linkStyle}>{request.confirmationEmail}</a>
              </Detail>
              {showOrderLink ? (
                <Detail labelKey="orderCancellationsAdmin.linkedOrder" labelFallback="Linked order">
                  {request.order ? (
                    <Link href={`/admin/orders/${request.order.id}`} style={linkStyle}>{request.order.orderNumber}</Link>
                  ) : (
                    <span style={{ color: "var(--app-danger-text)", fontWeight: 700 }}>
                      <AdminText i18nKey="orderCancellationsAdmin.manualMatch" fallback="Manual match required" />
                    </span>
                  )}
                </Detail>
              ) : null}
              {request.processedAt ? (
                <Detail labelKey="orderCancellationsAdmin.processedAt" labelFallback="Processed">{formatDateTime(request.processedAt)}</Detail>
              ) : null}
            </div>

            <div style={declarationStyle}>
              <span style={detailLabelStyle}><AdminText i18nKey="orderCancellationsAdmin.declaration" fallback="Declaration" /></span>
              <p style={{ margin: "4px 0 0" }}>{request.declarationText}</p>
            </div>

            {request.reason ? (
              <div style={declarationStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderCancellationsAdmin.reason" fallback="Reason" /></span>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{request.reason}</p>
              </div>
            ) : null}

            {request.adminNote ? (
              <div style={declarationStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderCancellationsAdmin.adminNote" fallback="Admin note" /></span>
                <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{request.adminNote}</p>
              </div>
            ) : null}

            <div style={emailBlockStyle}>
              <EmailStatusRow labelKey="orderCancellationsAdmin.customerEmail" labelFallback="Customer receipt" status={request.customerEmailStatus} sentAt={request.customerEmailSentAt} />
              <EmailStatusRow labelKey="orderCancellationsAdmin.internalEmail" labelFallback="Internal notice" status={request.internalEmailStatus} sentAt={request.internalEmailSentAt} />
              <EmailStatusRow labelKey="orderCancellationsAdmin.finalEmail" labelFallback="Decision email" status={request.finalEmailStatus} sentAt={request.finalEmailSentAt} />
              {request.lastEmailError ? (
                <p style={emailErrorStyle}>{request.lastEmailError}</p>
              ) : null}
            </div>

            <div style={actionsRowStyle}>
              {isOpen ? (
                <>
                  {canApprove ? (
                    <form action={`/api/admin/order-cancellations/${request.id}`} method="post" style={actionFormStyle}>
                      <input type="hidden" name="_intent" value="approve" />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <label style={noteLabelStyle}>
                        <AdminText i18nKey="orderCancellationsAdmin.approveNote" fallback="Approval note (optional)" />
                        <textarea name="adminNote" rows={2} maxLength={2000} style={noteInputStyle} />
                      </label>
                      <AdminConfirmSubmitButton
                        name="_submit"
                        value="approve"
                        style={approveButtonStyle}
                        confirmKey="orderCancellationsAdmin.approveConfirm"
                        confirmFallback={"Approve this withdrawal?\nThe order will be marked as cancelled."}
                      >
                        <AdminText i18nKey="orderCancellationsAdmin.approve" fallback="Approve" />
                      </AdminConfirmSubmitButton>
                    </form>
                  ) : (
                    <p style={hintStyle}>
                      <AdminText i18nKey="orderCancellationsAdmin.approveNeedsMatch" fallback="Match this request to an order before approving." />
                    </p>
                  )}

                  <form action={`/api/admin/order-cancellations/${request.id}`} method="post" style={actionFormStyle}>
                    <input type="hidden" name="_intent" value="reject" />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <label style={noteLabelStyle}>
                      <AdminText i18nKey="orderCancellationsAdmin.rejectNote" fallback="Rejection explanation (required)" />
                      <textarea name="adminNote" rows={2} maxLength={2000} required style={noteInputStyle} />
                    </label>
                    <AdminConfirmSubmitButton
                      name="_submit"
                      value="reject"
                      style={rejectButtonStyle}
                      confirmKey="orderCancellationsAdmin.rejectConfirm"
                      confirmFallback={"Reject this withdrawal?\nThe order stays unchanged and the customer is notified."}
                    >
                      <AdminText i18nKey="orderCancellationsAdmin.reject" fallback="Reject" />
                    </AdminConfirmSubmitButton>
                  </form>
                </>
              ) : null}

              {needsAttention ? (
                <form action={`/api/admin/order-cancellations/${request.id}`} method="post" style={{ margin: 0 }}>
                  <input type="hidden" name="_intent" value="retry-emails" />
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <button type="submit" style={resendButtonStyle}>
                    <AdminText i18nKey="orderCancellationsAdmin.resendEmails" fallback="Resend emails" />
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

const cardStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.82)",
  padding: 18,
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const referenceStyle = {
  fontWeight: 900,
  fontSize: "1.05rem",
  color: "var(--app-text)",
  overflowWrap: "anywhere",
};

const cardMetaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
};

const badgeStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "7px 11px",
  border: "1px solid transparent",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const receivedBadgeStyle = {
  color: "#8a5a13",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const approvedBadgeStyle = {
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const rejectedBadgeStyle = {
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const noticeStyle = {
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 800,
  fontSize: 14,
};

const refundNoticeStyle = {
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.1)",
  border: "1px solid rgba(217, 92, 92, 0.24)",
};

const detailGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const detailLabelStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-text-muted)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const detailValueStyle = {
  color: "var(--app-text)",
  overflowWrap: "anywhere",
};

const declarationStyle = {
  borderTop: "1px solid var(--app-border)",
  paddingTop: 12,
  color: "var(--app-text)",
};

const linkStyle = {
  color: "var(--app-accent)",
  textDecoration: "none",
  fontWeight: 800,
};

const emailBlockStyle = {
  display: "grid",
  gap: 8,
  borderTop: "1px solid var(--app-border)",
  paddingTop: 12,
};

const emailRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const emailLabelStyle = {
  minWidth: 140,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const emailStatusPillStyle = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.04em",
};

const emailSentStyle = { color: "#1f6f43", background: "rgba(42, 145, 85, 0.12)" };
const emailFailedStyle = { color: "var(--app-danger-text)", background: "rgba(217, 92, 92, 0.12)" };
const emailPendingStyle = { color: "var(--app-text-muted)", background: "rgba(115, 80, 55, 0.08)" };

const emailSentAtStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
};

const emailErrorStyle = {
  margin: 0,
  color: "var(--app-danger-text)",
  fontSize: 13,
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const actionsRowStyle = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const actionFormStyle = {
  display: "grid",
  gap: 8,
  margin: 0,
  flex: "1 1 240px",
  minWidth: 220,
};

const noteLabelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const noteInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 8,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.94)",
  padding: "9px 11px",
  fontSize: "0.92rem",
  color: "var(--app-text)",
  resize: "vertical",
};

const baseActionButtonStyle = {
  minHeight: 44,
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 800,
  fontSize: "0.95rem",
  cursor: "pointer",
};

const approveButtonStyle = {
  ...baseActionButtonStyle,
  border: "1px solid rgba(42, 145, 85, 0.28)",
  background: "rgba(42, 145, 85, 0.12)",
  color: "#1f6f43",
};

const rejectButtonStyle = {
  ...baseActionButtonStyle,
  border: "1px solid rgba(217, 92, 92, 0.28)",
  background: "rgba(217, 92, 92, 0.1)",
  color: "var(--app-danger-text)",
};

const resendButtonStyle = {
  ...baseActionButtonStyle,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.7)",
  color: "var(--app-text-muted)",
};

const hintStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
};
