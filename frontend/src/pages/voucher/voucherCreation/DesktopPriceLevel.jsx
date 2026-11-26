/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../api/api";
import { addAllPriceLevels, setPriceLevel, updateItem, resetPaymentSplit } from "../../../../slices/voucherSlices/commonVoucherSlice";
import { applyDesktopPriceLevel } from "./desktopSaleItemState";

export default function DesktopPriceLevel({ cmpId, locked }) {
  const dispatch = useDispatch();
  const { selectedPriceLevel, items } = useSelector(state => state.commonVoucherSlice);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["desktop-sale-price-levels", cmpId],
    queryFn: async ({ signal }) => {
      const response = await api.get(`/api/sUsers/fetchFilters/${cmpId}`, { withCredentials: true, signal });
      return response.data.data?.priceLevels || [];
    },
    enabled: !!cmpId, staleTime: 5 * 60 * 1000,
  });
  useEffect(() => {
    if (!data) return;
    dispatch(addAllPriceLevels(data));
    if (!selectedPriceLevel && data.length) dispatch(setPriceLevel(data[0]));
  }, [data, dispatch, selectedPriceLevel]);
  return <div>
    <label htmlFor="desktop-price-level">Price Level</label>
    <select id="desktop-price-level" value={selectedPriceLevel?._id || ""}
      disabled={locked || isPending || isError || !data?.length}
      onChange={event => {
        const level = data.find(entry => entry._id === event.target.value);
        if (!level) return;
        dispatch(setPriceLevel(level));
        items.forEach(item => dispatch(updateItem({ item: applyDesktopPriceLevel(item, level) })));
        dispatch(resetPaymentSplit());
      }}>
      {!data?.length && <option value="">{isPending ? "Loading…" : isError ? "Unable to load" : "No price levels"}</option>}
      {selectedPriceLevel?._id && data?.length > 0 && !data.some(level => level._id === selectedPriceLevel._id) && <option value={selectedPriceLevel._id}>{selectedPriceLevel.name}</option>}
      {data?.map(level => <option key={level._id} value={level._id}>{level.name}</option>)}
    </select>
    {isError && <button type="button" onClick={() => refetch()}>Retry price levels</button>}
  </div>;
}
