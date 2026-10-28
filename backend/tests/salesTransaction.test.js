import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Tally from "../models/TallyData.js";
import Sales from "../models/salesModel.js";
import Adjustment from "../models/adjustmentModel.js";
import Series from "../models/VoucherSeriesModel.js";
import Product from "../models/productModel.js";
import { linkReturnSources, makeSalesTransactionController, transactionSeries, validateTransactionProducts } from "../controllers/salesTransactionController.js";
import { prepareSalesTransaction } from "../helpers/salesTransactionInput.js";
import { settleCreditNoteSales } from "../helpers/adjustmentHelper.js";

const id = () => String(new mongoose.Types.ObjectId());
const ids = { company: id(), owner: id(), user: id(), party: id(), source: id(), saleSeries: id(), creditSeries: id(), product: id(), return1: id(), return2: id() };
const party = { _id: ids.party, partyName: "Customer", partyType: "party" };
const item = (product, total) => ({ _id: product, product_name: "Product", total, totalCount: 1,
  GodownList: [{ count: 1, actualCount: 1, selectedPriceRate: total, individualTotal: total, added: true }] });
const body = () => ({ orgId: ids.company, party, voucherType: "sales", series_id: ids.saleSeries,
  selectedDate: "2026-10-23", transactionId: "request-transaction-1", items: [item(ids.product, 1000)],
  paymentSplittingData: [], additionalChargesFromRedux: [], totalAdditionalCharges: 0,
  returnNotes: [{ key: "return-1", partyId: ids.party, status: "pending", selectedSaleIds: [ids.source], items: [item(ids.return1, 150), item(ids.return2, 250)] }],
});
const response = () => ({ status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } });
const query = value => ({ session() { return this; }, select() { return this; }, async lean() { return value; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => key === "party._id" ? String(doc.party?._id) === String(value) : String(doc[key]) === String(value));
const savable = doc => Object.defineProperty(doc, "save", { value: async () => doc });

function harness(t, overrides = {}) {
  let state = { sales: [], notes: [], outstanding: [], adjustments: [], remembered: [], sequences: { sales: 0, creditNote: 0 }, stockCalls: [] };
  const events = [];
  const session = {
    async withTransaction(run) {
      const before = JSON.parse(JSON.stringify(state));
      try { await run(); events.push("commit"); } catch (error) { state = before; events.push("rollback"); throw error; }
    },
    async endSession() { events.push("end"); },
  };
  t.mock.method(CreditNote, "find", () => ({ sort() { return query(state.notes); } }));
  t.mock.method(Tally, "find", () => ({ sort() { return query(state.outstanding.filter(row => row.source === "sales" && row.bill_pending_amt > 0)); } }));
  t.mock.method(Tally, "findOne", filter => query(state.outstanding.find(doc => matches(doc, filter)) || null));
  const sourceSale = { _id: ids.source, party, cmp_id: ids.company, Primary_user_id: ids.owner, isCancelled: false };
  const sourceOutstanding = savable({ _id: id(), billId: ids.source, party_id: ids.party, cmp_id: ids.company,
    Primary_user_id: ids.owner, source: "sales", isCancelled: false, bill_pending_amt: 1000, adjustmentAmount: 0 });
  t.mock.method(Sales, "findOne", filter => query(state.sales.find(doc => matches(doc, filter)) || (matches(sourceSale, filter) ? sourceSale : null)));
  t.mock.method(Tally, "findOne", filter => query(state.outstanding.find(doc => matches(doc, filter)) || (matches(sourceOutstanding, filter) ? sourceOutstanding : null)));
  t.mock.method(Adjustment, "findOne", () => query(null));
  t.mock.method(Adjustment, "create", async (rows, options) => {
    assert.equal(options.session, session);
    const records = rows.map(row => ({ ...row, _id: id(), status: "active" }));
    state.adjustments.push(...records); return records;
  });
  const deps = {
    init: async () => {}, startSession: async () => session,
    authorize: async () => ({ user: { mobile: 123 }, party }), validateProducts: async () => {},
    series: async (req, type, requested, user, usedSession) => { assert.equal(usedSession, session); return type === "sales" ? ids.saleSeries : ids.creditSeries; },
    allocate: async (data, seriesId, usedSession) => {
      assert.equal(usedSession, session);
      const number = ++state.sequences[data.voucherType];
      return { ...data, series_id: seriesId, usedSeriesNumber: number,
        [data.voucherType === "sales" ? "salesNumber" : "creditNoteNumber"]: `${data.voucherType === "sales" ? "S" : "CN"}-${number}` };
    },
    applyStock: async (sale, credit, usedSession) => {
      assert.equal(usedSession, session);
      state.stockCalls.push({ saleItems: sale?.items.length || 0, returnItems: credit?.items.length || 0 });
    },
    postSale: async (req, data, user, usedSession) => {
      assert.equal(usedSession, session);
      const doc = { ...data, _id: id(), cmp_id: ids.company, Primary_user_id: ids.owner, isCancelled: false };
      state.sales.push(doc);
      state.outstanding.push(savable({ _id: id(), billId: doc._id, party_id: ids.party, cmp_id: ids.company,
        Primary_user_id: ids.owner, source: "sales", isCancelled: false, bill_pending_amt: data.finalOutstandingAmount, adjustmentAmount: 0 }));
      return doc;
    },
    postCreditNote: async (req, data, user, usedSession) => {
      assert.equal(usedSession, session);
      const doc = { ...data, _id: id(), cmp_id: ids.company, Primary_user_id: ids.owner, settlementMode: "selected", isCancelled: false };
      state.notes.push(doc);
      state.outstanding.push(savable({ _id: id(), billId: doc._id, party_id: ids.party, cmp_id: ids.company,
        Primary_user_id: ids.owner, source: "creditNote", isCancelled: false, bill_pending_amt: -data.finalAmount, adjustmentAmount: 0 }));
      return doc;
    },
    settleCredit: settleCreditNoteSales, settleSale: async () => [],
    linkSources: async (req, note, usedSession) => {
      assert.equal(usedSession, session);
      for (const sale of state.sales) if (note.returnSourceSaleIds.includes(sale._id)) sale.returnCreditNoteIds = [note._id];
    },
    outstanding: async (req, sale, credit) => {
      const saleBalance = state.outstanding.find(row => row.billId === sale?._id)?.bill_pending_amt || 0;
      const creditBalance = state.outstanding.find(row => row.billId === credit?._id)?.bill_pending_amt || 0;
      return { sale: saleBalance, creditNote: creditBalance, net: saleBalance + creditBalance };
    },
    findReplay: async filter => state.remembered.find(row => row.requestKey === filter.requestKey) || null,
    remember: async (record, usedSession) => { assert.equal(usedSession, session); state.remembered.push(record); },
    ...overrides,
  };
  const controller = makeSalesTransactionController(deps);
  return { state: () => state, events, session, sourceOutstanding, async run(data = body()) {
    const res = response(); await controller({ body: data, owner: ids.owner, sUserId: ids.user, query: {} }, res); return res;
  } };
}

test("mixed save adjusts the selected original sale and preserves the new sale outstanding", async t => {
  const h = harness(t); const res = await h.run();
  assert.equal(res.code, 201);
  assert.equal(h.state().sales.length, 1); assert.equal(h.state().notes.length, 1);
  assert.equal(h.state().sales[0].items.length, 1); assert.equal(h.state().notes[0].items.length, 2);
  assert.equal(res.data.data.sale.salesNumber, "S-1"); assert.equal(res.data.data.creditNote.creditNoteNumber, "CN-1");
  assert.equal(h.state().sales[0].series_id, ids.saleSeries); assert.equal(h.state().notes[0].series_id, ids.creditSeries);
  assert.deepEqual(h.state().notes[0].returnSourceSaleIds, [ids.source]);
  assert.deepEqual(h.state().notes[0].selectedSaleIds, [ids.source]);
  assert.equal(h.state().adjustments.length, 1); assert.equal(h.state().adjustments[0].allocatedAmount, 400);
  assert.equal(h.state().adjustments[0].saleId, ids.source);
  assert.equal(h.state().adjustments[0].creditNoteId, h.state().notes[0]._id);
  assert.deepEqual(res.data.data.outstanding, { sale: 1000, creditNote: 0, net: 1000 });
  assert.deepEqual(h.events, ["commit", "end"]);
});

test("sale-only save never allocates a credit note number or creates an adjustment", async t => {
  const h = harness(t); const data = body(); data.returnNotes = [];
  const res = await h.run(data);
  assert.equal(res.code, 201); assert.equal(res.data.data.creditNote, null);
  assert.deepEqual(h.state().sequences, { sales: 1, creditNote: 0 });
  assert.equal(h.state().adjustments.length, 0);
});

test("return-only save uses only the credit note series and adjusts the original source sale", async t => {
  const h = harness(t); const data = body(); data.items = []; delete data.series_id;
  h.state().sales.push({ _id: ids.source, party, cmp_id: ids.company, Primary_user_id: ids.owner, isCancelled: false });
  h.state().outstanding.push(savable({ _id: id(), billId: ids.source, party_id: ids.party, cmp_id: ids.company,
    Primary_user_id: ids.owner, source: "sales", isCancelled: false, bill_pending_amt: 500, adjustmentAmount: 0 }));
  const res = await h.run(data);
  assert.equal(res.code, 201); assert.equal(res.data.data.sale, null);
  assert.deepEqual(h.state().sequences, { sales: 0, creditNote: 1 });
  assert.equal(h.state().adjustments[0].saleId, ids.source);
  assert.equal(h.state().outstanding[0].bill_pending_amt, 100);
});

test("excess return credit remains as negative outstanding after settling the sale", async t => {
  const h = harness(t); const data = body(); data.returnNotes[0].items = [item(ids.return1, 1200)];
  const res = await h.run(data);
  assert.deepEqual(res.data.data.outstanding, { sale: 1000, creditNote: -200, net: 800 });
  assert.equal(h.state().adjustments[0].allocatedAmount, 1000);
});

test("cash already received reduces only the new sale balance", async t => {
  const h = harness(t); const data = body(); data.paymentSplittingData = [{ type: "cash", ref_id: id(), amount: 100 }];
  const res = await h.run(data);
  assert.deepEqual(res.data.data.outstanding, { sale: 900, creditNote: 0, net: 900 });
});

test("a fully paid new sale does not change the selected original invoice adjustment", async t => {
  const h = harness(t); const data = body(); data.paymentSplittingData = [{ type: "cash", ref_id: id(), amount: 1000 }];
  const res = await h.run(data);
  assert.deepEqual(res.data.data.outstanding, { sale: 0, creditNote: 0, net: 0 });
  assert.equal(h.state().adjustments.length, 1);
});

test("credit-note failure rolls back sale, stock work and both sequence allocations", async t => {
  const h = harness(t, { postCreditNote: async () => { throw new Error("Credit note insert failed"); } });
  const res = await h.run();
  assert.equal(res.code, 500); assert.deepEqual(h.state().sales, []); assert.deepEqual(h.state().outstanding, []);
  assert.deepEqual(h.state().stockCalls, []); assert.deepEqual(h.state().sequences, { sales: 0, creditNote: 0 });
  assert.deepEqual(h.events, ["rollback", "end"]);
});

test("adjustment failure rolls back both documents and their outstanding records", async t => {
  const h = harness(t, { settleCredit: async () => { throw new Error("Adjustment insert failed"); } });
  const res = await h.run();
  assert.equal(res.code, 500); assert.equal(h.state().sales.length, 0); assert.equal(h.state().notes.length, 0);
  assert.equal(h.state().remembered.length, 0); assert.deepEqual(h.state().sequences, { sales: 0, creditNote: 0 });
});

test("unchanged retry returns the committed result without creating duplicate vouchers", async t => {
  const h = harness(t); const first = await h.run(); const second = await h.run();
  assert.equal(second.code, 200); assert.equal(second.data.replayed, true);
  assert.deepEqual(second.data.data, first.data.data);
  assert.equal(h.state().sales.length, 1); assert.equal(h.state().notes.length, 1); assert.equal(h.state().adjustments.length, 1);
  assert.deepEqual(h.state().sequences, { sales: 1, creditNote: 1 });
});

test("reusing a request ID with changed data is rejected", async t => {
  const h = harness(t); await h.run(); const changed = body(); changed.selectedDate = "2026-10-24";
  const res = await h.run(changed);
  assert.equal(res.code, 409); assert.equal(h.state().sales.length, 1);
});

test("unauthorized company access cannot allocate numbers or write documents", async t => {
  const h = harness(t, { authorize: async () => { throw Object.assign(new Error("Denied"), { statusCode: 403 }); } });
  const res = await h.run(); assert.equal(res.code, 403); assert.deepEqual(h.state().sequences, { sales: 0, creditNote: 0 });
});

test("item flags, wrong customers, invalid quantities and already-saved returns are rejected", () => {
  for (const change of [
    data => { data.items[0]._importedReturn = true; },
    data => { data.returnNotes[0].partyId = id(); },
    data => { data.returnNotes[0].status = "saved"; },
    data => { data.items[0].GodownList[0].count = -1; },
    data => { data.items[0].total = 2; },
    data => { data.items = []; data.returnNotes = []; },
  ]) { const data = body(); change(data); assert.throws(() => prepareSalesTransaction(data)); }
});

test("the backend derives separate totals and stock quantities rather than using header overrides", () => {
  const data = body(); data.finalAmount = 999999; data.subTotal = 999999; data.items[0].totalCount = 99;
  const plan = prepareSalesTransaction(data);
  assert.equal(plan.sale.finalAmount, 1000); assert.equal(plan.sale.items[0].totalCount, 1);
  assert.equal(plan.creditNote.finalAmount, 400); assert.equal(plan.creditNote.items.length, 2);
});

test("series selection respects company, voucher type and secondary-user restrictions", async t => {
  const other = id(); const session = {};
  t.mock.method(Series, "findOne", filter => {
    assert.equal(filter.cmp_id, ids.company); assert.equal(filter.Primary_user_id, ids.owner); assert.equal(filter.voucherType, "creditNote");
    return query({ series: [{ _id: other, currentlySelected: true }, { _id: ids.creditSeries }] });
  });
  const user = { configurations: [{ organization: ids.company, selectedVoucherSeries: [{ voucherType: "creditNote", selectedSeriesIds: [ids.creditSeries] }] }] };
  const req = { body: body(), owner: ids.owner };
  assert.equal(await transactionSeries(req, "creditNote", undefined, user, session), ids.creditSeries);
  await assert.rejects(transactionSeries(req, "creditNote", other, user, session), /allowed creditNote/);
});

test("foreign products and cancelled or unrelated source sales are rejected", async t => {
  const data = body(), plan = prepareSalesTransaction(data), req = { body: data, owner: ids.owner };
  t.mock.method(Product, "countDocuments", () => query(0));
  await assert.rejects(validateTransactionProducts(req, plan, {}), /does not belong/);
  t.mock.method(Product, "countDocuments", () => query(3));
  t.mock.method(Sales, "find", filter => { assert.equal(filter["party._id"], ids.party); assert.deepEqual(filter.isCancelled, { $ne: true }); return query([]); });
  await assert.rejects(validateTransactionProducts(req, plan, {}), /source sale/);
});

// These tests exercise the real posting/stock helpers against model boundaries.
import Organization from "../models/OragnizationModel.js";
import CreditNote from "../models/creditNoteModel.js";
import { allocateTransactionNumber, applyTransactionStock, postTransactionSale, postTransactionCreditNote } from "../helpers/salesTransactionPosting.js";

test("the real voucher allocator takes a new number from each independent series", async t => {
  t.mock.method(console, "log", () => {});
  const session = {}, writes = [];
  t.mock.method(Series, "findOne", async (filter, projection, options) => {
    assert.equal(options.session, session);
    const sales = filter.voucherType === "sales";
    return { series: [{ _id: sales ? ids.saleSeries : ids.creditSeries, prefix: sales ? "S-" : "CN-", lastUsedNumber: sales ? 12 : 4, widthOfNumericalPart: 4 }] };
  });
  t.mock.method(Series, "updateOne", async (filter, change, options) => { assert.equal(options.session, session); writes.push({ filter, change }); });
  const sale = await allocateTransactionNumber({ orgId: ids.company, voucherType: "sales" }, ids.saleSeries, session);
  const note = await allocateTransactionNumber({ orgId: ids.company, voucherType: "creditNote" }, ids.creditSeries, session);
  assert.equal(sale.salesNumber, "S-0012"); assert.equal(note.creditNoteNumber, "CN-0004");
  assert.equal(writes[0].change.$set["series.$.lastUsedNumber"], 13);
  assert.equal(writes[1].change.$set["series.$.lastUsedNumber"], 5);
});

test("the real posting helpers write Sales and CreditNote models plus Dr and Cr outstanding in the shared session", async t => {
  t.mock.method(console, "log", () => {});
  const session = {}, saved = [], tally = [];
  t.mock.method(Organization, "findById", () => query({ country: "India" }));
  t.mock.method(Sales, "findOne", () => query(null));
  t.mock.method(CreditNote, "findOne", () => query(null));
  t.mock.method(Sales.prototype, "save", async function(options) { assert.equal(options.session, session); saved.push(this); return this; });
  t.mock.method(CreditNote.prototype, "save", async function(options) { assert.equal(options.session, session); saved.push(this); return this; });
  t.mock.method(Tally, "findOneAndUpdate", async (filter, update, options) => { assert.equal(options.session, session); tally.push(update.$set); return update.$set; });
  const data = body(); data.party = { ...party, accountGroup_id: id() };
  // The credit payment is the remaining customer balance, not a second payment.
  data.paymentSplittingData = [{ type: "credit", credit_reference_type: "party", ref_id: ids.party, amount: 1000 }];
  const plan = prepareSalesTransaction(data);
  const req = { owner: ids.owner, sUserId: ids.user, query: {} };
  const user = { mobile: 123, configurations: [{ organization: ids.company }], async save(options) { assert.equal(options.session, session); } };
  const sale = await postTransactionSale(req, { ...plan.sale, salesNumber: "S-0001", series_id: ids.saleSeries, usedSeriesNumber: 1 }, user, session);
  const note = await postTransactionCreditNote(req, { ...plan.creditNote, selectedSaleIds: [String(sale._id)], creditNoteNumber: "CN-0001", series_id: ids.creditSeries, usedSeriesNumber: 1 }, user, session);
  assert.equal(saved[0].constructor.modelName, "Sales"); assert.equal(saved[1].constructor.modelName, "CreditNote");
  assert.equal(saved[0].items.length, 1); assert.equal(saved[1].items.length, 2);
  assert.equal(String(note.returnSourceSaleIds[0]), ids.source);
  assert.equal(tally.length, 2); assert.equal(tally[0].classification, "Dr"); assert.equal(tally[1].classification, "Cr");
  assert.equal(tally[0].bill_amount, 1000); assert.equal(tally[0].bill_pending_amt, 1000);
  assert.equal(tally[1].bill_pending_amt, -400);
});

test("real stock helpers add returned stock and subtract new sale quantities for the same product", async t => {
  t.mock.method(console, "log", () => {});
  const session = {}, stock = { _id: ids.product, balance_stock: 10, GodownList: [{ balance_stock: 10 }] };
  t.mock.method(Product, "findOne", () => query(JSON.parse(JSON.stringify(stock))));
  const apply = change => Object.assign(stock, change.$set || {});
  t.mock.method(Product, "updateOne", async (filter, update, options) => { assert.equal(options.session, session); apply(update); });
  t.mock.method(Product, "bulkWrite", async (operations, options) => { assert.equal(options.session, session); for (const operation of operations) apply(operation.updateOne.update); });
  const product = { ...item(ids.product, 400), totalCount: 4, totalActualCount: 4, hasGodownOrBatch: false,
    GodownList: [{ count: 4, actualCount: 4, added: true, selectedPriceRate: 100, individualTotal: 400 }] };
  const sold = { ...product, totalCount: 1, totalActualCount: 1, GodownList: [{ ...product.GodownList[0], count: 1, actualCount: 1 }] };
  await applyTransactionStock({ items: [sold] }, { items: [product] }, session);
  assert.equal(stock.balance_stock, 13);
  assert.equal(stock.GodownList[0].balance_stock, 13);
});

import User from "../models/secondaryUserModel.js";
import Party from "../models/partyModel.js";
import { authorizeSalesTransaction } from "../controllers/salesTransactionController.js";

test("authorization uses the owned unblocked company, assigned user and authoritative customer ledger", async t => {
  t.mock.method(Organization, "findOne", filter => { assert.equal(filter.owner, ids.owner); assert.equal(filter.isBlocked, false); return query({}); });
  t.mock.method(User, "findById", () => query({ primaryUser: ids.owner, organization: [ids.company], configurations: [] }));
  const groupId = id();
  t.mock.method(Party, "findOne", filter => {
    assert.equal(filter.cmp_id, ids.company); assert.equal(filter.Primary_user_id, ids.owner);
    return query({ ...party, accountGroup: groupId });
  });
  const req = { body: { ...body(), party: { ...party, partyType: "cash", accountGroup_id: id() } }, owner: ids.owner, sUserId: ids.user };
  const result = await authorizeSalesTransaction(req, {});
  assert.equal(result.party.partyType, "party"); assert.equal(result.party.accountGroup_id, groupId);
  t.mock.method(User, "findById", () => query({ primaryUser: ids.owner, organization: [], configurations: [] }));
  await assert.rejects(authorizeSalesTransaction(req, {}), /access denied/);
});

test("foreign cash/bank payment accounts are rejected before posting", async t => {
  const data = body(); data.returnNotes = []; data.paymentSplittingData = [{ type: "cash", amount: 10, ref_id: id() }];
  const plan = prepareSalesTransaction(data);
  t.mock.method(Product, "countDocuments", () => query(1));
  t.mock.method(Party, "findOne", filter => { assert.equal(filter.cmp_id, ids.company); assert.equal(filter.Primary_user_id, ids.owner); assert.equal(filter.partyType, "cash"); return query(null); });
  await assert.rejects(validateTransactionProducts({ body: data, owner: ids.owner }, plan, {}), /payment source/);
});

test("mixed save leaves older credit notes untouched", async t => {
  const h = harness(t), oldId = id();
  const oldNote = { _id: oldId, party, cmp_id: ids.company, Primary_user_id: ids.owner,
    voucherType: "creditNote", settlementMode: "selected", selectedSaleIds: [ids.source], isCancelled: false };
  h.state().notes.push(oldNote);
  h.state().outstanding.push(savable({ _id: id(), billId: oldId, party_id: ids.party, cmp_id: ids.company,
    Primary_user_id: ids.owner, source: "creditNote", isCancelled: false, bill_pending_amt: -100, adjustmentAmount: 0 }));
  const res = await h.run();
  assert.equal(res.code, 201);
  assert.deepEqual(h.state().adjustments.map(record => record.allocatedAmount), [400]);
  assert.notEqual(h.state().adjustments[0].creditNoteId, oldId);
  assert.equal(h.state().outstanding.find(row=>row.billId===oldId).bill_pending_amt,-100);
  assert.deepEqual(res.data.data.outstanding, { sale: 1000, creditNote: 0, net: 1000 });
});

for (const [label, pending] of [["unpaid",1000],["half paid",500],["fully paid",0]]) {
 for (const returnAmount of [400,1200]) test(`selected ${label} original invoice with return ${returnAmount} preserves the new sale`,async t=>{
  const h=harness(t), data=body();
  h.sourceOutstanding.bill_pending_amt=pending;
  data.returnNotes[0].items=[item(ids.return1,returnAmount)];
  const res=await h.run(data);
  assert.equal(res.code,201);
  const allocated=Math.min(pending,returnAmount);
  assert.equal(h.sourceOutstanding.bill_pending_amt,pending-allocated);
  assert.equal(res.data.data.outstanding.sale,1000);
  assert.equal(res.data.data.outstanding.creditNote,allocated-returnAmount);
  assert.equal(h.state().adjustments.reduce((sum,row)=>sum+row.allocatedAmount,0),allocated);
 });
}

test("saved source sales retain the credit note ID in the same transaction",async t=>{
 const session={}, note={_id:id(),returnSourceSaleIds:[ids.source,id()]};
 let calls=0;
 t.mock.method(Sales,"updateMany",async(filter,update,options)=>{
  calls++;
  assert.equal(filter.cmp_id,ids.company); assert.equal(filter.Primary_user_id,ids.owner);
  assert.equal(filter["party._id"],ids.party);
  assert.deepEqual(filter._id,{$in:note.returnSourceSaleIds});
  assert.deepEqual(update,{$addToSet:{returnCreditNoteIds:note._id}});
  assert.equal(options.session,session);
 });
 await linkReturnSources({body:body(),owner:ids.owner},note,session);
 assert.equal(calls,1);
});
test("removed source invoices are excluded from one credit note's references and adjustment",async t=>{
 const h=harness(t), data=body(), removed=id();
 data.returnNotes[0].selectedSaleIds=[removed,ids.source];
 for(const item of data.returnNotes[0].items) item._returnSourceSaleId=ids.source;
 const res=await h.run(data);
 assert.equal(res.code,201); assert.equal(h.state().notes.length,1);
 assert.deepEqual(h.state().notes[0].selectedSaleIds,[ids.source]);
 assert.deepEqual(h.state().notes[0].returnSourceSaleIds,[ids.source]);
 assert.equal(h.state().notes[0].returnAllocations[0].amount,400);
 assert.deepEqual(h.state().adjustments.map(row=>row.saleId),[ids.source]);
});
test("reference write failure rolls back credit note, sale and allocations",async t=>{
 const h=harness(t,{linkSources:async()=>{throw new Error("Reference write failed");}});
 const res=await h.run(); assert.equal(res.code,500);
 assert.equal(h.state().notes.length,0);assert.equal(h.state().sales.length,0);
 assert.equal(h.state().adjustments.length,0);assert.equal(h.state().remembered.length,0);
});
