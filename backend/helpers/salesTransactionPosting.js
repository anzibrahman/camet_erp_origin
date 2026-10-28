import { generateVoucherNumber } from "./voucherHelper.js";
import { createSaleRecord, handleSaleStockUpdates, updateTallyData, savePaymentSplittingDataInSources, changeConversionStatusOfOrder } from "./salesHelper.js";
import { createCreditNoteRecord, handleCreditNoteStockUpdates, updateCreditNoteNumber } from "./creditNoteHelper.js";
import { creditNoteStockItems } from "./creditNoteStockItems.js";

export async function allocateTransactionNumber(body, seriesId, session) {
  const number = await generateVoucherNumber(body.orgId, body.voucherType, String(seriesId), session);
  return { ...body, series_id: seriesId, usedSeriesNumber: number.usedSeriesNumber,
    [body.voucherType === "sales" ? "salesNumber" : "creditNoteNumber"]: number.voucherNumber };
}

export async function applyTransactionStock(sale, creditNote, session) {
  // Returned stock becomes available before any sale of the same product.
  if (creditNote) await handleCreditNoteStockUpdates(creditNote.items, session);
  if (sale) await handleSaleStockUpdates(creditNoteStockItems(sale.items), session);
}

export async function postTransactionSale(req, body, user, session) {
  const documentRequest = { ...req, body, query: {} };
  const sale = await createSaleRecord(documentRequest, body.salesNumber, body.items, body.additionalChargesFromRedux, session);
  if (body.convertedFrom?.length) await changeConversionStatusOfOrder(body.convertedFrom, session);
  const payments = body.paymentSplittingData.filter(payment => payment.ref_id && Number(payment.amount) > 0
    && !(payment.type === "credit" && payment.credit_reference_type === "party"));
  // Keep an outstanding row even when fully paid, so the combined result is explicit.
  await updateTallyData(body.orgId, body.salesNumber, sale._id, req.owner, body.party, body.finalAmount,
    user.mobile, session, body.finalOutstandingAmount, body.selectedDate, "sales", "Dr", "Sales", false, !!payments.length);
  // MongoDB transaction operations must use the shared session sequentially.
  for (const payment of payments) await savePaymentSplittingDataInSources([payment], body.salesNumber, sale._id,
    body.orgId, req.owner, user.mobile, "sale", sale.date, sale.party, session, body.selectedDate, "sales");
  return sale;
}

export async function postTransactionCreditNote(req, body, user, session) {
  const note = await createCreditNoteRecord({ ...req, body }, body.creditNoteNumber, body.items, [], session);
  await updateCreditNoteNumber(body.orgId, user, session);
  await updateTallyData(body.orgId, body.creditNoteNumber, note._id, req.owner, body.party, body.finalAmount,
    user.mobile, session, body.finalAmount, body.selectedDate, "creditNote", "Cr", "CreditNote", true);
  return note;
}
