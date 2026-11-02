
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addNewAddress } from "../../../../slices/voucherSlices/commonVoucherSlice";
import AddressForm from "@/components/secUsers/AddressForm";
import TitleDiv from "@/components/common/TitleDiv";
import { useState } from "react";
import "@/components/secUsers/addressForm.css";

function BillToVoucher() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading,setLoading]=useState(false)



  const submitFormData = (formData) => {
    dispatch(addNewAddress(formData));
    navigate(-1);
  };

  const { configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );

  // const ship to
  const voucherType = location.pathname.includes("billToPurchase") || location.pathname.includes("billToDebitNote") ? "purchase" : location.pathname.includes("billToSalesOrder") ? "saleOrder" : "sale";
  const showShipTo = voucherType !== "purchase" && (configurations[0]?.enableShipTo?.[voucherType] ?? configurations[0]?.enableShipTo?.sale ?? false);


  // console.log(configurations);

  return (
    <div className="bill-to-voucher">
      <TitleDiv title={"Change Address"} loading={loading}  />
      <AddressForm
        getFormData={submitFormData}
        showShipTo={showShipTo}
        setLoading={setLoading}
        loading={loading}
        desktopLayout
      />
    </div>
  );
}

export default BillToVoucher;
