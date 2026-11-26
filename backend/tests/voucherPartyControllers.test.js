import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Party from "../models/partyModel.js";
import { createSale, editSale } from "../controllers/saleController.js";
import { createInvoice, editInvoice } from "../controllers/saleOrderController.js";
import { createCreditNote, editCreditNote } from "../controllers/creditNoteController.js";
import { createDebitNote, editDebitNote } from "../controllers/debitNoteController.js";
import { createPurchase, editPurchase } from "../controllers/purchaseController.js";
import { createReceipt, editReceipt } from "../controllers/receiptController.js";
import { createPayment, editPayment } from "../controllers/paymentController.js";
import { saveProformaInvoice } from "../controllers/proformaInvoiceController.js";
const handlers = { createSale, editSale, createInvoice, editInvoice, createCreditNote, editCreditNote, createDebitNote, editDebitNote, createPurchase, editPurchase, createReceipt, editReceipt, createPayment, editPayment, saveProformaInvoice };
const id = () => new mongoose.Types.ObjectId();
function response() { return { status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } }; }
for (const [name, handler] of Object.entries(handlers)) {
  test(name + " normalizes a raw party before starting voucher writes", async t => {
    const group = id(), req = { owner: id(), params: { id: id(), receiptId: id(), paymentId: id() }, query: {}, body: { orgId: id(), cmp_id: id(), party: { _id: id(), partyName: "Customer", accountGroup: group } } };
    const stop = new Error("Stop before database writes");
    t.mock.method(mongoose, "startSession", async () => { assert.equal(req.body.party.accountGroup_id, group); throw stop; });
    await assert.rejects(handler(req, response()), error => error === stop);
  });
  test(name + " rejects a missing account group before numbering or stock changes", async t => {
    const req = { owner: id(), params: { id: id(), receiptId: id(), paymentId: id() }, query: {}, body: { orgId: id(), cmp_id: id(), party: { _id: id(), partyName: "Customer" } } }, res = response();
    let started = false;
    t.mock.method(mongoose, "startSession", () => { started = true; throw new Error("Unexpected transaction"); });
    t.mock.method(Party, "findOne", () => ({ session() { return this; }, async lean() { return null; } }));
    await handler(req, res);
    assert.equal(res.code, 400);
    assert.match(res.payload.message, /Set its account group/);
    assert.equal(started, false);
  });
}
