/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "../../../api/api";
import { setSalesReturnNotes } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { saleReturnRows, combineSaleReturnItems } from "./creditNoteSaleItems";

import { createSalesReturnKey, createSalesReturnDraft } from "./salesReturnDraft";

export default function SalesCustomerImport({ cmpId, party, locked = false }) {
  const dispatch = useDispatch();
  const notes = useSelector(state => state.commonVoucherSlice.salesReturnNotes || []);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [quantities, setQuantities] = useState({});
  const { data: sales = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["sales-customer-import", cmpId, party?._id],
    queryFn: async ({ signal }) => {
      const result = [];
      let page = 1;
      let hasMore;
      do {
        const response = await api.get(`/api/sUsers/partySales/${cmpId}/${party._id}`, { params: { page }, withCredentials: true, signal });
        result.push(...(response.data.data || []));
        hasMore = response.data.hasMore;
        page += 1;
      } while (hasMore);
      return result;
    },
    enabled: open && !!cmpId && !!party?._id,
    staleTime: 0,
  });
  const items = useMemo(() => combineSaleReturnItems(selected), [selected]);
  const rows = saleReturnRows(items);
  const updateSelection = next => {
    setSelected(next);
    setQuantities(Object.fromEntries(saleReturnRows(combineSaleReturnItems(next)).map(row => [row.key, row.soldQuantity])));
  };
  const selectSale = sale => updateSelection(selected.some(value => value._id === sale._id)
    ? selected.filter(value => value._id !== sale._id) : [...selected, sale]);
  const selectAllProducts = checked => setQuantities(Object.fromEntries(rows.map(row => [row.key, checked ? row.soldQuantity : 0])));
  const importReturns = () => {
    if (locked) return;
    try {
      const draft = createSalesReturnDraft(items, quantities, selected, party?._id, createSalesReturnKey());
      dispatch(setSalesReturnNotes([...notes, draft]));
      setOpen(false);
      toast.success("Return products added to the Sales list. No credit note has been saved.");
    } catch (error) {
      toast.error(error.message);
    }
  };
  return <>
    <div className="sales-import-actions"><button type="button" className="credit-note-sales-button" disabled={locked || !party?._id} onClick={() => { updateSelection([]); setOpen(true); }}>Import</button>
      {notes.filter(note => note.status === "saved").map(note => <span key={note.key} className="sales-import-return-badge" role="status">Credit Note {note.number} saved</span>)}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="credit-note-sales-dialog">
        <DialogTitle>Import sales — {party?.partyName}</DialogTitle>
        <DialogDescription>Select sales and products to return. Adding returns only prepares the products in the Sales list; it does not save a credit note. Changing sales resets product quantities.</DialogDescription>
        {isLoading && <p role="status">Loading all customer sales…</p>}
        {isError && <p role="alert">Unable to load sales. <button type="button" onClick={() => refetch()}>Retry</button></p>}
        {!isLoading && !isError && <>
          <div className="credit-note-sales-scroll sales-import-scroll"><table><thead><tr><th><label><input type="checkbox" aria-label="Select all sales" checked={!!sales.length && selected.length === sales.length} disabled={!sales.length || locked} onChange={event => updateSelection(event.target.checked ? sales : [])} /> All</label></th><th>Sale No</th><th>Date</th><th>Amount</th></tr></thead><tbody>
            {sales.map(sale => <tr key={sale._id}><td><input type="checkbox" aria-label={`Select sale ${sale.salesNumber}`} disabled={locked} checked={selected.some(value => value._id === sale._id)} onChange={() => selectSale(sale)} /></td><td><button type="button" disabled={locked} onClick={() => selectSale(sale)}>{sale.salesNumber}</button></td><td>{new Date(sale.date).toLocaleDateString("en-GB")}</td><td>₹ {Number(sale.finalAmount || 0).toFixed(2)}</td></tr>)}
            {!sales.length && <tr><td colSpan={4}>No sales found for this customer.</td></tr>}
          </tbody></table></div>
          <p>{selected.length} of {sales.length} sales selected</p>
        </>}
        {!!selected.length && <>
          <div className="credit-note-sales-tools"><strong>Products from selected sales</strong><button type="button" disabled={locked} onClick={() => selectAllProducts(true)}>Qty All</button></div>
          <div className="credit-note-sales-scroll sales-import-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all return products" disabled={locked || !rows.length} checked={!!rows.length && rows.every(row => Number(quantities[row.key]) > 0)} onChange={event => selectAllProducts(event.target.checked)} /></th><th>Product / Godown / Batch</th><th>Sold Qty</th><th>Rate</th><th>Return Qty</th></tr></thead><tbody>
            {rows.map(({ item, row, key, soldQuantity }) => <tr key={key}><td><input type="checkbox" aria-label={`Return ${item.product_name} ${key}`} disabled={locked} checked={Number(quantities[key]) > 0} onChange={event => setQuantities(value => ({ ...value, [key]: event.target.checked ? soldQuantity : 0 }))} /></td><td>{item.product_name} {Number(quantities[key]) > 0 && <span className="sales-import-return-badge">Return</span>}<small>{[row.godown, row.batch].filter(Boolean).join(" / ")} · Tax {item.igst || 0}%{item.isTaxInclusive ? " inclusive" : ""}</small></td><td>{soldQuantity} {item.unit}</td><td>₹ {Number(row.selectedPriceRate || 0).toFixed(2)}</td><td><input aria-label={`Return quantity for ${item.product_name} ${key}`} type="number" min="0" step="any" disabled={locked} value={quantities[key] ?? ""} onChange={event => setQuantities(value => ({ ...value, [key]: event.target.value }))} /></td></tr>)}
            {!rows.length && <tr><td colSpan={5}>No returnable products in the selected sales.</td></tr>}
          </tbody></table></div>
        </>}
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={locked || isLoading || isError || !rows.some(row => Number(quantities[row.key]) > 0)} onClick={importReturns}>Add Returns to Sales List</button></footer>
      </DialogContent>
    </Dialog>
  </>;
}
