/* eslint-disable react/prop-types */
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { setSalesReturnNotes } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { updateSalesReturnSource } from "./salesReturnDraft";
export default function ReturnSourcesControl({ item, disabled = false }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const notes = useSelector(state => state.commonVoucherSlice.salesReturnNotes || []);
  const [quantities, setQuantities] = useState({});
  const sources = item._returnSources || [];
  const keyFor = source => `${source.noteKey}:${source.lineId}`;
  const apply = () => {
    try {
      let next = notes;
      for (const source of sources) next = updateSalesReturnSource(next, source.noteKey, source.lineId, quantities[keyFor(source)]);
      dispatch(setSalesReturnNotes(next)); setOpen(false);
    } catch (error) { toast.error(error.message); }
  };
  return <>
    <button type="button" disabled={disabled || item._returnSaved || !sources.length} aria-label={`Remove return quantity for ${item.product_name}`} onClick={() => {
      setQuantities(Object.fromEntries(sources.map(source => [keyFor(source), source.quantity]))); setOpen(true);
    }}>Remove</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogTitle>Return quantities - {item.product_name}</DialogTitle>
      <DialogDescription>Choose the original sale to remove quantity from. Zero removes that sale's product from the return. Only remaining return sources will be adjusted.</DialogDescription>
      {sources.map(source => <label key={keyFor(source)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 75px auto", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <span>{source.salesNumber || "Original sale"} - Rs {Number(source.amount || 0).toFixed(2)} - Returning {source.quantity}</span>
        <input style={{ width: "100%", border: "1px solid #ccc", padding: 6 }} aria-label={`Remaining return quantity from ${source.salesNumber}`} type="number" min="0" max={source.quantity} step="any" value={quantities[keyFor(source)] ?? ""} onChange={event => setQuantities(value => ({ ...value, [keyFor(source)]: event.target.value }))} />
        <button type="button" onClick={() => setQuantities(value => ({ ...value, [keyFor(source)]: 0 }))}>Remove all</button>
      </label>)}
      <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" onClick={apply}>Apply quantities</button></footer>
    </DialogContent></Dialog>
  </>;
}
