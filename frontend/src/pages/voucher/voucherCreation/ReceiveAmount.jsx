import { IoMdAdd } from "react-icons/io";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

function ReceiveAmount() {
  const { paymentSplittingData, voucherType } = useSelector(
    (state) => state.commonVoucherSlice
  );

  console.log("paymentSplittingData", paymentSplittingData);

  const navigate = useNavigate();
  
  const handleReceiveAmount = () => {
    navigate("/sUsers/sales/paymentSplitting");
  };

  // Check if there's any payment data with ref_id
  const hasPaymentData = paymentSplittingData && 
    paymentSplittingData.length > 0 && 
    paymentSplittingData.some(item => item.ref_id);

  // Function to format payment type display name
  const getPaymentTypeDisplay = (type) => {
    switch (type.toLowerCase()) {
      case 'cash':
        return 'Cash';
      case 'upi':
        return 'UPI';
      case 'cheque':
        return 'Cheque';
      case 'credit':
        return 'Credit';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (voucherType === "creditNote") return null;

  return (
    <div className="bg-white">
      {/* Display payment data if available */}
      {hasPaymentData && (
        <div className="px-4  border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Details:</h3>
          <div className="space-y-2">
            {paymentSplittingData
              .filter(item => item.ref_id) // Only show items with ref_id
              .map((payment, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="text-xs  font-medium text-gray-800">
                    {getPaymentTypeDisplay(payment.type)}
                    {payment.reference_name && ` (${payment.reference_name})`}
                  </span>
                  <span className="text-xs  font-semibold text-green-600">
                    ₹{payment.amount}
                  </span>
                </div>
              ))
            }
          </div>
          
          {/* Total amount */}
          <div className="mt-3 px-2 py-2 border-y border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-xs  font-semibold text-gray-800">Total:</span>
              <span className="text-xs  font-bold text-blue-600">
                ₹{paymentSplittingData
                  .filter(item => item.ref_id)
                  .reduce((total, payment) => total + parseFloat(payment.amount || 0), 0)
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Receive Amount Button */}
      <div className="flex justify-end items-center font-semibold gap-1 text-violet-500 cursor-pointer pr-4 py-3">
        <div onClick={handleReceiveAmount} className="flex items-center">
          <IoMdAdd className="text-lg sm:text-xl" />
          <p className="text-xs ml-1 sm:text-base">Receive Amount</p>
        </div>
      </div>
    </div>
  );
}

export default ReceiveAmount;