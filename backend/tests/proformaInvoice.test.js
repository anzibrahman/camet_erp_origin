import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Proforma from "../models/proformaInvoiceModel.js";
import Sales from "../models/salesModel.js";
import Organization from "../models/OragnizationModel.js";
import SecondaryUser from "../models/secondaryUserModel.js";
import Series from "../models/VoucherSeriesModel.js";
import { saveProformaInvoice, cancelProformaInvoice, getProformaInvoiceDetails, listProformaInvoices } from "../controllers/proformaInvoiceController.js";
import { getSeriesByVoucher } from "../controllers/voucherSeriesController.js";
import { extractRequestParams } from "../helpers/productHelper.js";
const id = () => new mongoose.Types.ObjectId().toString();
const company = id(), owner = id(), user = id(), series = id(), invoiceId = id();
function query(value) {
  return { session() { return this; }, lean() { return this; }, sort() { return this; }, limit() { return this; }, select() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } };
}
function setup(t, existing = null) {
  const writes = [], events = [];
  let inTransaction = false;
  const session = { startTransaction() { inTransaction = true; }, inTransaction() { return inTransaction; }, async commitTransaction() { events.push("commit"); inTransaction = false; }, async abortTransaction() { events.push("abort"); inTransaction = false; }, async endSession() { events.push("end"); } };
  t.mock.method(mongoose, "startSession", async () => session);
  // Any stock, cash, bank, settlement, sales, or ledger operation fails this test.
  for (const model of Object.values(mongoose.models)) {
    if ([Proforma, Organization, SecondaryUser, Series].includes(model)) continue;
    for (const method of ["findOne", "findById", "find", "updateOne", "updateMany", "findByIdAndUpdate", "findOneAndUpdate", "deleteMany", "insertMany", "create"]) {
      t.mock.method(model, method, () => { throw new Error("Unexpected posting to " + model.modelName); });
    }
    t.mock.method(model.prototype, "save", () => { throw new Error("Unexpected save to " + model.modelName); });
  }
  t.mock.method(Organization, "findOne", () => query({ _id: company, country: "India" }));
  t.mock.method(Organization, "findById", () => query({ _id: company, country: "India" }));
  t.mock.method(SecondaryUser, "findById", () => query({ configurations: [{ organization: company }], role: "admin" }));
  t.mock.method(Series, "findOne", () => query({ series: [{ _id: series, lastUsedNumber: 1, widthOfNumericalPart: 4, prefix: "PI-" }] }));
  t.mock.method(Series, "updateOne", async () => { writes.push("number"); });
  t.mock.method(Proforma, "findOne", filter => query(filter._id ? existing : null));
  t.mock.method(Proforma.prototype, "save", async function () { writes.push(this.toObject()); return this; });
  return { writes, events };
}
function request(body = {}, edit = false) {
  return { owner, sUserId: user, secUserName: "Tester", query: {}, params: edit ? { id: invoiceId } : {}, body: { orgId: company, selectedDate: "2026-10-03T10:00:00.000Z", series_id: series, party: { _id: id(), partyName: "Customer", accountGroup_id: id() }, items: [{ _id: id(), product_name: "Chair", GodownList: [{ count: 2, actualCount: 2 }] }], finalAmount: 200, subTotal: 200, totalWithAdditionalCharges: 200, additionalChargesFromRedux: [], paymentSplittingData: [{ type: "cash", amount: 50, ref_id: id() }, { type: "credit", amount: 150, ref_id: id() }], ...body } };
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } }; }

test("proforma shares the sales schema but uses its own collection", () => {
  assert.deepEqual(Object.keys(Proforma.schema.paths), Object.keys(Sales.schema.paths));
  assert.notEqual(Proforma.collection.name, Sales.collection.name);
});
test("creation discards received amounts without stock or accounting postings", async t => {
  const { writes, events } = setup(t);
  const req = request({ voucherType: "sales", finalOutstandingAmount: 999, convertedFrom: [{ id: id() }] }), res = response();
  await saveProformaInvoice(req, res);
  assert.equal(res.code, 201);
  assert.equal(res.payload.data.salesNumber, "PI-0001");
  assert.equal(res.payload.data.voucherType, "performaInvoice");
  assert.equal(res.payload.data.finalOutstandingAmount, 0);
  assert.deepEqual(res.payload.data.paymentSplittingData, []);
  assert.equal(res.payload.data.totalPaymentSplits, 0);
  assert.deepEqual(res.payload.data.convertedFrom, []);
  assert.equal(writes.length, 2);
  assert.deepEqual(events, ["commit", "end"]);
});
test("editing preserves numbering and updates only the preliminary document", async t => {
  const existing = new Proforma({ _id: invoiceId, cmp_id: company, Primary_user_id: owner, series_id: series, usedSeriesNumber: 8, salesNumber: "PI-0008" });
  const { writes, events } = setup(t, existing), req = request({}, true), res = response();
  await saveProformaInvoice(req, res);
  assert.equal(res.code, 200);
  assert.equal(res.payload.data.salesNumber, "PI-0008");
  assert.equal(res.payload.data.finalOutstandingAmount, 0);
  assert.equal(writes.length, 1);
  assert.deepEqual(events, ["commit", "end"]);
});
test("changing series generates a new independent number", async t => {
  const existing = new Proforma({ _id: invoiceId, series_id: id(), usedSeriesNumber: 8, salesNumber: "OLD-8" });
  const { writes } = setup(t, existing), res = response();
  await saveProformaInvoice(request({}, true), res);
  assert.equal(res.payload.data.salesNumber, "PI-0001");
  assert.equal(writes.length, 2);
});
test("cancellation is idempotent and never restores stock or reverses payments", async t => {
  const existing = new Proforma({ _id: invoiceId, cmp_id: company });
  const { writes } = setup(t, existing), req = request({}, true), res = response();
  await cancelProformaInvoice(req, res);
  await cancelProformaInvoice(req, res);
  assert.equal(res.code, 200);
  assert.equal(existing.isCancelled, true);
  assert.equal(writes.length, 1);
});
test("cancelled proforma cannot be edited", async t => {
  const existing = new Proforma({ _id: invoiceId, isCancelled: true });
  const { writes, events } = setup(t, existing), res = response();
  await saveProformaInvoice(request({}, true), res);
  assert.equal(res.code, 409);
  assert.equal(writes.length, 0);
  assert.deepEqual(events, ["abort", "end"]);
});
test("unauthorized company cannot create a proforma", async t => {
  const { writes } = setup(t);
  t.mock.method(Organization, "findOne", () => query(null));
  const res = response(); await saveProformaInvoice(request(), res);
  assert.equal(res.code, 403); assert.equal(writes.length, 0);
});
test("invalid invoice amount cannot consume a voucher number", async t => {
  const { writes } = setup(t), res = response();
  await saveProformaInvoice(request({ finalAmount: -1 }), res);
  assert.equal(res.code, 400); assert.equal(writes.length, 0);
});
test("save failure aborts the invoice and series transaction", async t => {
  const { events } = setup(t);
  t.mock.method(Proforma.prototype, "save", async () => { throw new Error("storage failure"); });
  const res = response(); await saveProformaInvoice(request(), res);
  assert.equal(res.code, 500); assert.deepEqual(events, ["abort", "end"]);
});
test("details look up only the isolated proforma collection", async t => {
  setup(t, { _id: invoiceId, cmp_id: company, Primary_user_id: owner, salesNumber: "PI-0001" });
  const res = response(); await getProformaInvoiceDetails(request({}, true), res);
  assert.equal(res.code, 200); assert.equal(res.payload.data.isEditable, true);
});
test("mobile proforma product lookup uses sales tax and price configuration", () => {
  const params = extractRequestParams({ query: { voucherType: "performaInvoice" }, params: { cmp_id: company } });
  assert.equal(params.voucherType, "sale"); assert.equal(params.isSaleOrder, false);
});

test("proforma discards malformed payment rows from direct API callers", async t => {
  const { writes } = setup(t), res = response();
  await saveProformaInvoice(request({ paymentSplittingData: [null] }), res);
  assert.equal(res.code, 201); assert.deepEqual(res.payload.data.paymentSplittingData, []); assert.equal(res.payload.data.totalPaymentSplits, 0); assert.equal(writes.length, 2);
});
test("proforma list scopes regular users to their own documents", async t => {
  setup(t);
  t.mock.method(SecondaryUser, "findById", () => query({ configurations: [{ organization: company }], role: "user" }));
  let filter;
  t.mock.method(Proforma, "find", value => { filter = value; return query([{ _id: invoiceId, salesNumber: "PI-1", party: { partyName: "Customer" }, finalAmount: 200 }]); });
  const req = request(), res = response(); req.params.cmp_id = company;
  await listProformaInvoices(req, res);
  assert.equal(filter.Secondary_user_id, user);
  assert.equal(filter.Primary_user_id, owner);
  assert.equal(filter.cmp_id, company);
  assert.equal(res.payload.data[0].type, "Proforma Invoice");
  assert.equal(res.payload.data[0].voucherNumber, "PI-1");
});
test("proforma list lets admins see the assigned company's documents", async t => {
  setup(t); let filter;
  t.mock.method(Proforma, "find", value => { filter = value; return query([]); });
  const req = request(), res = response(); req.params.cmp_id = company;
  await listProformaInvoices(req, res);
  assert.equal(filter.Secondary_user_id, undefined);
  assert.equal(filter.cmp_id, company);
  assert.deepEqual(res.payload.data, []);
});
test("first use initializes an independent proforma series for existing companies", async t => {
  setup(t);
  t.mock.method(Series, "findOne", () => query(null));
  let filter, update;
  t.mock.method(Series, "findOneAndUpdate", (value, data) => { filter = value; update = data; return query({ series: [{ _id: series, prefix: "PI-" }] }); });
  const req = request(), res = response(); req.params.cmp_id = company; req.query = { voucherType: "performaInvoice", restrict: "true" };
  await getSeriesByVoucher(req, res);
  assert.equal(res.code, 200);
  assert.equal(filter.voucherType, "performaInvoice");
  assert.equal(update.$setOnInsert.series[0].prefix, "PI-");
  assert.equal(update.$setOnInsert.Primary_user_id, owner);
});
test("unassigned users cannot initialize a proforma series", async t => {
  setup(t);
  t.mock.method(SecondaryUser, "findById", () => query({ configurations: [] }));
  t.mock.method(Series, "findOne", () => query(null));
  t.mock.method(Series, "findOneAndUpdate", () => { throw new Error("Unauthorized series creation"); });
  const req = request(), res = response(); req.params.cmp_id = company; req.query = { voucherType: "performaInvoice" };
  await getSeriesByVoucher(req, res);
  assert.equal(res.code, 404);
});
