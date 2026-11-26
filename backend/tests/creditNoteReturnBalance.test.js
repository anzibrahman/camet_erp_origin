import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import CreditNote from "../models/creditNoteModel.js";
import Sales from "../models/salesModel.js";
import { previousReturnQuantities, salesWithReturnBalances, validateCreditNoteReturnBalance, returnAllocations } from "../helpers/creditNoteReturnBalance.js";
const id = () => String(new mongoose.Types.ObjectId());
const ids = { source: id(), product: id(), customer: id(), company: id(), owner: id() };
const item = quantity => ({ _id: ids.product, product_name: "A", unit: "Nos", total: quantity * 100,
  GodownList: [{ count: quantity, added: true }] });
const sale = () => ({ _id: ids.source, salesNumber: "S1", items: [item(10)] });
const prior = (quantity, extra = {}) => ({ _id: id(), selectedSaleIds: [ids.source],
  returnAllocations: [{ saleId: ids.source, products: [{ productId: ids.product, quantity }] }], ...extra });
const query = value => ({ select() { return this; }, session() { return this; }, async lean() { return value; } });
const scope = { cmp_id: ids.company, Primary_user_id: ids.owner, "party._id": ids.customer };

test("sale review preserves 10 sold and exposes 6 returned / 4 available without changing the invoice", async t => {
  const source = sale(), before = structuredClone(source);
  t.mock.method(CreditNote, "find", filter => { assert.equal(filter.isCancelled.$ne, true); return query([prior(6)]); });
  const balances = await previousReturnQuantities(scope, [ids.source]);
  const [result] = salesWithReturnBalances([source], balances);
  assert.equal(result.items[0].GodownList[0].count, 10);
  assert.equal(result.items[0].soldQuantity, 10);
  assert.equal(result.items[0].returnedQuantity, 6);
  assert.equal(result.items[0].availableReturnQuantity, 4);
  assert.deepEqual(source, before);
});
test("cancelled credit notes release the return quantity and customer/company scope is enforced", async t => {
  t.mock.method(CreditNote, "find", filter => {
    assert.equal(filter.cmp_id, ids.company); assert.equal(filter.Primary_user_id, ids.owner);
    assert.equal(filter["party._id"], ids.customer); return query([prior(6), prior(4, { isCancelled: true })]);
  });
  const balances = await previousReturnQuantities(scope, [ids.source]);
  assert.equal(salesWithReturnBalances([sale()], balances)[0].items[0].availableReturnQuantity, 4);
});
test("10 already returned produces zero remaining, never a negative balance", () => {
  const key = `${ids.source}:${ids.product}`;
  for (const count of [10, 12]) assert.equal(salesWithReturnBalances([sale()], new Map([[key, count]]))[0].items[0].availableReturnQuantity, 0);
});
test("returns are deducted once across duplicate product rows", () => {
  const source = sale(); source.items = [item(5), item(5)];
  const [result] = salesWithReturnBalances([source], new Map([[`${ids.source}:${ids.product}`, 6]]));
  assert.deepEqual(result.items.map(value => value.availableReturnQuantity), [0, 4]);
});
test("standalone credit-note save rejects 6 when only 4 remain, and accepts 4", async t => {
  t.mock.method(Sales, "find", () => query([sale()]));
  t.mock.method(CreditNote, "find", () => query([prior(6)]));
  const req = { owner: ids.owner, body: { orgId: ids.company, party: { _id: ids.customer } } };
  const note = quantity => ({ selectedSaleIds: [ids.source], items: [{ ...item(quantity), _returnSourceSaleId: ids.source }] });
  await assert.rejects(validateCreditNoteReturnBalance(req, note(6), {}), /Only 4/);
  const result = await validateCreditNoteReturnBalance(req, note(4), {});
  assert.equal(result[0].products[0].quantity, 4);
});
test("return allocation metadata survives credit-note model serialization", () => {
  const note = { selectedSaleIds: [ids.source], items: [{ ...item(6), _returnSourceSaleId: ids.source }] };
  const allocations = returnAllocations(note);
  const persisted = new CreditNote({ ...note, returnAllocations: allocations }).toObject();
  assert.equal(returnAllocations(persisted)[0].products[0].quantity, 6);
  assert.equal(String(returnAllocations(persisted)[0].saleId), ids.source);
});
test("saving rejects stale or forged displayed available quantities", async t => {
  t.mock.method(Sales, "find", () => query([sale()]));
  t.mock.method(CreditNote, "find", () => query([prior(10)]));
  const req = { owner: ids.owner, body: { orgId: ids.company, party: { _id: ids.customer } } };
  await assert.rejects(validateCreditNoteReturnBalance(req, { selectedSaleIds: [ids.source],
    items: [{ ...item(1), _returnSourceSaleId: ids.source, availableReturnQuantity: 10 }] }, {}), /Only 0/);
});
