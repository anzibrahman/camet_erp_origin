/* eslint-disable react/prop-types */

const formatInputTimeTo12Hour = (time24h = "") => {
  if (!time24h) return "";

  let [hours, minutes] = time24h.split(":");
  hours = parseInt(hours, 10);

  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
};
import { useState, useEffect } from "react";

import { Users, X, DoorOpen, Trash2 } from "lucide-react";

import CustomerSearchInputBox from "../Components/CustomerSearchInPutBox";
import CheckoutDateModal from "./CheckoutDateModal";
import useFetch from "@/customHook/useFetch";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";
import { toast } from "sonner";


export default function EnhancedCheckoutModal({
  isOpen = true,
  closemodal,
  onClose,
  selectedCheckIns = [],
  onConfirm,
  checkoutMode,
  search,
  toogle,
  selectedCustomer,
  customerchange,
  setSelectedCheckOut,
}) {
  console.log(selectedCheckIns);
  console.log(isOpen);
  console.log("hfafffff");
  const navigate = useNavigate();
  // State to manage room-customer assignments
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [errors, setErrors] = useState({});
  const [parties, setPartylist] = useState([]);
  // const [checkoutMode, setCheckoutMode] = useState("multiple")
  const todayStr = new Date().toISOString().split("T")[0];
  const [checkOutDateTracker, setCheckOutDateTracker] = useState(todayStr);

  const [checkouts, setCheckouts] = useState(
    selectedCheckIns.length > 0
      ? selectedCheckIns.map((checkout) => {
          const arrival = new Date(checkout.arrivalDate);
          const checkoutDate = new Date(checkOutDateTracker);

          // normalize
          arrival.setHours(0, 0, 0, 0);
          checkoutDate.setHours(0, 0, 0, 0);

          const diffTime = checkoutDate - arrival;
          const calculatedDays =
            diffTime <= 0 ? 1 : diffTime / (1000 * 60 * 60 * 24);

          const fullDays = Math.floor(calculatedDays);
          const fractionalDay = calculatedDays - fullDays;

          const updatedRooms =
            checkout.selectedRooms?.map((room) => {
              const originalStayDays = room.stayDays || 1;

              const originalBaseAmount = room.baseAmount || 0;
              console.log(originalBaseAmount);
              const originalTaxAmount = room.taxAmount || 0;
              const originalFoodPlanWithTax = room.foodPlanAmountWithTax || 0;
              const originalFoodPlanWithoutTax =
                room.foodPlanAmountWithOutTax || 0;
              const originalPaxWithTax = room.additionalPaxAmountWithTax || 0;
              const originalPaxWithoutTax =
                room.additionalPaxAmountWithOutTax || 0;

              // per-day
              const basePerDay = originalBaseAmount / originalStayDays;
              const taxPerDay = originalTaxAmount / originalStayDays;
              const foodWithTaxPerDay =
                originalFoodPlanWithTax / originalStayDays;
              const foodWithoutTaxPerDay =
                originalFoodPlanWithoutTax / originalStayDays;

              const originalFullDays = Math.floor(originalStayDays);
              const paxWithTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithTax / originalFullDays
                  : 0;
              const paxWithoutTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithoutTax / originalFullDays
                  : 0;

              // totals
              let newBaseAmount = fullDays * basePerDay;
              let newTaxAmount = fullDays * taxPerDay;
              let newFoodPlanWithTax = fullDays * foodWithTaxPerDay;
              let newFoodPlanWithoutTax = fullDays * foodWithoutTaxPerDay;
              let newPaxWithTax = fullDays * paxWithTaxPerDay;
              let newPaxWithoutTax = fullDays * paxWithoutTaxPerDay;

              // half-day (no pax)
              if (fractionalDay > 0) {
                newBaseAmount += basePerDay * 0.5;
                newTaxAmount += taxPerDay * 0.5;
                newFoodPlanWithTax += foodWithTaxPerDay * 0.5;
                newFoodPlanWithoutTax += foodWithoutTaxPerDay * 0.5;
              }

              return {
                ...room,
                stayDays: calculatedDays,
                totalAmount: Math.round(newBaseAmount * 100) / 100,
                amountAfterTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                amountWithOutTax: Math.round(newBaseAmount * 100) / 100,
                baseAmount: Math.round(newBaseAmount * 100) / 100,
                taxAmount: Math.round(newTaxAmount * 100) / 100,
                baseAmountWithTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                foodPlanAmountWithTax:
                  Math.round(newFoodPlanWithTax * 100) / 100,
                foodPlanAmountWithOutTax:
                  Math.round(newFoodPlanWithoutTax * 100) / 100,
                additionalPaxAmountWithTax:
                  Math.round(newPaxWithTax * 100) / 100,
                additionalPaxAmountWithOutTax:
                  Math.round(newPaxWithoutTax * 100) / 100,
              };
            }) || [];

          const totalAmount = updatedRooms.reduce(
            (total, room) => total + room.baseAmountWithTax,
            0,
          );
          const roomTotal = updatedRooms.reduce(
            (total, room) => total + room.baseAmountWithOutTax,
            0,
          );
          const foodPlanTotal = updatedRooms.reduce(
            (total, room) => total + room.foodPlanAmountWithOutTax,
            0,
          );
          const paxTotal = updatedRooms.reduce(
            (total, room) => total + room.additionalPaxAmountWithOutTax,
            0,
          );

          const balanceToPay = totalAmount - Number(checkout.advanceAmount);

          const time = "11:00 AM";

          return {
            ...checkout,
            stayDays: calculatedDays,
            selectedRooms: updatedRooms,
            totalAmount,
            balanceToPay,
            roomTotal,
            foodPlanTotal,
            paxTotal,
            checkOutTime: time,
            checkOutDate: checkOutDateTracker, // current date
          };
        })
      : [],
  );

  console.log(checkouts);
  const [originalCheckouts] = useState(() =>
    selectedCheckIns.length > 0
      ? JSON.parse(JSON.stringify(selectedCheckIns))
      : [],
  );
  const getVoucherType = () => {
    const path = location.pathname;
    if (path.includes("Receipt")) return "receipt";
    if (path.includes("Payment")) return "payment";
    return "sale";
  };
  const { _id: cmp_id } = useSelector(
    (state) => state.secSelectedOrganization.secSelectedOrg,
  );
  const { data: partylist } = useFetch(
    `/api/sUsers/singlecheckoutpartylist/${cmp_id}`,
    { params: { voucher: getVoucherType() } },
  );
  console.log(partylist);
  useEffect(() => {
    if (partylist && partylist.partyList.length) {
      setPartylist(partylist.partyList);
    }
  }, [partylist]);
  // Initialize room assignments when selectedCheckIns change
  useEffect(() => {
    if (selectedCheckIns.length > 0) {
      // Group all rooms from all check-ins
      const allRooms = selectedCheckIns.flatMap((checkIn) =>
        checkIn.selectedRooms.map((room) => ({
          checkInId: checkIn._id,
          checkInNumber: checkIn.voucherNumber,
          roomId: room._id,
          selectedRoom: room.roomId,
          roomName: room.roomName,
          roomType: room.roomType?.brand || "Standard",
          originalCustomer: checkIn.customerId,
          isHold: checkIn.isHold,
          selectedCustomer: checkIn.selectedCustomer
            ? checkIn.selectedCustomer
            : checkIn.customerId, // Default to original customer
        })),
      );

      setRoomAssignments(allRooms);
    }
  }, [selectedCheckIns]);

  console.log(roomAssignments);
const checkPendingKots = async () => {
  try {
    const checkInNumbers = checkouts
      .map((checkout) => checkout?.voucherNumber)
      .filter(Boolean);

    if (!checkInNumbers.length) return true;

    const response = await api.get(
      `/api/sUsers/getRestaurantBillsDetails/${cmp_id}`,
      {
        params: { checkInNumbers },
        withCredentials: true,
      },
    );

    const allKots = response.data?.data || [];

    const pendingKots = allKots.filter((kot) => {
      // Ignore cancelled or already settled KOTs.
      if (kot?.status === "cancelled" || kot?.paymentCompleted === true) {
        return false;
      }

      const currentCheckout = checkouts.find(
        (checkout) =>
          String(checkout?.voucherNumber) === String(kot?.checkInNumber),
      );

      if (!currentCheckout) return false;

      const originalCheckIn = originalCheckouts.find(
        (checkout) => String(checkout?._id) === String(currentCheckout?._id),
      );

      const originalRooms = originalCheckIn?.selectedRooms || [];
      const roomsBeingCheckedOut = currentCheckout?.selectedRooms || [];

      // Full checkout: check every pending KOT under the check-in.
      const isPartialCheckout =
        roomsBeingCheckedOut.length < originalRooms.length;

      if (!isPartialCheckout) {
        return true;
      }

      // Partial checkout: compare KOT roomId with the selected room's roomId.
      const kotRoomId = getId(kot?.roomId);

      const selectedRoomMasterIds = roomsBeingCheckedOut.map((room) =>
        getId(room?.roomId || room?.selectedRoom || room),
      );

      // KOT without a room reference is blocked too, as its room cannot
      // be safely determined during a partial checkout.
      return (
        !kotRoomId ||
        selectedRoomMasterIds.includes(kotRoomId)
      );
    });

    if (pendingKots.length > 0) {
      const kotDetails = pendingKots
        .map((kot) => {
          const room = kot?.roomId?.roomName || kot?.roomId?.roomNo;
          return room
            ? `${kot.voucherNumber} (Room ${room})`
            : kot.voucherNumber;
        })
        .filter(Boolean)
        .join(", ");

      toast.error(
        `Pending KOT found: ${kotDetails}. Convert it to Sale or Post to Room before checkout.`,
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error("Unable to check pending KOTs:", error);
    toast.error("Unable to verify pending KOTs. Please try again.");
    return false;
  }
};

  // Handle customer selection for a specific room
  const handleCustomerSelect = (index, customer) => {
    const updated = [...checkouts];
    updated[index].selectedCustomer = customer;
    setCheckouts(updated);

    // Clear error for this room if exists
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };
  console.log(selectedCheckIns[0]?.selectedRooms[1]);
  // 697d8d9c72aa38b6f9db92be
  //'696f204df79a8ca66f1f8da1'
  //697da866055314c367f85ad3
  // Remove a room from checkout (partial checkout)
  const getId = (value) => String(value?._id || value || "");
  const handleRemoveRoom = (roomId, selectedRoomId) => {
    const bookingWithRoom = selectedCheckIns.find((booking) =>
      booking.selectedRooms?.some((room) => room._id === roomId),
    );

    const selectedRoom = bookingWithRoom?.selectedRooms?.find(
      (room) => room._id === roomId,
    );

    const selectedRoomMasterId = getId(selectedRoomId || selectedRoom?.roomId);

    const relatedSwap = bookingWithRoom?.roomSwapHistory?.find((swap) => {
      const fromRoomId = getId(swap.fromRoomId);
      const toRoomId = getId(swap.toRoomId);

      return (
        fromRoomId === selectedRoomMasterId || toRoomId === selectedRoomMasterId
      );
    });

    if (selectedRoom?.isSwapped || relatedSwap) {
      const shouldRemove = window.confirm(
        "This room is part of a room swap. Removing it may affect checkout billing. Do you want to continue?",
      );

      if (!shouldRemove) return;
    }
    const updatedRoom = selectedCheckIns.map((booking) => {
      // 1) Find the selected room by its _id
      const selectedRoom = booking.selectedRooms.find((r) => r._id === roomId);

      // If not found, just return booking as-is
      if (!selectedRoom) return booking;

      // 2) Use selectedRoom.roomId (or whatever field is tagged) to filter others
      const taggedRoomId = selectedRoom.roomId; // <-- adjust this key name

      return {
        ...booking,
        // remove related foodPlan entries first
        foodPlan: booking.foodPlan.filter((fp) => fp.roomId !== taggedRoomId),
        // then related additional pax
        additionalPaxDetails: booking.additionalPaxDetails.filter(
          (pax) => pax.roomId !== taggedRoomId,
        ),
        // finally remove the room itself
        selectedRooms: booking.selectedRooms.filter((r) => r._id !== roomId),
      };
    });

    setSelectedCheckOut(updatedRoom);
    const updatedRomAssignments = roomAssignments.filter(
      (room) => room.roomId !== roomId,
    );

    setRoomAssignments(updatedRomAssignments);
    const updated = checkouts.map((checkout) => ({
      ...checkout,
      selectedRooms: (checkout.selectedRooms || []).filter(
        (room) => room._id !== roomId,
      ),
    }));

    console.log(updated);
    setCheckouts(updated);
  };

  // Add room back if needed
  // const handleAddRoom = (checkInId, room) => {
  //   setRoomAssignments([
  //     ...roomAssignments,
  //     {
  //       checkInId,
  //       checkInNumber: room.voucherNumber,
  //       roomId: room._id,
  //       roomName: room.roomName,
  //       roomType: room.roomType?.brand || "Standard",
  //       originalCustomer: room.originalCustomer,
  //       selectedCustomer: room.originalCustomer,
  //     },
  //   ]);
  // };

  // Validate before proceeding
  const validateAssignments = () => {
    const newErrors = {};
    roomAssignments.forEach((assignment, index) => {
      if (!assignment.selectedCustomer || !assignment.selectedCustomer._id) {
        newErrors[index] = "Please select a customer for this room";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle proceed to checkout
  const handleProceed = async () => {

    const canProceed = await checkPendingKots();
    if (!canProceed) return;
    if (!validateAssignments()) {
      return;
    }
    console.log("hhh");
    // Step 1: Check if all selectedCustomer are same
    const firstCustomer = roomAssignments[0]?.selectedCustomer;
    const isSameCustomer = roomAssignments.every(
      (item) => item.selectedCustomer._id === firstCustomer._id,
    );

    console.log(isSameCustomer);

    let result;

    if (isSameCustomer) {
      console.log("HHHhh");
      // 🔥 Merge ALL into ONE customer
      const checkInMap = {};

      roomAssignments.forEach((assignment) => {
        if (!checkInMap[assignment.checkInId]) {
          const originalCheckIn = selectedCheckIns.find(
            (ci) => ci._id === assignment.checkInId,
          );

          checkInMap[assignment.checkInId] = {
            checkInId: assignment.checkInId,
            checkInNumber: assignment.checkInNumber,
            originalCheckIn,
            rooms: [],
          };
        }

        checkInMap[assignment.checkInId].rooms.push({
          roomId: assignment.roomId,
          roomName: assignment.roomName,
          roomType: assignment.roomType,
        });
      });

      result = [
        {
          customerId: firstCustomer._id,
          customerName: firstCustomer.partyName,
          customer: firstCustomer,
          checkIns: Object.values(checkInMap),
        },
      ];
    } else {
      // 🔵 fallback → group by customers (old logic)
      const grouped = {};
      console.log(roomAssignments);
      console.log(roomAssignments.length);
      roomAssignments.forEach((assignment) => {
        const customerId = assignment.selectedCustomer._id;

        if (!grouped[customerId]) {
          grouped[customerId] = {
            customer: assignment.selectedCustomer,
            checkIns: [],
          };
        }

        let checkInGroup = grouped[customerId].checkIns.find(
          (ci) => ci.checkInId === assignment.checkInId,
        );

        if (!checkInGroup) {
          const originalCheckIn = selectedCheckIns.find(
            (ci) => ci._id === assignment.checkInId,
          );

          checkInGroup = {
            checkInId: assignment.checkInId,
            checkInNumber: assignment.checkInNumber,
            originalCheckIn,
            rooms: [],
          };

          grouped[customerId].checkIns.push(checkInGroup);
        }

        checkInGroup.rooms.push({
          roomId: assignment.roomId,
          roomName: assignment.roomName,
          roomType: assignment.roomType,
        });
      });

      result = Object.values(grouped).map((group) => ({
        customerId: group.customer._id,
        customerName: group.customer.partyName,
        customer: group.customer,
        checkIns: group.checkIns,
      }));
    }
    console.log(result);

    onConfirm(result, checkouts);
  };

  if (!isOpen) return null;

  // Get all available rooms (not currently in assignments)
  selectedCheckIns.flatMap((checkIn) =>
    checkIn.selectedRooms
      .filter(
        (room) =>
          !checkouts.some(
            (assignment) =>
              assignment.checkInId === checkIn._id &&
              assignment.roomId === room._id,
          ),
      )
      .map((room) => ({
        checkInId: checkIn._id,
        voucherNumber: checkIn.voucherNumber,
        ...room,
        originalCustomer: checkIn.customerId,
      })),
  );
  const handleTimeChange = (id, newTime) => {
    setCheckouts((prev) =>
      prev.map((checkout) =>
        checkout._id === id
          ? {
              ...checkout,
              checkOutTime: formatInputTimeTo12Hour(newTime),
            }
          : checkout,
      ),
    );
  };
  const handleNewDateChange = (id, newDate) => {
    console.log(id, newDate);
    setCheckOutDateTracker(newDate);
    setCheckouts(
      checkouts.map((checkout) => {
        if (checkout._id === id) {
          const arrival = new Date(checkout.arrivalDate);
          const checkoutDate = new Date(newDate);
          const diffTime = checkoutDate - arrival;
          const calculatedDays =
            diffTime === 0 ? 1 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          console.log(arrival);
          console.log(checkoutDate);
          console.log(calculatedDays);
          const originalCheckout = originalCheckouts.find(
            (oc) => oc._id === id,
          );
          const time =
            checkout.checkOutTime ||
            originalCheckout?.checkOutTime ||
            "11:00 AM";
          if (!originalCheckout) return checkout;

          const updatedRooms =
            checkout.selectedRooms?.map((room) => {
              const originalRoom = originalCheckout.selectedRooms?.find(
                (or) => or._id === room._id || or.roomName === room.roomName,
              );

              if (!originalRoom) return room;

              const originalStayDays =
                originalRoom.stayDays || originalCheckout.stayDays || 1;
              const originalBaseAmount = originalRoom.baseAmount || 0;
              const originalTaxAmount = originalRoom.taxAmount || 0;
              const originalFoodPlanWithTax =
                originalRoom.foodPlanAmountWithTax || 0;
              const originalFoodPlanWithoutTax =
                originalRoom.foodPlanAmountWithOutTax || 0;
              const originalPaxWithTax =
                originalRoom.additionalPaxAmountWithTax || 0;
              const originalPaxWithoutTax =
                originalRoom.additionalPaxAmountWithOutTax || 0;

              // Calculate daily rates from ORIGINAL totals
              const baseAmountPerDay = originalBaseAmount / originalStayDays;
              const taxAmountPerDay = originalTaxAmount / originalStayDays;
              const foodPlanWithTaxPerDay =
                originalFoodPlanWithTax / originalStayDays;
              const foodPlanWithoutTaxPerDay =
                originalFoodPlanWithoutTax / originalStayDays;

              // ✅ FIX: Calculate pax per day based on ORIGINAL FULL DAYS only
              const originalFullDays = Math.floor(originalStayDays);
              const paxWithTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithTax / originalFullDays
                  : 0;
              const paxWithoutTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithoutTax / originalFullDays
                  : 0;

              // Calculate new totals based on calculatedDays
              const fullDays = Math.floor(calculatedDays);
              const fractionalDay = calculatedDays - fullDays;

              let newBaseAmount = fullDays * baseAmountPerDay;
              let newTaxAmount = fullDays * taxAmountPerDay;
              let newFoodPlanWithTax = fullDays * foodPlanWithTaxPerDay;
              let newFoodPlanWithoutTax = fullDays * foodPlanWithoutTaxPerDay;

              // ✅ FIX: Only multiply by FULL days for pax
              let newPaxWithTax = fullDays * paxWithTaxPerDay;
              let newPaxWithoutTax = fullDays * paxWithoutTaxPerDay;

              // Add fractional day amounts (50%) - but NOT for pax
              if (fractionalDay > 0) {
                newBaseAmount += baseAmountPerDay * 0.5;
                newTaxAmount += taxAmountPerDay * 0.5;
                newFoodPlanWithTax += foodPlanWithTaxPerDay * 0.5;
                newFoodPlanWithoutTax += foodPlanWithoutTaxPerDay * 0.5;
                // ✅ NO pax charges for fractional day
              }

              return {
                ...room,
                stayDays: calculatedDays,
                totalAmount: Math.round(newBaseAmount * 100) / 100,
                amountAfterTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                amountWithOutTax: Math.round(newBaseAmount * 100) / 100,
                baseAmount: Math.round(newBaseAmount * 100) / 100,
                taxAmount: Math.round(newTaxAmount * 100) / 100,
                baseAmountWithTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                foodPlanAmountWithTax:
                  Math.round(newFoodPlanWithTax * 100) / 100,
                foodPlanAmountWithOutTax:
                  Math.round(newFoodPlanWithoutTax * 100) / 100,
                additionalPaxAmountWithTax:
                  Math.round(newPaxWithTax * 100) / 100,
                additionalPaxAmountWithOutTax:
                  Math.round(newPaxWithoutTax * 100) / 100,
              };
            }) || [];

          return {
            ...checkout,
            checkOutDate: newDate,
            checkOutTime: time,

            stayDays: calculatedDays,
            selectedRooms: updatedRooms,
            totalAmount: updatedRooms.reduce(
              (total, room) => total + room.baseAmountWithTax,
              0,
            ),
            balanceToPay:
              updatedRooms.reduce(
                (total, room) => total + room.baseAmountWithTax,
                0,
              ) - Number(checkout.advanceAmount),
            roomTotal: updatedRooms.reduce(
              (total, room) => total + room.baseAmountWithOutTax,
              0,
            ),
            foodPlanTotal: updatedRooms.reduce(
              (total, room) => total + room.foodPlanAmountWithOutTax,
              0,
            ),
            paxTotal: updatedRooms.reduce(
              (total, room) => total + room.additionalPaxAmountWithOutTax,
              0,
            ),
          };
        }
        return checkout;
      }),
    );
  };
  const handleStayDaysChange = (id, newDays) => {
    let newCheckoutDate = new Date(new Date().toISOString().split("T")[0]);
    setCheckouts(
      checkouts.map((checkout) => {
        if (checkout._id === id) {
          // Allow empty string or incomplete decimal input
          if (newDays === "" || newDays === "." || newDays.endsWith(".")) {
            return {
              ...checkout,
              stayDays: newDays,
            };
          }

          const stayDays = Number(newDays);

          // Validate input
          if (isNaN(stayDays) || stayDays <= 0) {
            return {
              ...checkout,
              stayDays: stayDays,
            };
          }
          console.log(stayDays);
          const fullDays = Math.floor(stayDays);
          const fractionalDay = stayDays - fullDays;

          const originalCheckout = originalCheckouts.find(
            (oc) => oc._id === id,
          );

          if (!originalCheckout) {
            console.error("Original checkout data not found for id:", id);
            return checkout;
          }

          const updatedRooms =
            checkout.selectedRooms?.map((room) => {
              const originalRoom = originalCheckout.selectedRooms?.find(
                (or) => or._id === room._id || or.roomName === room.roomName,
              );

              if (!originalRoom) {
                console.error("Original room data not found for room:", room);
                return room;
              }

              const originalStayDays =
                originalRoom.stayDays || originalCheckout.stayDays || 1;
              const originalBaseAmount = originalRoom.baseAmount || 0;
              const originalTaxAmount = originalRoom.taxAmount || 0;
              const originalFoodPlanWithTax =
                originalRoom.foodPlanAmountWithTax || 0;
              const originalFoodPlanWithoutTax =
                originalRoom.foodPlanAmountWithOutTax || 0;
              const originalPaxWithTax =
                originalRoom.additionalPaxAmountWithTax || 0;
              const originalPaxWithoutTax =
                originalRoom.additionalPaxAmountWithOutTax || 0;

              console.log("Original Data:", {
                originalStayDays,
                originalBaseAmount,
                originalTaxAmount,
                stayDays,
              });

              // Calculate daily rates from ORIGINAL totals
              const baseAmountPerDay = originalBaseAmount / originalStayDays;
              const taxAmountPerDay = originalTaxAmount / originalStayDays;
              const foodPlanWithTaxPerDay =
                originalFoodPlanWithTax / originalStayDays;
              const foodPlanWithoutTaxPerDay =
                originalFoodPlanWithoutTax / originalStayDays;

              // ✅ FIX: Calculate pax per day based on ORIGINAL FULL DAYS only
              const originalFullDays = Math.floor(originalStayDays);
              const paxWithTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithTax / originalFullDays
                  : 0;
              const paxWithoutTaxPerDay =
                originalFullDays > 0
                  ? originalPaxWithoutTax / originalFullDays
                  : 0;

              // Calculate new totals: full days + fractional day
              let newBaseAmount = fullDays * baseAmountPerDay;
              let newTaxAmount = fullDays * taxAmountPerDay;
              let newFoodPlanWithTax = fullDays * foodPlanWithTaxPerDay;
              let newFoodPlanWithoutTax = fullDays * foodPlanWithoutTaxPerDay;

              // ✅ FIX: Only multiply by FULL days for pax
              let newPaxWithTax = fullDays * paxWithTaxPerDay;
              let newPaxWithoutTax = fullDays * paxWithoutTaxPerDay;

              // Add fractional day amounts (50%) - but NOT for pax
              if (fractionalDay > 0) {
                newBaseAmount += baseAmountPerDay * 0.5;
                newTaxAmount += taxAmountPerDay * 0.5;
                newFoodPlanWithTax += foodPlanWithTaxPerDay * 0.5;
                newFoodPlanWithoutTax += foodPlanWithoutTaxPerDay * 0.5;
                // ✅ NO pax charges for fractional day
              }

              console.log("Calculated New Amounts:", {
                newBaseAmount,
                newTaxAmount,
                newPaxWithTax,
                newPaxWithoutTax,
                baseAmountPerDay,
                fullDays,
                fractionalDay,
              });

              return {
                ...room,
                stayDays: stayDays,
                totalAmount: Math.round(newBaseAmount * 100) / 100,
                amountAfterTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                amountWithOutTax: Math.round(newBaseAmount * 100) / 100,
                baseAmount: Math.round(newBaseAmount * 100) / 100,
                taxAmount: Math.round(newTaxAmount * 100) / 100,
                baseAmountWithTax:
                  Math.round((newBaseAmount + newTaxAmount) * 100) / 100,
                foodPlanAmountWithTax:
                  Math.round(newFoodPlanWithTax * 100) / 100,
                foodPlanAmountWithOutTax:
                  Math.round(newFoodPlanWithoutTax * 100) / 100,
                additionalPaxAmountWithTax:
                  Math.round(newPaxWithTax * 100) / 100,
                additionalPaxAmountWithOutTax:
                  Math.round(newPaxWithoutTax * 100) / 100,
              };
            }) || [];

          // Calculate new checkout date
          const arrival = new Date(checkout.arrivalDate);
          newCheckoutDate = new Date(arrival);
          const daysToAdd = Math.floor(stayDays);
          newCheckoutDate.setDate(arrival.getDate() + daysToAdd);

          console.log("Updated Rooms:", updatedRooms);

          return {
            ...checkout,
            selectedRooms: updatedRooms,
            stayDays: stayDays,
            totalAmount: updatedRooms.reduce(
              (total, room) => total + room.baseAmountWithTax,
              0,
            ),
            balanceToPay:
              updatedRooms.reduce(
                (total, room) => total + room.baseAmountWithTax,
                0,
              ) - Number(checkout.advanceAmount),
            roomTotal: updatedRooms.reduce(
              (total, room) => total + room.baseAmountWithOutTax,
              0,
            ),
            foodPlanTotal: updatedRooms.reduce(
              (total, room) => total + room.foodPlanAmountWithOutTax,
              0,
            ),
            paxTotal: updatedRooms.reduce(
              (total, room) => total + room.additionalPaxAmountWithOutTax,
              0,
            ),
            checkOutDate: newCheckoutDate.toISOString().split("T")[0],
            checkOutTime:
              checkout.checkOutTime ||
              originalCheckout?.checkOutTime ||
              "11:00 AM",
          };
        }
        return checkout;
      }),
    );
    setCheckOutDateTracker(newCheckoutDate.toISOString().split("T")[0]);
  };
  console.log(checkouts);
  console.log(checkoutMode);
  const handleConfirm = () => {
    console.log(checkouts);
    handleProceed();
  };
  console.log(checkouts);
  console.log(roomAssignments);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-[95vw] max-w-5xl h-[90vh] rounded-xl shadow-xl flex flex-col text-xs md:text-sm">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between border-b px-4 py-2 flex-shrink-0">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-700">
            <Users size={16} /> Checkout Assignment
          </h2>
          <button
            onClick={() => {
              closemodal(false);
              navigate("/sUsers/checkInList", { state: null });
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* ================= CONTENT AREA ================= */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 md:grid-cols-2">
            {/* ================= LEFT COLUMN ================= */}
            <div className="flex flex-col overflow-hidden border-r">
              {/* Selected Checkins */}
              {selectedCheckIns.length > 0 &&
                (location.pathname === "/sUsers/checkInList" ||
                  location.pathname === "/sUsers/checkOutList") &&
                search !== "completed" && (
                  <div className="px-4 py-2 border-b bg-gray-50 flex-shrink-0">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,max-content))] gap-2 mb-2">
                      {selectedCheckIns.map((item) => (
                        <div
                          key={item._id}
                          className="relative inline-flex justify-center text-[11px] bg-white border rounded-md px-2 py-1 text-center shadow-sm whitespace-nowrap"
                        >
                          <span
                            className={`${item.isHold ? "bg-red-200" : "bg-green-500"} absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full`}
                          />
                          {/* Right Dot */}#{item.voucherNumber}
                        </div>
                      ))}
                    </div>

                    {selectedCheckIns.length > 1 && (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-gray-700">
                          {checkoutMode === "single"
                            ? "Single Checkout"
                            : "Multiple Checkout"}
                        </span>

                        <div
                          onClick={toogle}
                          className={`w-8 h-4 rounded-full flex items-center px-1 cursor-pointer transition
                      ${checkoutMode === "single" ? "bg-blue-500" : "bg-green-500"}`}
                        >
                          <div
                            className={`w-3 h-3 bg-white rounded-full shadow transform transition
                        ${checkoutMode === "single" ? "translate-x-0" : "translate-x-4"}`}
                          />
                        </div>

                        {checkoutMode === "single" && (
                          <select
                            value={selectedCustomer}
                            onChange={(e) => customerchange(e.target.value)}
                            className="ml-auto min-w-[200px] text-xs p-1 border rounded-md"
                          >
                            <option value="">Choose customer</option>
                            {parties?.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.partyName}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {/* LEFT SCROLL AREA */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {roomAssignments.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">
                    No rooms selected
                  </p>
                ) : (
                  roomAssignments.map((a, i) => (
                    <div
                      key={i}
                      className={`border rounded-md p-2 ${
                        errors[i]
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <DoorOpen size={14} className="text-blue-500" />
                          <p className="font-medium">
                            {a.roomName} ({a.roomType})
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveRoom(a.roomId, a.selectedRoom)
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="text-[11px] text-gray-500 mb-1">
                        Original: {a.originalCustomer?.partyName || "N/A"}
                      </p>
                      <p className="text-[11px] text-gray-500 mb-1">
                        CheckIn No: {a.checkInNumber || "N/A"}{" "}
                        <span className="text-red-300">
                          {a.isHold ? "(Hold)" : ""}
                        </span>
                      </p>

                      <CustomerSearchInputBox
                        disabled={checkoutMode === "single"}
                        onSelect={(c) => handleCustomerSelect(i, c)}
                        selectedParty={a.selectedCustomer}
                        isAgent={false}
                        placeholder="Select customer..."
                      />

                      {errors[i] && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors[i]}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="overflow-y-auto px-4 py-3 text-xs md:text-sm">
              <CheckoutDateModal
                onDaysChange={handleStayDaysChange}
                checkouts={checkouts}
                onDateChange={handleNewDateChange}
                onTimeChange={handleTimeChange}
              />
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex-shrink-0 border-t px-4 py-2 flex justify-end gap-2 bg-white">
          <button
            onClick={() => {
              closemodal(false);
              navigate("/sUsers/checkInList", { replace: true, state: null });
            }}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={checkouts.length === 0}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
