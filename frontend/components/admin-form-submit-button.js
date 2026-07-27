"use client";

import { useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import { primaryButtonStyle, secondaryButtonStyle } from "./admin-ui";

export function AdminFormSubmitButton({
  children,
  pendingLabel,
  pendingKey,
  secondary = false,
  style,
  disabled = false,
  title,
}) {
  const { translate } = useAdminI18n();
  const [isPending, setIsPending] = useState(false);
  const isDisabled = disabled || isPending;

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-disabled={isDisabled}
      title={title}
      onClick={(event) => {
        if (isPending) {
          event.preventDefault();
          return;
        }

        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) return;

        window.setTimeout(() => setIsPending(true), 0);
      }}
      style={{
        ...(secondary ? secondaryButtonStyle : primaryButtonStyle),
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? "not-allowed" : isPending ? "wait" : "pointer",
        ...style,
      }}
    >
      {isPending ? translate(pendingKey || "", pendingLabel || "") || children : children}
    </button>
  );
}
