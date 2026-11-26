import TouchKeyboardScope from "@/components/common/touchKeyboard/TouchKeyboardScope";
import TouchInput from "@/components/common/touchKeyboard/TouchInput";
import { useState, useEffect, useCallback, useRef } from "react";
import dayjs from "dayjs";
import useFetch from "@/customHook/useFetch";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import PrintModal from "@/pages/Hotel/Components/PrintModal";
import { IoIosArrowRoundBack } from "react-icons/io";
import ItemSelector from "../components/ItemSelector";
import { useQuery } from "@tanstack/react-query";
import { makeItemComplimentary } from "../../Hotel/Helper/hotelHelper";
import {
  MdDescription,
  MdAccessTime,
  MdList,
  MdAdd,
  MdInbox,
  MdRefresh,
  MdVisibility,
  MdPrint,
  MdCheckCircle,
  MdPayment,
  MdCancel,
  MdClose,
} from "react-icons/md";
import api from "@/api/api";

import { motion, AnimatePresence } from "framer-motion";

import { Check, CreditCard, X, Banknote, Plus } from "lucide-react";
import { generateAndPrintKOT } from "@/pages/Restuarant/Helper/kotPrintHelper";
import { useNavigate } from "react-router-dom";
// import VoucherPdf from "@/pages/voucher/voucherPdf/indian/VoucherPdf";
import { toast } from "react-toastify";
import { FaRegEdit } from "react-icons/fa";
import VoucherThreeInchPdf from "@/pages/voucher/voucherPdf/threeInchPdf/VoucherThreeInchPdf";
import VoucherThreeInchPdfFormat2 from "@/pages/voucher/voucherPdf/threeInchPdf/VoucherThreeInchPdfFormat2";
import { useReactToPrint } from "react-to-print";
import CustomerSearchInputBox from "@/pages/Hotel/Components/CustomerSearchInPutBox";
import KitchenBatchesViewForPrintAndEdit from "../components/KitchenBatchesViewForPrintAndEdit";
import { setKotDate } from "../../../../slices/dateSlice";
const OrdersDashboard = () => {
  const contentToPrint = useRef(null);
  const dispatch = useDispatch();
  const [activeFilter, setActiveFilter] = useState("ON PROCESS");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState("reception");
  const [orders, setOrders] = useState([]);
  const [loader, setLoader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [allAdditionalChargesFromRedux, setAllAdditionalChargesFromRedux] =
    useState([]);
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [selectedDiscountCharge, setSelectedDiscountCharge] = useState(null);
  const [billFormat, setBillFormat] = useState("format1");
  const [note, setNote] = useState("");
  const [selectedSaleDate, setSelectedSaleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [saveLoader, setSaveLoader] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedDataForPayment, setSelectedDataForPayment] = useState({});
  const kotPageDate = useSelector((state) => state.selectedDate.kotPageDate);

  const { start, end, autoFetch } = kotPageDate;
  const [selectedDate, setSelectedDate] = useState(
    end || dayjs().format("YYYY-MM-DD"),
  );
  const [selectedFromDate, setSelectedFromDate] = useState(
    start || dayjs().format("YYYY-MM-DD"),
  );
  const [paymentMode, setPaymentMode] = useState("single"); // "single" or "split"
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [paymentError, setPaymentError] = useState("");
  const [selectedCash, setSelectedCash] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedCreditor, setSelectedCreditor] = useState("");
  const [cashOrBank, setCashOrBank] = useState({});
  const [selectedKot, setSelectedKot] = useState([]);
  const [saleVoucherData, setSaleVoucherData] = useState();
  const [showVoucherPdf, setShowVoucherPdf] = useState(false);
  const [previewForSales, setPreviewForSales] = useState(null);
  const [conformationModal, setConformationModal] = useState(false);
  const [isPostToRoom, setIsPostToRooms] = useState(false);
  const location = useLocation();
  const selectedKotFromRedirect = location.state?.selectedKot;
  const fromTable = location.state?.fromTable ?? false;
  const [showKotNotification, setShowKotNotification] = useState(fromTable);
  const [specificSelectedKotItemWise, setSpecificSelectedKotItemWise] =
    useState(null);
  // state used for showing pdf print

  const [salePrintData, setSalePrintData] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  // const [cancelledKots, setCancelledKots] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  const [discountAmount, setDiscountAmount] = useState(0);
  // const [discountCharge, setDiscountCharge] = useState(null);

  const [discountType, setDiscountType] = useState("amount"); // "amount" or "percentage"
  const [discountValue, setDiscountValue] = useState(0);
  const [isForComp, setIsForComp] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [selectedAdditionalChargeData, setSelectedAdditionalChargeData] =
    useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showBatchWiseKotPrint, setShowBatchWiseKotPrint] = useState(false);
  const [dataForBatchWisePrint, setDataForBatchWisePrint] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [isSpecific, setIsSpecific] = useState(false);
  const [splitPaymentRows, setSplitPaymentRows] = useState([
    { source: "", subSource: "", type: "", amount: "", remarks: "", refNo: "" },
  ]);
const permission = useSelector((state) => state.permissionData?.permissions); 
  const secondaryUserRole =
    JSON.parse(localStorage.getItem("sUserData"))?.role || "user";
 const [cancelReload, setCancelReload] = useState(false);
  const addSplitPaymentRow = () =>
    setSplitPaymentRows((prev) => [
      ...prev,
      { source: "", amount: "", remarks: "", refNo: "" },
    ]);

  

  const removeSplitPaymentRow = (index) =>
    setSplitPaymentRows((prev) => prev.filter((_, i) => i !== index));

  const updateSplitPaymentRow = (index, field, value) => {
    if (value == "credit") {
      setSplitPaymentRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? { ...row, [field]: value, type: "credit", subSource: "credit" }
            : row,
        ),
      );
    } else if (field == "source") {
      let specificSource = combinedSources.find((s) => s.id == value);
      setSplitPaymentRows((prev) =>
        prev.map((row, i) =>
          i === index
            ? {
                ...row,
                [field]: value,
                type: specificSource.type,
                subSource: specificSource.subSource,
              }
            : row,
        ),
      );
    } else {
      setSplitPaymentRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      );
    }
  };
  const toggleExpand = (id) =>
    setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));

  // const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { _id: cmp_id, name: companyName } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const org = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const discountBasedOnGrossAmount =
    org?.configurations?.[0]?.discountBasedOnGrossAmount ?? false;
  const complementaryWithTax =
    org?.configurations?.[0]?.complementaryWithTax ?? false;
  const queryClient = useQueryClient(); // ✅ uncomment/move this to here
  const params = new URLSearchParams({
    date: selectedDate,
    fromDate: selectedFromDate,
  });

  useEffect(() => {
    if (autoFetch && cmp_id) {
      queryKey: (["kotDash", cmp_id, selectedDate, selectedFromDate],
        dispatch(
          setKotDate({
            autoFetch: true,
            start: start,
            end: end,
          }),
        ));
    }
  }, [autoFetch, cmp_id]);

  const { data, refetch: refreshHook } = useQuery({
    queryKey: ["kotDash", cmp_id, selectedDate, selectedFromDate],

    queryFn: async () => {
      const res = await api.get(
        `/api/sUsers/getKotDataDash/${cmp_id}?${params.toString()}`,
        { withCredentials: true },
      );
      return res.data;
    },
    staleTime: 5000,
    enabled: !!cmp_id,
  });

  const fetchData = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // ✅ FIXED - Safe array handling
      let additionalChargesResponse = Array.isArray(
        allAdditionalChargesFromRedux,
      )
        ? allAdditionalChargesFromRedux
        : [];

      if (additionalChargesResponse.length === 0) {
        const response = await api.get(
          `/api/sUsers/additionalcharges/${cmp_id}`,
          {
            withCredentials: true,
          },
        );
        additionalChargesResponse = Array.isArray(
          response.data.additionalCharges,
        )
          ? response.data.additionalCharges
          : Array.isArray(response.data)
            ? response.data
            : [];
        const discountCharges = additionalChargesResponse.filter((charge) =>
          charge.name?.toLowerCase().includes("discount"),
        );

        setAdditionalCharges(discountCharges);

        if (discountCharges.length > 0) {
          setSelectedAdditionalChargeData(discountCharges[0]._id);
        } else {
          setSelectedAdditionalChargeData(additionalChargesResponse[0]?._id);
        }
        setAllAdditionalChargesFromRedux(additionalChargesResponse);
      }
      // ✅ Now SAFE to filter
      const discountCharges = additionalChargesResponse.filter((charge) =>
        charge.name.toLowerCase().includes("discount"),
      );
      setAdditionalCharges(discountCharges);

      // 3. Existing Series fetch logic
      const seriesResponse = await api.get(
        `/api/sUsers/getSeriesByVoucher/${cmp_id}?voucherType=sales`,
        { withCredentials: true },
      );
      if (seriesResponse.data) {
        const specificSeries = seriesResponse.data.series?.find(
          (item) => item.under === "restaurant",
        );
        if (specificSeries) {
          const {
            prefix = "",
            currentNumber = 0,
            suffix = "",
            width = 3,
          } = specificSeries;
          const paddedNumber = String(currentNumber).padStart(width, "0");
          const specificNumber = `${prefix}${paddedNumber}${suffix}`;
          setSaleVoucherData({
            series: specificSeries,
            number: specificNumber,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error.response?.data?.message || "Error fetching data");
      setAdditionalCharges([]); // ✅ Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  }, [cmp_id, allAdditionalChargesFromRedux, isLoading]);
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      setOrders(data?.data);
      dispatch(
        setKotDate({
          start: selectedFromDate,
          end: selectedDate,
          autoFetch: true,
        }),
      );
    }
  }, [data, selectedDate, selectedFromDate]);

  const { data: paymentTypeData } = useFetch(
    `/api/sUsers/getPaymentType/${cmp_id}`,
  );
  useEffect(() => {
    if (paymentTypeData) {
      const { bankDetails, cashDetails } = paymentTypeData?.data;

      setCashOrBank(paymentTypeData?.data);
      if (bankDetails && bankDetails.length > 0) {
        setSelectedBank(bankDetails[0]._id);
      }
      if (cashDetails && cashDetails.length > 0) {
        setSelectedCash(cashDetails[0]._id);
      }
    }
  }, [paymentTypeData]);

  useEffect(() => {
    // Get format from organization configuration
    const print1 = org?.configurations?.[0]?.defaultPrint?.restaurantPrint1;
    const print2 = org?.configurations?.[0]?.defaultPrint?.restaurantPrint2;

    if (print2) {
      setBillFormat("format2");
    } else if (print1) {
      setBillFormat("format1");
    }
  }, [org]);

  useEffect(() => {
    if (location.state?.fromTable) {
      const shouldOpenPaymentModal = sessionStorage.getItem(
        "returnToPaymentModal",
      );
      const savedModalData = sessionStorage.getItem("paymentModalData");

      if (shouldOpenPaymentModal === "true" && savedModalData) {
        try {
          const modalData = JSON.parse(savedModalData);

          // Restore modal state
          setSelectedDataForPayment(modalData.selectedDataForPayment);
          setPaymentMode(modalData.paymentMode);
          setShowPaymentModal(true); // ✅ This is correct

          // Restore other relevant states
          if (modalData.selectedKot) {
            setSelectedKot(modalData.selectedKot);
          }
          if (modalData.discountAmount) {
            setDiscountAmount(modalData.discountAmount);
          }
          if (modalData.note) {
            setNote(modalData.note);
          }

          // Clear session storage
          sessionStorage.removeItem("returnToPaymentModal");
          sessionStorage.removeItem("paymentModalData");
        } catch (error) {
          console.error("Error restoring payment modal:", error);
          sessionStorage.removeItem("returnToPaymentModal");
          sessionStorage.removeItem("paymentModalData");
        }
      }
    } else {
      sessionStorage.removeItem("returnToPaymentModal");
      sessionStorage.removeItem("paymentModalData");
    }
  }, []);

  const statusConfig = {
    pending: {
      label: "Pending",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      iconColor: "bg-blue-600",
      order: 1,
    },
    cooking: {
      label: "Cooking",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      iconColor: "bg-yellow-600",
      order: 2,
    },
    ready_to_serve: {
      label: "Ready to Serve",
      bgColor: "bg-gray-100",
      textColor: "text-green-800",
      iconColor: "bg-green-600",
      order: 3,
    },
    completed: {
      label: "Completed",
      bgColor: "bg-green-200",
      textColor: "text-gray-800",
      iconColor: "bg-gray-600",
      order: 4,
    },
  };

  useEffect(() => {
    if (previewForSales) {
      setShowVoucherPdf(true);
    }
  }, [previewForSales]);

  const handleKotClick = () => {
    if (showKotNotification) {
      setShowKotNotification(false);
    }
  };

  // Available status transitions for kitchen
  const getAvailableStatuses = (currentStatus) => {
    const transitions = {
      pending: ["cooking"], // forward only from pending
      cooking: ["pending", "ready_to_serve"], // backward to pending, forward to ready_to_serve
      ready_to_serve: ["cooking", "completed"], // backward to cooking, forward to completed
      completed: ["ready_to_serve"], // only backward
    };
    return transitions[currentStatus] || [];
  };

  // Filter orders based on active filter
  // Updated getFilteredOrders function with proper kitchen filtering
  const getFilteredOrders = () => {
    let filtered = orders;
    if (activeFilter === "All") {
      // Reception - All: Show all statuses
      filtered = filtered.filter((order) =>
        ["pending", "cooking", "ready_to_serve", "completed"].includes(
          order.status,
        ),
      );
    } else if (activeFilter === "ON PROCESS") {
      // Reception - On Process: Show pending, cooking, and ready_to_serve
      filtered = filtered.filter((order) =>
        ["pending", "cooking", "ready_to_serve"].includes(order.status),
      );
    } else if (activeFilter === "KOT BILL PENDING") {
      // Reception - Completed: Show only completed orders
      filtered = filtered.filter(
        (order) => order.status === "completed" && !order.paymentCompleted,
      );
    } else if (activeFilter === "COMPLETED") {
      // Reception - Completed: Show only completed orders
      filtered = filtered.filter(
        (order) => order.status === "completed" && order.paymentCompleted,
      );
    }
    // }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order?.customer?.tableNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order?.customer?.name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          order?.id?.toString().includes(searchQuery) ||
          order?.salesNumber?.toString().includes(searchQuery) ||
          order.items.some(
            (item) =>
              item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.product_name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()),
          ),
      );
    }

    return filtered;
  };

  const handleStatusChange = async (orderId, newStatus, batchNo) => {
    setSaveLoader(true);

    try {
      const response = await api.put(
        `/api/sUsers/updateKotStatus/${orderId}`,
        { status: newStatus, batchNo },
        { withCredentials: true },
      );

      if (response.status === 200 || response.status === 201) {
        setOrders((prevOrders) =>
          prevOrders.map((order) => {
            if (order._id !== orderId) return order;

            const updatedBatches = order.kitchenBatches?.map((batch) =>
              batch.batchNo === batchNo
                ? { ...batch, status: newStatus }
                : batch,
            );

            const allCompleted =
              updatedBatches?.length > 0 &&
              updatedBatches.every((b) => b.status === "completed");

            return {
              ...order,
              status: allCompleted ? "completed" : order.status,
              statusType: allCompleted ? "completed" : order.statusType,
              kitchenBatches: updatedBatches,
            };
          }),
        );
        queryClient.invalidateQueries({
          queryKey: ["kotDash", cmp_id, selectedDate, selectedFromDate],
        });
      }
    } catch (error) {
      console.error(
        "Error updating order status:",
        error.response?.data || error.message,
      );
    } finally {
      setSaveLoader(false);
    }
  };

  // function used to perform print  with kot
  const handleKotPrint = (data, batchNo) => {
    let newItems = data?.items || [];

    if (batchNo !== null && batchNo !== undefined && batchNo !== "") {
      const batchData = data.kitchenBatches.find(
        (item) => item.batchNo === batchNo,
      );

      if (batchData) {
        const batchItemIds = batchData.items.map((i) => i.itemId.toString());

        newItems = data.items
          .filter((item) => batchItemIds.includes(item._id.toString()))
          .map((item) => {
            const batchItem = batchData.items.find(
              (i) => i.itemId.toString() === item._id.toString(),
            );
            return {
              ...item,
              quantity: batchItem?.remainingQty ?? item.remainingQty,
            };
          });
      }
    }

    const orderData = {
      kotNo: data?.voucherNumber,
      tableNo: data?.tableNumber,
      items: newItems,
      createdAt: data?.createdAt,
      customerName: data?.customer?.name,
      guestName: data?.customer?.guestName,
      type: data?.type,
      roomName: data?.roomId?.roomName,
    };

    setSelectedMode(null);
    setShowBatchWiseKotPrint(false);
    setDataForBatchWisePrint(null);
    generateAndPrintKOT(orderData, true, false, companyName ,org?.configurations?.[0]?.kotPrinter);
  };

  const handleKotCancel = async () => {
     setCancelReload(true);
    try {
      if (!selectedOrderForCancel) return;
      const response = await api.put(
        `/api/sUsers/cancel/${selectedOrderForCancel._id}`,
        { reason: cancelReason },
        { withCredentials: true },
      );

      if (response.data.success) {
        // ✅ Remove the cancelled order from UI immediately
        setOrders((prevOrders) =>
          prevOrders.filter((kot) => kot._id !== selectedOrderForCancel._id),
        );
        queryClient.invalidateQueries({
          queryKey: ["kotDash", cmp_id, selectedDate, selectedFromDate],
        });
        setShowCancelModal(false);
        setCancelReason(""); // clear reason field
        setSelectedOrderForCancel(null);
      } else {
        console.error("Cancel failed:", response.data.message);
      }
    } catch (error) {
      console.error("Error cancelling KOT:", error);
    } finally {
      setCancelReload(false);
    }
  };

  const MenuIcon = () => (
    <svg
      className="w-4 h-4 text-gray-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 6h16M4 12h16M4 18h16"
      ></path>
    </svg>
  );

  const SearchIcon = () => (
    <svg
      className="w-4 h-4 text-gray-600"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      ></path>
    </svg>
  );

  // Simulate receiving role from props or URL params
  useEffect(() => {
    // In real implementation, get this from props, context, or URL params
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get("role") || "reception";
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (salePrintData) {
      billFormat === "format1"
        ? navigate(`/sUsers/sharesalesThreeInch/${salePrintData._id}`)
        : navigate(`/sUsers/sharesalesThreeInch2/${true}`, {
            state: salePrintData,
          });
    }
  }, [salePrintData, navigate]);

  const filteredOrders = getFilteredOrders();

  const handleSavePayment = async (id) => {
    setSaveLoader(true);

    try {
      // Credit validation
      if (paymentMode === "credit") {
        if (!selectedCreditor || !selectedCreditor._id) {
          setPaymentError("Please select a creditor");
          return;
        }
      }

      let paymentDetails;
      let selectedKotData;

      // ================= DIRECT SALE =================
      if (selectedDataForPayment?.isDirectSale) {
        if (paymentMethod === "cash") {
          paymentDetails = {
            cashAmount: selectedDataForPayment?.total,
            onlineAmount: 0,
            selectedCash,
            selectedBank,
            paymentMode: "single",
          };
        } else {
          paymentDetails = {
            cashAmount: 0,
            onlineAmount: selectedDataForPayment?.total,
            selectedCash,
            selectedBank,
            paymentMode: "single",
          };
        }

        selectedKotData = selectedDataForPayment;
      }

      // ================= NORMAL SALE =================
      else {
        const hasRoomService =
          selectedDataForPayment?.roomService &&
          Object.keys(selectedDataForPayment.roomService).length > 0;

        // ---------- WITH ROOM SERVICE ----------
        if (hasRoomService) {
          if (paymentMode === "single") {
            if (paymentMethod === "cash") {
              paymentDetails = {
                cashAmount: selectedDataForPayment?.total,
                onlineAmount: 0,
                selectedCash,
                selectedBank,
                paymentMode,
              };
            } else {
              paymentDetails = {
                cashAmount: 0,
                onlineAmount: selectedDataForPayment?.total,
                selectedCash,
                selectedBank,
                paymentMode,
              };
            }
          } else if (paymentMode === "credit") {
            paymentDetails = {
              cashAmount: selectedDataForPayment?.total,
              selectedCreditor,
              paymentMode,
            };
          } else {
            if (
              Number(cashAmount) + Number(onlineAmount) !==
              Number(selectedDataForPayment?.total)
            ) {
              setPaymentError(
                "Cash and online amounts together must equal total amount",
              );
              return;
            }

            paymentDetails = {
              cashAmount,
              onlineAmount,
              selectedCash,
              selectedBank,
              paymentMode,
            };
          }

          selectedKotData = selectedDataForPayment;
        }

        // ---------- WITHOUT ROOM SERVICE ----------
        else {
          if (paymentMode === "single") {
            if (paymentMethod === "cash") {
              paymentDetails = {
                cashAmount: selectedDataForPayment?.total,
                onlineAmount: 0,
                selectedCash,
                selectedBank,
                paymentMode,
              };
            } else {
              paymentDetails = {
                cashAmount: 0,
                onlineAmount: selectedDataForPayment?.total,
                selectedCash,
                selectedBank,
                paymentMode,
              };
            }
          } else if (paymentMode === "credit") {
            paymentDetails = {
              cashAmount: selectedDataForPayment?.total,
              selectedCreditor,
              paymentMode,
            };
          } else {
            let totalAmount = splitPaymentRows.reduce(
              (acc, curr) => acc + curr.amount,
              0,
            );
            if (totalAmount !== Number(selectedDataForPayment?.total)) {
              setPaymentError(
                "Cash and online amounts together must equal total amount",
              );
              return;
            }

            let splitRow = [];

            splitPaymentRows.forEach((row) => {
              if (row.type == "credit") {
                splitRow.push({
                  type: row.type,
                  source: row.creditor._id,
                  sourceType: "credit",
                  subsource: row.creditor.partyName,
                  underCategory: "food",
                  amount: row.amount,
                });
              } else {
                splitRow.push({
                  type: row.type,
                  source: row.source,
                  sourceType: row.sourceType,
                  subsource: row.subSource,
                  underCategory: "food",
                  amount: row.amount,
                });
              }
            });

            paymentDetails = {
              cashAmount,
              onlineAmount,
              selectedCash,
              selectedBank,
              paymentMode,
              splitRow,
            };
          }
          selectedKotData = previewForSales || selectedDataForPayment;
        }
      }
      // const previewDiscount = previewForSales?.discount || discountAmount;
      // const previewDiscountCharge = previewForSales?.discountCharge || discountCharge;

      let findOne = additionalCharges.find(
        (charge) => charge._id === selectedAdditionalChargeData,
      );

      let additionalChargesData = [];
      if (previewForSales && previewForSales.additionalCharges.length > 0) {
        // ✅ Use EXACTLY what's in preview - don't rebuild
        additionalChargesData = previewForSales.additionalCharges;
        additionalChargesData = [
          {
            _id: findOne._id,
            option: findOne.name,
            value: previewForSales.additionalCharges[0].amount || 0,
            action: "sub",
            taxPercentage: findOne.taxPercentage,
            taxAmt: previewForSales.additionalCharges[0].taxAmount || 0,
            hsn: findOne.hsn,
            finalValue: previewForSales.additionalCharges[0].finalValue,
          },
        ];
      }

      const hasAutoComplimentary = selectedKot.some((kot) => {
        const order = filteredOrders.find((o) => o._id === kot.id);
        return order?.foodPlanDetails?.isComplimentary === true;
      });

      const isManuallyComplimentary = isComplimentary && !hasAutoComplimentary;

      // Show appropriate toast message
      if (isComplimentary) {
        if (hasAutoComplimentary) {
          toast.info("Processing complimentary order (Food Plan)");
        } else {
          toast.info("Processing manually marked complimentary order");
        }
      }
      // ================= FINAL PAYMENT OBJECT =================
      const payment = {
        selectedSaleDate,
        paymentMethod,
        paymentDetails: {
          ...paymentDetails,
          cashAmount: Number(paymentDetails.cashAmount),
        },
        selectedKotData,
        isPostToRoom,
        isDirectSale: selectedDataForPayment?.isDirectSale || false,
        additionalCharges: additionalChargesData,
        isComplimentary: isComplimentary, // ✅ ADD THIS
        isManuallyComplimentary: isManuallyComplimentary,
        //  discountCharge: previewDiscountCharge,
        // discountAmount: previewDiscount,
        note,
        discountBasedOnGrossAmount: discountBasedOnGrossAmount,
        complementaryWithTax: complementaryWithTax,
      };

      const response = await api.put(
        `/api/sUsers/updateKotPayment/${cmp_id}`,
        payment,
        { withCredentials: true },
      );

      if (response.status === 200 || response.status === 201) {
        setOrders((prev) =>
          prev.map((order) =>
            selectedKotData.voucherNumber.some(
              (selected) => selected.voucherNumber === order.voucherNumber,
            )
              ? { ...order, paymentCompleted: true, status: "completed" }
              : order,
          ),
        );

        toast.success(
          isComplimentary
            ? "Complimentary order processed successfully!"
            : response?.data?.message,
        );

        setPrintData(response?.data?.data);
        setShowPaymentModal(false);
        setSelectedDiscountCharge(null);
        setDiscountAmount(0);
        setDiscountType("amount");
        setDiscountValue(0);
        setNote("");
        setIsComplimentary(false); //
        setPreviewForSales(null);
        setIsForComp(false);
        setShowPrintConfirmModal(true);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setSaveLoader(false);
      setCashAmount(0);
      setOnlineAmount(0);
      queryClient.invalidateQueries({
        queryKey: ["kotDash", cmp_id, selectedDate, selectedFromDate],
      });
      setPaymentMode("single");
      setSelectedCreditor("");
      setSelectedKot([]);
      setShowVoucherPdf(false);
    }
  };

  const handlePrintData = async (kotId) => {
    try {
      let saleData = await api.get(
        `/api/sUsers/getSalePrintData/${cmp_id}/${kotId}`,
        { withCredentials: true },
      );
      setSalePrintData(saleData?.data?.data);
    } catch (error) {
      console.log(error);
    }
  };

  // function used to select multiple kot
  const handleSelectMultipleKots = (order) => {
    if (userRole == "kitchen") return;
    if (order && !order?.paymentCompleted) {
      const findOne = selectedKot.find((item) => item.id === order._id);
      const firstSelected = selectedKot[0];
      // take the first selection

      if (firstSelected) {
        // ✅ only allow roomService with same roomId
        if (firstSelected.roomId !== order?.roomId?._id) {
          toast.error("You can only select room  KOTs from the same room");
          return;
        }
      }

      if (findOne) {
        // remove if already selected
        setSelectedKot((prevSelected) =>
          prevSelected.filter((item) => item.id !== order._id),
        );
      } else {
        // add new selection
        setSelectedKot((prevSelected) => [
          ...prevSelected,
          {
            id: order._id,
            type: order.type,
            voucherNumber: order.voucherNumber,
            roomId: order?.roomId?._id, // keep roomId for validation
            checkInNumber: order?.checkInNumber,
            customer: order?.customer,
            foodPlanDetails: order?.foodPlanDetails,
          },
        ]);
      }
    }
  };

  const handleSalesPreview = (postToRoom) => {
    setIsPostToRooms(postToRoom);
    let kotVoucherNumberArray = [];

    let roomDetails = null;
    let itemList = selectedKot.flatMap((item) => {
      let findOne = filteredOrders.find((order) => order._id == item.id);
      if (findOne) {
        if (!roomDetails && findOne.roomId) {
          roomDetails = {
            roomno: findOne.roomId?.roomno || findOne.roomId?.roomName,
            roomName: findOne.roomId?.roomName,
            guestName: findOne.customer?.name,
            checkInNumber: findOne.checkInNumber,
            foodPlanDetails: item?.foodPlanDetails,
          };
        }

        kotVoucherNumberArray.push({
          voucherNumber: findOne.voucherNumber,
          id: findOne._id,
          checkInNumber: findOne?.checkInNumber,
          tableNumber: findOne?.tableNumber,
        });
      }
      return findOne?.items || []; // return empty array if not found
    });
    let subtotal;

    if (isComplimentary) {
      let updatedItemList = itemList.map((item) => {
        return makeItemComplimentary(item);
      });
      itemList = updatedItemList;
    }

    if (discountBasedOnGrossAmount) {
      const gross = itemList.reduce(
        (acc, item) => acc + Number(item.total || 0),
        0,
      );
      subtotal = Math.round(gross).toFixed(2);
    } else {
      const gross = itemList.reduce(
        (acc, item) =>
          acc + Number(item.total || 0) - Number(item.totalIgstAmt || 0),
        0,
      );
      const totalDiscount = Number(discountAmount || 0);

      const net = itemList.reduce((acc, item) => {
        const lineTotal = Number(item.total || 0);

        const share = gross > 0 ? (lineTotal / gross) * totalDiscount : 0; // proportional

        return acc + (lineTotal - share);
      }, 0);

      subtotal = Math.round(net).toFixed(2);
    }

    let finalAmount = discountBasedOnGrossAmount
      ? Math.round(Number(subtotal) - Number(discountAmount || 0)).toFixed(2)
      : Math.round(subtotal).toFixed(2);

    let additionalChargesArray = [];

    if (discountAmount > 0 && selectedDiscountCharge) {
      const discountName =
        selectedDiscountCharge.name ||
        `Discount (${
          discountType === "percentage"
            ? discountValue + "%"
            : "₹" + discountValue
        })`;

      additionalChargesArray.push({
        _id: selectedDiscountCharge._id || null,
        name: discountName, // ✅ Add name
        amount: Number(discountValue), // ✅ Calculated discount amount
        type: "subtract",
        value: Number(discountValue), // ✅ Original input value
        discountType: discountType,
        note: note || "",
        isDiscount: true,
        finalValue: Number(discountAmount),
      });
    }

    let newObject = {
      Date: new Date(),
      voucherType: "sales",
      orderType: selectedKot
        .map((k) => k.type)
        .filter(Boolean)
        .join(", "),
      serialNumber: saleVoucherData?.series?.currentNumber,
      userLevelSerialNumber: saleVoucherData?.series?.currentNumber,
      salesNumber: saleVoucherData?.number,
      series_id: saleVoucherData?.series?._id,
      usedSeriesNumber: saleVoucherData?.series?.currentNumber,
      partyAccount: "Cash-in-Hand",
      items: itemList,
      subtotal: subtotal, // Original total before discount
      discount: Math.round(discountAmount || 0), // Discount amount
      discountCharge: Math.round(selectedDiscountCharge || 0),
      additionalCharges: additionalChargesArray, // Discount type details
      finalAmount: Math.round(finalAmount), // finalAmount,
      note: note || "",
      isComplimentary: isComplimentary, // ✅ ADD THIS - Independent flag // After discount
      total: finalAmount,
      voucherNumber: kotVoucherNumberArray,
      roomDetails: roomDetails,
      party: {
        partyName: selectedKot[0]?.customer?.name,
        address: selectedKot[0]?.customer?.address,
        mobile: selectedKot[0]?.customer?.phone,
      },
    };

    setPreviewForSales(newObject);
  };

  useEffect(() => {
    if (
      previewForSales?.isComplimentary &&
      paymentMethod &&
      isForComp &&
      (selectedCash || selectedBank)
    ) {
      handleSavePayment();
    }
  }, [paymentMethod, selectedCash, selectedBank, isForComp]);

  const handleSaveSales = (status) => {
    queryClient.invalidateQueries({
      queryKey: ["kotDash", cmp_id, selectedDate, selectedFromDate],
    }); // ✅
    setConformationModal(false);
    setSelectedDataForPayment(previewForSales);
    if (isPostToRoom && status) {
      handleSavePayment();
      return;
    }

    if (previewForSales.isComplimentary) {
      let newMergedCashOrBank = [
        ...cashOrBank.bankDetails,
        ...cashOrBank.cashDetails,
      ];

      let complementaryParty = newMergedCashOrBank.find(
        (item) => item.isTaggedWithComplementary,
      );
      if (!complementaryParty) {
        toast.error("Complementary selected cash or bank is not found");
        return;
      }

      setPaymentMethod(complementaryParty?.partyType);
      if (complementaryParty.partyType == "cash") {
        setSelectedCash(complementaryParty?._id);
      }
      if (complementaryParty.partyType == "bank") {
        setSelectedBank(complementaryParty?._id);
      }
      setIsForComp(true);
      return;
    }

    if (!status) {
      setShowVoucherPdf(false);
      setPreviewForSales(null);
      return;
    }
    setShowVoucherPdf(false);
    setShowPaymentModal(true);
  };

  const handleEditKot = (kotData, batchNo, order) => {
    if (kotData?.paymentCompleted) {
      toast.error("Kot Payment is completed so you can't edit");
      return;
    }
    // else if (kotData?.status === "completed") {
    //   toast.error("Kot is already completed so you can't edit");
    //   return;
    // }
    navigate("/sUsers/RestaurantDashboard", {
      state: { kotData, batchNo, order },
    });
  };

  const handlePrint = useReactToPrint({
    content: () => contentToPrint.current,
  });

  useEffect(() => {
    if (selectedKot.length > 0 && filteredOrders.length > 0) {
      // Check if any KOT has complimentary food plan
      const hasComplimentaryFoodPlan = selectedKot.some((kot) => {
        const order = filteredOrders.find((o) => o._id === kot.id);

        return order?.foodPlanDetails?.isComplimentary == true;
      });

      // ✅ Auto-tick checkbox if complimentary
      setIsComplimentary(hasComplimentaryFoodPlan);
    }
  }, [selectedKot]);

  const handlePrintShow = () => {
    let updatedData = { ...printData.salesRecord, ...printData?.kotData };
    navigate(`/sUsers/sharesalesThreeInch2/${true}`, {
      state: updatedData,
    });
  };

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    let groupKey;
    let groupLabel;

    if (order.type === "Room Service" || order.type === "roomService") {
      groupKey = "room_service";
      groupLabel = "🛎️ Room Service";
    } else if (order.type === "Takeaway" || order.type === "takeaway") {
      groupKey = "takeaway";
      groupLabel = "🥡 Takeaway";
    } else if (order.type === "delivery" || order.type === "Delivery ") {
      groupKey = "delivery ";
      groupLabel = "🥡 delivery ";
    } else if (order.type === "dine-in") {
      const table = order.tableNumber || "Unknown";
      groupKey = `table_${table}`;
      groupLabel = `🍽️ Table ${table}`;
    } else {
      groupKey = "other";
      groupLabel = "📋 Other Orders";
    }

    if (!groups[groupKey]) {
      groups[groupKey] = { label: groupLabel, orders: [] };
    }
    groups[groupKey].orders.push(order);
    return groups;
  }, {});

  const sortedGroups = Object.entries(groupedOrders).sort(([a], [b]) => {
    const fixedOrder = ["room_service", "takeaway", "other"];
    const aIsTable = a.startsWith("table_");
    const bIsTable = b.startsWith("table_");

    if (aIsTable && bIsTable) {
      // Alphabetical sort for table codes like A01, A02, B01
      return a.localeCompare(b);
    }
    if (aIsTable) return -1;
    if (bIsTable) return 1;
    return fixedOrder.indexOf(a) - fixedOrder.indexOf(b);
  });

  const handleDataPrintBasedOnBatch = (order, mode) => {
    setSelectedMode(mode);
    setDataForBatchWisePrint(order);
    setShowBatchWiseKotPrint(true);
  };

  const handleSpecificItemSale = (data) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        const matchedItem = data.find((item) => item._id === order._id);

        if (matchedItem) {
          return { ...order, ...matchedItem };
        }

        return order;
      }),
    );
    setSpecificSelectedKotItemWise(data);
  };

  const combinedSources = [
    ...(cashOrBank?.cashDetails?.map((c) => ({
      id: c._id,
      name: `${c.partyName} - ${c.under}`,
      type: c.under,
      subSource: c.partyName,
    })) || []),
    ...(cashOrBank?.bankDetails?.map((b) => ({
      id: b._id,
      name: `${b.partyName} - ${b.under}`,
      type: b.under,
      subSource: b.partyName,
    })) || []),
    {
      id: "credit",
      name: "credit",
      type: "credit",
      subSource: "credit",
    },
  ];
  return (
    <>
      {showVoucherPdf && (
        <div>
          {billFormat === "format1" ? (
            <VoucherThreeInchPdf
              contentToPrint={contentToPrint}
              data={previewForSales}
              org={org}
              tab="sale"
              isPreview={true}
              sendToParent={handleSaveSales}
              handlePrintData={handlePrint}
            />
          ) : (
            <VoucherThreeInchPdfFormat2
              contentToPrint={contentToPrint}
              data={previewForSales}
              org={org}
              tab="sale"
              isPreview={true}
              sendToParent={handleSaveSales}
              handlePrintData={handlePrint}
              selectedSaleDate={selectedSaleDate}
              setSelectedSaleDate={setSelectedSaleDate}
            />
          )}
        </div>
      )}
      {!showVoucherPdf && (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className=" px-2 py-2 border-b border-gray-200 bg-[#012a4a]">
            {/* Mobile Layout */}
            <div className="block sm:hidden">
              <IoIosArrowRoundBack
                onClick={() => navigate(-1)}
                className="cursor-pointer text-3xl text-white"
              />
              {/* First Row - Title */}
              <div className="mb-3">
                <h1 className="text-lg font-semibold text-gray-600  text-center">
                  {userRole === "kitchen"
                    ? "Kitchen Orders"
                    : "Reception Orders"}{" "}
                  Display
                </h1>
              </div>

              {/* Second Row - Role and Date */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      setLoader(true);
                      setUserRole(e.target.value);
                      setActiveFilter("ON PROCESS");
                      setLoader(false);
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="reception">Reception</option>
                    <option value="kitchen">Kitchen</option>
                  </select>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="text-gray-600 text-sm">
                    {dayjs(selectedDate).format("dddd, D MMMM YYYY")}
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1 border rounded text-sm w-full max-w-[200px]"
                    max={dayjs().format("YYYY-MM-DD")}
                  />
                </div>
              </div>
            </div>

            {/* Desktop Layout (unchanged) */}
            <div className="hidden sm:flex justify-between items-center bg-">
              <div className="flex items-center gap-4">
                <IoIosArrowRoundBack
                  onClick={() => navigate(-1)}
                  className="cursor-pointer text-3xl text-white"
                />
                <h1 className="text-xl font-semibold text-gray-500 ">
                  {userRole === "kitchen"
                    ? "Kitchen Orders"
                    : "Reception Orders"}{" "}
                  Display
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      setUserRole(e.target.value);
                      setActiveFilter("ON PROCESS");
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="reception">Reception</option>
                    <option value="kitchen">Kitchen</option>
                  </select>
                </div>
              </div>
              <>
                <div className="flex items-center gap-4 mr-2">
                  <div className="text-gray-600 text-sm">
                    <span>From:</span>
                  </div>
                  <input
                    type="date"
                    value={selectedFromDate}
                    onChange={(e) =>
                      e.target.value <= selectedDate &&
                      setSelectedFromDate(e.target.value)
                    }
                    className="px-3 py-1 border rounded text-sm"
                    max={dayjs().format("YYYY-MM-DD")}
                  />
                  {/* </div> */}
                  {/* <div className="flex items-center gap-4"> */}
                  <div className="text-gray-600 text-sm">
                    <span>To:</span>
                    {/* {dayjs(selectedDate).format("dddd, D MMMM YYYY")} */}
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) =>
                      e.target.value >= selectedFromDate &&
                      setSelectedDate(e.target.value)
                    }
                    className="px-3 py-1 border rounded text-sm"
                    max={dayjs().format("YYYY-MM-DD")}
                  />
                </div>
              </>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white px-2 py-2 border-b border-gray-200 flex justify-between items-center">
            <div className="flex gap-2">
              {(userRole === "reception"
                ? ["All", "ON PROCESS", "KOT BILL PENDING", "COMPLETED"]
                : ["ON PROCESS"]
              ).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 border rounded-md text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? "bg-green-800 text-white border-green-800"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {showKotNotification && selectedKotFromRedirect && (
              <div
                className="fixed top-6 inset-x-0 flex justify-center z-50 cursor-pointer"
                onClick={() => setShowKotNotification(false)}
              >
                <div className="bg-yellow-100 border border-yellow-400 px-6 py-2 rounded-lg shadow text-yellow-900 font-medium">
                  KOT #{selectedKotFromRedirect.voucherNumber} was selected from
                  table. Click to close this notice.
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MenuIcon />
              <TouchInput
                type="text"
                className="px-3 py-1.5 border border-gray-300 rounded-md w-64 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Search name, order ID, or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon />
            </div>
          </div>

          <div className="p-2">
            {userRole === "kitchen" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOrders
                  .flatMap((order) => {
                    if (order.kitchenBatches?.length > 0) {
                      return order.kitchenBatches.map((batch) => ({
                        ...order,
                        _batchNo: batch.batchNo,
                        _batchItems: batch.items,
                        _batchStatus: batch.status,
                        _batchPrintedAt: batch.printedAt,
                        _batchCardId: `${order._id}_${batch.batchNo}`,
                        status: batch.status,
                      }));
                    }
                    return [
                      {
                        ...order,
                        _batchNo: null,
                        _batchItems: null,
                        _batchCardId: order._id,
                        status: order.status,
                      },
                    ];
                  })
                  .map((order) => {
                    if (order.status == "completed") {
                      return;
                    }
                    const currentStatusConfig = statusConfig[order.status];
                    const availableStatuses = getAvailableStatuses(
                      order.status,
                    );
                    const isOrderSelected = (o) =>
                      selectedKot.find((item) => item.id === o._id);
                    const displayItems = order._batchItems ?? order.items;
                    return (
                      <div
                        key={order._batchCardId}
                        className={`group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border overflow-hidden h-96 flex flex-col cursor-pointer ${
                          isOrderSelected(order)
                            ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
                            : "border-gray-100 hover:border-blue-200"
                        }`}
                        onClick={() => {
                          if (
                            showKotNotification &&
                            selectedKotFromRedirect &&
                            order._id == selectedKotFromRedirect._id
                          )
                            setShowKotNotification(false);
                          handleSelectMultipleKots(order);
                        }}
                      >
                        {/* Selected tick */}
                        {isOrderSelected(order) && (
                          <div className="absolute top-2 right-2 z-10 bg-blue-500 rounded-full p-1 shadow-lg animate-bounce">
                            <MdCheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {/* Status color bar */}
                        <div
                          className={`h-1 w-full ${currentStatusConfig.bgColor}`}
                        />

                        {/* ── Card Header ── */}
                        <div
                          className={`px-3 py-2 bg-gradient-to-r border-b flex-shrink-0 ${
                            isOrderSelected(order)
                              ? "from-blue-100 to-indigo-100 border-blue-200"
                              : "from-blue-50 to-indigo-50 border-blue-100"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-4">
                            <div
                              className={`flex items-center gap-2 px-3 py-1 rounded-lg shadow-sm border ${
                                isOrderSelected(order)
                                  ? "bg-blue-100 border-blue-300"
                                  : "bg-white border-blue-200"
                              }`}
                            >
                              <MdDescription className="w-4 h-4 text-blue-600" />
                              <span
                                className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  isOrderSelected(order)
                                    ? "bg-blue-200 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {order.type}
                                {order?.tableNumber
                                  ? ` - ${order.tableNumber}`
                                  : ""}
                                <span>
                                  {order.roomId?.roomName && order?.tableNumber
                                    ? ", "
                                    : " "}
                                  {order.roomId?.roomName}
                                </span>
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleKotPrint(order, order._batchNo);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-semibold hover:from-blue-600 hover:to-blue-700 transition-all"
                            >
                              <MdPrint className="w-3.5 h-3.5" />
                              KOT
                            </button>
                            {/* <FaRegEdit
                  className="w-4 h-4 text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditKot(order);
                  }}
                /> */}
                          </div>
                        </div>

                        {/* ── Voucher + Batch Badge + Time ── */}
                        <div className="flex justify-between items-start p-3 pb-2 flex-shrink-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-blue-900">
                                #{order.voucherNumber}
                              </span>
                              {order._batchNo && (
                                <span className="text-[10px] font-black text-white bg-blue-500 px-2 py-0.5 rounded-full leading-none">
                                  KOT {order._batchNo}
                                </span>
                              )}
                              {(order.isManuallyComplimentary ||
                                order.foodPlanDetails?.isComplimentary) && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
                                  COMP
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <MdAccessTime className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}{" "}
                                {new Date(order.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </span>
                              {order.foodPlanDetails?.length > 0 && (
                                <span className="text-black font-bold truncate flex ml-auto">
                                  {order.foodPlanDetails
                                    .map((plan) => plan.planType)
                                    .join(", ")}
                                </span>
                              )}
                            </div>

                            {/* Batch print time */}
                            {order._batchPrintedAt && (
                              <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <MdPrint className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  Printed:{" "}
                                  {new Date(
                                    order._batchPrintedAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Order status pill */}
                          <div
                            className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${currentStatusConfig.bgColor} ${currentStatusConfig.textColor}`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${currentStatusConfig.iconColor} animate-pulse`}
                            />
                            {currentStatusConfig.label}
                          </div>
                        </div>

                        {/* ── Items List ── */}
                        <div className="flex-1 px-3 overflow-hidden min-h-0">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <MdList className="w-3 h-3 text-gray-400" />
                            {order._batchNo
                              ? `KOT ${order._batchNo} Items`
                              : "Items"}{" "}
                            ({displayItems.length}
                            {!order._batchNo && order.moreItems
                              ? `+${order.moreItems}`
                              : ""}
                            )
                          </h4>
                          <div className="h-full overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {displayItems.map((item, index) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${
                                  isOrderSelected(order)
                                    ? "bg-blue-50 hover:bg-blue-100 border-blue-200"
                                    : "bg-gray-50 hover:bg-gray-100 border-gray-100"
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <div className="text-xs text-gray-800 font-medium leading-tight">
                                    {item?.product_name}
                                  </div>
                                  {item?.description && (
                                    <div className="text-xs text-gray-500 truncate mt-0.5">
                                      {item?.description}
                                    </div>
                                  )}
                                </div>
                                <div className="text-center flex-shrink-0">
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full min-w-[24px] inline-block ${
                                      isOrderSelected(order)
                                        ? "bg-blue-200 text-blue-900"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {item?.quantity}
                                  </span>
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    qty
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* moreItems only applies to non-batch cards */}
                            {!order._batchNo && order.moreItems && (
                              <div className="text-center py-2">
                                <div
                                  className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
                                    isOrderSelected(order)
                                      ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200"
                                      : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200"
                                  }`}
                                >
                                  <MdAdd className="w-3 h-3" />
                                  {order.moreItems} more items
                                </div>
                              </div>
                            )}

                            {displayItems.length === 0 && (
                              <div className="text-center py-4">
                                <MdInbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">
                                  No items in this order
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Update Status ── */}
                        <div className="mx-3 mb-2 p-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-100 flex-shrink-0">
                          <div className="flex items-center gap-1 mb-2">
                            <MdRefresh
                              className={`w-3 h-3 text-orange-600 ${loader ? "animate-spin" : ""}`}
                            />
                            <span className="text-xs font-semibold text-orange-800">
                              Update Status
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {availableStatuses.length > 0 ? (
                              availableStatuses.map((status) => (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(
                                      order._id,
                                      status,
                                      order._batchNo,
                                    );
                                  }}
                                  className="flex-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded text-xs font-semibold hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
                                >
                                  {statusConfig[status].label}
                                </button>
                              ))
                            ) : (
                              <div className="w-full text-center py-1">
                                <span className="text-xs text-gray-500 italic">
                                  No updates available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hover overlay */}
                        <div
                          className={`absolute inset-0 pointer-events-none transition-all duration-200 ${
                            isOrderSelected(order)
                              ? "bg-blue-500 bg-opacity-5"
                              : "group-hover:bg-gray-500 group-hover:bg-opacity-5"
                          }`}
                        />
                      </div>
                    );
                  })}
              </div>
            )}

            {/* ══════════════════════════════════════════
      RECEPTION — grouped, small box cards
  ══════════════════════════════════════════ */}
            {userRole === "reception" && (
              <div className="flex flex-wrap gap-x-6 gap-y-8 items-start">
                {sortedGroups.map(([groupKey, { label, orders, icon }]) => {
                  const cardW = 180;
                  const gapW = 12;
                  const groupW =
                    orders.length * cardW + (orders.length - 1) * gapW;

                  return (
                    <div
                      key={groupKey}
                      className="flex-shrink-0"
                      style={{
                        width: Math.min(groupW, window.innerWidth - 32),
                      }}
                    >
                      {/* ── Group Header ── */}
                      <div className="flex items-center gap-2 mb-3 h-8">
                        <div className="w-0.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full flex-shrink-0" />
                        {icon && (
                          <span className="text-sm flex-shrink-0 leading-none">
                            {icon}
                          </span>
                        )}
                        <span className="text-sm font-bold text-gray-800 leading-none tracking-wide truncate">
                          {label}
                        </span>
                        <span className="flex-shrink-0 inline-flex items-center h-5 px-2 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-full leading-none">
                          {orders?.length}{" "}
                          {orders?.length === 1 ? "order" : "orders"}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent min-w-[8px]" />
                      </div>

                      {/* ── Cards Row ── */}
                      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1">
                        {orders.map((order) => {
                          const currentStatusConfig =
                            statusConfig[
                              order.kitchenBatches?.length > 0
                                ? order.kitchenBatches[0].status
                                : order.status
                            ];
                          const isSelected = selectedKot.find(
                            (item) => item.id === order._id,
                          );

                          const isExpanded = expandedOrders[order._id];
                          const discountedTotal =
                            Number(order.total) - Number(order.discount || 0);

                          return (
                            <div
                              key={order._id}
                              style={{ width: cardW, minWidth: cardW }}
                              className={`relative rounded-xl border bg-white overflow-hidden flex flex-col transition-all duration-200 ${
                                isSelected
                                  ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                                  : "border-gray-100 hover:border-blue-200 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                              }`}
                            >
                              {/* Status color bar */}
                              <div
                                className={`h-1 w-full flex-shrink-0 ${currentStatusConfig?.bgColor}`}
                              />

                              {/* Selected tick */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 z-10 bg-blue-500 rounded-full p-0.5 shadow-lg animate-bounce">
                                  <MdCheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}

                              {/* ── Card Header ── */}
                              <div
                                className={`px-2 py-1.5 bg-gradient-to-r border-b cursor-pointer ${
                                  isSelected
                                    ? "from-blue-100 to-indigo-100 border-blue-200"
                                    : "from-blue-50 to-indigo-50 border-blue-100"
                                }`}
                                onClick={() => {
                                  if (
                                    showKotNotification &&
                                    selectedKotFromRedirect &&
                                    order._id == selectedKotFromRedirect._id
                                  )
                                    setShowKotNotification(false);
                                  handleSelectMultipleKots(order);
                                }}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium flex-1 min-w-0 ${
                                      isSelected
                                        ? "bg-blue-200 text-blue-800"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    <MdDescription className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                                    <span className="truncate">
                                      {order.type}
                                      {order?.tableNumber
                                        ? ` · ${order.tableNumber}`
                                        : ""}
                                      {order.roomId?.roomName
                                        ? ` · ${order.roomId.roomName}`
                                        : ""}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (order.kitchenBatches.length > 1) {
                                        handleDataPrintBasedOnBatch(
                                          order,
                                          "edit",
                                        );
                                      } else {
                                        handleEditKot(order);
                                      }
                                    }}
                                    className="flex-shrink-0 ml-1 w-6 h-6 rounded flex items-center justify-center hover:bg-blue-100 transition-colors"
                                  >
                                    <FaRegEdit className="w-3 h-3 text-blue-600 hover:text-blue-800" />
                                  </button>
                                </div>
                              </div>

                              {/* ── Card Body ── */}
                              <div
                                className="px-2 py-2 flex flex-col gap-1.5 flex-1 cursor-pointer"
                                onClick={() => {
                                  if (
                                    showKotNotification &&
                                    selectedKotFromRedirect &&
                                    order._id == selectedKotFromRedirect._id
                                  )
                                    setShowKotNotification(false);
                                  handleSelectMultipleKots(order);
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-bold text-blue-900">
                                    #{order.voucherNumber}
                                  </span>

                                  {(order.isManuallyComplimentary ||
                                    order.foodPlanDetails?.isComplimentary) && (
                                    <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">
                                      COMP
                                    </span>
                                  )}
                                </div>
                                {order.salesNumber && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500">
                                      SNo:
                                    </span>
                                    <span className="text-xs font-bold text-blue-500">
                                      #{order.salesNumber}
                                    </span>
                                  </div>
                                )}
                                {order.customer?.guestName ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500">
                                      Guest Name:
                                    </span>
                                    <span className="text-xs font-bold text-blue-500">
                                      {order.customer?.guestName}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-gray-500">
                                      Direct Sale
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                  <MdAccessTime className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {new Date(
                                      order.createdAt,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                    })}
                                    {" · "}
                                    {new Date(
                                      order.createdAt,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </span>
                                  {order.foodPlanDetails?.length > 0 && (
                                    <span className="text-black font-bold truncate flex ml-auto">
                                      {order.foodPlanDetails
                                        .map((plan) => plan.planType)
                                        .join(", ")}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={`self-start flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${currentStatusConfig.bgColor} ${currentStatusConfig.textColor}`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${currentStatusConfig.iconColor} animate-pulse`}
                                  />
                                  {currentStatusConfig.label}
                                </div>

                                <div className="flex items-center justify-between mt-0.5">
                                  <span
                                    className={`text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                                      isSelected
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    <MdList className="w-2.5 h-2.5" />
                                    {order.items.length}
                                    {order.moreItems
                                      ? `+${order.moreItems}`
                                      : ""}{" "}
                                    items
                                  </span>
                                  <div className="text-right">
                                    <div className="text-xs font-bold text-gray-900">
                                      ₹{discountedTotal.toFixed(0)}
                                    </div>
                                    {order.discount > 0 && (
                                      <div className="text-[9px] text-gray-400 line-through">
                                        ₹{Number(order.total).toFixed(0)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* ── Action Buttons ── */}
                              <div
                                className="px-2 pb-2 flex gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Expand toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(order._id);
                                  }}
                                  className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${
                                    isExpanded
                                      ? "bg-blue-600 text-white"
                                      : isSelected
                                        ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                  }`}
                                >
                                  <svg
                                    className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>

                                {/* Print Bill */}
                                {order?.paymentCompleted && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      handlePrintData(order._id);
                                    }}
                                    className="flex-1 h-6 bg-white text-emerald-700 border border-emerald-200 rounded-md text-[9px] font-semibold hover:bg-emerald-50 transition-all flex items-center justify-center gap-0.5"
                                  >
                                    <MdVisibility className="w-2.5 h-2.5" />
                                    Print
                                  </button>
                                )}

                                {/* KOT */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (order.kitchenBatches.length > 1) {
                                      handleDataPrintBasedOnBatch(
                                        order,
                                        "print",
                                      );
                                    } else {
                                      handleKotPrint(order);
                                    }
                                  }}
                                  className="flex-1 h-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md text-[9px] font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-0.5"
                                >
                                  <MdPrint className="w-2.5 h-2.5" />
                                  KOT
                                </button>

                                {/* Cancel — icon only to reduce accidental taps */}
                                {!order?.paymentCompleted && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setSelectedOrderForCancel(order);
                                      setShowCancelModal(true);
                                    }}
                                    title="Cancel order"
                                    className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center"
                                  >
                                    <MdCancel className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* ── Expanded Items Panel ── */}
                              {isExpanded && (
                                <div className="border-t border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                  <div className="flex items-center gap-1.5 px-2 pt-2 pb-1.5">
                                    <MdList className="w-3 h-3 text-blue-600" />
                                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">
                                      Order Items
                                    </span>
                                    <span className="ml-auto text-[9px] font-bold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
                                      {order.items.length}
                                      {order.moreItems
                                        ? `+${order.moreItems}`
                                        : ""}
                                    </span>
                                  </div>
                                  <div className="px-2 pb-2 space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border ${
                                          isSelected
                                            ? "bg-blue-100 border-blue-200"
                                            : "bg-white border-blue-100"
                                        }`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[10px] font-semibold text-gray-800 truncate leading-tight">
                                            {item?.product_name}
                                          </div>
                                          {item?.description && (
                                            <div className="text-[9px] text-gray-400 truncate">
                                              {item.description}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[22px] text-center ${
                                              isSelected
                                                ? "bg-blue-300 text-blue-900"
                                                : "bg-blue-100 text-blue-800"
                                            }`}
                                          >
                                            ×{item?.quantity}
                                          </span>
                                          <span className="text-[9px] text-gray-500 font-medium min-w-[32px] text-right">
                                            ₹{item?.total?.toFixed(0)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    {order.moreItems && (
                                      <div className="flex items-center justify-center gap-1 py-0.5">
                                        <MdAdd className="w-3 h-3 text-blue-500" />
                                        <span className="text-[9px] font-semibold text-blue-600">
                                          {order.moreItems} more items
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-blue-200">
                                      <span className="text-[10px] font-bold text-blue-800">
                                        Total
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {order.discount > 0 && (
                                          <span className="text-[9px] text-gray-400 line-through">
                                            ₹{Number(order.total).toFixed(2)}
                                          </span>
                                        )}
                                        <span className="text-xs font-black text-blue-900">
                                          ₹{discountedTotal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Floating Pay Button ── */}
            {(selectedKot.length > 0  && (permission.restaurantPayment || secondaryUserRole === "admin")) &&  (
              <div className="fixed bottom-4 right-4 z-50 w-[320px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 animate-slideUp">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 min-w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <MdCheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedKot.length} item
                          {selectedKot.length > 1 ? "s" : ""} selected
                        </p>
                        <p className="text-xs text-gray-500">
                          Ready for payment
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedKot([]);
                        refreshHook();
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-32 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <div className="space-y-2">
                      {selectedKot.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg"
                        >
                          <span className="font-medium text-gray-700">
                            #{item.voucherNumber}
                          </span>
                          <span className="text-gray-500 capitalize">
                            {item.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {userRole === "reception" && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg mb-2 border border-green-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-green-800">
                          Subtotal
                        </span>
                        <span className="font-semibold text-green-900">
                          ₹
                          {selectedKot
                            .reduce((total, kot) => {
                              const order = filteredOrders.find(
                                (o) => o._id === kot.id,
                              );
                              return total + (order?.total || 0);
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="border border-red-200 rounded-lg p-3 mb-2 bg-red-50">
                        <label className="block text-xs font-semibold text-red-700 mb-2">
                          Discount
                        </label>
                        <div className="flex flex-col gap-2">
                          <select
                            value={selectedAdditionalChargeData}
                            onChange={(e) =>
                              setSelectedAdditionalChargeData(e.target.value)
                            }
                          >
                            <option value="">Select Discount</option>
                            {additionalCharges.map((charge) => (
                              <option key={charge._id} value={charge._id}>
                                {charge.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <div className="flex bg-gray-200 rounded-lg p-1">
                              <button
                                onClick={() => {
                                  setDiscountType("amount");
                                  if (discountValue > 0)
                                    setDiscountAmount(discountValue);
                                }}
                                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${discountType === "amount" ? "bg-white text-red-600 shadow-sm" : "text-gray-600"}`}
                              >
                                ₹
                              </button>
                              <button
                                onClick={() => {
                                  setDiscountType("percentage");
                                  setDiscountAmount(0);
                                  setDiscountValue(0);
                                }}
                                className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${discountType === "percentage" ? "bg-white text-red-600 shadow-sm" : "text-gray-600"}`}
                              >
                                %
                              </button>
                            </div>
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                {discountType === "percentage" ? "%" : "₹"}
                              </span>
                              <TouchInput
                                type="number"
                                value={discountValue || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setDiscountValue(value);

                                  // Get selected KOT items
                                  const itemList = selectedKot
                                    .map((kot) =>
                                      filteredOrders.find(
                                        (o) => o._id === kot.id,
                                      ),
                                    )
                                    .filter(Boolean);

                                  let subtotal = 0;

                                  const flatItems = itemList
                                    .map((x) => x.items || [])
                                    .flat();

                                  if (discountBasedOnGrossAmount) {
                                    subtotal = flatItems.reduce(
                                      (acc, item) =>
                                        acc +
                                        Number(
                                          item.total ||
                                            item.individualTotal ||
                                            0,
                                        ),
                                      0,
                                    );
                                  } else {
                                    subtotal = flatItems.reduce((acc, item) => {
                                      const total = Number(
                                        item.total || item.individualTotal || 0,
                                      );

                                      // ✅ get accurate IGST
                                      const igst =
                                        Number(
                                          item?.GodownList?.[0]?.igstAmount,
                                        ) ||
                                        Number(item?.igstAmount) ||
                                        Number(item?.totalIgstAmt) ||
                                        0;

                                      return acc + (total - igst);
                                    }, 0);
                                  }

                                  // Calculate discount amount
                                  const calculatedAmount =
                                    discountType === "percentage"
                                      ? (subtotal * value) / 100
                                      : value;

                                  const findOne = additionalCharges.find(
                                    (charge) =>
                                      charge._id ===
                                      selectedAdditionalChargeData,
                                  );

                                  const tax = Number(
                                    findOne?.taxPercentage || 0,
                                  );

                                  // Add tax to discount amount
                                  const finalDiscountAmount =
                                    calculatedAmount * (1 + tax / 100);

                                  setDiscountAmount(
                                    finalDiscountAmount.toFixed(2),
                                  );

                                  if (value > 0) {
                                    setSelectedDiscountCharge({
                                      name: `Manual Discount (${
                                        discountType === "percentage"
                                          ? `${value}%`
                                          : `₹${value}`
                                      })`,
                                      amount: value,
                                      type: discountType,
                                    });
                                  } else {
                                    setSelectedDiscountCharge(null);
                                  }
                                }}
                                placeholder={
                                  discountType === "percentage" ? "0" : "0.00"
                                }
                                className="w-full pl-7 pr-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-400 text-sm"
                                min="0"
                                max={
                                  discountType === "percentage"
                                    ? "100"
                                    : undefined
                                }
                                step={
                                  discountType === "percentage" ? "1" : "0.01"
                                }
                              />
                            </div>
                          </div>
                          {discountValue > 0 && (
                            <div className="p-2 bg-red-100 rounded-lg">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-red-700">
                                  {discountType === "percentage"
                                    ? `${discountValue}% discount`
                                    : "Discount"}{" "}
                                  (
                                  {
                                    additionalCharges.find(
                                      (c) =>
                                        c._id === selectedAdditionalChargeData,
                                    )?.taxPercentage
                                  }
                                  %)
                                </span>
                                <span className="font-semibold text-red-800">
                                  - ₹{discountAmount}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-green-800 mb-1">
                          Remarks
                        </label>
                        <TouchInput
                          type="text"
                          placeholder="Enter note (optional)"
                          className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isComplimentary}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setIsComplimentary(isChecked);
                              const hasAuto = selectedKot.some((kot) => {
                                const order = filteredOrders.find(
                                  (o) => o._id === kot.id,
                                );
                                return (
                                  order?.foodPlanDetails?.isComplimentary ===
                                  true
                                );
                              });
                              if (!hasAuto && isChecked)
                                toast.info("Marking order as complimentary");
                              else if (hasAuto && !isChecked)
                                toast.warning(
                                  "This order has a complimentary food plan",
                                );
                            }}
                            className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                          />
                          <span className="text-sm font-semibold text-green-700">
                            Mark as Complimentary
                          </span>
                        </label>
                      </div>
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSpecific}
                            onChange={(e) => {
                              refreshHook();
                              setIsSpecific(e.target.checked);
                            }}
                            className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
                          />
                          <span className="text-sm font-semibold text-green-700">
                            Item-wise split
                          </span>
                        </label>
                      </div>
                      <div className="border-t border-green-300 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-green-800">
                            Total Amount
                          </span>
                          <span className="text-lg font-bold text-green-900">
                            ₹
                            {(
                              selectedKot.reduce((total, kot) => {
                                const order = filteredOrders.find(
                                  (o) => o._id === kot.id,
                                );
                                return total + (order?.total || 0);
                              }, 0) - (discountAmount || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="text-xs text-green-700 text-right mt-1">
                            (After ₹{discountAmount} discount)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedKot([]);
                        refreshHook();
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      Clear All
                    </button>
                    <button
                      className="flex-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                      onClick={() => {
                        const findOneWithNoRoomService = selectedKot.find(
                          (kot) => !kot.roomId,
                        );
                        if (findOneWithNoRoomService) {
                          handleSalesPreview();
                          toast.warning(
                            "Continue to room option only for room service",
                          );
                        } else setConformationModal(true);
                      }}
                    >
                      <MdPayment className="w-4 h-4" />
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {conformationModal && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-lg w-96 p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-800">
                    How would you like to proceed?
                  </h2>
                  <p className="text-sm text-gray-600">
                    Choose to continue with payment or post the bill to the
                    room.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleSalesPreview(false)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md"
                    >
                      Continue to Payment
                    </button>
                    <button
                      onClick={() => handleSalesPreview(true)}
                      className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-all duration-200"
                    >
                      Post to Room
                    </button>
                    <button
                      onClick={() => setConformationModal(false)}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <style jsx>{`
              @keyframes slideUp {
                from {
                  transform: translateY(100px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
              .animate-slideUp {
                animation: slideUp 0.3s ease-out;
              }
            `}</style>
          </div>
          {showPaymentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-gray-800">
                    Payment Processing
                  </h2>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentMode("single");
                      setCashAmount(0);
                      setOnlineAmount(0);
                      setPaymentError("");
                      // Reset split payment selections
                      setSelectedCash("");
                      setSelectedBank("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* KOT Section */}
                <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center text-blue-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">
                      KOT :{" "}
                      {selectedDataForPayment?.voucherNumber?.map(
                        (item, index) => (
                          <span
                            key={item?.id || index}
                            className="text-sm font-medium"
                          >
                            {item?.voucherNumber}
                            {","}
                          </span>
                        ),
                      )}
                    </span>
                  </div>
                </div>

                {/* Payment Mode Selection */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        setPaymentMode("single");
                        setCashAmount(0);
                        setOnlineAmount(0);
                        setPaymentError("");
                        // Reset split payment selections
                        // setSelectedCash("");
                        // setSelectedBank("");
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        paymentMode === "single"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      Single Payment
                    </button>
                    <button
                      onClick={() => {
                        setPaymentMode("split");
                        setPaymentError("");
                        setCashAmount(0);
                        setOnlineAmount(0);
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        paymentMode === "split"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      Split Payment
                    </button>
                    <button
                      onClick={() => {
                        setPaymentMode("credit");
                        setCashAmount(0);
                        setOnlineAmount(0);
                        setPaymentError("");
                        setPaymentMethod("credit");
                        // Reset split payment selections
                        // setSelectedCash("");
                        // setSelectedBank("");
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        paymentMode === "credit"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      Credit Payment
                    </button>
                  </div>
                </div>

                {/* Single Payment Method Selection */}
                {paymentMode === "single" && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod("cash")}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                          paymentMethod === "cash"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Banknote className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium">Cash</span>
                      </button>
                      <button
                        onClick={() => {
                          setPaymentMethod("card");
                        }}
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                          paymentMethod === "card"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <CreditCard className="w-6 h-6 mb-1" />
                        <span className="text-xs font-medium">
                          Online Payment
                        </span>
                      </button>
                    </div>

                    {/* Cash Payment Dropdown */}
                    {paymentMethod === "cash" && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Cash
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          value={selectedCash}
                          onChange={(e) => setSelectedCash(e.target.value)}
                        >
                          {cashOrBank?.cashDetails?.map((cashier) => (
                            <option key={cashier._id} value={cashier._id}>
                              {cashier.partyName} - ({cashier.under})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Online Payment Dropdown */}
                    {paymentMethod === "card" && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Bank/Payment Method
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          value={selectedBank}
                          onChange={(e) => {
                            setSelectedBank(e.target.value);
                          }}
                        >
                          <option value="" disabled>
                            Select Payment Method
                          </option>
                          {cashOrBank?.bankDetails?.map((cashier) => (
                            <option key={cashier._id} value={cashier._id}>
                              {cashier.partyName} - ({cashier.under})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Split Payment Amount Inputs */}
                {paymentMode === "split" && (
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Split Payment Details
                    </label>

                    {(() => {
                      // ✅ Restaurant: only use selectedDataForPayment.total
                      const orderTotal =
                        Number(selectedDataForPayment?.total) || 0;

                      const totalEntered = splitPaymentRows.reduce(
                        (sum, row) => sum + (parseFloat(row.amount) || 0),
                        0,
                      );

                      const difference = parseFloat(
                        (orderTotal - totalEntered).toFixed(2),
                      );
                      const isFullyPaid = difference <= 0;

                      // ✅ Restaurant: no customer field required — only source + amount
                      const lastRow =
                        splitPaymentRows[splitPaymentRows.length - 1];
                      const lastRowValid =
                        lastRow &&
                        lastRow.source?.trim() !== "" &&
                        parseFloat(lastRow.amount) > 0 &&
                        (lastRow.source !== "credit" || lastRow.creditor);

                      const incompleteFields = (row) => {
                        const missing = [];
                        if (!row.source?.trim()) missing.push("source");
                        if (!(parseFloat(row.amount) > 0))
                          missing.push("amount");
                        return missing;
                      };

                      return (
                        <>
                          {isFullyPaid && (
                            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl">
                              <svg
                                className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span className="text-[12px] font-medium text-green-700 dark:text-green-300">
                                Full amount allocated — no further entries
                                allowed.
                              </span>
                            </div>
                          )}

                          {/* ✅ Column headers — same style as hotel, no Customer column */}
                          <div className="grid grid-cols-8 gap-2 mb-1.5 px-1">
                            <div className="col-span-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              Source
                            </div>
                            <div className="col-span-3 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                              Amount
                            </div>
                            <div className="col-span-1"></div>
                          </div>

                          <div className="space-y-2.5">
                            {splitPaymentRows.map((row, index) => {
                              const sourceObj = combinedSources.find(
                                (s) => s.id === row.source,
                              );
                              const sourceType = sourceObj?.type || "";

                              const rowLocked =
                                isFullyPaid &&
                                index !== splitPaymentRows.length - 1;

                              const isLastRow =
                                index === splitPaymentRows.length - 1;
                              const missing =
                                isLastRow && !lastRowValid
                                  ? incompleteFields(row)
                                  : [];
                              const missingSource = missing.includes("source");
                              const missingAmount = missing.includes("amount");

                              return (
                                <div
                                  key={index}
                                  className={`border rounded-xl p-3 transition-colors ${
                                    rowLocked
                                      ? "bg-gray-100 dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 opacity-70"
                                      : "bg-gray-50 dark:bg-neutral-800 border-gray-100 dark:border-neutral-700"
                                  }`}
                                >
                                  {/* Source + Amount + Delete row */}
                                  <div className="grid grid-cols-8 gap-2 items-center">
                                    {/* Source */}
                                    <div className="col-span-4">
                                      <select
                                        disabled={rowLocked}
                                        value={row.source}
                                        onChange={(e) =>
                                          updateSplitPaymentRow(
                                            index,
                                            "source",
                                            e.target.value,
                                          )
                                        }
                                        className={`w-full px-2 py-1.5 border rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                          rowLocked
                                            ? "border-gray-200 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 text-gray-400 cursor-not-allowed"
                                            : missingSource
                                              ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950 text-gray-800 dark:text-gray-200 ring-1 ring-red-300"
                                              : "border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200"
                                        }`}
                                      >
                                        <option value="">Source</option>
                                        {combinedSources.map((source) => (
                                          <option
                                            key={source.id}
                                            value={source.id}
                                          >
                                            {source.name} ({source?.type})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Amount */}
                                    <div className="col-span-3">
                                      <div className="relative">
                                        <span
                                          className={`absolute left-2 top-1/2 -translate-y-1/2 text-[11px] ${
                                            rowLocked
                                              ? "text-gray-300 dark:text-gray-600"
                                              : "text-gray-400"
                                          }`}
                                        >
                                          ₹
                                        </span>
                                        <TouchInput
                                          type="number"
                                          disabled={rowLocked}
                                          value={row.amount}
                                          onChange={(e) => {
                                            const newVal =
                                              parseFloat(e.target.value) || 0;
                                            const otherRowsTotal =
                                              splitPaymentRows.reduce(
                                                (sum, r, i) =>
                                                  i === index
                                                    ? sum
                                                    : sum +
                                                      (parseFloat(r.amount) ||
                                                        0),
                                                0,
                                              );
                                            const maxAllowed = parseFloat(
                                              (
                                                orderTotal - otherRowsTotal
                                              ).toFixed(2),
                                            );
                                            const clamped = Math.min(
                                              newVal,
                                              maxAllowed,
                                            );
                                            updateSplitPaymentRow(
                                              index,
                                              "amount",
                                              clamped > 0
                                                ? clamped
                                                : e.target.value,
                                            );
                                          }}
                                          className={`w-full pl-5 pr-2 py-1.5 border rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                                            rowLocked
                                              ? "border-gray-200 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 text-gray-400 cursor-not-allowed"
                                              : missingAmount
                                                ? "border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950 text-gray-800 dark:text-gray-200 ring-1 ring-red-300"
                                                : "border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200"
                                          }`}
                                          placeholder="0.00"
                                          min="0"
                                          step="0.01"
                                        />
                                      </div>
                                    </div>

                                    {/* Delete */}
                                    <div className="col-span-1 flex justify-center">
                                      {splitPaymentRows.length > 1 && (
                                        <button
                                          onClick={() =>
                                            removeSplitPaymentRow(index)
                                          }
                                          className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                          title="Remove row"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Cash → Remarks */}
                                  {sourceType === "cash" && (
                                    <div className="mt-2.5">
                                      <label className="block text-[11px] text-gray-500 mb-1">
                                        Remarks
                                      </label>
                                      <TouchInput
                                        type="text"
                                        disabled={rowLocked}
                                        value={row.remarks || ""}
                                        onChange={(e) =>
                                          updateSplitPaymentRow(
                                            index,
                                            "remarks",
                                            e.target.value,
                                          )
                                        }
                                        className={`w-full px-3 py-1.5 border rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                          rowLocked
                                            ? "bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 text-gray-400 cursor-not-allowed"
                                            : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-600 text-gray-800 dark:text-gray-200"
                                        }`}
                                        placeholder="Remarks"
                                      />
                                    </div>
                                  )}
                                  {sourceType === "credit" && (
                                    <div className="mt-2.5">
                                      <label className="block text-[11px] text-gray-500 mb-1">
                                        Creditor
                                      </label>
                                      <CustomerSearchInputBox
                        inputComponent={TouchInput}
                                        onSelect={(party) => {
                                          updateSplitPaymentRow(
                                            index,
                                            "creditor",
                                            party,
                                          );
                                        }}
                                        selectedParty={{}}
                                        isAgent={false}
                                        placeholder="Search customers..."
                                        sendSearchToParent={() => {}}
                                      />
                                    </div>
                                  )}

                                  {/* Bank → Ref No + Remarks */}
                                  {sourceType === "bank" && (
                                    <div className="grid grid-cols-2 gap-2 mt-2.5">
                                      {["refNo", "remarks"].map((field) => (
                                        <div key={field}>
                                          <label className="block text-[11px] text-gray-500 mb-1">
                                            {field === "refNo"
                                              ? "Ref. No"
                                              : "Remarks"}
                                          </label>
                                          <TouchInput
                                            type="text"
                                            disabled={rowLocked}
                                            value={row[field] || ""}
                                            onChange={(e) =>
                                              updateSplitPaymentRow(
                                                index,
                                                field,
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full px-2 py-1.5 border rounded-lg text-[11px] focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                              rowLocked
                                                ? "bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-600 text-gray-400 cursor-not-allowed"
                                                : "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-600 text-gray-800 dark:text-gray-200"
                                            }`}
                                            placeholder={
                                              field === "refNo"
                                                ? "Ref. No"
                                                : "Remarks"
                                            }
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Row */}
                          {!isFullyPaid && (
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  if (lastRowValid) addSplitPaymentRow();
                                }}
                                className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                                  lastRowValid
                                    ? "text-blue-600 hover:text-blue-700 cursor-pointer"
                                    : "text-gray-400 cursor-not-allowed"
                                }`}
                                title={
                                  !lastRowValid
                                    ? "Fill Source and Amount first"
                                    : ""
                                }
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Payment Row
                              </button>
                              {!lastRowValid && (
                                <p className="mt-1 text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3 shrink-0"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  Source and Amount are required before adding a
                                  new row.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Summary */}
                          <div className="bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-3 mt-3 space-y-1.5">
                            <div className="flex justify-between text-[12px] text-gray-500 dark:text-gray-400">
                              <span>Total Entered</span>
                              <span>₹ {totalEntered.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[12px] font-medium text-gray-700 dark:text-gray-300 pt-1 border-t border-gray-200 dark:border-neutral-700">
                              <span>Order Total</span>
                              <span>₹ {orderTotal.toFixed(2)}</span>
                            </div>
                            <div
                              className={`flex justify-between text-[12px] font-semibold pt-1 border-t border-gray-200 dark:border-neutral-700 ${
                                isFullyPaid
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              <span>Difference</span>
                              <span className="flex items-center gap-1">
                                {isFullyPaid && (
                                  <svg
                                    className="w-3.5 h-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                                ₹ {difference.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {paymentMode === "credit" && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Creditor
                      </label>
                      <button
                        onClick={() => {
                          sessionStorage.setItem(
                            "returnToPaymentModal",
                            "true",
                          );
                          sessionStorage.setItem(
                            "paymentModalData",
                            JSON.stringify({
                              selectedDataForPayment,
                              paymentMode,
                              selectedKot,
                              discountAmount,
                              note,
                            }),
                          );

                          navigate("/sUsers/addParty", {
                            state: { from: "/sUsers/kotPage" },
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-xs font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Creditor</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Creditor
                      </label>
                      <CustomerSearchInputBox
                        inputComponent={TouchInput}
                        onSelect={(party) => {
                          setSelectedCreditor(party);
                        }}
                        selectedParty={{}}
                        isAgent={false}
                        placeholder="Search customers..."
                        sendSearchToParent={() => {}}
                      />
                      <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                        Can't find customer? Click "New Creditor" to add one
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {paymentError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-xs">{paymentError}</p>
                  </div>
                )}

                {/* Order Summary */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="space-y-1">
                    {selectedDataForPayment?.type === "dine-in" && (
                      <div className="flex justify-between text-xs">
                        <span>Table Number:</span>
                        <span className="font-medium">
                          {selectedDataForPayment?.tableNumber}
                        </span>
                      </div>
                    )}
                    {selectedDataForPayment?.type !== "roomService" &&
                      selectedDataForPayment?.type !== "dine-in" && (
                        <>
                          <div className="flex justify-between text-xs">
                            <span>Customer:</span>
                            <span className="font-medium">
                              {selectedDataForPayment?.customer?.name}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Phone:</span>
                            <span className="font-medium">
                              {selectedDataForPayment?.customer?.phone}
                            </span>
                          </div>
                        </>
                      )}
                    {selectedDataForPayment?.type === "delivery" && (
                      <div className="flex justify-between text-xs">
                        <span>Address:</span>
                        <span className="font-medium text-right max-w-48">
                          {selectedDataForPayment?.customer?.address}
                        </span>
                      </div>
                    )}
                    {selectedDataForPayment?.type === "roomService" && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span>Room No:</span>
                          <span className="font-medium text-right max-w-48">
                            {selectedDataForPayment?.roomDetails?.roomno}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Guest Name:</span>
                          <span className="font-medium text-right max-w-48">
                            {selectedDataForPayment?.roomDetails?.guestName}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-gray-800">
                    <span className="text-sm">Total Amount </span>
                    <span className="text-base text-blue-600">
                      ₹{Math.round(selectedDataForPayment?.total)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        handleSavePayment(selectedDataForPayment?._id);
                      }}
                      disabled={saveLoader}
                      className={`flex-1 group px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1 ${
                        saveLoader
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                          : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 hover:scale-105"
                      }`}
                    >
                      {saveLoader ? (
                        <>
                          <div className="w-3 h-3 border border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <MdVisibility className="w-3 h-3 group-hover:rotate-12 transition-transform duration-200" />
                          Process Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 text-lg mb-2">No orders found</div>
              <div className="text-gray-500 text-sm">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No orders match the current filter"}
              </div>
            </div>
          )}
          <AnimatePresence>
            {showCancelModal && selectedOrderForCancel && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800">
                      Cancel KOT #{selectedOrderForCancel.voucherNumber}
                    </h2>
                    <button
                      onClick={() => {
                        setShowCancelModal(false);
                        setSelectedOrderForCancel(null);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MdClose className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Cancellation{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <TouchInput as="textarea"
                      value={cancelReason}
                      onChange={(e) => {
                        setCancelReason(e.target.value);
                        setCancelError("");
                      }}
                      placeholder="Please provide a reason for cancelling this KOT..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows="4"
                    />
                    {cancelError && (
                      <p className="text-red-500 text-xs mt-1">{cancelError}</p>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> This will cancel the KOT from the
                      report only. The data will remain in the database.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCancelModal(false);
                        setSelectedOrderForCancel(null);
                        setCancelReason("");
                        setCancelError("");
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleKotCancel}
                      disabled={cancelReload}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        cancelReload
                          ? "bg-red-400 cursor-not-allowed opacity-80"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                    >
                      {cancelReload ? (
                        <>
                          <svg
                            className="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <MdCancel className="w-4 h-4" />
                          Confirm Cancel
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
      {showPrintConfirmModal && <PrintModal onSubmit={handlePrintShow} />}
      {showBatchWiseKotPrint && dataForBatchWisePrint && selectedMode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"></div>
          <KitchenBatchesViewForPrintAndEdit
            order={dataForBatchWisePrint}
            setShowBatchWiseKotPrint={setShowBatchWiseKotPrint}
            onPrintBatch={handleKotPrint}
            onEditBatch={handleEditKot}
            mode={selectedMode}
            setSelectedMode={setSelectedMode}
            setDataForBatchWisePrint={setDataForBatchWisePrint}
          />
        </div>
      )}
      {isSpecific && (
        <ItemSelector
          items={selectedKot}
          kotData={filteredOrders}
          onChange={handleSpecificItemSale}
          onClose={() => setIsSpecific(false)}
        />
      )}
    </>
  );
};

export default function OrdersDashboardWithKeyboard() {
  return <TouchKeyboardScope><OrdersDashboard /></TouchKeyboardScope>;
}
