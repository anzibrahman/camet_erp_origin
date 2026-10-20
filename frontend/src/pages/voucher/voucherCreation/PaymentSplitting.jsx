/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { ChevronDown, CircleDot } from "lucide-react";
import TitleDiv from "@/components/common/TitleDiv";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { truncateText } from "../../../../../backend/utils/textHelpers";
import {
  addPaymentSplits,
  updateTotalValue,
  resetPaymentSplit,
} from "../../../../slices/voucherSlices/commonVoucherSlice";
import { toast } from "sonner";
import { store } from "../../../../app/store";

// API function to fetch BankDetails and Cash sources
const fetchBankAndCashSources = async (cmp_id) => {
  const response = await api.get(
    `/api/sUsers/getBankAndCashSources/${cmp_id}`,
    {
      withCredentials: true,
    },
  );
  return response.data.data;
};

function PaymentSplitting({ embedded = false, onSaved, onTransactionSaved } = {}) {
  // Store payment splits in the required format directly
  const [paymentSplits, setPaymentSplits] = useState([
    { type: "cash", amount: 0, ref_id: null, ref_collection: "Cash" },
    { type: "upi", amount: 0, ref_id: null, ref_collection: "BankDetails" },
    { type: "cheque", amount: 0, ref_id: null, ref_collection: "BankDetails" },
    {
      type: "credit",
      amount: 0,
      ref_id: "",
      ref_collection: "Party",
      reference_name: "",
    },
  ]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false); // Track if auto-selection has occurred

  // Payment mode display information
  const paymentModeInfo = {
    cash: { title: "Cash", model: "Cash" },
    upi: { title: "NEFT/UPI/CARD/BANK", model: "BankDetails" },
    bank: { title: "NEFT/UPI/CARD/BANK", model: "BankDetails" },
    card: { title: "NEFT/UPI/CARD/BANK", model: "BankDetails" },
    cheque: { title: "Cheque", model: "BankDetails" },
    credit: { title: "Credit", model: "Party" },
  };

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const { _id: cmp_id, configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );
  const { enablePaymentSplittingAsCompulsory: configuredPaymentCompulsory = false } = configurations[0];

  //// check if the user is admin
  const isAdmin =
    JSON.parse(localStorage.getItem("sUserData")).role === "admin"
      ? true
      : false;

  const {
    totalWithAdditionalCharges: totalWithAdditionalCharges,
    paymentSplittingData,
    date,
    party,
    items,
    despatchDetails,
    voucherType,
    selectedPriceLevel: priceLevelFromRedux = "",
    voucherType: voucherTypeFromRedux,
    voucherNumber: voucherNumberFromRedux,
    vanSaleGodown: vanSaleGodownFromRedux,
    additionalCharges: additionalChargesFromRedux = [],
    stockTransferToGodown,
    selectedVoucherSeries: selectedVoucherSeriesFromRedux,
    note: noteFromRedux,
    mode: modeFromRedux,
    id: _idFromRedux,
  } = useSelector((state) => state.commonVoucherSlice);

  // Fetch BankDetails and Cash sources using TanStack Query
  const {
    data: sourcesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bankAndCashSources", cmp_id],
    queryFn: () => fetchBankAndCashSources(cmp_id),
    enabled: !!cmp_id,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (!embedded && !totalWithAdditionalCharges) {
      navigate(-1, { replace: true });
    }
  }, [totalWithAdditionalCharges, navigate, embedded]);

  useEffect(() => {
    if (paymentSplittingData) {
      setPaymentSplits(paymentSplittingData);
    }
  }, [paymentSplittingData]);

  // Auto-select sources based on party._id when data is available
  useEffect(() => {
    if (
      sourcesData &&
      party?._id &&
      !hasAutoSelected
      // !paymentSplittingData
    ) {
      const { banks = [], cashs = [] } = sourcesData;
      const partyId = party._id;

      const isPartySelected = paymentSplittingData?.find(
        (item) => item?.type === "credit",
      )?.ref_id;

      setPaymentSplits((prevSplits) => {
        return prevSplits.map((split) => {
          let matchingSource = null;

          switch (split.type) {
            case "cash":
              matchingSource = cashs.find(
                (cash) => (cash.cash_id || cash._id) === partyId,
              );
              if (matchingSource) {
                return {
                  ...split,
                  ref_id: matchingSource.cash_id || matchingSource._id,
                };
              }
              break;

            case "upi":
            case "cheque":
              matchingSource = banks.find(
                (bank) => (bank.bank_id || bank._id) === partyId,
              );
              if (matchingSource) {
                return {
                  ...split,
                  ref_id: matchingSource.bank_id || matchingSource._id,
                };
              }
              break;

            case "credit":
              // For credit, we check if party._id should be used
              /// if already party is selected no need to initialize
              if (partyId && !isPartySelected) {
                return {
                  ...split,
                  ref_id: partyId,
                  reference_name: party.partyName || "",
                  credit_reference_type: party?.partyType,
                };
              }
              break;

            default:
              break;
          }

          return split;
        });
      });

      setHasAutoSelected(true);
    }
  }, [sourcesData, party, hasAutoSelected, paymentSplittingData]);

  // Calculate total amount from non-credit payment splits
  const totalNonCreditAmount = paymentSplits
    .filter((split) => split.type !== "credit")
    .reduce((sum, split) => {
      const amount = parseFloat(split.amount) || 0;
      return sum + amount;
    }, 0);

  // Calculate balance amount for credit
  const balanceAmount = totalWithAdditionalCharges - totalNonCreditAmount;

  // Update credit amount whenever other amounts change
  useEffect(() => {
    setPaymentSplits((prevSplits) =>
      prevSplits.map((split) =>
        split.type === "credit"
          ? { ...split, amount: balanceAmount > 0 ? balanceAmount : 0 }
          : split,
      ),
    );
  }, [totalNonCreditAmount, totalWithAdditionalCharges]);

  // Calculate total amount including credit
  const totalAmount =
    totalNonCreditAmount + (balanceAmount > 0 ? balanceAmount : 0);

  const handleAmountChange = (type, amount) => {
    // Don't allow changes to credit amount
    if (type === "credit") return;

    const numericAmount = parseFloat(amount) || 0;

    // Calculate current total excluding this payment type (but not credit)
    const currentTotalExcludingThis = paymentSplits
      .filter((split) => split.type !== type && split.type !== "credit")
      .reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);

    // Check if adding this amount would exceed the total
    if (
      currentTotalExcludingThis + numericAmount >
      totalWithAdditionalCharges
    ) {
      // Set amount to remaining balance
      const remainingBalance =
        totalWithAdditionalCharges - currentTotalExcludingThis;
      amount = remainingBalance > 0 ? remainingBalance.toString() : "0";
    }

    setPaymentSplits((prev) =>
      prev.map((split) => (split.type === type ? { ...split, amount } : split)),
    );
  };

  const handleSourceChange = (type, ref_id) => {
    // Don't allow changes to credit source
    if (type === "credit") return;

    setPaymentSplits((prev) =>
      prev.map((split) => {
        if (split.type === type) {
          // If ref_id is being cleared, also clear the amount
          if (!ref_id) {
            return { ...split, ref_id: null, amount: "" };
          }
          return { ...split, ref_id };
        }
        return split;
      }),
    );
  };

  // const handleNavigateToPartyList = () => {
  //   // Don't allow navigation to party list - party is fixed
  //   return;
  // };

  // Get source options based on payment type
  const getSourceOptions = (type) => {
    if (!sourcesData) return [];

    const { banks = [], cashs = [] } = sourcesData;

    switch (type) {
      case "cash":
        return cashs.map((Cash) => ({
          value: Cash.cash_id || Cash._id,
          label: Cash.cash_ledname,
        }));
      case "upi":
      case "cheque":
      case "card":
      case "bank":
        return banks.map((BankDetails) => ({
          value: BankDetails.bank_id || BankDetails._id,
          label: BankDetails.bank_ledname,
        }));
      default:
        return [];
    }
  };

  // Get valid payment splits (with amount > 0 and ref_id selected)
  const getValidPaymentSplits = () => {
    return paymentSplits.map((split) => {
      // For credit, always include if there's a balance
      if (split.type === "credit") {
        return {
          ...split,
          amount: balanceAmount > 0 ? balanceAmount : 0,
        };
      }

      const requiredKeys = ["amount", "ref_id"]; // Only these must be filled
      const hasValue = requiredKeys.some(
        (key) => split[key] && split[key].toString().trim() !== "",
      );
      const allFilled = requiredKeys.every(
        (key) => split[key] && split[key].toString().trim() !== "",
      );

      if (hasValue && !allFilled) {
        // Clear amount and ref_id, and reference_name if credit
        return {
          ...split,
          amount: 0,
          ref_id: null,
          ...(split.type === "credit"
            ? { reference_name: "", credit_reference_type: "" }
            : {}),
        };
      }

      return split;
    });
  };

  const validateEmbeddedPayment = () => {
    if (!embedded) return true;
    if (additionalChargesFromRedux.some(row => row.value === "" || !Number.isFinite(Number(row.value)) || Number(row.value) < 0)) {
      toast.error("Enter a valid, non-negative value for each additional charge.");
      return false;
    }
    if (paymentSplits.some(split => !Number.isFinite(Number(split.amount)) || Number(split.amount) < 0)) {
      toast.error("Enter valid, non-negative payment amounts.");
      return false;
    }
    return true;
  };

  const handleSavePaymentSplit = () => {
    if (!validateEmbeddedPayment()) return;
    const validSplits = getValidPaymentSplits();
    const data = {
      changeFinalAmount: true,
      paymentSplits: validSplits,
      totalPaymentSplits: totalAmount,
    };

    dispatch(addPaymentSplits(data));
    dispatch(
      updateTotalValue({ field: "totalPaymentSplits", value: totalAmount }),
    );

    if (embedded) onSaved?.();
    else navigate(-1, { replace: true });
  };

  const handleSavePaymentSplitAndSubmit = () => {
    if (!validateEmbeddedPayment()) return;
    const validSplits = getValidPaymentSplits();
    const data = {
      changeFinalAmount: true,
      paymentSplits: validSplits,
      totalPaymentSplits: totalAmount,
    };

    dispatch(addPaymentSplits(data));
    dispatch(
      updateTotalValue({ field: "totalPaymentSplits", value: totalAmount }),
    );

    submitHandler();
  };

  // Helper function to check if amount input should be disabled
  const isAmountInputDisabled = (split) => {
    // Credit amount is always disabled (calculated automatically)
    if (split.type === "credit") {
      return true;
    }
    return !split.ref_id || split.ref_id === null;
  };

  const getVoucherNumberTitle = () => {
    if (!voucherTypeFromRedux) return "";
    if (
      voucherTypeFromRedux === "sales" ||
      voucherTypeFromRedux === "vanSale"
    ) {
      return "salesNumber";
    } else {
      return voucherTypeFromRedux + "Number";
    }
  };

  console.log(_idFromRedux);

  const enablePaymentSplittingAsCompulsory = configuredPaymentCompulsory && voucherTypeFromRedux !== "performaInvoice";

  const getApiEndPoint = () => {
    if (voucherTypeFromRedux) {
      if (modeFromRedux == "edit") {
        return voucherTypeFromRedux === "performaInvoice" ? `editPerformaInvoice/${_idFromRedux}` : `editSales/${_idFromRedux}`;
      }
      return `create${voucherTypeFromRedux
        ?.split("")[0]
        ?.toUpperCase()}${voucherTypeFromRedux?.split("")?.slice(1).join("")}`;
    } else {
      return null;
    }
  };

  const submitHandler = async () => {
    // Validation
    if (
      Object.keys(party).length === 0 &&
      voucherTypeFromRedux !== "stockTransfer"
    ) {
      toast.error("Add a party first");
      return;
    }

    if (
      voucherTypeFromRedux === "stockTransfer" &&
      Object.keys(stockTransferToGodown).length === 0
    ) {
      toast.error("Select a from godown first");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least an item");
      return;
    }

    if (!selectedVoucherSeriesFromRedux?._id) {
      toast.error(
        "Error with your voucher series. Please select a valid series.",
      );
      return;
    }

    setSubmitLoading(true);
    const voucherNumberTitle = getVoucherNumberTitle();

    let formData = {};

    const cleanedDate =
      typeof date === "string" && date.startsWith('"')
        ? JSON.parse(date) // removes extra quotes
        : date;

    const currentState = store.getState();
    const reduxData = currentState.commonVoucherSlice;

    try {
      formData = {
        selectedDate: new Date(cleanedDate).toISOString(),
        voucherType,
        [voucherNumberTitle]: voucherNumberFromRedux,
        series_id: selectedVoucherSeriesFromRedux?._id,
        usedSeriesNumber: selectedVoucherSeriesFromRedux?.currentNumber,
        orgId: cmp_id,
        selectedSaleIds: voucherType === "creditNote" ? (reduxData.selectedSaleIds || []) : [],

        /// these values are not getting latest data,so we need to take it directly form store
        finalAmount: Number(reduxData?.finalAmount?.toFixed(2) || 0),
        finalOutstandingAmount: Number(
          (reduxData?.finalOutstandingAmount ?? reduxData?.finalAmount ?? 0).toFixed(2),
        ),
        subTotal: Number(reduxData?.subTotal?.toFixed(2) || 0),
        totalPaymentSplits: Number(
          reduxData?.totalPaymentSplits?.toFixed(2) || 0,
        ),
        totalAdditionalCharges: Number(
          reduxData?.totalAdditionalCharges?.toFixed(2) || 0,
        ),
        totalWithAdditionalCharges: Number(
          reduxData?.totalWithAdditionalCharges?.toFixed(2) || 0,
        ),
        party,
        items,
        note: noteFromRedux,
        despatchDetails,
        priceLevelFromRedux,
        additionalChargesFromRedux,
        selectedGodownDetails: vanSaleGodownFromRedux,
        paymentSplittingData: getValidPaymentSplits(),
      };

      console.log(formData);

      const endPoint = getApiEndPoint();
      let params = {};
      if (voucherTypeFromRedux === "vanSale") {
        params = {
          vanSale: true,
        };
      }

      const res = await api.post(
        `/api/sUsers/${endPoint}?${new URLSearchParams(params)}`,
        formData,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );
      toast.success(res.data.message);

      if (embedded && onTransactionSaved) {
        onTransactionSaved();
      } else {
        navigate(`/sUsers/${voucherTypeFromRedux}Details/${res.data.data._id}`, {
          state: { from: location?.state?.from || "null" },
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["todaysTransaction", cmp_id, isAdmin],
      });
      // dispatch(removeAll());
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating sale");
      console.log(error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const customNavigate = () => {
    if (modeFromRedux === "create") {
      dispatch(resetPaymentSplit());
    }
    navigate(-1, { replace: true });
  };

  console.log(paymentSplittingData);

  if (voucherTypeFromRedux === "performaInvoice") {
    return <div className="p-4"><p>Proforma invoices do not receive payments.</p><button type="button" onClick={() => navigate(-1)}>Back to invoice</button></div>;
  }

  return (
    <div className={embedded ? "sales-payment-embedded" : "min-h-screen bg-gray-50 w-full"}>
      {!embedded && <TitleDiv
        title="Payment Splitting"
        loading={isLoading || submitLoading}
        customNavigate={customNavigate}
      />}
      <div className={`${isLoading && "opacity-75 animate-pulse"}`}></div>
      <div className="">
        {/* Main Card */}
        <div className="bg-gray-50 shadow-sm border border-gray-500 overflow-hidden">
          <div className="p-8">
            {/* Payment Methods */}
            <div className="space-y-1 mb-8">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-6 pb-5 border-b border-gray-300 font-bold">
                <div className="col-span-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Payment Method
                  </span>
                </div>
                <div className="col-span-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Source
                  </span>
                </div>
                <div className="col-span-4">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Amount
                  </span>
                </div>
              </div>

              {/* Payment Rows */}
              {paymentSplits?.map((split) => (
                <div
                  key={split?.type}
                  className="grid grid-cols-12 gap-6 py-5 border-b border-gray-50 last:border-b-0 hover:bg-gray-25 transition-colors duration-150"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <CircleDot size={15} className="" />
                    <span className="font-medium text-gray-900">
                      {paymentModeInfo[split?.type]?.title}
                    </span>
                  </div>

                  <div className="col-span-4 flex items-center">
                    {split.type === "credit" ? (
                      paymentSplittingData?.find(
                        (item) => item?.type == "credit",
                      )?.ref_id !== null || split.ref_id ? (
                        <span className="text-sm font-medium w-full p-2 border rounded-md border-gray-300 bg-gray-100 cursor-not-allowed">
                          {truncateText(
                            split.reference_name ||
                              paymentSplittingData?.find(
                                (item) => item?.type == "credit",
                              )?.reference_name,
                            20,
                          )}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md w-full cursor-not-allowed">
                          No Party Selected
                        </div>
                      )
                    ) : (
                      <div className="relative w-full">
                        <select
                          value={split.ref_id}
                          onChange={(e) =>
                            handleSourceChange(split.type, e.target.value)
                          }
                          className="no-focus-box w-full px-3 py-2 bg-white border rounded-md text-sm appearance-none cursor-pointer transition-all duration-200 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          disabled={isLoading}
                        >
                          <option value="">
                            {isLoading ? "Loading sources..." : "Select source"}
                          </option>
                          {getSourceOptions(split.type).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  <div className="col-span-4 flex items-center">
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={
                          split.type === "credit"
                            ? balanceAmount > 0
                              ? balanceAmount.toFixed(2)
                              : "0.00"
                            : split.amount
                        }
                        onChange={(e) =>
                          handleAmountChange(split.type, e.target.value)
                        }
                        placeholder="0.00"
                        disabled={isAmountInputDisabled(split)}
                        className={`no-focus-box w-full pl-8 pr-3 py-2 border rounded-md text-sm transition-all duration-200 ${
                          isAmountInputDisabled(split)
                            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                            : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        }`}
                        max={totalWithAdditionalCharges}
                        readOnly={split.type === "credit"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Section */}
            <div className="bg-gray-200 rounded px-6 py-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Allocated</p>
                  <p className="font-bold text-gray-900">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="font-bold text-gray-900">
                    ₹{totalWithAdditionalCharges || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Message - Only show if there's an issue with calculations */}
            {Math.abs(totalAmount - totalWithAdditionalCharges) > 0.01 && (
              <div className="p-4 rounded-lg mb-6 bg-orange-50 border border-orange-200">
                <p className="text-sm text-center text-orange-700">
                  Payment allocation updated automatically based on other
                  payment methods
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg mb-6 bg-red-50 border border-red-200">
                <p className="text-sm text-center text-red-700">
                  Error loading sources: {error.message}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="w-full">
              {enablePaymentSplittingAsCompulsory ? (
                <button
                  type="button"
                  disabled={submitLoading || (embedded && (isLoading || !!error || !party?._id || totalWithAdditionalCharges <= 0))}
                  onClick={handleSavePaymentSplitAndSubmit}
                  className={`w-full px-8 py-3 rounded-md font-medium transition-all duration-200 text-center text-white 
        bg-violet-700 hover:bg-violet-800 
        ${submitLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {modeFromRedux == "create" ? "Generate Sales" : "Edit Sales"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitLoading || (embedded && (isLoading || !!error || !party?._id || totalWithAdditionalCharges <= 0))}
                  onClick={handleSavePaymentSplit}
                  className={`w-full px-8 py-3 rounded-md font-medium transition-all duration-200 text-center text-white 
        bg-pink-500 hover:bg-pink-600 
        ${submitLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Save Payment Split
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSplitting;
