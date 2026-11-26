import { calculateVoucherItemTotal } from "./calculateVoucherItemTotal.js";

export const priceLevelRate = (product, level) => Number(
  product?.Priceleveles?.find(price => price._id === level?._id)?.pricerate || 0
);

export const sameStockRow = (left, right) =>
  String(left.godown_id || "") === String(right.godown_id || "") &&
  String(left.batch || "") === String(right.batch || "");

// Use the ERP calculator for each stock row, retaining its identity and metadata.
export function recalculateDesktopItem(item) {
  const GodownList = item.GodownList.map(row => {
    const active = row.added === true;
    const stockRow = active ? row : { ...row, count: 0, actualCount: 0, discountAmount: 0, discountPercentage: 0 };
    const calculated = calculateVoucherItemTotal({ ...item, GodownList: [stockRow] }, null);
    const { index, quantity, ...values } = calculated.individualTotals[0];
    void index;
    void quantity;
    return { ...stockRow, ...values };
  });
  const sum = field => Number(GodownList.reduce((total, row) => total + Number(row[field] || 0), 0).toFixed(2));
  return {
    ...item, GodownList, added: GodownList.some(row => row.added),
    totalCount: GodownList.reduce((total, row) => total + Number(row.count || 0), 0),
    totalActualCount: GodownList.reduce((total, row) => total + Number(row.actualCount || 0), 0),
    total: sum("individualTotal"), totalCgstAmt: sum("cgstAmount"),
    totalSgstAmt: sum("sgstAmount"), totalIgstAmt: sum("igstAmount"),
    totalCessAmt: sum("cessAmount"), totalAddlCessAmt: sum("additionalCessAmount"),
  };
}

export function applyDesktopPriceLevel(item, level) {
  return recalculateDesktopItem({ ...item, GodownList: item.GodownList.map(row => ({
    ...row, selectedPriceRate: priceLevelRate(item, level),
  })) });
}

export function desktopTaxInclusive(product, existing, stockIndex) {
  return Boolean(existing?.isTaxInclusive ?? existing?.taxInclusive ?? product?.GodownList?.[stockIndex]?.isTaxInclusive ?? product?.isTaxInclusive ?? product?.taxInclusive ?? false);
}

export function addDesktopStockRow(product, existing, stockIndex, quantity, rate, taxInclusive) {
  const stock = product.GodownList[stockIndex];
  const item = existing || { ...product, GodownList: product.GodownList.map(row => ({
    ...row, count: 0, actualCount: 0, added: false,
  })) };
  const rows = [...item.GodownList];
  let index = rows.findIndex(row => sameStockRow(row, stock));
  if (index < 0) { index = rows.length; rows.push({ ...stock, count: 0, actualCount: 0 }); }
  const row = rows[index];
  rows[index] = {
    ...row, balance_stock: stock.balance_stock, added: true,
    count: Number((Number(row.count || 0) + quantity).toFixed(3)),
    actualCount: Number((Number(row.actualCount || row.count || 0) + quantity).toFixed(3)),
    selectedPriceRate: rate,
  };
  if (taxInclusive !== undefined) {
    return recalculateDesktopItem({
      ...item, isTaxInclusive: Boolean(taxInclusive), taxInclusive: Boolean(taxInclusive),
      GodownList: rows.map(row => ({ ...row, isTaxInclusive: Boolean(taxInclusive) })),
    });
  }
  return recalculateDesktopItem({ ...item, GodownList: rows });
}

export function matchingSaleRateItem(items, product, stockIndex, rate, taxInclusive) {
  const stock = product.GodownList[stockIndex];
  return items.find(item => item._id === product._id &&
    Boolean(item.isTaxInclusive) === Boolean(taxInclusive) &&
    ["igst", "cgst", "sgst", "cess", "addl_cess"].every(field => Number(item[field] || 0) === Number(product[field] || 0)) &&
    item.GodownList.filter(row => row.added).every(row => Number(row.selectedPriceRate || 0) === Number(rate)) &&
    item.GodownList.filter(row => row.added && sameStockRow(row, stock)).every(row =>
      !Number(row.discountAmount || 0) && !Number(row.discountPercentage || 0)));
}
