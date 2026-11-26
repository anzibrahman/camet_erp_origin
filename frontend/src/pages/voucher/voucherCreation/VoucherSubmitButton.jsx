/* eslint-disable react/prop-types */
import { IoIosAddCircle } from "react-icons/io";
import { useSelector } from "react-redux";
import {  useNavigate } from "react-router-dom";
import { toast } from "sonner";

function VoucherSubmitButton({
  title,
  enablePaymentSplittingAsCompulsory,
  loading,
  submitHandler,
  mode,
  titleText,
  label,
  onReceivePayment,
}) {
  const { additionalCharges: additionalChargesFromRedux = [] } = useSelector(
    (state) => state.commonVoucherSlice
  );

  const navigate=useNavigate();

  const handleNavigate = () => {
    
   if (additionalChargesFromRedux.length>0) {
        const hasEmptyValue = additionalChargesFromRedux.some(
          (row) => row.value === ""
        );
        if (hasEmptyValue) {
          toast.error("Please add a value in Additional Charges");
          return;
        }
        const hasNagetiveValue = additionalChargesFromRedux.some(
          (row) => parseFloat(row.value) < 0
        );
        if (hasNagetiveValue) {
          toast.error("Please add a positive value in Additional Charges");

          return;
        }
      }

     if (onReceivePayment) onReceivePayment();
     else navigate("/sUsers/sales/paymentSplitting")
  };

  return (
    <div>
      {title === "Sales" && enablePaymentSplittingAsCompulsory && !label ? (
        // Special case → link button
        <div
          onClick={handleNavigate}
          className={`${
            loading && "pointer-events-none opacity-80"
          } bottom-0 text-white bg-violet-700 w-full sm:rounded-md p-2 flex items-center justify-center gap-2 hover_scale cursor-pointer`}
        >
          <IoIosAddCircle className="text-2xl" />
          <p>Receive Payment</p>
        </div>
      ) : (
        // Normal button case
        <button
          onClick={submitHandler}
          className={`${
            loading && "pointer-events-none opacity-80"
          } bottom-0 text-white bg-violet-700 w-full sm:rounded-md p-2 flex items-center justify-center gap-2 hover_scale cursor-pointer`}
        >
          <IoIosAddCircle className="text-2xl" />
          {title === "Stock Transfer" ? (
            <p>{mode === "create" ? "Transfer Stock" : "Edit Transfer"}</p>
          ) : (
            <p>
              {label || (mode === "create"
                ? `Generate ${titleText}`
                : `Edit ${titleText}`)}
            </p>
          )}
        </button>
      )}
    </div>
  );
}

export default VoucherSubmitButton;
