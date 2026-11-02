import mongoose from "mongoose";
import Adjustment from "../models/adjustmentModel.js";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";
import CreditNote from "../models/creditNoteModel.js";

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

export async function settleCreditNoteSales(creditNote, selectedSaleIds, actor, session, reusable = []) {
  const sourceIds = selectedSaleIds ?? [];
  if (!Array.isArray(sourceIds) || sourceIds.some(id => !mongoose.isValidObjectId(id))) throw invalid("Invalid selected sales");
  if (creditNote.party?.partyType !== "party") {
    if (sourceIds.length) throw invalid("Adjustments require a customer account");
    return [];
  }
  if (!sourceIds.length) return [];
  const scope = { cmp_id: creditNote.cmp_id, Primary_user_id: creditNote.Primary_user_id };
  for (const sourceId of new Set(sourceIds.map(String))) {
    const source = await Sales.findOne({ ...scope, _id: sourceId, "party._id": creditNote.party._id, isCancelled: false }).session(session);
    if (!source) throw invalid("A selected sale is cancelled or does not belong to this customer/company");
  }
  const postedCredit = await Tally.findOne({ ...scope, billId: String(creditNote._id), source: "creditNote", isCancelled: false }).session(session);
  if (!postedCredit) throw invalid("Credit note outstanding was not created");
  return allocateCreditToSales(creditNote, [...new Set(sourceIds.map(String))], actor, session, reusable);
}

export async function settleSaleCreditNotes(sale, actor, session) {
  // Standalone sales leave credit available for explicit Receipt/Payment adjustment.
  return [];
}

async function allocateCreditToSales(creditNote, ids, actor, session, reusable) {
  const scope = { cmp_id: creditNote.cmp_id, Primary_user_id: creditNote.Primary_user_id };
  const credit = await Tally.findOne({ ...scope, billId: String(creditNote._id), party_id: creditNote.party._id,
    source: "creditNote", isCancelled: false,
  }).session(session);
  if (!credit || credit.bill_pending_amt >= 0) return [];
  const records = [];
  for (const id of ids) {
    const sale = await Sales.findOne({ ...scope, _id: id, "party._id": creditNote.party._id, isCancelled: false }).session(session);
    if (!sale) {
      continue;
    }
    const outstanding = await Tally.findOne({ ...scope, billId: id, party_id: creditNote.party._id, source: "sales", isCancelled: false }).session(session);
    // Paid sales can still supply returned items; they have no outstanding to allocate.
    if (!outstanding || outstanding.bill_pending_amt <= 0 || credit.bill_pending_amt >= 0) continue;
    const releasedRecord = reusable.find(row => String(row.saleId) === String(sale._id) && String(row.creditNoteId) === String(creditNote._id));
    const previousRecord = releasedRecord || await Adjustment.findOne({ ...scope,
      saleOutstandingId: outstanding._id, creditNoteOutstandingId: credit._id,
    }).session(session);
    const previouslyAllocated = !releasedRecord && previousRecord?.status === "active" ? money(previousRecord.allocatedAmount) : 0;
    const sourceAllocation = creditNote.returnAllocations?.find(row => String(row.saleId) === id);
    const limit = creditNote.returnAllocations?.length ? Math.max(0, Number(sourceAllocation?.amount || 0) - previouslyAllocated) : Infinity;
    const amount = money(Math.min(outstanding.bill_pending_amt, -credit.bill_pending_amt, limit));
    if (amount <= 0) continue;
    outstanding.bill_pending_amt = money(outstanding.bill_pending_amt - amount);
    outstanding.adjustmentAmount = money((outstanding.adjustmentAmount || 0) + amount);
    outstanding.classification = "Dr";
    credit.bill_pending_amt = money(credit.bill_pending_amt + amount);
    credit.adjustmentAmount = money((credit.adjustmentAmount || 0) + amount);
    credit.classification = "Cr";
    await outstanding.save({ session });
    await credit.save({ session });
    // One document per pair, including history, supports the original unique index.
    let record = previousRecord;
    const releasedForEdit = Boolean(releasedRecord);
    if (record) {
      const existingAllocation = !releasedForEdit && record.status === "active" ? money(record.allocatedAmount) : 0;
      record.history = record.history || [];
      record.history.push({
        allocatedAmount: record.allocatedAmount, createdBy: record.createdBy,
        status: "reversed", reversedAt: record.reversedAt || new Date(),
        reversedBy: record.reversedBy || actor,
        reversalReason: existingAllocation > 0 ? "Allocation increased" : record.reversalReason || "Voucher edited",
      });
      record.status = "active";
      record.reversedAt = undefined;
      record.reversedBy = undefined;
      record.reversalReason = undefined;
      record.allocatedAmount = money(existingAllocation + amount);
      await record.save({ session });
    } else {
      [record] = await Adjustment.create([{
        ...scope, party_id: creditNote.party._id, saleId: sale._id, creditNoteId: creditNote._id,
        saleOutstandingId: outstanding._id, creditNoteOutstandingId: credit._id,
        allocatedAmount: amount, createdBy: actor,
      }], { session });
    }
    records.push(record);
  }
  return records;
}

// Preserve history, release both allocations, and restore the surviving voucher.
export async function reverseVoucherAdjustments(outstanding, actor, reason, session, forEdit = false) {
  if (!(outstanding.adjustmentAmount > 0)) return [];
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
    const reversal = {
      status: "reversed", reversedAt: new Date(), reversedBy: actor,
      reversalReason: reason || "Voucher cancelled",
    };
    if (!forEdit) {
      Object.assign(record, reversal);
      await record.save({ session });
    }
  }
  return records;
}

// Editing releases only this voucher's allocations. Other sales using the same
// credit note retain their allocations. All work belongs to the caller's transaction.
export async function beginAdjustmentEdit(voucher, party, company, actor, session) {
  if (String(company) !== String(voucher.cmp_id)) throw invalid("Cannot move a voucher between companies");
  const scope = { cmp_id: voucher.cmp_id, Primary_user_id: voucher.Primary_user_id };
  const outstanding = await Tally.findOne({ ...scope, billId: String(voucher._id) }).session(session);
  if (!outstanding) return { records: [], notes: [], saleIds: [] };
  const sameParty = party?.partyType === "party" && String(party._id) === String(voucher.party?._id);
  const records = await reverseVoucherAdjustments(outstanding, actor, "Voucher edited", session, true);
  const plan = { records, notes: [], saleIds: [], sameParty };
  if (!sameParty) {
    if (party?.partyType !== "party") {
      const released = await Tally.findOne({ ...scope, _id: outstanding._id }).session(session);
      released.bill_amount = 0;
      released.bill_pending_amt = 0;
      released.isCancelled = true;
      await released.save({ session });
    }
    return plan;
  }
  if (voucher.voucherType === "creditNote") {
    plan.saleIds = [...new Set((voucher.selectedSaleIds || []).map(String))];
  } else {
    plan.notes = await CreditNote.find({ ...scope, "party._id": voucher.party._id,
      isCancelled: false, selectedSaleIds: voucher._id,
    }).sort({ date: 1, _id: 1 }).session(session);
    plan.notes = plan.notes.filter(note => (note.selectedSaleIds || []).some(id => String(id) === String(voucher._id)));
  }
  return plan;
}

export async function finishAdjustmentEdit(voucher, plan, actor, session) {
  const used = new Set();
  if (plan.sameParty) {
    const targets = voucher.voucherType === "creditNote"
      ? [[voucher, plan.saleIds]] : plan.notes.map(note => [note, [String(voucher._id)]]);
    for (const [note, ids] of targets) {
      const allocations = await settleCreditNoteSales(note, ids, actor, session, plan.records);
      for (const allocation of allocations) used.add(String(allocation._id));
    }
  }
  for (const record of plan.records) {
    if (!used.has(String(record._id))) {
      record.status = "reversed";
      record.reversedAt = new Date();
      record.reversedBy = actor;
      record.reversalReason = "Voucher edited";
      await record.save({ session });
    }
  }
}
