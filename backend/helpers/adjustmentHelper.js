import mongoose from "mongoose";
import Adjustment from "../models/adjustmentModel.js";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";
import CreditNote from "../models/creditNoteModel.js";

const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });

const isAutomatic = note => note.settlementMode === "automatic" ||
  (note.settlementMode !== "selected" && !note.selectedSaleIds?.length);

// Selected sales use selection order; standalone notes use oldest outstanding first.
export async function settleCreditNoteSales(creditNote, selectedSaleIds, actor, session, reusable = []) {
  selectedSaleIds = selectedSaleIds ?? [];
  if (!Array.isArray(selectedSaleIds) || selectedSaleIds.some(id => !mongoose.isValidObjectId(id))) {
    throw invalid("Invalid selected sales");
  }
  let ids = [...new Set(selectedSaleIds.map(String))];
  const automatic = !ids.length && isAutomatic(creditNote);
  if (!ids.length && !automatic) return [];
  if (creditNote.party?.partyType !== "party") {
    if (automatic) return [];
    throw invalid("Adjustments require a customer account");
  }
  const scope = { cmp_id: creditNote.cmp_id, Primary_user_id: creditNote.Primary_user_id };
  const credit = await Tally.findOne({ ...scope, billId: String(creditNote._id), source: "creditNote", isCancelled: false }).session(session);
  if (!credit) throw invalid("Credit note outstanding was not created");
  if (automatic) {
    const outstandingSales = await Tally.find({ ...scope, party_id: creditNote.party._id,
      source: "sales", isCancelled: false, bill_pending_amt: { $gt: 0 },
    }).sort({ bill_date: 1, _id: 1 }).session(session);
    ids = [...new Set(outstandingSales.map(row => row.billId).filter(id => mongoose.isValidObjectId(id)).map(String))];
  }
  const records = [];
  for (const id of ids) {
    const sale = await Sales.findOne({ ...scope, _id: id, "party._id": creditNote.party._id, isCancelled: false }).session(session);
    if (!sale) {
      if (automatic) continue;
      throw invalid("A selected sale is cancelled or does not belong to this customer/company");
    }
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
    // One document per pair, including history, supports the original unique index.
    let record = reusable.find(row => String(row.saleId) === String(sale._id) && String(row.creditNoteId) === String(creditNote._id));
    if (!record) {
      record = await Adjustment.findOne({ ...scope,
        saleOutstandingId: outstanding._id, creditNoteOutstandingId: credit._id,
      }).session(session);
      if (record?.status === "active") throw new Error("This outstanding pair already has an active adjustment");
    }
    if (record) {
      record.history = record.history || [];
      record.history.push({
        allocatedAmount: record.allocatedAmount, createdBy: record.createdBy,
        status: "reversed", reversedAt: record.reversedAt || new Date(),
        reversedBy: record.reversedBy || actor,
        reversalReason: record.reversalReason || "Voucher edited",
      });
      record.status = "active";
      record.reversedAt = undefined;
      record.reversedBy = undefined;
      record.reversalReason = undefined;
      record.allocatedAmount = amount;
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
    if (isAutomatic(voucher)) return plan;
    plan.saleIds = [...new Set([...(voucher.selectedSaleIds || []).map(String), ...records.map(row => String(row.saleId))])];
    // A previously selected sale may have been cancelled since the note was saved.
    if (!plan.saleIds.length) return plan;
    const eligible = await Sales.find({ ...scope, _id: { $in: plan.saleIds }, "party._id": party._id, isCancelled: false }).session(session);
    const ids = new Set(eligible.map(row => String(row._id)));
    plan.saleIds = plan.saleIds.filter(id => ids.has(id));
  } else if (voucher.voucherType === "sales") {
    const candidates = await CreditNote.find({ ...scope, "party._id": party._id, isCancelled: false,
    }).sort({ createdAt: 1, _id: 1 }).session(session);
    const linkedNotes = new Set(records.map(row => String(row.creditNoteId)));
    plan.notes = candidates.filter(note => isAutomatic(note) || linkedNotes.has(String(note._id)) ||
      note.selectedSaleIds?.some(id => String(id) === String(voucher._id)));
  }
  return plan;
}

export async function finishAdjustmentEdit(voucher, plan, actor, session) {
  const used = new Set();
  if (plan.sameParty) {
    const notes = voucher.voucherType === "creditNote" ? [voucher] : plan.notes;
    for (const note of notes) {
      const ids = voucher.voucherType === "creditNote" ? plan.saleIds : [String(voucher._id)];
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
