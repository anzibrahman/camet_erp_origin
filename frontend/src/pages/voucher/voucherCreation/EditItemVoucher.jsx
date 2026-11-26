/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */

import { useDispatch, useSelector } from "react-redux";
import EditItemForm from "./EditItemForm";
import useFetch from "@/customHook/useFetch";
import { useEffect } from "react";
import { addWarrantyCardsList } from "../../../../slices/voucherSlices/commonVoucherSlice";

function EditItemVoucher({ itemId, godownIndex, onClose } = {}) {
  const ItemsFromRedux = useSelector((state) => {
    return state.commonVoucherSlice.items;
  });

  const { voucherType, warrantyCardsList } = useSelector(
    (state) => state.commonVoucherSlice
  );
  const company = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );

  const dispatch = useDispatch();

  //// to get warranty cards
  const { data: warrantyCardData, loading } = useFetch(
    warrantyCardsList === null && `/api/sUsers/getWarrantyCards/${company?._id}`
  );

  useEffect(() => {
    if (warrantyCardData && warrantyCardsList === null) {
      dispatch(addWarrantyCardsList(warrantyCardData?.data));
    }
  }, [warrantyCardData]);


  let modifiedVoucherType = voucherType;
  /// for sales and van sale both we have to check sale configuration
  if (voucherType === "sales" || voucherType === "vanSale" || voucherType === "performaInvoice") {
    modifiedVoucherType = "sale";
  }

  let taxInclusive = false;
  taxInclusive =
    company?.configurations?.[0]?.addRateWithTax[modifiedVoucherType] ?? false;

  return (
    <EditItemForm
      ItemsFromRedux={ItemsFromRedux}
      from={voucherType}
      taxInclusive={taxInclusive}
      loading={loading}
      itemId={itemId}
      godownIndex={godownIndex}
      onClose={onClose}
    />
  );
}

export default EditItemVoucher;
