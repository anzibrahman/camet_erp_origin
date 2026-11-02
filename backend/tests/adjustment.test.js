import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Adjustment from "../models/adjustmentModel.js";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";
import CreditNote from "../models/creditNoteModel.js";
import Series from "../models/VoucherSeriesModel.js";
import Secondary from "../models/secondaryUserModel.js";
import Company from "../models/OragnizationModel.js";
import Settlement from "../models/settlementModel.js";
import Product from "../models/productModel.js";
import { createSale, editSale } from "../controllers/saleController.js";
import { editCreditNote } from "../controllers/creditNoteController.js";
import { settleSaleCreditNotes, beginAdjustmentEdit, finishAdjustmentEdit, settleCreditNoteSales, reverseVoucherAdjustments } from "../helpers/adjustmentHelper.js";
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
  const creditNote = { _id: id(), voucherType: "creditNote", ...scope, party: { _id: party, partyType: "party" } };
  const credit = doc({ billId: String(creditNote._id), source: "creditNote", bill_pending_amt: -creditAmount });
  const sales = amounts.map(amount => ({ _id: id(), voucherType: "sales", party: creditNote.party, ...scope, amount }));
  creditNote.selectedSaleIds = sales.map(sale => sale._id);
  t.mock.method(Sales, "find", () => query(sales));
  t.mock.method(CreditNote, "find", () => ({ sort() { return query([creditNote]); } }));
  documents.push(credit, ...sales.map(sale => doc({ billId: String(sale._id), source: "sales", bill_pending_amt: sale.amount })));
  t.mock.method(Tally, "find", filter => ({ sort(order) {
    assert.equal(String(filter.party_id), String(party));
    assert.equal(String(filter.cmp_id), String(scope.cmp_id));
    assert.equal(String(filter.Primary_user_id), String(scope.Primary_user_id));
    assert.equal(filter.source,"sales"); assert.equal(filter.isCancelled,false);
    assert.deepEqual(filter.bill_pending_amt,{$gt:0});
    assert.deepEqual(order,{bill_date:1,_id:1});
    return query(documents.filter(d=>d.source === "sales" && d.bill_pending_amt>0));
  } }));
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
    // Reproduce the original database index: even reversed duplicate pairs fail.
    if (records.some(row => String(row.saleOutstandingId) === String(record.saleOutstandingId) && String(row.creditNoteOutstandingId) === String(record.creditNoteOutstandingId))) {
      throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
    }
    const value = { _id: id(), status: "active", ...record, async save() {} }; records.push(value); return [value];
  });
  t.mock.method(Adjustment, "findOne", filter => query(records.find(row => String(row.saleOutstandingId) === String(filter.saleOutstandingId) && String(row.creditNoteOutstandingId) === String(filter.creditNoteOutstandingId))));
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
test("standalone credit note leaves both balances open without a selection", async t => {
 const f = fixture(t,[200],100);
 f.creditNote.selectedSaleIds=[];
 await settleCreditNoteSales(f.creditNote, undefined, id(), f.session);
 assert.equal(f.records.length,0);
 assert.equal(f.documents[1].bill_pending_amt,200);
 assert.equal(f.credit.bill_pending_amt,-100);
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
test("active adjustments allow edits", async t => {
 t.mock.method(Tally, "findOne", () => query({ adjustmentAmount: 50 }));
 assert.equal(await voucherEditError({ _id: id() }, {}), null);
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

for (const [kind, amount, salePending, creditPending] of [
 ["sales", 30, 0, -20], ["sales", 150, 100, 0],
 ["creditNote", 20, 80, 0], ["creditNote", 120, 0, -20],
]) test(kind + " edit to " + amount + " recalculates and preserves history", async t => {
 const f = fixture(t);
 await settleCreditNoteSales(f.creditNote, f.creditNote.selectedSaleIds, id(), f.session);
 const voucher = kind === "sales" ? f.sales[0] : f.creditNote;
 const plan = await beginAdjustmentEdit(voucher, voucher.party, voucher.cmp_id, id(), f.session);
 const target = kind === "sales" ? f.documents[1] : f.credit;
 target.bill_amount = amount; target.bill_pending_amt = kind === "sales" ? amount : -amount;
 await finishAdjustmentEdit(voucher, plan, id(), f.session);
 assert.equal(f.documents[1].bill_pending_amt, salePending);
 assert.equal(f.credit.bill_pending_amt, creditPending);
 assert.equal(f.records.filter(r => r.status === "active").length, 1);
 assert.equal(f.records.length, 1);
 assert.equal(f.records[0].history.length, 1);
 assert.equal(f.records[0].history[0].allocatedAmount, 50);
 // Cancelling after an edit restores the newly allocated amount, not the old one.
 await reverseVoucherAdjustments(target, id(), "Cancelled after editing", f.session);
 assert.equal(f.documents[1].bill_pending_amt, kind === "sales" ? amount : 100);
 assert.equal(f.credit.bill_pending_amt, kind === "creditNote" ? -amount : -50);
});
test("credit note edit redistributes in oldest-sale order", async t => {
 const f = fixture(t, [100,100,100],250);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const plan=await beginAdjustmentEdit(f.creditNote,f.creditNote.party,f.creditNote.cmp_id,id(),f.session);
 f.credit.bill_amount=120; f.credit.bill_pending_amt=-120;
 await finishAdjustmentEdit(f.creditNote,plan,id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(d=>d.bill_pending_amt),[0,80,100]);
 assert.equal(f.credit.bill_pending_amt,0);
 assert.equal(f.records.filter(r=>r.status === "active").length,2);
});
test("sale reduction retains surplus without adjusting another invoice", async t => {
 const f=fixture(t,[100,100,100],250);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const sale=f.sales[0];
 const plan=await beginAdjustmentEdit(sale,sale.party,sale.cmp_id,id(),f.session);
 f.documents[1].bill_amount=30; f.documents[1].bill_pending_amt=30;
 await finishAdjustmentEdit(sale,plan,id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(d=>d.bill_pending_amt),[0,0,50]);
 assert.equal(f.credit.bill_pending_amt,-70);
});
test("zero amount edit releases allocation without leaving an active pair", async t => {
 const f=fixture(t);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const plan=await beginAdjustmentEdit(f.creditNote,f.creditNote.party,f.creditNote.cmp_id,id(),f.session);
 f.credit.bill_amount=0; f.credit.bill_pending_amt=0;
 await finishAdjustmentEdit(f.creditNote,plan,id(),f.session);
 assert.equal(f.documents[1].bill_pending_amt,100);
 assert.equal(f.records.filter(r=>r.status === "active").length,0);
});

test("sale increase uses available credit from all three linked notes", async t => {
 const f=fixture(t,[160],100);
 const notes=[f.creditNote];
 for(let i=0;i<2;i++) {
   const note={...f.creditNote,_id:id()}; notes.push(note);
   f.documents.push({...f.credit,_id:id(),billId:String(note._id),bill_pending_amt:-100,adjustmentAmount:0});
 }
 t.mock.method(CreditNote,"find",()=>({sort(){return query(notes);}}));
 for(const note of notes) await settleCreditNoteSales(note,note.selectedSaleIds,id(),f.session);
 assert.deepEqual([f.credit,...f.documents.slice(2)].map(d=>d.bill_pending_amt),[0,-40,-100]);
 const sale=f.sales[0];
 const plan=await beginAdjustmentEdit(sale,sale.party,sale.cmp_id,id(),f.session);
 f.documents[1].bill_pending_amt=250;
 await finishAdjustmentEdit(sale,plan,id(),f.session);
 assert.equal(f.documents[1].bill_pending_amt,0);
 assert.deepEqual([f.credit,...f.documents.slice(2)].map(d=>d.bill_pending_amt),[0,0,-50]);
 await reverseVoucherAdjustments(f.documents[1],id(),"Sale cancelled",f.session);
 assert.deepEqual([f.credit,...f.documents.slice(2)].map(d=>d.bill_pending_amt),[-100,-100,-100]);
});
for(const kind of ["sales","creditNote"]) for(const fail of [false,true]) test(kind+" edit transaction "+(fail?"aborts on allocation failure":"updates both balances before commit"),async t=>{
 const f=fixture(t);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const voucher=kind==="sales"?f.sales[0]:f.creditNote;
 Object.assign(voucher,{series_id:id(),items:[],salesNumber:"S1",creditNoteNumber:"C1",finalAmount:kind==="sales"?100:50,finalOutstandingAmount:kind==="sales"?100:50});
 voucher.party.accountGroup_id=id();
 const events=[];
 Object.assign(f.session,{startTransaction(){},async abortTransaction(){events.push("abort");},async commitTransaction(){
   assert.equal(f.documents[1].bill_pending_amt,kind==="sales"?0:80);
   assert.equal(f.credit.bill_pending_amt,kind==="sales"?-20:0);
   events.push("commit");
 },endSession(){}});
 t.mock.method(mongoose,"startSession",async()=>f.session);
 const model=kind==="sales"?Sales:CreditNote;
 t.mock.method(model,"findById",()=>query(voucher));
 t.mock.method(model,"findByIdAndUpdate",async(_id,updates,options)=>{assert.equal(options.session,f.session);return {...voucher,...updates};});
 t.mock.method(Secondary,"findById",()=>query({mobile:"123"}));
 t.mock.method(Company,"findById",()=>query({country:"India"}));
 t.mock.method(Settlement,"deleteMany",async()=>({}));
 t.mock.method(Product,"bulkWrite",async()=>({}));
 t.mock.method(Tally,"findByIdAndUpdate",async(key,updates,options)=>{
  assert.equal(options.session,f.session);
  const doc=f.documents.find(d=>String(d._id)===String(key));Object.assign(doc,updates);return doc;
 });
 if(fail) t.mock.method(f.records[0],"save",async()=>{throw new Error("Allocation storage failed");});
 const req={params:{id:String(voucher._id)},query:{},owner:voucher.Primary_user_id,sUserId:id(),body:{orgId:voucher.cmp_id,party:voucher.party,items:[],series_id:voucher.series_id,finalAmount:kind==="sales"?30:20,finalOutstandingAmount:kind==="sales"?30:20,selectedDate:"2026-10-20",paymentSplittingData:[]}};
 const res={status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await (kind==="sales"?editSale:editCreditNote)(req,res);
 assert.equal(res.code,fail?500:200);
 assert.deepEqual(events,[fail?"abort":"commit"]);
});

test("changing customer releases old links without applying another customer's credit",async t=>{
 const f=fixture(t);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const changedParty={...f.sales[0].party,_id:id()};
 const plan=await beginAdjustmentEdit(f.sales[0],changedParty,f.sales[0].cmp_id,id(),f.session);
 await finishAdjustmentEdit({...f.sales[0],party:changedParty},plan,id(),f.session);
 assert.equal(f.credit.bill_pending_amt,-50);
 assert.equal(f.documents[1].bill_pending_amt,100);
 assert.equal(f.records.filter(r=>r.status === "active").length,0);
});

test("zero edit followed by increase reuses the reversed pair under the original unique index",async t=>{
 const f=fixture(t);
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 const originalId=String(f.records[0]._id);
 for(const amount of [0,30,20,80]) {
   const plan=await beginAdjustmentEdit(f.creditNote,f.creditNote.party,f.creditNote.cmp_id,id(),f.session);
   f.credit.bill_pending_amt=amount === 0 ? 0 : -amount;
   await finishAdjustmentEdit(f.creditNote,plan,id(),f.session);
   assert.equal(f.documents[1].bill_pending_amt,100-amount);
   assert.equal(f.credit.bill_pending_amt,0);
 }
 assert.equal(f.records.length,1);
 assert.equal(String(f.records[0]._id),originalId);
 assert.deepEqual(f.records[0].history.map(row=>row.allocatedAmount),[50,30,20]);
 assert.equal(f.records[0].allocatedAmount,80);
});

test("selected credit adjusts only the selected invoice, leaving older sales open",async t=>{
 const f=fixture(t,[100,100],150);
 await settleCreditNoteSales(f.creditNote,[f.sales[1]._id],id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(d=>d.bill_pending_amt),[100,0]);
 assert.equal(f.credit.bill_pending_amt,-50);
});
test("standalone note stays unallocated on edit",async t=>{
 const f=fixture(t,[100,100],150); f.creditNote.selectedSaleIds=[];
 const plan=await beginAdjustmentEdit(f.creditNote,f.creditNote.party,f.creditNote.cmp_id,id(),f.session);
 f.credit.bill_pending_amt=-200;
 await finishAdjustmentEdit(f.creditNote,plan,id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(d=>d.bill_pending_amt),[100,100]);
 assert.equal(f.credit.bill_pending_amt,-200); assert.equal(f.records.length,0);
});
for(const amount of [150,200,250]) test("standalone sale of "+amount+" does not consume earlier credit",async t=>{
 const f=fixture(t,[amount],200);
 assert.deepEqual(await settleSaleCreditNotes(f.sales[0],id(),f.session),[]);
 assert.equal(f.documents[1].bill_pending_amt,amount);
 assert.equal(f.credit.bill_pending_amt,-200); assert.equal(f.records.length,0);
});

test("paid, cash, and non-sales documents never consume customer credit",async t=>{
 const f=fixture(t,[0],100);f.creditNote.selectedSaleIds=[];
 assert.deepEqual(await settleSaleCreditNotes(f.sales[0],id(),f.session),[]);
 assert.deepEqual(await settleSaleCreditNotes({...f.sales[0],party:{partyType:"cash"}},id(),f.session),[]);
 assert.deepEqual(await settleSaleCreditNotes({...f.sales[0],voucherType:"vanSale"},id(),f.session),[]);
 assert.equal(f.records.length,0);
});

for(const fail of [false,true]) test("standalone sale leaves earlier credit untouched even when adjustment storage would fail: "+fail,async t=>{
 const f=fixture(t,[200],100); f.creditNote.selectedSaleIds=[];
 const series=String(id()),actor=id(),events=[];
 Object.assign(f.session,{startTransaction(){},async abortTransaction(){events.push("abort");},async commitTransaction(){
   assert.equal(f.documents[1].bill_pending_amt,200);assert.equal(f.credit.bill_pending_amt,-100);events.push("commit");
 },endSession(){}});
 t.mock.method(mongoose,"startSession",async()=>f.session);
 t.mock.method(Series,"findOne",async()=>({series:[{_id:series,lastUsedNumber:1,prefix:"S-"}]}));
 t.mock.method(Series,"updateOne",async()=>({}));
 t.mock.method(Secondary,"findById",()=>query({configurations:[],mobile:"123"}));
 t.mock.method(Company,"findById",()=>query({country:"India"}));
 t.mock.method(Product,"bulkWrite",async()=>({}));
 t.mock.method(Sales,"findOne",filter=>filter._id?query(f.sales[0]):Promise.resolve(null));
 t.mock.method(Sales.prototype,"save",async function(options){assert.equal(options.session,f.session);this._id=f.sales[0]._id;return this;});
 t.mock.method(Tally,"findOneAndUpdate",async(filter,update,options)=>{
   assert.equal(options.session,f.session);Object.assign(f.documents[1],update.$set);return f.documents[1];
 });
 if(fail)t.mock.method(Adjustment,"create",async()=>{throw new Error("Allocation storage failed");});
 const req={params:{},query:{},owner:f.sales[0].Primary_user_id,sUserId:actor,body:{orgId:String(f.sales[0].cmp_id),voucherType:"sales",series_id:series,
  party:{...f.sales[0].party,accountGroup_id:id(),partyName:"Customer"},items:[],additionalChargesFromRedux:[],finalAmount:200,finalOutstandingAmount:200,selectedDate:"2026-10-22",paymentSplittingData:[]}};
 const res={status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await createSale(req,res);
 assert.equal(res.code,201);
 assert.deepEqual(events,["commit"]);
 assert.deepEqual(res.data.adjustments,[]);
});

test("source-aware credit only adjusts each invoice by its own remaining returned amount",async t=>{
 const f=fixture(t,[100,200,120],220);
 f.creditNote.selectedSaleIds=[f.sales[1]._id,f.sales[2]._id];
 f.creditNote.returnAllocations=[{saleId:f.sales[1]._id,amount:100},{saleId:f.sales[2]._id,amount:120}];
 await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(doc=>doc.bill_pending_amt),[100,100,0]);
 assert.deepEqual(f.records.map(row=>row.allocatedAmount),[100,120]);
 assert.equal(f.credit.bill_pending_amt,0);
});
test("paid source surplus cannot settle another selected invoice or be reapplied twice",async t=>{
 const f=fixture(t,[0,200],200);
 f.creditNote.returnAllocations=f.sales.map(sale=>({saleId:sale._id,amount:100}));
 for(let i=0;i<2;i++) await settleCreditNoteSales(f.creditNote,f.creditNote.selectedSaleIds,id(),f.session);
 assert.deepEqual(f.documents.slice(1).map(doc=>doc.bill_pending_amt),[0,100]);
 assert.equal(f.credit.bill_pending_amt,-100);assert.equal(f.records.length,1);
 const plan=await beginAdjustmentEdit(f.sales[1],f.sales[1].party,f.sales[1].cmp_id,id(),f.session);
 f.documents[2].bill_pending_amt=250;
 await finishAdjustmentEdit(f.sales[1],plan,id(),f.session);
 assert.equal(f.documents[2].bill_pending_amt,150); assert.equal(f.credit.bill_pending_amt,-100);
});
