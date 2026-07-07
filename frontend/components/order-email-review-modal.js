"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AdminText, useAdminI18n } from "./admin-i18n";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "./admin-ui";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBodyTextAsHtml(bodyText) {
  return String(bodyText || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

export function OrderEmailReviewModal({
  to,
  defaultSubject,
  defaultBody,
  staticHtml,
  attachmentLabels = [],
  canConfirm,
  canResendEmail,
}) {
  const { translate } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [excludedAttachmentKeys, setExcludedAttachmentKeys] = useState([]);

  const previewHtml = useMemo(() => {
    return `${formatBodyTextAsHtml(body)}${staticHtml}`;
  }, [body, staticHtml]);
  const visibleAttachmentLabels = useMemo(
    () => {
      const seen = new Set();
      return attachmentLabels
        .map((attachment) => {
          if (typeof attachment === "string") {
            return { label: attachment.trim(), href: "" };
          }
          return {
            key: String(attachment?.key || "").trim(),
            label: String(attachment?.label || "").trim(),
            href: String(attachment?.href || "").trim(),
          };
        })
        .filter((attachment) => {
          if (!attachment.label) return false;
          const dedupeKey = `${attachment.key}\n${attachment.label}\n${attachment.href}`;
          if (seen.has(dedupeKey)) return false;
          seen.add(dedupeKey);
          return true;
        })
        .filter((attachment) => !attachment.key || !excludedAttachmentKeys.includes(attachment.key));
    },
    [attachmentLabels, excludedAttachmentKeys],
  );

  if (!canConfirm && !canResendEmail) {
    return null;
  }

  return (
    <>
      <div style={triggerRowStyle}>
        {(canConfirm || canResendEmail) ? (
          <SendEmailButton
            canConfirm={canConfirm}
            canResendEmail={canResendEmail}
            variant="primary"
          />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={secondaryButtonStyle}
          disabled={false}
        >
          <AdminText i18nKey="orderDetailAdmin.reviewCustomerEmail" fallback="Review customer email" />
        </button>
      </div>

      <input type="hidden" name="emailSubject" value={subject} />
      <input type="hidden" name="emailBody" value={body} />
      <input type="hidden" name="emailExcludedAttachments" value={JSON.stringify(excludedAttachmentKeys)} />

      {open ? (
        <div
          style={overlayStyle}
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ fontSize: "1.15rem" }}>
                  <AdminText i18nKey="orderDetailAdmin.reviewCustomerEmail" fallback="Review customer email" />
                </strong>
                <span style={mutedStyle}>
                  <AdminText
                    i18nKey="orderDetailAdmin.editYourMessageThenDecideWhetherToSend"
                    fallback="Edit your message, review the full email, then send or close."
                  />
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} style={closeButtonStyle}>
                <AdminText i18nKey="orderDetailAdmin.close" fallback="Close" />
              </button>
            </div>

            <div style={modalGridStyle}>
              <div style={editorPaneStyle}>
                <div style={fieldStyle}>
                  <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailTo" fallback="To" /></span>
                  <span>{to}</span>
                </div>
                <label style={fieldStyle}>
                  <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailSubject" fallback="Subject" /></span>
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} style={inputStyle} />
                </label>
                <label style={fieldStyle}>
                  <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailBody" fallback="Body" /></span>
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={10} style={textareaStyle} />
                </label>
                <div style={attachmentsPanelStyle}>
                  <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailAttachments" fallback="Attachments" /></span>
                  {visibleAttachmentLabels.length ? (
                    <ul style={attachmentListStyle}>
                      {visibleAttachmentLabels.map((attachment) => (
                        <li key={`${attachment.key}-${attachment.label}-${attachment.href}`} style={attachmentListItemStyle}>
                          {attachment.href ? (
                            <div style={attachmentOpenableItemStyle}>
                              <span style={attachmentLabelTextStyle}>{attachment.label}</span>
                              <span style={attachmentActionRowStyle}>
                                <a href={attachment.href} target="_blank" rel="noreferrer" style={attachmentViewButtonStyle}>
                                  <AdminText i18nKey="orderDetailAdmin.viewAttachment" fallback="View" />
                                </a>
                                {attachment.key ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExcludedAttachmentKeys((current) =>
                                        current.includes(attachment.key) ? current : [...current, attachment.key],
                                      )
                                    }
                                    style={attachmentRemoveButtonStyle}
                                  >
                                    <AdminText i18nKey="orderDetailAdmin.removeAttachment" fallback="Remove" />
                                  </button>
                                ) : null}
                              </span>
                            </div>
                          ) : (
                            <div style={attachmentOpenableItemStyle}>
                              <span style={attachmentLabelTextStyle}>{attachment.label}</span>
                              {attachment.key ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExcludedAttachmentKeys((current) =>
                                      current.includes(attachment.key) ? current : [...current, attachment.key],
                                    )
                                  }
                                  style={attachmentRemoveButtonStyle}
                                >
                                  <AdminText i18nKey="orderDetailAdmin.removeAttachment" fallback="Remove" />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={mutedStyle}>
                      <AdminText i18nKey="orderDetailAdmin.noEmailAttachments" fallback="No attachments" />
                    </span>
                  )}
                </div>
              </div>

              <div style={previewPaneStyle}>
                <div style={previewMetaStyle}>
                  <div>
                    <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailTo" fallback="To" /></span>
                    <div>{to}</div>
                  </div>
                  <div>
                    <span style={labelStyle}><AdminText i18nKey="orderDetailAdmin.emailSubject" fallback="Subject" /></span>
                    <div>{subject}</div>
                  </div>
                </div>
                <div style={previewBodyWrapStyle}>
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={previewBodyStyle} />
                </div>
              </div>
            </div>

            <div style={footerStyle}>
              <button type="button" onClick={() => setOpen(false)} style={dangerButtonStyle}>
                <AdminText i18nKey="orderDetailAdmin.cancelEmailReview" fallback="Cancel" />
              </button>
              {canResendEmail ? (
                <SendEmailButton canConfirm={false} canResendEmail={true} variant="primary" />
              ) : null}
              {canConfirm ? (
                <SendEmailButton canConfirm={true} canResendEmail={false} variant="primary" />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SendEmailButton({ canConfirm, canResendEmail, variant = "primary" }) {
  const { pending, data } = useFormStatus();
  const { translate } = useAdminI18n();
  const intent = canResendEmail ? "resend-email" : "confirm";
  const currentIntent = String(data?.get("_intent") || "");
  const isPending = pending && currentIntent === intent;
  const style = variant === "primary" ? primaryButtonStyle : secondaryButtonStyle;

  return (
    <button
      type="submit"
      name="_intent"
      value={intent}
      style={style}
      disabled={pending}
      aria-busy={isPending}
    >
      {isPending
        ? canResendEmail
          ? translate("orderDetailAdmin.resendingEmail", "Resending email...")
          : translate("orderDetailAdmin.confirmingAndSendingEmail", "Confirming and sending email...")
        : canResendEmail
          ? translate("orderDetailAdmin.resendEmail", "Resend email")
          : translate("orderDetailAdmin.confirmAndSendEmail", "Confirm and send email")}
    </button>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(42, 22, 15, 0.35)",
  backdropFilter: "blur(4px)",
  display: "grid",
  placeItems: "center",
  padding: 24,
  zIndex: 1000,
};

const triggerRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const modalStyle = {
  width: "min(1320px, 100%)",
  maxHeight: "min(90vh, 980px)",
  overflow: "auto",
  borderRadius: 24,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,248,242,0.95))",
  boxShadow: "0 30px 60px rgba(58, 27, 18, 0.22)",
  padding: 24,
  display: "grid",
  gap: 18,
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const modalGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 20,
  alignItems: "start",
};

const editorPaneStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 18,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.88)",
};

const previewPaneStyle = {
  display: "grid",
  gap: 14,
  minWidth: 0,
};

const previewMetaStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  padding: 18,
  borderRadius: 18,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.88)",
};

const previewBodyWrapStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 18,
  background: "#fff",
  minHeight: 500,
  overflow: "auto",
};

const previewBodyStyle = {
  padding: 20,
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const fieldStyle = {
  display: "grid",
  gap: 6,
};

const labelStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inputStyle = {
  width: "100%",
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "#fff",
  color: "var(--app-text)",
  padding: "10px 12px",
  font: "inherit",
};

const textareaStyle = {
  width: "100%",
  minHeight: 220,
  resize: "vertical",
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "#fff",
  color: "var(--app-text)",
  padding: 12,
  font: "inherit",
  lineHeight: 1.5,
};

const attachmentsPanelStyle = {
  display: "grid",
  gap: 8,
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.72)",
  padding: 12,
};

const attachmentListStyle = {
  display: "grid",
  gap: 6,
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const attachmentListItemStyle = {
  margin: 0,
};

const attachmentItemStyle = {
  display: "block",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "#fff",
  padding: "8px 10px",
  color: "var(--app-text)",
  fontSize: 14,
  overflowWrap: "anywhere",
};

const attachmentOpenableItemStyle = {
  ...attachmentItemStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const attachmentLabelTextStyle = {
  minWidth: 0,
  overflowWrap: "anywhere",
};

const attachmentActionRowStyle = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const attachmentViewButtonStyle = {
  flex: "0 0 auto",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 8,
  background: "var(--color-card)",
  color: "var(--app-accent)",
  textDecoration: "none",
  padding: "6px 10px",
  fontWeight: 700,
  fontSize: 13,
};

const attachmentRemoveButtonStyle = {
  flex: "0 0 auto",
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.82)",
  color: "var(--app-danger-text)",
  padding: "6px 10px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const mutedStyle = {
  color: "var(--app-text-muted)",
  fontSize: 14,
};

const closeButtonStyle = {
  ...secondaryButtonStyle,
  minHeight: 44,
};
