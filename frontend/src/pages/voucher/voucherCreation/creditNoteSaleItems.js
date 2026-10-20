import { recalculateDesktopItem } from "./desktopSaleItemState.js";

export function saleReturnRows(items) {
  return (items || []).flatMap((item, itemIndex) => (item.GodownList || []).flatMap((row, rowIndex) =>
    row.added !== false && Number(row.count) > 0
      ? [{ item, row, itemIndex, rowIndex, key: itemIndex + ":" + rowIndex, soldQuantity: Number(row.count) }] : []));
}
export function creditNoteItemsFromSale(items, quantities) {
  return (items || []).map((item, itemIndex) => {
    const GodownList = (item.GodownList || []).map((row, rowIndex) => {
      const sold = row.added !== false ? Number(row.count) || 0 : 0;
      const count = Number(quantities?.[itemIndex + ":" + rowIndex] ?? sold);
      if (!Number.isFinite(count) || count < 0) throw new Error("Return quantity must be a valid non-negative number");
      const ratio = sold > 0 ? count / sold : 0;
      return { ...row, count, actualCount: Number(((Number(row.actualCount ?? sold)) * ratio).toFixed(3)), added: count > 0, discountAmount: Number(row.discountAmount || 0) * ratio };
    });
    return recalculateDesktopItem({ ...item, GodownList });
  }).filter(item => item.totalCount > 0);
}

// Keep differing commercial terms separate, while retaining stock destinations.
export function combineSaleReturnItems(sales) {
  const groups = new Map();
  for (const sale of sales || []) {
    for (const { item, row } of saleReturnRows(sale.items)) {
      const discountType = row.discountType || "none";
      const inclusive = Boolean(item.isTaxInclusive || row.isTaxInclusive);
      const key = JSON.stringify([
        String(item._id), item.unit || "", item.altUnit || "",
        Number(row.selectedPriceRate || 0), discountType,
        discountType === "percentage" ? Number(row.discountPercentage || 0) :
          discountType === "amount" ? Number(row.discountAmount || 0) : 0,
        ...["igst", "cgst", "sgst", "cess", "addl_cess"].map(field => Number(item[field] || 0)),
        inclusive,
      ]);
      if (!groups.has(key)) groups.set(key, { ...item, isTaxInclusive: inclusive, GodownList: [] });
      const group = groups.get(key);
      const stockKey = stock => JSON.stringify([String(stock.godownMongoDbId || stock.godown_id || ""), stock.batch || "",
        stock.unit || "", Number(stock.actualCount ?? stock.count) / Number(stock.count)]);
      const existing = group.GodownList.find(stock => stockKey(stock) === stockKey(row));
      if (existing) {
        existing.count = Number((Number(existing.count) + Number(row.count)).toFixed(3));
        existing.actualCount = Number((Number(existing.actualCount) + Number(row.actualCount ?? row.count)).toFixed(3));
        existing.discountAmount = Number(existing.discountAmount || 0) + Number(row.discountAmount || 0);
      } else group.GodownList.push({ ...row, actualCount: Number(row.actualCount ?? row.count), added: true });
    }
  }
  return [...groups.values()].map(recalculateDesktopItem);
}
