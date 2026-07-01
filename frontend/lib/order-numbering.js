function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildNextContractOrderNumber(contractNumber, existingOrderNumbers = []) {
  const baseOrderNumber = String(contractNumber || "").trim().replace(/\s+/g, "");
  if (!baseOrderNumber) {
    throw new Error("Contract number is required.");
  }

  const suffixPattern = new RegExp(`^${escapeRegExp(baseOrderNumber)}-(\\d+)$`);
  let highestSequence = 0;

  for (const orderNumber of existingOrderNumbers) {
    const normalizedOrderNumber = String(orderNumber || "").trim();
    if (normalizedOrderNumber === baseOrderNumber) {
      highestSequence = Math.max(highestSequence, 1);
      continue;
    }

    const suffixMatch = normalizedOrderNumber.match(suffixPattern);
    if (suffixMatch) {
      highestSequence = Math.max(highestSequence, Number.parseInt(suffixMatch[1], 10));
    }
  }

  return `${baseOrderNumber}-${highestSequence + 1}`;
}
