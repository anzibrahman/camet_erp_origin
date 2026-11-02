/* eslint-disable react/prop-types */
import { useDispatch, useSelector } from "react-redux";
import { setItem, setPriceLevel, resetPaymentSplit, setSelectedSaleIds } from "../../../../slices/voucherSlices/commonVoucherSlice";
import SalesCustomerImport from "./SalesCustomerImport";

export default function CreditNotePartySales({ cmpId, party, locked = false }) {
  const dispatch = useDispatch();
  const existingItems = useSelector(state => state.commonVoucherSlice.items);
  const addToCreditNote = (draft, sales) => {
    if (locked || String(draft.partyId) !== String(party?._id)) return false;
    if (existingItems.length && !window.confirm("Replace the current credit-note items with items from the selected sales?")) return false;
    const items = draft.items.map(item => {
      const { _importedReturn, _voucherLineId, ...product } = item;
      void _importedReturn; void _voucherLineId;
      return product;
    });
    dispatch(setItem(items));
    dispatch(setSelectedSaleIds(draft.selectedSaleIds));
    const selectedSales = sales.filter(sale => draft.selectedSaleIds.includes(sale._id));
    if (selectedSales[0]?.selectedPriceLevel && selectedSales.every(sale => sale.selectedPriceLevel?._id === selectedSales[0].selectedPriceLevel._id)) {
      dispatch(setPriceLevel(selectedSales[0].selectedPriceLevel));
    }
    dispatch(resetPaymentSplit());
    return true;
  };
  return <SalesCustomerImport cmpId={cmpId} party={party} locked={locked} onImport={addToCreditNote} />;
}
