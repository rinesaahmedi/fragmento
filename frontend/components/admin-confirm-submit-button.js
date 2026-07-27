"use client";

import { useAdminI18n } from "./admin-i18n";

export default function AdminConfirmSubmitButton({
  children,
  confirmKey,
  confirmFallback,
  confirmValues,
  name,
  value,
  style,
}) {
  const { translate } = useAdminI18n();
  let confirmMessage = confirmKey ? translate(confirmKey, confirmFallback || "") : confirmFallback;
  Object.entries(confirmValues || {}).forEach(([key, replacement]) => {
    confirmMessage = confirmMessage.replaceAll(`{${key}}`, replacement);
  });

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
