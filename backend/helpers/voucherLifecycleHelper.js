import TallyData from "../models/TallyData.js";

export async function voucherEditError(voucher, session, isOrder = false) {
  if (voucher.isCancelled) return "Cancelled vouchers cannot be edited";
  if (isOrder && voucher.isConverted) return "Converted sale orders cannot be edited";
  if (isOrder) return null;
  const outstanding = await TallyData.findOne({ billId: String(voucher._id), cmp_id: voucher.cmp_id, Primary_user_id: voucher.Primary_user_id }).session(session);
  if (outstanding?.appliedReceipts?.length || outstanding?.appliedPayments?.length) {
    return "This voucher has payments applied and cannot be edited. Reverse the applied payments first.";
  }
  return null;
}
