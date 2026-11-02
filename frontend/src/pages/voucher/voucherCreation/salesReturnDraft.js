import { creditNoteItemsFromSale } from "./creditNoteSaleItems.js";

export function salesReturnDisplayItems(items, notes, partyId) {
  const groups = new Map();
  for (const note of (notes || []).filter(note => String(note.partyId) === String(partyId))) {
    for (const item of note.items) {
      const key = JSON.stringify([String(item._id), item.unit, note.status, note.number]);
      if (!groups.has(key)) groups.set(key, { ...item, _voucherLineId: `return-group-${key}`, _importedReturn: true,
        _returnNoteNumber: note.number || "", _returnSaved: note.status === "saved", _returnSources: [], GodownList: [], total: 0, totalCount: 0 });
      const group = groups.get(key);
      group._returnSources.push({ noteKey: note.key, lineId: item._voucherLineId, saleId: item._returnSourceSaleId,
        salesNumber: item._returnSourceSaleNumber || item._returnSourceSaleId, quantity: item.totalCount, amount: item.total,
        soldQuantity: item._returnSoldQuantity ?? item.totalCount,
        returnedQuantity: item._returnReturnedQuantity || 0,
        availableQuantity: item._returnAvailableQuantity ?? item.totalCount });
      group.total += Number(item.total || 0); group.totalCount += Number(item.totalCount || 0);
      group.GodownList.push(...item.GodownList);
    }
  }
  return [...[...groups.values()].map(item => ({ ...item, hasGodownOrBatch: false, GodownList: [{
    added: true, count: item.totalCount, individualTotal: item.total,
    selectedPriceRate: item.totalCount ? item.GodownList.reduce((sum, row) => sum + Number(row.selectedPriceRate || 0) * Number(row.count || 0), 0) / item.totalCount : 0,
    godown: item._returnSources.map(source => source.salesNumber).filter(Boolean).join(", "),
  }] })), ...items];
}

export function createSalesReturnKey() {
  return globalThis.crypto?.randomUUID?.() || `return-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function salesReturnDate(value) {
  // The voucher initializes its Redux date with JSON.stringify(Date).
  let date = value;
  if (typeof date === "string" && date.startsWith('"')) {
    try { date = JSON.parse(date); } catch { /* Validate below. */ }
  }
  const parsed = new Date(date || Date.now());
  if (Number.isNaN(parsed.getTime())) throw new Error("Select a valid return date");
  return parsed.toISOString();
}

export function createSalesReturnDraft(items, quantities, sales, partyId, key) {
  if (!sales.length || sales.some(sale => String(sale.party?._id) !== String(partyId))) throw new Error("Select sales belonging to this customer");
  const returnItems = [];
  items.forEach((item, itemIndex) => (item.GodownList || []).forEach((row, rowIndex) => {
    let remaining = Number(quantities?.[`${itemIndex}:${rowIndex}`] ?? row.count);
    if (!Number.isFinite(remaining) || remaining < 0 || remaining > Number(row.count)) throw new Error("Return quantity must be between zero and sold quantity");
    for (const source of row._returnSources || []) {
      const count = Math.min(remaining, source.quantity);
      remaining -= count;
      if (!count) continue;
      const selected = Object.fromEntries(source.item.GodownList.map((_, index) => [`0:${index}`, index === source.rowIndex ? count : 0]));
      const [product] = creditNoteItemsFromSale([source.item], selected);
      const sourceRow = source.item.GodownList[source.rowIndex];
      returnItems.push({ ...product,
        _returnSoldQuantity: Number(sourceRow.soldQuantity ?? sourceRow.count),
        _returnReturnedQuantity: Number(sourceRow.returnedQuantity || 0),
        _returnAvailableQuantity: source.quantity,
        _returnSourceSaleId: source.saleId, _returnSourceSaleNumber: source.salesNumber,
        _importedReturn: true, _voucherLineId: `sales-return-${key}-${returnItems.length}` });
    }
    if (remaining > 0) throw new Error("Reimport these products to identify their source sale");
  }));
  if (!returnItems.length) throw new Error("Select at least one product to return");
  return { key, partyId, status: "pending", selectedSaleIds: [...new Set(returnItems.map(item => item._returnSourceSaleId))], items: returnItems };
}

export async function saveSalesReturnCreditNote(api, { note, cmpId, party, selectedDate }) {
  if (note.status !== "pending") throw new Error("This credit note has already been saved");
  if (String(note.partyId) !== String(party?._id)) throw new Error("The return customer has changed");
  const { data } = await api.get(`/api/sUsers/getSeriesByVoucher/${cmpId}`, {
    params: { voucherType: "creditNote", restrict: true }, withCredentials: true,
  });
  const series = data?.series?.find(value => value.currentlySelected === true) || data?.series?.[0];
  if (!series?._id) throw new Error("No credit note series is available. Configure a credit note series first.");
  const items = note.items.map(item => {
    const { _importedReturn, _voucherLineId, _returnNoteNumber, _returnSaved, ...product } = item;
    void _importedReturn; void _voucherLineId; void _returnNoteNumber; void _returnSaved;
    return product;
  });
  const total = Number(items.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2));
  const response = await api.post("/api/sUsers/createCreditNote", {
    voucherType: "creditNote", orgId: cmpId, party, items, selectedSaleIds: note.selectedSaleIds,
    series_id: series._id, usedSeriesNumber: series.currentNumber,
    selectedDate: salesReturnDate(selectedDate),
    finalAmount: total, finalOutstandingAmount: total, subTotal: total,
    totalAdditionalCharges: 0, totalWithAdditionalCharges: total, totalPaymentSplits: 0,
    additionalChargesFromRedux: [], paymentSplittingData: [], despatchDetails: {}, note: "",
  }, { withCredentials: true });
  if (!response.data?.data?._id) throw new Error("Credit note save was not confirmed. Check the credit note records before trying again.");
  return response.data.data;
}

// Reuse the same request ID on an unchanged retry after a lost response.
export function salesTransactionSubmission(body, notes, previous = null) {
  const sale = { ...body };
  delete sale.salesNumber;
  delete sale.usedSeriesNumber;
  const data = { ...sale, returnNotes: (notes || []).filter(note => note.status === "pending") };
  const signature = JSON.stringify(data);
  const transactionId = previous?.signature === signature ? previous.payload.transactionId : createSalesReturnKey();
  return { signature, payload: { ...data, transactionId } };
}

export function updateSalesReturnSource(notes, noteKey, lineId, quantity) {
  return notes.map(note => {
    if (note.key !== noteKey || note.status !== "pending") return note;
    const items = note.items.flatMap(item => {
      if (item._voucherLineId !== lineId) return [item];
      const count = Number(quantity);
      if (!Number.isFinite(count) || count < 0 || count > item.totalCount) throw new Error("Enter a quantity between zero and the current return quantity");
      if (!count) return [];
      const ratio = count / item.totalCount;
      const quantities = Object.fromEntries(item.GodownList.map((row, index) => [`0:${index}`, Number(row.count) * ratio]));
      return creditNoteItemsFromSale([item], quantities);
    });
    return { ...note, items, selectedSaleIds: [...new Set(items.map(item => item._returnSourceSaleId).filter(Boolean))] };
  }).filter(note => note.items.length);
}

export function reduceImportProduct(draft, product, quantities, target = null) {
  let remaining = 0;
  for (const source of product._returnSources) {
    const count = Number(quantities[source.lineId]);
    if (!Number.isFinite(count) || count < 0 || count > source.quantity) throw new Error("Quantities can only be reduced from their current value");
    remaining += count;
  }
  if (remaining >= product.totalCount) throw new Error("Reduce at least one source quantity");
  if (target != null && Math.abs(remaining - target) > 0.000001) throw new Error(`Choose the sale to remove exactly ${Number((product.totalCount - target).toFixed(3))} quantity from`);
  let notes = [draft];
  for (const source of product._returnSources) notes = updateSalesReturnSource(notes, source.noteKey, source.lineId, quantities[source.lineId]);
  return notes[0] || null;
}

export function toggleImportProduct(baseDraft, draft, product, selected) {
  const lines = new Set(product._returnSources.map(source => source.lineId));
  const current = new Map((draft?.items || []).map(item => [item._voucherLineId, item]));
  const items = baseDraft.items.flatMap(item => lines.has(item._voucherLineId)
    ? selected ? [item] : [] : current.has(item._voucherLineId) ? [current.get(item._voucherLineId)] : []);
  return items.length ? { ...baseDraft, items, selectedSaleIds: [...new Set(items.map(item => item._returnSourceSaleId))] } : null;
}
