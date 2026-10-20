import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Adjustment from "../models/adjustmentModel.js";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";
import { settleCreditNoteSales, reverseVoucherAdjustments } from "../helpers/adjustmentHelper.js";
import { calculateBillPending } from "../helpers/helper.js";
import { voucherEditError } from "../helpers/voucherLifecycleHelper.js";
import { updateTallyData as applyReceipt } from "../helpers/receiptHelper.js";
import { updateTallyData as applyPayment } from "../helpers/paymentHelper.js";
const id = () => new mongoose.Types.ObjectId();
const query = value => ({ session() { return Promise.resolve(value); } });
function fixture(t, amounts = [100], creditAmount = 50) {
  const scope = { cmp_id: id(), Primary_user_id: id() }, party = id(), session = {};
  const documents = [], records = [], saved = [];
  const doc = fields => ({ _id: id(), ...scope, adjustmentAmount: 0, ...fields, async save(options) { assert.equal(options.session, session); saved.push(this._id); } });
  const creditNote = { _id: id(), ...scope, party: { _id: party, partyType: "party" } };
  const credit = doc({ billId: String(creditNote._id), source: "creditNote", bill_pending_amt: -creditAmount });
  const sales = amounts.map(amount => ({ _id: id(), ...scope, amount }));
  documents.push(credit, ...sales.map(sale => doc({ billId: String(sale._id), source: "sales", bill_pending_amt: sale.amount })));
  t.mock.method(Tally, "findOne", filter => {
    assert.equal(String(filter.cmp_id), String(scope.cmp_id));
    assert.equal(String(filter.Primary_user_id), String(scope.Primary_user_id));
    return query(documents.find(d => filter._id ? String(d._id) === String(filter._id) : d.billId === filter.billId));
  });
  t.mock.method(Sales, "findOne", filter => {
    assert.equal(String(filter["party._id"]), String(party));
    assert.equal(filter.isCancelled, false);
    return query(sales.find(sale => String(sale._id) === String(filter._id)));
  });
  t.mock.method(Adjustment, "create", async ([record], options) => {
    assert.equal(options.session, session);
    const value = { _id: id(), status: "active", ...record, async save() {} }; records.push(value); return [value];
  });
  t.mock.method(Adjustment, "find", filter => query(records.filter(record => record.status === "active" && filter.$or.some(condition => Object.entries(condition).every(([key, value]) => String(record[key]) === String(value))))));
  return { creditNote, credit, sales, documents, records, session, saved };
}
for (const [label, amounts, creditAmount, remaining, creditRemaining, allocations] of [
  ["partial sale", [100], 50, [50], 0, [50]],
  ["equal amounts", [100], 100, [0], 0, [100]],
  ["excess credit", [100], 150, [0], -50, [100]],
  ["multiple sales", [100, 100], 150, [0, 50], 0, [100, 50]],
  ["paid sale", [0, 100], 50, [0, 50], 0, [50]],
]) test(label, async t => {
  const f = fixture(t, amounts, creditAmount);
  await settleCreditNoteSales(f.creditNote, f.sales.map(s => s._id), id(), f.session);
  assert.deepEqual(f.documents.slice(1).map(d => d.bill_pending_amt), remaining);
  assert.equal(f.credit.bill_pending_amt, creditRemaining);
  assert.deepEqual(f.records.map(r => r.allocatedAmount), allocations);
  assert.equal(f.credit.adjustmentAmount, allocations.reduce((a, b) => a + b, 0));
});
test("duplicate sale selection allocates once", async t => {
 const f = fixture(t, [100], 150);
 await settleCreditNoteSales(f.creditNote, [f.sales[0]._id, f.sales[0]._id], id(), f.session);
 assert.equal(f.records.length, 1); assert.equal(f.credit.bill_pending_amt, -50);
});
test("unrelated or cancelled selected sale is rejected", async t => {
 const f = fixture(t);
 await assert.rejects(settleCreditNoteSales(f.creditNote, [id()], id(), f.session), /cancelled or does not belong/);
 assert.equal(f.records.length, 0);
});
test("standalone credit note keeps existing behavior", async t => {
 const f = fixture(t);
 await settleCreditNoteSales(f.creditNote, undefined, id(), f.session);
 assert.equal(f.saved.length, 0); assert.equal(f.credit.bill_pending_amt, -50);
});
for (const side of ["sale", "credit note"]) test(side + " cancellation restores both sides exactly once", async t => {
 const f = fixture(t, [100, 100], 150);
 await settleCreditNoteSales(f.creditNote, f.sales.map(s => s._id), id(), f.session);
 const target = side === "sale" ? f.documents[1] : f.credit;
 await reverseVoucherAdjustments(target, id(), "Cancelled", f.session);
 const after = f.documents.map(d => d.bill_pending_amt);
 assert.deepEqual(after, side === "sale" ? [-100, 100, 50] : [-150, 100, 100]);
 await reverseVoucherAdjustments(target, id(), "Cancelled again", f.session);
 assert.deepEqual(f.documents.map(d => d.bill_pending_amt), after);
 assert.equal(f.records.filter(r => r.status === "reversed").length, side === "sale" ? 1 : 2);
});
test("receipt and payment equations preserve adjustments on either side", () => {
 assert.equal(calculateBillPending("sales", 100, 60, 20, 30), 30);
 assert.equal(calculateBillPending("creditNote", 100, 10, 20, 30), -60);
 assert.equal(calculateBillPending("sales", 100, 60, 20), 60);
});
test("active adjustments block edits", async t => {
 t.mock.method(Tally, "findOne", () => query({ adjustmentAmount: 50 }));
 assert.match(await voucherEditError({ _id: id() }, {}), /active adjustments/);
});
test("receipt and payment writes keep adjustment balance", async t => {
 const doc = { _id: id(), billId: "S1", source: "sales", bill_amount: 100, adjustmentAmount: 50, appliedReceipts: [], appliedPayments: [] };
 t.mock.method(Tally, "find", () => query([doc]));
 let operations;
 t.mock.method(Tally, "bulkWrite", async values => { operations = values; });
 await applyReceipt([{ billId: "S1", settledAmount: 10 }], id(), {}, "R1", id());
 assert.equal(operations[0].updateOne.update.$set.bill_pending_amt, 40);
 await applyPayment([{ billId: "S1", settledAmount: 10 }], {}, "P1", id());
 assert.equal(operations[0].updateOne.update.$set.bill_pending_amt, 60);
});
