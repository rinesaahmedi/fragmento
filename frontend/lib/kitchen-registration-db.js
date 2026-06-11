export function isMissingKitchenRegistrationTableError(error) {
  return (
    error?.code === "P2021"
    || String(error?.message || "").includes("The table `public.KitchenRegistration` does not exist")
  );
}

export function kitchenRegistrationUnavailableMessage() {
  return "Kitchen registrations are temporarily unavailable because the database migration for KitchenRegistration has not been applied yet.";
}
