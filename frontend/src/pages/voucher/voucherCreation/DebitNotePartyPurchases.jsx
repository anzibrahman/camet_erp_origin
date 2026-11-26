/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "../../../api/api";
import { setItem, resetPaymentSplit } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { saleReturnRows, creditNoteItemsFromSale, combineSaleReturnItems } from "./creditNoteSaleItems";

export default function DebitNotePartyPurchases({ cmpId, party, locked = false }) {
  const dispatch = useDispatch();
  const existingItems = useSelector(state => state.commonVoucherSlice.items);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [quantities, setQuantities] = useState({});
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["debit-note-party-purchases", cmpId, party?._id, page],
    queryFn: async ({ signal }) => (await api.get("/api/sUsers/partyPurchases/" + cmpId + "/" + party._id, { params: { page }, withCredentials: true, signal })).data,
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
  const addToDebitNote = () => {
    if (!selected.length || selected.some(sale => String(sale.party?._id) !== String(party?._id))) return;
    try {
      const items = creditNoteItemsFromSale(preview, quantities);
      if (!items.length) { toast.error("Enter a return quantity for at least one item"); return; }
      if (existingItems.length && !window.confirm("Replace the current debit-note items with items from the selected purchases?")) return;
      dispatch(setItem(items));
      dispatch(resetPaymentSplit());
      setOpen(false);
      toast.success("Purchase items added. Adjust quantities in the item list and save the debit note.");
    } catch (error) { toast.error(error.message.replace("sold quantity", "purchased quantity")); }
  };
  return <>
    <button type="button" className="credit-note-sales-button" disabled={locked || !party?._id} onClick={() => { setPage(1); setSelected([]); setPreview(null); setOpen(true); }}>Purchases</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="credit-note-sales-dialog">
        <DialogTitle>Purchases — {party?.partyName}</DialogTitle>
        <DialogDescription>Select one or more purchases, review the combined items, then adjust the return quantities.</DialogDescription>
        {!preview ? <>
          {isLoading && <p role="status">Loading purchases…</p>}
          {isError && <p role="alert">Unable to load purchases. <button type="button" onClick={() => refetch()}>Retry</button></p>}
          {!isLoading && !isError && <div className="credit-note-sales-scroll"><table><thead><tr><th>Select</th><th>Purchase No</th><th>Date</th><th>Amount</th></tr></thead><tbody>
            {(data?.data || []).map(sale => <tr key={sale._id}><td><input type="checkbox" aria-label={"Select purchase " + sale.purchaseNumber} checked={selected.some(value => value._id === sale._id)} onChange={() => selectSale(sale)} /></td><td>{sale.purchaseNumber}</td><td>{new Date(sale.date).toLocaleDateString("en-GB")}</td><td>₹ {Number(sale.finalAmount || 0).toFixed(2)}</td></tr>)}

            {!data?.data?.length && <tr><td colSpan={4}>No purchases found for this supplier.</td></tr>}
          </tbody></table></div>}
          <footer><button type="button" disabled={page === 1 || isLoading} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} · {data?.total || 0} purchases</span><button type="button" disabled={!data?.hasMore || isLoading} onClick={() => setPage(value => value + 1)}>Next</button></footer>
          <button type="button" disabled={!selected.length || locked} onClick={reviewItems}>Review items from {selected.length} selected purchases</button>
        </> : <>
          <div className="credit-note-sales-tools"><button type="button" onClick={() => setPreview(null)}>Back to purchases</button><strong>{selected.length} purchases selected</strong><button type="button" onClick={reviewItems}>Qty All</button></div>
          <div className="credit-note-sales-scroll"><table><thead><tr><th>Select</th><th>Item / Godown / Batch</th><th>Purchased Qty</th><th>Rate</th><th>Discount</th><th>Return Qty</th></tr></thead><tbody>
            {rows.map(({ item, row, key, soldQuantity }) => <tr key={key}><td><input type="checkbox" aria-label={"Select item " + item.product_name + " " + key} checked={Number(quantities[key] || 0) > 0} onChange={event => setQuantities(value => ({ ...value, [key]: event.target.checked ? soldQuantity : 0 }))} /></td><td>{item.product_name}<small>{[row.godown, row.batch].filter(Boolean).join(" / ")} · Tax {item.igst || 0}%{item.isTaxInclusive ? " inclusive" : ""}</small></td><td>{soldQuantity} {item.unit}</td><td>₹ {Number(row.selectedPriceRate || 0).toFixed(2)}</td><td>{row.discountType === "percentage" ? Number(row.discountPercentage || 0) + "%" : "₹ " + Number(row.discountAmount || 0).toFixed(2)}</td><td><input aria-label={"Return quantity for " + item.product_name + " " + key} type="number" min="0" step="any" value={quantities[key] ?? ""} onChange={event => setQuantities(value => ({ ...value, [key]: event.target.value }))} /></td></tr>)}
          </tbody></table></div>
          <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={locked || !rows.length} onClick={addToDebitNote}>Add to Debit Note</button></footer>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
