/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "../../../api/api";
import { setItem, setPriceLevel, resetPaymentSplit, setSelectedSaleIds } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { saleReturnRows, creditNoteItemsFromSale, combineSaleReturnItems } from "./creditNoteSaleItems";

export default function CreditNotePartySales({ cmpId, party, locked = false }) {
  const dispatch = useDispatch();
  const existingItems = useSelector(state => state.commonVoucherSlice.items);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [quantities, setQuantities] = useState({});
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["credit-note-party-sales", cmpId, party?._id, page],
    queryFn: async ({ signal }) => (await api.get("/api/sUsers/partySales/" + cmpId + "/" + party._id, { params: { page }, withCredentials: true, signal })).data,
    enabled: open && !!cmpId && !!party?._id,
    staleTime: 0,
  });
  const rows = saleReturnRows(preview);
  const selectSale = sale => {
    setSelected(current => current.some(value => value._id === sale._id)
      ? current.filter(value => value._id !== sale._id) : [...current, sale]);
  };
  const reviewItems = () => {
    const items = combineSaleReturnItems(selected);
    setPreview(items);
    setQuantities(Object.fromEntries(saleReturnRows(items).map(row => [row.key, row.soldQuantity])));
  };
  const addToCreditNote = () => {
    if (!selected.length || selected.some(sale => String(sale.party?._id) !== String(party?._id))) return;
    try {
      const items = creditNoteItemsFromSale(preview, quantities);
      if (!items.length) { toast.error("Enter a return quantity for at least one item"); return; }
      if (existingItems.length && !window.confirm("Replace the current credit-note items with items from the selected sales?")) return;
      dispatch(setItem(items));
      dispatch(setSelectedSaleIds(selected.map(sale => sale._id)));
      if (selected[0]?.selectedPriceLevel && selected.every(sale => sale.selectedPriceLevel?._id === selected[0].selectedPriceLevel._id)) dispatch(setPriceLevel(selected[0].selectedPriceLevel));
      dispatch(resetPaymentSplit());
      setOpen(false);
      toast.success("Sale items added. Saving will adjust this credit note against the selected sales only.");
    } catch (error) { toast.error(error.message); }
  };
  return <>
    <button type="button" className="credit-note-sales-button" disabled={locked || !party?._id} onClick={() => { setPage(1); setSelected([]); setPreview(null); setOpen(true); }}>Sales</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="credit-note-sales-dialog">
        <DialogTitle>Sales — {party?.partyName}</DialogTitle>
        <DialogDescription>Select one or more sales, review the combined items, then adjust the return quantities.</DialogDescription>
        {!preview ? <>
          {isLoading && <p role="status">Loading sales…</p>}
          {isError && <p role="alert">Unable to load sales. <button type="button" onClick={() => refetch()}>Retry</button></p>}
          {!isLoading && !isError && <div className="credit-note-sales-scroll"><table><thead><tr><th>Select</th><th>Sale No</th><th>Date</th><th>Amount</th></tr></thead><tbody>
            {(data?.data || []).map(sale => <tr key={sale._id}><td><input type="checkbox" aria-label={"Select sale " + sale.salesNumber} checked={selected.some(value => value._id === sale._id)} onChange={() => selectSale(sale)} /></td><td>{sale.salesNumber}</td><td>{new Date(sale.date).toLocaleDateString("en-GB")}</td><td>₹ {Number(sale.finalAmount || 0).toFixed(2)}</td></tr>)}

            {!data?.data?.length && <tr><td colSpan={4}>No sales found for this customer.</td></tr>}
          </tbody></table></div>}
          <footer><button type="button" disabled={page === 1 || isLoading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} · {data?.total || 0} sales</span><button type="button" disabled={!data?.hasMore || isLoading} onClick={() => setPage(value => value + 1)}>Next</button></footer>
          <button type="button" disabled={!selected.length || locked} onClick={reviewItems}>Review items from {selected.length} selected sales</button>
        </> : <>
          <div className="credit-note-sales-tools"><button type="button" onClick={() => setPreview(null)}>Back to sales</button><strong>{selected.length} sales selected</strong><button type="button" onClick={reviewItems}>Qty All</button></div>
          <div className="credit-note-sales-scroll"><table><thead><tr><th>Item / Godown / Batch</th><th>Sold Qty</th><th>Rate</th><th>Discount</th><th>Return Qty</th></tr></thead><tbody>
            {rows.map(({ item, row, key, soldQuantity }) => <tr key={key}><td>{item.product_name}<small>{[row.godown, row.batch].filter(Boolean).join(" / ")} · Tax {item.igst || 0}%{item.isTaxInclusive ? " inclusive" : ""}</small></td><td>{soldQuantity} {item.unit}</td><td>₹ {Number(row.selectedPriceRate || 0).toFixed(2)}</td><td>{row.discountType === "percentage" ? Number(row.discountPercentage || 0) + "%" : "₹ " + Number(row.discountAmount || 0).toFixed(2)}</td><td><input aria-label={"Return quantity for " + item.product_name + " " + key} type="number" min="0" step="any" value={quantities[key] ?? ""} onChange={event => setQuantities(value => ({ ...value, [key]: event.target.value }))} /></td></tr>)}
          </tbody></table></div>
          <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={locked || !rows.length} onClick={addToCreditNote}>Add to Credit Note</button></footer>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
