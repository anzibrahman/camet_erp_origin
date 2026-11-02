import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";
import api from "../../../api/api";
import VoucherInitialPage from "./voucherInitialPage";
import {
  removeAll, addVoucherType, addMode, saveId, addVoucherNumber, changeDate,
  addParty, setItem, setPriceLevel, setAdditionalCharges, addDespatchDetails,
  addNote, addPaymentSplits, addSelectedVoucherSeries,
} from "../../../../slices/voucherSlices/commonVoucherSlice";

export default function ProformaInvoicePage() {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const draft = useSelector(state => state.commonVoucherSlice);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setReady(false);
    setError("");
    const initialize = async () => {
      try {
        if (draft.voucherType === "performaInvoice" && (id ? draft.id === id : draft.mode === "create")) {
          if (active) setReady(true);
          return;
        }
        const data = id ? location.state?.data || (await api.get("/api/sUsers/getPerformaInvoiceDetails/" + id, { withCredentials: true })).data.data : null;
        if (!active) return;
        if (data?.isCancelled) throw new Error("Cancelled proforma invoices cannot be edited");
        dispatch(removeAll());
        dispatch(addVoucherType("performaInvoice"));
        dispatch(addMode(id ? "edit" : "create"));
        if (data) {
          dispatch(saveId(data._id));
          dispatch(addVoucherNumber(data.salesNumber));
          dispatch(changeDate(JSON.stringify(new Date(data.date))));
          dispatch(addParty(data.party || {}));
          dispatch(setItem(data.items || []));
          dispatch(setPriceLevel(data.selectedPriceLevel || ""));
          dispatch(setAdditionalCharges(data.additionalCharges || []));
          dispatch(addDespatchDetails(data.despatchDetails || {}));
          dispatch(addNote(data.note || null));
          dispatch(addPaymentSplits({ changeFinalAmount: true, paymentSplits: data.paymentSplittingData || [], totalPaymentSplits: (data.paymentSplittingData || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) }));
          if (data.seriesDetails) dispatch(addSelectedVoucherSeries(data.seriesDetails));
        }
        setReady(true);
      } catch (failure) {
        if (active) setError(failure.response?.data?.message || failure.message);
      }
    };
    initialize();
    return () => { active = false; };
    // Initialize once per route; returning from item/payment selection preserves the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);
  if (error) return <p className="p-4 text-red-600" role="alert">{error}</p>;
  return ready ? <VoucherInitialPage /> : <p className="p-4">Loading proforma invoice…</p>;
}
