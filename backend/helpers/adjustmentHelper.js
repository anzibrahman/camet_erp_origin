import mongoose from "mongoose";
import Adjustment from "../models/adjustmentModel.js";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

// Called inside the credit-note creation transaction. Selection order is allocation order.
export async function settleCreditNoteSales(creditNote, selectedSaleIds, actor, session) {
  if (selectedSaleIds == null) return [];
  if (!Array.isArray(selectedSaleIds) || selectedSaleIds.some(id => !mongoose.isValidObjectId(id))) {
    throw invalid("Invalid selected sales");
  }
  const ids = [...new Set(selectedSaleIds.map(String))];
  if (!ids.length) return [];
  if (creditNote.party?.partyType !== "party") throw invalid("Adjustments require a customer account");
  const scope = { cmp_id: creditNote.cmp_id, Primary_user_id: creditNote.Primary_user_id };
  const credit = await Tally.findOne({ ...scope, billId: String(creditNote._id), source: "creditNote", isCancelled: false }).session(session);
  if (!credit) throw invalid("Credit note outstanding was not created");
  const records = [];
  for (const id of ids) {
    const sale = await Sales.findOne({ ...scope, _id: id, "party._id": creditNote.party._id, isCancelled: false }).session(session);
    if (!sale) throw invalid("A selected sale is cancelled or does not belong to this customer/company");
    const outstanding = await Tally.findOne({ ...scope, billId: id, party_id: creditNote.party._id, source: "sales", isCancelled: false }).session(session);
    // Paid sales can still supply returned items; they have no outstanding to allocate.
    if (!outstanding || outstanding.bill_pending_amt <= 0 || credit.bill_pending_amt >= 0) continue;
    const amount = money(Math.min(outstanding.bill_pending_amt, -credit.bill_pending_amt));
    if (amount <= 0) continue;
    outstanding.bill_pending_amt = money(outstanding.bill_pending_amt - amount);
    outstanding.adjustmentAmount = money((outstanding.adjustmentAmount || 0) + amount);
    outstanding.classification = "Dr";
    credit.bill_pending_amt = money(credit.bill_pending_amt + amount);
    credit.adjustmentAmount = money((credit.adjustmentAmount || 0) + amount);
    credit.classification = "Cr";
    await outstanding.save({ session });
    await credit.save({ session });
    const [record] = await Adjustment.create([{
      ...scope, party_id: creditNote.party._id, saleId: sale._id, creditNoteId: creditNote._id,
      saleOutstandingId: outstanding._id, creditNoteOutstandingId: credit._id,
      allocatedAmount: amount, createdBy: actor,
    }], { session });
    records.push(record);
  }
  return records;
}

// Preserve history, release both allocations, and restore the surviving voucher.
export async function reverseVoucherAdjustments(outstanding, actor, reason, session) {
  if (!(outstanding.adjustmentAmount > 0)) return;
  const scope = { cmp_id: outstanding.cmp_id, Primary_user_id: outstanding.Primary_user_id };
  const records = await Adjustment.find({ ...scope, status: "active", $or: [
    { saleOutstandingId: outstanding._id }, { creditNoteOutstandingId: outstanding._id },
  ] }).session(session);
  if (money(records.reduce((sum, record) => sum + record.allocatedAmount, 0)) !== money(outstanding.adjustmentAmount)) {
    throw new Error("Adjustment history is inconsistent; cancellation rolled back");
  }
  for (const record of records) {
    for (const [id, direction] of [[record.saleOutstandingId, 1], [record.creditNoteOutstandingId, -1]]) {
      const doc = await Tally.findOne({ ...scope, _id: id }).session(session);
      if (!doc || money(doc.adjustmentAmount || 0) < money(record.allocatedAmount)) {
        throw new Error("Adjustment balance is inconsistent; cancellation rolled back");
      }
      doc.adjustmentAmount = money(doc.adjustmentAmount - record.allocatedAmount);
      doc.bill_pending_amt = money(doc.bill_pending_amt + direction * record.allocatedAmount);
      doc.classification = doc.bill_pending_amt < 0 ? "Cr" : "Dr";
      await doc.save({ session });
    }
    record.status = "reversed";
    record.reversedAt = new Date();
    record.reversedBy = actor;
    record.reversalReason = reason || "Voucher cancelled";
    await record.save({ session });
  }
}
