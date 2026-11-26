export function voucherCancelEndpoint(voucherType) {
  if (voucherType === "saleOrder") return "cancelSalesOrder";
  return "cancel" + voucherType.charAt(0).toUpperCase() + voucherType.slice(1);
}
