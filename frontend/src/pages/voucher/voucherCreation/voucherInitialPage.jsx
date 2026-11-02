import { salesReturnDisplayItems, salesTransactionSubmission } from "./salesReturnDraft";
import SalesCustomerImport from "./SalesCustomerImport";
import CreditNotePartySales from "./CreditNotePartySales";
import { voucherCancelEndpoint } from "../../../../utils/voucherEndpoints";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/api";
import {
  removeAll,
  removeItem,
  removeGodownOrBatch,
  changeDate,
  removeParty,
  addVoucherType,
  addAllAdditionalCharges,
  addVansSaleGodown,
  addVoucherSeries,
  addNote,
  addIsNoteOpen,
  updateTotalValue,
  resetPaymentSplit,
  addPaymentSplits,
  addMode,
  addVoucherNumber,
  addParty,
  setItem,
  setSalesReturnNotes,
  setAdditionalCharges,
  setPriceLevel,
  addDespatchDetails,
  saveId,
  addSelectedVoucherSeries,
} from "../../../../slices/voucherSlices/commonVoucherSlice";
import DespatchDetails from "./DespatchDetails";
import HeaderTile from "./HeaderTile";
import AddPartyTile from "./AddPartyTile";
import DesktopPartySearch from "./DesktopPartySearch";
import DesktopPriceLevel from "./DesktopPriceLevel";
import { Home } from "lucide-react";
import AddItemTile from "./AddItemTile";
import FooterButton from "./FooterButton";
import TitleDiv from "../../../components/common/TitleDiv";
import AdditionalChargesTile from "./AdditionalChargesTile";
import { formatVoucherType } from "../../../../utils/formatVoucherType";
import AddGodownTile from "./AddGodownTile";
import AddNoteTile from "./AddNoteTile";
import { useQueryClient } from "@tanstack/react-query";
import ReceiveAmount from "./ReceiveAmount";
import { DesktopSalesItems, DesktopSalesTotals, DesktopRecentSales } from "./DesktopSalesPanels";
import "./desktopSales.css";
import DesktopSalesOptions from "./DesktopSalesOptions";

const formatVoucherSeriesNumber = (series) => {
  if (!series) return "";

  const currentNumber = Number(series.currentNumber ?? 1);
  const width = Math.max(1, Number(series.widthOfNumericalPart) || 1);
  const paddedNumber = String(Number.isFinite(currentNumber) ? currentNumber : 1).padStart(width, "0");

  return `${series.prefix || ""}${paddedNumber}${series.suffix || ""}`;
};

function VoucherInitialPage() {
  const [optionsTab, setOptionsTab] = useState(null);
  const [recentSalesVersion, setRecentSalesVersion] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useRef(true);
  const salesSubmissionRef = useRef(null);
  const transactionSavingRef = useRef(false);
  const [lastSavedTransaction, setLastSavedTransaction] = useState(null);
  const queryClient = useQueryClient();
  const [desktopViewport, setDesktopViewport] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktopViewport(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  //// check if the user is admin
  const isAdmin =
    JSON.parse(localStorage.getItem("sUserData")).role === "admin"
      ? true
      : false;

  // to find the current voucher
  const getVoucherType = () => {
    if (voucherTypeFromRedux) return;
    /// if the voucherType is not present in redux then we will take it from the location state
    /// voucher type is assigned from the select voucher page to this page
    let currentVoucher = location.pathname.toLowerCase().includes("performainvoice") ? "performaInvoice" : "sales";
    if (location && location.state && location.state.voucherType) {
      currentVoucher = location.state.voucherType;
    }
    dispatch(addVoucherType(currentVoucher));
  };

  /// to get voucher number name

  const getVoucherNumberTitle = () => {
    if (!voucherTypeFromRedux) return "";
    if (
      voucherTypeFromRedux === "sales" ||
      voucherTypeFromRedux === "vanSale" || voucherTypeFromRedux === "performaInvoice"
    ) {
      return "salesNumber";
    } else {
      return voucherTypeFromRedux + "Number";
    }
  };

  // Redux selectors
  const { _id: cmp_id, configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg
  );

  const { enablePaymentSplittingAsCompulsory = false } = configurations[0];





  const {
    date,
    party,
    items,
    despatchDetails,
    voucherType,
    selectedPriceLevel: priceLevelFromRedux = "",
    voucherType: voucherTypeFromRedux,
    voucherNumber: voucherNumberFromRedux,
    allAdditionalCharges: allAdditionalChargesFromRedux,
    finalAmount: totalAmount,
    subTotal: subTotalFromRedux,
    totalAdditionalCharges: totalAdditionalChargesFromRedux,
    totalWithAdditionalCharges: totalWithAdditionalChargesFromRedux,
    totalPaymentSplits: totalPaymentSplitsFromRedux,
    finalOutstandingAmount: finalOutstandingAmountFromRedux,
    vanSaleGodown: vanSaleGodownFromRedux,
    additionalCharges: additionalChargesFromRedux = [],
    convertedFrom = [],
    selectedSaleIds = [],
    salesReturnNotes = [],
    stockTransferToGodown,
    mode,
    voucherSeries: voucherSeriesFromRedux,
    selectedVoucherSeries: selectedVoucherSeriesFromRedux,
    note: noteFromRedux,
    isNoteOpen: isNoteOpenFromRedux,
    paymentSplittingData: paymentSplittingDataFromRedux,
    id: idFromRedux,
  } = useSelector((state) => state.commonVoucherSlice);

  const displayItems = useMemo(() => voucherTypeFromRedux === "sales"
    ? salesReturnDisplayItems(items, salesReturnNotes, party?._id) : items,
  [items, salesReturnNotes, party?._id, voucherTypeFromRedux]);

  const getApiEndPoint = () => {
    if (voucherTypeFromRedux) {
      if (mode === "edit" && idFromRedux) return `edit${voucherTypeFromRedux?.split("")[0]?.toUpperCase()}${voucherTypeFromRedux?.slice(1)}/${idFromRedux}`;
      return `create${voucherTypeFromRedux
        ?.split("")[0]
        ?.toUpperCase()}${voucherTypeFromRedux?.split("")?.slice(1).join("")}`;
    } else {
      return null;
    }
  };

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(
    additionalChargesFromRedux.length > 0
  );
  const [voucherNumber, setVoucherNumber] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  });

  const [openAdditionalTile, setOpenAdditionalTile] = useState(false);

  useEffect(() => {
    if (voucherNumberFromRedux) setVoucherNumber(voucherNumberFromRedux);
  }, [voucherNumberFromRedux]);

  // Calculated values
  const subTotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
  }, [items]);

  useEffect(() => {
    dispatch(updateTotalValue({ field: "subTotal", value: subTotal }));
  }, [subTotal]);

  // API calls wrapped in promises
 const fetchData = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous calls
    setIsLoading(true);

    try {
      // Initialize API requests container with names
      const apiRequests = {};

      // Additional Charges
      let additionalCharges = allAdditionalChargesFromRedux;
      if (additionalCharges.length === 0) {
        apiRequests.additionalChargesRequest = await api.get(
          `/api/sUsers/additionalcharges/${cmp_id}`,
          { withCredentials: true }
        );
      }

      // Configuration Number
      if (voucherSeriesFromRedux === null && voucherTypeFromRedux) {
        apiRequests.configNumberRequest = await api.get(
          `/api/sUsers/getSeriesByVoucher/${cmp_id}?voucherType=${voucherTypeFromRedux}&restrict=true`,
          { withCredentials: true }
        );
      } else {
        if (isMounted.current) {
          setVoucherNumber(voucherNumberFromRedux);
        }
      }

      // Add godownsName API call if voucher type is 'vanSale'
      if (
        voucherType === "vanSale" &&
        Object.keys(vanSaleGodownFromRedux).length === 0
      ) {
        apiRequests.godownsRequest = api.get(
          `/api/sUsers/godownsName/${cmp_id}`,
          { withCredentials: true }
        );
      }

      // Execute all API requests in parallel
      const responseData = await Promise.all(Object.values(apiRequests));

      // Map responses back to their request names
      const responses = {};
      Object.keys(apiRequests).forEach((key, index) => {
        responses[key] = responseData[index];
      });

      // Process Additional Charges
      if (responses.additionalChargesRequest && isMounted.current) {
        additionalCharges =
          responses.additionalChargesRequest.data?.additionalCharges || [];
        dispatch(addAllAdditionalCharges(additionalCharges));
      }

      // Process Configuration Number
      if (responses.configNumberRequest) {
        const configData = responses.configNumberRequest.data;

        if (isMounted.current && voucherSeriesFromRedux === null) {
          const availableSeries = Array.isArray(configData?.series)
            ? configData.series
            : [];
          const initialSeries =
            availableSeries.find((series) => series.currentlySelected === true) ||
            availableSeries[0];

          dispatch(addVoucherSeries(availableSeries));

          // Select the initial series here, instead of waiting for the modal
          // to mount. This makes the voucher series and number available in
          // the desktop header as soon as the page loads.
          if (initialSeries && !(mode === "edit" && selectedVoucherSeriesFromRedux?._id)) {
            const initialNumber = formatVoucherSeriesNumber(initialSeries);
            dispatch(addSelectedVoucherSeries(initialSeries));
            dispatch(addVoucherNumber(initialNumber));
            setVoucherNumber(initialNumber);
          }
        }
      }

      // Process Godowns data if requested
      if (
        responses.godownsRequest &&
        voucherTypeFromRedux === "vanSale" &&
        Object.keys(vanSaleGodownFromRedux).length === 0 &&
        isMounted.current
      ) {
        const godownsData = responses.godownsRequest.data;

        if (godownsData?.data?.length === 0) {
          navigate("/sUsers/selectVouchers", { replace: true });
          toast.error("No godown is configured");
          return;
        }
        dispatch(addVansSaleGodown(godownsData?.data || {}));
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Error fetching data");
    } finally {
      setIsLoading(false);
    }
  }, [cmp_id, voucherTypeFromRedux, allAdditionalChargesFromRedux, voucherSeriesFromRedux, voucherNumberFromRedux]);

  // Initialize component
  useEffect(() => {
     getVoucherType();

    if (!date) dispatch(changeDate(JSON.stringify(selectedDate)));
    localStorage.removeItem("scrollPositionAddItemSales");
    fetchData();
  }, [fetchData]);

  //// cleanup function for isMounted

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Navigation and form handlers
  const handleAddItem = () => {
    if (
      Object.keys(party).length === 0 &&
      voucherTypeFromRedux !== "stockTransfer"
    ) {
      toast.error("Select a party first");
      return;
    } else if (
      voucherTypeFromRedux === "stockTransfer" &&
      Object.keys(stockTransferToGodown).length === 0
    ) {
      toast.error("Select a from godown first");
      return;
    }
    dispatch(resetPaymentSplit());
    navigate("/sUsers/addItemSales");
  };

  const handleDesktopTransactionSaved = () => {
    setOptionsTab(null);
    setOpenAdditionalTile(false);
    dispatch(removeAll());
    dispatch(addVoucherType(voucherTypeFromRedux));
    dispatch(changeDate(JSON.stringify(selectedDate)));
    setVoucherNumber("");
    setRecentSalesVersion(version => version + 1);
    queryClient.invalidateQueries({ queryKey: ["todaysTransaction", cmp_id, isAdmin] });
    queryClient.invalidateQueries({ queryKey: ["desktop-sale-products", cmp_id] });
  };

  const handleDesktopReceivedAmount = ({ cash, upi, cheque, cashSource, upiSource, chequeSource }) => {
    const received = Math.min(Math.max((Number(cash) || 0) + (Number(upi) || 0) + (Number(cheque) || 0), 0), Number(totalAmount) || 0);
    const balance = Math.max((Number(totalAmount) || 0) - received, 0);
    dispatch(addPaymentSplits({
      changeFinalAmount: true,
      totalPaymentSplits: received + balance,
      paymentSplits: [
        { type: "cash", amount: Number(cash) || 0, ref_id: cashSource || null, ref_collection: "Cash" },
        { type: "upi", amount: Number(upi) || 0, ref_id: upiSource || null, ref_collection: "BankDetails" },
        { type: "cheque", amount: Number(cheque) || 0, ref_id: chequeSource || null, ref_collection: "BankDetails" },
        { type: "credit", amount: balance, ref_id: party?._id || null, ref_collection: "Party", reference_name: party?.partyName || party?.name || "", credit_reference_type: party?.partyType || "" },
      ],
    }));
  };

  const loadDesktopTransactionForEdit = async (transaction) => {
    const isPurchase = voucherTypeFromRedux === "purchase";
    const isCreditNote = voucherTypeFromRedux === "creditNote";
    const isSaleOrder = voucherTypeFromRedux === "saleOrder";
    const isProforma = voucherTypeFromRedux === "performaInvoice";
    const isDebitNote = voucherTypeFromRedux === "debitNote";
    const transactionName = isPurchase ? "purchase" : isCreditNote ? "credit note" : isDebitNote ? "debit note" : isSaleOrder ? "sale order" : isProforma ? "proforma invoice" : "sale";
    try {
      setIsLoading(true);
      const response = await api.get(`/api/sUsers/${isPurchase ? "getPurchaseDetails" : isCreditNote ? "getCreditNoteDetails" : isDebitNote ? "getDebitNoteDetails" : isSaleOrder ? "getSaleOrderDetails" : isProforma ? "getPerformaInvoiceDetails" : "getSalesDetails"}/${transaction._id}`, { withCredentials: true });
      const data = response.data.data;
      if (data.isCancelled || data.isEditable === false) {
        toast.error(data.isEditable === false ? `This ${transactionName} has payments applied and cannot be edited.` : `Cancelled ${transactionName}s cannot be edited.`);
        return;
      }
      const documentNumber = data.purchaseNumber || data.creditNoteNumber || data.debitNoteNumber || data.orderNumber || data.salesNumber || "";
      dispatch(removeAll());
      dispatch(addVoucherType(isPurchase ? "purchase" : isCreditNote ? "creditNote" : isDebitNote ? "debitNote" : isSaleOrder ? "saleOrder" : isProforma ? "performaInvoice" : "sales"));
      dispatch(addMode("edit"));
      dispatch(saveId(data._id));
      dispatch(addVoucherNumber(documentNumber));
      dispatch(changeDate(JSON.stringify(new Date(data.date))));
      dispatch(addParty(data.party || {}));
      dispatch(setItem(data.items || []));
      dispatch(setPriceLevel(data.selectedPriceLevel || ""));
      dispatch(setAdditionalCharges(data.additionalCharges || []));
      dispatch(addDespatchDetails(data.despatchDetails || {}));
      dispatch(addNote(data.note || null));
      dispatch(addPaymentSplits({
        changeFinalAmount: true,
        paymentSplits: data.paymentSplittingData || [],
        totalPaymentSplits: (data.paymentSplittingData || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      }));
      if (data.seriesDetails) dispatch(addSelectedVoucherSeries(data.seriesDetails));
      setVoucherNumber(documentNumber);
      setSelectedDate(new Date(data.date));
      toast.success(`Editing ${transactionName} ${documentNumber}`);
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to load ${transactionName} for editing.`);
    } finally {
      setIsLoading(false);
    }
  };
  const cancelDesktopTransaction = async () => {
    if (!idFromRedux) return;
    const transactionName = voucherTypeFromRedux === "performaInvoice" ? "proforma invoice" : voucherTypeFromRedux === "purchase" ? "purchase" : voucherTypeFromRedux === "creditNote" ? "credit note" : voucherTypeFromRedux === "debitNote" ? "debit note" : "sale";
    const cancelEndpoint = voucherCancelEndpoint(voucherTypeFromRedux);
    if (!window.confirm(voucherTypeFromRedux === "performaInvoice" ? "Cancel this proforma invoice?" : `Cancel this ${transactionName}? Stock and outstanding balance will be reversed.`)) return;
    try {
      setSubmitLoading(true);
      const response = await api.put(`/api/sUsers/${cancelEndpoint}/${idFromRedux}`, { cancelReason: `Cancelled from desktop ${transactionName}` }, { withCredentials: true });
      toast.success(response.data.message || `${transactionName[0].toUpperCase()}${transactionName.slice(1)} cancelled.`);
      handleDesktopTransactionSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to cancel ${transactionName}.`);
    } finally {
      setSubmitLoading(false);
    }
  };
  const submitHandler = async () => {
    if (transactionSavingRef.current) return;
    const pendingReturns = voucherTypeFromRedux === "sales" ? salesReturnNotes.filter(note => note.status === "pending") : [];
    const combinedSalesSave = voucherTypeFromRedux === "sales" && mode !== "edit";
    if (pendingReturns.length && !combinedSalesSave) {
      toast.error("Add returns when creating a new sale, rather than editing an existing sale.");
      return;
    }
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

    if (items.length === 0 && !pendingReturns.length) {
      toast.error("Add at least an item");
      return;
    }

    if (items.length > 0 && !selectedVoucherSeriesFromRedux?._id) {
      toast.error(
        "Error with your voucher series. Please select a valid series."
      );
      return;
    }

    if (openAdditionalTile && items.length > 0) {
      const hasEmptyValue = additionalChargesFromRedux.some(
        (row) => row.value === ""
      );
      if (hasEmptyValue) {
        toast.error("Please add a value.");
        setSubmitLoading(false);
        return;
      }
      const hasNagetiveValue = additionalChargesFromRedux.some(
        (row) => parseFloat(row.value) < 0
      );
      if (hasNagetiveValue) {
        toast.error("Please add a positive value");
        setSubmitLoading(false);

        return;
      }
    }

    transactionSavingRef.current = true;
    setSubmitLoading(true);
    const voucherNumberTitle = getVoucherNumberTitle();

    let formData = {};

    try {
      if (voucherTypeFromRedux === "stockTransfer") {
        formData = {
          selectedDate: new Date(selectedDate).toISOString(),
          voucherType,
          series_id: selectedVoucherSeriesFromRedux?._id,
          usedSeriesNumber: selectedVoucherSeriesFromRedux?.currentNumber,
          orgId: cmp_id,
          [voucherNumberTitle]: voucherNumber,
          stockTransferToGodown,
          items,
          finalAmount: 0,
          note: noteFromRedux,
        };
      } else {
        formData = {
          selectedDate: new Date(selectedDate).toISOString(),
          voucherType,
          [voucherNumberTitle]: voucherNumber,
          series_id: selectedVoucherSeriesFromRedux?._id,
          usedSeriesNumber: selectedVoucherSeriesFromRedux?.currentNumber,
          orgId: cmp_id,
          selectedSaleIds: voucherType === "creditNote" ? selectedSaleIds : [],
          finalAmount: Number(totalAmount.toFixed(2)),
          finalOutstandingAmount: Number((finalOutstandingAmountFromRedux ?? totalAmount).toFixed(2)),
          subTotal: Number(subTotalFromRedux.toFixed(2)),
          totalAdditionalCharges: Number(totalAdditionalChargesFromRedux.toFixed(2)),
          totalWithAdditionalCharges: Number(totalWithAdditionalChargesFromRedux.toFixed(2)),
          totalPaymentSplits: voucherTypeFromRedux === "performaInvoice" ? 0 : Number(totalPaymentSplitsFromRedux.toFixed(2)),
          party,
          items,
          note: noteFromRedux,
          despatchDetails,
          priceLevelFromRedux,
          additionalChargesFromRedux,
          selectedGodownDetails: vanSaleGodownFromRedux,
          paymentSplittingData: voucherTypeFromRedux === "performaInvoice" ? [] : paymentSplittingDataFromRedux,
        };
      }

      // console.log(formData);

      const endPoint = combinedSalesSave ? "createSalesTransaction" : getApiEndPoint();
      if (combinedSalesSave) {
        salesSubmissionRef.current = salesTransactionSubmission(formData, salesReturnNotes, salesSubmissionRef.current);
        formData = salesSubmissionRef.current.payload;
      }
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
        }
      );

      toast.success(res.data.message);
      if (combinedSalesSave) {
        const result = res.data.data;
        const savedNotes = salesReturnNotes.filter(note => note.status === "saved");
        if (result.creditNote) savedNotes.push({ key: formData.transactionId, partyId: party._id, status: "saved", id: result.creditNote._id, number: result.creditNote.creditNoteNumber, items: pendingReturns.flatMap(note => note.items) });
        handleDesktopTransactionSaved();
        if (savedNotes.length) { dispatch(addParty(party)); dispatch(setSalesReturnNotes(savedNotes)); }
        setLastSavedTransaction(result);
        salesSubmissionRef.current = null;
      } else if (desktopSales) {
        handleDesktopTransactionSaved();
      } else {
        navigate(`/sUsers/${voucherTypeFromRedux}Details/${res.data.data._id}`, {
          state: { from: location?.state?.from || "null" },
        });
        dispatch(removeAll());
      }
      queryClient.invalidateQueries({
        queryKey: ["todaysTransaction", cmp_id, isAdmin],
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating sale");
      console.log(error);
    } finally {
      transactionSavingRef.current = false;
      setSubmitLoading(false);
    }
  };

  const desktopSales = desktopViewport && ["sales", "purchase", "creditNote", "debitNote", "saleOrder", "performaInvoice"].includes(voucherTypeFromRedux);

  return (
    <div className={`mb-14 sm:mb-0 ${voucherTypeFromRedux === "performaInvoice" ? "proforma-invoice" : ""} ${desktopSales ? `desktop-sales ${["purchase", "debitNote"].includes(voucherTypeFromRedux) ? "desktop-purchase" : ""}` : ""}`}>
      <div className="flex-1 bg-slate-100 h -screen ">
        <TitleDiv
          title={desktopSales ? `${mode === "edit" ? "Edit" : "New"} ${formatVoucherType(voucherTypeFromRedux)}` : formatVoucherType(voucherTypeFromRedux)}
          rightSideContent={desktopSales ? <span className="flex items-center gap-2"><Home size={20} aria-hidden="true" />Home</span> : null}
          rightSideContentOnClick={desktopSales ? () => navigate("/sUsers/dashboard") : null}
          // from={`/sUsers/selectVouchers`}
          loading={isLoading || submitLoading}
        />

        <div className={`sales-workspace ${isLoading || submitLoading ? "pointer-events-none opacity-70" : ""}`}>
          <div className="sales-form">
          {/* invoiec date */}

          <div className="sales-header"><HeaderTile
            title={formatVoucherType(voucherTypeFromRedux)}
            number={voucherNumber || voucherNumberFromRedux || "—"}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dispatch={dispatch}
            changeDate={changeDate}
            submitHandler={submitHandler}
            removeAll={removeAll}
            tab="add"
            isLoading={submitLoading}
            mode={mode}
            selectedVoucherSeriesFromRedux={
              selectedVoucherSeriesFromRedux || {}
            }
            enablePaymentSplittingAsCompulsory={
              enablePaymentSplittingAsCompulsory
            }
            openAdditionalTile={openAdditionalTile}
          /></div>
          {/* adding party */}

          <div className="sales-party">
          {voucherTypeFromRedux === "stockTransfer" ? (
            <AddGodownTile />
          ) : desktopSales ? (
            <DesktopPartySearch cmpId={cmp_id} party={party} locked={convertedFrom.length > 0} voucherType={voucherTypeFromRedux} />
          ) : (
            <AddPartyTile
              party={party}
              dispatch={dispatch}
              removeParty={removeParty}
              link={`/sUsers/searchParty${voucherTypeFromRedux}`}
              linkBillTo="/sUsers/billToSales"
              convertedFrom={convertedFrom}
            />
          )}
          {desktopSales && ["sales", "creditNote", "saleOrder", "performaInvoice"].includes(voucherTypeFromRedux) && <div className="sales-party-values"><DesktopPriceLevel cmpId={cmp_id} locked={convertedFrom.length > 0} /></div>}
          {voucherTypeFromRedux === "sales" && lastSavedTransaction && <p className="sales-transaction-result" role="status">
            Last saved: {[lastSavedTransaction.sale && `Sale ${lastSavedTransaction.sale.salesNumber}`, lastSavedTransaction.creditNote && `Credit Note ${lastSavedTransaction.creditNote.creditNoteNumber}`].filter(Boolean).join(" · ")}
            {(lastSavedTransaction.receipts || []).map(receipt => ` · Receipt ${receipt.receiptNumber} (₹ ${Number(receipt.enteredAmount).toFixed(2)})`).join("")}
            {" · Sale outstanding ₹ "}{Number(lastSavedTransaction.outstanding?.sale || 0).toFixed(2)}
            {lastSavedTransaction.creditNote && ` · Remaining credit ₹ ${Math.abs(Number(lastSavedTransaction.outstanding?.creditNote || 0)).toFixed(2)}`}
          </p>}
          </div>

          {!desktopSales && voucherTypeFromRedux === "sales" && party?._id && <SalesCustomerImport key={`${cmp_id}:${party._id}`} cmpId={cmp_id} party={party} locked={convertedFrom.length > 0} />}

          {!desktopSales && voucherTypeFromRedux === "creditNote" && party?._id && <CreditNotePartySales key={party?._id || "none"} cmpId={cmp_id} party={party} locked={convertedFrom.length > 0} />}

          {/* Despatch details */}

          {!desktopSales && voucherTypeFromRedux !== "stockTransfer" && (
            <DespatchDetails tab={"sales"} />
          )}

          {/* adding items */}

          {desktopSales ? <DesktopSalesItems items={displayItems} convertedFrom={convertedFrom} voucherType={voucherTypeFromRedux} /> : <AddItemTile
            items={displayItems}
            handleAddItem={handleAddItem}
            dispatch={dispatch}
            removeItem={removeItem}
            removeGodownOrBatch={removeGodownOrBatch}
            navigate={navigate}
            godownname={""}
            subTotal={subTotal}
            type="sale"
            convertedFrom={convertedFrom}
            urlToAddItem="/sUsers/addItemSales"
            urlToEditItem="/sUsers/editItemVoucher"
          />}

          {desktopSales ? <DesktopSalesOptions
            tab={optionsTab} onTabChange={setOptionsTab}
            onTransactionSaved={handleDesktopTransactionSaved}
            openAdditionalTile={openAdditionalTile} setOpenAdditionalTile={setOpenAdditionalTile}
          /> : (<>          <div className={desktopSales ? "sales-options" : undefined}>
          <details open={desktopSales ? undefined : true}>
          <summary className={desktopSales ? "sales-options-toggle" : "hidden"}>More options · Charges, payment, despatch and note</summary>
          <div className={desktopSales ? "sales-options-content" : undefined}>

          <AdditionalChargesTile
            type={"sale"}
            subTotal={subTotal}
            setOpenAdditionalTile={setOpenAdditionalTile}
            openAdditionalTile={openAdditionalTile}
          />

          {/* we will show receive amount section as button at header and footer if it is compulsory */}

          {!["performaInvoice", "creditNote"].includes(voucherTypeFromRedux) && totalAmount > 0 && !enablePaymentSplittingAsCompulsory && (
            <ReceiveAmount />
          )}

          <AddNoteTile
            noteFromRedux={noteFromRedux}
            isNoteOpenFromRedux={isNoteOpenFromRedux}
            addNote={addNote}
            addIsNoteOpen={addIsNoteOpen}
          />
          </div>
          </details>
          </div></>)}

          {desktopSales ? <DesktopSalesTotals allowReceivePayment={!["performaInvoice", "creditNote"].includes(voucherTypeFromRedux)} onEditCharges={() => setOptionsTab("charges")} onOpenOptions={() => setOptionsTab("charges")} onApplyReceived={handleDesktopReceivedAmount} subtotal={subTotal} charges={totalAdditionalChargesFromRedux} total={totalAmount} received={{ cash: Number((paymentSplittingDataFromRedux || []).find(payment => payment.type === "cash")?.amount || 0), cashSource: (paymentSplittingDataFromRedux || []).find(payment => payment.type === "cash")?.ref_id || "", upi: Number((paymentSplittingDataFromRedux || []).find(payment => payment.type === "upi")?.amount || 0), upiSource: (paymentSplittingDataFromRedux || []).find(payment => payment.type === "upi")?.ref_id || "", cheque: Number((paymentSplittingDataFromRedux || []).find(payment => payment.type === "cheque")?.amount || 0), chequeSource: (paymentSplittingDataFromRedux || []).find(payment => payment.type === "cheque")?.ref_id || "" }} balance={Math.max(Number(totalAmount || 0) - (paymentSplittingDataFromRedux || []).filter(payment => payment.type !== "credit").reduce((sum, payment) => sum + Number(payment.amount || 0), 0), 0)} /> : <div className="flex justify-between items-center bg-white mt-2 p-3">
            <p className="font-bold text-md">Total Amount</p>
            <div className="flex flex-col items-center">
              <p className="font-bold text-md">
                ₹ {totalAmount.toFixed(2) ?? 0}
              </p>
              <p className="text-[9px] text-gray-400">(rounded)</p>
            </div>
          </div>}

          <div className="sales-footer">
          {desktopSales && <button type="button" className="sales-cancel" disabled={submitLoading} onClick={mode === "edit" && idFromRedux ? cancelDesktopTransaction : () => dispatch(removeAll())}>{mode === "edit" && idFromRedux ? `× Cancel ${formatVoucherType(voucherTypeFromRedux)}` : "× Clear"}</button>}
          <FooterButton
            submitHandler={submitHandler}
            title={formatVoucherType(voucherTypeFromRedux)}
            isLoading={submitLoading || isLoading}
            mode={mode}
            enablePaymentSplittingAsCompulsory={
              enablePaymentSplittingAsCompulsory
            }
            openAdditionalTile={openAdditionalTile}
            onReceivePayment={desktopSales && !["performaInvoice", "creditNote"].includes(voucherTypeFromRedux) ? () => setOptionsTab("payment") : undefined}
            desktopLabel={desktopSales ? (mode === "edit" ? "Update Transaction" : "Save Transaction") : undefined}
            loading={desktopSales ? submitLoading || isLoading : undefined}
          />
          </div>
          </div>
          {(desktopSales || voucherTypeFromRedux === "performaInvoice") && <DesktopRecentSales key={recentSalesVersion} cmpId={cmp_id} isAdmin={isAdmin} voucherType={voucherTypeFromRedux} onEdit={loadDesktopTransactionForEdit} />}
        </div>
      </div>
    </div>
  );
}

export default VoucherInitialPage;
