import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Organization from "../models/OragnizationModel.js";
import User from "../models/secondaryUserModel.js";
import Party from "../models/partyModel.js";
import Product from "../models/productModel.js";
import Sales from "../models/salesModel.js";
import Series from "../models/VoucherSeriesModel.js";
import Tally from "../models/TallyData.js";
import Transaction from "../models/salesTransactionModel.js";
import { resolveVoucherParty } from "../helpers/voucherPartyHelper.js";
import { settleCreditNoteSales } from "../helpers/adjustmentHelper.js";
import { prepareSalesTransaction, transactionError, money } from "../helpers/salesTransactionInput.js";
import { allocateTransactionNumber, applyTransactionStock, postTransactionSale, postTransactionCreditNote } from "../helpers/salesTransactionPosting.js";

const scopeFor = req => ({ cmp_id: req.body.orgId, Primary_user_id: req.owner });
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

export async function authorizeSalesTransaction(req, session) {
  const company = await Organization.findOne({ _id: req.body.orgId, owner: req.owner, isBlocked: false }).session(session).lean();
  const user = await User.findById(req.sUserId).session(session);
  const assigned = user?.organization?.some(id => String(id?._id || id) === String(req.body.orgId)) ||
    user?.configurations?.some(config => String(config.organization?._id || config.organization) === String(req.body.orgId));
  if (!company || !assigned || String(user.primaryUser) !== String(req.owner)) throw transactionError("Company access denied", 403);
  const master = await Party.findOne({ ...scopeFor(req), _id: req.body.party._id }).session(session).lean();
  if (!master) throw transactionError("Customer does not belong to this company", 403);
  if (!mongoose.isValidObjectId(master.accountGroup?._id || master.accountGroup)) throw transactionError("The customer has no valid account group");
  const party = await resolveVoucherParty({ ...req.body.party, partyType: master.partyType,
    partyName: master.partyName, accountGroup_id: master.accountGroup?._id || master.accountGroup,
  }, req.body.orgId, req.owner, session);
  return { user, party };
}

export async function transactionSeries(req, type, requestedId, user, session) {
  const document = await Series.findOne({ ...scopeFor(req), voucherType: type }).session(session).lean();
  if (!document) throw transactionError(`No ${type} voucher series is configured`);
  const configuration = user.configurations?.find(config => String(config.organization?._id || config.organization) === String(req.body.orgId));
  const allowedIds = configuration?.selectedVoucherSeries?.find(entry => entry.voucherType === type)?.selectedSeriesIds?.map(String) || [];
  const available = (document.series || []).filter(series => !allowedIds.length || allowedIds.includes(String(series._id)));
  const chosen = requestedId ? available.find(series => String(series._id) === String(requestedId))
    : available.find(series => series.currentlySelected) || available.find(series => series.isDefault) || available[0];
  if (!chosen) throw transactionError(`Select an allowed ${type} voucher series`);
  return String(chosen._id);
}

export async function validateTransactionProducts(req, plan, session) {
  const items = [...(plan.sale?.items || []), ...(plan.creditNote?.items || [])];
  const ids = [...new Set(items.map(item => String(item._id)))];
  const products = await Product.countDocuments({ ...scopeFor(req), _id: { $in: ids } }).session(session);
  if (products !== ids.length) throw transactionError("A product does not belong to this company", 403);
  for (const payment of plan.sale?.paymentSplittingData || []) {
    if (!(Number(payment.amount) > 0)) continue;
    if (payment.type === "credit" && (!payment.credit_reference_type || payment.credit_reference_type === "party")) {
      if (payment.ref_id && String(payment.ref_id) !== String(req.body.party._id)) throw transactionError("Credit must belong to the selected customer");
      continue;
    }
    const partyType = payment.type === "credit" ? payment.credit_reference_type : payment.type === "cash" ? "cash" : "bank";
    const account = await Party.findOne({ ...scopeFor(req), _id: payment.ref_id, partyType }).session(session).lean();
    if (!account) throw transactionError("A payment source does not belong to this company", 403);
  }
  if (!plan.creditNote) return;
  const sales = await Sales.find({ ...scopeFor(req), _id: { $in: plan.sourceSaleIds },
    "party._id": req.body.party._id, isCancelled: { $ne: true },
  }).select("items").session(session).lean();
  if (sales.length !== plan.sourceSaleIds.length) throw transactionError("A source sale is cancelled or does not belong to this customer/company");
  const soldProducts = new Set(sales.flatMap(sale => sale.items || []).map(item => String(item._id)));
  if (plan.creditNote.items.some(item => !soldProducts.has(String(item._id)))) throw transactionError("A return product is missing from the selected source sales");
  for (const allocation of plan.creditNote.returnAllocations || []) {
    const source = sales.find(sale => String(sale._id) === String(allocation.saleId));
    for (const productId of new Set(allocation.products.map(product => String(product.productId)))) {
      const sold = (source?.items || []).filter(item => String(item._id) === productId).reduce((sum, item) => sum +
        (item.GodownList || []).filter(row => row.added !== false).reduce((qty, row) => qty + Number(row.count || 0), 0), 0);
      const returned = allocation.products.filter(product => String(product.productId) === productId).reduce((sum, product) => sum + product.quantity, 0);
      if (returned > sold + 0.000001) throw transactionError("Returned quantity exceeds this source sale's product quantity");
    }
  }
}

async function transactionOutstanding(req, sale, creditNote, session) {
  const ids = [sale?._id, creditNote?._id].filter(Boolean).map(String);
  const rows = await Tally.find({ ...scopeFor(req), billId: { $in: ids }, isCancelled: false }).session(session).lean();
  const balance = doc => doc ? money(rows.find(row => row.billId === String(doc._id))?.bill_pending_amt || 0) : 0;
  const saleAmount = balance(sale), creditAmount = balance(creditNote);
  return { sale: saleAmount, creditNote: creditAmount, net: money(saleAmount + creditAmount) };
}

export async function linkReturnSources(req, note, session) {
  return Sales.updateMany({ ...scopeFor(req), _id: { $in: note.returnSourceSaleIds || [] },
    "party._id": req.body.party._id,
  }, { $addToSet: { returnCreditNoteIds: note._id } }, { session });
}

const defaults = {
  startSession: () => mongoose.startSession(), init: () => Transaction.init(),
  authorize: authorizeSalesTransaction, series: transactionSeries, validateProducts: validateTransactionProducts,
  allocate: allocateTransactionNumber, applyStock: applyTransactionStock,
  postSale: postTransactionSale, postCreditNote: postTransactionCreditNote,
  settleCredit: settleCreditNoteSales, outstanding: transactionOutstanding,
  linkSources: linkReturnSources,
  findReplay: (scope, session) => Transaction.findOne(scope).session(session).lean(),
  remember: (data, session) => Transaction.create([data], { session }),
};

// Both documents, their independent sequence counters, stock, outstanding and
// Adjustment allocations belong to this single transaction. Standalone pages
// continue using their existing controllers.
export function makeSalesTransactionController(overrides = {}) {
  const deps = { ...defaults, ...overrides };
  return async (req, res) => {
    let session;
    let replayScope;
    let payloadHash;
    try {
      const plan = prepareSalesTransaction(req.body);
      replayScope = { ...scopeFor(req), Secondary_user_id: req.sUserId, requestKey: req.body.transactionId };
      payloadHash = createHash("sha256").update(JSON.stringify(canonical(req.body))).digest("hex");
      await deps.init();
      session = await deps.startSession();
      let result;
      let replayed = false;
      await session.withTransaction(async () => {
        const { user, party } = await deps.authorize(req, session);
        const previous = await deps.findReplay(replayScope, session);
        if (previous) {
          if (previous.payloadHash !== payloadHash) throw transactionError("This transaction ID was already used with different products or amounts", 409);
          result = previous.result;
          replayed = true;
          return;
        }
        if (plan.creditNote && party.partyType !== "party") throw transactionError("Sales returns require a customer account");
        await deps.validateProducts(req, plan, session);
        let saleBody = null, creditBody = null;
        if (plan.sale) {
          const seriesId = await deps.series(req, "sales", req.body.series_id, user, session);
          saleBody = await deps.allocate({ ...plan.sale, party }, seriesId, session);
        }
        if (plan.creditNote) {
          const seriesId = await deps.series(req, "creditNote", req.body.creditNoteSeriesId, user, session);
          creditBody = await deps.allocate({ ...plan.creditNote, party }, seriesId, session);
        }
        await deps.applyStock(saleBody, creditBody, session);
        const sale = saleBody ? await deps.postSale(req, saleBody, user, session) : null;
        const creditNote = creditBody ? await deps.postCreditNote(req, creditBody, user, session) : null;
        if (creditNote) await deps.linkSources(req, creditNote, session);
        const actor = req.sUserId || req.owner;
        const adjustments = [];
        if (creditNote) adjustments.push(...await deps.settleCredit(creditNote, creditBody.selectedSaleIds, actor, session));
        const outstanding = await deps.outstanding(req, sale, creditNote, session);
        result = JSON.parse(JSON.stringify({
          sale: sale ? { _id: sale._id, salesNumber: sale.salesNumber, series_id: sale.series_id, finalAmount: sale.finalAmount } : null,
          creditNote: creditNote ? { _id: creditNote._id, creditNoteNumber: creditNote.creditNoteNumber, series_id: creditNote.series_id, finalAmount: creditNote.finalAmount } : null,
          adjustments, outstanding,
        }));
        await deps.remember({ ...replayScope, Secondary_user_id: req.sUserId, payloadHash, result }, session);
      });
      return res.status(replayed ? 200 : 201).json({ success: true, data: result, replayed,
        message: [result.sale && `Sale ${result.sale.salesNumber}`, result.creditNote && `Credit Note ${result.creditNote.creditNoteNumber}`].filter(Boolean).join(" and ") + " saved successfully",
      });
    } catch (error) {
      // A simultaneous retry may have committed the same unique request key.
      if (error.code === 11000 && replayScope && payloadHash) {
        const previous = await deps.findReplay(replayScope, null);
        if (previous?.payloadHash === payloadHash) return res.status(200).json({ success: true, data: previous.result, replayed: true, message: "Transaction already saved" });
      }
      return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({ success: false,
        message: error.statusCode ? error.message : "Unable to save or confirm this transaction. Retry without changing the products.",
      });
    } finally {
      if (session) await session.endSession();
    }
  };
}

export const createSalesTransaction = makeSalesTransactionController();
