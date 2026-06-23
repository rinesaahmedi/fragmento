"use client";

import { useState } from "react";
import { primaryButtonStyle, secondaryButtonStyle } from "./admin-ui";

export function AdminFormSubmitButton({
  children,
  pendingLabel,
  secondary = false,
  style,
  disabled = false,
  title,
}) {
  const [isPending, setIsPending] = useState(false);
  const isDisabled = disabled || isPending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      title={title}
      onClick={() => {
        if (!isDisabled) {
          setIsPending(true);
        }
      }}
      style={{
        ...(secondary ? secondaryButtonStyle : primaryButtonStyle),
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? "not-allowed" : isPending ? "wait" : "pointer",
        ...style,
      }}
    >
      {isPending ? pendingLabel || children : children}
    </button>
  );
}
