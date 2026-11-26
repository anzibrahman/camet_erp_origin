import Receipt from "../models/receiptModel.js";
import Tally from "../models/TallyData.js";
import Party from "../models/partyModel.js";
import { generateVoucherNumber } from "./voucherHelper.js";
import { getNewSerialNumber } from "./secondaryHelper.js";
import { saveSettlementData, updateReceiptNumber, updateTallyData } from "./receiptHelper.js";
import { money, transactionError } from "./salesTransactionInput.js";

// Each received payment creates one receipt against the new invoice only.
export async function postSalesTransactionReceipts(req, body, sale, user, session) {
  const receipts = [];
  for (const payment of body.paymentSplittingData.filter(value => value.type !== "credit" && Number(value.amount) > 0)) {
    const scope = { cmp_id: body.orgId, Primary_user_id: req.owner };
    const outstanding = await Tally.findOne({ ...scope, billId: String(sale._id), source: "sales" }).session(session).lean();
    const source = await Party.findOne({ ...scope, _id: payment.ref_id, partyType: payment.type === "cash" ? "cash" : "bank" }).session(session).lean();
    if (!outstanding || !source) throw transactionError("Unable to find the sale outstanding or payment account");
    const amount = money(payment.amount);
    if (amount > Number(outstanding.bill_pending_amt) + 0.001) throw transactionError("Received amount exceeds the new sale outstanding");
    const number = await generateVoucherNumber(body.orgId, "receipt", body.receiptSeriesId, session);
    const paymentMethod = payment.type === "cash" ? "Cash" : payment.type === "cheque" ? "Cheque" : payment.type;
    const paymentDetails = { _id: source._id, ...(payment.type === "cash"
      ? { cash_id: source._id, cash_ledname: source.partyName, cash_name: source.partyName }
      : { bank_id: source._id, bank_ledname: source.partyName, bank_name: source.partyName }) };
    const billData = [{ _id: outstanding._id, bill_no: sale.salesNumber, billId: String(sale._id),
      bill_date: outstanding.bill_date, bill_pending_amt: outstanding.bill_pending_amt, source: "sales",
      settledAmount: amount, remainingAmount: money(outstanding.bill_pending_amt - amount) }];
    const receipt = new Receipt({ date: sale.date, voucherType: "receipt", receiptNumber: number.voucherNumber,
      series_id: body.receiptSeriesId, usedSeriesNumber: number.usedSeriesNumber,
      serialNumber: await getNewSerialNumber(Receipt, "serialNumber", session),
      cmp_id: body.orgId, Primary_user_id: req.owner, Secondary_user_id: req.sUserId, party: body.party,
      billData, totalBillAmount: outstanding.bill_pending_amt, enteredAmount: amount,
      advanceAmount: 0, remainingAmount: billData[0].remainingAmount, paymentMethod, paymentDetails,
      note: `Received against Sale ${sale.salesNumber}` });
    await receipt.save({ session });
    await saveSettlementData(receipt.receiptNumber, String(receipt._id), "Receipt", "receipt", amount,
      paymentMethod, paymentDetails, body.party, body.orgId, req.owner, body.selectedDate, session);
    await updateTallyData(billData, body.orgId, session, receipt.receiptNumber, String(receipt._id), "receipt");
    await updateReceiptNumber(body.orgId, user, session);
    receipts.push({ _id: receipt._id, receiptNumber: receipt.receiptNumber, enteredAmount: amount });
  }
  return receipts;
}
