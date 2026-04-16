"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AdminText, useAdminI18n } from "./admin-i18n";

const ACTION_MESSAGE_EVENT = "admin-order-action-message";

function getIntent(data) {
  return String(data?.get("_intent") || "status");
}

function getActionMessage(translate, intent, pendingKey, pendingFallback) {
  if (pendingKey) {
    return translate(pendingKey, pendingFallback);
  }

  const messageByIntent = {
    confirm: translate("orderDetailAdmin.confirmingAndSendingEmail", "Confirming and sending email..."),
    "resend-email": translate("orderDetailAdmin.resendingEmail", "Resending email..."),
    "retry-webhook": translate("orderDetailAdmin.retryingWebhook", "Retrying webhook..."),
    cancel: translate("orderDetailAdmin.processing", "Processing..."),
    status: translate("orderDetailAdmin.processing", "Processing..."),
  };

  return messageByIntent[intent] || translate("orderDetailAdmin.processing", "Processing...");
}

export function OrderActionButton({ intent, style, children, pendingKey = "orderDetailAdmin.processing", pendingFallback = "Processing..." }) {
  const { pending, data } = useFormStatus();
  const { translate } = useAdminI18n();
  const [clickedIntent, setClickedIntent] = useState(null);
  const activeIntent = getIntent(data) || clickedIntent;
  const isThisButtonPending = pending && (activeIntent === intent || (!data && clickedIntent === intent));
  const actionMessage = getActionMessage(translate, intent, pendingKey, pendingFallback);

  function handleClick(event) {
    const button = event.currentTarget;
    const form = button.form;

    if (!form || clickedIntent) return;

    event.preventDefault();
    setClickedIntent(intent);
    window.dispatchEvent(new CustomEvent(ACTION_MESSAGE_EVENT, { detail: { message: actionMessage } }));

    window.setTimeout(() => {
      form.requestSubmit(button);
    }, 75);
  }

  return (
    <button
      type="submit"
      name={intent === "status" ? undefined : "_intent"}
      value={intent === "status" ? undefined : intent}
      onClick={handleClick}
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pending && !isThisButtonPending ? 0.58 : 1,
        cursor: pending ? "wait" : style?.cursor,
      }}
      disabled={pending}
      aria-busy={isThisButtonPending}
    >
      {clickedIntent === intent || isThisButtonPending ? actionMessage : children}
    </button>
  );
}

export function SaveStatusButton({ style }) {
  return (
    <OrderActionButton intent="status" style={style}>
      <AdminText i18nKey="orderDetailAdmin.saveStatus" fallback="Save status" />
    </OrderActionButton>
  );
}

export function OrderActionFeedback() {
  const { pending, data } = useFormStatus();
  const { translate } = useAdminI18n();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    function handleMessage(event) {
      setMessage(event.detail?.message || translate("orderDetailAdmin.processing", "Processing..."));
    }

    window.addEventListener(ACTION_MESSAGE_EVENT, handleMessage);
    return () => window.removeEventListener(ACTION_MESSAGE_EVENT, handleMessage);
  }, [translate]);

  if (!pending && !message) return null;

  const activeIntent = getIntent(data);
  const statusMessage = message || getActionMessage(translate, activeIntent);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        border: "1px solid var(--app-border-strong)",
        borderRadius: 8,
        background: "rgba(255,255,255,0.9)",
        color: "var(--app-text)",
        padding: "12px 14px",
        fontWeight: 800,
      }}
    >
      {statusMessage}
    </div>
  );
}
