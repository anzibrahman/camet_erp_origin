import mongoose from "mongoose";

export const transactionError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const amount = (value, label, allowNegative = false) => {
  const number = Number(value);
  if (!Number.isFinite(number) || (!allowNegative && number < 0)) throw transactionError(`Invalid ${label}`);
  return number;
};

// Preserve the ERP's calculated stock-row prices/taxes, while deriving all document
// totals and stock quantities from active rows rather than trusting header totals.
export function transactionItems(items, returns = false) {
  if (!Array.isArray(items)) throw transactionError("Items must be an array");
  return items.map(item => {
    if (!mongoose.isValidObjectId(item?._id)) throw transactionError("Invalid product ID");
    if (!returns && item._importedReturn) throw transactionError("Return products must be sent separately from sale products");
    if (!Array.isArray(item.GodownList)) throw transactionError("Product stock rows are missing");
    const GodownList = item.GodownList.filter(row => row.added !== false).map(row => ({
      ...row, added: true, count: amount(row.count, "product quantity"),
      actualCount: amount(row.actualCount ?? row.count, "actual quantity"),
      selectedPriceRate: amount(row.selectedPriceRate, "product rate"),
      individualTotal: amount(row.individualTotal, "product amount"),
    })).filter(row => row.count > 0);
    if (!GodownList.length) throw transactionError("Every product must have a positive quantity");
    const sum = field => money(GodownList.reduce((total, row) => total + amount(row[field] ?? 0, field), 0));
    const total = sum("individualTotal");
    if (Math.abs(amount(item.total, "product total") - total) > 0.02) throw transactionError("Product total does not match its stock rows");
    const { _importedReturn, _voucherLineId, _returnNoteNumber, _returnSaved, ...product } = item;
    return { ...product, GodownList, added: true, total,
      totalCount: GodownList.reduce((sum, row) => sum + row.count, 0),
      totalActualCount: GodownList.reduce((sum, row) => sum + row.actualCount, 0),
      totalCgstAmt: sum("cgstAmount"), totalSgstAmt: sum("sgstAmount"), totalIgstAmt: sum("igstAmount"),
      totalCessAmt: sum("cessAmount"), totalAddlCessAmt: sum("additionalCessAmount"),
    };
  });
}

export function prepareSalesTransaction(body) {
  if (body.voucherType !== "sales") throw transactionError("This endpoint only creates Sales transactions");
  if (!mongoose.isValidObjectId(body.orgId) || !mongoose.isValidObjectId(body.party?._id)) throw transactionError("Invalid company or customer");
  if (typeof body.transactionId !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(body.transactionId)) throw transactionError("A valid transaction ID is required");
  const selectedDate = new Date(body.selectedDate);
  if (Number.isNaN(selectedDate.getTime())) throw transactionError("Select a valid transaction date");
  const items = transactionItems(body.items || []);
  const notes = body.returnNotes || [];
  if (!Array.isArray(notes)) throw transactionError("Invalid return notes");
  const sourceSaleIds = [];
  const returnItems = [];
  const allocations = new Map();
  for (const note of notes) {
    if (note.status !== "pending" || String(note.partyId) !== String(body.party._id)) throw transactionError("Only unsaved returns for this customer can be submitted");
    if (!Array.isArray(note.selectedSaleIds) || !note.selectedSaleIds.length || note.selectedSaleIds.some(id => !mongoose.isValidObjectId(id))) throw transactionError("Select the source sales for every return");
    const products = transactionItems(note.items, true);
    const hasSources = note.items.some(item => item._returnSourceSaleId);
    if (hasSources) {
      products.forEach((product, index) => {
        const saleId = String(note.items[index]._returnSourceSaleId || "");
        if (!note.selectedSaleIds.map(String).includes(saleId)) throw transactionError("A return product has an invalid source sale");
        sourceSaleIds.push(saleId);
        const allocation = allocations.get(saleId) || { saleId, amount: 0, products: [] };
        allocation.amount = money(allocation.amount + product.total);
        allocation.products.push({ productId: product._id, quantity: product.totalCount, amount: product.total });
        allocations.set(saleId, allocation);
      });
    } else sourceSaleIds.push(...note.selectedSaleIds.map(String));
    returnItems.push(...products);
  }
  if (!items.length && !returnItems.length) throw transactionError("Add at least one sale or return product");
  if (items.length && !mongoose.isValidObjectId(body.series_id)) throw transactionError("Select a Sales voucher series");
  if (body.creditNoteSeriesId && !mongoose.isValidObjectId(body.creditNoteSeriesId)) throw transactionError("Invalid credit note series");
  const subTotal = money(items.reduce((sum, item) => sum + item.total, 0));
  const totalAdditionalCharges = items.length ? amount(body.totalAdditionalCharges ?? 0, "additional charges", true) : 0;
  const finalAmount = money(subTotal + totalAdditionalCharges);
  if (finalAmount < 0) throw transactionError("Sale amount cannot be negative");
  const paymentSplittingData = body.paymentSplittingData || [];
  if (!Array.isArray(paymentSplittingData)) throw transactionError("Invalid payment split");
  for (const payment of paymentSplittingData) {
    if (!["cash", "upi", "cheque", "card", "bank", "credit"].includes(payment.type)) throw transactionError("Invalid payment mode");
    amount(payment.amount ?? 0, "payment amount");
    if (payment.type !== "credit" && Number(payment.amount) > 0 && !mongoose.isValidObjectId(payment.ref_id)) throw transactionError("Select a source for every payment");
  }
  const received = money(paymentSplittingData.filter(payment => payment.type !== "credit").reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  if (received > finalAmount + 0.01) throw transactionError("Received amount exceeds the sale total");
  if (!Array.isArray(body.additionalChargesFromRedux || [])) throw transactionError("Invalid additional charges");
  const sale = items.length ? { ...body, items, selectedDate: selectedDate.toISOString(), voucherType: "sales",
    subTotal, finalAmount, totalWithAdditionalCharges: finalAmount, totalAdditionalCharges,
    finalOutstandingAmount: money(finalAmount - received), paymentSplittingData,
    totalPaymentSplits: money(paymentSplittingData.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)),
    additionalChargesFromRedux: body.additionalChargesFromRedux || [],
  } : null;
  const returnTotal = money(returnItems.reduce((sum, item) => sum + item.total, 0));
  const creditNote = returnItems.length ? {
    orgId: body.orgId, party: body.party, selectedDate: selectedDate.toISOString(), voucherType: "creditNote", items: returnItems,
    returnAllocations: [...allocations.values()],
    selectedSaleIds: [...new Set(sourceSaleIds)], returnSourceSaleIds: [...new Set(sourceSaleIds)],
    subTotal: returnTotal, finalAmount: returnTotal, finalOutstandingAmount: returnTotal,
    totalWithAdditionalCharges: returnTotal, totalAdditionalCharges: 0, totalPaymentSplits: 0,
    additionalChargesFromRedux: [], paymentSplittingData: [], despatchDetails: {}, note: body.note || "",
  } : null;
  return { sale, creditNote, sourceSaleIds: [...new Set(sourceSaleIds)] };
}
