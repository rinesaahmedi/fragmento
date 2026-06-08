export function getContractNumberStickyState({
  currentIsStuck,
  sentinelTop,
  stickyTopOffset = 12,
  stickyEnterBuffer = 6,
  stickyExitBuffer = 18,
}) {
  if (!Number.isFinite(sentinelTop)) {
    return false;
  }

  if (currentIsStuck) {
    return sentinelTop <= stickyTopOffset + stickyExitBuffer;
  }

  return sentinelTop <= stickyTopOffset - stickyEnterBuffer;
}
