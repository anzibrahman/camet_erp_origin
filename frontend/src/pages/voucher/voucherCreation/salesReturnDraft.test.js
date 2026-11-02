import test from "node:test";
import assert from "node:assert/strict";
import { combineSaleReturnItems } from "./creditNoteSaleItems.js";
import { reduceImportProduct, updateSalesReturnSource, salesTransactionSubmission, createSalesReturnKey, salesReturnDate, createSalesReturnDraft, salesReturnDisplayItems, saveSalesReturnCreditNote } from "./salesReturnDraft.js";

const sale = { _id: "sale-1", party: { _id: "customer-1" }, items: [{
  _id: "product-1", product_name: "Chair", unit: "Nos", igst: 5, cgst: 2.5, sgst: 2.5,
  GodownList: [{ count: 4, actualCount: 8, selectedPriceRate: 100, added: true, discountType: "amount", discountAmount: 40 }],
}] };
const draft = () => createSalesReturnDraft(combineSaleReturnItems([sale]), { "0:0": 2 }, [sale], "customer-1", "draft-1");

test("return draft preserves selected quantities and sale history", () => {
  const before = JSON.stringify(sale);
  const note = draft();
  assert.equal(note.status, "pending");
  assert.equal(note.items[0].totalCount, 2);
  assert.equal(note.items[0].totalActualCount, 4);
  assert.equal(note.items[0].total, 189);
  assert.equal(note.items[0]._importedReturn, true);
  assert.deepEqual(note.selectedSaleIds, ["sale-1"]);
  assert.equal(JSON.stringify(sale), before);
});

test("returns appear beside sale items without mutating the sale payload or totals", () => {
  const items = [{ _id: "product-1", total: 500 }];
  const note = draft();
  const displayed = salesReturnDisplayItems(items, [note], "customer-1");
  assert.equal(displayed.length, 2);
  assert.equal(displayed[0]._importedReturn, true);
  assert.notEqual(displayed[0]._voucherLineId, items[0]._id);
  assert.deepEqual(items, [{ _id: "product-1", total: 500 }]);
  assert.equal(salesReturnDisplayItems(items, [note], "another-customer").length, 1);
});

test("saved credit note rows remain visible with the saved credit note number", () => {
  const note = { ...draft(), status: "saved", number: "CN-001" };
  const [item] = salesReturnDisplayItems([], [note], "customer-1");
  assert.equal(item._returnSaved, true);
  assert.equal(item._returnNoteNumber, "CN-001");
});

test("saving uses a credit note series and sends only return items to createCreditNote", async () => {
  const calls = [];
  const api = {
    get: async (url, options) => {
      calls.push({ url, options });
      return { data: { series: [{ _id: "other-series" }, { _id: "credit-series", currentlySelected: true, currentNumber: 5 }] } };
    },
    post: async (url, payload, options) => {
      calls.push({ url, payload, options });
      return { data: { data: { _id: "credit-1", creditNoteNumber: "CN-005" } } };
    },
  };
  const note = draft();
  const before = JSON.stringify(note);
  const result = await saveSalesReturnCreditNote(api, { note, cmpId: "company-1", party: sale.party, selectedDate: "2026-10-23" });
  assert.equal(result.creditNoteNumber, "CN-005");
  assert.equal(calls[0].options.params.voucherType, "creditNote");
  assert.equal(calls[1].url, "/api/sUsers/createCreditNote");
  assert.equal(calls[1].payload.series_id, "credit-series");
  assert.equal(calls[1].payload.finalAmount, 189);
  assert.equal(calls[1].payload.voucherType, "creditNote");
  assert.deepEqual(calls[1].payload.selectedSaleIds, ["sale-1"]);
  assert.equal(calls[1].payload.items[0]._importedReturn, undefined);
  assert.equal(calls[1].payload.items[0]._voucherLineId, undefined);
  assert.equal(calls[1].options.withCredentials, true);
  assert.equal(JSON.stringify(note), before);
});

test("save failures preserve pending return products", async () => {
  const note = draft();
  const api = { get: async () => ({ data: { series: [{ _id: "series" }] } }), post: async () => { throw new Error("Network failure"); } };
  await assert.rejects(saveSalesReturnCreditNote(api, { note, cmpId: "company-1", party: sale.party, selectedDate: "2026-10-23" }), /Network failure/);
  assert.equal(note.status, "pending");
  assert.equal(note.items[0].totalCount, 2);
});

test("missing credit note series blocks saving without posting", async () => {
  let posted = false;
  const api = { get: async () => ({ data: { series: [] } }), post: async () => { posted = true; } };
  await assert.rejects(saveSalesReturnCreditNote(api, { note: draft(), cmpId: "company-1", party: sale.party }), /No credit note series/);
  assert.equal(posted, false);
});

test("mismatched customers cannot create or save return drafts", async () => {
  assert.throws(() => createSalesReturnDraft(combineSaleReturnItems([sale]), {}, [sale], "another-customer", "key"), /this customer/);
  await assert.rejects(saveSalesReturnCreditNote({}, { note: draft(), party: { _id: "another-customer" } }), /customer has changed/);
});

test("empty product selection cannot be imported", () => {
  assert.throws(() => createSalesReturnDraft(combineSaleReturnItems([sale]), { "0:0": 0 }, [sale], "customer-1", "key"), /at least one product/);
});

test("return state stays separate from sales and clears when the customer changes", async () => {
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
  const { default: reducer, setSalesReturnNotes, markSalesReturnSaved, addParty, setItem, addVoucherType } = await import("../../../../slices/voucherSlices/commonVoucherSlice.js");
  let state = reducer(undefined, addVoucherType("sales"));
  state = reducer(state, addParty(sale.party));
  state = reducer(state, setItem([{ _id: "normal-sale-item", total: 500 }]));
  state = reducer(state, setSalesReturnNotes([draft()]));
  state = reducer(state, markSalesReturnSaved({ key: "draft-1", id: "credit-1", number: "CN-001" }));
  assert.equal(state.voucherType, "sales");
  assert.deepEqual(state.items, [{ _id: "normal-sale-item", total: 500 }]);
  assert.equal(state.salesReturnNotes[0].number, "CN-001");
  state = reducer(state, addParty({ _id: "another-customer" }));
  assert.deepEqual(state.salesReturnNotes, []);
  state = reducer(state, markSalesReturnSaved({ key: "draft-1", id: "credit-1", number: "CN-001" }));
  assert.deepEqual(state.salesReturnNotes, []);
});

test("saved credit notes cannot be submitted again", async () => {
  await assert.rejects(saveSalesReturnCreditNote({}, { note: { ...draft(), status: "saved" }, party: sale.party }), /already been saved/);
});

test("return products are first even when there are many normal sale rows", () => {
  const normal = Array.from({ length: 50 }, (_, index) => ({ _id: `sale-product-${index}`, total: 100 }));
  const displayed = salesReturnDisplayItems(normal, [draft()], "customer-1");
  assert.equal(displayed[0]._importedReturn, true);
  assert.equal(displayed[1], normal[0]);
  assert.equal(normal.length, 50);
});

test("import keys work when randomUUID is unavailable on an HTTP origin", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: {} });
  try {
    const key = createSalesReturnKey();
    assert.match(key, /^return-/);
    assert.notEqual(key, createSalesReturnKey());
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete globalThis.crypto;
  }
});

test("return saving accepts the JSON-encoded date initialized by the Sales page", async () => {
  const date = JSON.stringify(new Date("2026-10-23T06:00:00.000Z"));
  assert.equal(salesReturnDate(date), "2026-10-23T06:00:00.000Z");
  let payload;
  const api = {
    get: async () => ({ data: { series: [{ _id: "series" }] } }),
    post: async (url, data) => { payload = data; return { data: { data: { _id: "credit-1" } } }; },
  };
  await saveSalesReturnCreditNote(api, { note: draft(), cmpId: "company-1", party: sale.party, selectedDate: date });
  assert.equal(payload.selectedDate, "2026-10-23T06:00:00.000Z");
});
test("Save Transaction includes unsaved returns separately and excludes already-saved notes", () => {
  const prepared = salesTransactionSubmission({ voucherType: "sales", items: [{ _id: "normal", total: 500 }], salesNumber: "preview", usedSeriesNumber: 1 },
    [draft(), { ...draft(), key: "old-note", status: "saved" }]);
  assert.equal(prepared.payload.items.length, 1);
  assert.equal(prepared.payload.returnNotes.length, 1);
  assert.equal(prepared.payload.returnNotes[0].items[0]._importedReturn, true);
  assert.equal(prepared.payload.salesNumber, undefined);
  assert.equal(prepared.payload.usedSeriesNumber, undefined);
});

test("unchanged transaction retry preserves its ID, while edited products get a new ID", () => {
  const body = { items: [{ _id: "normal", total: 500 }] };
  const first = salesTransactionSubmission(body, [draft()]);
  const retry = salesTransactionSubmission(body, [draft()], first);
  assert.equal(first.payload.transactionId, retry.payload.transactionId);
  const changed = salesTransactionSubmission({ items: [{ _id: "normal", total: 600 }] }, [draft()], retry);
  assert.notEqual(changed.payload.transactionId, retry.payload.transactionId);
});
const sourceProduct = (productId, price, quantity = 1) => ({ _id: productId, product_name: productId, unit: "Nos",
  GodownList: [{ count: quantity, actualCount: quantity, selectedPriceRate: price, added: true }] });
const multiSales = () => [
  { _id: "s1", salesNumber: "S1", party: sale.party, items: [sourceProduct("a",100)] },
  { _id: "s2", salesNumber: "S2", party: sale.party, items: [sourceProduct("a",100),sourceProduct("b",100)] },
  { _id: "s3", salesNumber: "S3", party: sale.party, items: [sourceProduct("d",120)] },
];
const multiDraft = () => createSalesReturnDraft(combineSaleReturnItems(multiSales()), {}, multiSales(), "customer-1", "multi");
test("three sales show one merged A while retaining both original invoice quantities", () => {
 const note=multiDraft();
 const rows=salesReturnDisplayItems([], [note], "customer-1");
 assert.equal(rows.length,3);
 const a=rows.find(item=>item._id==="a");
 assert.equal(a.totalCount,2); assert.equal(a.total,200);
 assert.deepEqual(a._returnSources.map(source=>source.salesNumber),["S1","S2"]);
 assert.deepEqual(note.selectedSaleIds,["s1","s2","s3"]);
});
test("remove A from S1 excludes S1, leaving S2's A and B and S3's D", () => {
 const note=multiDraft(); const a=note.items.find(item=>item._returnSourceSaleId==="s1");
 const [remaining]=updateSalesReturnSource([note],note.key,a._voucherLineId,0);
 assert.deepEqual(remaining.selectedSaleIds,["s2","s3"]);
 assert.deepEqual(remaining.items.map(item=>item._id),["a","b","d"]);
 assert.equal(remaining.items.reduce((sum,item)=>sum+item.total,0),320);
 assert.equal(note.items.length,4);
});
test("removing both A quantities excludes S1 but keeps S2 for its B", () => {
 let notes=[multiDraft()];
 for(const item of notes[0].items.filter(item=>item._id==="a")) notes=updateSalesReturnSource(notes,"multi",item._voucherLineId,0);
 assert.deepEqual(notes[0].selectedSaleIds,["s2","s3"]);
 assert.deepEqual(notes[0].items.map(item=>item._id),["b","d"]);
 assert.equal(notes[0].items.reduce((sum,item)=>sum+item.total,0),220);
});
test("partial source removal scales taxes and actual quantities and rejects increases", () => {
 const note=draft(); const item=note.items[0];
 const [updated]=updateSalesReturnSource([note],note.key,item._voucherLineId,1);
 assert.equal(updated.items[0].total,94.5); assert.equal(updated.items[0].totalActualCount,2);
 assert.throws(()=>updateSalesReturnSource([note],note.key,item._voucherLineId,3),/quantity/);
 assert.deepEqual(updateSalesReturnSource([note],note.key,item._voucherLineId,0),[]);
});
test("same product at different sale rates has one display row and retains source values", () => {
 const sales=multiSales();sales[1].items[0]=sourceProduct("a",200);
 const note=createSalesReturnDraft(combineSaleReturnItems(sales),{},sales,"customer-1","rates");
 const rows=salesReturnDisplayItems([], [note], "customer-1");
 const a=rows.find(item=>item._id==="a");
 assert.equal(rows.length,3);assert.equal(a.total,300);assert.equal(a.totalCount,2);
 assert.deepEqual(a._returnSources.map(source=>source.amount),[100,200]);
});

test("modal decrement requires choosing which original sale loses one unit", () => {
 const draft=multiDraft(), product=salesReturnDisplayItems([], [draft], "customer-1").find(item=>item._id==="a");
 const quantities=Object.fromEntries(product._returnSources.map(source=>[source.lineId,source.quantity]));
 assert.throws(()=>reduceImportProduct(draft,product,quantities,1),/Reduce at least/);
 const s2=product._returnSources.find(source=>source.saleId==="s2");
 quantities[s2.lineId]=0;
 const reduced=reduceImportProduct(draft,product,quantities,1);
 assert.equal(reduced.items.find(item=>item._returnSourceSaleId==="s1").totalCount,1);
 assert.equal(reduced.items.filter(item=>item._returnSourceSaleId==="s2"&&item._id==="a").length,0);
 assert.deepEqual(reduced.selectedSaleIds,["s1","s2","s3"]);
});
test("modal removing both merged A units drops S1 and keeps S2's other product", () => {
 const draft=multiDraft(), product=salesReturnDisplayItems([], [draft], "customer-1").find(item=>item._id==="a");
 const quantities=Object.fromEntries(product._returnSources.map(source=>[source.lineId,0]));
 const reduced=reduceImportProduct(draft,product,quantities);
 assert.deepEqual(reduced.selectedSaleIds,["s2","s3"]);
 assert.deepEqual(reduced.items.map(item=>item._id),["b","d"]);
 assert.throws(()=>reduceImportProduct(draft,product,quantities,1),/exactly 1/);
});
test("modal disallows increasing quantities and can remove the last return product", () => {
 const note=draft(), product=salesReturnDisplayItems([], [note], "customer-1")[0];
 const key=product._returnSources[0].lineId;
 assert.throws(()=>reduceImportProduct(note,product,{[key]:3}),/only be reduced/);
 const reduced=reduceImportProduct(note,product,{[key]:1},1);
 const smaller=salesReturnDisplayItems([], [reduced], "customer-1")[0];
 assert.throws(()=>reduceImportProduct(reduced,smaller,{[key]:2}),/only be reduced/);
 assert.equal(reduceImportProduct(reduced,smaller,{[key]:0},0),null);
});

import { returnableSales } from "./creditNoteSaleItems.js";
import { toggleImportProduct } from "./salesReturnDraft.js";

test("review starts with available 4 after 6 of 10 sold were saved as returns", () => {
  const original = { _id: "sale-balance", salesNumber: "S-BAL", party: { _id: "customer-1" }, items: [{
    ...sale.items[0], soldQuantity: 10, returnedQuantity: 6, availableReturnQuantity: 4,
    GodownList: [{ count: 10, actualCount: 20, added: true, selectedPriceRate: 100,
      soldQuantity: 10, returnedQuantity: 6, availableReturnQuantity: 4 }],
  }] };
  const before = JSON.stringify(original);
  const available = returnableSales([original]);
  const note = createSalesReturnDraft(combineSaleReturnItems(available), {}, [original], "customer-1", "balance");
  const [product] = salesReturnDisplayItems([], [note], "customer-1");
  assert.equal(product.totalCount, 4);
  assert.equal(product._returnSources[0].soldQuantity, 10);
  assert.equal(product._returnSources[0].returnedQuantity, 6);
  assert.equal(product._returnSources[0].availableQuantity, 4);
  assert.throws(() => reduceImportProduct(note, product, { [product._returnSources[0].lineId]: 6 }), /reduced/);
  const unchecked = toggleImportProduct(note, note, product, false);
  assert.equal(unchecked, null);
  const checked = toggleImportProduct(note, unchecked, product, true);
  assert.equal(checked.items[0].totalCount, 4);
  assert.equal(checked.items[0].totalActualCount, 8);
  assert.equal(JSON.stringify(original), before);
});
test("pending returns reserve quantity before another import and saved badges are not deducted twice", () => {
  const source = { ...sale, items: [{ ...sale.items[0], GodownList: [{ count: 10, actualCount: 10, added: true, selectedPriceRate: 100, availableReturnQuantity: 4 }] }] };
  const notes = [{ status: "saved", items: [{ _id: sale.items[0]._id, _returnSourceSaleId: sale._id, totalCount: 6 }] },
    { status: "pending", items: [{ _id: sale.items[0]._id, _returnSourceSaleId: sale._id, totalCount: 1 }] }];
  assert.equal(returnableSales([source], notes)[0].items[0].totalCount, 3);
});
test("fully returned products cannot prepare another credit note", () => {
  const source = { ...sale, items: [{ ...sale.items[0], GodownList: [{ count: 10, added: true, availableReturnQuantity: 0 }] }] };
  assert.deepEqual(returnableSales([source])[0].items, []);
});
