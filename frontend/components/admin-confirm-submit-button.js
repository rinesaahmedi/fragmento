"use client";

import { useAdminI18n } from "./admin-i18n";

export default function AdminConfirmSubmitButton({
  children,
  confirmKey,
  confirmFallback,
  name,
  value,
  style,
}) {
  const { translate } = useAdminI18n();
  const confirmMessage = confirmKey ? translate(confirmKey, confirmFallback || "") : confirmFallback;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      style={style}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
