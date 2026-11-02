import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import mongoose from "mongoose";
import ProformaInvoice from "../models/proformaInvoiceModel.js";
import Organization from "../models/OragnizationModel.js";
import SecondaryUser from "../models/secondaryUserModel.js";
import { createSaleRecord } from "../helpers/salesHelper.js";
import { generateVoucherNumber, attachLatestSeriesDetails } from "../helpers/voucherHelper.js";
import { formatToLocalDate } from "../helpers/helper.js";
const TYPE = "performaInvoice";
async function authorizedCompany(req, cmpId) {
  const [company, user] = await Promise.all([
    Organization.findOne({ _id: cmpId, owner: req.owner, isBlocked: false }),
    SecondaryUser.findById(req.sUserId),
  ]);
  return company && user?.configurations?.some(config => String(config.organization) === String(cmpId));
}
export async function saveProformaInvoice(req, res) {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  try {
    const { orgId, party, items, series_id, selectedDate } = req.body;
    if (!orgId || !party?._id || !Array.isArray(items) || !items.length || !series_id || !Number.isFinite(new Date(selectedDate).getTime())) {
      return res.status(400).json({ message: "Company, party, items, series and a valid date are required" });
    }
    const amount = Number(req.body.finalAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: "Invoice amount must be a valid non-negative number" });
    }
    // Proforma invoices never accept received payments, even from direct API callers.
    req.body.paymentSplittingData = [];
    req.body.totalPaymentSplits = 0;
    if (!await authorizedCompany(req, orgId)) return res.status(403).json({ message: "Company access denied" });
    // Never post stock, outstanding, receipts, or settlements.
    req.body.voucherType = TYPE;
    req.body.finalOutstandingAmount = 0;
    req.body.convertedFrom = [];
    req.voucherModel = ProformaInvoice;
    session.startTransaction();
    let result;
    if (req.params.id) {
      const existing = await ProformaInvoice.findOne({ _id: req.params.id, cmp_id: orgId, Primary_user_id: req.owner }).session(session);
      if (!existing || existing.isCancelled) {
        await session.abortTransaction();
        return res.status(existing ? 409 : 404).json({ message: existing ? "Cancelled proforma invoices cannot be edited" : "Proforma invoice not found" });
      }
      const numbering = String(existing.series_id) === String(series_id)
        ? { voucherNumber: existing.salesNumber, usedSeriesNumber: existing.usedSeriesNumber }
        : await generateVoucherNumber(orgId, TYPE, series_id, session);
      Object.assign(existing, {
        party, partyAccount: party.partyName, items,
        despatchDetails: req.body.despatchDetails,
        selectedPriceLevel: req.body.priceLevelFromRedux,
        additionalCharges: req.body.additionalChargesFromRedux || [],
        note: req.body.note, finalAmount: req.body.finalAmount,
        subTotal: req.body.subTotal, totalAdditionalCharges: req.body.totalAdditionalCharges,
        totalWithAdditionalCharges: req.body.totalWithAdditionalCharges,
        totalPaymentSplits: req.body.totalPaymentSplits,
        paymentSplittingData: req.body.paymentSplittingData || [],
        finalOutstandingAmount: 0, series_id,
        salesNumber: numbering.voucherNumber, usedSeriesNumber: numbering.usedSeriesNumber,
        date: await formatToLocalDate(selectedDate, orgId, session), selectedDate,
      });
      result = await existing.save({ session });
    } else {
      const numbering = await generateVoucherNumber(orgId, TYPE, series_id, session);
      req.body.usedSeriesNumber = numbering.usedSeriesNumber;
      result = await createSaleRecord(req, numbering.voucherNumber, items, req.body.additionalChargesFromRedux || [], session);
    }
    await session.commitTransaction();
    return res.status(req.params.id ? 200 : 201).json({ success: true, message: "Proforma invoice saved successfully", data: result });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    return res.status(error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.message });
  } finally { await session.endSession(); }
}
export async function getProformaInvoiceDetails(req, res) {
  try {
    const data = await ProformaInvoice.findOne({ _id: req.params.id, Primary_user_id: req.owner }).lean();
    if (!data) return res.status(404).json({ message: "Proforma invoice not found" });
    if (!await authorizedCompany(req, data.cmp_id)) return res.status(403).json({ message: "Company access denied" });
    await attachLatestSeriesDetails(data, "salesNumber");
    return res.json({ data: { ...data, isEditable: !data.isCancelled } });
  } catch (error) { return res.status(500).json({ message: error.message }); }
}
export async function listProformaInvoices(req, res) {
  try {
    if (!await authorizedCompany(req, req.params.cmp_id)) return res.status(403).json({ message: "Company access denied" });
    const user = await SecondaryUser.findById(req.sUserId);
    const query = { cmp_id: req.params.cmp_id, Primary_user_id: req.owner };
    if (user?.role !== "admin") query.Secondary_user_id = req.sUserId;
    const records = await ProformaInvoice.find(query).sort({ date: -1, createdAt: -1 }).limit(100).lean();
    return res.json({ data: records.map(record => ({ ...record, type: "Proforma Invoice", voucherNumber: record.salesNumber, party_name: record.party?.partyName, enteredAmount: record.finalAmount })) });
  } catch (error) { return res.status(500).json({ message: error.message }); }
}
export async function cancelProformaInvoice(req, res) {
  try {
    const invoice = await ProformaInvoice.findOne({ _id: req.params.id, Primary_user_id: req.owner });
    if (!invoice) return res.status(404).json({ message: "Proforma invoice not found" });
    if (!await authorizedCompany(req, invoice.cmp_id)) return res.status(403).json({ message: "Company access denied" });
    if (!invoice.isCancelled) {
      invoice.isCancelled = true; invoice.cancelledAt = new Date();
      invoice.cancelledBy = req.sUserId; invoice.cancelledByName = req.secUserName || "";
      invoice.cancelReason = req.body.cancelReason;
      await invoice.save();
    }
    return res.json({ success: true, message: "Proforma invoice cancelled successfully", data: invoice });
  } catch (error) { return res.status(500).json({ message: error.message }); }
}
