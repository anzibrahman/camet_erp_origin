import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Product from '../backend/models/productModel.js';
import Sales from '../backend/models/salesModel.js';
import CreditNote from '../backend/models/creditNoteModel.js';
import { validateTransactionProducts } from '../backend/controllers/salesTransactionController.js';
import { prepareSalesTransaction } from '../backend/helpers/salesTransactionInput.js';
const id = () => String(new mongoose.Types.ObjectId());
const ids = { company: id(), owner: id(), customer: id(), source: id(), product: id() };
const query = value => ({ select() { return this; }, session() { return this; }, lean: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const item = quantity => ({ _id: ids.product, product_name: 'A', total: quantity * 100,
  _returnSourceSaleId: ids.source, GodownList: [{ count: quantity, actualCount: quantity, added: true, selectedPriceRate: 100, individualTotal: quantity * 100 }] });
function request(quantity) {
  const body = { orgId: ids.company, party: { _id: ids.customer }, voucherType: 'sales', selectedDate: '2026-11-02',
    transactionId: 'qa-cumulative-return', items: [], paymentSplittingData: [], returnNotes: [{ status: 'pending', partyId: ids.customer,
      selectedSaleIds: [ids.source], items: [item(quantity)] }] };
  return { body, owner: ids.owner };
}
function setup(t, previousQuantity) {
  t.mock.method(Product, 'countDocuments', () => query(1));
  t.mock.method(Sales, 'find', () => query([{ _id: ids.source, items: [item(10)] }]));
  const previous = { _id: id(), isCancelled: false, party: { _id: ids.customer }, returnSourceSaleIds: [ids.source],
    selectedSaleIds: [ids.source], items: [item(previousQuantity)],
    returnAllocations: [{ saleId: ids.source, amount: previousQuantity * 100, products: [{ productId: ids.product, quantity: previousQuantity, amount: previousQuantity * 100 }] }] };
  t.mock.method(CreditNote, 'find', () => query([previous]));
  t.mock.method(CreditNote, 'aggregate', () => query([{ _id: { saleId: ids.source, productId: ids.product }, quantity: previousQuantity }]));
}
test('QA: first return of 6 from 10 sold is accepted', async t => {
  setup(t, 0); const req = request(6);
  await validateTransactionProducts(req, prepareSalesTransaction(req.body), {});
});
test('QA: returning the remaining 4 after a saved return of 6 is accepted', async t => {
  setup(t, 6); const req = request(4);
  await validateTransactionProducts(req, prepareSalesTransaction(req.body), {});
});
test('QA: second return of 6 after a saved return of 6 from 10 sold must be rejected', async t => {
  setup(t, 6); const req = request(6);
  await assert.rejects(validateTransactionProducts(req, prepareSalesTransaction(req.body), {}), /quantity|remaining|return/i);
});
