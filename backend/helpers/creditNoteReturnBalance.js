import CreditNote from "../models/creditNoteModel.js";
import Sales from "../models/salesModel.js";
import { transactionError } from "./salesTransactionInput.js";

const key = (saleId, productId) => `${saleId}:${productId}`;
export const soldQuantity = item => (item.GodownList || []).filter(row => row.added !== false)
  .reduce((sum, row) => sum + Number(row.count || 0), 0);

// Allocation metadata survives schema serialization, unlike temporary UI fields.
export function returnAllocations(note) {
  if (note.returnAllocations?.length) return note.returnAllocations;
  const groups = new Map();
  for (const item of note.items || []) {
    const saleId = item._returnSourceSaleId || (note.selectedSaleIds?.length === 1 ? note.selectedSaleIds[0] : null);
    if (!saleId) throw transactionError("Reimport return products to identify their original sale");
    const allocation = groups.get(String(saleId)) || { saleId, amount: 0, products: [] };
    allocation.amount += Number(item.total || 0);
    allocation.products.push({ productId: item._id, quantity: soldQuantity(item), amount: Number(item.total || 0) });
    groups.set(String(saleId), allocation);
  }
  return [...groups.values()];
}

export async function previousReturnQuantities(scope, saleIds, session, excludeId) {
  if (!saleIds.length) return new Map();
  let query = CreditNote.find({ ...scope, isCancelled: { $ne: true },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: [{ selectedSaleIds: { $in: saleIds } }, { returnSourceSaleIds: { $in: saleIds } },
      { "returnAllocations.saleId": { $in: saleIds } }] });
  if (session) query = query.session(session);
  const notes = await query.lean();
  const quantities = new Map();
  for (const note of notes) {
    if (note.isCancelled || String(note._id) === String(excludeId)) continue;
    for (const allocation of returnAllocations(note)) {
      for (const product of allocation.products || []) {
        const id = key(allocation.saleId, product.productId);
        quantities.set(id, (quantities.get(id) || 0) + Number(product.quantity || 0));
      }
    }
  }
  return quantities;
}

export function salesWithReturnBalances(sales, quantities) {
  return sales.map(sale => {
    const used = new Map();
    return { ...sale, items: (sale.items || []).map(item => {
      const id = key(sale._id, item._id);
      let remainingReturned = Math.max(0, (quantities.get(id) || 0) - (used.get(id) || 0));
      const GodownList = (item.GodownList || []).map(row => {
        const sold = row.added !== false ? Number(row.count || 0) : 0;
        const returned = Math.min(sold, remainingReturned);
        remainingReturned -= returned;
        used.set(id, (used.get(id) || 0) + returned);
        return { ...row, soldQuantity: sold, returnedQuantity: returned, availableReturnQuantity: Math.max(0, sold - returned) };
      });
      return { ...item, GodownList, soldQuantity: soldQuantity(item),
        returnedQuantity: GodownList.reduce((sum, row) => sum + row.returnedQuantity, 0),
        availableReturnQuantity: GodownList.reduce((sum, row) => sum + row.availableReturnQuantity, 0) };
    }) };
  });
}

export async function validateCreditNoteReturnBalance(req, note, session, { sales, excludeId } = {}) {
  if (!note.selectedSaleIds?.length) return null;
  const allocations = returnAllocations({ ...note, returnAllocations: [] });
  const selected = note.selectedSaleIds.map(String);
  if (allocations.some(row => !selected.includes(String(row.saleId)))) throw transactionError("Invalid return source sale");
  const scope = { cmp_id: req.body.orgId, Primary_user_id: req.owner, "party._id": req.body.party._id };
  sales ||= await Sales.find({ ...scope, _id: { $in: selected }, isCancelled: { $ne: true } }).select("items salesNumber").session(session).lean();
  if (sales.length !== selected.length) throw transactionError("A source sale is cancelled or does not belong to this customer/company");
  const previous = await previousReturnQuantities(scope, selected, session, excludeId);
  for (const allocation of allocations) {
    const sale = sales.find(value => String(value._id) === String(allocation.saleId));
    const requested = new Map();
    for (const product of allocation.products) requested.set(String(product.productId), (requested.get(String(product.productId)) || 0) + product.quantity);
    for (const [productId, quantity] of requested) {
      const items = (sale?.items || []).filter(item => String(item._id) === productId);
      const sold = items.reduce((sum, item) => sum + soldQuantity(item), 0);
      const available = Math.max(0, sold - (previous.get(key(allocation.saleId, productId)) || 0));
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > available + 0.000001) {
        throw transactionError(`Only ${Number(available.toFixed(3))} ${items[0]?.unit || "units"} of ${items[0]?.product_name || "this product"} are available to return from sale ${sale?.salesNumber || allocation.saleId}. Reopen the sales selection to refresh the balance.`);
      }
    }
  }
  return allocations;
}
