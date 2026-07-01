function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildNextContractOrderNumber(contractNumber, existingOrderNumbers = []) {
  const baseOrderNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  if (!baseOrderNumber) {
    throw new Error("Contract number is required.");
  }

  const suffixPattern = new RegExp(`^${escapeRegExp(baseOrderNumber)}-(\\d+)$`);
  let highestSequence = -1;

  for (const orderNumber of existingOrderNumbers) {
    const normalizedOrderNumber = String(orderNumber || "").trim();
    if (normalizedOrderNumber === baseOrderNumber) {
      highestSequence = Math.max(highestSequence, 0);
      continue;
    }

    const suffixMatch = normalizedOrderNumber.match(suffixPattern);
    if (suffixMatch) {
      highestSequence = Math.max(highestSequence, Number.parseInt(suffixMatch[1], 10));
    }
  }

  return highestSequence < 0 ? baseOrderNumber : `${baseOrderNumber}-${highestSequence + 1}`;
}
