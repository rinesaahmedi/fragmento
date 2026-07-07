export const VAT_RATE = 0.19;

export function getPriceBreakdown(total) {
  const gross = Number(total) || 0;
  const net = gross / (1 + VAT_RATE);
  const vat = gross - net;
  return { net, vat, total: gross };
}
