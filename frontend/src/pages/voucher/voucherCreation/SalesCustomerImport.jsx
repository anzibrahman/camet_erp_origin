/* eslint-disable react/prop-types */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";

import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "../../../api/api";
import { setSalesReturnNotes } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { combineSaleReturnItems, returnableSales } from "./creditNoteSaleItems";

import { reduceImportProduct, toggleImportProduct } from "./salesReturnDraft";
import { createSalesReturnKey, createSalesReturnDraft, salesReturnDisplayItems } from "./salesReturnDraft";

export default function SalesCustomerImport({ cmpId, party, locked = false, onImport = null }) {
  const dispatch = useDispatch();
  const notes = useSelector(state => state.commonVoucherSlice.salesReturnNotes || []);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [draft, setDraft] = useState(null);
  const [baseDraft, setBaseDraft] = useState(null);
  const [reducing, setReducing] = useState(null);
  const [sourceQuantities, setSourceQuantities] = useState({});
  const sourceKey = source => source.lineId;
  const quantityError = reducing?.item._returnSources.some(source => {
    const count = Number(sourceQuantities[sourceKey(source)]);
    return !Number.isFinite(count) || count < 0 || count > source.quantity;
  });
  const changeSourceQuantity = (source, value) => {
    setSourceQuantities(current => ({ ...current, [sourceKey(source)]: value }));
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0 || count > source.quantity) {
      toast.error(`You can make a credit note for only ${source.quantity} ${reducing.item.unit || "units"} of ${reducing.item.product_name} from sale ${source.salesNumber || source.saleId}. Enter a quantity from 0 to ${source.quantity}.`);
    }
  };
  const { data: sales = [], isLoading, isFetching, isError, refetch } = useQuery({
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
  const products = salesReturnDisplayItems([], baseDraft ? [baseDraft] : [], party?._id);
  const currentProducts = salesReturnDisplayItems([], draft ? [draft] : [], party?._id);
  const activeSaleIds = selected.map(sale => sale._id);
  const updateSelection = next => {
    setSelected(next); setReducing(null);
    if (!next.length) { setDraft(null); setBaseDraft(null); return; }
    try {
      const combined = combineSaleReturnItems(returnableSales(next, onImport ? [] : notes));
      const nextDraft = combined.length ? createSalesReturnDraft(combined, {}, next, party?._id, createSalesReturnKey()) : null;
      setDraft(nextDraft); setBaseDraft(nextDraft);
      if (!nextDraft) toast.info("No quantity remains available to return from these sales.");
    } catch (error) { setDraft(null); setBaseDraft(null); toast.error(error.message); }
  };
  const selectSale = sale => {
    const active = selected.filter(value => activeSaleIds.includes(value._id));
    updateSelection(activeSaleIds.includes(sale._id) ? active.filter(value => value._id !== sale._id) : [...active, sale]);
  };
  const askReduction = (item, target = null) => {
    toast.info(`Only ${item._returnSources.reduce((sum, source) => sum + source.availableQuantity, 0)} ${item.unit || "units"} are available for a credit note for ${item.product_name}.`);
    setReducing({ item, target });
    setSourceQuantities(Object.fromEntries(item._returnSources.map(source => [sourceKey(source), source.quantity])));
  };
  const applyReduction = () => {
    try {
      const next = reduceImportProduct(draft, reducing.item, sourceQuantities, reducing.target);
      setDraft(next); setReducing(null);
    } catch (error) { toast.error(error.message); }
  };
  const importReturns = () => {
    if (locked) return;
    try {
      if (!draft?.items.length) throw new Error("Select at least one product to return");
      if (onImport) {
        if (onImport(draft, selected) === false) return;
      } else dispatch(setSalesReturnNotes([...notes, draft]));
      setOpen(false);
      toast.success(onImport ? "Sale items added. Save the credit note to adjust the selected sales." : "Return products added to the Sales list. No credit note has been saved.");
    } catch (error) {
      toast.error(error.message);
    }
  };
  return <>
    <div className="sales-import-actions"><button type="button" className="credit-note-sales-button" disabled={locked || !party?._id} onClick={() => { updateSelection([]); setOpen(true); }}>{onImport ? "Sales" : "Import"}</button>
      {!onImport && notes.filter(note => note.status === "saved").map(note => <span key={note.key} className="sales-import-return-badge" role="status">Credit Note {note.number} saved</span>)}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="credit-note-sales-dialog">
        <DialogTitle>{onImport ? "Sales" : "Import sales"} — {party?.partyName}</DialogTitle>
        <DialogDescription>Select sales and products to return. {onImport ? "Add the selected return products to the credit note, then save the credit note." : "Adding returns only prepares the products in the Sales list; it does not save a credit note."} You can return only the remaining available quantity. Quantities can only be reduced. For a merged product, choose the original sale to remove quantity from. Changing sale selections starts a new product selection.</DialogDescription>
        {(isLoading || isFetching) && <p role="status">Loading all customer sales…</p>}
        {isError && <p role="alert">Unable to load sales. <button type="button" onClick={() => refetch()}>Retry</button></p>}
        {!isLoading && !isFetching && !isError && <>
          <div className="credit-note-sales-scroll sales-import-scroll"><table><thead><tr><th><label><input type="checkbox" aria-label="Select all sales" checked={!!sales.length && activeSaleIds.length === sales.length} disabled={!sales.length || locked} onChange={event => updateSelection(event.target.checked ? sales : [])} /> All</label></th><th>Sale No</th><th>Date</th><th>Amount</th></tr></thead><tbody>
            {sales.map(sale => <tr key={sale._id}><td><input type="checkbox" aria-label={`Select sale ${sale.salesNumber}`} disabled={locked} checked={activeSaleIds.includes(sale._id)} onChange={() => selectSale(sale)} /></td><td><button type="button" disabled={locked} onClick={() => selectSale(sale)}>{sale.salesNumber}</button></td><td>{new Date(sale.date).toLocaleDateString("en-GB")}</td><td>₹ {Number(sale.finalAmount || 0).toFixed(2)}</td></tr>)}
            {!sales.length && <tr><td colSpan={4}>No sales found for this customer.</td></tr>}
          </tbody></table></div>
          <p>{activeSaleIds.length} of {sales.length} sales have return products</p>
        </>}
        {!!selected.length && <>
          <div className="credit-note-sales-tools"><strong>Products to return</strong></div>
          <p role="status">Credit note quantities cannot exceed the product quantity in each selected sale. Reduce quantity to choose how much to return.</p>
          <div className="credit-note-sales-scroll sales-import-scroll"><table><thead><tr><th>Return</th><th>Product / Source sales</th><th>Sold Qty</th><th>Already returned</th><th>Available Qty</th><th>Return Qty</th><th>Amount</th><th>Reduce</th></tr></thead><tbody>
            {products.map(item => {
              const current = currentProducts.find(value => value._voucherLineId === item._voucherLineId);
              const sold = item._returnSources.reduce((sum, source) => sum + source.soldQuantity, 0);
              const returned = item._returnSources.reduce((sum, source) => sum + source.returnedQuantity, 0);
              const available = item._returnSources.reduce((sum, source) => sum + source.availableQuantity, 0);
              return <tr key={item._voucherLineId}>
              <td><input type="checkbox" aria-label={`Return ${item.product_name}`} disabled={locked} checked={!!current} onChange={event => setDraft(toggleImportProduct(baseDraft, draft, item, event.target.checked))} /></td>
              <td>{item.product_name} <span className="sales-import-return-badge">Return</span><small>{item._returnSources.map(source => `${source.salesNumber || source.saleId}: available ${source.availableQuantity} ${item.unit || "units"}`).join(" / ")}</small></td>
              <td>{sold} {item.unit}</td><td>{returned} {item.unit}</td><td>{available} {item.unit}</td>
              <td><output aria-label={`Return quantity for ${item.product_name}`}>{current?.totalCount || 0} {item.unit}</output></td>
              <td>₹ {Number(current?.total || 0).toFixed(2)}</td>
              <td><button type="button" disabled={locked || !current} aria-label={`Reduce ${item.product_name} by one`} onClick={() => askReduction(current, Math.max(0, current.totalCount - Math.min(1, current.totalCount)))}>−1</button> <button type="button" disabled={locked || !current} onClick={() => askReduction(current)}>Reduce quantity</button></td>
            </tr>; })}
            {selected.flatMap(sale => (sale.items || []).filter(item => item.availableReturnQuantity === 0).map((item, index) => <tr key={`${sale._id}-${item._id}-${index}`}>
              <td><input type="checkbox" disabled checked={false} aria-label={`No return balance for ${item.product_name}`} /></td>
              <td>{item.product_name}<small>{sale.salesNumber}</small></td><td>{item.soldQuantity}</td><td>{item.returnedQuantity}</td><td>0</td><td>0</td><td>₹ 0.00</td><td>Fully returned</td>
            </tr>))}
            {!products.length && <tr><td colSpan={8}>No return products remain available.</td></tr>}
          </tbody></table></div>
        </>}
        <footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={locked || isLoading || isFetching || isError || !draft?.items.length} onClick={importReturns}>{onImport ? "Add to Credit Note" : "Add Returns to Sales List"}</button></footer>
      </DialogContent>
    </Dialog>
    <Dialog open={!!reducing} onOpenChange={value => { if (!value) setReducing(null); }}><DialogContent>
      <DialogTitle>Reduce {reducing?.item.product_name}</DialogTitle>
      <DialogDescription>{reducing?.target == null ? "Choose how much return quantity to keep from each original sale. You can only reduce the current quantities." : `Remove ${Number((reducing.item.totalCount - reducing.target).toFixed(3))} quantity. Choose which original sale it comes from.`}</DialogDescription>
      {reducing && <p role="status">You can make a credit note for only the quantities shown below for {reducing.item.product_name}. Enter 0 to exclude a source. Quantities can only be reduced.</p>}
      {reducing?.item._returnSources.map(source => <div key={sourceKey(source)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 80px auto", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <label htmlFor={`source-${sourceKey(source)}`}>{source.salesNumber || source.saleId} · Sold {source.soldQuantity} · Returned {source.returnedQuantity} · Available {source.availableQuantity} {reducing.item.unit} · Keep (max {source.quantity})</label>
        <input id={`source-${sourceKey(source)}`} aria-label={`Keep quantity from ${source.salesNumber}`} type="number" min="0" max={source.quantity} step="any" style={{ width: "100%", padding: 6, border: "1px solid #ccc" }} value={sourceQuantities[sourceKey(source)] ?? ""} aria-invalid={Number(sourceQuantities[sourceKey(source)]) < 0 || Number(sourceQuantities[sourceKey(source)]) > source.quantity} onChange={event => changeSourceQuantity(source, event.target.value)} />
        <button type="button" onClick={() => setSourceQuantities(value => ({ ...value, [sourceKey(source)]: Math.max(0, Number(value[sourceKey(source)]) - Math.min(1, Number(value[sourceKey(source)]))) }))}>Remove 1</button>
      </div>)}
      {quantityError && <p role="alert">Return quantity exceeds the allowed limit or is invalid. Enter a quantity between 0 and the maximum shown for each sale.</p>}
      <footer className="mt-4 flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" className="min-h-10 rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" onClick={() => setReducing(null)}>Cancel</button>
        <button type="button" className="min-h-10 rounded-md border border-violet-700 bg-violet-700 px-5 py-2 text-sm font-medium text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={locked || quantityError} onClick={applyReduction}>Apply reduction</button>
      </footer>
    </DialogContent></Dialog>
  </>;
}
