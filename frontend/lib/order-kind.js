export const ORDER_KIND_LIVE = "live";
export const ORDER_KIND_TEST = "test";

export function getOrderKindForContractNumber(contractNumber) {
  return String(contractNumber || "").trim().replace(/\s+/g, "").startsWith("111")
    ? ORDER_KIND_TEST
    : ORDER_KIND_LIVE;
}

export function isTestOrderKind(orderKind) {
  return orderKind === ORDER_KIND_TEST;
}

export function getOrderDelegate(client, orderKind) {
  return isTestOrderKind(orderKind) ? client.testOrder : client.order;
}

export function getOrderItemDelegate(client, orderKind) {
  return isTestOrderKind(orderKind) ? client.testOrderItem : client.orderItem;
}
