import Link from "next/link";
import { AdminText } from "./admin-i18n";
import AdminConfirmSubmitButton from "./admin-confirm-submit-button";
import { cancellationEmailNeedsAttention, cancellationRequiresRefund } from "../lib/order-cancellations";
import styles from "./admin-order-cancellations.module.css";

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function StatusBadge({ status }) {
  const value = String(status || "").toUpperCase();
  const tone = value === "APPROVED" ? styles.approved : value === "REJECTED" ? styles.rejected : styles.received;
  const key = value === "APPROVED" ? "statusApproved" : value === "REJECTED" ? "statusRejected" : "badgeReceived";
  const fallback = value === "APPROVED" ? "Approved" : value === "REJECTED" ? "Rejected" : "Withdrawal received";
  return <span className={`${styles.status} ${tone}`}><AdminText i18nKey={`orderCancellationsAdmin.${key}`} fallback={fallback} /></span>;
}

function Detail({ labelKey, labelFallback, children }) {
  if (!children) return null;
  return <div className={styles.detail}><span className={styles.label}><AdminText i18nKey={labelKey} fallback={labelFallback} /></span><div className={styles.value}>{children}</div></div>;
}

function EmailStatusRow({ labelKey, labelFallback, status, sentAt }) {
  const value = String(status || "PENDING").toUpperCase();
  const tone = value === "SENT" ? styles.sent : value === "FAILED" ? styles.failed : styles.pending;
  return <div className={styles.emailRow}>
    <span><AdminText i18nKey={labelKey} fallback={labelFallback} /></span>
    <span className={`${styles.emailStatus} ${tone}`}>{value}</span>
    {sentAt ? <time>{formatDateTime(sentAt)}</time> : null}
  </div>;
}

export function CancellationRequestPanel({ requests = [], returnPath = "/admin/order-cancellations", showOrderLink = true }) {
  if (!requests.length) return null;

  return <div className={styles.list}>
    {requests.map((request) => {
      const isOpen = String(request.status).toUpperCase() === "RECEIVED";
      const needsAttention = cancellationEmailNeedsAttention(request);
      const refundRequired = cancellationRequiresRefund(request);
      const canApprove = Boolean(request.orderId);

      return <details key={request.id} className={styles.request}>
        <summary className={styles.summary}>
          <span className={styles.summaryMain}>
            <span className={styles.reference}>{request.referenceNumber}</span>
            <span className={styles.summaryPerson}>{request.consumerName || request.confirmationEmail}</span>
          </span>
          <span className={styles.summaryMeta}>
            <span className={styles.summaryDate}>{formatDateTime(request.receivedAt)}</span>
            <StatusBadge status={request.status} />
            {showOrderLink && !request.order ? <span className={styles.matchBadge}><AdminText i18nKey="orderCancellationsAdmin.manualMatch" fallback="Manual match required" /></span> : null}
          </span>
          <span className={styles.chevron} aria-hidden="true" />
        </summary>

        <div className={styles.body}>
          {refundRequired ? <div className={styles.refundNotice}><AdminText i18nKey="orderCancellationsAdmin.refundRequired" fallback="Refund required: the order was paid. Cancel the order but process the refund manually." /></div> : null}
          <div className={styles.overview}>
            <div className={styles.detailsGrid}>
              <Detail labelKey="orderDetailAdmin.contractNumber" labelFallback="Contract number">{request.submittedContractNumber}</Detail>
              <Detail labelKey="orderCancellationsAdmin.goods" labelFallback="Goods / service">{request.productDescription}</Detail>
              <Detail labelKey="orderCancellationsAdmin.orderedOn" labelFallback="Ordered on">{formatDate(request.orderedOn)}</Detail>
              <Detail labelKey="orderCancellationsAdmin.receivedOn" labelFallback="Received on">{formatDate(request.receivedOn)}</Detail>
              <Detail labelKey="kitchenDetailAdmin.name" labelFallback="Name">{request.consumerName}</Detail>
              <Detail labelKey="orderCancellationsAdmin.address" labelFallback="Address">{request.consumerAddress}</Detail>
              <Detail labelKey="adminShellLogin.email" labelFallback="Email"><a href={`mailto:${request.confirmationEmail}`}>{request.confirmationEmail}</a></Detail>
              {showOrderLink ? <Detail labelKey="orderCancellationsAdmin.linkedOrder" labelFallback="Linked order">
                {request.order ? <Link href={`/admin/orders/${request.order.id}`}>{request.order.orderNumber}</Link> : <span className={styles.matchText}><AdminText i18nKey="orderCancellationsAdmin.manualMatch" fallback="Manual match required" /></span>}
              </Detail> : null}
              {request.processedAt ? <Detail labelKey="orderCancellationsAdmin.processedAt" labelFallback="Processed">{formatDateTime(request.processedAt)}</Detail> : null}
            </div>
            <div className={styles.communication}>
              <span className={styles.label}><AdminText i18nKey="orderCancellationsAdmin.emailStatus" fallback="Email delivery" /></span>
              <EmailStatusRow labelKey="orderCancellationsAdmin.customerEmail" labelFallback="Customer receipt" status={request.customerEmailStatus} sentAt={request.customerEmailSentAt} />
              <EmailStatusRow labelKey="orderCancellationsAdmin.internalEmail" labelFallback="Internal notice" status={request.internalEmailStatus} sentAt={request.internalEmailSentAt} />
              <EmailStatusRow labelKey="orderCancellationsAdmin.finalEmail" labelFallback="Decision email" status={request.finalEmailStatus} sentAt={request.finalEmailSentAt} />
              {request.lastEmailError ? <p className={styles.emailError}>{request.lastEmailError}</p> : null}
            </div>
          </div>
          <div className={styles.declaration}><span className={styles.label}><AdminText i18nKey="orderCancellationsAdmin.declaration" fallback="Declaration" /></span><p>{request.declarationText}</p></div>
          {request.reason ? <div className={styles.declaration}><span className={styles.label}><AdminText i18nKey="orderCancellationsAdmin.reason" fallback="Reason" /></span><p>{request.reason}</p></div> : null}
          {request.adminNote ? <div className={styles.declaration}><span className={styles.label}><AdminText i18nKey="orderCancellationsAdmin.adminNote" fallback="Admin note" /></span><p>{request.adminNote}</p></div> : null}

          {(isOpen || needsAttention) ? <div className={styles.actions}>
            {isOpen && canApprove ? <form action={`/api/admin/order-cancellations/${request.id}`} method="post" className={styles.actionForm}>
              <input type="hidden" name="_intent" value="approve" /><input type="hidden" name="returnPath" value={returnPath} />
              <label><AdminText i18nKey="orderCancellationsAdmin.approveNote" fallback="Approval note (optional)" /><textarea name="adminNote" rows={2} maxLength={2000} /></label>
              <AdminConfirmSubmitButton name="_submit" value="approve" className={styles.approveButton} confirmKey="orderCancellationsAdmin.approveConfirm" confirmFallback={"Approve this withdrawal?\nThe order will be marked as cancelled."}><AdminText i18nKey="orderCancellationsAdmin.approve" fallback="Approve" /></AdminConfirmSubmitButton>
            </form> : null}
            {isOpen && !canApprove ? <p className={styles.matchHint}><AdminText i18nKey="orderCancellationsAdmin.approveNeedsMatch" fallback="Match this request to an order before approving." /></p> : null}
            {isOpen ? <form action={`/api/admin/order-cancellations/${request.id}`} method="post" className={styles.actionForm}>
              <input type="hidden" name="_intent" value="reject" /><input type="hidden" name="returnPath" value={returnPath} />
              <label><AdminText i18nKey="orderCancellationsAdmin.rejectNote" fallback="Rejection explanation (required)" /><textarea name="adminNote" rows={2} maxLength={2000} required /></label>
              <AdminConfirmSubmitButton name="_submit" value="reject" className={styles.rejectButton} confirmKey="orderCancellationsAdmin.rejectConfirm" confirmFallback={"Reject this withdrawal?\nThe order stays unchanged and the customer is notified."}><AdminText i18nKey="orderCancellationsAdmin.reject" fallback="Reject" /></AdminConfirmSubmitButton>
            </form> : null}
            {needsAttention ? <form action={`/api/admin/order-cancellations/${request.id}`} method="post" className={styles.retryForm}>
              <input type="hidden" name="_intent" value="retry-emails" /><input type="hidden" name="returnPath" value={returnPath} />
              <button type="submit" className={styles.retryButton}><AdminText i18nKey="orderCancellationsAdmin.resendEmails" fallback="Resend emails" /></button>
            </form> : null}
          </div> : null}
        </div>
      </details>;
    })}
  </div>;
}
