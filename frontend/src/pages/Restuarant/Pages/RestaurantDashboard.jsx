import TouchKeyboardScope from "@/components/common/touchKeyboard/TouchKeyboardScope";
import TouchInput from "@/components/common/touchKeyboard/TouchInput";
import { useState, useEffect, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";

import VoucherThreeInchPdf from "@/pages/voucher/voucherPdf/threeInchPdf/VoucherThreeInchPdf";

import {
  Plus,
  Minus,
  ShoppingCart,
  Search,
  Clock,
  Users,
  Filter,
  X,
  Menu,
  MenuIcon,
  Receipt,
  Home,
  Package,
  Car,
  Bed,
  ArrowLeft,
  Tag,
  ChevronDown,
  Coffee,
  BarChart2,
  LayoutGrid,
  ListChecks,
  Loader2,
} from "lucide-react";

import TableSelection from "../Pages/TableSelection";
import { Timer } from "../../../components/common/time/Timer";

import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import api from "@/api/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/layout/Layout";
import useFetch from "@/customHook/useFetch";
import { generateAndPrintKOT } from "../Helper/kotPrintHelper";
import { taxCalculatorForRestaurant } from "@/pages/Hotel/Helper/taxCalculator";
import { useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { useQueryClient } from "@tanstack/react-query";
import ParentKotPage from "../components/ParentKotPage";
import { applyBatchEdit } from "@/pages/Restuarant/Helper/RestaurantDashBoardHelper.jsx";
import RestaurantReportsMenu from "../components/RestaurantReports";
import qz from "qz-tray";
const RestaurantPOS = () => {
  const sidebar = useSidebar();
  const [selectedCuisine, setSelectedCuisine] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [salePrintData, setSalePrintData] = useState(null);
  const [showVoucherPdf, setShowVoucherPdf] = useState(false);
  const contentToPrint = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showFullTableSelection, setShowFullTableSelection] = useState(false);
  const [selectedDataForPayment, setSelectedDataForPayment] = useState({});
  // Mobile responsive states
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [billFormat, setBillFormat] = useState("format1");
  const [showOptions, setShowOptions] = useState(false);
  const [searchTerms, setSearchTerms] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loader, setLoader] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  // const [currentTime, setCurrentTime] = useState(new Date())
  const [showKOTModal, setShowKOTModal] = useState(false);
  // const [orderType, setOrderType] = useState("dine-in");
  const [loading, setLoading] = useState(false);
  const [optionData, setOptionsData] = useState({});

  const [roomData, setRoomData] = useState({});
  const [showPriceLevelSelect, setShowPriceLevelSelect] = useState(false);
  const [priceLevelData, setPriceLevelData] = useState([]);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState(null);
  const kotDataForEdit = location.state?.kotData;
  const kotFullData = location.state?.order;
  const editBatchNo = location.state?.batchNo;

  // Add these states near the other state declarations
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentMode, setPaymentMode] = useState("single");
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);
  const [paymentError, setPaymentError] = useState("");
  const [saveLoader, setSaveLoader] = useState(false);
  const [selectedCash, setSelectedCash] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [cashOrBank, setCashOrBank] = useState({});
  const [discountType, setDiscountType] = useState("amount"); // "amount" | "percentage"
  const [discountValue, setDiscountValue] = useState(0); // user input
  const [additionalChargeData, setAdditionalChargeData] = useState([]);
  const [selectedAdditionalCharge, setSelectedAdditionalCharge] =
    useState(null);
  const [showParentKots, setShowParentKots] = useState(false);
  const [isGeneratingKot, setIsGeneratingKot] = useState(false);
  const [
    additionalChargeDataBasedOnSelection,
    setAdditionalChargeDataBasedOnSelection,
  ] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const observerTarget = useRef(null);
  const scrollContainerRef = useRef(null);
  const isGeneratingKotRef = useRef(false);
  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 150;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    address: "",
    tableNumber: "10",
  });
  const [roomDetails, setRoomDetails] = useState({
    roomno: "",
    guestName: "",
    CheckInNumber: "",
    foodPlan: "",
  });
  const [orders, setOrders] = useState([]);
  const [orderNumber, setOrderNumber] = useState(1001);

  const org = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const cmp_id = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg._id,
  );

  const userType = useSelector(
    (state) => state.s,
  );
  console.log(userType);
  const discountBasedOnGrossAmount =
    org?.configurations?.[0]?.discountBasedOnGrossAmount ?? false;

  const industry = org?.industry;
  const shouldFetch = Boolean(cmp_id);

  const getIndustryTitle = () => {
    if (industry === 6) return "HMS";
    if (industry === 7) return "RMS";
    if (industry === 8) return "CMS";
    return "RMS";
  };

  const getIndustrySubtitle = () => {
    if (industry === 6) return "Hotel";
    if (industry === 7) return "Hotel & Restaurant";
    if (industry === 8) return "Cafe & Bakery";
    return "Restaurant";
  };

  const queryClient = useQueryClient();
  const isAdmin =
    JSON.parse(localStorage.getItem("sUserData")).role === "admin"
      ? true
      : false;
  useEffect(() => {
    if (kotDataForEdit) {
      setIsEdit(true);
      setOrderItems(kotDataForEdit.items);
      setOrderType(kotDataForEdit.type);
      setCustomerDetails({
        name: kotDataForEdit?.customer?.name,
        phone: kotDataForEdit?.customer?.phone,
        address: kotDataForEdit?.customer?.address,
        tableNumber: kotDataForEdit?.tableNumber,
      });
      // setRoomDetails({
      //   _id: kotDataForEdit?.roomId?._id || "",
      //   guestName: kotDataForEdit?.guestId?.name || "",
      //   CheckInNumber: kotDataForEdit?.checkInNumber || "",
      // });
    }
  }, [kotDataForEdit]);

  useEffect(() => {
    const callAdditionalCharge = async () => {
      const response = await api.get(
        `/api/sUsers/additionalcharges/${cmp_id}`,
        {
          withCredentials: true,
        },
      );
      setAdditionalChargeData(response?.data?.additionalCharges);
      console.log(response?.data?.additionalCharges);
      let discountCharge = response?.data?.additionalCharges.find(
        (charge) => charge.name.toLowerCase() === "discount" || "DISCOUNT",
      );
      console.log(discountCharge);
      console.log(response?.data?.additionalCharges);
      setSelectedAdditionalCharge(
        discountCharge?._id || response?.data?.additionalCharges[0]?._id,
      );
    };
    callAdditionalCharge();
  }, []);

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

  // Add this useFetch hook with other data fetching
  const { data: paymentTypeData } = useFetch(
    shouldFetch ? `/api/sUsers/getPaymentType/${cmp_id}` : null,
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

  const companyName = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg?.name,
  );
  const { configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );
  const config = configurations?.[0] || {};
  const orderTypesConfig = config.orderTypes || {};
  const hasAlternativeOrderType = [
    "dineIn",
    "takeaway",
    "delivery",
    "roomService",
  ].some((type) => orderTypesConfig[type] !== false);
  const selectedKotPrinter = configurations?.[0]?.kotPrinter || "";

  const getDefaultOrderType = () => {
    if (orderTypesConfig?.dineIn) return "dine-in";
    if (orderTypesConfig?.takeaway) return "takeaway";
    if (orderTypesConfig?.delivery) return "delivery";
    if (orderTypesConfig?.roomService) return "roomService";
    if (orderTypesConfig?.directSale) return "direct-sale";
    return "";
  };

  const [orderType, setOrderType] = useState(getDefaultOrderType());

  const subcategoryIcons = {
    Pizza: "🍕",
    noodles: "🍜",
    Burger: "🍔",
    Salad: "🥗",
    Dessert: "🍰",
    Drinks: "🥤",
    Snacks: "🍟",
    Biriyani: "🍲",
    Default: "🍽️",
  };

  useEffect(() => {
    if (salePrintData) {
      billFormat === "format1"
        ? navigate(`/sUsers/sharesalesThreeInch/${salePrintData._id}`)
        : navigate(`/sUsers/sharesalesThreeInch2/${true}`, {
            state: salePrintData,
          });
    }
  }, [salePrintData, navigate]);
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchPriceList();
  }, []);

  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Filter rooms based on search
  const filteredRooms = Array.isArray(roomData)
    ? roomData.filter(
        (room) =>
          room.roomName?.toLowerCase().includes(search?.toLowerCase()) ||
          room.customerName?.toLowerCase().includes(search?.toLowerCase()) ||
          room.voucherNumber?.toLowerCase().includes(search?.toLowerCase()),
      )
    : [search];
  console.log(filteredRooms);

  const handlePrint = useReactToPrint({
    content: () => contentToPrint.current,
    onAfterPrint: () => {
      setShowVoucherPdf(false);
      setSalePrintData(null);
    },
  });

  const handlePrintData = async (saleId) => {
    try {
      let res = await api.get(
        `/api/sUsers/getSalePrintData/${cmp_id}/${saleId}`,
        {
          withCredentials: true,
        },
      );
      setSalePrintData(res?.data?.data); // triggers navigation useEffect
      setShowVoucherPdf(true);
      setTimeout(() => {
        handlePrint();
      }, 500);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load sale print data!");
    }
  };
  const handleSelectRoom = (room) => {
    console.log("=== SELECTING ROOM ===");
    console.log("Selected room object:", room);
    console.log("Food plan from room:", room?.foodPlan);

    const foodPlanData = room?.foodPlan ? room?.foodPlan : null;

    console.log("Processed food plan data:", foodPlanData);
    // ✅ Create fresh object without spread operator
    setRoomDetails({
      _id: room?.roomId || "",
      roomno: room?.roomName || "",
      guestName: room?.guestName || "",
      CheckInNumber: room?.voucherNumber || "",
      foodPlan: foodPlanData, // ✅ Store processed food plan
    });

    setSearch(
      `${room.roomName} - ${room.customerName} - ${room.voucherNumber}`,
    );
    setShowResults(false);
  };
  const fetchPriceList = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/api/sUsers/getProductSubDetails/${cmp_id}?type=${"pricelevel"}`,
        {
          withCredentials: true,
        },
      );
      setPriceLevelData(res?.data?.data);
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      const subDetailsPromise = api.get(
        `/api/sUsers/getAllSubDetailsBasedUnder/${cmp_id}`,
        {
          withCredentials: true,
          params: {
            under: "restaurant",
          },
        },
      );
      const hsnResPromise = api.get(`/api/sUsers/fetchHsn/${cmp_id}`, {
        withCredentials: true,
      });

      const [subDetailsRes, hsnRes] = await Promise.all([
        subDetailsPromise,
        hsnResPromise,
      ]);

      const { categories, subcategories, priceLevels } =
        subDetailsRes.data.data;
      setOptionsData((prev) => ({
        ...prev,
        category: categories,
        subcategory: subcategories,
        priceLevel: priceLevels,
        hsn: hsnRes.data.data,
      }));

      if (categories && categories.length > 0) {
        setSelectedCuisine({
          categoryId: categories[0]._id,
          categoryName: categories[0].name,
        });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(error.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [cmp_id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchAllItems = useCallback(
    async (page = 1, append = false) => {
      if (!append) {
        setLoader(true);
      }
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        params.append("under", "restaurant");
        params.append("page", page);
        params.append("limit", "1000");

        const res = await api.get(
          `/api/sUsers/getAllItems/${cmp_id}?${params}`,
          {
            withCredentials: true,
          },
        );

        const fetchedItems = res?.data?.items || [];
        const hasMoreData = res?.data?.pagination?.hasMore ?? false;
        console.log("Fetched items:", fetchedItems);

        if (append) {
          // ✅ Prevent duplicates by filtering out existing items
          setAllItems((prev) => {
            const existingIds = new Set(prev.map((item) => item._id));
            const newItems = fetchedItems.filter(
              (item) => !existingIds.has(item._id),
            );
            return [...prev, ...newItems];
          });
          setItems((prev) => {
            const existingIds = new Set(prev.map((item) => item._id));
            const newItems = fetchedItems.filter(
              (item) => !existingIds.has(item._id),
            );
            return [...prev, ...newItems];
          });
        } else {
          setAllItems(fetchedItems);
          setItems(fetchedItems);
        }

        setHasMore(hasMoreData);
      } catch (error) {
        console.log("Error fetching items:", error);
        setHasMore(false);
        if (!append) {
          setAllItems([]);
          setItems([]);
        }
      } finally {
        setIsLoading(false);
        setLoader(false);
      }
    },
    [cmp_id],
  );

  useEffect(() => {
    if (!observerTarget.current || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchAllItems(nextPage, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, currentPage, searchTerm, fetchAllItems]);

  // Initial load only
  useEffect(() => {
    fetchAllItems(1, false);
  }, [fetchAllItems]);

  const {
    data: roomBookingData,
    // loading: roomLoading,
    error,
  } = useFetch(
    shouldFetch ? `/api/sUsers/getRoomBasedOnBooking/${cmp_id}` : null,
  );

  useEffect(() => {
    if (roomBookingData) {
      const rooms = roomBookingData?.data?.flatMap((room) => {
        console.log("Processing booking, foodPlan array:", room?.foodPlan);

        return (
          room?.selectedRooms
            ?.filter((selectedRoom) => !selectedRoom.isSwapped)
            ?.map((selectedRoom) => {
              const completeFoodPlan = [];

              room.foodPlan?.forEach((data) => {
                // Find matching food plan for this room
                const roomFoodPlan =
                  data.roomId === selectedRoom.roomId ? data : null;

                // Build complete food plan object
                if (roomFoodPlan) {
                  completeFoodPlan.push({
                    _id: roomFoodPlan._id || roomFoodPlan.foodPlanId,
                    planType: roomFoodPlan.planType || roomFoodPlan.foodPlan,
                    amount: roomFoodPlan.amount ?? roomFoodPlan.rate ?? 0,
                    isComplimentary: roomFoodPlan.isComplimentary || false,
                  });
                }
              });
              console.log(room);

              return {
                ...selectedRoom,
                customerName: room?.customerName,
                guestName: room?.guestName,
                mobileNumber: room?.mobileNumber,
                voucherNumber: room?.voucherNumber,
                foodPlan: completeFoodPlan,
                bookingDate: room?.bookingDate,
                arrivalDate: room?.arrivalDate,
                checkOutDate: room?.checkOutDate,
                stayDays: room?.stayDays,
              };
            }) || []
        );
      });

      console.log("=== ALL PROCESSED ROOMS ===");
      setRoomData(rooms);
    }
  }, [roomBookingData]);

  useEffect(() => {
    if (error) {
      toast.error(error.response?.data?.message || "Failed to load data");
    }
  }, [error]);

  useEffect(() => {
    let filteredItems = [...allItems];
    if (selectedSubcategory) {
      const selectedSubcatId = getSelectedSubcategoryId();
      filteredItems = filteredItems.filter(
        (item) => item.sub_category === selectedSubcatId,
      );
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm?.toLowerCase().trim();
      filteredItems = filteredItems.filter(
        (item) =>
          item.product_name?.toLowerCase().includes(searchLower) ||
          (item.description &&
            item.description?.toLowerCase().includes(searchLower)) ||
          (item.tags &&
            item.tags.some((tag) => tag?.toLowerCase().includes(searchLower))),
      );
    }

    setItems(filteredItems);
  }, [allItems, selectedSubcategory, searchTerm]);

  const searchTimeoutRef = useRef(null);
  // getTotalAmount — just returns gross (no discount inside)
  const getItemTaxableAfterDiscount = (item, totalDiscount, grossTaxable) => {
    const totalValue = Number(item?.total || item.price * item.quantity || 0);
    const igstRate = Number(item?.igst || 0);
    const cgstRate = Number(item?.cgst || 0);
    const sgstRate = Number(item?.sgst || 0);
    const taxRate = igstRate > 0 ? igstRate : cgstRate + sgstRate;

    // Strip tax to get pre-tax value
    const preTaxValue = totalValue / (1 + taxRate / 100);

    if (grossTaxable === 0) return preTaxValue;

    // Proportional discount share for this item
    const itemDiscountShare = (preTaxValue / grossTaxable) * totalDiscount;
    return preTaxValue - itemDiscountShare;
  };

  const getTotalAmount = (finalProductData) => {
    if (!orderItems?.length) return 0;
    let orderItemsAre = orderItems;
    if (finalProductData?.length > 0) {
      orderItemsAre = finalProductData;
    }
    const totalDiscount =
      Number(additionalChargeDataBasedOnSelection?.[0]?.finalValue) || 0;

    // grossTaxable = sum of all pre-tax values
    const grossTaxable = orderItemsAre.reduce((acc, item) => {
      const totalValue = Number(item?.total || item.price * item.quantity || 0);
      const igstRate = Number(item?.igst || 0);
      const cgstRate = Number(item?.cgst || 0);
      const sgstRate = Number(item?.sgst || 0);
      const taxRate = igstRate > 0 ? igstRate : cgstRate + sgstRate;
      const preTaxValue = totalValue / (1 + taxRate / 100);
      return acc + preTaxValue;
    }, 0);

    return Math.round(
      orderItemsAre.reduce((total, item) => {
        const totalValue = Number(
          item?.total || item.price * item.quantity || 0,
        );

        if (discountBasedOnGrossAmount) {
          return total + totalValue;
        }

        const igstRate = Number(item?.igst || 0);
        const cgstRate = Number(item?.cgst || 0);
        const sgstRate = Number(item?.sgst || 0);
        const isInterState = igstRate > 0;

        const taxableAfterDiscount = getItemTaxableAfterDiscount(
          item,
          totalDiscount,
          grossTaxable,
        );

        const taxOnDiscounted = isInterState
          ? (taxableAfterDiscount * igstRate) / 100
          : (taxableAfterDiscount * cgstRate) / 100 +
            (taxableAfterDiscount * sgstRate) / 100;
        return total + taxableAfterDiscount + taxOnDiscounted;
      }, 0),
    );
  };

  const grossTotal = Math.round(
    selectedDataForPayment?.total || getTotalAmount(),
  );

  let discountAmount = 0;
  if (discountType === "amount") {
    discountAmount = Number(discountValue || 0);
  } else {
    discountAmount = (Number(discountValue || 0) / 100) * grossTotal;
  }

  if (discountAmount < 0) discountAmount = 0;
  if (discountAmount > grossTotal) discountAmount = grossTotal;

  // Shape expected by createSalesVoucher
  const additionalCharges = additionalChargeDataBasedOnSelection;

  const handleProcessDirectSalePayment = async () => {
    setSaveLoader(true);
    console.log(selectedDataForPayment);
    console.log(additionalCharges);
    console.log(paymentMethod);

    try {
      // Step 1: Prepare paymentDetails
      let paymentDetails;
      let amount = await getTotalAmount();
      console.log(amount);
      if (paymentMethod === "cash") {
        paymentDetails = {
          cashAmount: Math.round(
            discountBasedOnGrossAmount
              ? amount - (additionalCharges[0]?.finalValue || 0)
              : amount,
          ),
          onlineAmount: 0,
          selectedCash,
          selectedBank,
          paymentMode: "single",
        };
      } else {
        paymentDetails = {
          cashAmount: 0,
          onlineAmount: Math.round(
            discountBasedOnGrossAmount
              ? amount - (additionalCharges[0]?.finalValue || 0)
              : amount,
          ),
          selectedCash,
          selectedBank,
          paymentMode: "single",
        };
      }
      console.log(selectedDataForPayment);
      console.log(paymentDetails);

      console.log(amount);
      console.log(grossTotal);
      // Step 2: Make API call
      const response = await api.post(
        `/api/sUsers/directSale/${cmp_id}`,
        {
          paymentMethod: paymentMethod,
          paymentDetails: paymentDetails,
          selectedKotData: {
            ...selectedDataForPayment,
            // IMPORTANT: use subtotal/total BEFORE discount, because backend uses this
            subtotal: amount,
            total: amount,
            finalAmount: amount,
          },
          additionalCharges,
          isDirectSale: true,
          discountBasedOnGrossAmount: discountBasedOnGrossAmount,
        },
        { withCredentials: true },
      );

      // Step 3: Handle success and PRINT
      if (response.status === 200 || response.status === 201) {
        console.log("=== FULL RESPONSE ===");
        console.log("response.data:", response.data);
        console.log("response.data.data:", response.data.data);
        console.log(
          "response.data.data.salesRecord:",
          response.data.data.salesRecord,
        );

        toast.success(
          response?.data?.message || "Direct sale completed successfully!",
        );

        const salesRecord = response?.data?.data?.salesRecord;

        if (salesRecord && salesRecord._id) {
          console.log("📄 Sale ID:", salesRecord._id);
          console.log("📄 Full Sale Data:", salesRecord);

          setSalePrintData(salesRecord);
          setShowVoucherPdf(true);

          setTimeout(() => {
            handlePrint();
          }, 500);
        } else {
          console.error("❌ NO SALE ID FOUND IN RESPONSE");
          toast.error("Sale saved but couldn't generate print");
        }

        // Clear state
        setOrderItems([]);
        setSelectedDataForPayment(null);
        setPaymentMethod("cash");
        setPaymentMode("single");
        setShowPaymentModal(false);

        // setTimeout(() => {
        //   navigate("/sUsers/RestaurantDashboard");
        // }, 1000);
      } else {
        toast.error(response?.data?.message || "Failed to process payment");
      }
    } catch (error) {
      console.error("=== ERROR ===", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to process payment");
    } finally {
      setSaveLoader(false);
    }
  };

  const searchItems = useCallback(
    async (searchQuery) => {
      setLoader(true);
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("cmp_id", cmp_id); // ✅ FIX: Add cmp_id here
        params.append("under", "restaurant");
        params.append("search", searchQuery.trim());

        const res = await api.get(
          `/api/sUsers/searchItems?${params.toString()}`,
          {
            withCredentials: true,
          },
        );

        const searchResults = res?.data?.items || [];
        setAllItems(searchResults);
        setItems(searchResults);
        setHasMore(false);
      } catch (error) {
        console.log("Error searching items:", error);
        setAllItems([]);
        setItems([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        setLoader(false);
      }
    },
    [cmp_id],
  );

  const handleSearchChange = (value) => {
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      // If search is cleared, reload normal items
      setCurrentPage(1);
      setHasMore(true);
      fetchAllItems(1, false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Call separate search endpoint
      searchItems(value);
    }, 500);
  };
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const cuisines = optionData?.category || [];
  const subcategories = optionData?.subcategory || [];

  const getSelectedSubcategoryId = () => {
    const selectedSubcat = subcategories.find(
      (subcat) => subcat.name === selectedSubcategory,
    );
    return selectedSubcat?._id || "";
  };

  const getFilteredSubcategories = () => {
    if (!selectedCuisine) return [];
    return subcategories.filter(
      (item) => item.category === selectedCuisine?.categoryId,
    );
  };

  const filteredSubcategories = getFilteredSubcategories();
  const menuItems = items || [];

  const addToOrder = (item) => {
    console.log("Adding to order:", item);
    const existingItem = orderItems.find(
      (orderItem) => orderItem._id === item._id,
    );
    if (existingItem) {
      setOrderItems(
        orderItems.map((orderItem) =>
          orderItem._id === item._id
            ? {
                ...orderItem,
                quantity: orderItem.quantity + 1,
                remainingQty: orderItem.remainingQty + 1,
              }
            : orderItem,
        ),
      );
    } else {
      // Calculate price based on selected price level
      let price = 0;

      if (item.Priceleveles && item.Priceleveles.length > 0) {
        if (selectedPriceLevel) {
          // Find matching price level (check both _id and pricelevel field)
          const matchedPrice = item.Priceleveles.find(
            (pl) =>
              pl.pricelevel === selectedPriceLevel ||
              pl.pricelevel?._id === selectedPriceLevel,
          );
          price = matchedPrice
            ? Number(matchedPrice.pricerate)
            : Number(item.Priceleveles[0].pricerate);
        } else {
          // Use first price level as default
          price = Number(item.Priceleveles[0].pricerate);
        }
      }

      setOrderItems([
        ...orderItems,
        { ...item, quantity: 1, remainingQty: 1, price: price },
      ]);
    }
  };

  const removeFromOrder = (itemId) => {
    setOrderItems(orderItems.filter((item) => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    console.log("newQuantity:", newQuantity);

    // else {
    setOrderItems(
      orderItems.map((item) =>
        item._id === itemId
          ? { ...item, quantity: newQuantity, remainingQty: newQuantity }
          : item,
      ),
    );
    // }
  };
  console.log("orderItems:", orderItems);

  const getTotalItems = () => {
    return orderItems.length;
  };

  const handleCategorySelect = (category, name) => {
    let newObject = {
      categoryId: category,
      categoryName: name,
    };
    setSelectedCuisine(newObject);
    setSelectedSubcategory("");
    setSearchTerm("");
    if (isMobile) setShowSidebar(true);
  };

  const handleSubcategorySelect = (subcategoryId, subcategoryName) => {
    let newObject = {
      subcategoryId: subcategoryId,
      subcategoryName: subcategoryName,
    };
    setSelectedSubcategory(newObject);
    setSearchTerm("");
    if (isMobile) setShowSidebar(false);
  };

  const handleBackToCategories = () => {
    setSelectedSubcategory({});
    setSearchTerm("");
  };

  const handlePlaceOrder = () => {
    if (orderItems.length === 0) return;
    if (orderType === "direct-sale") {
      // Skip KOT generation and go directly to payment
      handleDirectSale();
      return;
    } else if (orderType === "dine-in") {
      setShowFullTableSelection(true); // show full-page table selection
    } else {
      setShowKOTModal(true); // keep normal KOT flow for others
    }
    setShowOrderSummary(false);
  };

  const handleDirectSale = async () => {
    let updatedItems = orderItems.map((item) => {
      return {
        ...item,
        GodownList: item.GodownList.map((g, index) =>
          index === 0
            ? {
                ...g,
                selectedPriceRate: item?.price,
                godown_id: g?._id,
                defaultGodown: true,
                mfgdt: new Date(),
                expdt: new Date(),
                warrantyCard: g?.warrantyCard,
                added: true,
                count: item?.quantity,
                actualCount: item?.quantity,
              }
            : g,
        ),
        hasGodownOrBatch: false,
        totalCount: item?.quantity,
        totalActualCount: item?.quantity,
      };
    });

    let finalProductData = await taxCalculatorForRestaurant(
      updatedItems,
      configurations[0]?.addRateWithTax?.restaurantSale,
    );

    let newSaleObject = {
      Date: new Date(),
      voucherType: "sales",
      serialNumber: orderNumber,
      userLevelSerialNumber: orderNumber,
      salesNumber: `SALE-${orderNumber}`,
      partyAccount: "Cash-in-Hand",
      items: finalProductData,
      finalAmount: getTotalAmount(),
      total: getTotalAmount(),
      isDirectSale: true,
    };

    setSelectedDataForPayment(newSaleObject);
    setPaymentMode("single");
    setPaymentMethod("cash");
    setShowPaymentModal(true);
  };

  const generateKOT = async (
    selectedTableNumber,
    tableStatus,
    parentKot,
    roomSelected,
  ) => {
    if (isGeneratingKotRef.current) return;

    isGeneratingKotRef.current = true;
    setIsGeneratingKot(true);
    let newOrder;
    let kotSaved = false;

    try {
    let roomObj = roomSelected ? roomSelected : roomDetails;
    let updatedItems = [];
    let orderCustomerDetails = {
      ...customerDetails,
      tableNumber: selectedTableNumber,
      tableStatus,
    };

    updatedItems = orderItems.map((item) => {
      return {
        ...item,
        GodownList: item.GodownList.map((g, index) =>
          index === 0
            ? {
                ...g,
                selectedPriceRate: item?.price,
                godown_id: g?._id,
                defaultGodown: true,
                mfgdt: new Date(),
                expdt: new Date(),
                warrantyCard: g?.warrantyCard,
                added: true,
                count: item?.quantity,
                actualCount: item?.quantity,
              }
            : g,
        ),
        hasGodownOrBatch: false,
        totalCount: item?.quantity,
        totalActualCount: item?.quantity,
      };
    });
    let batchArray = [];
    if (editBatchNo) {
      const result = applyBatchEdit({
        kotDataForEdit: kotFullData, // full kot
        batchNo: editBatchNo, // which batch
        editedBatchItems: orderItems, // current batch items (updated)
        updatedItems: kotFullData.items, // full items before this edit
      });

      batchArray = result.updatedBatches;
      updatedItems = result.updatedItems;
    } else {
      batchArray = [
        {
          batchNo: parentKot ? parentKot.kitchenBatches.length + 1 : 1,
          printedAt: new Date(),
          items: updatedItems.map((item) => ({
            itemId: item._id,
            quantity: item.quantity,
            product_name: item.product_name,
          })),
          status: "pending",
        },
      ];
    }

    if (parentKot) {
      parentKot.items.forEach((newItem) => {
        console.log(newItem);
        console.log(updatedItems);
        const existingIndex = updatedItems.findIndex(
          (i) => i._id === newItem._id,
        );

        if (existingIndex !== -1) {
          // Item already exists — update quantity and price only
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity:
              (updatedItems[existingIndex].quantity || 0) +
              (newItem.quantity || 0),
            totalCount:
              (updatedItems[existingIndex].totalCount || 0) +
              (newItem.totalCount || 0),
            total:
              (updatedItems[existingIndex].total || 0) + (newItem.total || 0),
            price: newItem.price, // take latest price
          };
        } else {
          // New item — add it
          updatedItems = [...updatedItems, newItem];
        }
      });
    }

    let finalProductData = await taxCalculatorForRestaurant(
      updatedItems,
      configurations[0]?.addRateWithTax?.restaurantSale,
    );
    console.log(roomDetails);
    // return
    console.log(parentKot);

    if (parentKot) {
      orderCustomerDetails = {
        roomId: parentKot?.roomId,
        checkInNumber: parentKot?.CheckInNumber,
        name: parentKot?.customer?.na,
        tableNumber: parentKot?.tableNumber,
        foodPlan: parentKot?.foodPlan || null,
      };
    } else if (orderType === "dine-in") {
      if (roomDetails && Object.keys(roomDetails).length > 0) {
        orderCustomerDetails = {
          roomId: roomDetails?._id || null,
          checkInNumber: roomDetails?.CheckInNumber,
          name: roomDetails?.guestName,
          tableNumber: selectedTableNumber,
          guestName: roomDetails?.guestName,
          tableStatus,
          foodPlan: roomDetails?.foodPlan || null,
        };
      } else {
        orderCustomerDetails = {
          tableNumber: selectedTableNumber,
          tableStatus,
        };
      }
    } else if (orderType === "roomService") {
      orderCustomerDetails = {
        roomId: roomDetails?._id,
        checkInNumber: roomDetails?.CheckInNumber,
        name: roomDetails?.guestName,
        guestName: roomDetails?.guestName,
        foodPlan: roomDetails?.foodPlan || null,
      };
    } else {
      orderCustomerDetails = { ...customerDetails, tableStatus };
    }

    console.log(orderCustomerDetails);

    newOrder = {
      id: orderNumber,
      items: [...finalProductData],
      type: orderType,
      customer: orderCustomerDetails,
      roomId: orderCustomerDetails?.roomId || null,
      total: getTotalAmount(finalProductData) || 0,
      timestamp: new Date(),
      status: kotDataForEdit?.status || "pending",
      paymentMethod: orderType === "dine-in" ? null : "cash",
      kitchenBatches: batchArray,
      parentTag: parentKot ? true : false,
    };

    let url = parentKot
      ? `/api/sUsers/editKOT/${cmp_id}/${parentKot._id}`
      : isEdit
        ? `/api/sUsers/editKOT/${cmp_id}/${kotDataForEdit._id}`
        : `/api/sUsers/generateKOT/${cmp_id}`;

      let response = await api.post(url, newOrder, {
        withCredentials: true,
      });
      if (response.data?.success) {
        kotSaved = true;
        // Close order-detail overlays before opening either QZ or the browser print dialog.
        setShowKOTModal(false);
        setShowFullTableSelection(false);
        handleKotPrint(response.data?.data, roomObj);
        setOrderItems([]);
        console.log(selectedTableNumber);
        if (orderType === "dine-in") {
          await api.put(
            `/api/sUsers/updateTableStatus/${cmp_id}/${selectedTableNumber}`,
            {
              tableNumber: selectedTableNumber,
              status: "occupied",
            },
            { withCredentials: true },
          );
        }

        queryClient.invalidateQueries({
          queryKey: ["todaysTransaction", cmp_id, isAdmin],
        });
      }
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Unable to generate KOT.",
      );
    } finally {
      console.log(newOrder,kotSaved)
      if (kotSaved && newOrder) {

        setOrders((currentOrders) => [...currentOrders, newOrder]);
        setOrderNumber((currentOrderNumber) => currentOrderNumber + 1);
        setShowKOTModal(false);
        setIsEdit(false);
        setCustomerDetails({
          name: "",
          phone: "",
          address: "",
          tableNumber: "10",
        });
        setSearch("");
        setShowResults(true);
        setRoomDetails({});
        toast.success(
          kotDataForEdit
            ? "KOT updated successfully!"
            : "KOT generated successfully!",
        );
        navigate(location.pathname, { replace: true, state: {} });
      }

      // Keep Confirm KOT locked until the modal-close update has rendered.
      requestAnimationFrame(() => {
        isGeneratingKotRef.current = false;
        setIsGeneratingKot(false);
      });
    }
  };

  // ✅ Handle search with debounce

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setHasMore(true);
    fetchAllItems(1, false);
  };

  useEffect(() => {
    let filteredItems = [...allItems];

    if (selectedSubcategory) {
      filteredItems = filteredItems.filter(
        (item) => item.sub_category === selectedSubcategory?.subcategoryId,
      );
    }

    setItems(filteredItems);
  }, [allItems, selectedSubcategory]);

  // Cleanup

  const getOrderTypeDisplay = (type) => {
    const typeMap = {
      "dine-in": "Dine In",
      takeaway: "Takeaway",
      delivery: "Delivery",
      roomService: "Room Service",
    };
    return typeMap[type] || type;
  };

  const handleKotPrint = (data, roomDetails) => {
    console.log(roomDetails);
    const orderData = {
      kotNo: data?.voucherNumber,
      tableNo: data?.tableNumber,
      type: data.type,
      items: orderItems,
      createdAt: new Date(),
      roomName: roomDetails?.roomno,
      guestName: roomDetails?.guestName,
      foodPlan: roomDetails?.foodPlan || [],
    };
    generateAndPrintKOT(orderData, true, false, companyName ,selectedKotPrinter);
  };

  const handleSelectedPriceLevel = (value) => {
    setShowPriceLevelSelect(false);
    setSelectedPriceLevel(value);
  };

  const findOneCount = (id) => {
    return orderItems.find((item) => item._id === id)?.quantity || 0;
  };
  const headerPriceRef = useRef(null);

  const scrollHeaderPrice = (direction) => {
    if (!headerPriceRef.current) return;
    const scrollAmount = 150;
    headerPriceRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleDiscountChange = (discountValue, discountType) => {
    const inputAmount = Number(discountValue) || 0;

    const findOne = additionalChargeData.find(
      (d) => d._id === selectedAdditionalCharge,
    );

    if (!findOne) return;

    console.log(selectedDataForPayment);

    const flatItems = selectedDataForPayment?.items || [];

    console.log(flatItems);

    let baseAmount = 0;
    let calculatedDiscount = inputAmount;

    if (discountType === "percentage") {
      if (discountBasedOnGrossAmount) {
        baseAmount = flatItems.reduce(
          (acc, item) => acc + Number(item?.total || 0),
          0,
        );
      } else {
        baseAmount = flatItems.reduce(
          (acc, item) =>
            acc + Number(item?.total || 0) - Number(item?.totalIgstAmt || 0),
          0,
        );
      }

      console.log(baseAmount);

      calculatedDiscount = ((baseAmount * inputAmount) / 100).toFixed(2);
    }

    const taxAmount =
      (Number(calculatedDiscount || 0) * Number(findOne?.taxPercentage || 0)) /
      100;

    console.log(taxAmount);
    console.log(calculatedDiscount);

    setAdditionalChargeDataBasedOnSelection([
      {
        _id: findOne._id,
        option: findOne.name,
        value: Number(calculatedDiscount) || 0,
        action: "sub",
        taxPercentage: Number(findOne?.taxPercentage || 0),
        taxAmt: taxAmount || 0,
        hsn: findOne.hsn,
        finalValue: Number(calculatedDiscount) + taxAmount,
      },
    ]);

    setDiscountValue(inputAmount);
  };

  const handleTagKotConfirmation = (parentKot) => {
    generateKOT(null, null, parentKot);
  };

  return (
    <>
      {showPriceLevelSelect && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 ">
          <div className="bg-white/95 backdrop-blur-xl p-4 md:p-6 rounded-xl shadow-2xl w-80 md:w-96 border border-white/20 animate-in zoom-in-95 duration-200">
            <label className="text-gray-800 mb-3 block font-semibold text-base md:text-lg">
              Select Price Level
            </label>
            <select
              className="w-full bg-white/90 text-gray-800 border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              onChange={(e) => handleSelectedPriceLevel(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>
                Choose...
              </option>
              {priceLevelData.map((level) => (
                <option key={level._id} value={level._id}>
                  {level.pricelevel}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowPriceLevelSelect(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="h-screen  overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
        {/* Compact Header */}
        <div className="bg-[#072134] text-white border-b border-slate-700/60 sticky top-0 z-50 shadow-lg">
          <div className="px-3 md:px-6 py-2.5 md:py-3">
            <div className="flex items-center justify-between gap-2 md:gap-3">
              {/* Left Section - Logo & Title */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  aria-label="Open main navigation"
                  title="Main navigation"
                  onClick={sidebar?.handleToggleSidebar}
                  className="p-2 xl:hidden hover:bg-white/10 rounded-lg transition-colors duration-200"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <button
                  className="md:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                  🍽️
                </div>
                <div className="hidden md:block">
                  <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
                    {getIndustryTitle()}
                  </h1>
                  <p className="text-xs text-gray-400">
                    {getIndustrySubtitle()}
                  </p>
                </div>
              </div>

              {/* Center Section - Price Levels (desktop only) */}
              <div className="flex-1 hidden sm:block min-w-0">
                {priceLevelData && priceLevelData.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 whitespace-nowrap flex-shrink-0 uppercase tracking-wider">
                      💳 Price:
                    </span>

                    <div className="relative flex-1 min-w-0 group">
                      {/* Left Scroll Button */}
                      <button
                        onClick={() => scrollHeaderPrice("left")}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 p-1 text-gray-500 hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-800/50 rounded"
                      >
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </button>

                      {/* Price Level Buttons */}
                      <div
                        ref={headerPriceRef}
                        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3 py-0.5"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        {priceLevelData.map((level) => (
                          <button
                            key={level._id}
                            onClick={() => {
                              setSelectedPriceLevel(level._id);
                              setOrderItems([]);
                            }}
                            className={`
                    px-3 py-1.5 rounded-md font-semibold text-xs
                    whitespace-nowrap flex-shrink-0 border transition-all duration-300
                    hover:scale-105 active:scale-95 relative group/btn
                    ${
                      selectedPriceLevel === level._id
                        ? "bg-blue-600/90 text-white border-blue-400/50 shadow-lg shadow-blue-500/30"
                        : "bg-slate-800/60 text-gray-300 border-slate-700/50 hover:bg-slate-700/80 hover:text-gray-100 hover:border-slate-600"
                    }
                  `}
                          >
                            {level.pricelevel}
                            {selectedPriceLevel === level._id && (
                              <span className="absolute inset-0 rounded-md bg-blue-400/20 animate-pulse"></span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Right Scroll Button */}
                      <button
                        onClick={() => scrollHeaderPrice("right")}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 p-1 text-white hover:text-gray-300 transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-800/50 rounded"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90 " />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Section - Time & Table Info */}
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-md hover:bg-slate-700/60 transition-colors group">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
                  <span className="  ">
                    <Timer />
                  </span>
                </div>

                {/* Table / Room button – compress text on small screens */}
                <div
                  className="hover:cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-md hover:bg-slate-700/60 transition-colors group"
                  onClick={() => navigate("/sUsers/TableSelection")}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300" />
                  {/* Full text on large screens */}
                  <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 hidden lg:inline">
                    {orderType === "dine-in"
                      ? `Table ${customerDetails.tableNumber}`
                      : orderType === "roomService"
                        ? `Room ${roomDetails?.roomno || "---"}`
                        : getOrderTypeDisplay(orderType)}
                  </span>
                  {/* Compressed text on small/medium */}
                  <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 lg:hidden">
                    {orderType === "dine-in"
                      ? `T${customerDetails.tableNumber || ""}`
                      : orderType === "roomService"
                        ? `R${roomDetails?.roomno || ""}`
                        : getOrderTypeDisplay(orderType).slice(0, 3)}
                  </span>
                </div>

                {/* Orders + 3-dots hidden on very small widths */}
                <div className="relative  sm:flex items-center">
                  <div
                    className="hover:cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-l-md hover:bg-slate-700/60 transition-colors group"
                    onClick={() => navigate("/sUsers/KotPage")}
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300" />
                    <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 hidden md:inline">
                      Orders: {orders?.length || 0}
                    </span>
                    <span className="text-xs font-medium text-gray-300 group-hover:text-gray-100 md:hidden">
                      {orders?.length || 0}
                    </span>
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowOptions((prev) => !prev)}
                      className="flex items-center justify-center px-2 py-1.5 bg-slate-800/50 border border-l-0 border-slate-700/60 rounded-r-md hover:bg-slate-700/60 transition-colors group"
                    >
                      <span className="flex flex-col gap-[3px] items-center justify-center">
                        <span className="w-[3px] h-[3px] bg-gray-400 rounded-full group-hover:bg-gray-200 transition-colors"></span>
                        <span className="w-[3px] h-[3px] bg-gray-400 rounded-full group-hover:bg-gray-200 transition-colors"></span>
                        <span className="w-[3px] h-[3px] bg-gray-400 rounded-full group-hover:bg-gray-200 transition-colors"></span>
                      </span>
                    </button>

                    <RestaurantReportsMenu
                      showOptions={showOptions}
                      setShowOptions={setShowOptions}
                    />
                  </div>
                </div>

                {/* Mobile cart button – already compact */}
                <button
                  className="hover:cursor-pointer sm:hidden bg-blue-600/80 hover:bg-blue-600 text-white rounded-md px-2.5 py-1.5 flex items-center gap-1 transition-colors border border-blue-500/50 shadow-lg shadow-blue-500/20 active:scale-95"
                  onClick={() => setShowOrderSummary(true)}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">
                    {getTotalItems?.() || 0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Cuisine Categories */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 shadow-lg sticky top-[60px] z-40">
          <div className="flex justify-between items-center px-3 py-2.5 gap-3">
            {/* Cuisines Scroll Container */}
            <div className="flex-1 min-w-0 relative group">
              {/* Left Scroll Button */}
              <button
                onClick={() => scroll("left")}
                className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 p-1 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:bg-white/80 rounded"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>

              {/* Cuisines List */}
              <div
                ref={scrollContainerRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-4"
                style={{ scrollBehavior: "smooth" }}
              >
                {cuisines.map((cuisine) => (
                  <button
                    key={cuisine._id}
                    onClick={() =>
                      handleCategorySelect(cuisine._id, cuisine.name)
                    }
                    className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg
                  font-semibold text-xs transition-all duration-300
                  whitespace-nowrap flex-shrink-0 border
                  hover:scale-105 active:scale-95 transform
                  ${
                    selectedCuisine?.categoryName === cuisine.name
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-indigo-400/30"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  }
                `}
                  >
                    <span className="text-sm">{cuisine.icon || "🍽️"}</span>
                    <span>{cuisine.name}</span>
                  </button>
                ))}
              </div>

              {/* Right Scroll Button */}
              <button
                onClick={() => scroll("right")}
                className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 p-1 text-gray-400 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 hover:bg-white/80 rounded"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>

            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="hidden sm:inline">Order Summary</span>
                <span className="sm:hidden">Cart</span>
                <div className="text-xs font-normal text-gray-600">
                  {getTotalItems()} items
                </div>
              </div>
            </h3>
            {/* Fixed Action Buttons */}
            {/* <div className="flex items-center gap-2 flex-shrink-0"> */}
            {/* Daily Restaurant Sales Button */}
            {/* <button
                onClick={() => navigate("/sUsers/BillSummary?type=restaurant")}
                className="hidden md:flex
              items-center gap-2 px-3 py-1.5 rounded-lg
              font-semibold text-xs transition-all duration-300
              whitespace-nowrap
              bg-gradient-to-r from-green-500 to-emerald-500 text-white 
              border border-green-400/30 shadow-md shadow-green-500/20
              hover:from-green-600 hover:to-emerald-600 hover:shadow-lg
              hover:scale-105 active:scale-95 transform
            "
              >
                <span className="text-sm">📊</span>
                <span className="hidden lg:inline">Daily Restaurant Sales</span>
              </button> */}
            {/* </div> */}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Mobile Sidebar Overlay */}
          {isMobile && showSidebar && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Compact Left Sidebar */}
          <div
            className={`
            ${
              isMobile
                ? "fixed left-0 top-0 bottom-0 z-50 transform transition-transform duration-300"
                : "relative"
            } 
            ${
              isMobile && showSidebar
                ? "translate-x-0"
                : isMobile
                  ? "-translate-x-full"
                  : "translate-x-0"
            }
            w-56 md:w-48 bg-white/95 backdrop-blur-xl shadow-2xl h-full flex flex-col min-h-0 border-r border-gray-200/50
          `}
          >
            <div className="p-3 border-b border-gray-200/50 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  {selectedSubcategory ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      Items
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      Subcategories
                    </>
                  )}
                </h2>
                <div className="flex items-center gap-1">
                  {selectedSubcategory && (
                    <button
                      onClick={handleBackToCategories}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors p-0.5 rounded-md hover:bg-indigo-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  {isMobile && (
                    <button
                      onClick={() => setShowSidebar(false)}
                      className="text-gray-500 hover:text-gray-700 p-0.5 rounded-md hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {selectedCuisine && (
                <div className="text-xs text-indigo-600 mt-1.5 font-medium bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
                  {selectedCuisine?.categoryName}
                </div>
              )}
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              {!selectedCuisine ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg">🍽️</span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    Please select a category above
                  </p>
                </div>
              ) : filteredSubcategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Filter className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">
                    No subcategories available
                  </p>
                </div>
              ) : (
                filteredSubcategories.map((subcategory, index) => {
                  const icon =
                    subcategoryIcons[subcategory.name] ||
                    subcategoryIcons.Default;

                  return (
                    <button
                      key={subcategory._id}
                      onClick={() =>
                        handleSubcategorySelect(
                          subcategory._id,
                          subcategory.name,
                        )
                      }
                        className={`w-full text-left px-3 py-2.5 mb-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 border hover:scale-[1.02] hover:translate-x-1 transform group text-xs
                    ${
                      selectedSubcategory?.subcategoryId === subcategory._id
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-indigo-500/25"
                        : "bg-white/80 text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:shadow-md"
                    }
                  `}
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform duration-200">
                        {icon}
                      </span>
                      <span className="capitalize tracking-wide">
                        {subcategory.name}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Compact Search Bar */}
            <div className="p-3 bg-white/90 backdrop-blur-sm border-b border-gray-200/50">
              <div className="mb-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                <TouchInput
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-10 py-2.5 border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-sm transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mb-4 text-sm text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg inline-block">
                  {items.length > 0
                    ? `Found ${items.length} item${
                        items.length !== 1 ? "s" : ""
                      } for "${searchTerm}"`
                    : `No items found for "${searchTerm}"`}
                </div>
              )}

              {/* {searchTerm && (
                <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                  {menuItems.length > 0
                    ? `Found ${menuItems.length} item${
                        menuItems.length !== 1 ? "s" : ""
                      } for "${searchTerm}"`
                    : `No items found for "${searchTerm}"`}
                </div>
              )} */}
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 p-3 overflow-y-auto">
              {loader ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
                    <p className="text-indigo-600 font-medium">
                      Loading items...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></span>
                      {selectedSubcategory
                        ? `${selectedCuisine?.categoryName} - (${menuItems.length})`
                        : searchTerm
                          ? `Search Results (${menuItems.length})`
                          : `All Items (${menuItems.length})`}
                    </h3>

                    <div className="flex items-center gap-2">
                      {/* Secondary Action - Tag To Kot */}
                      {orderItems.length > 0 && (
                        <button
                          onClick={() => {
                            setShowParentKots(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 hover:border-indigo-400 active:scale-95 transition-all duration-150"
                        >
                          <Tag className="w-3.5 h-3.5" />
                          Tag To Kot
                        </button>
                      )}
                      {/* Primary Action - Add Item */}
                      <button
                        onClick={() => navigate("/sUsers/itemRegistration")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm shadow-indigo-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Item
                      </button>
                    </div>
                  </div>

                  {menuItems.length === 0 ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-600">
                          No Items Found
                        </h3>
                        <p className="text-gray-500 text-sm">
                          {searchTerm
                            ? `No items found matching "${searchTerm}"`
                            : selectedSubcategory
                              ? `No items available in ${selectedSubcategory?.subcategoryName}`
                              : "No items available"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                      {menuItems.map((item, index) => {
                        const count = findOneCount(item._id);

                        // Calculate display price based on selected price level
                        let displayPrice = 0;

                        if (item.Priceleveles && item.Priceleveles.length > 0) {
                          if (selectedPriceLevel) {
                            // Try to find matching price level
                            const matchedPrice = item.Priceleveles.find(
                              (pl) =>
                                pl.pricelevel === selectedPriceLevel ||
                                pl.pricelevel?._id === selectedPriceLevel,
                            );
                            displayPrice = matchedPrice
                              ? Number(matchedPrice.pricerate)
                              : Number(item.Priceleveles[0].pricerate);
                          } else {
                            // Use first price level as default
                            displayPrice = Number(
                              item.Priceleveles[0].pricerate,
                            );
                          }
                        }

                        return (
                          <motion.div
                            key={item._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="group relative bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:border-indigo-200 hover:bg-white transition-all duration-500 cursor-pointer transform hover:scale-105 active:scale-95"
                            onClick={() => addToOrder(item)}
                          >
                            <div className="p-3 flex flex-col items-center justify-center text-center h-full min-h-[120px] relative">
                              {/* ✅ Always show count badge if count > 0 */}
                              {count > 0 && (
                                <div
                                  className="absolute inset-0 flex 
                            bg-gradient-to-br from-indigo-100/60 via-indigo-200/40 to-indigo-300/30
                            transition-opacity duration-500 rounded-xl p-2"
                                >
                                  <span className="text-lg sm:text-md md:text-md font-bold text-indigo-700 ">
                                    {count}
                                  </span>
                                </div>
                              )}

                              {/* Food Image */}
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-gray-200 shadow-md mb-2 group-hover:border-indigo-300 transition-all duration-500 relative z-10">
                                <img
                                  src={
                                    item.product_image ||
                                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTIHlLcm7fJCVUvJhvSF0kP-oXPPdwBxXHuQ&s"
                                  }
                                  alt={item.product_name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                                  onError={(e) => {
                                    e.target.src =
                                      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTIHlLcm7fJCVUvJhvSF0kP-oXPPdwBxXHuQ&s";
                                  }}
                                />
                              </div>

                              {/* Product Name */}
                              <h3 className="font-bold text-gray-800 break-all text-xs mb-1.5 line-clamp-2 relative z-10 group-hover:text-indigo-700 transition-colors duration-300">
                                {item.product_name.toUpperCase()}
                              </h3>

                              {/* Price */}
                              <span className="text-gray-700 font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent relative z-10">
                                ₹{displayPrice.toFixed(2)}
                              </span>

                              {/* Add to cart icon */}
                              <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                                <Plus className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Compact Order Summary Sidebar */}
          {isMobile && showOrderSummary && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setShowOrderSummary(false)}
            />
          )}

          <div
            className={`
            ${
              isMobile
                ? "fixed right-0 top-0 bottom-0 z-50 transform transition-transform duration-300"
                : "relative"
            }
            ${
              isMobile && showOrderSummary
                ? "translate-x-0"
                : isMobile
                  ? "translate-x-full"
                  : "translate-x-0"
            }
            w-full sm:w-80 md:w-72 bg-white/95 backdrop-blur-xl border-l border-gray-200/50 flex flex-col min-h-0 h-full shadow-2xl
          `}
          >
            {/* <div className="p-3 border-b border-gray-200/50 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex items-center justify-between"> */}

            {isMobile && (
              <button
                onClick={() => setShowOrderSummary(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {/* </div>
            </div> */}

            <div className="flex-1 overflow-y-auto min-h-0 p-3">
              {orderItems.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Your cart is empty</p>
                  <p className="text-xs text-gray-400 mt-1">Add some items!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-xl p-3 flex justify-between items-start hover:shadow-md transition-all duration-300 relative group"
                    >
                      {/* Close button in top-right corner */}
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 z-10"
                        onClick={() => removeFromOrder(item._id)} // You'll need to implement this function
                      >
                        ×
                      </button>

                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2 mb-1">
                          {item.product_name}
                        </h4>

                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-500">₹</span>
                          <TouchInput
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setOrderItems(
                                orderItems.map((orderItem) =>
                                  orderItem._id === item._id
                                    ? { ...orderItem, price: newPrice }
                                    : orderItem,
                                ),
                              );
                            }}
                            className="w-11 text-xs text-gray-600 bg-transparent border-none focus:outline-none focus:bg-white focus:border focus:border-indigo-300 focus:rounded px-0.5"
                            step="0.01"
                            min="0"
                          />
                          <span className="text-xs text-gray-400">
                            ×{item.quantity}{" "}
                          </span>
                          <span className="text-xs font-bold text-indigo-600">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          className="w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 text-white flex items-center justify-center rounded-full hover:from-red-600 hover:to-pink-600 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50"
                          onClick={() =>
                            updateQuantity(
                              item._id,
                              Math.max(
                                0.5,
                                parseFloat((item.quantity - 0.5).toFixed(2)),
                              ),
                            )
                          }
                          disabled={item.quantity <= 0.5}
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <div className="relative">
                          <TouchInput
                            className="text-sm font-bold w-14 text-center bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0.5"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                updateQuantity(
                                  item._id,
                                  val === "" ? 0 : parseFloat(val) || 0,
                                );
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              updateQuantity(
                                item._id,
                                Math.max(0.5, isNaN(val) ? 0.5 : val),
                              );
                            }}
                          />
                        </div>

                        <button
                          className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center rounded-full hover:from-green-600 hover:to-emerald-600 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg"
                          onClick={() =>
                            updateQuantity(item._id, item.quantity + 1)
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Total and Order Buttons */}
            <div className="p-3 border-t border-gray-200/50 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex justify-between items-center mb-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100">
                <span className="text-sm font-bold text-gray-700">
                  Total Amount
                </span>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ₹{Math.round(getTotalAmount()).toFixed(2)}
                </span>
              </div>

              {/* Compact Order Type Selection */}
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-1.5 ">
                  {orderTypesConfig.dineIn !== false && (
                    <button
                      onClick={() => setOrderType("dine-in")}
                      className={`flex flex-col items-center justify-center h-10 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        orderType === "dine-in"
                          ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "border-gray-200 bg-white/80 text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                      }`}
                    >
                      <Home className="w-4 h-4 mb-0.5" />
                      <span className="font-semibold text-xs">Dine In</span>
                    </button>
                  )}
                  {orderTypesConfig.takeaway !== false && (
                    <button
                      onClick={() => setOrderType("takeaway")}
                      className={`flex flex-col items-center justify-center  h-10 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        orderType === "takeaway"
                          ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "border-gray-200 bg-white/80 text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                      }`}
                    >
                      <Package className="w-4 h-4 mb-0.5" />
                      <span className="font-semibold text-xs">Takeaway</span>
                    </button>
                  )}
                  {orderTypesConfig.delivery !== false && (
                    <button
                      onClick={() => setOrderType("delivery")}
                      className={`flex flex-col items-center justify-center  h-10 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        orderType === "delivery"
                          ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "border-gray-200 bg-white/80 text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                      }`}
                    >
                      <Car className="w-4 h-4 mb-0.5" />
                      <span className="font-semibold text-xs">Delivery</span>
                    </button>
                  )}
                  {orderTypesConfig.roomService !== false && (
                    <button
                      onClick={() => setOrderType("roomService")}
                      className={`flex flex-col items-center justify-center  h-10 rounded-xl border transition-all duration-300 transform hover:scale-105 ${
                        orderType === "roomService"
                          ? "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "border-gray-200 bg-white/80 text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50"
                      }`}
                    >
                      <Bed className="w-4 h-4 mb-0.5" />
                      <span className="font-semibold text-xs">
                        Room Service
                      </span>
                    </button>
                  )}
                  {orderTypesConfig?.directSale !== false &&
                    hasAlternativeOrderType && (
                    <button
                      onClick={() => {
                        console.log("Direct Sale button clicked");
                        setOrderType("direct-sale");
                      }}
                      className={`flex flex-col items-center justify-center h-10 rounded-xl border transition-all duration-300 transform hover:scale-105 col-span-2 ${
                        orderType === "direct-sale"
                          ? "border-transparent bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : "border-gray-200 bg-white/80 text-gray-700 hover:border-green-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                      }`}
                    >
                      <Receipt className="w-4 h-4 mb-0.5" />
                      <span className="font-semibold text-xs">Direct Sale</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex space-x-2">
                <button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-xl font-bold
                   hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 
                   disabled:cursor-not-allowed text-sm hover:scale-105 active:scale-95 transform shadow-lg shadow-indigo-500/25"
                  disabled={orderItems.length === 0}
                  onClick={handlePlaceOrder}
                >
                  {isEdit
                    ? "Update Kot"
                    : orderType === "direct-sale"
                      ? "Generate Bill"
                      : " Kot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFullTableSelection && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto relative border border-white/20 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowFullTableSelection(false);
                if (
                  !kotDataForEdit
                ) {
                  setRoomDetails({});
                }
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-200"
            >
              <button
                onClick={() => {
                  setShowFullTableSelection(false);
                  if (
                    !kotDataForEdit
                  ) {
                    setRoomDetails({});
                  }
                }}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-200"
                aria-label="Close modal"
              >
                &times;
              </button>
            </button>
            <div>
              <TableSelection
                showKOTs={false}
                onTableSelect={(table, roomDetails) => {
                  generateKOT(
                    table.tableNumber,
                    table.status,
                    null,
                    roomDetails,
                  );
                  setShowFullTableSelection(false);
                }}
                roomData={roomData}
                setRoomDetails={setRoomDetails}
                roomDetails={roomDetails}
                showHeader={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compact KOT Modal */}
      {showKOTModal && (
        <div className="kot-details-modal fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 max-w-sm w-full mx-2 transform transition-all duration-300 scale-100 max-h-[85vh] overflow-y-auto border border-white/20 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-white" />
                </div>
                KOT Details
              </h2>
              <button
                onClick={() => setShowKOTModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Type Display */}
            <div className="mb-4">
              <div className="flex items-center justify-center p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                {orderType === "dine-in" && (
                  <Home className="w-5 h-5 mr-2 text-indigo-600" />
                )}
                {orderType === "takeaway" && (
                  <Package className="w-5 h-5 mr-2 text-indigo-600" />
                )}
                {orderType === "delivery" && (
                  <Car className="w-5 h-5 mr-2 text-indigo-600" />
                )}
                {orderType === "roomService" && (
                  <Bed className="w-5 h-5 mr-2 text-indigo-600" />
                )}
                <span className="text-sm font-bold text-gray-700">
                  {getOrderTypeDisplay(orderType)} Order
                </span>
              </div>
            </div>

            {/* Customer Details Input */}
            <div className="space-y-3 mb-6">
              {(orderType === "roomService" || orderType === "dine-in") && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Room Number
                    </label>

                    <div className="relative w-full">
                      <TouchInput
                        type="text"
                        placeholder="Search room..."
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setShowResults(true);
                        }}
                      />

                      {showResults && search && (
                        <ul className="absolute left-0 right-0 z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredRooms.length > 0 ? (
                            <>
                              <li className="sticky top-0 z-10 grid grid-cols-[80px_1fr_120px] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-600 uppercase bg-gray-100 border-b">
                                <span>Room</span>
                                <span>Customer</span>
                                <span>Guest</span>
                                <span>Check-In</span>
                              </li>

                              {filteredRooms.map((room) => (
                                <li
                                  key={room.roomId}
                                  className="grid grid-cols-[80px_1fr_120px] gap-2 px-3 py-2 text-sm hover:bg-violet-100 cursor-pointer border-b last:border-b-0"
                                  onClick={() => handleSelectRoom(room)}
                                >
                                  <span className="truncate font-medium">
                                    {room.roomName}
                                  </span>
                                  <span className="truncate">
                                    {room.customerName}
                                  </span>
                                  <span className="truncate">
                                    {room.guestName}
                                  </span>
                                  <span className=" text-gray-600">
                                    {room.voucherNumber}
                                  </span>
                                </li>
                              ))}
                            </>
                          ) : (
                            <li className="px-3 py-2 text-sm text-gray-500">
                              No results found
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Guest Name
                    </label>
                    <TouchInput
                      type="text"
                      value={roomDetails.guestName}
                      onChange={(e) =>
                        setRoomDetails({
                          ...roomDetails,
                          guestName: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-sm bg-white transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Check-In Number
                    </label>
                    <TouchInput
                      type="text"
                      value={roomDetails.CheckInNumber || ""}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 text-sm"
                    />
                  </div>
                </>
              )}

              {(orderType === "delivery" || orderType === "takeaway") && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Customer Name
                    </label>
                    <TouchInput
                      type="text"
                      value={customerDetails.name}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          name: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-sm bg-white transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <TouchInput
                      type="text"
                      keyboardType="number"
                      value={customerDetails.phone}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          phone: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-sm bg-white transition-all duration-200"
                    />
                  </div>
                  {orderType === "delivery" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Delivery Address
                      </label>
                      <TouchInput as="textarea"
                        rows={3}
                        value={customerDetails.address}
                        onChange={(e) =>
                          setCustomerDetails({
                            ...customerDetails,
                            address: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 text-sm resize-none bg-white transition-all duration-200"
                      ></TouchInput>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Confirm Button */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowKOTModal(false);
                  setRoomDetails({});
                  setSearch("");
                  setShowResults(true);
                  setRoomDetails(null);
                }}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={generateKOT}
                disabled={isGeneratingKot}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
              >
                {isGeneratingKot ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  "Confirm KOT"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Direct Sale Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-4 max-w-lg w-full mx-4 max-h-[95vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-800">
                Direct Sale Payment
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMode("single");
                  setCashAmount(0);
                  setOnlineAmount(0);
                  setPaymentError("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">
                  Total Items:
                </span>
                <span className="text-sm font-bold text-blue-900">
                  {getTotalItems()}
                </span>
              </div>
            </div>

            {/* Single Payment Method Selection */}
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
                  <span className="text-2xl mb-1">💵</span>
                  <span className="text-xs font-medium">Cash</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl mb-1">💳</span>
                  <span className="text-xs font-medium">Online Payment</span>
                </button>
              </div>

              {/* Cash Payment Dropdown */}
              {paymentMethod === "cash" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Cash Account
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                  >
                    <option value="" disabled>
                      Select Payment Method
                    </option>
                    {cashOrBank?.bankDetails?.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.partyName} - ({bank.under || "Bank"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-xs">{paymentError}</p>
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item._id} className="flex justify-between text-xs">
                    <span>
                      {item.product_name} x {item.quantity}
                    </span>
                    <span className="font-medium">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">
                    Discount
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("amount");
                        handleDiscountChange(discountValue, "amount");
                      }}
                      className={`px-2 py-1 rounded-md border text-xs ${
                        discountType === "amount"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType("percentage");
                        handleDiscountChange(discountValue, "percentage");
                      }}
                      className={`px-2 py-1 rounded-md border text-xs ${
                        discountType === "percentage"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedAdditionalCharge}
                    onChange={(e) => {
                      setSelectedAdditionalCharge(e.target.value);
                      handleDiscountChange(discountValue, discountType);
                    }}
                    name=""
                    id=""
                  >
                    {additionalChargeData?.map((charge) => (
                      <option key={charge._id} value={charge._id}>
                        {charge.name}
                      </option>
                    ))}
                  </select>
                  <TouchInput
                    type="text"
                    min="0"
                    keyboardType="number"
                    allowDecimal
                    value={discountValue}
                    onChange={(e) =>
                      handleDiscountChange(e.target.value, discountType)
                    }
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={
                      discountType === "amount" ? "Enter amount" : "Enter %"
                    }
                  />

                  {/* Show calculated value if percentage */}
                </div>
                {additionalChargeDataBasedOnSelection?.length > 0 && (
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {`DiscountAmount(${additionalChargeDataBasedOnSelection[0]?.taxPercentage}%
                     ${additionalChargeDataBasedOnSelection[0]?.value}) ₹ 
                     ${additionalChargeDataBasedOnSelection[0]?.finalValue}`}
                  </span>
                )}
                {/* <span className="text-sm text-gray-600 whitespace-nowrap">
                      = ₹
                      {(
                        (Number(discountValue || 0) / 100) *
                        Math.round(getTotalAmount())
                      ).toFixed(2)}
                    </span> */}
              </div>

              {/* Final total after discount */}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold text-gray-800">
                <span className="text-sm">Net Amount</span>
                <span className="text-base text-blue-600">
                  {(() => {
                    const gross = getTotalAmount();
                    const discount =
                      additionalChargeDataBasedOnSelection[0]?.finalValue || 0;
                    console.log(discount);
                    console.log(discountBasedOnGrossAmount);
                    console.log(gross);
                    const net = Math.round(
                      discountBasedOnGrossAmount ? gross - discount : gross,
                    );
                    return `₹${net.toFixed(2)}`;
                  })()}
                </span>
              </div>

              <button
                onClick={handleProcessDirectSalePayment}
                disabled={saveLoader}
                className={`w-full mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  saveLoader
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                }`}
              >
                {saveLoader ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  "Process Payment"
                )}
              </button>

              {showVoucherPdf && salePrintData && (
                <div style={{ display: "none" }}>
                  <VoucherThreeInchPdf
                    ref={contentToPrint}
                    data={salePrintData}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {showParentKots && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <ParentKotPage
              setShowParentKots={setShowParentKots}
              cmp_id={cmp_id}
              handleTagKotConfirmation={handleTagKotConfirmation}
            />
          </div>
        </div>
      )}
      {/* Optimized CSS */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Reduced animations for better performance */
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .animate-float {
          animation: float 2s ease-in-out infinite;
        }

        /* Smooth transitions */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced focus styles - blue theme */
        input:focus,
        select:focus,
        textarea:focus {
          box-shadow:
            0 0 0 2px rgba(99, 102, 241, 0.1),
            0 4px 15px rgba(99, 102, 241, 0.1);
        }
      `}</style>
      <div ref={observerTarget} style={{ height: 1 }} />
      {isLoading && <div>Loading...</div>}
      {/* {!hasMore && <div>No more items</div>} */}
    </>
  );
};

export default function RestaurantPOSWithKeyboard() {
  return <TouchKeyboardScope><RestaurantPOS /></TouchKeyboardScope>;
}
