export const formatVoucherType = (voucherType) => {
  
  if (!voucherType) return "Voucher Type";
  if (voucherType === "performaInvoice") return "Proforma Invoice";

  return voucherType
    ?.replace(/([A-Z])/g, " $1") // insert space before capital letters
    ?.replace(/^./, (str) => str.toUpperCase()) // capitalize first character
    ?.replace(/\b\w/g, (char) => char.toUpperCase()); // capitalize first letter of each word
};
