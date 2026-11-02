/* eslint-disable react/prop-types */
import { useDispatch, useSelector } from "react-redux";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AdditionalChargesTile from "./AdditionalChargesTile";
import DespatchDetails from "./DespatchDetails";
import { addNote } from "../../../../slices/voucherSlices/commonVoucherSlice";

const sections = [["charges", "Additional charges"], ["despatch", "Despatch details"], ["note", "Note"]];

export default function DesktopSalesOptions({ tab, onTabChange, openAdditionalTile, setOpenAdditionalTile, onTransactionSaved }) {
  const dispatch = useDispatch();
  const note = useSelector(state => state.commonVoucherSlice.note);
  const isProforma = useSelector(state => state.commonVoucherSlice.voucherType === "performaInvoice");
  return <div className="sales-options">
    <Dialog open={tab !== null} onOpenChange={open => { if (!open) onTabChange(null); }}>
      <DialogContent className="sales-options-dialog">
        <DialogTitle>Sale options</DialogTitle>
        <DialogDescription>{isProforma ? "Update charges, despatch details, and notes." : "Update sale details here. Apply payment changes using the payment button."}</DialogDescription>
        <nav className="sales-options-nav" aria-label="Sale options">
          {sections.map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => onTabChange(id)}>{label}</button>)}
        </nav>
        <div className="sales-options-body">
          <section hidden={tab !== "charges"} aria-label="Additional charges" className="sales-options-charges">
            <AdditionalChargesTile embedded type="sale" openAdditionalTile={openAdditionalTile} setOpenAdditionalTile={setOpenAdditionalTile} />
          </section>
          <section hidden={tab !== "despatch"} aria-label="Despatch details" className="sales-options-despatch">
            <DespatchDetails embedded />
          </section>
          <section hidden={tab !== "note"} aria-label="Note" className="sales-options-note">
            <label htmlFor="desktop-sale-note">Sale note</label>
            <textarea id="desktop-sale-note" rows={4} value={note || ""} placeholder="Add a note to this sale…" onChange={event => dispatch(addNote(event.target.value))} />
          </section>
        </div>
        <footer className="sales-options-footer"><span>Charges, despatch and notes update as you edit.</span><button type="button" onClick={() => onTabChange(null)}>Done</button></footer>
      </DialogContent>
    </Dialog>
  </div>;
}
