export function filterAdminUsers(users, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const role = String(filters.role || "").trim().toUpperCase();
  const status = String(filters.status || "").trim().toLowerCase();

  return users.filter((user) => {
    if (query && !String(user.email || "").toLowerCase().includes(query)) {
      return false;
    }
    if (role && role !== "ALL" && user.role !== role) {
      return false;
    }
    if (status === "active" && !user.isActive) {
      return false;
    }
    if (status === "inactive" && user.isActive) {
      return false;
    }
    return true;
  });
}

export function countActiveSuperadmins(users, excludeId = null) {
  return users.filter(
    (user) =>
      user.role === "SUPERADMIN"
      && user.isActive
      && user.id !== excludeId,
  ).length;
}

export function isLastActiveSuperadmin(user, users) {
  if (user.role !== "SUPERADMIN" || !user.isActive) {
    return false;
  }
  return countActiveSuperadmins(users, user.id) === 0;
}

export function getAdminUserActionRestrictions(user, currentAdminId, users) {
  const isSelf = user.id === currentAdminId;
  const lastSuperadmin = isLastActiveSuperadmin(user, users);

  return {
    canChangeRole: !isSelf && !lastSuperadmin,
    changeRoleReasonKey: isSelf
      ? "usersAdmin.cannotChangeOwnRole"
      : lastSuperadmin
        ? "usersAdmin.cannotChangeLastSuperadminRole"
        : null,
    canDeactivate: !isSelf && user.isActive && !lastSuperadmin,
    deactivateReasonKey: isSelf
      ? "usersAdmin.cannotDeactivateSelf"
      : lastSuperadmin
        ? "usersAdmin.cannotDeactivateLastSuperadmin"
        : null,
    canDelete: !isSelf && !lastSuperadmin,
    deleteReasonKey: isSelf
      ? "usersAdmin.cannotDeleteSelf"
      : lastSuperadmin
        ? "usersAdmin.cannotDeleteLastSuperadmin"
        : null,
    canReactivate: !isSelf && !user.isActive,
  };
}
