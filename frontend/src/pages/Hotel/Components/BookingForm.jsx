/* eslint-disable react/prop-types */
import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import api from "@/api/api";
import CustomBarLoader from "@/components/common/CustomBarLoader";
import HeaderTile from "@/pages/voucher/voucherCreation/HeaderTile";
import { formatVoucherType } from "/utils/formatVoucherType";
import CustomerSearchInputBox from "./CustomerSearchInPutBox";
import TimeSelector from "./TimeSelector";
import AvailableRooms from "./AvailableRooms";
import AdditionalPaxDetails from "./AdditionalPaxDetails";
import FoodPlanComponent from "./FoodPlanComponent";
import useFetch from "@/customHook/useFetch";
import OutStandingModal from "./OutStandingModal";
import PaymentModal from "./PaymentModal";
const AdditionalChargesModal = lazy(() => import("./AdditionalChargesModal"));
import SuspenseLoader from "@/components/common/SuspenseLoader";
import { calculateOtherCharges } from "../Helper/hotelHelper.js";
import OtherChargeSearchInPutBox from "./OtherChargeSearchInPutBox";
import { useRef } from "react";
import {
  MdCloudUpload,
  MdImage,
  MdDelete,
  MdVisibility,
  MdDownload,
} from "react-icons/md";
import uploadImageToCloudinary from "../../../../utils/uploadCloudinary";
import { calculateStayDays } from "../Helper/hotelHelper";


const nextIsoDate = (value) => {
  const date = new Date(value);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
};

function BookingForm({
  isLoading = false,
  setIsLoading = false,
  handleSubmit,
  editData,
  isSubmittingRef,
  isFor,
  outStanding = [],
  roomId,
  rooms = [],
  isTariffRateChange,
  submitLoader,
  isShowGrc = false,
  isEditLockLoading = false,
  isEditLocked = false,
  editLockMessage = "",
  lockedThroughDate = "",
}) {
  const [voucherNumber, setVoucherNumber] = useState("");
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedGuest, setSelectedGuest] = useState("");
  const [displayFoodPlan, setDisplayFoodPlan] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [displayAdditionalPax, setDisplayAdditionalPax] = useState(false);
  const [roomType, setRoomType] = useState([]);
  const [errorObject, setErrorObject] = useState({});
  const [hotelAgent, setHotelAgent] = useState({});
  const [visitOfPurpose, setVisitOfPurpose] = useState([]);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [otherChargeModalOpen, setOtherChargeModalOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saveLoader, setSaveLoader] = useState(false);
  const [additionalChargeData, setAdditionalChargeData] = useState([]);
  const [showIdProofModal, setShowIdProofModal] = useState(false);
  const [defaultPax, setDefaultPax] = useState({});
  const [defaultFoodPlan, setDefaultFoodPlan] = useState({});
  const isSaving = saveLoader || submitLoader || isSubmittingRef.current;
  const idDocsRef = useRef(null);

  const { _id: cmp_id, configurations } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );

  const [idProof, setIdProof] = useState({
    idType: "",
    idNumber: "",
    documents: [],
  });
  let addFoodPlanWithRate = configurations?.[0]?.foodPlaWithRoomRate;
  let addPaxWithRate = configurations?.[0]?.additionalPaxWithRoomRate;
  console.log(editData);
  let discountBasedOnGrossAmount =
    configurations?.[0]?.discountBasedOnGrossAmountInHotel;
  const tariffMinAllowedDate =
    isTariffRateChange && lockedThroughDate
      ? nextIsoDate(lockedThroughDate)
      : editData?.arrivalDate || "";
  const hasTariffEditableWindow =
    !isTariffRateChange ||
    !lockedThroughDate ||
    !editData?.checkOutDate ||
    tariffMinAllowedDate <= editData.checkOutDate;
  const isFormReadOnly =
    Boolean(editData) &&
    (isEditLockLoading ||
      isEditLocked ||
      (isTariffRateChange && !hasTariffEditableWindow));

  const [includeFoodRateWithRoom, setIncludeFoodRateWithRoom] = useState(
    addFoodPlanWithRate ?? false,
  );
  const [includePaxRateWithRoom, setIncludePaxRateWithRoom] = useState(
    addPaxWithRate ?? false,
  );

  console.log("jaiid");

  console.log(addFoodPlanWithRate, includeFoodRateWithRoom);

  const { data, loading } = useFetch(
    `/api/sUsers/getProductSubDetails/${cmp_id}?type=roomType`,
  );
  useEffect(() => {
    if (data) setRoomType(data?.data);
  }, [data]);

  const { data: defaultPaxResponse } = useFetch(
    `/api/sUsers/getDefaultPax/${cmp_id}`,
  );

  useEffect(() => {
    if (defaultPaxResponse) {
      setDefaultPax(defaultPaxResponse.data);
    }
  }, [defaultPaxResponse]);

  const { data: defaultPlanResponse } = useFetch(
    `/api/sUsers/getDefaultPlan/${cmp_id}`,
  );

  useEffect(() => {
    if (defaultPlanResponse) {
      setDefaultFoodPlan(defaultPlanResponse.data);
    }
  }, [defaultPlanResponse]);

  const { data: visitOfPurposeData, loading: visitOfPurposeLoading } = useFetch(
    `/api/sUsers/getVisitOfPurpose/${cmp_id}`,
  );
  useEffect(() => {
    if (visitOfPurposeData) setVisitOfPurpose(visitOfPurposeData?.data);
  }, [visitOfPurposeData]);

  const today = new Date();
  const isoDate = (d) => d.toISOString().split("T")[0];
  const arrivalDateDefault = isoDate(today);
  const checkOutDateObj = new Date(today);
  checkOutDateObj.setDate(today.getDate() + 1);
  const checkOutDateDefault = isoDate(checkOutDateObj);
  const currentDateDefault = isoDate(today);

  useEffect(() => {
    if (submitLoader) {
      console.log("submitLoader", submitLoader);
      setShowPaymentModal(true);
      setSaveLoader(true);
    }
  }, [submitLoader]);

  const [formData, setFormData] = useState({
    bookingDate: arrivalDateDefault,
    voucherNumber: voucherNumber,
    voucherId: "",
    arrivalDate: arrivalDateDefault,
    arrivalTime: "",
    checkOutDate: checkOutDateDefault,
    checkOutTime: "",
    currentDate: currentDateDefault,
    updatedDate: currentDateDefault,
    stayDays: 1,
    bookingType: "offline",
    country: "India",
    state: "Kerala",
    guestCountry: "India",
    guestState: "Kerala",
    pinCode: "",
    detailedAddress: "",
    mobileNumber: "",
    guestName: "",
    guestId: "",
    guestPinCode: "",
    guestDetailedAddress: "",
    guestMobileNumber: "",
    selectedRoomPrice: "",
    priceLevelRate: "",
    priceLevelId: "",
    discountPercentage: 0,
    discountAmount: 0,
    advanceAmount: 0,
    totalAmount: 0,
    balanceToPay: 0,
    totalAdvance: 0,
    foodPlan: [],
    grandTotal: 0,
    previousAdvance: 0,
    roomTotal: 0,
    paxTotal: 0,
    foodPlanTotal: 0,
    company: "",
    nextDestination: "",
    dateOfBirth: "",
    dateOfArrivalInIndia: "",
    visaNo: "",
    visaPOI: "",
    visaDOI: "",
    visaExpDt: "",
    certOfRegistrationNumber: "",
    passportNo: "",
    placeOfIssue: "",
    dateOfIssue: "",
    dateOfExpiry: "",
    grcno: "",
    addTaxWithRate: configurations[0]?.addRateWithTax?.hotelSale,
    addPaxWithRate: includePaxRateWithRoom,
    addFoodPlanWithRate: includeFoodRateWithRoom,
  });

  useEffect(() => {
    if (editData) {
      console.log("editData", editData.selectedRooms[0]?._id);
      setSelectedParty(editData?.customerId);
      setSelectedGuest(editData?.guestId);
      setHotelAgent(editData?.agentId);
      setCountry(editData?.country || "");
      setVoucherNumber(editData?.voucherNumber);
      let highestDate = editData?.checkOutDate;
      if (isTariffRateChange) {
        highestDate =
          currentDateDefault > highestDate ? currentDateDefault : highestDate;
      }
      setFormData((prev) => ({
        ...prev,
        country: editData?.country,
        customerId: editData?.customerId?._id,
        voucherNumber: editData?.voucherNumber,
        state: editData?.state,
        pinCode: editData?.pinCode,
        detailedAddress: editData?.detailedAddress,
        mobileNumber: editData?.mobileNumber,
        arrivalDate: editData?.arrivalDate || prev.arrivalDate,
        arrivalTime: editData?.arrivalTime || prev.arrivalTime,
        checkOutDate: highestDate || prev.checkOutDate,
        checkOutTime: editData?.checkOutTime || prev.checkOutTime,
        stayDays: editData?.stayDays ?? prev.stayDays,
        bookingType: editData?.bookingType || prev.bookingType,
        selectedRooms: editData?.selectedRooms || [],
        additionalPaxDetails: editData?.additionalPaxDetails || [],
        foodPlan: editData?.foodPlan || [],
        paxTotal: editData?.paxTotal || 0,
        foodPlanTotal: editData?.foodPlanTotal || 0,
        roomTotal: editData?.roomTotal || 0,
        discountPercentage: editData?.discountPercentage || 0,
        discountAmount: editData?.discountAmount || 0,
        totalAdvance: editData?.totalAdvance || 0,
        visitOfPurpose: editData?.visitOfPurpose,
        voucherId: editData?.voucherId,
        customerName: editData?.customerId?.partyName,
        accountGroup: editData?.customerId?.accountGroup,
        guestName: editData?.guestId?.partyName,
        guestId: editData?.guestId?._id || editData?.guestId,
        guestCountry: editData?.guestCountry,
        guestState: editData?.guestState,
        guestPinCode: editData?.pinCode,
        guestDetailedAddress: editData?.guestDetailedAddress,
        guestMobileNumber: editData?.guestMobileNumber,
        balanceToPay: editData?.balanceToPay || 0,
        advanceAmount: 0,
        previousAdvance: editData?.previousAdvance || 0,
        company: editData?.company || "",
        nextDestination: editData?.nextDestination || "",
        dateOfBirth: editData?.dateOfBirth || "",
        dateOfArrivalInIndia: editData?.dateOfArrivalInIndia || "",
        visaNo: editData?.visaNo || "",
        visaPOI: editData?.visaPOI || "",
        visaDOI: editData?.visaDOI || "",
        visaExpDt: editData?.visaExpDt || "",
        certOfRegistrationNumber: editData?.certOfRegistrationNumber || "",
        passportNo: editData?.passportNo || "",
        placeOfIssue: editData?.placeOfIssue || "",
        dateOfIssue: editData?.dateOfIssue || "",
        dateOfExpiry: editData?.dateOfExpiry || "",
        grcno: editData?.grcno || "",
        currentDate: editData?.arrivalDate || currentDateDefault,
        updatedDate: editData?.updatedDate || currentDateDefault,
        gstNo: editData?.gstNo || "",
        otherChargeDetails: editData?.otherChargeDetails || [],
        addFoodPlanWithRate: editData?.addFoodPlanWithRate,
        addPaxWithRate: editData?.addPaxWithRate,
        roomSwapHistory: editData?.roomSwapHistory || [],
        addTaxWithRate: editData?.addTaxWithRate || false,
        // addFoodPlanWithRate: editData?.addFoodPlanWithRate || false,
      }));

      setIncludeFoodRateWithRoom(editData?.addFoodPlanWithRate);
      setIncludePaxRateWithRoom(editData?.addPaxWithRate);
      // ✅ Restore idProof when editing
      if (editData?.idProof) {
        setIdProof({
          idType: editData.idProof.idType || "",
          idNumber: editData.idProof.idNumber || "",
          documents: (editData.idProof.documents || []).map((doc, index) => ({
            id: `existing-${index}`,
            file: null,
            preview: "",
            url: doc.url,
            name: doc.originalName || "Document",
            type: doc.mimeType || "",
            publicId: doc.publicId || "",
            isExisting: true,
          })),
        });
      }
    }
  }, [editData]);

  useEffect(() => {
    if (!isTariffRateChange || !editData?.checkOutDate) return;

    setFormData((prev) => {
      const minimumAllowedDate = lockedThroughDate
        ? nextIsoDate(lockedThroughDate)
        : prev.arrivalDate || editData.arrivalDate || currentDateDefault;

      if (
        minimumAllowedDate &&
        minimumAllowedDate <= editData.checkOutDate &&
        (!prev.currentDate || prev.currentDate < minimumAllowedDate)
      ) {
        return {
          ...prev,
          currentDate: minimumAllowedDate,
        };
      }

      return prev;
    });
  }, [
    currentDateDefault,
    editData?.arrivalDate,
    editData?.checkOutDate,
    isTariffRateChange,
    lockedThroughDate,
  ]);

  // setting room id for selected room
  useEffect(() => {
    if (roomId) setSelectedRoomId(roomId);
  }, [roomId]);

  // function used to fetch additional charge data
  useEffect(() => {
    const callAdditionalCharge = async () => {
      const response = await api.get(
        `/api/sUsers/additionalcharges/${cmp_id}`,
        {
          withCredentials: true,
        },
      );
      setAdditionalChargeData(response?.data?.additionalCharges);
    };
    callAdditionalCharge();
  }, []);

  // on change function
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    if (name === "country") setCountry(value);

    if (name === "arrivalDate") {
      const checkout = new Date(value);
      console.log(checkout);
      if (formData.stayDays) {
        checkout.setDate(checkout.getDate() + (Number(formData.stayDays) + 1));
      } else {
        checkout.setDate(checkout.getDate() + 1);
      }
      const formattedCheckout = isoDate(checkout);
      console.log(value, checkout, formattedCheckout);

      const updatedSelectedItems =
        formData.selectedRooms?.map((room) => {
          const stayDay = calculateStayDays(
            formData,
            room,
            value,
            checkout,
            Number(formData.stayDays) + 1,
          );

          console.log(stayDay);

          return {
            ...room,
            stayDays: stayDay,
            totalAmount: room.priceLevelRate * stayDay,
          };
        }) ?? [];

      console.log(updatedSelectedItems);

      setFormData((prev) => ({
        ...prev,
        checkOutDate: formattedCheckout,
        arrivalDate: value,
        stayDays: formData.stayDays ? Number(formData.stayDays + 1) : 1,
        selectedRooms: updatedSelectedItems,
        updatedDate: currentDateDefault,
      }));
      return;
    }

    if (name === "checkOutDate") {
      const arrivalDate = new Date(formData.arrivalDate);
      const checkOutDate = new Date(value);
      const diffTime = checkOutDate - arrivalDate;
      let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // check stay the diffDays always greater than 1
      if (diffDays < 1) diffDays = 1;
      const updatedSelectedItems =
        formData.selectedRooms?.map((room) => {
          const stayDays = calculateStayDays(
            formData,
            room,
            formData?.arrivalDate,
            checkOutDate,
            diffDays,
          );

          console.log(stayDays);

          return {
            ...room,
            stayDays,
            totalAmount: room.priceLevelRate * stayDays,
          };
        }) ?? [];

      setFormData((prev) => ({
        ...prev,
        checkOutDate: value,
        stayDays: diffDays,
        selectedRooms: updatedSelectedItems,
        updatedDate: currentDateDefault,
      }));
      return;
    }

    if (name === "stayDays") {
      const arrival = new Date(formData.arrivalDate);
      const stayDays = parseInt(value || 0);
      if (!isNaN(stayDays)) {
        const checkout = new Date(arrival);
        checkout.setDate(arrival.getDate() + stayDays);

        const updatedSelectedItems =
          formData.selectedRooms?.map((room) => {
            const roomStayDays = calculateStayDays(
              formData,
              room,
              formData?.arrivalDate,
              checkout,
              stayDays,
            );

            console.log(stayDays, roomStayDays);

            return {
              ...room,
              stayDays: roomStayDays,
              totalAmount: roomStayDays * room.priceLevelRate,
            };
          }) || [];

        console.log(updatedSelectedItems);
        const formattedCheckout = isoDate(checkout);
        setFormData((prev) => ({
          ...prev,
          stayDays: value,
          checkOutDate: formattedCheckout,
          selectedRooms: updatedSelectedItems,
          updatedDate: currentDateDefault,
        }));
      } else {
        setFormData((prev) => ({ ...prev, stayDays: value }));
      }
      return;
    }

    if (name === "currentDate") {
      const current = new Date(value);
      const minimumTariffDate =
        isTariffRateChange && lockedThroughDate
          ? nextIsoDate(lockedThroughDate)
          : formData.arrivalDate;
      const arrival = new Date(minimumTariffDate);
      const checkout = new Date(formData.checkOutDate);

      // Check if currentDate is within the range
      if (current >= arrival && current <= checkout) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      } else {
        toast.error(
          `Tariff applicable date must be between ${minimumTariffDate} and ${formData.checkOutDate}`,
        );
      }
      return;
    }
    console.log(name);
    if (name === "detailedAddress") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        guestDetailedAddress: value,
      }));
      return;
    }

    if (name === "country") {
      setFormData((prev) => ({ ...prev, [name]: value, guestCountry: value }));
      return;
    }
    if (name === "state") {
      setFormData((prev) => ({ ...prev, [name]: value, guestState: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // arrival time and date helper
  const handleIdChange = (e) => {
    const { name, value } = e.target;
    setIdProof((prev) => ({ ...prev, [name]: value }));
  };

  const handleIdFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    const validFiles = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Please select JPEG, PNG, WebP or PDF`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File size should be less than 5MB`);
        continue;
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : "",
        url: "",
        name: file.name,
        type: file.type,
        publicId: "",
        isExisting: false,
      });
    }

    setIdProof((prev) => ({
      ...prev,
      documents: [...prev.documents, ...validFiles],
    }));

    e.target.value = "";
  };

  const handleIdRemove = (docId) => {
    setIdProof((prev) => {
      const doc = prev.documents.find((item) => item.id === docId);

      if (doc?.preview && !doc?.isExisting) {
        URL.revokeObjectURL(doc.preview);
      }

      return {
        ...prev,
        documents: prev.documents.filter((item) => item.id !== docId),
      };
    });
  };

  const uploadIdProofDocuments = async () => {
    const existingDocs = idProof.documents.filter(
      (doc) => doc.isExisting && doc.url,
    );
    const newDocs = idProof.documents.filter((doc) => doc.file);

    const uploadedDocs = await Promise.all(
      newDocs.map(async (doc) => {
        const result = await uploadImageToCloudinary(doc.file);

        return {
          url: result.secure_url,
          publicId: result.public_id || "",
          originalName: doc.name,
          mimeType: doc.type,
        };
      }),
    );

    return [
      ...existingDocs.map((doc) => ({
        url: doc.url,
        publicId: doc.publicId || "",
        originalName: doc.name || "",
        mimeType: doc.type || "",
      })),
      ...uploadedDocs,
    ];
  };
  const handleArrivalTimeChange = (time) =>
    console.log(time) ||
    setFormData((prev) => ({
      ...prev,
      arrivalTime: time,
      updatedDate: currentDateDefault,
    }));

  // checkout  time and date helper
  const handleCheckOutTimeChange = (time) =>
    setFormData((prev) => ({
      ...prev,
      checkOutTime: time,
      updatedDate: currentDateDefault,
    }));

  // checking customer is indian or foreign
  const isForeign =
    country.trim().toLowerCase() !== "india" && country.trim() !== "";

  // getting voucher series data for specific ones
  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(
        `/api/sUsers/getSeriesByVoucher/${cmp_id}?voucherType=${isFor}`,
        { withCredentials: true },
      );
      if (response.data) {
        const specificSeries = response.data.series?.find(
          (item) => item.under === "hotel",
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

          setFormData((prev) => ({
            ...prev,
            voucherNumber: specificNumber,
            voucherId: specificSeries._id,
            voucherType: "",
            ...(isShowGrc && {
              grcno: currentNumber.toString(),
            }),
          }));
          setVoucherNumber(specificNumber);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching data");
    } finally {
      setIsLoading(false);
    }
  }, [cmp_id, isFor, setIsLoading]);

  // activation useEffect for fetching data
  useEffect(() => {
    if (!editData || isFor === "deliveryNote" || isFor === "sales") {
      fetchData();
    }
  }, [fetchData, editData, isFor]);

  // Fixed calculation: Room total + Pax + Food Plan = Total Amount, then apply discount (from other charges in final side)

  useEffect(() => {
    const handler = setTimeout(() => {
      const roomTotal = Number(formData?.roomTotal || 0);

      let otherChargeAmount = 0;
      let discountAmount = 0;

      if (
        Array.isArray(formData?.otherChargeDetails) &&
        formData.otherChargeDetails.length > 0
      ) {
        const valueDetails = formData.otherChargeDetails.reduce(
          (acc, item) => {
            const value = Number(item?.finalValue || 0);

            if (item?.action === "add") {
              acc.otherChargeAmount += value;
            } else if (item?.action === "sub") {
              acc.discountAmount += value;
            }

            return acc;
          },
          { otherChargeAmount: 0, discountAmount: 0 },
        );

        otherChargeAmount = valueDetails.otherChargeAmount;
        discountAmount = valueDetails.discountAmount;
      }
      const totalAmount = roomTotal;

      const grandTotal = roomTotal;

      const totalAdvance = Number(
        formData?.totalAdvance > 0
          ? formData.totalAdvance
          : formData?.advanceAmount || 0,
      );

      const balanceToPay = (
        Number(grandTotal) -
        discountAmount -
        totalAdvance +
        otherChargeAmount
      ).toFixed(2);

      setFormData((prev) => ({
        ...prev,
        totalAmount: totalAmount.toFixed(2),
        otherChargeAmount: Number(otherChargeAmount.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        grandTotal,
        balanceToPay,
      }));
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formData.roomTotal,
    formData.paxTotal,
    formData.foodPlanTotal,
    formData.totalAdvance,
    formData.advanceAmount,
    formData.otherChargeDetails,
  ]);

  // recalculating other charges if any of the values are changed in the parent side component
  const isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  useEffect(() => {
    const handler = setTimeout(async () => {
      const roomTotal = Number(formData?.roomTotal || 0);

      let updatedOtherChargeDetails = Array.isArray(
        formData?.otherChargeDetails,
      )
        ? [...formData.otherChargeDetails]
        : [];

      if (updatedOtherChargeDetails.length > 0) {
        updatedOtherChargeDetails = await Promise.all(
          updatedOtherChargeDetails.map(async (item) => {
            const recalculated = await calculateOtherCharges({
              total: roomTotal,
              inputValue: Number(item?.value || 0),
              inputType: item?.amountType,
              taxPercentage: Number(item?.taxPercentage || 0),
              discountBasedOnGrossAmount,
              formData,
            });

            console.log(recalculated);

            return {
              ...item,
              taxAmt: Number(recalculated?.taxAmt || 0),
              finalValue: Number(recalculated?.finalValue || 0),
            };
          }),
        );
      }

      console.log(updatedOtherChargeDetails);

      const { otherChargeAmount, discountAmount } =
        updatedOtherChargeDetails.reduce(
          (acc, item) => {
            const value = Number(item?.finalValue || 0);

            if (item?.action === "add") acc.otherChargeAmount += value;
            if (item?.action === "sub") acc.discountAmount += value;

            return acc;
          },
          { otherChargeAmount: 0, discountAmount: 0 },
        );

      const subTotal = roomTotal;
      const grandTotal = subTotal + otherChargeAmount - discountAmount;

      const totalAdvance = Number(
        formData?.totalAdvance > 0
          ? formData.totalAdvance
          : formData?.advanceAmount || 0,
      );

      const balanceToPay = (grandTotal - totalAdvance).toFixed(2);

      // 🔥 PREVENT LOOP
      if (
        isEqual(updatedOtherChargeDetails, formData.otherChargeDetails) &&
        Number(formData.grandTotal) === Number(grandTotal)
      ) {
        return; // no change → no setState → no loop
      }

      setFormData((prev) => ({
        ...prev,
        otherChargeDetails: updatedOtherChargeDetails,
        otherChargeAmount,
        discountAmount,
        totalAmount: subTotal.toFixed(2),
        grandTotal: Number(grandTotal.toFixed(2)),
        balanceToPay,
      }));
    }, 300);

    return () => clearTimeout(handler);
  }, [
    formData.roomTotal,
    formData.paxTotal,
    formData.foodPlanTotal,
    formData.totalAdvance,
    formData.advanceAmount,
    formData.selectedRooms,
    formData.otherChargeDetails,
  ]);

  const handleSelection = (party, search, isGuest) => {
    if (isGuest) {
      setSelectedGuest(party);
    } else {
      setSelectedParty(party);
      setSelectedGuest(party);
    }

    console.log(party);

    if (!party) {
      if (!isGuest) {
        setFormData((prev) => ({
          ...prev,
          customerName: search,
          customerId: "",
          country: "",
          state: "",
          pinCode: "",
          detailedAddress: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          guestName: search,
          // guestId: "",
          // guestCountry: "",
          // guestState: "",
          // guestPinCode: "",
          // guestDetailedAddress: "",
        }));
      }

      return;
    }
    console.log(isGuest);
    console.log(party);
    if (!isGuest) {
      setFormData((prev) => ({
        ...prev,
        customerName: party.partyName,
        customerId: party._id,
        country: party.country,
        accountGroup: party?.accountGroup,
        state: party.state,
        pinCode: party.pin,
        gstNo: party.gstNo,
        detailedAddress: party.billingAddress,
        mobileNumber: party.mobileNumber,
        guestName: party.partyName,
        guestId: party._id,
        guestCountry: party.country,
        guestAccountGroup: party?.accountGroup,
        guestState: party.state,
        guestPinCode: party.pin,
        guestDetailedAddress: party.billingAddress,
        guestMobileNumber: party.mobileNumber,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        guestName: party.partyName,
        guestId: party._id,
        guestCountry: party.country,
        guestAccountGroup: party?.accountGroup,
        guestState: party.state,
        guestPinCode: party.pin,
        guestDetailedAddress: party.billingAddress,
        guestMobileNumber: party.mobileNumber,
      }));
    }
  };

  const handleSelectOtherCharge = (charge, selectedForRoom, forAllRooms) => {
    const discountAmount = charge.reduce((acc, item) => {
      if (item?.action === "sub") acc += Number(item?.finalValue || 0);
      return acc;
    }, 0);

    const otherChargeAmount = charge.reduce((acc, item) => {
      if (item?.action === "add") acc += Number(item?.finalValue || 0);
      return acc;
    }, 0);

    const discountAmountWithOutTax = charge.reduce((acc, item) => {
      if (item?.action === "sub") {
        const amount = Number(item?.finalValue || 0);
        const tax = Number(item?.taxAmt || 0);

        acc += item?.includeTax ? amount - tax : amount;
      }

      return acc;
    }, 0);

    const otherChargeWithOutTax = charge.reduce((acc, item) => {
      if (item?.action === "add") {
        const amount = Number(item?.finalValue || 0);
        const tax = Number(item?.taxAmt || 0);

        acc += item?.includeTax ? amount - tax : amount;
      }

      return acc;
    }, 0);

    if (selectedRoomId && selectedForRoom) {
      const updatedRooms = formData?.selectedRooms?.map((room) => {
        if (forAllRooms || room.roomId === selectedRoomId) {
          return {
            ...room,
            otherChargeDetails: charge,
            discountAmount,
            otherChargeAmount,
            discountAmountWithOutTax,
            otherChargeWithOutTax,
          };
        }

        return room;
      });

      setFormData((prev) => ({
        ...prev,
        selectedRooms: updatedRooms,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        otherChargeDetails: charge,
        discountAmount,
        otherChargeAmount,
        discountAmountWithOutTax,
        otherChargeWithOutTax,
      }));
    }

    setSelectedRoomId(null);
    setOtherChargeModalOpen(false);
  };

  const handleAvailableRoomSelection = (selectedRoom) => {
    setFormData((prev) => ({
      ...prev,
      selectedRoomId: selectedRoom?._id,
      priceLevelId: selectedRoom?.priceLevel[0]?.pricelevel?._id,
      priceLevelRate: selectedRoom?.priceLevel[0]?.priceRate,
      updatedDate: currentDateDefault,
    }));
  };

  const handleAdditionalPaxDetails = (details, room) => {
    let filteredDetails = details.filter((i) => i.paxID !== "");

    const existingDetails = Array.isArray(formData?.additionalPaxDetails)
      ? formData.additionalPaxDetails
      : [];

    const filterData = existingDetails.filter((i) => i.roomId !== room);
    const totalAmount = filteredDetails.reduce(
      (acc, item) => acc + Number(item.rate),
      0,
    );
    const selectedRoom = formData?.selectedRooms?.find(
      (i) => i.roomId === room,
    );

    if (!selectedRoom) {
      toast.error("Room not found");
      return;
    }
    let amountWithFoodPlan =
      totalAmount +
      (includeFoodRateWithRoom ? selectedRoom.foodPlanAmountWithTax : 0);
    if (
      Number(amountWithFoodPlan) > Number(selectedRoom?.priceLevelRate) &&
      includePaxRateWithRoom
    ) {
      setIncludePaxRateWithRoom(formData?.addPaxWithRate);
      toast.error(
        "Rate cannot be less than sum of food plan amount or additional pax amount",
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      additionalPaxDetails: [...filterData, ...filteredDetails],
      paxTotal: totalAmount,
      addPaxWithRate: includePaxRateWithRoom,
      updatedDate: currentDateDefault,
    }));
  };

  const handleFoodPlanData = (details, room) => {
    const existingDetails = Array.isArray(formData?.foodPlan)
      ? formData.foodPlan
      : [];
    const filterData = existingDetails.filter((i) => i.roomId != room);
    const totalAmount = details.reduce(
      (acc, item) => acc + Number(item.rate),
      0,
    );
    const selectedRoom = formData?.selectedRooms?.find(
      (i) => i.roomId === room,
    );

    if (!selectedRoom) {
      toast.error("Room not found");
      return;
    }
    let amountWithAdditionalPax =
      totalAmount +
      (includePaxRateWithRoom ? selectedRoom.additionalPaxAmountWithTax : 0);
    if (
      Number(amountWithAdditionalPax) > Number(selectedRoom?.priceLevelRate) &&
      includeFoodRateWithRoom
    ) {
      setIncludeFoodRateWithRoom(formData?.addFoodPlanWithRate);
      toast.error(
        "Rate cannot be less than sum of food plan amount or additional pax amount",
      );
      return;
    }

    setFormData((prev) => ({
      ...prev,
      foodPlan: [...filterData, ...details],
      foodPlanTotal: totalAmount,
      addFoodPlanWithRate: includeFoodRateWithRoom,
      addPaxWithRate: includePaxRateWithRoom,
      updatedDate: currentDateDefault,
    }));
  };

  console.log(formData.selectedRooms);

  const selectedRoomData = (id, to) => {
    if (to === "addPax") {
      setDisplayAdditionalPax(true);
      setSelectedRoomId(id);
    }
    if (to === "addFoodPlan") {
      setDisplayFoodPlan(true);
      setSelectedRoomId(id);
    }
    if (to === "addAdjustment") {
      setOtherChargeModalOpen(true);
      setSelectedRoomId(id);
    }
    if (to === "increasePaxCount") {
      // setDiscountModalOpen(true);
      setSelectedRoomId(id);
    }
  };

  const handleAgentSelect = (agent) => {
    setHotelAgent(agent);
    setFormData((prev) => ({ ...prev, agentId: agent ? agent._id : "" }));
  };

  const preserveSelectedRoomIds = (previousRooms = [], nextRooms = []) => {
    const usedSelectedRoomIds = new Set(
      nextRooms
        .map((room) => room?._id && String(room._id))
        .filter(Boolean),
    );

    return nextRooms.map((nextRoom) => {
      if (nextRoom?._id) return nextRoom;

      const matchingRooms = previousRooms.filter((previousRoom) => {
        const sameRoom =
          String(previousRoom?.roomId?._id || previousRoom?.roomId || "") ===
          String(nextRoom?.roomId?._id || nextRoom?.roomId || "");
        const sameSwapState =
          Boolean(previousRoom?.isSwapped) === Boolean(nextRoom?.isSwapped);
        const sameSwapDate =
          String(previousRoom?.swappingDateFrom || "") ===
          String(nextRoom?.swappingDateFrom || "");

        return (
          previousRoom?._id &&
          !usedSelectedRoomIds.has(String(previousRoom._id)) &&
          sameRoom &&
          sameSwapState &&
          sameSwapDate
        );
      });

      if (matchingRooms.length !== 1) return nextRoom;

      const selectedRoomId = String(matchingRooms[0]._id);
      usedSelectedRoomIds.add(selectedRoomId);
      return { ...nextRoom, _id: matchingRooms[0]._id };
    });
  };

  const handleAvailableRooms = (rooms, total) => {
    if (rooms.length > 0) {
      // ✅ CRITICAL: If in tariff rate change mode, merge with existing rooms
      if (isTariffRateChange && roomId && editData?.selectedRooms) {
        // Get the updated room (should be rooms[0] in tariff change mode)
        const updatedRoom = rooms.find((room) => room.roomId === roomId);
        if (updatedRoom) {
          // Find and replace only the edited room, keep all others
          const mergedRooms = editData.selectedRooms.map((originalRoom) => {
            // Get the room ID from various possible structures
            const originalRoomId =
              originalRoom.roomId?._id?.toString() ||
              originalRoom.roomId?.toString() ||
              originalRoom._id?.toString();

            // If this is the room being edited, replace it
            if (originalRoomId === roomId?.toString()) {
              return {
                ...updatedRoom,
                _id: originalRoom._id, // Preserve original _id
                roomId: originalRoom.roomId, // Preserve roomId reference
              };
            }

            // Keep all other rooms unchanged
            return originalRoom;
          });

          // Recalculate total for ALL rooms
          const newTotal = mergedRooms.reduce(
            (sum, room) =>
              sum + Number(room.amountAfterTax || room.totalAmount || 0),
            0,
          );

          setFormData((prev) => ({
            ...prev,
            selectedRooms: mergedRooms, // ✅ Use ALL rooms
            roomTotal: newTotal,
            updatedDate: currentDateDefault,
          }));
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        selectedRooms: preserveSelectedRoomIds(prev.selectedRooms, rooms),
        roomTotal: total,
        updatedDate: currentDateDefault,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedRooms: [],
        roomTotal: 0,
        updatedDate: currentDateDefault,
      }));
    }
  };

  const IdUploadSlot = ({
    label,
    side,
    fileRef,
    idProof,
    onFileChange,
    onUpload,
    onRemove,
  }) => {
    const isUploading =
      idProof[`isUploading${side.charAt(0).toUpperCase() + side.slice(1)}`];
    const preview = idProof[`${side}Preview`];
    const file = idProof[`${side}File`];
    const url = idProof[`${side}Url`];

    return (
      <div className="w-full lg:w-6/12 px-4">
        <div className="relative w-full mb-3">
          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
            {label}
          </label>

          {/* Preview */}
          {preview && (
            <div className="mb-3 relative inline-block">
              {preview.startsWith("data:application/pdf") ? (
                <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded border shadow text-xs text-gray-500">
                  PDF
                </div>
              ) : (
                <img
                  src={preview}
                  alt={label}
                  className="w-24 h-24 object-cover rounded border shadow"
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(side)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}

          {/* File Input */}
          <div className="flex items-center space-x-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => onFileChange(side, e)}
              className="hidden"
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200 text-sm"
            >
              <MdImage className="mr-2" />
              Choose File
            </div>

            {file && !url && (
              <button
                type="button"
                onClick={() => onUpload(side)}
                disabled={isUploading}
                className="flex items-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 text-sm"
              >
                <MdCloudUpload className="mr-2" />
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            )}
          </div>

          {url && (
            <p className="text-green-600 text-xs mt-1">
              ✓ Uploaded successfully
            </p>
          )}
        </div>
      </div>
    );
  };

  const submitHandler = async () => {
    if (isFormReadOnly || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    // setSaveLoader(true);
    if (!formData.customerName || formData.customerName.trim() === "") {
      toast.error("Please enter a customer name");
      isSubmittingRef.current = false;
      return;
    }

    if (!formData.customerId) {
      try {
        // isSubmittingRef.current = true;
        // setSaveLoader(true);
        const res = await api.get(`/api/sUsers/PartyList/${cmp_id}`, {
          params: {
            page: 1,
            limit: 50,
            search: formData.customerName.trim(),
            voucher: "sale",
            isAgent: false,
          },
          withCredentials: true,
        });

        const parties = res?.data?.partyList ?? [];
        const exactMatch = parties.find(
          (p) =>
            p.partyName?.toLowerCase() ===
            formData.customerName.trim().toLowerCase(),
        );

        if (exactMatch) {
          toast.warning(
            `Customer "${formData.customerName.trim()}" already exists. Please select from the dropdown instead of typing manually.`,
            { duration: 5000 },
          );
          isSubmittingRef.current = false;
          return; // ❌ Block save
        }
      } catch (_) {
        // silently fail — don't block submit on network error
      }
    }

    // ✅ NEW: Same check for Guest Name
    if (
      !formData.guestId &&
      formData.guestName &&
      formData.guestName.trim() !== ""
    ) {
      try {
        const res = await api.get(`/api/sUsers/PartyList/${cmp_id}`, {
          params: {
            page: 1,
            limit: 50,
            search: formData.guestName.trim(),
            voucher: "sale",
            isAgent: false,
          },
          withCredentials: true,
        });

        const parties = res?.data?.partyList ?? [];
        const exactMatch = parties.find(
          (p) =>
            p.partyName?.toLowerCase() ===
            formData.guestName.trim().toLowerCase(),
        );

        if (exactMatch) {
          toast.warning(
            `Guest "${formData.guestName.trim()}" already exists. Please select from the dropdown instead of typing manually.`,
            { duration: 5000 },
          );
          isSubmittingRef.current = false;
          return; // ❌ Block save
        }
      } catch (_) {
        // silently fail
      }
    }

    if (Number(formData.grandTotal) < 0) {
      toast.error(
        "Please select at least one room or enter price for selected room",
      );
      isSubmittingRef.current = false;
      return;
    }

    console.log("formData", formData);

    let customerId = formData.customerId?.trim?.() || formData.customerId || "";
    let customerName = formData.customerName.trim(); // Use trimmed name
    let country = formData.country;
    let accountGroup = formData.accountGroup;
    let state = formData.state;
    let pinCode = formData.pinCode;
    let detailedAddress = formData.detailedAddress;
    let mobileNumber = formData.mobileNumber || formData.guestMobileNumber;
    let guestName = formData?.guestName;
    let guestId = formData?.guestId || "";
    let guestCountry = formData?.guestCountry;
    let guestState = formData?.guestState;
    let guestPinCode = formData?.guestPinCode;
    let guestDetailedAddress = formData?.guestDetailedAddress;
    let guestMobileNumber = formData?.guestMobileNumber;
    const uploadedDocuments = await uploadIdProofDocuments();
    console.log(guestName);
    console.log(guestId);
    console.log(guestCountry);
    console.log(guestState);
    console.log(guestPinCode);
    console.log(guestDetailedAddress);
    console.log(guestMobileNumber);

    if (!customerId && !isTariffRateChange) {
      try {
        const dataObject = {
          accountGroup: "",
          partyName: formData.customerName,
          // A new guest is often also the billing customer. The mobile input
          // is collected in the guest section, so use it when billing mobile
          // has not been entered separately.
          mobileNumber: formData.mobileNumber || guestMobileNumber || "",
          emailID: "",
          gstNo: "",
          panNo: "",
          billingAddress: formData.detailedAddress,
          shippingAddress: formData.detailedAddress,
          creditPeriod: "",
          creditLimit: "",
          openingBalanceType: "",
          openingBalanceAmount: 0,
          country: formData.country,
          state: formData.state,
          pin: formData.pinCode,
          subGroup: "",
          isHotelAgent: false,
          cpm_id: cmp_id,
          guestName,
        };

        const res = await api.post("/api/sUsers/addParty", dataObject, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });

        toast.success(res.data.message);

        customerId = res.data?.result?._id;
        customerName = res.data?.result?.partyName;
        country = res.data?.result?.country;
        accountGroup = res.data?.result?.accountGroup_id;
        state = res.data?.result?.state;
        pinCode = res.data?.result?.pin;
        detailedAddress = res.data?.result?.billingAddress;
        mobileNumber = res.data?.result?.mobileNumber;
        if (guestName == customerName) {
          guestName = res.data?.result?.partyName;
          guestId = res.data?.result?._id;
          guestCountry = res.data?.result?.country;
          guestState = res.data?.result?.state;
          guestPinCode = res.data?.result?.pin;
          guestDetailedAddress = res.data?.result?.billingAddress;
          guestMobileNumber = res.data?.result?.mobileNumber;
        }
      } catch {
        toast.error("Failed to create customer ");
        isSubmittingRef.current = false;
        return;
      }
    }
    if (
      customerId &&
      !guestId &&
      guestName != customerName &&
      !isTariffRateChange
    ) {
      try {
        const dataObject = {
          accountGroup: "",
          partyName: guestName,
          mobileNumber: guestMobileNumber,
          emailID: "",
          gstNo: "",
          panNo: "",
          billingAddress: guestDetailedAddress,
          shippingAddress: guestDetailedAddress,
          creditPeriod: "",
          creditLimit: "",
          openingBalanceType: "",
          openingBalanceAmount: 0,
          country: guestCountry,
          state: guestState,
          pin: guestPinCode,
          subGroup: "",
          isHotelAgent: false,
          cpm_id: cmp_id,
          guestName,
        };
        console.log(dataObject);

        const res = await api.post("/api/sUsers/addParty", dataObject, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });

        toast.success(res.data.message);
        console.log(res.data.result);
        guestId = res.data?.result?._id;
        guestName = res.data?.result?.partyName;
        guestCountry = res.data?.result?.country;
        guestState = res.data?.result?.state;
        guestPinCode = res.data?.result?.pin;
        guestDetailedAddress = res.data?.result?.billingAddress;
        guestMobileNumber = res.data?.result?.mobileNumber;
      } catch {
        toast.error("Failed to create customer ");
        isSubmittingRef.current = false;
        return;
      }
    }

    // Verify room count hasn't decreased
    if (isTariffRateChange && editData?.selectedRooms) {
      const originalCount = editData.selectedRooms.length;
      const currentCount = formData.selectedRooms?.length || 0;

      if (currentCount < originalCount) {
        console.error("❌ ROOM LOSS DETECTED!");
        console.error(`Original: ${originalCount}, Current: ${currentCount}`);
        toast.error(
          "Error: Some rooms were lost during update. Please try again.",
        );
        isSubmittingRef.current = false;
        return;
      }
    }

    const payload = {
      ...formData,
      guestId,
      guestName,
      guestCountry,
      guestState,
      guestPinCode,
      guestDetailedAddress,
      guestMobileNumber,
      customerId,
      customerName,
      country,
      accountGroup,
      state,
      pinCode,
      detailedAddress,
      mobileNumber,
      voucherNumber,
      selectedRooms: formData.selectedRooms,
      idProof: {
        idType: idProof.idType,
        idNumber: idProof.idNumber,
        documents: uploadedDocuments,
      },
    };

    if (
      Number(formData.advanceAmount) <= 0
      // (Number(formData.advanceAmount) + Number(formData.deletedAmount) ) ==
      //   Number(editData?.advanceAmount)
    ) {
      // if (isSubmittingRef.current) return;
      // isSubmittingRef.current = true;
      console.log(payload);
      let paymenttypeDetails = {};
      handleSubmit(payload, null, paymenttypeDetails);
    } else {
      setFormData((prev) => ({ ...prev, ...payload }));
      setShowPaymentModal(true);
    }
  };

  const handlePayment = async (paymentData) => {
    let finalSelectedRooms = formData.selectedRooms;

    if (isTariffRateChange && roomId && editData?.selectedRooms) {
      // Same merging logic as submitHandler
    }
    const uploadedDocuments = await uploadIdProofDocuments();
    const payload = {
      ...formData,
      selectedRooms: finalSelectedRooms,
      idProof: {
        idType: idProof.idType,
        idNumber: idProof.idNumber,
        documents: uploadedDocuments,
      },
    };

    let cash = 0;
    let upi = 0;
    handlePayment;
    let card = 0;
    const credit = 0;
    let bank = 0;

    console.log(paymentData);
    //     {
    //   mode: 'single',
    //   totalAmount: 100,
    //   payments: [
    //     {
    //       method: 'cash',
    //       paymentType: 'cash',
    //       amount: 100,
    //       accountId: '6895bff914dac3df95ec3971',
    //       accountName: 'Cash1'
    //     }
    //   ]
    // }
    // return

    paymentData.payments.forEach((item) => {
      if (item.paymentType === "upi") {
        upi += item.amount;
      } else if (item.paymentType == "card") {
        card += item.amount;
      } else if (item.paymentType === "bank") {
        bank += item.amount;
      } else if (item.paymentType === "cash") {
        cash += item?.amount;
      }
    });

    const paymenttypeDetails = {
      cash: cash,
      bank: bank,
      upi: upi,
      card: card,
      credit: credit,
    };
    console.log(payload);

    // setSaveLoader(false)
    handleSubmit(payload, paymentData, paymenttypeDetails);
  };

  const handleDeletion = (roomId) => {
    const existingDetails = Array.isArray(formData?.foodPlan)
      ? formData.foodPlan
      : [];
    const filterData = existingDetails.filter((i) => i.roomId !== roomId);
    const totalAmount = [...filterData].reduce(
      (acc, item) => acc + Number(item.rate),
      0,
    );
    const existingDetailsAdditionalPax = Array.isArray(
      formData?.additionalPaxDetails,
    )
      ? formData.additionalPaxDetails
      : [];
    const filterAdditionalData = existingDetailsAdditionalPax.filter(
      (i) => i.roomId !== roomId,
    );
    const AdditionalPaxTotalAmount = [...filterAdditionalData].reduce(
      (acc, item) => acc + Number(item.rate),
      0,
    );

    const existingRooms = Array.isArray(formData?.selectedRooms)
      ? formData.selectedRooms
      : [];
    console.log(existingRooms);
    const filterRooms = existingRooms.filter((i) => i.roomId !== roomId);

    setSelectedRoomId(null);

    setFormData((prev) => ({
      ...prev,
      foodPlan: [...filterData],
      foodPlanTotal: totalAmount,
      additionalPaxDetails: [...filterAdditionalData],
      paxTotal: AdditionalPaxTotalAmount,
      updatedDate: currentDateDefault,
      selectedRooms: [...filterRooms],
    }));
  };

  const handleClose = () => setShowPaymentModal(false);
  const handleSearchCustomer = (name, isGuest) => {
    console.log(name);
    if (isGuest) {
      setFormData((prev) => ({
        ...prev,
        guestName: name,
        // Clear customerId if user is typing a new name
        guestId: name && !selectedGuest ? "" : prev.guestId,
      }));
      return;
    } else {
      setFormData((prev) => ({
        ...prev,
        customerName: name,
        // Clear customerId if user is typing a new name
        customerId: name && !selectedParty ? "" : prev.customerId,
      }));
    }
  };

  const handleAdvanceAmountChange = (e) => {
    const { value } = e.target;
    const advanceAmount = Math.round(Number(value));
    const previousAdvance = Number(editData?.previousAdvance || 0);
    const grandTotal = Number(formData?.grandTotal || 0);
    const totalAdvance =
      Number(editData?.totalAdvance || 0) + Number(value || 0);

    // if (advanceAmount > maxAllowed) {
    //   setErrorObject((prev) => ({
    //     ...prev,
    //     advanceAmount:
    //       "Advance amount should be less than or equal to grand total",
    //   }));
    //   return;
    // }

    // setErrorObject((prev) => ({ ...prev, advanceAmount: "" }));

    if (isFor === "deliveryNote" || isFor === "sales") {
      console.log("advanceAmount", advanceAmount);
      setFormData((prev) => ({
        ...prev,
        advanceAmount: value,
        balanceToPay: (grandTotal - previousAdvance - advanceAmount).toFixed(2),
        totalAdvance: totalAdvance,
        updatedDate: currentDateDefault,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        advanceAmount: value,
        balanceToPay: (grandTotal - advanceAmount).toFixed(2),
        totalAdvance: totalAdvance,
        updatedDate: currentDateDefault,
      }));
    }
  };

  const handleOutstanding = (id) => {
    let deletedOutStanding = outStanding.find((item) => item._id === id);

    setFormData((prev) => ({
      ...prev,
      advanceAmount: 0,
      balanceToPay:
        Number(formData.balanceToPay) + deletedOutStanding.bill_amount,
      totalAdvance:
        Number(formData.totalAdvance) - deletedOutStanding.bill_amount,
      deletedAmount:
        Number(formData.deletedAmount) + deletedOutStanding.bill_amount,
    }));
    editData.advanceAmount = 0;
    editData.balanceToPay =
      Number(editData.balanceToPay) + deletedOutStanding.bill_amount;
    editData.totalAdvance =
      Number(editData.totalAdvance) - deletedOutStanding.bill_amount;
    editData.deletedAmount =
      Number(editData.deletedAmount) + deletedOutStanding.bill_amount;
  };

  const tariffMode = isTariffRateChange === true;
  const renderDocumentPreview = (doc) => {
    const src = doc.preview || doc.url;

    if (doc.type === "application/pdf") {
      return (
        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600 border">
          PDF
        </div>
      );
    }

    if (src) {
      return (
        <img
          src={src}
          alt={doc.name || "Document"}
          className="w-12 h-12 object-cover rounded border"
        />
      );
    }

    return (
      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600 border">
        FILE
      </div>
    );
  };
  return (
    <>
      {isLoading || visitOfPurposeLoading || loading ? (
        <CustomBarLoader />
      ) : (
        <>
          {showPaymentModal && (
            <PaymentModal
              selected={voucherNumber}
              totalAmount={Number(formData?.advanceAmount)}
              saveLoader={saveLoader}
              setSaveLoader={setSaveLoader}
              onClose={handleClose}
              onPaymentSave={handlePayment}
              cmp_id={cmp_id}
              customers={
                selectedParty
                  ? [
                      {
                        _id: selectedParty._id || formData.customerId,
                        partyName:
                          selectedParty.partyName || formData.customerName,
                      },
                    ]
                  : []
              }
            />
          )}

          {editLockMessage && (
            <div className="mx-4 lg:mx-10 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {editLockMessage}
            </div>
          )}

          <fieldset
            disabled={isFormReadOnly}
            className="border-0 p-0 m-0 min-w-0"
          >
            {!tariffMode ? (
              <>
                <HeaderTile
                  title={formatVoucherType("Booking")}
                  number={voucherNumber}
                  selectedDate={formData.bookingDate}
                  setSelectedDate={(date) =>
                    setFormData((prev) => ({ ...prev, bookingDate: date }))
                  }
                  tab="booking"
                />

                <div className="flex-auto px-4 lg:px-10 py-10 pt-4">
                  <div className="flex flex-wrap gap-6">
                    {/* Booking Number */}
                    <div className="w-full bg-gray-50 border rounded-xl shadow-md p-6">
                      {/* Title */}
                      <h2 className="text-lg font-semibold text-blueGray-800 mb-6">
                        Guest Details
                      </h2>

                      {/* Main Guest Fields */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                          {/* Billing Name */}
                          <div>
                            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                              Billing Name
                            </label>
                            <CustomerSearchInputBox
                              onSelect={handleSelection}
                              selectedParty={selectedParty}
                              isAgent={false}
                              placeholder="Search customers..."
                              sendSearchToParent={handleSearchCustomer}
                              isGuest={false}
                            />
                          </div>

                          {/* Detailed Address */}
                          <div>
                            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                              Detailed Address
                            </label>
                            <input
                              name="detailedAddress"
                              value={formData.detailedAddress}
                              onChange={handleChange}
                              className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:ring-blue-200"
                            />
                          </div>

                          {/* GST / Country / State */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                GST No
                              </label>
                              <input
                                className="w-full border px-3 py-2 rounded text-sm"
                                value={formData.gstNo}
                                name="gstNo"
                                onChange={handleChange}
                              />
                            </div>

                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                Country
                              </label>
                              <input
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full border px-3 py-2 rounded text-sm"
                              />
                            </div>

                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                State
                              </label>
                              <input
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full border px-3 py-2 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                          {/* Guest Name */}
                          <div>
                            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                              Guest Name
                            </label>
                            <CustomerSearchInputBox
                              onSelect={handleSelection}
                              selectedParty={selectedGuest}
                              isAgent={false}
                              placeholder="Search customers..."
                              sendSearchToParent={handleSearchCustomer}
                              isGuest={true}
                            />
                          </div>

                          {/* Detailed Address */}
                          <div>
                            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                              Detailed Address
                            </label>
                            <input
                              className="w-full border px-3 py-2 rounded text-sm"
                              name="guestDetailedAddress"
                              value={formData.guestDetailedAddress}
                              onChange={handleChange}
                            />
                          </div>

                          {/* Country / State / Mobile */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                Country
                              </label>
                              <input
                                className="w-full border px-3 py-2 rounded text-sm"
                                name="guestCountry"
                                value={formData.guestCountry}
                                onChange={handleChange}
                              />
                            </div>

                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                State
                              </label>
                              <input
                                className="w-full border px-3 py-2 rounded text-sm"
                                name="guestState"
                                value={formData.guestState}
                                onChange={handleChange}
                              />
                            </div>

                            <div>
                              <label className="block uppercase text-xs font-bold mb-2">
                                Mobile No
                              </label>
                              <input
                                name="guestMobileNumber"
                                value={formData.guestMobileNumber || ""}
                                onChange={handleChange}
                                className="w-full border px-3 py-2 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Foreign Guest Fields */}
                      {isForeign && (
                        <>
                          <hr className="my-8" />
                          <h3 className="text-base font-semibold text-gray-700 mb-4">
                            Foreign Guest Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Company */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Company
                              </label>
                              <input
                                type="text"
                                name="company"
                                value={formData.company || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Next Destination */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Next Destination
                              </label>
                              <input
                                type="text"
                                name="nextDestination"
                                value={formData.nextDestination || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Date of Birth */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Date of Birth
                              </label>
                              <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Date of Arrival in India */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Date of Arrival in India
                              </label>
                              <input
                                type="date"
                                name="dateOfArrivalInIndia"
                                value={formData.dateOfArrivalInIndia || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Visa No. */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Visa No.
                              </label>
                              <input
                                type="text"
                                name="visaNo"
                                value={formData.visaNo || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Visa POI */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Visa POI
                              </label>
                              <input
                                type="text"
                                name="visaPOI"
                                value={formData.visaPOI || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Visa DOI */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Visa DOI
                              </label>
                              <input
                                type="date"
                                name="visaDOI"
                                value={formData.visaDOI || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Visa Exp. Dt */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Visa Exp. Dt
                              </label>
                              <input
                                type="date"
                                name="visaExpDt"
                                value={formData.visaExpDt || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Registration No. */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Cert. of Registration Number
                              </label>
                              <input
                                type="text"
                                name="certOfRegistrationNumber"
                                value={formData.certOfRegistrationNumber || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Passport No. */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Passport No.
                              </label>
                              <input
                                type="text"
                                name="passportNo"
                                value={formData.passportNo || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Place of Issue */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Place of Issue
                              </label>
                              <input
                                type="text"
                                name="placeOfIssue"
                                value={formData.placeOfIssue || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Date of Issue */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Date of Issue
                              </label>
                              <input
                                type="date"
                                name="dateOfIssue"
                                value={formData.dateOfIssue || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                            {/* Date of Expiry */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Date of Expiry
                              </label>
                              <input
                                type="date"
                                name="dateOfExpiry"
                                value={formData.dateOfExpiry || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                GRC Number
                              </label>
                              <input
                                type="text"
                                name="grcno"
                                value={formData.grcno || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring focus:ring-blue-200 focus:outline-none"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {showIdProofModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-hidden">
                          <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-800">
                              ID Proof
                            </h2>
                            <button
                              type="button"
                              onClick={() => setShowIdProofModal(false)}
                              className="text-gray-500 hover:text-red-500 text-2xl leading-none"
                            >
                              ×
                            </button>
                          </div>

                          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                                  ID Type
                                </label>
                                <select
                                  name="idType"
                                  value={idProof.idType}
                                  onChange={handleIdChange}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                >
                                  <option value="">Select ID Type</option>
                                  <option value="aadhaar">Aadhaar Card</option>
                                  <option value="passport">Passport</option>
                                  <option value="drivinglicense">
                                    Driving License
                                  </option>
                                  <option value="voterid">Voter ID</option>
                                  <option value="pan">PAN Card</option>
                                </select>
                              </div>

                              <div>
                                <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                                  ID Number
                                </label>
                                <input
                                  type="text"
                                  name="idNumber"
                                  placeholder="Enter ID Number"
                                  value={idProof.idNumber}
                                  onChange={handleIdChange}
                                  maxLength={30}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border bg-white shadow-sm p-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                                <div>
                                  <h3 className="text-sm font-semibold text-gray-800">
                                    ID Proof Documents
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-1">
                                    You can select multiple images or PDF files.
                                    Files upload only when you save/update the
                                    booking.
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <input
                                    ref={idDocsRef}
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={handleIdFileChange}
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => idDocsRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                                  >
                                    <MdImage size={18} />
                                    Upload Documents
                                  </button>
                                </div>
                              </div>

                              {idProof.documents.length === 0 ? (
                                <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4 text-center">
                                  No documents selected
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {idProof.documents.map((doc) => {
                                    const fileUrl = doc.preview || doc.url;

                                    return (
                                      <div
                                        key={doc.id}
                                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg p-3"
                                      >
                                        <div className="flex items-center gap-3">
                                          {renderDocumentPreview(doc)}
                                          <div>
                                            <p className="text-sm font-medium text-gray-800">
                                              {doc.name || "Document"}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              {doc.type || "File"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          {fileUrl && (
                                            <a
                                              href={fileUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
                                            >
                                              <MdVisibility size={16} />
                                              View
                                            </a>
                                          )}

                                          {fileUrl && (
                                            <a
                                              href={fileUrl}
                                              download={doc.name || "document"}
                                              className="inline-flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600"
                                            >
                                              <MdDownload size={16} />
                                              Download
                                            </a>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleIdRemove(doc.id)
                                            }
                                            className="inline-flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                                          >
                                            <MdDelete size={16} />
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowIdProofModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* ID Proof Section */}
                    {/* <div className="w-full px-4 mt-4">
  <h6 className="text-blueGray-400 text-sm mb-4 font-bold uppercase border-b pb-2">
    ID Proof
  </h6>
</div> */}

                    {/* <div className="flex flex-wrap w-full"> */}

                    {/* ID Type */}
                    {/* <div className="w-full lg:w-6/12 px-4">
    <div className="relative w-full mb-3">
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
        ID Type
      </label>
      <select
        name="idType"
        value={idProof.idType}
        onChange={handleIdChange}
        className="border-0 px-3 py-3 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
      >
        <option value="">Select ID Type</option>
        <option value="aadhaar">Aadhaar Card</option>
        <option value="passport">Passport</option>
        <option value="driving_license">Driving License</option>
        <option value="voter_id">Voter ID</option>
        <option value="pan">PAN Card</option>
      </select> */}
                    {/* </div>
  </div> */}

                    {/* ID Number */}
                    {/* <div className="w-full lg:w-6/12 px-4">
    <div className="relative w-full mb-3">
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
        ID Number
      </label>
      <input
        type="text"
        name="idNumber"
        placeholder="Enter ID number"
        value={idProof.idNumber}
        onChange={handleIdChange}
        maxLength={20}
        className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
      />
    </div>
  </div> */}

                    {/* ID Front Upload */}
                    {/* <div className="w-full lg:w-6/12 px-4">
    <IdUploadSlot
      label="ID Front Side"
      side="front"
      fileRef={idFrontRef}
      idProof={idProof}
      onFileChange={handleIdFileChange}
      onUpload={handleIdUpload}
      onRemove={handleIdRemove}
    />
  </div> */}

                    {/* ID Back Upload */}
                    {/* <div className="w-full lg:w-6/12 px-4">
    <IdUploadSlot
      label="ID Back Side"
      side="back"
      fileRef={idBackRef}
      idProof={idProof}
      onFileChange={handleIdFileChange}
      onUpload={handleIdUpload}
      onRemove={handleIdRemove}
    />
  </div> */}

                    {/* </div> */}

                    {/* Guest Info Box */}

                    <div className="w-full bg-gray-50 border rounded-xl shadow-md ">
                      <h2 className="text-lg font-semibold text-blueGray-800 mb-6 p-2">
                        Booking & Room Details
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-3 gap-y-4 p-3">
                        {/* Arrival Date */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Arrival Date
                          </label>
                          <input
                            type="date"
                            name="arrivalDate"
                            value={formData.arrivalDate}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          />
                        </div>

                        {/* Arrival Time */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Arrival Time
                          </label>
                          <TimeSelector
                            initialTime={editData?.arrivalTime}
                            onTimeChange={handleArrivalTimeChange}
                          />
                        </div>

                        {/* Check Out Date */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Check Out Date
                          </label>
                          <input
                            type="date"
                            name="checkOutDate"
                            value={formData.checkOutDate}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          />
                        </div>

                        {/* Check Out Time */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Check Out Time
                          </label>
                          <TimeSelector
                            initialTime={editData?.checkOutTime}
                            onTimeChange={handleCheckOutTimeChange}
                          />
                        </div>

                        {/* Booking Type */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Booking Type
                          </label>
                          <select
                            name="bookingType"
                            value={formData.bookingType}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          >
                            <option value="offline">Offline Booking</option>
                            <option value="online">Online Booking</option>
                          </select>
                        </div>
                        {/* Check Out Time */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Check Out Time
                          </label>
                          <TimeSelector
                            initialTime={"11:00 AM" || editData?.checkOutTime}
                            onTimeChange={handleCheckOutTimeChange}
                          />
                        </div>

                        {/* Hotel Agent */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Hotel Agent
                          </label>
                          <CustomerSearchInputBox
                            key={"hotelAgent"}
                            onSelect={handleAgentSelect}
                            isAgent={true}
                            selectedParty={hotelAgent}
                            placeholder="Search customers..."
                          />
                        </div>

                        {/* Stay Days */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Stay Days
                          </label>
                          <input
                            type="text"
                            name="stayDays"
                            value={formData.stayDays}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          />
                        </div>

                        {/* Visit of Purpose */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Visit of purpose
                          </label>
                          <select
                            name="visitOfPurpose"
                            value={formData.visitOfPurpose}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          >
                            <option value="All">Select Room Type</option>
                            {visitOfPurpose.map((data) => (
                              <option key={data?._id} value={data?._id}>
                                {data?.visitOfPurpose}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Room Type */}
                        <div>
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Room Type
                          </label>
                          <select
                            name="roomType"
                            value={formData.roomType}
                            onChange={handleChange}
                            className="w-full border border-gray-300 px-3 py-2 rounded text-sm shadow focus:outline-none focus:ring focus:ring-blue-200 bg-white"
                          >
                            <option value="All">Select Room Type</option>
                            {roomType.map((roomType) => (
                              <option key={roomType?._id} value={roomType?._id}>
                                {roomType?.brand}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          {/* Add Tax With Rate & GRC (spans all columns) */}
                          <div className="col-span-full lg:col-span-5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                              {isShowGrc && (
                                <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                                  GRC NO
                                </label>
                              )}
                              <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                                Add Tax With Rate
                              </label>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* GRC Input */}
                              {isShowGrc && (
                                <input
                                  type="text"
                                  name="grcno"
                                  value={formData.grcno || ""}
                                  onChange={handleChange}
                                  placeholder="GRC %"
                                  className="w-24 border px-2 py-1 rounded text-sm focus:outline-none focus:ring bg-white border-gray-200"
                                />
                              )}
                              {/* Toggle */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleChange({
                                    target: {
                                      name: "addTaxWithRate",
                                      value: !formData.addTaxWithRate,
                                    },
                                  })
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition
            ${formData.addTaxWithRate ? "bg-green-600" : "bg-gray-300"}`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition
              ${formData.addTaxWithRate ? "translate-x-5" : "translate-x-1"}`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* <div className="lg:col-span-2">
                        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                          Other Charge
                        </label> */}
                        {/* <OtherChargeSearchInPutBox
                          onSelect={handleSelectOtherCharge}
                          selectedCharge={formData.otherChargeDetails}
                        /> */}
                        {/* </div> */}

                        {/* Available Rooms (spans all columns) */}
                        <div className="col-span-full lg:col-span-5">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Available Rooms
                          </label>
                          <AvailableRooms
                            onSelect={handleAvailableRoomSelection}
                            selectedParty={selectedParty}
                            placeholder="Search customers..."
                            selectedRoomData={selectedRoomData}
                            setDisplayFoodPlan={setDisplayFoodPlan}
                            sendToParent={handleAvailableRooms}
                            formData={formData}
                            selectedRoomId={selectedRoomId}
                            isTariffRateChange={isTariffRateChange}
                            roomIdToUpdate={roomId}
                            roomFromDashboard={rooms}
                            addTaxWithRate={formData.addTaxWithRate}
                            handleDeletion={handleDeletion}
                            includeFoodRateWithRoom={includeFoodRateWithRoom}
                            includePaxRateWithRoom={includePaxRateWithRoom}
                            defaultPax={defaultPax}
                            defaultFoodPlan={defaultFoodPlan}
                            sendDataToParent={handleAdditionalPaxDetails}
                            setFormData={setFormData}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap pt-4">
                      {/* Booking Number */}
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Total Amount
                          </label>
                          <input
                            type="number"
                            name="totalAmount"
                            value={formData.totalAmount}
                            readOnly
                            className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                        </div>
                      </div>
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3 ">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Discount Amount
                          </label>
                          <input
                            type="number"
                            name="discountAmount"
                            value={
                              formData?.discountAmount === "0"
                                ? ""
                                : formData?.discountAmount
                            }
                            min="0"
                            step="0.01"
                            readOnly
                            className=" border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                        </div>
                      </div>
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Other Charge Amount
                          </label>
                          <input
                            readOnly
                            type="number"
                            name="advanceAmount"
                            value={formData?.otherChargeAmount}
                            className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                          {errorObject?.advanceAmount &&
                            errorObject?.advanceAmount !== "" && (
                              <span className="text-red-500">
                                {errorObject?.advanceAmount}
                              </span>
                            )}
                        </div>
                      </div>
                      {/* <div className="w-full lg:w-6/12 px-4">
                      <div className="relative w-full mb-3">
                        <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                          Previous Advance
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={formData?.previousAdvance}
                          className="text-red-500 border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                        />
                      </div>
                    </div> */}
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            {isFor == "sales" ? "Amount" : "Advance Amount"}
                          </label>
                          <input
                            // readOnly
                            type="number"
                            name="advanceAmount"
                            value={formData?.advanceAmount}
                            onChange={handleAdvanceAmountChange}
                            className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                          {errorObject?.advanceAmount &&
                            errorObject?.advanceAmount !== "" && (
                              <span className="text-red-500">
                                {errorObject?.advanceAmount}
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Total given advance
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={Number(formData?.totalAdvance)}
                            className="text-red-500 border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                        </div>
                      </div>
                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Balance To Be Paid
                          </label>
                          <input
                            type="number"
                            name="balanceToPay"
                            value={formData.balanceToPay}
                            className="text-red-500 border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                          />
                        </div>
                      </div>

                      <div className="w-full lg:w-6/12 px-4">
                        <div className="relative w-full mb-3">
                          <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                            Grand Total
                          </label>
                          <div className="space-y-2">
                            <input
                              type="number"
                              name="grandTotal"
                              value={Math.round(formData.grandTotal)}
                              className="text-green-500 border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                      {formData?.grandTotal > 0 && (
                        <div className="w-full lg:w-6/12 px-4">
                          <div className="flex gap-2 mt-6">
                            {/* Advance — outlined, compact */}
                            <button
                              type="button"
                              onClick={() => setAdvanceModalOpen(true)}
                              className="group flex items-center gap-1.5 px-3 py-2 rounded border border-gray-200 bg-white hover:border-gray-800 hover:bg-gray-50 active:scale-95 transition-all duration-150"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-800 transition-colors duration-150"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  x="2"
                                  y="5"
                                  width="20"
                                  height="14"
                                  rx="2"
                                />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                              <span className="text-xs font-700 text-gray-600 group-hover:text-gray-900 transition-colors duration-150">
                                Advance
                              </span>
                            </button>

                            {/* Other Charges — filled navy, compact */}
                            <button
                              type="button"
                              onClick={() => setOtherChargeModalOpen(true)}
                              className="group flex items-center gap-1.5 px-3 py-2 rounded bg-[#0f172a] hover:bg-[#1e293b] active:scale-95 transition-all duration-150"
                            >
                              <svg
                                className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors duration-150"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                              </svg>
                              <span className="text-xs font-semibold text-white">
                                Other Charges
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowIdProofModal(true)}
                              className="px-4 py-2 bg-red-400 text-white rounded-md text-sm hover:bg-blue-600"
                            >
                              ID Proof
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        className="bg-pink-500 mt-4 ml-4 w-20 text-white active:bg-pink-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md outline-none focus:outline-none mr-1 ease-linear transition-all duration-150 transform hover:scale-105 disabled:cursor-not-allowed disabled:bg-pink-300 disabled:hover:scale-100"
                        type="button"
                        onClick={submitHandler}
                        disabled={isFormReadOnly || isSaving}
                      >
                        {isSaving ? "Saving..." : editData ? "Update" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              //t
              <div className="flex-auto px-4 lg:px-10 py-8">
                <div className="w-full bg-gray-50 border rounded-xl shadow-md p-4 mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <Field
                      label="Check-in Number"
                      value={voucherNumber}
                      readOnly
                    />
                    <FieldDate
                      name="currentDate"
                      label="Tariff Applicable Date"
                      value={formData.currentDate}
                      onChange={handleChange}
                      min={
                        isTariffRateChange && lockedThroughDate
                          ? nextIsoDate(lockedThroughDate)
                          : formData.arrivalDate
                      }
                      max={formData.checkOutDate}
                    />
                    <div>
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        Updated Date (Last Rate Update)
                      </label>
                      <input
                        type="date"
                        name="updatedDate"
                        value={formData.updatedDate}
                        readOnly
                        className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        Arrival Time
                      </label>
                      <TimeSelector
                        initialTime={editData?.arrivalTime}
                        onTimeChange={handleArrivalTimeChange}
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        CheckIn Date
                      </label>
                      <input
                        type="date"
                        name="arrivalDate"
                        value={formData.arrivalDate}
                        readOnly
                        className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                        CheckOut Date
                      </label>
                      <input
                        type="date"
                        name="checkOutDate"
                        value={formData.checkOutDate}
                        readOnly
                        className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full bg-gray-50 border rounded-xl shadow-md p-4 mb-6">
                  <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
                    Available Rooms
                  </label>
                  <AvailableRooms
                    onSelect={handleAvailableRoomSelection}
                    selectedParty={selectedParty}
                    selectedRoomData={selectedRoomData}
                    setDisplayFoodPlan={setDisplayFoodPlan}
                    sendToParent={handleAvailableRooms}
                    formData={formData}
                    selectedRoomId={selectedRoomId}
                    isTariffRateChange={isTariffRateChange}
                    roomIdToUpdate={roomId}
                    addTaxWithRate={formData.addTaxWithRate}
                    includeFoodRateWithRoom={includeFoodRateWithRoom}
                    includePaxRateWithRoom={includePaxRateWithRoom}
                    defaultPax={defaultPax}
                    defaultFoodPlan={defaultFoodPlan}
                    sendDataToParent={handleAdditionalPaxDetails}
                  />
                </div>

                <TotalsSection
                  formData={formData}
                  roomIdToUpdate={roomId}
                  errorObject={errorObject}
                />

                <div className="flex justify-end">
                  {/* {outStanding.length > 0 && (
                  <button
                    className="bg-pink-500 mt-4 ml-4 w-24 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md"
                    type="button"
                    onClick={() => setAdvanceModalOpen(true)}
                  >
                    History
                  </button>
                )} */}
                  <button
                    className="bg-pink-500 mt-4 ml-4 w-24 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md disabled:cursor-not-allowed disabled:bg-pink-300"
                    type="button"
                    onClick={submitHandler}
                    disabled={isFormReadOnly}
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </fieldset>

          <Suspense fallback={<SuspenseLoader />}>
            {otherChargeModalOpen && (
              <AdditionalChargesModal
                isOpen={otherChargeModalOpen}
                onClose={() => setOtherChargeModalOpen(false)}
                onSave={(charges, selectedForRoom, forAllRooms) => {
                  handleSelectOtherCharge(
                    charges,
                    selectedForRoom,
                    forAllRooms,
                  );
                }}
                additionalChargeData={additionalChargeData}
                formData={formData}
                discountBasedOnGrossAmount={discountBasedOnGrossAmount}
                selectedForRoom={selectedRoomId ? true : false}
                selectedRoomId={selectedRoomId}
              />
            )}
          </Suspense>

          {displayAdditionalPax && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
              <div className="bg-white p-6 rounded-xl shadow-xl flex">
                <AdditionalPaxDetails
                  cmp_id={cmp_id}
                  sendDataToParent={handleAdditionalPaxDetails}
                  setDisplayAdditionalPax={setDisplayAdditionalPax}
                  selectedRoomId={selectedRoomId}
                  formData={formData}
                  includePaxRateWithRoom={includePaxRateWithRoom}
                  setIncludePaxRateWithRoom={setIncludePaxRateWithRoom}
                />
              </div>
            </div>
          )}

          {displayFoodPlan && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
              <div className="bg-white p-6 rounded-xl shadow-xl flex">
                <FoodPlanComponent
                  cmp_id={cmp_id}
                  sendDataToParent={handleFoodPlanData}
                  setDisplayFoodPlan={setDisplayFoodPlan}
                  selectedRoomId={selectedRoomId}
                  formData={formData}
                  includeFoodRateWithRoom={includeFoodRateWithRoom}
                  setIncludeFoodRateWithRoom={setIncludeFoodRateWithRoom}
                />
              </div>
            </div>
          )}
        </>
      )}

      <OutStandingModal
        showModal={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        outStanding={outStanding}
        cmp_id={cmp_id}
        sendDataToParent={handleOutstanding}
      />
    </>
  );
}

const tariffRelatedCalculation = (type, formData, roomId) => {
  console.log(formData?.selectedRooms);
  // 1. Room Total
  const roomTotal =
    formData?.selectedRooms?.find((item) => item.roomId === roomId)
      ?.totalAmount || 0;

  // 2. Additional Pax Total
  const additionalPaxTotal =
    formData?.additionalPaxDetails
      ?.filter((item) => item.roomId === roomId)
      ?.reduce((acc, item) => acc + item.rate, 0) || 0;

  // 3. Food Plan Total
  const foodPlanTotal =
    formData?.foodPlan
      ?.filter((item) => item.roomId === roomId)
      ?.reduce((acc, item) => acc + item.rate, 0) || 0;

  // 4. Total Without Tax (from selectedRooms)
  const totalWithTax =
    formData?.selectedRooms?.find((item) => item.roomId === roomId)
      ?.amountAfterTax || 0;

  // 5. Total With Tax (sum of all)
  const totalWithoutTax = roomTotal + additionalPaxTotal + foodPlanTotal;

  // 6. Return based on type
  switch (type) {
    case "roomTotal":
      return roomTotal;

    case "additionalPaxTotal":
      return additionalPaxTotal;

    case "foodPlanTotal":
      return foodPlanTotal;

    case "totalWithoutTax":
      return totalWithoutTax;

    case "totalWithTax":
      return totalWithTax;

    default:
      return 0;
  }
};

function TotalsSection({ formData, roomIdToUpdate, errorObject }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-gray-50 border rounded-xl shadow-md p-4">
        <h3 className="text-sm font-semibold text-blueGray-800 mb-3">
          Charges
        </h3>
        <div className="space-y-3">
          <FieldRO
            label="Room Total"
            value={tariffRelatedCalculation(
              "roomTotal",
              formData,
              roomIdToUpdate,
            )}
          />
          <FieldRO
            label="Additional Pax"
            value={tariffRelatedCalculation(
              "additionalPaxTotal",
              formData,
              roomIdToUpdate,
            )}
          />

          <FieldRO
            label="Food Plan"
            value={tariffRelatedCalculation(
              "foodPlanTotal",
              formData,
              roomIdToUpdate,
            )}
          />
        </div>
      </div>

      <div className="bg-gray-50 border rounded-xl shadow-md p-4">
        <h3 className="text-sm font-semibold text-blueGray-800 mb-3">
          Summary
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-1">
              Total Without Tax
            </label>
            <input
              type="number"
              name="grandTotal"
              value={tariffRelatedCalculation(
                "totalWithoutTax",
                formData,
                roomIdToUpdate,
              )}
              readOnly
              className="w-full border-0 px-3 py-2 rounded text-sm bg-white text-green-600 font-bold"
            />
          </div>
          <div>
            <label className="block uppercase text-blueGray-600 text-xs font-bold mb-1">
              Total With Tax
            </label>
            <input
              type="number"
              name="grandTotal"
              value={tariffRelatedCalculation(
                "totalWithTax",
                formData,
                roomIdToUpdate,
              )}
              readOnly
              className="w-full border-0 px-3 py-2 rounded text-sm bg-white text-green-600 font-bold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, name, readOnly = false }) {
  return (
    <div>
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full border border-gray-300 px-3 py-2 rounded text-sm ${
          readOnly ? "bg-gray-100" : "bg-white"
        }`}
      />
    </div>
  );
}

function FieldDate({ label, value, onChange, name, min, max }) {
  return (
    <div>
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-2">
        {label}
      </label>
      <input
        type="date"
        name={name}
        value={value || ""}
        onChange={onChange}
        min={min}
        max={max}
        className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
      />
    </div>
  );
}

function LabeledInputNumber({ label, value, onChange, name, min, max, step }) {
  return (
    <div>
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-1">
        {label}
      </label>
      <input
        type="number"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className="w-full border border-gray-300 px-3 py-2 rounded text-sm bg-white"
      />
    </div>
  );
}

function FieldRO({ label, value, accent = false }) {
  return (
    <div>
      <label className="block uppercase text-blueGray-600 text-xs font-bold mb-1">
        {label}
      </label>
      <input
        value={Number(value || 0).toFixed(2)}
        readOnly
        className={`w-full border-0 px-3 py-2 rounded text-sm bg-white ${
          accent ? "text-red-600 font-bold" : "text-blueGray-700"
        }`}
      />
    </div>
  );
}

export default BookingForm;
