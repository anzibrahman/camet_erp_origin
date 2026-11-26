import {
  AdditionalPax,
  VisitOfPurpose,
  IdProof,
  FoodPlan,
} from "../models/hotelSubMasterModal.js";
import TallyData from "../models/TallyData.js";
import hsnModel from "../models/hsnModel.js";
import roomModal from "../models/roomModal.js";
import { Booking, CheckIn, CheckOut } from "../models/bookingModal.js";
import ReceiptModel from "../models/receiptModel.js";
import { formatToLocalDate } from "../helpers/helper.js";
import salesModel from "../models/salesModel.js";
import additionalChargesModel from "../models/additionalChargesModel.js";
import Kot from "../models/kotModal.js";
import { calculateStayDays } from "../helpers/tallyHelper.js";
import {
  buildDatabaseFilterForRoom,
  sendRoomResponse,
  fetchRoomsFromDatabase,
  buildDatabaseFilterForBooking,
  fetchBookingsFromDatabase,
  sendBookingsResponse,
  extractRequestParamsForBookings,
  updateStatus,
  createInitialRoomStatusHistory,
  saveSettlementDataHotel,
  handleAdvanceAndDiscountSettlementInRestaurant,
  updateSwapDetails,
  findBlockedRooms,
  getRoomMetricsForPeriod,
  fetchRestaurantDetails,
  buildLoginReportFilter,
  exportLoginReportPdf,
  exportLoginReportExcel,
} from "../helpers/hotelHelper.js";
import { createReceiptsAndSettlements } from "../helpers/checkoutHelper.js";
import { extractRequestParams } from "../helpers/productHelper.js";
import { generateVoucherNumber } from "../helpers/voucherHelper.js";
import mongoose, { get } from "mongoose";
import VoucherSeriesModel from "../models/VoucherSeriesModel.js";
const { ObjectId } = mongoose.Types;
import Party from "../models/partyModel.js";
import { saveSettlementData } from "../helpers/salesHelper.js";

import Organization from "../models/OragnizationModel.js";
import { getNewSerialNumber } from "../helpers/secondaryHelper.js";
import partyModel from "../models/partyModel.js";
import {
  updateReceiptForRooms,
  createReceiptForSales,
  deleteReceipt,
  deleteSettlements,
} from "../helpers/hotelHelper.js";
import receiptModel from "../models/receiptModel.js";
import paymentModel from "../models/paymentModel.js";
import { PriceLevel } from "../models/subDetails.js";
import nodemailer from "nodemailer";
import { transactions } from "./commonController.js";
import settlementModel from "../models/settlementModel.js";
import { statesData } from "../../frontend/constants/states.js";
import { getFullRoomDetails } from "../helpers/saleCalculationHelper.js";
import {
  ensureHotelDateIsEditable,
  ensureHotelTariffDateIsEditable,
  ensureSecondaryUserCompanyAccess,
} from "../helpers/nightAuditHelper.js";
import primaryUserModel from "../models/primaryUserModel.js";
import { sendMail } from "../helpers/hotelHelper.js";
// function used to save additional pax details
export const saveAdditionalPax = async (req, res) => {
  try {
    const { additionalPaxName, amount } = req.body;
    const { cmp_id } = req.params;

    let nameAlreadyExists = await AdditionalPax.findOne({
      additionalPaxName,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Additional Pax name already exists",
      });
    }

    const generatedId = new mongoose.Types.ObjectId();
    const newPax = new AdditionalPax({
      _id: generatedId,
      additionalPaxName,
      amount,
      additionalPaxId: generatedId,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    const result = await newPax.save();
    return res.status(201).json({
      message: "Additional Pax saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving additional pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to fetch additional pax details
export const getAdditionalPax = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const primaryUserId = req.pUserId || req.owner;

    if (!cmp_id || !primaryUserId) {
      return res.status(400).json({
        message: "Missing required parameters: cmp_id or Primary_user_id",
      });
    }

    const additionalPax = await AdditionalPax.find({
      cmp_id,
      Primary_user_id: primaryUserId,
    });

    return res.status(200).json({
      message: "Additional Pax fetched successfully",
      data: additionalPax,
    });
  } catch (error) {
    console.error("Error fetching Additional Pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to edit additional pax
export const updateAdditionalPax = async (req, res) => {
  try {
    const { additionalPaxName, amount, id } = req.body;
    let nameAlreadyExists = await AdditionalPax.findOne({
      additionalPaxName,
      Primary_user_id: req.pUserId || req.owner,
      cmp_id: req.params.cmp_id,
      _id: { $ne: id },
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Additional Pax name already exists",
      });
    }
    const updatedPax = await AdditionalPax.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          additionalPaxName,
          amount,
        },
      },
      { new: true },
    );
    if (!updatedPax) {
      return res.status(404).json({
        message: "Additional Pax not found",
      });
    }

    return res.status(200).json({
      message: "Additional Pax updated successfully",
      data: updatedPax,
    });
  } catch (error) {
    console.error("Error updating additional pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//function used to handle delete data

export const deleteAdditionalPax = async (req, res) => {
  try {
    const { cmp_id, id } = req.params;

    // Validate input
    if (!cmp_id || !id) {
      return res.status(400).json({
        message: "Company ID and Additional Pax ID are required.",
      });
    }

    // Attempt to delete the document
    const result = await AdditionalPax.deleteOne({ _id: id, cmp_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Additional Pax not found or already deleted.",
      });
    }

    return res.status(200).json({
      message: "Additional Pax deleted successfully.",
    });
  } catch (error) {
    console.log("Error deleting Additional Pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to save visit of purpose
export const saveVisitOfPurpose = async (req, res) => {
  try {
    const { visitOfPurpose } = req.body;
    const { cmp_id } = req.params;
    const generatedId = new mongoose.Types.ObjectId();

    let nameAlreadyExists = await VisitOfPurpose.findOne({
      visitOfPurpose,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Visit of purpose name already exists",
      });
    }
    const newVisitOfPurpose = new VisitOfPurpose({
      _id: generatedId,
      visitOfPurpose,
      visitOfPurposeId: generatedId,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    const result = await newVisitOfPurpose.save();
    return res.status(201).json({
      message: "Visit of purpose saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving  visit of purpose:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to fetch visit of purpose
export const getVisitOfPurpose = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const primaryUserId = req.pUserId || req.owner;

    if (!cmp_id || !primaryUserId) {
      return res.status(400).json({
        message: "Missing required parameters: cmp_id or Primary_user_id",
      });
    }

    const visitOfPurpose = await VisitOfPurpose.find({
      cmp_id,
      Primary_user_id: primaryUserId,
    });

    return res.status(200).json({
      message: "Visit of purpose fetched successfully",
      data: visitOfPurpose,
    });
  } catch (error) {
    console.error("Error fetching Additional Pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to update visit of purpose
export const updateVisitOfPurpose = async (req, res) => {
  try {
    const { visitOfPurpose, visitOfPurposeId } = req.body;
    const { cmp_id } = req.params;

    if (!ObjectId.isValid(visitOfPurposeId) || !ObjectId.isValid(cmp_id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    let nameAlreadyExists = await VisitOfPurpose.findOne({
      visitOfPurpose,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
      _id: { $ne: new ObjectId(visitOfPurposeId) },
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Visit of purpose name already exists",
      });
    }

    const updatedVisitOfPurpose = await VisitOfPurpose.findOneAndUpdate(
      {
        _id: new ObjectId(visitOfPurposeId),
        cmp_id: new ObjectId(cmp_id),
      },
      {
        $set: {
          visitOfPurpose,
        },
      },
      { new: true },
    );

    if (!updatedVisitOfPurpose) {
      return res.status(404).json({
        message: "Visit of purpose not found",
      });
    }

    return res.status(200).json({
      message: "Visit of purpose updated successfully",
      data: updatedVisitOfPurpose,
    });
  } catch (error) {
    console.error("Error updating visit of purpose:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to delete visit of purpose data

export const deleteVisitOfPurpose = async (req, res) => {
  try {
    const { cmp_id, id } = req.params;

    // Validate input
    if (!cmp_id || !id) {
      return res.status(400).json({
        message: "Company ID and Visit of purpose ID are required.",
      });
    }

    // Attempt to delete the document
    const result = await VisitOfPurpose.deleteOne({ _id: id, cmp_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Visit of purpose not found or already deleted.",
      });
    }

    return res.status(200).json({
      message: "Visit of purpose deleted successfully.",
    });
  } catch (error) {
    console.log("Error deleting visit of purpose:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to save id proof
export const saveIdProof = async (req, res) => {
  try {
    const { idProof } = req.body;
    const { cmp_id } = req.params;
    let nameAlreadyExists = await IdProof.findOne({
      idProof,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Id proof name already exists",
      });
    }
    const generatedId = new mongoose.Types.ObjectId();
    const newIdProof = new IdProof({
      _id: generatedId,
      idProof,
      idProofId: generatedId,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    const result = await newIdProof.save();
    return res.status(201).json({
      message: "Id proof saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving  id proof:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to fetch id proof

export const getIdProof = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const primaryUserId = req.pUserId || req.owner;

    if (!cmp_id || !primaryUserId) {
      return res.status(400).json({
        message: "Missing required parameters: cmp_id or Primary_user_id",
      });
    }

    const idProofData = await IdProof.find({
      cmp_id,
      Primary_user_id: primaryUserId,
    });

    return res.status(200).json({
      message: "Id proof fetched successfully",
      data: idProofData,
    });
  } catch (error) {
    console.error("Error fetching Additional Pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to update id proof
export const updateIdProof = async (req, res) => {
  try {
    const { idProof, idProofId } = req.body;

    const { cmp_id } = req.params;

    let nameAlreadyExists = await IdProof.findOne({
      idProof,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
      _id: { $ne: new ObjectId(idProofId) },
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Id proof name already exists",
      });
    }

    if (!ObjectId.isValid(idProofId) || !ObjectId.isValid(cmp_id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const updateIdProof = await IdProof.findOneAndUpdate(
      {
        _id: new ObjectId(idProofId),
        cmp_id: new ObjectId(cmp_id),
      },
      {
        $set: {
          idProof,
        },
      },
      { new: true },
    );

    if (!updateIdProof) {
      return res.status(404).json({
        message: "Id proof data not found",
      });
    }

    return res.status(200).json({
      message: "Id proof updated successfully",
      data: updateIdProof,
    });
  } catch (error) {
    console.error("Error updating id proof:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to delete id proof data

export const deleteIdProof = async (req, res) => {
  try {
    const { cmp_id, id } = req.params;

    // Validate input
    if (!cmp_id || !id) {
      return res.status(400).json({
        message: "Company ID and Id proof ID are required.",
      });
    }

    // Attempt to delete the document
    const result = await IdProof.deleteOne({ _id: id, cmp_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Id proof data not found or already deleted.",
      });
    }

    return res.status(200).json({
      message: "Id proof deleted successfully.",
    });
  } catch (error) {
    console.log("Error deleting id proof:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to save food plan
export const saveFoodPlan = async (req, res) => {
  try {
    const { foodPlan, amount, isComplimentary = false } = req.body; // ✅ EXTRACT
    const { cmp_id } = req.params;

    let nameAlreadyExists = await FoodPlan.findOne({
      foodPlan,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Food plan name already exists",
      });
    }

    const generatedId = new mongoose.Types.ObjectId();

    const newFoodPlan = new FoodPlan({
      _id: generatedId,
      foodPlan,
      amount,
      isComplimentary: isComplimentary, // ✅ SAVE THIS
      foodPlanId: generatedId,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
    });

    const result = await newFoodPlan.save();

    return res.status(201).json({
      message: "Food plan saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error saving food plan:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to get food plan details

export const getFoodPlan = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const primaryUserId = req.pUserId || req.owner;

    if (!cmp_id || !primaryUserId) {
      return res.status(400).json({
        message: "Missing required parameters: cmp_id or Primary_user_id",
      });
    }

    const foodPlans = await FoodPlan.find({
      cmp_id,
      Primary_user_id: primaryUserId,
    });

    return res.status(200).json({
      message: "Food plan fetched successfully",
      data: foodPlans,
    });
  } catch (error) {
    console.error("Error fetching Additional Pax:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//function used to update food plan
export const updateFoodPlan = async (req, res) => {
  try {
    const { foodPlan, amount, foodPlanId, isComplimentary = false } = req.body;

    const { cmp_id } = req.params;

    let nameAlreadyExists = await FoodPlan.findOne({
      foodPlan,
      cmp_id,
      Primary_user_id: req.pUserId || req.owner,
      _id: { $ne: new ObjectId(foodPlanId) },
    });

    if (nameAlreadyExists) {
      return res.status(400).json({
        message: "Food plan name already exists",
      });
    }

    const updatedFoodPlan = await FoodPlan.findOneAndUpdate(
      { _id: foodPlanId, cmp_id },
      {
        $set: {
          foodPlan,
          amount,
          isComplimentary: isComplimentary, // ✅ UPDATE THIS
        },
      },
      { new: true },
    );
    if (!updatedFoodPlan) {
      return res.status(404).json({
        message: "Food plan  not found",
      });
    }

    return res.status(200).json({
      message: "Food plan updated successfully",
      data: updatedFoodPlan,
    });
  } catch (error) {
    console.error("Error updating food plan:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
// function used to delete food plan data

export const deleteFoodPlan = async (req, res) => {
  try {
    const { cmp_id, id } = req.params;

    // Validate input
    if (!cmp_id || !id) {
      return res.status(400).json({
        message: "Company ID and Visit of purpose ID are required.",
      });
    }

    // Attempt to delete the document
    const result = await FoodPlan.deleteOne({ _id: id, cmp_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Food plan not found or already deleted.",
      });
    }

    return res.status(200).json({
      message: "Food plan deleted successfully.",
    });
  } catch (error) {
    console.log("Error deleting food plan:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// function used to save room details

export const addRoom = async (req, res) => {
  const session = await mongoose.startSession(); // Step 1: Start session

  try {
    const { formData, tableData } = req.body;

    session.startTransaction(); // Step 2: Start transaction
    let findRoomNameAlreadyExist = await roomModal
      .findOne({
        primary_user_id: req.pUserId || req.owner,
        cmp_id: req.params.cmp_id,
        roomName: formData.roomName,
      })
      .session(session);

    if (findRoomNameAlreadyExist) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Room name already exist" });
    }

    // Step 3: Fetch HSN data inside the session
    const correspondingHsn = await hsnModel
      .findOne({ _id: formData.hsn })
      .session(session);
    if (!correspondingHsn) {
      await session.abortTransaction();
      return res.status(400).json({ message: "HSN data missing" });
    }

    // Step 4: Create Room document
    const newRoom = new roomModal({
      primary_user_id: req.pUserId || req.owner,
      secondary_user_id: req.sUserId,
      cmp_id: req.params.cmp_id,
      roomName: formData.roomName,
      roomType: formData.roomType,
      bedType: formData.bedType,
      unit: formData.unit,
      roomFloor: formData.roomFloor,
      hsn: formData.hsn,
      priceLevel: tableData,
    });

    // Step 5: Save using session
    await newRoom.save({ session });
    await createInitialRoomStatusHistory(newRoom, session);

    // Step 6: Commit the transaction
    await session.commitTransaction();

    res.status(201).json({ message: "Room Added Successfully", data: newRoom });
  } catch (error) {
    console.log("Error saving room details:", error);

    // Rollback on error
    await session.abortTransaction();

    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  } finally {
    // Step 7: Always end session
    session.endSession();
  }
};

// function used to fetch rooms
export const getRooms = async (req, res) => {
  try {
    const params = extractRequestParams(req);
    const filter = buildDatabaseFilterForRoom(params);

    // Get current date and time
    const now = new Date();

    // Get all rooms based on basic filters
    const { rooms, totalRooms } = await fetchRoomsFromDatabase(filter, params);
    // Only care about checkOutDate in further logic
    // Extract checkout only from params if given, else use today
    let { arrivalDate, checkOutDate } = params;
    let endDate;
    if (checkOutDate) {
      endDate = checkOutDate;
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const startDate = new Date(); // startDate is required for check date, but not for overlap logic

    // Find rooms that are currently booked for the specified checkout date (ignore arrivalDate)
    const overlappingBookings = await Booking.find({
      cmp_id: req.params.cmp_id,
      status: { $ne: "checkIn" },
      //to check the date range for booking if already have a booking
      arrivalDate: { $lte: checkOutDate },
      checkOutDate: { $gte: arrivalDate },
    });
    // console.log("overlappingbookings", overlappingBookings)
    const AllCheckIns = await CheckIn.find({
      cmp_id: req.params.cmp_id,
      status: { $nin: ["checkOut", "cancelled"] },
      isHold: false,
      arrivalDate: { $lte: checkOutDate },
      checkOutDate: { $gte: arrivalDate },
    }).select("selectedRooms checkOutDate arrivalDate roomDetails");

    const overlappingCheckIns = AllCheckIns.filter((c) => {
      const co = new Date(c.checkOutDate);
      co.setDate(co.getDate() + 1); // add 1 day

      // normalize both to YYYY-MM-DD
      const checkoutPlusOne = co.toISOString().split("T")[0];

      return checkoutPlusOne >= checkOutDate;
    });

    // Find rooms that are currently checked-in for the specified checkout date
    // const overlappingCheckIns = await CheckIn.find({
    //   cmp_id: req.params.cmp_id,
    //   checkOutDate: { $gt: startDate },
    //   checkOutDate: { $lt: endDate },
    //    status: { $nin: ["CheckOut"] },
    // }).select("roomDetails");

    // Collect all occupied room IDs
    const occupiedRoomId = new Set();

    // Add booked room IDs
    overlappingBookings.forEach((booking) => {
      if (booking.selectedRooms && Array.isArray(booking.selectedRooms)) {
        booking.selectedRooms.forEach((room) => {
          const roomId = room.roomId || room._id || room;
          if (roomId) {
            occupiedRoomId.add(roomId.toString());
          }
        });
      }
    });
    // console.log("allcheckins", AllCheckIns)
    // Add checked-in room IDs
    AllCheckIns.forEach((checkIn) => {
      if (
        checkIn.selectedRooms &&
        Array.isArray(checkIn.selectedRooms) &&
        !checkIn.isHold
      ) {
        checkIn.selectedRooms.forEach((room) => {
          const roomId = room.roomId || room._id || room;
          if (roomId && !room.isSwapped) {
            occupiedRoomId.add(roomId.toString());
          }
        });
      }
    });
    // console.log("occupiedbookingid", occupiedRoomId)
    // console.log("overlappingchekins", overlappingCheckIns)

    // Filter out occupied and non-saleable rooms

    const vacantRooms = rooms.filter((room) => {
      const roomId = room._id.toString();
      const isOccupied = occupiedRoomId.has(roomId);

      // Exclude rooms that housekeeping/manual ops have taken out of sale.
      const isCleanAndOpen = !["dirty", "blocked"].includes(room.status);
      //  &&
      // room.status !== "checkIn";

      return !isOccupied && isCleanAndOpen;
    });

    // Add availability status
    const roomsWithStatus = vacantRooms.map((room) => ({
      ...room.toObject(),
      status: "vacant",
      checkedAt: now,
    }));
    // Send response
    const sendRoomResponseData = sendRoomResponse(
      res,
      roomsWithStatus,
      vacantRooms.length,
      params,
    );

    return sendRoomResponseData;
  } catch (error) {
    console.error("Error in getRooms:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};
// function used to get all rooms

export const getAllRooms = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const selectedDate = req.query.selectedData;

    // Validate company ID
    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // Validate if cmp_id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(cmp_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Company ID format",
      });
    }

    // if(selectedDate){

    // }

    // Fetch all rooms for the company
    const rooms = await roomModal
      .find({
        cmp_id: cmp_id, // MongoDB will automatically cast valid ObjectId strings
      })
      .populate("cmp_id", "name") // Populate organization details
      .populate("roomType") // Populate from brand collection
      .populate("roomFloor") // Populate from subCategory collection
      .populate("bedType") // Populate from category collection
      .populate("priceLevel.priceLevel", "name") // Populate price level details
      .sort({ roomName: 1 }) // Sort by room name (roomNumber doesn't exist in schema)
      .lean(); // Use lean() for better performance

    return res.status(200).json({
      success: true,
      message: "Rooms fetched successfully",
      data: {
        rooms,
      },
    });
  } catch (error) {
    console.error("Error in getAllRooms:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
      data: [],
    });
  }
};

// function used to edit room details

export const editRoom = async (req, res) => {
  const session = await mongoose.startSession(); // Step 1: Start a session

  try {
    const { formData, tableData } = req.body;

    // Step 2: Start the transaction
    session.startTransaction();

    let findRoomNameAlreadyExist = await roomModal
      .findOne({
        _id: { $ne: req.params.id },
        primary_user_id: req.pUserId || req.owner,
        cmp_id: req.params.cmp_id,
        roomName: formData.roomName,
      })
      .session(session);

    if (findRoomNameAlreadyExist) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Room name already exist" });
    }

    // Step 3: Validate HSN existence within session
    const correspondingHsn = await hsnModel
      .findOne({ _id: formData.hsn })
      .session(session);

    if (!correspondingHsn) {
      await session.abortTransaction();
      return res.status(400).json({ message: "HSN data missing" });
    }

    // Step 4: Update room using session
    const updatedRoom = await roomModal.findOneAndUpdate(
      { _id: req.params.id, cmp_id: req.params.cmp_id },
      {
        $set: {
          roomName: formData.roomName,
          roomType: formData.roomType,
          bedType: formData.bedType,
          roomFloor: formData.roomFloor,
          hsn: formData.hsn,
          unit: formData.unit,
          priceLevel: tableData,
        },
      },
      { new: true, session }, // Important: pass session in options
    );

    if (!updatedRoom) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Room not found" });
    }

    // Step 5: Commit the transaction
    await session.commitTransaction();

    res.status(200).json({ message: "Room data updated successfully" });
  } catch (error) {
    console.error("Error saving room details:", error);

    // Step 6: Abort on error
    await session.abortTransaction();

    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  } finally {
    // Step 7: Always end the session
    session.endSession();
  }
};

// function used to delete room

export const deleteRoom = async (req, res) => {
  const roomId = req.params.id;

  try {
    const deletedRoom = await roomModal.findByIdAndDelete(roomId);
    if (deletedRoom) {
      return res.status(200).json({
        success: true,
        message: "Room deleted successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// function used for room booking
export const roomBooking = async (req, res) => {
  const session = await Booking.startSession();

  try {
    const bookingData = req.body?.data;
    bookingData.idProof = {
      idType: bookingData?.idProof?.idType || "",
      idNumber: bookingData?.idProof?.idNumber || "",
      documents: Array.isArray(bookingData?.idProof?.documents)
        ? bookingData.idProof.documents
            .map((doc) => ({
              url: doc?.url || "",
              publicId: doc?.publicId || "",
              originalName: doc?.originalName || "",
              mimeType: doc?.mimeType || "",
            }))
            .filter((doc) => doc.url)
        : [],
    };
    // console.log("bookingdata",bookingData)
    const isFor = req.body?.modal;
    // console.log("isfor",isFor)
    // console.log("idddd", bookingData.bookingId)

    // console.log("mpdal", isFor)
    const paymentData = req.body?.paymentData;
    // console.log("paymentdata", paymentData)
    const orgId = req.params.cmp_id;
    const paymenttypeDetails = req.body?.paymenttypeDetails;

    if (!bookingData.arrivalDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let customerData = null;
    if (bookingData.customerId) {
      customerData = await partyModel
        .findById(bookingData.customerId)
        .session(session);
    }

    const bookingRequestId = req.body?.bookingRequestId;
    const checkInRequestId = req.body?.checkInRequestId;

    if (isFor === "bookingPage" && !bookingRequestId) {
      throw new Error("Missing booking request id");
    }

    if (isFor === "checkIn" && !checkInRequestId) {
      throw new Error("Missing check-in request id");
    }

    let selectedModal;
    let voucherType;
    let under = "hotel";

    // 🔹 Decide which modal & voucherType to use
    if (isFor === "bookingPage") {
      selectedModal = Booking;
      voucherType = "saleOrder";
    } else if (isFor === "checkIn") {
      if (bookingData?.bookingId) {
        const updateBookingData = await Booking.findByIdAndUpdate(
          bookingData.bookingId,
          { status: "checkIn" },
          { new: true },
        ).session(session);

        if (!updateBookingData) {
          console.log("notfound");
          return res.status(400).json({
            success: false,
            message: "Booking not found",
          });
        }
      }
      selectedModal = CheckIn;
      voucherType = "deliveryNote";
    } else {
      if (bookingData?.checkInId) {
        const updateBookingData = await CheckIn.findByIdAndUpdate(
          bookingData.checkInId,
          { status: "checkOut" },
          { new: true },
        ).session(session);

        if (!updateBookingData) {
          return res.status(400).json({
            success: false,
            message: "Check In not found",
          });
        }
      }
      selectedModal = CheckOut;
      voucherType = "sales";
    }

    const series_id = bookingData.voucherId || null;
    let savedBooking;

    // ✅ Start Transaction
    await session.withTransaction(async () => {
      // 🔹 Generate Voucher Number
      const bookingNumber = await generateVoucherNumber(
        orgId,
        voucherType,
        series_id,
        session,
      );

      bookingData.voucherNumber = bookingNumber?.voucherNumber;
      bookingData.voucherId = series_id;

      const isHotelAgent = customerData?.isHotelAgent || false;

      // 🔹 Save Booking
      const newBooking = new selectedModal({
        cmp_id: orgId,
        Primary_user_id: req.pUserId || req.owner,
        Secondary_user_id: req.sUserId,
        paymenttypeDetails,
        paymentMetaData: req?.body?.paymentData?.payments || [],
        bookingRequestId:
          isFor === "bookingPage" ? bookingRequestId : undefined,
        checkInRequestId: isFor === "checkIn" ? checkInRequestId : undefined,
        isHotelAgent,
        currentDate: new Date().toISOString().split("T")[0],
        advanceTracking: {
          [new Date().toISOString().split("T")[0]]: bookingData.advanceAmount,
        },

        ...bookingData,
      });

      savedBooking = await newBooking.save({ session });

      // 🔹 Handle Advance Receipt if advanceAmount > 0
      if (bookingData.advanceAmount && bookingData.advanceAmount > 0) {
        const voucher = await VoucherSeriesModel.findOne({
          cmp_id: orgId,
          voucherType: "receipt",
        }).session(session);

        const series_idReceipt = voucher?.series
          ?.find((s) => s.under === "hotel")
          ?._id.toString();

        // 🔹 Save Advance Object
        const advanceObject = new TallyData({
          Primary_user_id: req.pUserId || req.owner,
          cmp_id: orgId,
          party_id: bookingData?.customerId,
          party_name: bookingData?.customerName,
          mobile_no: bookingData?.mobileNumber,
          bill_date: new Date(),
          bill_no: savedBooking?.voucherNumber,
          billId: savedBooking._id,
          bill_amount: bookingData.advanceAmount,
          bill_pending_amt: 0,
          accountGroup: bookingData.accountGroup,
          user_id: req.sUserId,
          advanceAmount: bookingData.advanceAmount,
          advanceDate: new Date(),
          classification: "Cr",
          source: under,
          from: selectedModal.modelName, // ✅ store model name, not
          paymenttypeDetails,
          otherChargeDetails: bookingData.otherChargeDetails,
        });

        await advanceObject.save({ session });

        // 🔹 Bill Data for Receipt
        const billData = [
          {
            _id: advanceObject._id,
            bill_no: savedBooking?.voucherNumber,
            billId: savedBooking._id,
            bill_date: new Date(),
            bill_pending_amt: 0,
            source: under,
            settledAmount: bookingData.advanceAmount,
            remainingAmount: 0,
          },
        ];
        console.log("buiidddreceipttttttt");
        // 🔹 Build Receipt Function
        const buildReceipt = async (
          receiptVoucher,
          serialNumber,
          paymentDetails,
          amount,
          paymentMethod,
        ) => {
          let selectedParty = await partyModel
            .findOne({ _id: bookingData?.customerId })
            .populate("accountGroup")
            .session(session);
          // console.log("selectedpartyinroombookingcontroller", selectedParty)

          if (selectedParty) {
            selectedParty = selectedParty.toObject();
            if (selectedParty.accountGroup?._id) {
              selectedParty.accountGroup_id =
                selectedParty.accountGroup._id.toString();
            }
            delete selectedParty.accountGroup;
          }
          console.log("line 1083 hotelcontroller");
          const receipt = new ReceiptModel({
            createdAt: new Date(),
            date: await formatToLocalDate(new Date(), orgId, session),
            receiptNumber: receiptVoucher?.usedSeriesNumber,
            series_id: series_idReceipt,
            usedSeriesNumber: receiptVoucher?.usedSeriesNumber || null,
            serialNumber,
            cmp_id: orgId,
            party: selectedParty,
            billData,
            totalBillAmount: Math.round(bookingData.advanceAmount),
            enteredAmount: Math.round(amount),
            advanceAmount: 0,
            remainingAmount: 0,
            paymentMethod,
            paymentDetails,
            note: "",
            Primary_user_id: req.pUserId || req.owner,
            Secondary_user_id: req.sUserId,
          });

          return await receipt.save({ session });
        };

        // 🔹 Party for Settlement
        const selectedParty = await partyModel
          .findOne({ _id: bookingData.customerId })
          .session(session);

        // ✅ Single Payment Mode
        if (paymentData?.mode === "single") {
          const receiptVoucher = await generateVoucherNumber(
            orgId,
            "receipt",
            series_idReceipt,
            session,
          );

          const serialNumber = await getNewSerialNumber(
            ReceiptModel,
            "serialNumber",
            session,
          );

          const singlePaymentDetails = paymentData.payments[0];

          const method = singlePaymentDetails?.method;
          const selectedBankOrCashParty = singlePaymentDetails?.accountId;

          const paymentDetails =
            method === "cash"
              ? {
                  cash_ledname: singlePaymentDetails?.accountName,
                  cash_name: singlePaymentDetails?.accountName,
                }
              : {
                  bank_ledname: singlePaymentDetails?.accountName,
                  bank_name: singlePaymentDetails?.accountName,
                };

          await buildReceipt(
            receiptVoucher,
            serialNumber,
            paymentDetails,
            bookingData.advanceAmount,
            method === "cash" ? "Cash" : "Online",
          );

          await saveSettlementDataHotel(
            selectedParty,
            orgId,
            method === "cash" ? "cash" : "bank",
            selectedModal.modelName,
            newBooking.voucherNumber,
            newBooking?._id,
            newBooking.advanceAmount,
            new Date(),
            selectedParty?.partyName,
            selectedBankOrCashParty,
            selectedModal.modelName,
            req,
            session,
          );
        }
        // ✅ Multiple Payment Mode
        else {
          for (const payment of paymentData?.payments || []) {
            const receiptVoucher = await generateVoucherNumber(
              orgId,
              "receipt",
              series_idReceipt,
              session,
            );

            const serialNumber = await getNewSerialNumber(
              ReceiptModel,
              "serialNumber",
              session,
            );

            const selectedBankOrCashParty = payment?.accountId;

            await saveSettlementDataHotel(
              selectedParty,
              orgId,
              payment.method === "cash" ? "cash" : "bank",
              selectedModal.modelName,
              newBooking.voucherNumber,
              advanceObject._id,
              payment.amount,
              new Date(),
              selectedParty?.partyName,
              selectedBankOrCashParty,
              selectedModal.modelName,
              req,
              session,
            );

            const paymentDetails =
              payment.method === "cash"
                ? {
                    cash_ledname: payment?.accountName,
                    cash_name: payment?.accountName,
                  }
                : {
                    bank_ledname: payment?.accountName,
                    bank_name: payment?.accountName,
                  };

            await buildReceipt(
              receiptVoucher,
              serialNumber,
              paymentDetails,
              payment.amount,
              payment.method === "cash" ? "Cash" : "Online",
            );
          }
        }
      }

      // 🔹 Update Room Status
      let status =
        selectedModal.modelName === "CheckIn" ? "checkIn" : "booking";
      await updateStatus(bookingData?.selectedRooms, status, session);
    });

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// function used to fetch booking list
export const getBookings = async (req, res) => {
  try {
    const params = extractRequestParamsForBookings(req);
    console.log("paramss", params);
    const filter = buildDatabaseFilterForBooking(params);
    console.log("filter", filter);
    const { bookings = [], totalBookings = 0 } =
      await fetchBookingsFromDatabase(filter, params);

    // ✅ Process bookings to add payment status and travel agent info
    const processedBookings = bookings.map((booking) => {
      const processed = booking.toObject ? booking.toObject() : { ...booking };
      // ✅ Add payment status (shows payment type names, not amounts)
      processed.paymentStatus = getPaymentStatus(processed.paymenttypeDetails);

      // ✅ Add travel agent name - check both agentId and isHotelAgent
      if (processed.agentId?.partyName) {
        // If there's a separate agentId, use that
        processed.travelAgentName = processed.agentId.partyName;
      } else if (
        processed.isHotelAgent === true ||
        processed.customerId?.isHotelAgent === true
      ) {
        // Otherwise check if customer is hotel agent
        processed.travelAgentName = processed.customerId?.partyName || "-";
      } else {
        processed.travelAgentName = "-";
      }

      processed.roomNumbers =
        processed.selectedRooms
          ?.map((room) => room.roomName || room.roomNumber)
          .filter(Boolean)
          .join(", ") || "-";

      return processed;
    });
    console.log(
      "bookingss",
      processedBookings[0]?.selectedRooms[0]?.dateTariffs,
    );
    return sendBookingsResponse(res, processedBookings, totalBookings, params);
  } catch (error) {
    console.error("Error in getBookings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

const getPaymentStatus = (paymenttypeDetails) => {
  if (!paymenttypeDetails) return "Unpaid";

  const paymentTypes = [];

  if (parseFloat(paymenttypeDetails.cash || 0) > 0) {
    paymentTypes.push("Cash");
  }
  if (parseFloat(paymenttypeDetails.bank || 0) > 0) {
    paymentTypes.push("Bank");
  }
  if (parseFloat(paymenttypeDetails.upi || 0) > 0) {
    paymentTypes.push("UPI");
  }
  if (parseFloat(paymenttypeDetails.card || 0) > 0) {
    paymentTypes.push("Card");
  }
  if (parseFloat(paymenttypeDetails.credit || 0) > 0) {
    paymentTypes.push("Credit");
  }

  return paymentTypes.length > 0 ? paymentTypes.join(", ") : "Unpaid";
};

// function used to delete booking details
export const deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);
    if (deletedBooking) {
      return res.status(200).json({
        success: true,
        message: "Booking deleted successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// function used to update booking details
// In hotelController.js, replace the updateBooking function with this fixed version:

// export const updateBooking = async (req, res) => {
//   const session = await Booking.startSession();

//   try {
//     const bookingData = req.body?.data;
//     const modal = req.body?.modal;
//     const paymentData = req.body?.paymentData;
//     const bookingId = req.params.id;
//     const orgId = req.body?.orgId;
//     const isTariffRateChange = req.body?.isTariffRateChange || false;
//     const roomIdToEdit = req.body?.roomIdToEdit;

//     // console.log("=== UPDATE BOOKING STARTED ===");
//     // console.log("isTariffRateChange:", isTariffRateChange);
//     // console.log("roomIdToEdit:", roomIdToEdit);
//     // console.log("Incoming selectedRooms count:", bookingData.selectedRooms?.length);
//     // console.log("Incoming room names:", bookingData.selectedRooms?.map(r => r.roomName));

//     if (!bookingData?.arrivalDate) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Select correct model
//     let selectedModal;
//     if (modal === "checkIn") {
//       selectedModal = CheckIn;
//     } else if (modal === "Booking") {
//       selectedModal = Booking;
//     } else {
//       selectedModal = CheckOut;
//     }

//     let findOne = await selectedModal
//       .findOne({ _id: bookingId })
//       .session(session);

//     // console.log("Original DB rooms count:", findOne?.selectedRooms?.length);
//     // console.log("Original DB room names:", findOne?.selectedRooms?.map(r => r.roomName));

//     // ✅ CRITICAL SAFETY CHECK: Verify room count
//     let finalSelectedRooms = bookingData.selectedRooms;

//     if (isTariffRateChange && roomIdToEdit) {
//       const originalRoomCount = findOne?.selectedRooms?.length || 0;
//       const incomingRoomCount = finalSelectedRooms?.length || 0;

//       console.log(
//         "Room count check - Original:",
//         originalRoomCount,
//         "Incoming:",
//         incomingRoomCount
//       );

//       // ⚠️ SAFETY: If room count doesn't match, backend merge as fallback
//       if (incomingRoomCount !== originalRoomCount) {
//         console.warn(
//           "⚠️ Room count mismatch detected! Applying backend safety merge..."
//         );

//         // Find the edited room in incoming data
//         const editedRoom = finalSelectedRooms.find((room) => {
//           const roomId =
//             room.roomId?._id?.toString() ||
//             room.roomId?.toString() ||
//             room._id?.toString();
//           return roomId === roomIdToEdit.toString();
//         });

//         if (editedRoom) {
//           // console.log("Found edited room:", editedRoom.roomName);

//           // Merge: Replace only the edited room, keep all others
//           finalSelectedRooms = findOne.selectedRooms.map((originalRoom) => {
//             const originalRoomId =
//               originalRoom.roomId?._id?.toString() ||
//               originalRoom.roomId?.toString() ||
//               originalRoom._id?.toString();

//             if (originalRoomId === roomIdToEdit.toString()) {
//               console.log(
//                 "Replacing room:",
//                 originalRoom.roomName,
//                 "with updated data"
//               );
//               return {
//                 ...(originalRoom.toObject
//                   ? originalRoom.toObject()
//                   : originalRoom),
//                 ...editedRoom,
//                 _id: originalRoom._id,
//                 roomId: originalRoom.roomId,
//               };
//             }
//             return originalRoom.toObject
//               ? originalRoom.toObject()
//               : originalRoom;
//           });

//           // console.log("✅ Backend merge completed. Final room count:", finalSelectedRooms.length);
//           // console.log("Final room names:", finalSelectedRooms.map(r => r.roomName));
//         } else {
//           console.error("❌ Could not find edited room in incoming data!");
//           throw new Error("Room data integrity check failed");
//         }
//       } else {
//         console.log("✅ Room count matches. Using incoming data.");
//       }
//     }

//     // Recalculate totals with final merged rooms
//     const newRoomTotal = finalSelectedRooms.reduce(
//       (sum, room) => sum + Number(room.amountAfterTax || room.totalAmount || 0),
//       0
//     );

//     bookingData.selectedRooms = finalSelectedRooms;
//     bookingData.roomTotal = newRoomTotal;

//     // Recalculate grand total
//     const paxTotal = Number(bookingData.paxTotal || 0);
//     const foodPlanTotal = Number(bookingData.foodPlanTotal || 0);
//     const totalBeforeDiscount = newRoomTotal + paxTotal + foodPlanTotal;
//     const discountAmount = Number(bookingData. || 0);
//     bookingData.grandTotal = totalBeforeDiscount - discountAmount;
//     bookingData.totalAmount = totalBeforeDiscount;

//     // console.log("Final calculated totals:");
//     // console.log("  Room Total:", newRoomTotal);
//     // console.log("  Grand Total:", bookingData.grandTotal);
//     // console.log("  Final room count:", finalSelectedRooms.length);

//     // Get receipt series
//     const voucher = await VoucherSeriesModel.findOne({
//       cmp_id: orgId,
//       voucherType: "receipt",
//     }).session(session);

//     const series_idReceipt = voucher?.series
//       ?.find((s) => s.under === "hotel")
//       ?._id.toString();

//     const selectedParty = await partyModel
//       .findOne({ _id: bookingData.customerId })
//       .session(session);

//     await session.withTransaction(async () => {
//       // Clean existing receipts & settlements if updating
//       if (bookingId) {
//         await deleteReceipt(bookingId, session);
//         await deleteSettlements(bookingId, session);
//       }

//       // Handle advance payment logic (existing code remains same)
//       if (bookingData.advanceAmount && bookingData.advanceAmount > 0) {
//         // ... existing advance payment logic ...
//       } else {
//         await TallyData.deleteOne({ billId: bookingId.toString() });
//       }

//       // ✅ Update booking with final merged rooms
//       const updateResult = await selectedModal.findByIdAndUpdate(
//         bookingId,
//         { $set: bookingData },
//         { new: true, session }
//       );

//       // console.log("✅ Update completed successfully");
//       // console.log("Saved rooms count:", updateResult?.selectedRooms?.length);
//       // console.log("Saved room names:", updateResult?.selectedRooms?.map(r => r.roomName));

//       // Final verification
//       if (isTariffRateChange && roomIdToEdit) {
//         const savedCount = updateResult?.selectedRooms?.length || 0;
//         const originalCount = findOne?.selectedRooms?.length || 0;

//         if (savedCount !== originalCount) {
//           throw new Error(
//             `Room count mismatch after save! Original: ${originalCount}, Saved: ${savedCount}`
//           );
//         }
//       }
//     });

//     // console.log("=== UPDATE BOOKING COMPLETED SUCCESSFULLY ===");

//     res.status(200).json({
//       success: true,
//       message: isTariffRateChange
//         ? `Room tariff rate updated successfully. All ${finalSelectedRooms?.length} rooms preserved.`
//         : "Booking updated successfully",
//       roomsCount: finalSelectedRooms?.length,
//     });
//   } catch (error) {
//     console.error("❌ Error updating booking:", {
//       error: error.message,
//       bookingId: req.params.id,
//     });
//     res.status(500).json({
//       success: false,
//       message: "Server error: " + error.message,
//       error: error.message,
//     });
//   } finally {
//     await session.endSession();
//   }
// };

export const updateBooking = async (req, res) => {
  const session = await Booking.startSession();

  try {
    const bookingData = req.body?.data;
    const modal = req.body?.modal; // "checkIn" | "Booking" | "checkOut"
    const paymentData = req.body?.paymentData;
    const bookingId = req.params.id;
    const orgId = req.body?.orgId;
    const isTariffRateChange = req.body?.isTariffRateChange || false;
    const roomIdToEdit = req.body?.roomIdToEdit;
    const paymenttypeDetails = req.body?.paymenttypeDetails;

    if (!bookingData?.arrivalDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Select correct model
    let selectedModal;
    if (modal === "checkIn") {
      selectedModal = CheckIn;
    } else if (modal === "Booking") {
      selectedModal = Booking;
    } else {
      selectedModal = CheckOut;
    }

    // Get existing booking/checkIn/checkOut
    const findOne = await selectedModal
      .findOne({ _id: bookingId })
      .session(session);

    if (!findOne) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const effectiveCmpId = findOne?.cmp_id?.toString();

    await ensureSecondaryUserCompanyAccess({
      cmp_id: effectiveCmpId,
      secondaryUserId: req.sUserId,
    });

    if (modal === "checkIn") {
      if (isTariffRateChange) {
        await ensureHotelTariffDateIsEditable({
          cmp_id: findOne.cmp_id,
          arrivalDate: findOne.arrivalDate,
          checkOutDate: findOne.checkOutDate,
          requestedTariffDate: bookingData.currentDate,
          session,
        });
      } else {
        await ensureHotelDateIsEditable({
          cmp_id: findOne.cmp_id,
          recordDate: findOne.arrivalDate,
          session,
        });
      }
    }

    await updateSwapDetails(
      findOne?.selectedRooms,
      bookingData.selectedRooms,
      session,
    );
    // -----------------------------
    // ROOM MERGE + TOTAL RECALC
    // -----------------------------
    let finalSelectedRooms = bookingData.selectedRooms;

    if (isTariffRateChange && roomIdToEdit) {
      const originalRoomCount = findOne?.selectedRooms?.length || 0;
      const incomingRoomCount = finalSelectedRooms?.length || 0;

      if (incomingRoomCount !== originalRoomCount) {
        console.warn(
          "⚠️ Room count mismatch detected! Applying backend safety merge...",
        );

        const editedRoom = finalSelectedRooms.find((room) => {
          const roomId =
            room.roomId?._id?.toString() ||
            room.roomId?.toString() ||
            room._id?.toString();
          return roomId === roomIdToEdit.toString();
        });

        if (editedRoom) {
          finalSelectedRooms = findOne.selectedRooms.map((originalRoom) => {
            const originalRoomId =
              originalRoom.roomId?._id?.toString() ||
              originalRoom.roomId?.toString() ||
              originalRoom._id?.toString();

            if (originalRoomId === roomIdToEdit.toString()) {
              return {
                ...(originalRoom.toObject
                  ? originalRoom.toObject()
                  : originalRoom),
                ...editedRoom,
                _id: originalRoom._id,
                roomId: originalRoom.roomId,
              };
            }
            return originalRoom.toObject
              ? originalRoom.toObject()
              : originalRoom;
          });
        } else {
          console.error("❌ Could not find edited room in incoming data!");
          throw new Error("Room data integrity check failed");
        }
      } else {
        console.log("✅ Room count matches. Using incoming data.");
      }
    }

    // Recalculate room / grand totals with finalSelectedRooms
    const newRoomTotal = finalSelectedRooms.reduce(
      (sum, room) => sum + Number(room.amountAfterTax || room.totalAmount || 0),
      0,
    );

    bookingData.selectedRooms = finalSelectedRooms;
    bookingData.roomTotal = newRoomTotal;

    const paxTotal = Number(bookingData.paxTotal || 0);
    const foodPlanTotal = Number(bookingData.foodPlanTotal || 0);
    const totalBeforeDiscount = newRoomTotal + paxTotal + foodPlanTotal;
    const discountAmount = Number(bookingData.discountAmount || 0);
    bookingData.grandTotal = totalBeforeDiscount - discountAmount;
    bookingData.totalAmount = totalBeforeDiscount;

    // -----------------------------
    // ADVANCE / RECEIPT CONTEXT
    // -----------------------------
    const voucher = await VoucherSeriesModel.findOne({
      cmp_id: effectiveCmpId,
      voucherType: "receipt",
    }).session(session);

    const series_idReceipt = voucher?.series
      ?.find((s) => s.under === "hotel")
      ?._id.toString();

    // Common party used in multiple places
    let selectedParty = await partyModel
      .findOne({ _id: bookingData.customerId })
      .populate("accountGroup")
      .session(session);

    // convert to plain object & flatten accountGroup -> accountGroup_id
    if (selectedParty) {
      selectedParty = selectedParty.toObject();
      if (selectedParty.accountGroup?._id) {
        selectedParty.accountGroup_id =
          selectedParty.accountGroup._id.toString();
      }
      delete selectedParty.accountGroup;
    }

    // Helper: build receipt (same pattern as create)
    const buildReceipt = async (
      receiptVoucher,
      serialNumber,
      paymentDetails,
      amount,
      paymentMethod,
      billData,
      orgId,
      series_idReceipt,
      selectedParty,
      bookingData,
      req,
      session,
    ) => {
      console.log("line1696 hotelcontroller");
      const receipt = new ReceiptModel({
        createdAt: new Date(),
        date: await formatToLocalDate(new Date(), orgId, session),
        receiptNumber: receiptVoucher?.usedSeriesNumber,
        series_id: series_idReceipt,
        usedSeriesNumber: receiptVoucher?.usedSeriesNumber || null,
        serialNumber,
        cmp_id: orgId,
        party: selectedParty,
        billData,
        totalBillAmount: Math.round(bookingData.advanceAmount),
        enteredAmount: Math.round(amount),
        advanceAmount: 0,
        remainingAmount: 0,
        paymentMethod,
        paymentDetails,
        note: "",
        Primary_user_id: req.pUserId || req.owner,
        Secondary_user_id: req.sUserId,
      });

      return await receipt.save({ session });
    };

    // -----------------------------
    // TRANSACTION
    // -----------------------------
    // await session.withTransaction(async () => {
    // 2) Handle advance logic (delete-only vs delete+recreate)
    if (bookingData.advanceAmount && bookingData.advanceAmount > 0) {
      // a) Create new TallyData advance object
      const advanceObject = new TallyData({
        Primary_user_id: req.pUserId || req.owner,
        cmp_id: orgId,
        party_id: bookingData?.customerId,
        party_name: bookingData?.customerName,
        mobile_no: bookingData?.mobileNumber,
        bill_date: new Date(),
        bill_no: findOne?.voucherNumber || bookingData.voucherNumber,
        billId: bookingId,
        bill_amount: bookingData.advanceAmount,
        bill_pending_amt: 0,
        accountGroup: bookingData.accountGroup,
        user_id: req.sUserId,
        advanceAmount: bookingData.advanceAmount,
        // paymenttypeDetails: paymentData,
        advanceDate: new Date(),
        classification: "Cr",
        paymenttypeDetails,
        source: "hotel",
        from: selectedModal.modelName,
      });

      await advanceObject.save({ session });

      // b) Bill data for receipts
      const billData = [
        {
          _id: advanceObject._id,
          bill_no: findOne?.voucherNumber || bookingData.voucherNumber,
          billId: bookingId,
          bill_date: new Date(),
          bill_pending_amt: 0,
          source: "hotel",
          settledAmount: bookingData.advanceAmount,
          remainingAmount: 0,
        },
      ];

      // c) Party for settlement (raw doc for saveSettlementDataHotel, not flattened)
      const rawParty = await partyModel
        .findOne({ _id: bookingData.customerId })
        .session(session);

      // d) Single vs Multiple payment creation (same pattern as create)
      if (paymentData?.mode === "single") {
        const singlePaymentDetails = paymentData.payments[0];
        const method = singlePaymentDetails?.method; // "cash" | "bank" / "online"
        const selectedBankOrCashParty = singlePaymentDetails?.accountId;

        const receiptVoucher = await generateVoucherNumber(
          effectiveCmpId,
          "receipt",
          series_idReceipt,
          session,
        );

        const serialNumber = await getNewSerialNumber(
          ReceiptModel,
          "serialNumber",
          session,
        );

        const paymentDetails =
          method === "cash"
            ? {
                cash_ledname: singlePaymentDetails?.accountName,
                cash_name: singlePaymentDetails?.accountName,
              }
            : {
                bank_ledname: singlePaymentDetails?.accountName,
                bank_name: singlePaymentDetails?.accountName,
              };
        console.log("line 1807");
        // Receipt
        await buildReceipt(
          receiptVoucher,
          serialNumber,
          paymentDetails,
          bookingData.advanceAmount,
          method === "cash" ? "Cash" : "Online",
          billData,
          effectiveCmpId,
          series_idReceipt,
          selectedParty,
          bookingData,
          req,
          session,
        );

        // Settlement
        await saveSettlementDataHotel(
          rawParty,
          effectiveCmpId,
          method === "cash" ? "cash" : "bank",
          selectedModal.modelName,
          findOne?.voucherNumber || bookingData.voucherNumber,
          bookingId,
          bookingData.advanceAmount,
          new Date(),
          rawParty?.partyName,
          selectedBankOrCashParty,
          selectedModal.modelName,
          req,
          session,
        );
      } else {
        // multiple payments
        for (const payment of paymentData?.payments || []) {
          const receiptVoucher = await generateVoucherNumber(
            effectiveCmpId,
            "receipt",
            series_idReceipt,
            session,
          );

          const serialNumber = await getNewSerialNumber(
            ReceiptModel,
            "serialNumber",
            session,
          );

          const selectedBankOrCashParty = payment?.accountId;

          await saveSettlementDataHotel(
            rawParty,
            effectiveCmpId,
            payment.method === "cash" ? "cash" : "bank",
            selectedModal.modelName,
            findOne?.voucherNumber || bookingData.voucherNumber,
            bookingId,
            payment.amount,
            new Date(),
            rawParty?.partyName,
            selectedBankOrCashParty,
            selectedModal.modelName,
            req,
            session,
          );

          const paymentDetails =
            payment.method === "cash"
              ? {
                  cash_ledname: payment?.accountName,
                  cash_name: payment?.accountName,
                }
              : {
                  bank_ledname: payment?.accountName,
                  bank_name: payment?.accountName,
                };
          console.log("line 1884");
          await buildReceipt(
            receiptVoucher,
            serialNumber,
            paymentDetails,
            payment.amount,
            payment.method === "cash" ? "Cash" : "Online",
            billData,
            effectiveCmpId,
            series_idReceipt,
            selectedParty,
            bookingData,
            req,
            session,
          );
        }
      }
    }
    // else {
    //   // No advance now -> ensure old advance records are gone
    //   await TallyData.deleteMany({ billId: bookingId.toString() }).session(
    //     session,
    //   );
    // }
    //advance tracking

    const today = new Date().toISOString().slice(0, 10);
    const newAdvance = bookingData.advanceAmount;

    const advanceMap = bookingData.advanceTracking || new Map();

    // Calculate total previous advance
    let totalPreviousAdvance = 0;
    for (const value of advanceMap.values()) {
      totalPreviousAdvance += value;
    }

    if (advanceMap.has(today)) {
      // Replace today's value
      advanceMap.set(today, newAdvance);
    } else {
      // Add difference
      const difference = newAdvance - totalPreviousAdvance;
      advanceMap.set(today, difference);
    }

    bookingData.advanceTracking = Array.from(advanceMap.entries());

    // merging new payment details with existing
    let incPayload = {};

    if (paymenttypeDetails && typeof paymenttypeDetails === "object") {
      Object.keys(paymenttypeDetails).forEach((key) => {
        if (paymenttypeDetails[key]) {
          // skip zero values
          incPayload[`paymenttypeDetails.${key}`] = paymenttypeDetails[key];
        }
      });
    }

    // Remove paymenttypeDetails from bookingData to avoid $set overwriting it
    delete bookingData.paymenttypeDetails;

    // ✅ Build checkoutpaymenttypedetails from paymentData.payments
    let checkoutPaymentsToAdd = [];

    if (paymentData?.payments && Array.isArray(paymentData.payments)) {
      checkoutPaymentsToAdd = paymentData.payments;
    }

    // 3) Finally, update booking/checkIn/checkOut document
    const updateResult = await selectedModal.findByIdAndUpdate(
      bookingId,
      {
        $set: bookingData,
        ...(Object.keys(incPayload).length > 0 && { $inc: incPayload }),
        // ✅ Push new payments into checkoutpaymenttypedetails array (never overwrites)
        ...(checkoutPaymentsToAdd.length > 0 && {
          $push: {
            checkoutpaymenttypedetails: { $each: checkoutPaymentsToAdd },
          },
        }),
      },
      { new: true, session },
    );

    if (isTariffRateChange && roomIdToEdit) {
      const savedCount = updateResult?.selectedRooms?.length || 0;
      const originalCount = findOne?.selectedRooms?.length || 0;

      if (savedCount !== originalCount) {
        throw new Error(
          `Room count mismatch after save! Original: ${originalCount}, Saved: ${savedCount}`,
        );
      }
    }

    // 4) Optionally update room status if your edit flow needs it:
    //    (if required, uncomment & adapt)
    // let status =
    //   selectedModal.modelName === "CheckIn" ? "checkIn" : "booking";
    // await updateStatus(bookingData?.selectedRooms, status, session);
    // });

    // await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: isTariffRateChange
        ? `Room tariff rate updated successfully. All ${finalSelectedRooms?.length} rooms preserved.`
        : "Booking updated successfully",
      roomsCount: finalSelectedRooms?.length,
    });
  } catch (error) {
    console.log(error);

    console.error("❌ Error updating booking:", {
      error: error.message,
      bookingId: req.params.id,
    });
    res.status(error.status || 500).json({
      success: false,
      message:
        error.status && error.status !== 500
          ? error.message
          : "Server error: " + error.message,
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// function used to fetch booking advance details

export const fetchAdvanceDetails = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const type = req.query?.type;

    let advanceDetails = null;
    if (type == "EditCheckOut") {
      let checkOutData = await CheckOut.findOne({ _id: bookingId });
      if (checkOutData) {
        let checkInData = await CheckIn.findOne({
          _id: checkOutData.checkInId,
        });
        let bookingSideAdvanceDetails = await TallyData.find({
          billId: checkInData.bookingId,
        });
        let checkInSideAdvanceDetails = await TallyData.find({
          billId: checkInData._id,
        });
        let checkOutSideAdvanceDetails = await TallyData.find({
          billId: checkOutData._id,
        });
        advanceDetails = [
          ...bookingSideAdvanceDetails,
          ...checkInSideAdvanceDetails,
          ...checkOutSideAdvanceDetails,
        ];
      }
    } else if (type == "EditChecking") {
      let checkInData = await CheckIn.findOne({
        _id: bookingId,
      });
      if (checkInData) {
        let bookingSideAdvanceDetails = [];
        if (checkInData.bookingId) {
          bookingSideAdvanceDetails = await TallyData.find({
            billId: checkInData.bookingId,
          });
        }

        let checkInSideAdvanceDetails = await TallyData.find({
          billId: checkInData._id,
        });
        advanceDetails = [
          ...bookingSideAdvanceDetails,
          ...checkInSideAdvanceDetails,
        ];
      }
    } else {
      advanceDetails = await TallyData.find({ billId: bookingId });
    }
    if (advanceDetails) {
      return res.status(200).json({
        success: true,
        message: "Advance details fetched successfully",
        data: advanceDetails,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Advance details not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance details",
    });
  }
};
export const getallroomsCurrentStatus = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const allroomswithstatus = await roomModal.find({ cmp_id });
    if (allroomswithstatus && allroomswithstatus.length) {
      return res.json({ success: true, data: allroomswithstatus });
    }
  } catch (error) {
    console.log("error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed fetch rooms",
      error: error.message,
    });
  }
};
export const getallnoncheckoutCheckins = async (req, res) => {
  const { cmp_id } = req.params;
  try {
    const allnocheckoutcheckins = await CheckIn.find({
      cmp_id,
      status: { $nin: ["checkOut", "cancelled"] },
    });
    return res.json({ success: true, data: allnocheckoutcheckins });
  } catch (error) {
    console.log("error", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
      error: error.message,
    });
  }
};
export const getAllRoomsWithStatusForDate = async (req, res) => {
  const { cmp_id } = req.params;
  const { selectedDate } = req.query; // expected format: "YYYY-MM-DD"

  try {
    // 1. Fetch all rooms for the company
    const allRooms = await roomModal
      .find({ cmp_id })
      .populate("cmp_id", "name") // Populate organization details
      .populate("roomType") // Populate from brand collection
      .populate("roomFloor") // Populate from subCategory collection
      .populate("bedType") // Populate from category collection
      .populate("priceLevel.priceLevel", "name") // Populate price level details
      .sort({ roomName: 1 }) // Sort by room name (roomNumber doesn't exist in schema)
      .lean();

    // 2. Bookings: status NOT 'checkIn' AND date overlaps selectedDate
    const bookings = await Booking.find({
      cmp_id,
      status: { $nin: ["checkIn", "cancelled"] }, // skip check-ins, only pre-arrival bookings
      arrivalDate: { $lte: selectedDate },
      checkOutDate: { $gte: selectedDate },
    }).select("selectedRooms");

    const AllCheckIns = await CheckIn.find({
      cmp_id,
      status: { $nin: ["checkOut", "cancelled"] },
    }).select("selectedRooms checkOutDate arrivalDate isHold");

    // --- Collect booked room IDs
    const bookedRoomIds = new Set();
    for (const booking of bookings) {
      for (const selRoom of booking.selectedRooms) {
        if (selRoom.roomId) {
          bookedRoomIds.add(selRoom.roomId.toString());
        }
      }
    }

    const occupiedRoomIds = new Set();
    for (const checkin of AllCheckIns) {
      for (const selRoom of checkin.selectedRooms) {
        console.log("selRoom", checkin);
        if (selRoom?.roomId && !selRoom?.isSwapped && !checkin?.isHold) {
          occupiedRoomIds.add(selRoom.roomId.toString());
        }
      }
    }

    // --- Mark each room's status
    const roomsWithStatus = allRooms.map((room) => {
      let status = room?.status;
      if (occupiedRoomIds.has(room._id.toString())) {
        status = "occupied";
      } else if (bookedRoomIds.has(room._id.toString())) {
        status = "booked";
      }

      return { ...room, status };
    });

    return res.json({ success: true, rooms: roomsWithStatus });
  } catch (error) {
    console.error("Error getting rooms with status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
      error: error.message,
    });
  }
};
// Update room status
export const updateRoomStatus = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params; // Get room ID from URL
    const { status } = req.body; // Get status from request body

    // Validate room ID
    if (!id) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    // Validate status
    const validStatuses = roomModal.schema.path("status").enumValues;
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid or missing status",
        validStatuses,
      });
    }

    let existingRoom;
    let updatedRoom;

    await session.withTransaction(async () => {
      existingRoom = await roomModal.findById(id).session(session);

      if (!existingRoom) {
        return;
      }

      if (existingRoom.status !== status) {
        await updateStatus([{ roomId: existingRoom._id }], status, session);
      }

      updatedRoom = await roomModal
        .findById(id)
        .session(session)
        .populate("roomType")
        .populate("bedType")
        .populate("roomFloor");
    });

    if (!existingRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({
      message: "Room status updated successfully",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Error updating room status:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  } finally {
    session.endSession();
  }
};
// function used  to fetch date based booking details and checking details
export const getDateBasedRoomsWithStatus = async (req, res) => {
  const { cmp_id } = req.params;
  const { selectedDate } = req.query;

  try {
    // 1. Fetch pre-arrival bookings (status not 'checkIn')
    const bookings = await Booking.find({
      cmp_id,
      status: { $nin: ["checkIn", "cancelled"] },
      arrivalDate: { $lte: selectedDate },
      checkOutDate: { $gte: selectedDate },
    });

    // 2. Fetch check-ins (status not 'checkOut')
    const checkins = await CheckIn.find({
      cmp_id,
      // status: { $ne: "checkOut" },
      status: { $nin: ["checkOut", "cancelled"] },
      isHold: false,
      // arrivalDate: { $lte: selectedDate },
      // checkOutDate: { $gte: selectedDate },
    })
      .populate("customerId")
      .populate("guestId")
      .populate("agentId")
      .populate("isHotelAgent")
      .populate("selectedRooms.selectedPriceLevel")
      .populate("bookingId")
      .populate("checkInId");

    // ✅ Send response
    return res.status(200).json({
      success: true,
      bookings,
      checkins,
    });
  } catch (error) {
    console.error("Error getting bookings:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};
// function used to close multiple checkouts
export const checkoutWithArrayOfData = async (req, res) => {
  const session = await CheckOut.startSession();
  try {
    const checkOutArray = req.body?.data; // checkout array
    const orgId = req.params.cmp_id;
    const isFor = req.body?.modal;

    if (!checkOutArray || checkOutArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No checkout data provided",
      });
    }

    const selectedModal = CheckOut; // Always checkout here
    const voucherType = "sales";
    const under = "hotel";

    await session.withTransaction(async () => {
      for (const bookingData of checkOutArray) {
        // ✅ Step 1: Update checkIn if linked
        if (bookingData?.checkInId) {
          let updateBookingData = await CheckIn.findByIdAndUpdate(
            bookingData.checkInId,
            { status: "checkOut" },
            { new: true, session },
          );

          if (!updateBookingData) {
            throw new Error(
              "Check In not found for ID: " + bookingData.checkInId,
            );
          }
        }

        const findSeries = await VoucherSeriesModel.findOne({
          cmp_id: orgId,
          voucherType,
        });
        let series_id = findSeries?.series
          .find((s) => s.under === under)
          ?._id.toString();

        const bookingNumber = await generateVoucherNumber(
          orgId,
          voucherType,
          series_id,
          session,
        );

        let checkInId = bookingData._id;
        // Attach generated voucher details
        bookingData.voucherNumber = bookingNumber?.voucherNumber;
        bookingData.voucherId = series_id;
        bookingData.advanceAmount = 0;
        delete bookingData._id;
        // bookingData.advanceAmount = Number(bookingData.balanceToPay)
        // bookingData.balanceToPay = 0;
        // ✅ Step 3: Save checkout entry
        const newBooking = new selectedModal({
          cmp_id: orgId,
          Primary_user_id: req.pUserId || req.owner,
          Secondary_user_id: req.sUserId,
          customerId: bookingData.customerId?._id,
          checkInId,
          ...bookingData,
        });

        let updateCheckIn = await CheckIn.findByIdAndUpdate(
          checkInId,
          { status: "checkOut" },
          { new: true, session },
        );
        if (!updateCheckIn) {
          throw new Error("Check In not found for ID: " + bookingData._id);
        }

        const savedBooking = await newBooking.save({ session });

        // ✅ Step 4: If advance exists, save tally entry
        // if (bookingData.advanceAmount && bookingData.advanceAmount > 0) {
        //   const advanceObject = new TallyData({
        //     Primary_user_id: req.pUserId || req.owner,
        //     cmp_id: orgId,
        //     party_id: bookingData.customerId?._id,
        //     party_name: bookingData?.customerName,
        //     mobile_no: bookingData?.mobileNumber,
        //     bill_date: new Date(),
        //     bill_no: savedBooking?.voucherNumber,
        //     billId: savedBooking._id,
        //     bill_amount: bookingData.advanceAmount,
        //     bill_pending_amt: bookingData.advanceAmount,
        //     accountGroup: bookingData.customerId?.accountGroup,
        //     user_id: req.sUserId,
        //     advanceAmount: bookingData.advanceAmount,
        //     advanceDate: new Date(),
        //     classification: "Cr",
        //     source: under,
        //   });

        //   await advanceObject.save({ session });
        // }
      }
    });

    res.status(201).json({
      success: true,
      message: "All checkouts saved successfully",
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// function used to fetch out standing data
export const fetchOutStandingAndFoodData = async (req, res) => {
  try {
    const checkoutData = req.body?.data;
    const isForPreview = req.body?.isForPreview;
    const cmp_id = new mongoose.Types.ObjectId(req.params.cmp_id);

    if (!checkoutData || checkoutData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No checkout data provided",
      });
    }

    let allAdvanceDetails = [];
    let allKotData = [];

    const paymentGreaterThanZeroQuery = {
      $or: [
        { "paymenttypeDetails.cash": { $gt: "0" } },
        { "paymenttypeDetails.bank": { $gt: "0" } },
        { "paymenttypeDetails.upi": { $gt: "0" } },
        { "paymenttypeDetails.credit": { $gt: "0" } },
        { "paymenttypeDetails.card": { $gt: "0" } },
      ],
    };

    // ✅ CORRECTED: Get roomId and serviceType from ROOT level, not kotDetails
    await Promise.all(
      checkoutData.map(async (checkout) => {
        const docs = await salesModel.aggregate([
          {
            $match: {
              "convertedFrom.id": { $exists: true, $ne: null },
              "convertedFrom.checkInNumber":
                checkout?.checkInId?.voucherNumber || checkout?.voucherNumber,
              isComplimentary: false,
              isPostToRoom: true,
              cmp_id,
              isCancelled: false,
            },
          },
          {
            $addFields: {
              convertedFromObjId: {
                $map: {
                  input: "$convertedFrom",
                  as: "cf",
                  in: { $toObjectId: "$$cf.id" },
                },
              },
            },
          },
          {
            $lookup: {
              from: "kots",
              let: { cfIds: "$convertedFromObjId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$cfIds"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    roomId: 1,
                    tableNumber: 1,
                    serviceType: 1,
                  },
                },
              ],
              as: "kotDetails",
            },
          },
          {
            $unwind: {
              path: "$kotDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]);

        docs.forEach((doc, idx) => {
          console.log(`KOT ${idx + 1}:`, {
            salesNumber: doc.salesNumber,
            convertedFromId: doc.convertedFrom,
            roomId: doc.kotDetails?.roomId,
            tableNumber: doc.kotDetails?.tableNumber,
            serviceType: doc.kotDetails?.serviceType,
            amount: doc.finalAmount,
          });
        });

        console.log("ALL KOT DATAaaa", docs);

        docs.forEach((doc) => {
          if (
            !allKotData.some((item) => String(item._id) === String(doc._id))
          ) {
            allKotData.push(doc);
          }
        });
      }),
    );
    console.log("ALL KOT DATA", allKotData);
    const uniqueIds = new Set();
    const advanceMap = new Map(); // prevents duplicates by _id

    if (Array.isArray(checkoutData)) {
      checkoutData.forEach((checkout) => {
        if (Array.isArray(checkout?.allCheckInIds)) {
          checkout.allCheckInIds.forEach((id) => {
            uniqueIds.add(String(id));
          });
        }
      });
    }

    console.log("UNIQUE CHECK-IN IDS:", [...uniqueIds]);
    console.log("=== UNIQUE CHECK-INS ===", uniqueIds.size);

    /* -------------------------------------------------- */
    /* WHEN UNIQUE CHECK-IN IDS EXIST */
    /* -------------------------------------------------- */
    if (uniqueIds.size !== 0) {
      for (const checkInId of uniqueIds) {
        const checkInData = await CheckIn.findById(checkInId).lean();
        if (!checkInData) continue;
        console.log("CHECK-IN DATA:", checkInData.bookingId);
        let bookingSide = [];
        if (checkInData.bookingId) {
          bookingSide = await TallyData.find({
            billId: checkInData.bookingId,
            // ...paymentGreaterThanZeroQuery,
          }).lean();
        }

        const checkInSide = await TallyData.find({
          billId: checkInId,
          // ...paymentGreaterThanZeroQuery,
        }).lean();
        console.log("CHECK-IN SIDE:", checkInSide);

        [...bookingSide, ...checkInSide].forEach((item) => {
          advanceMap.set(String(item._id), item);
        });
      }
    } else {
      /* -------------------------------------------------- */
      /* WHEN NO UNIQUE CHECK-IN IDS (CHECKOUT CASE) */
      /* -------------------------------------------------- */
      for (const checkout of checkoutData) {
        console.log("checkout", checkout);
        let bookingSide = [];
        if (checkout.bookingId?._id) {
          bookingSide = await TallyData.find({
            billId: checkout.bookingId?._id,
            // ...paymentGreaterThanZeroQuery,
          }).lean();
        }

        console.log("BookingSide:", bookingSide.length);
        console.log("CheckInId:", checkout.checkInId?._id || checkout._id);
        const checkInSide = await TallyData.find({
          billId: checkout.checkInId?._id || checkout._id,
          // ...paymentGreaterThanZeroQuery,
        }).lean();
        console.log("CheckInSide:", checkInSide.length);
        const salesData = await salesModel
          .findOne({
            salesNumber: checkout.voucherNumber,
            cmp_id,
          })
          .lean();

        console.log("SalesData:", salesData);
        // if (!salesData) continue;
        console.log("SalesData:", salesData);
        let advanceData = [];
        if (salesData) {
          advanceData = await TallyData.find({
            billId: salesData._id,
            ...paymentGreaterThanZeroQuery,
          }).lean();

          if (advanceData.length) {
            advanceData[0].isCheckOut = true;

            const sum =
              (bookingSide[0]?.bill_amount || 0) +
              (checkInSide[0]?.bill_amount || 0);

            advanceData[0].bill_amount = Math.abs(
              advanceData[0].bill_amount - sum,
            );
          }
        }

        [...bookingSide, ...checkInSide, ...advanceData].forEach((item) => {
          advanceMap.set(String(item._id), item);
        });
      }
    }

    /* -------------------------------------------------- */
    /* FINAL RESULT */
    /* -------------------------------------------------- */
    allAdvanceDetails = [...advanceMap.values()];
    console.log("FINAL ADVANCE COUNT:", allAdvanceDetails.length);

    if (allAdvanceDetails.length > 0 || allKotData.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Advance details fetched successfully",
        data: allAdvanceDetails || [],
        kotData: allKotData || [],
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Advance details not found",
      });
    }
  } catch (error) {
    console.error("Error fetching advance details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance details",
      error: error.message,
    });
  }
};

async function hotelVoucherSeries(cmp_id, session) {
  const SaleVoucher = await VoucherSeriesModel.findOne({
    cmp_id,
    voucherType: "sales",
  }).session(session);
  if (!SaleVoucher) throw new Error("Sale voucher not found");

  const specificVoucherSeries = SaleVoucher.series.find(
    (series) => series.under === "hotel",
  );
  if (!specificVoucherSeries)
    throw new Error("No 'hotel' voucher series found");

  return specificVoucherSeries;
}

export const convertCheckOutToSale = async (req, res) => {
  const session = await mongoose.startSession();

  let isAnyPartial = false;
  let checkOutAfterSave = [];
  let createdCheckoutIds = [];
  let multiCheckoutResults = [];

  try {
    await session.withTransaction(async () => {
      const { cmp_id } = req.params;

      const {
        paymentMethod,
        paymentDetails,
        selectedCheckOut = [],
        restaurantBaseSaleData = [],
        isPostToRoom = false,
        roomAssignments = null,
        checkoutMode,
        checkinIds,
        restaurantSideDiscountAdjustmentArray,
      } = req.body;

      if (!cmp_id) throw new Error("Missing cmp_id");

      if (!Array.isArray(selectedCheckOut) || selectedCheckOut.length === 0) {
        throw new Error("No checkout selected");
      }

      if (!["single", "multiple"].includes(checkoutMode)) {
        throw new Error("Invalid checkout mode");
      }

      if (!paymentDetails) throw new Error("Missing payment details");

      const paymentMode = paymentDetails?.paymentMode;

      if (!["single", "split", "credit"].includes(paymentMode)) {
        throw new Error("Invalid payment mode");
      }

      if (restaurantSideDiscountAdjustmentArray?.length > 0) {
        await handleAdvanceAndDiscountSettlementInRestaurant(
          restaurantSideDiscountAdjustmentArray,
          selectedCheckOut,
          cmp_id,
          session,
        );
      }
      const split = paymentDetails?.splitDetails || [];
      const additionalCharges = paymentDetails?.additionalChargeArray || [];
      const splitDetails = split;

      let restaurantTotal =
        restaurantBaseSaleData.length > 0
          ? restaurantBaseSaleData.reduce(
              (acc, item) => acc + Number(item.finalAmount || 0),
              0,
            )
          : 0;

      const specificVoucherSeries = await hotelVoucherSeries(cmp_id, session);

      // ---------------------------------------------
      // Prefetch booking + checkIn data before loop
      // ---------------------------------------------
      const bookingVoucherNumbers = selectedCheckOut
        .map((item) => item?.bookingId?.voucherNumber || item?.bookingId)
        .filter(Boolean);

      const checkinVoucherNumbers = selectedCheckOut
        .map((item) => item?.voucherNumber)
        .filter(Boolean);

      const [allBookings, allCheckins] = await Promise.all([
        Booking.find({
          voucherNumber: { $in: bookingVoucherNumbers },
          cmp_id,
        }).session(session),
        CheckIn.find({
          voucherNumber: { $in: checkinVoucherNumbers },
          cmp_id,
        }).session(session),
      ]);

      const bookingMap = new Map(
        allBookings.map((booking) => [booking.voucherNumber, booking]),
      );

      const checkinMap = new Map(
        allCheckins.map((checkin) => [checkin.voucherNumber, checkin]),
      );

      let results = [];
      let salesarray = [];

      for (const item of selectedCheckOut) {
        const bookingVoucherNumber =
          item?.bookingId?.voucherNumber || item?.bookingId;

        const checkingVoucherNumber = item?.voucherNumber;

        const matchedBooking = bookingMap.get(bookingVoucherNumber);
        const matchedCheckin = checkinMap.get(checkingVoucherNumber);

        let otherCharges = additionalCharges;

        let totalOtherChargeAmount = otherCharges.reduce(
          (acc, charge) => acc + Number(charge?.finalValue || 0),
          0,
        );

        const selectedPartyId = item?.customerId?._id || item?.customerId;

        if (!selectedPartyId) {
          throw new Error("Missing customerId._id in checkout item");
        }

        const itemTotal = (item.selectedRooms || []).reduce(
          (acc, room) => acc + Number(room.amountAfterTax || 0),
          0,
        );

        const partyData = await getSelectedParty(
          selectedPartyId,
          cmp_id,
          session,
        );

        const party = mapPartyData(partyData);

        // -----------------------------
        // Determine payment for this sale
        // -----------------------------
        let cashAmt = 0;
        let onlineAmt = 0;
        let finalPaymentMethod = "";
        let paidAmount = 0;
        let applicableSplits = [];
        let remarks = "";

        if (paymentMode === "single") {
          cashAmt = Number(paymentDetails?.cashAmount || 0);
          onlineAmt = Number(paymentDetails?.onlineAmount || 0);
          remarks = paymentDetails?.remarks;

          finalPaymentMethod =
            cashAmt > 0 ? "cash" : onlineAmt > 0 ? "bank" : "unknown";

          paidAmount = cashAmt + onlineAmt;
        } else if (paymentMode === "split") {
          applicableSplits = splitDetails.map((splitItem) => {
            if (splitItem.sourceType === "credit") {
              return {
                ...splitItem,
                source: splitItem.customer, // update source
                sourceType: "cash",
              };
            }
            return splitItem;
          });

          paidAmount = applicableSplits.reduce(
            (sum, splitItem) => sum + Number(splitItem.amount || 0),
            0,
          );

          cashAmt = applicableSplits
            .filter((s) => s.sourceType === "cash")
            .reduce((sum, s) => sum + Number(s.amount || 0), 0);

          onlineAmt = applicableSplits
            .filter((s) => s.sourceType === "bank")
            .reduce((sum, s) => sum + Number(s.amount || 0), 0);

          finalPaymentMethod =
            cashAmt > 0 && onlineAmt > 0
              ? "mixed"
              : cashAmt > 0
                ? "cash"
                : "bank";
        } else if (isPostToRoom || paymentMode === "credit") {
          cashAmt = Number(paymentDetails?.cashAmount || 0);
          finalPaymentMethod = "credit";
          paidAmount = Number(paymentDetails?.cashAmount || 0);
        }

        const pendingAmount =
          itemTotal - (paidAmount + Number(item?.Totaladvance || 0));

        const { arr: paymentSplittingArray, restaurantSplitArray } =
          await createPaymentSplittingArray(
            paymentDetails,
            cashAmt,
            onlineAmt,
            applicableSplits,
            restaurantTotal,
            restaurantBaseSaleData,
            session,
          );

        console.log("paymentSplittingArray", paymentSplittingArray);
        console.log("restaurantSplitArray", restaurantSplitArray);

        const saleNumber = await generateVoucherNumber(
          cmp_id,
          "sales",
          specificVoucherSeries._id.toString(),
          session,
        );

        const checkInId = item?._id;
        const roomsBeingCheckedOut = item?.selectedRooms || [];

        const originalCheckIn =
          await CheckIn.findById(checkInId).session(session);

        if (!originalCheckIn) {
          throw new Error(`Check-in ${checkInId} not found`);
        }

        const isThisPartial =
          item.isPartialCheckout ||
          roomsBeingCheckedOut.length <
            (originalCheckIn.selectedRooms?.length || 0);

        if (isThisPartial) isAnyPartial = true;

        const roomIdsBeingCheckedOut = roomsBeingCheckedOut.map(
          (room) => room._id?.toString() || room.toString(),
        );

        const remainingRooms = (originalCheckIn.selectedRooms || []).filter(
          (room) => !roomIdsBeingCheckedOut.includes(room._id.toString()),
        );

        const roomTotal = itemTotal;
        let checkoutamounttypes = [];
        n; // checked
        if (paymentMode !== "credit") {
          checkoutamounttypes = split
            .filter((splitItem) => splitItem.underCategory !== "food")
            .map((splitItem) => ({
              customerName: splitItem.customerName,
              mode: splitItem.subsource,
              amount: Number(splitItem.amount || 0),
            }));
        } else {
          checkoutamounttypes = [
            {
              customerName: paymentDetails.selectedCreditor?.partyName,
              mode: "credit",
              amount: Number(paymentDetails.cashAmount || 0),
            },
          ];
        }

        console.log("checkoutamounttypes");

        const paymentTotals = restaurantSplitArray.reduce(
          (acc, splitItem) => {
            const type = splitItem.sourceType;
            const amount = Number(splitItem.amount || 0);

            if (type === "cash") acc.cash += amount;
            else if (type === "upi") acc.upi += amount;
            else if (type === "bank") acc.bank += amount;
            else if (type === "card") acc.card += amount;
            else if (type === "credit") acc.credit += amount;

            return acc;
          },
          {
            cash: 0,
            upi: 0,
            bank: 0,
            card: 0,
            credit: 0,
          },
        );

        const { cash, upi, bank, card, credit } = paymentTotals;

        // Create checkout doc
        const checkOutDoc = await CheckOut.create(
          [
            {
              ...item,
              _id: undefined,
              cmp_id,
              Primary_user_id: req.owner || req.pUserId,
              voucherNumber: saleNumber?.voucherNumber,
              checkInId,
              bookingId: item?.bookingId?._id || item?.bookingId,
              customerId: selectedPartyId,
              customerName: item?.customerId?.partyName || party?.customerName,
              selectedRooms: roomsBeingCheckedOut,
              totalAmount: roomTotal,
              roomTotal,
              grandTotal: roomTotal,
              balanceToPay: pendingAmount <= 0 ? 0 : pendingAmount,
              isPartialCheckout: isThisPartial,
              originalCheckInId: checkInId,
              discountAmount: Number(item?.discountAmount || 0),
              paymenttypeDetails: {
                cash,
                bank,
                upi,
                card,
                credit,
              },
              checkoutpaymenttypedetails: checkoutamounttypes,
              checkoutType:
                checkoutMode === "single"
                  ? "singleCheckout"
                  : "individualCheckout",
            },
          ],
          { session },
        );

        const createdDoc = checkOutDoc[0];
        createdCheckoutIds.push(createdDoc._id);

        const amount = [item].reduce((total, el) => {
          const saleItemTotal = (el.selectedRooms || []).reduce(
            (acc, room) => acc + Number(room.amountAfterTax || 0),
            0,
          );
          return total + saleItemTotal;
        }, 0);

        const savedVoucherData = await createSalesVoucher(
          cmp_id,
          specificVoucherSeries,
          saleNumber,
          req,
          [item],
          party,
          partyData,
          paymentSplittingArray,
          session,
          checkInId,
          createdDoc._id,
          amount,
          otherCharges,
          totalOtherChargeAmount,
        );

        salesarray = savedVoucherData;

        if (otherCharges.length > 0) {
        }

        if (savedVoucherData) {
          console.log(savedVoucherData.length);
        }
        // console.log("savedsale", savedVoucherData)

        // Create Tally Entry

        const tallyRows = await createTallyEntry(
          cmp_id,
          req,
          selectedPartyId,
          [item],
          savedVoucherData[0],
          amount,
          session,
          paymentMode,
          "checkout",
        );

        if (paymentMode === "split") {
          for (const splitItem of applicableSplits) {
            const splitAmount = Number(splitItem.amount || 0);
            const splitSourceType = splitItem.sourceType;

            const splitSource = await Party.findOne({
              _id: splitItem.source,
            }).session(session);

            await saveSettlement(
              paymentDetails,
              selectedPartyId,
              splitSource,
              cmp_id,
              savedVoucherData[0],
              splitAmount,
              splitSourceType,
              req,
              session,
            );
          }
        }

        await updateReceiptForRooms(
          item?.voucherNumber,
          item?.bookingId?.voucherNumber || item?.bookingId,
          saleNumber?.voucherNumber,
          savedVoucherData[0]?._id,
          session,
        );

        if (isThisPartial && remainingRooms.length > 0) {
          await CheckIn.updateOne(
            { _id: checkInId },
            {
              $set: {
                selectedRooms: remainingRooms,
                status: "checkIn",
                isPartiallyCheckedOut: true,
              },
              $push: {
                partialCheckoutHistory: {
                  date: new Date(),
                  roomsCheckedOut: roomsBeingCheckedOut.map((room) => ({
                    roomId: room._id,
                    roomName: room.roomName,
                  })),
                  saleVoucherNumber: saleNumber?.voucherNumber,
                },
              },
            },
            { session },
          );

          await updateStatus(roomsBeingCheckedOut, "dirty", session);
        } else {
          if (checkoutMode === "single") {
            await CheckIn.updateMany(
              { _id: { $in: checkinIds } },
              { $set: { status: "checkOut", checkOutDate: new Date() } },
              { session },
            );
          } else {
            await CheckIn.updateOne(
              { _id: checkInId },
              { status: "checkOut", checkOutDate: new Date() },
              { session },
            );
          }

          await updateStatus(roomsBeingCheckedOut, "dirty", session);
        }

        results.push({
          saleNumber,
          salesRecord: savedVoucherData[0],
          tallyId: tallyRows?.[0]?._id,
          checkInId,
          checkOutId: createdDoc._id,
          isPartial: isThisPartial,
          paymentMode,
          itemTotal,
          paidAmount,
          pendingAmount,
          applicableSplitsCount: applicableSplits.length,
        });
      }

      // single settlement after loop
      if (paymentMode === "single" && !isPostToRoom) {
        const cashAmt = Number(paymentDetails?.cashAmount || 0);
        const onlineAmt = Number(paymentDetails?.onlineAmount || 0);
        const totalPaidAmount = cashAmt + onlineAmt;

        if (totalPaidAmount > 0) {
          let primarySource;
          let sourceType;

          if (cashAmt > 0 && onlineAmt > 0) {
            primarySource = await Party.findOne({
              _id: paymentDetails?.selectedCash,
            }).session(session);
            sourceType = "mixed";
          } else if (cashAmt > 0) {
            primarySource = await Party.findOne({
              _id: paymentDetails?.selectedCash,
            }).session(session);
            sourceType = "cash";
          } else {
            primarySource = await Party.findOne({
              _id: paymentDetails?.selectedBank,
            }).session(session);
            sourceType = "bank";
          }

          await saveSettlement(
            paymentDetails,
            selectedCheckOut[0]?.customerId?._id ||
              selectedCheckOut[0]?.customerId,
            primarySource,
            cmp_id,
            results[0]?.salesRecord,
            totalPaidAmount,
            sourceType,
            req,
            session,
          );
        }
      }

      // create receipts after all sales
      if (paymentMode === "split") {
        const totalPaidAmount = splitDetails.reduce(
          (sum, splitItem) => sum + Number(splitItem.amount || 0),
          0,
        );

        const creditItems =
          paymentDetails?.splitDetails?.filter(
            (item) => item.source === "credit",
          ) || [];

        console.log("creditItems", creditItems);

        for (const item of creditItems) {
          const partyid = item?.customer;
          const partyData = await getSelectedParty(partyid, cmp_id, session);
          const party = mapPartyData(partyData);

          await TallyData.create(
            [
              {
                Primary_user_id: req.pUserId || req.owner,
                cmp_id,
                party_id: party?._id,
                party_name: party?.partyName,
                mobile_no: party?.mobileNumber,
                bill_date: new Date(),
                bill_no: salesarray[0]?.salesNumber,
                billId: salesarray[0]?._id,
                bill_amount: item?.amount,
                bill_pending_amt: item?.amount,
                accountGroup: party?.accountGroup_id.toString(),
                user_id: req.sUserId,
                advanceAmount: 0,
                advanceDate: new Date(),
                classification: "Dr",
                source: "sales",
              },
            ],
            { session },
          );
        }

        // if (totalPaidAmount > 0) {
        //   await createReceiptForSales(
        //     cmp_id,
        //     paymentDetails,
        //     "mixed",
        //     selectedCheckOut[0]?.customerId?.partyName || "Customer",
        //     totalPaidAmount,
        //     selectedCheckOut[0]?.customerId?._id ||
        //       selectedCheckOut[0]?.customerId,
        //     results[0]?.salesRecord,
        //     results[0]?.tallyId,
        //     req,
        //     restaurantBaseSaleData,
        //     session,
        //   );
        // }
      } else if (paymentMode === "single") {
        const totalPaidAmount =
          Number(paymentDetails?.cashAmount || 0) +
          Number(paymentDetails?.onlineAmount || 0);

        if (!isPostToRoom && totalPaidAmount > 0) {
          const cashAmt = Number(paymentDetails?.cashAmount || 0);
          const onlineAmt = Number(paymentDetails?.onlineAmount || 0);

          const finalPaymentMethod =
            cashAmt > 0 && onlineAmt > 0
              ? "mixed"
              : cashAmt > 0
                ? "cash"
                : "bank";

          const agId = results[0]?.salesRecord?.party?.accountGroup_id;

          console.log("paymentDetailsvvvvv", paymentDetails);

          await createReceiptForSales(
            cmp_id,
            paymentDetails,
            finalPaymentMethod,
            selectedCheckOut[0]?.customerId?.partyName || "Customer",
            totalPaidAmount,
            selectedCheckOut[0]?.customerId?._id ||
              selectedCheckOut[0]?.customerId,
            results[0]?.salesRecord,
            agId,
            req,
            restaurantBaseSaleData,
            session,
          );
        }
      }

      return;

      multiCheckoutResults = results;
    });

    // ---------------------------------------------
    // Populate after transaction completes
    // ---------------------------------------------
    if (createdCheckoutIds.length > 0) {
      checkOutAfterSave = await CheckOut.find({
        _id: { $in: createdCheckoutIds },
      })
        .populate("customerId")
        .populate("guestId")
        .populate("agentId")
        .populate("isHotelAgent")
        .populate("selectedRooms.selectedPriceLevel")
        .populate("bookingId")
        .populate("checkInId")
        .lean();
    }

    res.status(200).json({
      success: true,
      message: isAnyPartial
        ? "Partial checkout(s) completed. Remaining rooms stay checked-in."
        : "Checkout(s) converted to Sales successfully",
      data: {
        results: multiCheckoutResults,
        checkOutAfterSave,
      },
    });
  } catch (error) {
    console.error("Error converting checkout:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  } finally {
    await session.endSession();
  }
};

async function createPaymentSplittingArray(
  paymentDetails,
  cashAmt,
  onlineAmt,
  applicableSplits = [],
  restaurantTotal,
  restaurantBaseSaleData,
  session,
) {
  const arr = [];
  const paymentMode = paymentDetails?.paymentMode;
  const restaurantSplitArray = [];
  console.log("applicableSplits", applicableSplits);
  // Helper to safely extract ObjectId from customer
  const getCustomerId = (customer) => customer?._id ?? customer ?? undefined;

  if (paymentMode === "split" && applicableSplits.length > 0) {
    for (const split of applicableSplits) {
      const splitObj = {
        type:
          split.sourceType === "cash"
            ? "cash"
            : split?.sourceType == "credit"
              ? "credit"
              : "bank",
        amount: Number(split.amount || 0),
        ref_id: split.source,
        customer: getCustomerId(split.customer),
        customerName: split.customerName,
        remarks: split.remarks ?? null,
        source: split.source,
        sourceType: split.sourceType,
        subsource: split.subsource,
        transactionNo: split.transactionNo,
        underCategory: split.underCategory,
        upiNo: split.upiNo,
      };

      if (split.underCategory === "room") {
        arr.push(splitObj);
      } else {
        restaurantSplitArray.push(splitObj);
      }
    }
  } else if (paymentMode === "credit") {
    // FIX: use paymentDetails.cashAmount (total) to derive hotel amount
    // cashAmt here = 0 (set by credit branch in loop), so we read directly
    const totalCreditAmount = Number(paymentDetails?.cashAmount || 0);
    const hotelCreditAmt = totalCreditAmount - restaurantTotal; // 16392 - 438 = 15954

    arr.push({
      type: "credit",
      amount: hotelCreditAmt,
      ref_id: paymentDetails?.selectedCreditor?._id,
      reference_name: paymentDetails?.selectedCreditor?.partyName,
      customer: paymentDetails?.selectedCreditor?._id,
      customerName: paymentDetails?.selectedCreditor?.partyName,
      remarks: paymentDetails?.remarks ?? null,
      source: paymentDetails?.selectedCreditor?._id,
      sourceType: "credit",
      subsource: paymentDetails?.selectedCreditor?.partyName,
    });

    restaurantSplitArray.push({
      type: "credit",
      amount: restaurantTotal, // 438
      ref_id: paymentDetails?.selectedCreditor?._id,
      reference_name: paymentDetails?.selectedCreditor?.partyName,
      customer: paymentDetails?.selectedCreditor?._id,
      customerName: paymentDetails?.selectedCreditor?.partyName,
      remarks: paymentDetails?.remarks ?? null,
      source: paymentDetails?.selectedCreditor?._id,
      sourceType: "credit",
      subsource: paymentDetails?.selectedCreditor?.partyName,
    });
  } else {
    const split = paymentDetails.splitDetails[0];

    if (cashAmt > 0) {
      const hotelCashAmt = Math.max(0, cashAmt - restaurantTotal);
      const restaurantCashAmt = Math.min(cashAmt, restaurantTotal);

      if (hotelCashAmt > 0) {
        arr.push({
          type: "cash",
          amount: parseFloat(hotelCashAmt.toFixed(2)),
          ref_id: paymentDetails?.selectedCash,
          customer: getCustomerId(split.customer),
          customerName: split.customerName,
          remarks: split.remarks ?? null,
          source: split.source,
          sourceType: split.sourceType,
          subsource: split.subsource,
          transactionNo: split.transactionNo,
          underCategory: split.underCategory,
          upiNo: split.upiNo,
        });
      }

      if (restaurantCashAmt > 0) {
        restaurantSplitArray.push({
          type: "cash",
          amount: parseFloat(restaurantCashAmt.toFixed(2)),
          ref_id: paymentDetails?.selectedCash,
          customer: getCustomerId(split.customer),
          customerName: split.customerName,
          remarks: split.remarks ?? null,
          source: split.source,
          sourceType: split.sourceType,
          subsource: split.subsource,
          transactionNo: split.transactionNo,
          underCategory: split.underCategory,
          upiNo: split.upiNo,
        });
      }
    }

    if (onlineAmt > 0) {
      const restaurantAlreadyCovered = Math.min(cashAmt, restaurantTotal);
      const restaurantOnlineAmt = parseFloat(
        Math.min(
          onlineAmt,
          Math.max(0, restaurantTotal - restaurantAlreadyCovered),
        ).toFixed(2),
      );
      const hotelOnlineAmt = parseFloat(
        (onlineAmt - restaurantOnlineAmt).toFixed(2),
      );

      if (hotelOnlineAmt > 0) {
        arr.push({
          type: "bank",
          amount: hotelOnlineAmt,
          ref_id: paymentDetails?.selectedBank,
          customer: getCustomerId(split.customer),
          customerName: split.customerName,
          remarks: split.remarks ?? null,
          source: split.source,
          sourceType: split.sourceType,
          subsource: split.subsource,
          transactionNo: split.transactionNo,
          underCategory: split.underCategory,
          upiNo: split.upiNo,
        });
      }

      if (restaurantOnlineAmt > 0) {
        restaurantSplitArray.push({
          type: "bank",
          amount: restaurantOnlineAmt,
          ref_id: paymentDetails?.selectedBank,
          customer: getCustomerId(split.customer),
          customerName: split.customerName,
          remarks: split.remarks ?? null,
          source: split.source,
          sourceType: split.sourceType,
          subsource: split.subsource,
          transactionNo: split.transactionNo,
          underCategory: split.underCategory,
          upiNo: split.upiNo,
        });
      }
    }
  }

  // Handle restaurant sale payment splitting
  if (restaurantBaseSaleData.length > 0 && restaurantTotal > 0) {
    let splitsToDistribute = [];

    if (paymentMode === "split" && restaurantSplitArray.length > 0) {
      splitsToDistribute = restaurantSplitArray.map((s) => ({ ...s }));
    } else if (paymentMode === "credit") {
      // FIX: No splitDetails[0] in credit mode — read from selectedCreditor directly
      splitsToDistribute.push({
        type: "credit",
        amount: restaurantTotal,
        ref_id: paymentDetails?.selectedCreditor?._id,
        reference_name: paymentDetails?.selectedCreditor?.partyName,
        customer: paymentDetails?.selectedCreditor?._id,
        customerName: paymentDetails?.selectedCreditor?.partyName,
        remarks: paymentDetails?.remarks ?? null,
        source: paymentDetails?.selectedCreditor?._id,
        sourceType: "credit",
        subsource: paymentDetails?.selectedCreditor?.partyName,
        transactionNo: "",
        underCategory: "food",
        upiNo: "",
      });
    } else {
      splitsToDistribute = restaurantSplitArray.map((s) => ({ ...s }));
    }

    if (restaurantBaseSaleData.length === 1) {
      await salesModel.findOneAndUpdate(
        { _id: restaurantBaseSaleData[0]._id },
        { $set: { paymentSplittingData: splitsToDistribute } },
        { session, new: true },
      );
    } else {
      // Multiple sales — greedy distribution
      const updatePromises = [];
      let remainingSplits = splitsToDistribute;

      for (const item of restaurantBaseSaleData) {
        let remaining = item.finalAmount;
        const itemSplits = [];

        for (const split of remainingSplits) {
          if (remaining <= 0) break;

          if (split.amount <= remaining) {
            itemSplits.push({ ...split });
            remaining = parseFloat((remaining - split.amount).toFixed(2));
            split.amount = 0;
          } else {
            itemSplits.push({ ...split, amount: remaining });
            split.amount = parseFloat((split.amount - remaining).toFixed(2));
            remaining = 0;
          }
        }

        remainingSplits = remainingSplits.filter((s) => s.amount > 0);

        updatePromises.push(
          salesModel.findOneAndUpdate(
            { _id: item._id },
            { $set: { paymentSplittingData: itemSplits } },
            { session, new: true },
          ),
        );
      }

      await Promise.all(updatePromises);
    }
  }

  return { arr, restaurantSplitArray };
}

function mapPartyData(selectedParty) {
  return {
    _id: selectedParty._id,
    partyName: selectedParty.partyName,
    accountGroup_id: selectedParty.accountGroup?._id,
    accountGroupName: selectedParty.accountGroup?.accountGroup,
    subGroup_id: selectedParty.subGroup_id || null,
    subGroupName: selectedParty.subGroupName || null,
    mobileNumber: selectedParty.mobileNumber || null,
    country: selectedParty.country || null,
    state: selectedParty.state || null,
    pin: selectedParty.pin || null,
    emailID: selectedParty.emailID || null,
    gstNo: selectedParty.gstNo || null,
    party_master_id: selectedParty.party_master_id || null,
    billingAddress: selectedParty.billingAddress || null,
    shippingAddress: selectedParty.shippingAddress || null,
    accountGroup: selectedParty.accountGroup?.toString() || null,
    totalOutstanding: selectedParty.totalOutstanding || 0,
    latestBillDate: selectedParty.latestBillDate || null,
    newAddress: selectedParty.newAddress || {},
  };
}

async function createSalesVoucher(
  cmp_id,
  specificVoucherSeries,
  saleNumber,
  req,
  selectedCheckOut,
  party,
  selectedParty,
  paymentSplittingArray,
  session,
  checkInId = null,
  checkOutId = null,
  amount = 0,
  otherCharges,
  totalOtherChargeAmount,
  isPostToRoom = false,
) {
  const AlreadyExistingItems = selectedCheckOut.flatMap(
    (item) => item.selectedRooms,
  );

  console.log("isPostToRoomffffffffff", otherCharges);
  let items = [];

  AlreadyExistingItems.forEach((room) => {
    const newObject = {
      product_name: room.roomName,
      product_code: room.roomName,

      cmp_id: room.cmp_id,
      Primary_user_id: room.primary_user_id,

      brand: room.roomType?._id || null,
      category: null,
      sub_category: null,

      unit: "Nos",

      // 🔥 REQUIRED FOR SUMMARY
      item_mrp: Number(room.priceLevelRate) || 0,
      rate: Number(room.priceLevelRate) || 0,

      // 🔥 AMOUNTS
      taxableAmount: Number(room.amountWithOutTax) || 0,
      total: Number(room.amountWithOutTax) || 0,
      netAmount: Number(room.amountAfterTax) || 0,

      totalCgstAmt: Number(room.totalCgstAmt) || 0,
      totalSgstAmt: Number(room.totalSgstAmt) || 0,
      totalIgstAmt: Number(room.totalIgstAmt) || 0,

      // 🔥 SERVICE FLAG
      GodownList: [],
      batchEnabled: false,
      gdnEnabled: false,

      quantity: room.stayDays,

      hsn_code: room?.hsnDetails?.hsn,
      cgst: Number(room?.taxPercentage) / 2 || 0,
      sgst: Number(room?.taxPercentage) / 2 || 0,
      igst: room?.taxPercentage || 0,

      Priceleveles: room?.priceLevel || [],
      product_master_id: null,
    };

    items.push(newObject);
  });

  // const amount = selectedCheckOut.reduce((total, item) => {
  //   const itemTotal = item.selectedRooms.reduce(
  //     (acc, room) => acc + room.amountAfterTax,
  //     0
  //   );
  //   return total + itemTotal;
  // }, 0);

  let convertedFrom = selectedCheckOut.map((item) => {
    return {
      voucherNumber: item.voucherNumber,
      checkInNumber: item.voucherNumber,
    };
  });

  return await salesModel.create(
    [
      {
        date: new Date(),
        selectedDate: new Date().toLocaleDateString(),
        voucherType: "sales",
        serialNumber: saleNumber.usedSeriesNumber,
        userLevelSerialNumber: saleNumber.usedSeriesNumber,
        salesNumber: saleNumber.voucherNumber,
        series_id: specificVoucherSeries._id.toString(),
        usedSeriesNumber: saleNumber.usedSeriesNumber,
        Primary_user_id: req.pUserId || req.owner,
        cmp_id,
        secondary_user_id: req.sUserId,
        party,
        partyAccount: selectedParty.accountGroup?.accountGroup,
        items,
        address: selectedParty.billingAddress,
        finalAmount: Math.abs(amount - totalOtherChargeAmount),
        subTotal: amount,
        paymentSplittingData: paymentSplittingArray,
        convertedFrom,
        checkInId: checkInId,
        checkOutId: checkOutId,
        additionalCharges: otherCharges,
        totalAdditionalCharges: -totalOtherChargeAmount,
        totalWithAdditionalCharges: Math.abs(amount - totalOtherChargeAmount),
        totalPaymentSplits: Math.abs(amount - totalOtherChargeAmount),
      },
    ],
    { session },
  );
}

async function createTallyEntry(
  cmp_id,
  req,
  selectedParty,
  selectedCheckOut,
  savedVoucher,
  amount,
  session,
  paymentMode,
  from = "other",
) {
  console.log("frommmmmm", from);
  const selectedOne = await Party.findOne({ _id: selectedParty }).session(
    session,
  );

  return await TallyData.create(
    [
      {
        Primary_user_id: req.pUserId || req.owner,
        cmp_id,
        party_id: selectedOne?._id,
        party_name: selectedOne?.partyName,
        mobile_no: selectedOne?.mobileNumber,
        bill_date: new Date(),
        bill_no: savedVoucher?.salesNumber,
        billId: savedVoucher?._id,
        bill_amount: amount, // CHANGED: Total sale amount
        bill_pending_amt: paymentMode === "split" ? 0 : amount, // CHANGED: Actual outstanding amount
        accountGroup: selectedOne?.accountGroup.toString(),
        user_id: req.sUserId,
        advanceAmount: 0,
        advanceDate: new Date(),
        classification: "Dr",
        source: "sales",
        ...(from === "checkout" ? { cantChange: true } : {}),
      },
    ],
    { session },
  );
}

async function saveSettlement(
  paymentDetails,
  selectedParty,
  selectedCashOrBank,
  cmp_id,
  savedVoucher,
  paidAmount,
  paymentMethod,
  req,
  session,
) {
  const selectedOne = await Party.findOne({ _id: selectedParty });
  await saveSettlementDataHotel(
    selectedOne,
    cmp_id,
    paymentMethod,
    "sales",
    savedVoucher?.salesNumber,
    savedVoucher?._id,
    paidAmount,
    new Date(),
    selectedOne?.partyName,
    selectedCashOrBank,
    "Sales",
    req,
    session,
  );
}

async function getSelectedParty(selected, cmp_id, session) {
  const selectedParty = await Party.findOne({ cmp_id, _id: selected })
    .populate("accountGroup")
    .session(session);
  if (!selectedParty) throw new Error(`Party not found`);

  return selectedParty;
}

export const updateConfigurationForHotelAndRestaurant = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const data = req.body;
    console.log("dataaaaaaaaaaa", data);
    let updateData = {};

    // Handle different types of updates
    if (data.fieldType === "defaultPrint") {
      // Handle defaultPrint checkbox group updates
      if (data.field === "print1") {
        updateData = {
          $set: {
            [`configurations.0.defaultPrint.${data.field}`]: data.checked,
            [`configurations.0.defaultPrint.print2`]: false,
          },
        };
      } else {
        updateData = {
          $set: {
            [`configurations.0.defaultPrint.${data.field}`]: data.checked,
            [`configurations.0.defaultPrint.print1`]: false,
          },
        };
      }
      if (data.field === "restaurantPrint1") {
        console.log("xxxxxxxxxxxx3");
        updateData = {
          $set: {
            [`configurations.0.defaultPrint.${data.field}`]: data.checked,
            [`configurations.0.defaultPrint.restaurantPrint2`]: false,
          },
        };
      } else if (data.field === "restaurantPrint2") {
        console.log("xxxxxxxxxxxx4");
        updateData = {
          $set: {
            [`configurations.0.defaultPrint.${data.field}`]: data.checked,
            [`configurations.0.defaultPrint.restaurantPrint1`]: false,
          },
        };
      }
    } else if (data.fieldType === "addRateWithTax") {
      // Handle existing addRateWithTax toggle updates
      updateData = {
        $set: {
          [`configurations.0.addRateWithTax.${data.title || data.field}`]:
            data.checked,
        },
      };
    } else if (data.title === "complementaryWithTax") {
      // Handle existing addRateWithTax toggle updates
      updateData = {
        $set: {
          [`configurations.0.complementaryWithTax`]: data.checked,
        },
      };
    } else if (data.title === "foodPlaWithRoomRate") {
      console.log("foodPlaWithRoomRate");
      // Handle existing addRateWithTax toggle updates
      updateData = {
        $set: {
          [`configurations.0.foodPlaWithRoomRate`]: data.checked,
        },
      };
    } else if (data.title === "additionalPaxWithRoomRate") {
      console.log("aditionalPaxWithRoomRate");
      // Handle existing addRateWithTax toggle updates
      updateData = {
        $set: {
          [`configurations.0.additionalPaxWithRoomRate`]: data.checked,
        },
      };
    } else if (data.fieldType === "orderTypes") {
      updateData = {
        $set: {
          [`configurations.0.orderTypes.${data.field}`]: data.checked,
        },
      };
    } else if (data.fieldType === "saveSaleBasedOn") {
      if (data.field === "agent") {
        updateData = {
          $set: {
            [`configurations.0.saveSaleBasedOn.agent`]: data.checked,
            [`configurations.0.saveSaleBasedOn.guest`]: false,
          },
        };
      } else if (data.field === "guest") {
        updateData = {
          $set: {
            [`configurations.0.saveSaleBasedOn.guest`]: data.checked,
            [`configurations.0.saveSaleBasedOn.agent`]: false,
          },
        };
      }
    } else if (data.title == "restaurantPrint") {
      updateData = {
        $set: {
          [`configurations.0.defaultPrint.showBeforeSaleInRestaurant`]:
            data.checked,
        },
      };
    } else if (data.title == "showPrintWithTaxInRestaurant") {
      updateData = {
        $set: {
          [`configurations.0.defaultPrint.showPrintWithTaxInRestaurant`]:
            data.checked,
        },
      };
    } else if (data.title == "discountBasedOnGrossAmount") {
      updateData = {
        $set: {
          [`configurations.0.discountBasedOnGrossAmount`]: data.checked,
        },
      };
    } else if (data.title == "discountBasedOnGrossAmountInHotel") {
      updateData = {
        $set: {
          [`configurations.0.discountBasedOnGrossAmountInHotel`]: data.checked,
        },
      };
    } else if (data.title) {
      // Fallback for backward compatibility with old toggle structure
      updateData = {
        $set: {
          [`configurations.0.addRateWithTax.${data.title}`]: data.checked,
        },
      };
    } else {
      return res.status(400).json({ message: "Invalid data structure" });
    }

    console.log("updateData", updateData);

    const updatedDoc = await Organization.findOneAndUpdate(
      { _id: cmp_id },
      updateData,
      { new: true },
    );

    if (!updatedDoc) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.status(200).json({
      message: "Configuration updated",
      success: true,
      organization: updatedDoc,
    });
  } catch (error) {
    console.error("Error updating configuration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// controllers/checkInController.js
// adjust path as needed

export const checkedInGuest = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    const activeCheckIns = await CheckIn.find({
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      status: { $nin: ["checkOut", "cancelled"] },
    })
      .populate("customerId", "customerName mobileNumber email") // if referenced
      .populate("selectedRooms.roomId", "roomName roomType roomFloor bedType")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Active check-ins fetched successfully",
      guests: activeCheckIns,
      count: activeCheckIns.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active check-ins",
      error: error.message,
    });
  }
};

export const swapRoom = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { checkInId } = req.params;
    const {
      newRoomId,
      oldRoomId,
      oldSelectedRoomId,
      selectedDate,
      formData = {},
    } = req.body;

    if (!checkInId || !newRoomId || !oldRoomId) {
      return res.status(400).json({
        success: false,
        message: "checkInId, newRoomId and oldRoomId are required",
      });
    }

    const checkIn = await CheckIn.findById(checkInId).session(session);

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: "CheckIn record not found",
      });
    }

    const oldSelectedRoomIndex = oldSelectedRoomId
      ? checkIn.selectedRooms.findIndex(
          (room) => String(room?._id || "") === String(oldSelectedRoomId),
        )
      : checkIn.selectedRooms.findIndex((room) => {
          const roomId =
            room?.roomId?._id?.toString?.() || room?.roomId?.toString?.();
          return roomId === oldRoomId.toString();
        });

    if (oldSelectedRoomIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Old room not found in selected rooms",
      });
    }

    const oldSelectedRoomMasterId = String(
      checkIn.selectedRooms[oldSelectedRoomIndex]?.roomId?._id ||
        checkIn.selectedRooms[oldSelectedRoomIndex]?.roomId ||
        "",
    );
    if (oldSelectedRoomId && oldSelectedRoomMasterId !== String(oldRoomId)) {
      return res.status(400).json({
        success: false,
        message: "Selected room does not match the old room",
      });
    }

    const [oldRoom, newRoom] = await Promise.all([
      roomModal.findById(oldRoomId).session(session),
      roomModal.findById(newRoomId).session(session),
    ]);

    if (!oldRoom) {
      return res.status(404).json({
        success: false,
        message: "Old room not found",
      });
    }

    if (!newRoom) {
      return res.status(404).json({
        success: false,
        message: "New room not found",
      });
    }

    if (!["vacant", "available"].includes(newRoom.status)) {
      return res.status(400).json({
        success: false,
        message: "New room is not available for swap",
      });
    }

    const selectedRoomToAdd = Array.isArray(formData.selectedRooms)
      ? formData.selectedRooms[0]
      : null;

    if (!selectedRoomToAdd) {
      return res.status(400).json({
        success: false,
        message: "formData.selectedRooms[0] is required",
      });
    }

    const newAdditionalPax = Array.isArray(formData.additionalPaxDetails)
      ? formData.additionalPaxDetails
      : [];

    const newFoodPlan = Array.isArray(formData.foodPlan)
      ? formData.foodPlan
      : [];

    const roomAmount = Number(selectedRoomToAdd?.amountAfterTax || 0);
    const paxAmount = newAdditionalPax.reduce(
      (sum, item) => sum + Number(item?.rate || 0),
      0,
    );
    const foodPlanAmount = newFoodPlan.reduce(
      (sum, item) => sum + Number(item?.rate || 0),
      0,
    );

    await roomModal.findByIdAndUpdate(
      oldRoomId,
      {
        $set: {
          status: "dirty",
          isSwapped: true,
        },
      },
      { new: true, session },
    );

    await roomModal.findByIdAndUpdate(
      newRoomId,
      {
        $set: {
          status: "occupied",
        },
      },
      { new: true, session },
    );

    const oldSelectedRoom = checkIn.selectedRooms[oldSelectedRoomIndex];

    oldSelectedRoom.isSwapped = true;
    oldSelectedRoom.swappingDateFrom = selectedDate;
    let updatedRoom = {
      ...oldSelectedRoom,
      isSwapped: true,
      swappingDateFrom: selectedDate,
    };

    oldSelectedRoom.stayDays = await calculateStayDays(checkIn, updatedRoom);

    if (oldSelectedRoom.hasOwnProperty("roomName")) {
      oldSelectedRoom.roomName = oldRoom.roomName;
    }

    if (oldSelectedRoom.hasOwnProperty("roomNumber")) {
      oldSelectedRoom.roomNumber = oldRoom.roomNumber || oldRoom.roomName;
    }

    const newSelectedRoom = {
      ...selectedRoomToAdd,
      _id: new mongoose.Types.ObjectId(),
      swappingDateFrom: selectedDate,
      isSwapped: false,
    };
    newSelectedRoom.stayDays = await calculateStayDays(
      checkIn,
      newSelectedRoom,
    );

    checkIn.selectedRooms.push(newSelectedRoom);

    if (!Array.isArray(checkIn.additionalPaxDetails)) {
      checkIn.additionalPaxDetails = [];
    }

    if (!Array.isArray(checkIn.foodPlan)) {
      checkIn.foodPlan = [];
    }

    if (!Array.isArray(checkIn.roomSwapHistory)) {
      checkIn.roomSwapHistory = [];
    }

    if (newAdditionalPax.length > 0) {
      checkIn.additionalPaxDetails.push(...newAdditionalPax);
    }

    if (newFoodPlan.length > 0) {
      checkIn.foodPlan.push(...newFoodPlan);
    }

    checkIn.roomSwapHistory.push({
      fromSelectedRoomId: oldSelectedRoom._id,
      toSelectedRoomId: newSelectedRoom._id,
      fromRoomId: oldRoomId,
      toRoomId: newRoomId,
      swapDate: selectedDate,
      reason: "Guest requested room change",
    });

    checkIn.roomTotal = Number(checkIn.roomTotal || 0) + roomAmount;
    checkIn.paxTotal = Number(checkIn.paxTotal || 0) + paxAmount;
    checkIn.foodPlanTotal = Number(checkIn.foodPlanTotal || 0) + foodPlanAmount;

    checkIn.totalAmount =
      Number(checkIn.roomTotal || 0) +
      Number(checkIn.paxTotal || 0) +
      Number(checkIn.foodPlanTotal || 0);

    checkIn.grandTotal = checkIn.totalAmount;

    const paidAmount =
      Number(checkIn.advanceAmount || 0) +
      Number(checkIn.paymenttypeDetails?.cash || 0) +
      Number(checkIn.paymenttypeDetails?.bank || 0) +
      Number(checkIn.paymenttypeDetails?.upi || 0) +
      Number(checkIn.paymenttypeDetails?.credit || 0) +
      Number(checkIn.paymenttypeDetails?.card || 0);

    checkIn.balanceToPay = Number(checkIn.grandTotal || 0) - paidAmount;

    checkIn.markModified("selectedRooms");
    checkIn.markModified("additionalPaxDetails");
    checkIn.markModified("foodPlan");
    checkIn.markModified("roomSwapHistory");
    checkIn.markModified("paymenttypeDetails");

    await checkIn.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: `Room successfully swapped from ${oldRoom.roomName} to ${newRoom.roomName}`,
      swapDetails: {
        checkInId: checkIn._id,
        customerName: checkIn.customerName,
        fromRoom: {
          id: oldRoomId,
          name: oldRoom.roomName,
        },
        toRoom: {
          id: newRoomId,
          name: newRoom.roomName,
        },
        selectedDate,
        swapDate: new Date(),
        addedAmounts: {
          roomAmount,
          paxAmount,
          foodPlanAmount,
          totalAdded: roomAmount + paxAmount + foodPlanAmount,
        },
        totals: {
          roomTotal: checkIn.roomTotal,
          paxTotal: checkIn.paxTotal,
          foodPlanTotal: checkIn.foodPlanTotal,
          totalAmount: checkIn.totalAmount,
          grandTotal: checkIn.grandTotal,
          balanceToPay: checkIn.balanceToPay,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in swapRoom:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to swap room",
    });
  } finally {
    session.endSession();
  }
};
export const getRoomSwapHistory = async (req, res) => {
  try {
    const { checkInId } = req.params;

    const checkIn = await CheckIn.findById(checkInId)
      .populate("roomSwapHistory.fromRoomId", "roomName")
      .populate("roomSwapHistory.toRoomId", "roomName")
      .populate("customerId", "customerName");

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: "Check-in record not found",
      });
    }

    res.status(200).json({
      success: true,
      swapHistory: checkIn.roomSwapHistory || [],
      customerName: checkIn.customerId?.customerName || checkIn.customerName,
    });
  } catch (error) {
    console.error("Error fetching room swap history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room swap history",
      error: error.message,
    });
  }
};

export const getHotelSalesDetails = async (req, res) => {
  try {
    const { cmp_id, type } = req.params;
    const { startDate, endDate, owner, businessType = "all" } = req.query;

    // Validate required parameters
    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID (cmp_id) is required",
      });
    }

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    // Validate ObjectId format for owner
    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Owner ID format",
      });
    }

    // Parse dates or use today
    const today = new Date();
    const parsedStartDate = startDate ? new Date(startDate) : today;
    const parsedEndDate = endDate ? new Date(endDate) : today;

    // Set time boundaries
    parsedStartDate.setHours(0, 0, 0, 0);
    parsedEndDate.setHours(23, 59, 59, 999);

    // Build query filters
    let query = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      voucherType: "sales",
      date: {
        $gte: parsedStartDate,
        $lte: parsedEndDate,
      },
      $or: [
        { isCancelled: { $exists: false } },
        { isCancelled: false },
        { isCancelled: null },
      ],
    };
    if (type !== "all") {
      query.checkOutId =
        type === "hotel" || type === "all"
          ? { $exists: true }
          : { $exists: false };
    }

    const AllSalesData = await salesModel.aggregate([
      // 1️⃣ Match
      { $match: query },

      // 2️⃣ Checkout lookup (specific fields)
      {
        $lookup: {
          from: "checkouts",
          let: { checkoutId: "$checkOutId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$checkoutId"] },
              },
            },
            {
              $project: {
                _id: 1,
                voucherNumber: 1,
                agentId: 1,
                guestName: 1,
              },
            },
          ],
          as: "checkOut",
        },
      },
      {
        $unwind: {
          path: "$checkOut",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Checkin lookup to get roomName
      {
        $lookup: {
          from: "checkins",
          let: {
            checkInNum: { $arrayElemAt: ["$convertedFrom.checkInNumber", 0] },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$voucherNumber", "$$checkInNum"] },
              },
            },
            {
              $project: {
                voucherNumber: 1,
                guestName: 1,
                "selectedRooms.roomName": 1,
              },
            },
          ],
          as: "checkInData",
        },
      },
      {
        $unwind: {
          path: "$checkInData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 3️⃣ KOT lookup (convertedFrom.id → ObjectId)
      {
        $lookup: {
          from: "kots",
          let: { kotIds: "$convertedFrom.id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    "$_id",
                    {
                      $map: {
                        input: "$$kotIds",
                        as: "id",
                        in: { $toObjectId: "$$id" },
                      },
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                voucherNumber: 1,
                type: 1,
                total: 1,
                createdAt: 1,
              },
            },
          ],
          as: "kotData",
        },
      },
      {
        $unwind: {
          path: "$kotData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 4️⃣ Add createdHour + mealPeriod
      {
        $addFields: {
          createdHour: {
            $hour: {
              date: "$createdAt",
              timezone: "+05:30",
            },
          },

          mealPeriod: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      {
                        $gte: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          5,
                        ],
                      },
                      {
                        $lt: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          11,
                        ],
                      },
                    ],
                  },
                  then: "Breakfast",
                },
                {
                  case: {
                    $and: [
                      {
                        $gte: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          11,
                        ],
                      },
                      {
                        $lt: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          18,
                        ],
                      },
                    ],
                  },
                  then: "Lunch",
                },
                {
                  case: {
                    $and: [
                      {
                        $gte: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          18,
                        ],
                      },
                      {
                        $lt: [
                          { $hour: { date: "$createdAt", timezone: "+05:30" } },
                          23,
                        ],
                      },
                    ],
                  },
                  then: "Dinner",
                },
              ],
              default: "Late Night",
            },
          },
        },
      },
    ]);

    const salesData = [
      ...new Map(AllSalesData.map((item) => [item.salesNumber, item])).values(),
    ];

    // Transform data for frontend consumption
    const transformedData = salesData.map((sale) => {
      console.log("saleeeeeeee", sale);

      const roomName =
        sale?.items
          ?.map((item) => item.product_name)
          ?.filter(Boolean)
          ?.join(", ") || "";
      // Extract payment information
      let cashAmount = 0,
        bankAmount = 0,
        creditAmount = 0,
        upiAmount = 0,
        cardAmount = 0;

      const partyName =
        sale.party?.partyName ||
        sale.partyDetails?.partyName ||
        sale.partyAccount ||
        "Cash";
      const gusestName = sale?.checkOut?.guestName;
      console.log("gusestName", gusestName);

      const isCreditSale =
        sale.partyAccount === "Sundry Debtors" ||
        sale.partyDetails?.accountGroupName === "Sundry Debtors" ||
        sale.party?.accountGroupName === "Sundry Debtors" ||
        (partyName !== "Cash" &&
          partyName !== "Cash-in-Hand" &&
          partyName !== "CASH" &&
          sale.partyAccount !== "Cash-in-Hand" &&
          sale.partyAccount !== "CASH" &&
          sale.partyAccount !== "Bank Accounts" &&
          sale.partyAccount !== "Gpay" &&
          sale.partyAccount !== "Bank");

      let PaymentModeArray = [];
      if (
        sale.paymentSplittingData &&
        Array.isArray(sale.paymentSplittingData)
      ) {
        sale.paymentSplittingData.forEach((payment) => {
          const amount = Number(payment.amount) || 0;
          const paymentType = payment.type?.toLowerCase() || "";
          if (amount > 0) {
            switch (paymentType) {
              case "upi":
                upiAmount += amount;
                PaymentModeArray.push("UPI");
                break;
              case "bank":
                bankAmount += amount;
                PaymentModeArray.push("BANK");
                break;
              case "card":
                cardAmount += amount;
                PaymentModeArray.push("CARD");
                break;
              case "credit":
                creditAmount += amount;
                PaymentModeArray.push("CREDIT");
                break;
              default:
                cashAmount += amount;
                PaymentModeArray.push("CASH");
                break;
            }
          }
        });
      } else {
        // No payment splitting data - determine based on party account and name
        const finalAmount = Number(sale.finalAmount) || 0;

        if (isCreditSale) {
          // It's a credit sale
          creditAmount = finalAmount;
        } else if (
          sale.partyAccount === "Bank Accounts" ||
          sale.partyAccount === "Gpay" ||
          sale.partyAccount === "Bank"
        ) {
          // Bank/UPI payment
          upiAmount = finalAmount;
          bankAmount = finalAmount;
        } else {
          // Default to cash
          cashAmount = finalAmount;
        }
      }

      let mode = "Cash"; // default
      if (upiAmount > 0) {
        mode = "UPI";
        PaymentModeArray.push("UPI");
      } else if (cardAmount > 0) {
        PaymentModeArray.push("CARD");
        mode = "Card";
      } else if (creditAmount > 0) {
        PaymentModeArray.push("CREDIT");
        mode = "Credit";
      } else if (bankAmount > 0) {
        PaymentModeArray.push("BANK");
        mode = "Bank";
      } else if (cashAmount > 0) {
        PaymentModeArray.push("CASH");
        mode = "Cash";
      }

      // Get party name from either nested party object or partyDetails
      const roomNames =
        sale.checkInData?.selectedRooms
          ?.map((room) => room.roomName)
          .filter(Boolean) || [];

      const finalAmount = Number(sale.finalAmount) || 0;
      const subTotal = Number(sale.subTotal) || finalAmount;
      const totalTax = (sale.totalCgst || 0) + (sale.totalSgst || 0);
      const nearestInt = Math.round(finalAmount);
      const roundOff = Number((nearestInt - finalAmount).toFixed(2));
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      sale.items.map((item) => {
        cgst += Number(item.totalCgstAmt) || 0;
        sgst += Number(item.totalSgstAmt) || 0;
        igst += Number(item.totalIgstAmt) || 0;
      });

      console.log("disSSS", sale);

      return {
        billNo: sale.salesNumber || sale.serialNumber?.toString() || "",
        date: sale.date,
        createdAt: sale.createdAt,
        createdHour: sale.createdHour,
        mealPeriod: sale.mealPeriod,
        kotType: sale.kotType || "",
        amount: subTotal,
        disc: sale.totalAdditionalCharges || 0,
        roundOff: roundOff,
        total: subTotal,
        cgst,
        sgst,
        igst,
        totalWithTax: finalAmount,
        cash: Number(cashAmount).toFixed(2),
        credit: Number(creditAmount).toFixed(2),
        upi: Number(upiAmount).toFixed(2),
        card: Number(cardAmount).toFixed(2),
        bank: Number(bankAmount).toFixed(2),
        mode,
        creditDescription: partyName,
        partyName: partyName,
        partyAccount: sale.partyAccount || "Cash-in-Hand",
        items: sale.items || [],
        businessClassification: sale.businessClassification,
        tableNumber: sale.tableNumber || "",
        waiterName: sale.waiterName || "",
        roomNumber: roomNames.length
          ? roomNames.join(", ")
          : sale.roomNumber || "",
        roomNames,
        guestName: gusestName || "",
        itemCount: sale.items?.length || 0,
        isHotelSale: sale.isHotelSale || false,
        isRestaurantSale: sale.isRestaurantSale || false,
        isAgent: sale.checkOut?.agentId ? true : false,
        kotDetails: sale.kotData,
        kotType: sale.kotData?.type,
        isHotel: sale.checkOut ? true : false,
        PaymentModeArray: [...new Set(PaymentModeArray)],
      };
    });
    // console.log("transfored", transformedData);

    // Calculate summary totals with business type breakdown and meal period breakdown
    const summary = transformedData.reduce(
      (acc, item) => {
        acc.totalAmount += item.amount || 0;
        acc.grossTotal += Math.abs(
          Number(item.amount) - Number(item?.igst || 0),
        );
        acc.totalDiscount += item.disc || 0;
        acc.totalCgst += Number(item.cgst) || 0;
        acc.totalSgst += item.sgst || 0;
        acc.totalIgst += item.igst || 0;
        acc.totalCash += Number(item.cash || 0);
        acc.totalCredit += Number(item.credit || 0);
        acc.totalUpi += Number(item.upi || 0);
        acc.totalCard += Number(item.card || 0);
        acc.totalBank += Number(item.bank || 0);
        acc.totalFinalAmount += item.totalWithTax || 0;
        acc.totalRoundOff += item.roundOff || 0;
        acc.totalDiscount += item.disc || 0;
        acc.totalWithTax += item.disc || 0;
        acc.totalRounded += item.disc || 0;
        acc.totalCount += 1;

        acc.countWithOutAgent = item?.isAgent
          ? acc.countWithOutAgent + 0
          : item?.isHotel
            ? acc.countWithOutAgent + 1
            : acc.countWithOutAgent + 0;

        acc.agentCount += item?.isAgent ? 1 : 0;
        acc.agentTotal += item?.isAgent ? item.amount : 0;

        acc.hotelTotalAmount += item?.isHotel ? item.amount : 0;
        acc.restaurantCount += item?.isHotel ? 0 : 1;

        acc.restauratTotalAmount += item?.isHotel ? 0 : item.amount;

        if (businessType === "restaurant" || businessType === "all") {
          acc.IsTakeaway += item.kotDetails?.type === "takeaway" ? 1 : 0;
          acc.IsDelivery += item.kotDetails?.type === "delivery" ? 1 : 0;
          acc.IsRoomService += item.kotDetails?.type === "roomService" ? 1 : 0;
          acc.IsDineIn += item.kotDetails?.type === "dine-in" ? 1 : 0;
        }

        // Meal period breakdown
        const mealPeriod = item.mealPeriod || "Unknown";
        if (!acc.mealPeriodBreakdown[mealPeriod]) {
          acc.mealPeriodBreakdown[mealPeriod] = { amount: 0, count: 0 };
        }
        acc.mealPeriodBreakdown[mealPeriod].amount += item.totalWithTax || 0;
        acc.mealPeriodBreakdown[mealPeriod].count += 1;

        return acc;
      },
      {
        // General totals
        totalAmount: 0,
        hotelTotalAmount: 0,
        restauratTotalAmount: 0,
        grossTotal: 0,
        totalDiscount: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalCash: 0,
        totalCredit: 0,
        totalUpi: 0,
        totalCard: 0,
        totalBank: 0,
        totalCash: 0,
        totalFinalAmount: 0,
        totalRoundOff: 0,
        totalCount: 0,
        countWithOutAgent: 0,
        restaurantCount: 0,
        agentCount: 0,
        agentTotal: 0,
        IsTakeaway: 0,
        IsDelivery: 0,
        IsRoomService: 0,
        IsDineIn: 0,
        // Meal period breakdown
        mealPeriodBreakdown: {},

        // Business type breakdown
        hotelSales: { amount: 0, count: 0, rooms: 0 },
        restaurantSales: {
          amount: 0,
          count: 0,
          foodItems: 0,
          beverageItems: 0,
        },
        otherSales: { amount: 0, count: 0 },
      },
    );

    // Calculate analytics
    const totalSales = summary.totalFinalAmount;
    const totalTransactions = transformedData.length;

    const analytics = {
      paymentBreakdown: {
        cashPercentage:
          totalSales > 0 ? (summary.totalCash / totalSales) * 100 : 0,
        creditPercentage:
          totalSales > 0 ? (summary.totalCredit / totalSales) * 100 : 0,
        upiPercentage:
          totalSales > 0 ? (summary.totalUpi / totalSales) * 100 : 0,
        bankPercentage:
          totalSales > 0 ? (summary.totalBank / totalSales) * 100 : 0,
      },
      businessBreakdown: {
        hotel: {
          percentage:
            totalSales > 0 ? (summary.hotelSales.amount / totalSales) * 100 : 0,
          averageTicket:
            summary.hotelSales.count > 0
              ? summary.hotelSales.amount / summary.hotelSales.count
              : 0,
          transactionCount: summary.hotelSales.count,
        },
        restaurant: {
          percentage:
            totalSales > 0
              ? (summary.restaurantSales.amount / totalSales) * 100
              : 0,
          averageTicket:
            summary.restaurantSales.count > 0
              ? summary.restaurantSales.amount / summary.restaurantSales.count
              : 0,
          transactionCount: summary.restaurantSales.count,
        },
        other: {
          percentage:
            totalSales > 0 ? (summary.otherSales.amount / totalSales) * 100 : 0,
          averageTicket:
            summary.otherSales.count > 0
              ? summary.otherSales.amount / summary.otherSales.count
              : 0,
          transactionCount: summary.otherSales.count,
        },
      },
      mealPeriodBreakdown: Object.keys(summary.mealPeriodBreakdown).reduce(
        (acc, period) => {
          acc[period] = {
            amount: summary.mealPeriodBreakdown[period].amount,
            count: summary.mealPeriodBreakdown[period].count,
            percentage:
              totalSales > 0
                ? (summary.mealPeriodBreakdown[period].amount / totalSales) *
                  100
                : 0,
            averageTicket:
              summary.mealPeriodBreakdown[period].count > 0
                ? summary.mealPeriodBreakdown[period].amount /
                  summary.mealPeriodBreakdown[period].count
                : 0,
          };
          return acc;
        },
        {},
      ),
      overallMetrics: {
        averageTicketSize:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
        totalTransactions: totalTransactions,
        averageItemsPerTransaction:
          totalTransactions > 0
            ? transformedData.reduce(
                (sum, order) => sum + (order.itemCount || 0),
                0,
              ) / totalTransactions
            : 0,
      },
      serviceMetrics: {
        // Restaurant metrics
        tablesServed: [
          ...new Set(
            transformedData
              .filter((s) => s.tableNumber)
              .map((s) => s.tableNumber),
          ),
        ].length,
        waitersActive: [
          ...new Set(
            transformedData
              .filter((s) => s.waiterName)
              .map((s) => s.waiterName),
          ),
        ].length,
        // Hotel metrics
        roomsOccupied: [
          ...new Set(
            transformedData
              .filter((s) => s.roomNumber)
              .map((s) => s.roomNumber),
          ),
        ].length,
        guestsServed: [
          ...new Set(
            transformedData
              .filter((s) => s.guestName && s.guestName !== "Cash")
              .map((s) => s.guestName),
          ),
        ].length,
      },
    };

    res.json({
      success: true,
      data: {
        sales: transformedData,
        summary: summary,
        companyId: cmp_id,
        owner: owner,
        dateRange: {
          startDate: parsedStartDate.toISOString().split("T")[0],
          endDate: parsedEndDate.toISOString().split("T")[0],
        },
        totalRecords: transformedData.length,
        businessType: businessType,
        businessBreakdown: {
          hotel: summary.hotelSales.count,
          restaurant: summary.restaurantSales.count,
          other: summary.otherSales.count,
          total: totalTransactions,
        },
        serviceBreakdown: summary.serviceBreakdown,
        mealPeriodSummary: summary.mealPeriodBreakdown,
        message: `Found ${transformedData.length} ${
          businessType === "all" ? "combined" : businessType
        } sales records`,
      },
    });
  } catch (error) {
    console.error("Error fetching combined sales details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

export const getRoomCheckInDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    // Validate if roomId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Room ID format",
      });
    }

    // Find active check-in for this specific room
    const checkIn = await CheckIn.findOne({
      "selectedRooms.roomId": new mongoose.Types.ObjectId(roomId),
      status: { $nin: ["checkOut", "cancelled"] }, // Only active check-ins
    })
      .populate("customerId")
      .populate("agentId")
      .populate("selectedRooms.selectedPriceLevel")
      .populate("bookingId")
      .populate("checkInId")
      .lean();

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for this room",
      });
    }

    // Filter to only include the selected room's details
    const selectedRoom = checkIn.selectedRooms.find(
      (room) => room.roomId.toString() === roomId.toString(),
    );

    if (!selectedRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found in check-in details",
      });
    }

    // Create a filtered check-in object with only the selected room
    const filteredCheckIn = {
      ...checkIn,
      // selectedRooms: [selectedRoom], // Only the room that was clicked
    };

    return res.status(200).json({
      success: true,
      message: "Check-in details fetched successfully",
      checkIn: filteredCheckIn,
    });
  } catch (error) {
    console.error("Error fetching room check-in details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch check-in details",
      error: error.message,
    });
  }
};
export const cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;

    let responseData = null;
    let responseMessage = "";
    let record = {};
    let recordType = "";
    await session.withTransaction(async () => {
      record = await Booking.findById(id).session(session);
      recordType = "booking";

      if (!record) {
        record = await CheckIn.findById(id).session(session);
        recordType = "checkin";
      }

      if (!record) {
        throw new Error("Booking not found");
      }

      if (record.status === "cancelled") {
        throw new Error("This booking is already cancelled");
      }

      record.status = "cancelled";
      record.cancelledAt = new Date();
      record.cancelledBy = req.sUserId;
      record.cancelledByName = req.suser?.name || "";
      record.cancelReason = req.body.cancelReason;

      await record.save({ session });

      if (record.selectedRoomId) {
        await roomModal.findByIdAndUpdate(
          record.selectedRoomId,
          { $set: { status: "dirty" } },
          { new: true, session },
        );
      }

      responseData = record;
      responseMessage = `${
        recordType === "checkin" ? "Check-in" : "Booking"
      } ${record.voucherNumber} has been cancelled successfully and room marked as dirty`;
    });

    let heading =
      recordType == "checkin"
        ? "Check-in"
        : recordType == "booking"
          ? "Booking"
          : "Checkout";

    let primaryUserData = await primaryUserModel.findById(req.owner);

    if (!primaryUserData || !primaryUserData?.email) {
      res.status(200).json({
        success: true,
        message: `${heading}cancelled successfully but email not sent`,
        data: sale,
      });
    }

    await sendMail({
      to: primaryUserData?.email,
      cc: [],
      subject: `${heading} Cancelled Alert - ${record?.voucherNumber}`,
      fromName: `Cancel ${heading}`,
      text: `${heading} ${record?.voucherNumber} has been cancelled by ${req?.secUserName || primaryUserData?.userName || "System"}. Please check the attached cancelled KOT copy.`,
      html: `
                <div style="font-family: Arial, sans-serif;">
                  <h2 style="color:#b91c1c;">${heading} Cancelled Alert</h2>
                <p>${heading} <strong>${record?.voucherNumber}</strong> has been cancelled.</p>
                  <p><strong>Cancelled By:</strong> ${req?.secUserName || primaryUserData?.userName || "System"}</p>
                  <p><strong>Reason:</strong> ${req?.body?.cancelReason || "Reason not given"}</p>
        
                  <p><strong>Total:</strong> ₹ ${record?.grandTotal || 0}</p>
                  
                </div>
              `,
      data: record,
    });

    return res.status(200).json({
      success: true,
      message: responseMessage,
      data: responseData,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);

    if (error.message === "Booking not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "This booking is already cancelled") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
// report controller for FO summary
// export const getCheckoutStatementByDate = async (req, res) => {
//   try {
//     const { fromDate, toDate, cmp_id } = req.query;
//     if (!fromDate || !toDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Date parameter is required",
//       });
//     }

//     // Build match criteria
//     const matchCriteria = {
//       cmp_id,
//       checkOutDate: { $gte: fromDate, $lte:toDate },
//     };

//     // Fetch all checkouts and manually process
//     const checkouts = await CheckOut.find(matchCriteria)
//       .lean()
//       .sort({ voucherNumber: 1 });

//     //fetch all advancs with respected dates

//     // Process each checkout - expand rooms
//     const checkoutData = [];
//     checkouts.forEach((checkout) => {
//       if (checkout.selectedRooms && checkout.selectedRooms.length > 0) {
//         const Agent name= checkout.selectedRooms
//           .map((room) => room.roomName)
//           .join(",");
//         const totalRoomamount = checkout.selectedRooms.reduce(
//           (sum, room) => sum + parseFloat(room.roomTotal || 0, 0),
//         );
//         checkoutData.push({
//           billNo: checkout.voucherNumber,
//           date: checkout.checkOutDate,
//           customerName: checkout.customerName,
//           roomName: roomNames,

//           totalAmount: parseFloat(checkout.totalAmount || 0),
//           grandTotal: parseFloat(checkout.grandTotal || 0),
//           advanceAmount: parseFloat(checkout.advanceAmount || 0),
//           balanceToPay: parseFloat(checkout.balanceToPay || 0),
//           paymentMode: checkout.paymentMode || "N/A",
//           checkOutDate: checkout.checkOutDate,
//           checkOutTime: checkout.checkOutTime,
//           roomTotal: totalRoomamount,
//           // Payment details (if you have them in the schema)
//           cash: parseFloat(checkout?.paymenttypeDetails?.cash || 0),
//           card: parseFloat(checkout?.paymenttypeDetails?.card || 0),
//           upi: parseFloat(checkout?.paymenttypeDetails?.upi || 0),
//           bank: parseFloat(checkout?.paymenttypeDetails?.bank || 0),
//           credit: parseFloat(checkout?.paymenttypeDetails?.credit || 0),
//         });
//       }
//     });
//     // Calculate summary based on unique checkouts (not rows)
//     const summaryData = {
//       totalCheckoutAmount: 0,
//       totalAdvanceAmount: 0,
//       totalcheckingAdvance: 0,
//       totalbookingAdvance: 0,
//       totalBalanceToPay: 0,
//       totalreceiptsAmount: 0,
//       totalotherPayments: 0,
//       count: checkouts.length, // Count unique checkouts, not rows
//       cashTotal: 0,
//       cardTotal: 0,
//       upiTotal: 0,
//       bankTotal: 0,
//       creditTotal: 0,
//     };
//     const startDate = new Date(fromDate + "T00:00:00.000Z");
//     const endDate = new Date(toDate + "T23:59:59.999Z");
//     const advquery = {
//       cmp_id,
//       bill_date: { $gte: startDate, $lt: endDate },
//       from: { $in: ["Booking", "CheckIn"] },
//     };
//     const advances = await TallyData.find(advquery).lean();
//     //  console.log("advncesss",advances)
//     advances.forEach((item) => {
//       summaryData.totalAdvanceAmount += item.bill_amount;
//       if (item.from === "Booking") {
//         summaryData.totalbookingAdvance += item.bill_amount;
//       } else if (item.from === "CheckIn") {
//         summaryData.totalcheckingAdvance += item.bill_amount;
//       }
//     });
//     const recptquery = {
//       cmp_id,
//       date: { $gte: startDate, $lt: endDate },
//     };
//     const receipts = await receiptModel.find(recptquery).lean();

//     receipts.forEach(
//       (item) => (summaryData.totalreceiptsAmount += item.enteredAmount),
//     );
//     const paymentquery = {
//       cmp_id,
//       date: { $gte: startDate, $lt: endDate },
//     };
//     const payments = await paymentModel.find(paymentquery).lean();
//     payments.forEach(
//       (item) => (summaryData.totalotherPayments += item.enteredAmount),
//     );

//     // Sum from original checkouts to avoid double counting
//     checkouts.forEach((checkout) => {
//       const grandTotal = parseFloat(checkout.grandTotal || 0);

//       const balanceToPay = parseFloat(checkout.balanceToPay || 0);

//       summaryData.totalCheckoutAmount += grandTotal;

//       summaryData.totalBalanceToPay += balanceToPay;

//       // Group by payment mode
//       const mode = checkout.paymentMode?.toUpperCase();
//       switch (mode) {
//         case "CASH":
//           summaryData.cashTotal += grandTotal;
//           break;
//         case "CARD":
//           summaryData.cardTotal += grandTotal;
//           break;
//         case "UPI":
//           summaryData.upiTotal += grandTotal;
//           break;
//         case "BANK":
//           summaryData.bankTotal += grandTotal;
//           break;
//         case "CREDIT":
//           summaryData.creditTotal += grandTotal;
//           break;
//       }
//     });

//     res.status(200).json({
//       success: true,
//       date: fromDate + " to " + toDate,
//       checkoutBills: checkoutData, // Rows with room details
//       summary: summaryData, // Summary from unique checkouts
//       debug: {
//         uniqueCheckouts: checkouts.length,
//         totalRows: checkoutData.length,
//         difference: checkoutData.length - checkouts.length,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching checkout statement:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching checkout data",
//       error: error.message,
//     });
//   }
// };

export const getCheckoutStatementByDate = async (req, res) => {
  try {
    const { fromDate, toDate, cmp_id } = req.query;
    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "Date parameter is required",
      });
    }

    const advanceTrackingExpr = {
      $gt: [
        {
          $size: {
            $filter: {
              input: {
                $objectToArray: {
                  $ifNull: ["$advanceTracking", {}],
                },
              },
              as: "item",
              cond: {
                $and: [
                  { $gte: ["$$item.k", fromDate] },
                  { $lte: ["$$item.k", toDate] },
                ],
              },
            },
          },
        },
        0,
      ],
    };
    const advanceAmountExpr = {
      $gt: [{ $toDouble: "$totalAdvance" }, 0],
    };

    const checkouts = await CheckOut.find({
      cmp_id,
      checkOutDate: { $gte: fromDate, $lte: toDate },
    })
      .lean()
      .sort({ voucherNumber: 1 });

    const bookings = await Booking.find({
      cmp_id,
      $expr: {
        $and: [advanceTrackingExpr, advanceAmountExpr],
      },
    })
      .lean()
      .sort({ voucherNumber: 1 });

    console.log("bookings", bookings);

    const checkings = await CheckIn.find({
      cmp_id,
      $expr: {
        $and: [advanceTrackingExpr, advanceAmountExpr],
      },
    })
      .lean()
      .sort({ voucherNumber: 1 });

    const sumPaymentTypeDetails = (record) =>
      Number(record?.paymenttypeDetails?.cash || 0) +
      Number(record?.paymenttypeDetails?.bank || 0) +
      Number(record?.paymenttypeDetails?.upi || 0) +
      Number(record?.paymenttypeDetails?.credit || 0) +
      Number(record?.paymenttypeDetails?.card || 0);

    // Calculate summary based on unique checkouts (not rows)
    const summaryData = {
      totalCheckoutAmount: 0,
      totalAdvanceAmount: 0,
      totalCheckingAdvance: 0,
      totalBookingAdvance: 0,
      checkOutTimePaidAmount: 0,
      totalReceiptsAmount: 0,
      checkOutTimeRefundAmount: 0,
      checkOutTotalAdvanceRefundAmount: 0,
      totalRefundAmount: 0,
      totalotherPayments: 0,
      count: checkouts.length, // Count unique checkouts, not rows
      cashTotal: 0,
      advanceTotal: 0,
      upiTotal: 0,
      bankTotal: 0,
      creditTotal: 0,
      transactionTotal: 0,
    };

    //fetch all advancs with respected dates

    // Process each checkout - expand rooms
    const combinedArray = [
      ...bookings.map((booking) => ({
        ...booking,
        documentSource: "BOOKING",
      })),
      ...checkings.map((checking) => ({
        ...checking,
        documentSource: "CHECKIN",
      })),
      ...checkouts.map((checkout) => ({
        ...checkout,
        documentSource: "CHECKOUT",
      })),
    ];
    const checkoutData = [];
    summaryData.totalBookingAdvance = bookings
      .reduce((total, booking) => total + sumPaymentTypeDetails(booking), 0)
      .toFixed(2);
    summaryData.totalCheckingAdvance = checkings
      .reduce((total, checking) => total + sumPaymentTypeDetails(checking), 0)
      .toFixed(2);
    summaryData.totalAdvanceAmount = (
      Number(summaryData.totalBookingAdvance) +
      Number(summaryData.totalCheckingAdvance)
    ).toFixed(2);
    combinedArray.forEach((checkout) => {
      if (checkout.selectedRooms && checkout.selectedRooms.length > 0) {
        const roomNames = checkout.selectedRooms
          .map((room) => room.roomName)
          .join(",");
        const totalRoomamount = checkout.selectedRooms.reduce(
          (sum, room) => sum + parseFloat(room.roomTotal || 0, 0),
        );

        summaryData.advanceTotal +=
          Number(checkout?.paymenttypeDetails?.cash || 0) +
          Number(checkout?.paymenttypeDetails?.card || 0) +
          Number(checkout?.paymenttypeDetails?.upi || 0) +
          Number(checkout?.paymenttypeDetails?.bank || 0) +
          Number(checkout?.paymenttypeDetails?.credit || 0);

        summaryData.creditTotal += Number(
          checkout?.paymenttypeDetails?.credit || 0,
        );
        summaryData.cashTotal += Number(
          checkout?.paymenttypeDetails?.cash || 0,
        );
        summaryData.upiTotal += Number(checkout?.paymenttypeDetails?.upi || 0);
        summaryData.bankTotal += Number(
          checkout?.paymenttypeDetails?.bank || 0,
        );
        summaryData.cardTotal += Number(
          checkout?.paymenttypeDetails?.card || 0,
        );
        checkoutData.push({
          billNo: checkout.voucherNumber,
          date: checkout.bookingDate,
          documentSource: checkout.documentSource || "CHECKOUT",
          customerName: checkout.customerName,
          guestName: checkout.guestName,
          roomName: roomNames,

          totalAmount: parseFloat(checkout.totalAmount || 0),
          grandTotal: parseFloat(checkout.grandTotal || 0),

          advanceAmount: parseFloat(checkout.totalAdvance || 0),
          balanceToPay: parseFloat(checkout.balanceToPay || 0),
          paymentMode: checkout.paymentMode || "N/A",
          checkOutDate: checkout.checkOutDate,
          checkOutTime: checkout.checkOutTime,
          roomTotal: totalRoomamount,
          // Payment details (if you have them in the schema)
          cash: parseFloat(checkout?.paymenttypeDetails?.cash || 0),
          card: parseFloat(checkout?.paymenttypeDetails?.card || 0),
          upi: parseFloat(checkout?.paymenttypeDetails?.upi || 0),
          bank: parseFloat(checkout?.paymenttypeDetails?.bank || 0),
          credit: parseFloat(checkout?.paymenttypeDetails?.credit || 0),
        });
      }
    });

    // Sum from original checkouts to avoid double counting
    checkouts.forEach((checkout) => {
      const grandTotal = parseFloat(checkout.grandTotal || 0);
      summaryData.checkOutTimePaidAmount +=
        Number(checkout?.paymenttypeDetails?.cash || 0) +
        Number(checkout?.paymenttypeDetails?.card || 0) +
        Number(checkout?.paymenttypeDetails?.upi || 0) +
        Number(checkout?.paymenttypeDetails?.bank || 0) +
        Number(checkout?.paymenttypeDetails?.credit || 0);

      // Group by payment mode
      const mode = checkout.paymentMode?.toUpperCase();
      switch (mode) {
        case "CASH":
          summaryData.cashTotal += grandTotal;
          break;
        case "CARD":
          summaryData.cardTotal += grandTotal;
          break;
        case "UPI":
          summaryData.upiTotal += grandTotal;
          break;
        case "BANK":
          summaryData.bankTotal += grandTotal;
          break;
        case "CREDIT":
          summaryData.creditTotal += grandTotal;
          break;
      }
    });

    summaryData.transactionTotal =
      Number(summaryData?.cashTotal || 0) +
      Number(summaryData?.cardTotal || 0) +
      Number(summaryData?.upiTotal || 0) +
      Number(summaryData?.bankTotal || 0) +
      Number(summaryData?.creditTotal || 0);

    res.status(200).json({
      success: true,
      date: fromDate + " to " + toDate,
      checkoutBills: checkoutData, // Rows with room details
      summary: summaryData, // Summary from unique checkouts
      debug: {
        uniqueCheckouts: checkouts.length,
        totalRows: checkoutData.length,
        difference: checkoutData.length - checkouts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching checkout statement:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching checkout data",
      error: error.message,
    });
  }
};

export const convertToAvailable = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { selectedRooms } = req.body;

    if (!selectedRooms || selectedRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No rooms selected",
      });
    }

    // Extract only room IDs
    const roomIds = selectedRooms.map((room) => room.roomId);

    // Update rooms
    const result = await roomModal.updateMany(
      {
        _id: { $in: roomIds },
        cmp_id,
      },
      {
        $set: {
          status: "available",
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Rooms converted to available",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Convert Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error converting rooms",
      error: error.message,
    });
  }
};

export const controlTaggedCheckIn = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const cmp_id = req.params.cmp_id;
    const { checkInId, holds } = req.body;

    if (!checkInId || !holds || !holds.length) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const holdIds = holds.map((h) => h._id); // array of hold IDs

    await session.withTransaction(async () => {
      // 1️⃣ Update the main check-in with hold array
      await CheckIn.updateOne(
        { _id: new mongoose.Types.ObjectId(checkInId) },
        { $set: { holdArray: holdIds } },
        { session },
      );
      const bulkOps = holds.map((h) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(h._id) },
          update: {
            $set: {
              arrivalDate: h.arrivalDate,
              checkOutDate: h.checkOutDate,
              stayDays: h.stayDays,
              isHold: true,
              taggedCheckIns: checkInId,
            },
          },
          session,
        },
      }));

      await CheckIn.bulkWrite(bulkOps, { session });
      for (const h of holds) {
        for (const room of h.selectedRooms) {
          await roomModal.updateOne(
            { _id: new mongoose.Types.ObjectId(room.roomId) },
            { status: "dirty" },
          );
        }
      }
    });

    session.endSession();

    res.status(200).json({ message: "Tagged successfully" });
  } catch (error) {
    session.endSession();
    console.error(error);
    res.status(500).json({ message: error.message || "Something went wrong" });
  }
};

export const getHoldCheckIns = async (req, res) => {
  try {
    const { holdCheckInIds } = req.body.data || {};

    if (!holdCheckInIds || !holdCheckInIds.length) {
      return res.status(400).json({ message: "Hold check-in IDs missing" });
    }

    const objectIds = holdCheckInIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // 1) Fetch hold check-ins
    const holdData = await CheckIn.find({
      _id: { $in: objectIds },
    })
      .populate("customerId")
      .populate("guestId")
      .populate("agentId")
      .populate("isHotelAgent")
      .populate("selectedRooms.selectedPriceLevel")
      .populate("bookingId")
      .populate("checkInId");

    // 2) Get check-in numbers from fetched data
    const checkInNumbers = holdData
      .map((b) => b?.voucherNumber)
      .filter(Boolean);

    // 3) Find all related posted room sales
    const sales = await salesModel
      .find({
        cmp_id: holdData?.[0]?.cmp_id, // or req.params.cmp_id if you pass cmp_id from params
        isPostToRoom: true,
        isCancelled: false,
        "convertedFrom.checkInNumber": { $in: checkInNumbers },
      })
      .select("_id finalAmount isPostToRoom convertedFrom.checkInNumber");

    // 4) Build map: checkInNumber -> total finalAmount
    const totalByCheckIn = {};
    const processedSaleIds = new Set();

    for (const sale of sales) {
      const saleId = String(sale._id);

      // avoid duplicate sale doc
      if (processedSaleIds.has(saleId)) continue;
      processedSaleIds.add(saleId);

      const saleAmount = sale.isPostToRoom ? Number(sale.finalAmount || 0) : 0;

      // avoid repeated checkInNumber inside same sale
      const uniqueCheckInNumbers = new Set(
        (sale.convertedFrom || [])
          .map((conv) => conv?.checkInNumber)
          .filter(Boolean),
      );

      for (const checkInNumber of uniqueCheckInNumbers) {
        totalByCheckIn[checkInNumber] =
          (totalByCheckIn[checkInNumber] || 0) + saleAmount;
      }
    }

    // 5) Attach restaurant subtotal to each hold check-in
    const holdDataWithSales = holdData.map((b) => {
      const voucherNumber = b?.voucherNumber;
      const total = Number(totalByCheckIn[voucherNumber] || 0);

      return {
        ...b.toObject(),
        restaurantSubTotal: total,
      };
    });

    return res.status(200).json({
      message: "Hold check-ins fetched successfully",
      holdData: holdDataWithSales,
    });
  } catch (error) {
    console.error("getHoldCheckIns error:", error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const releaseHold = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { selectedCheckOut } = req.body.data || {};

    if (!selectedCheckOut?.length) {
      return res.status(400).json({ message: "Check-in IDs missing" });
    }

    const checkInIds = selectedCheckOut.map((item) => item._id);
    const objectIds = checkInIds.map((id) => new mongoose.Types.ObjectId(id));

    await session.withTransaction(async () => {
      // 1. remove from holdArray
      await CheckIn.updateMany(
        { holdArray: { $in: checkInIds } },
        { $pull: { holdArray: { $in: checkInIds } } },
        { session },
      );

      // 2. release hold flag
      await CheckIn.updateMany(
        { _id: { $in: objectIds } },
        {
          $set: {
            isHold: false,
            taggedCheckIns: null,
          },
        },
        { session },
      );

      // 3. validate room status before restoring
      for (const h of selectedCheckOut) {
        for (const room of h.selectedRooms || []) {
          const roomId = new mongoose.Types.ObjectId(room.roomId);

          // check if this room belongs to any active checkin after hold release
          const activeCheckIn = await CheckIn.findOne({
            _id: { $in: objectIds },
            isHold: false,
            status: { $ne: "checkedout" },
            selectedRooms: {
              $elemMatch: {
                roomId: roomId,
              },
            },
          }).session(session);

          if (!activeCheckIn) {
            continue;
          }

          // optional: don't overwrite if room already occupied by unrelated flow
          const existingRoom = await roomModal
            .findById(roomId)
            .session(session);

          if (!existingRoom) continue;

          // restore only when room is in releasable state
          if (
            ["vacant", "booked", "dirty", "blocked", "available"].includes(
              existingRoom.status,
            )
          ) {
            await roomModal.updateOne(
              { _id: roomId },
              { $set: { status: "occupied" } },
              { session },
            );
          }
        }
      }
    });

    return res.status(200).json({
      message: "Hold released successfully",
    });
  } catch (error) {
    console.error("releaseHold error:", error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
    });
  } finally {
    session.endSession();
  }
};

export const getOtherCharges = async (req, res) => {
  const { cmp_id } = req.params;
  const { owner: Primary_user_id, sUserId: secUserId } = req;
  const { page = 1, limit = 20, search = "" } = req.query;

  try {
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;

    // Build optimized base query
    let baseQuery = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      Primary_user_id,
    };

    // Build search query
    if (search) {
      const regex = new RegExp(search, "i");
      baseQuery.$or = [{ name: regex }];
    }

    const OtherCharges = await additionalChargesModel.find(baseQuery);

    res.status(200).json({
      message: "OtherCharges fetched",
      chargeList: OtherCharges,

      pagination: {
        // total: totalCount,
        page: pageNum,
        limit: pageSize,
        // totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("Error in PartyList:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTouristReport = async (req, res) => {
  try {
    let { fromDate, toDate } = req.query;
    let { cmp_id } = req.params;
    console.log("cmp_id", cmp_id);
    const todayStr = new Date().toISOString().slice(0, 10);
    fromDate = fromDate || todayStr;
    toDate = toDate || todayStr;

    const match = {
      arrivalDate: {
        $gte: fromDate,
        $lte: toDate,
      },
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    const [reportGroups] = await CheckIn.aggregate([
      { $match: match },

      {
        $addFields: {
          selectedRooms: { $ifNull: ["$selectedRooms", []] },
          additionalPaxDetails: { $ifNull: ["$additionalPaxDetails", []] },
        },
      },

      {
        $addFields: {
          roomPaxTotal: {
            $sum: {
              $map: {
                input: "$selectedRooms",
                as: "room",
                in: { $ifNull: ["$$room.pax", 0] },
              },
            },
          },
          additionalPaxCount: {
            $size: "$additionalPaxDetails",
          },
        },
      },

      {
        $addFields: {
          totalPax: {
            $add: ["$roomPaxTotal", "$additionalPaxCount"],
          },
          normalizedCountry: {
            $trim: {
              input: { $ifNull: ["$guestCountry", ""] },
            },
          },
        },
      },

      {
        $addFields: {
          groupedCountry: {
            $cond: [
              { $eq: ["$normalizedCountry", ""] },
              "UNKNOWN",
              { $toUpper: "$normalizedCountry" },
            ],
          },
        },
      },

      {
        $facet: {
          countries: [
            { $group: { _id: "$groupedCountry", pax: { $sum: "$totalPax" }, bookings: { $sum: 1 } } },
            { $project: { _id: 0, nation: "$_id", pax: 1, bookings: 1 } },
            { $sort: { pax: -1, nation: 1 } },
          ],
          states: [
            { $addFields: { normalizedState: { $toUpper: { $trim: { input: { $ifNull: ["$guestState", ""] } } } } } },
            { $group: { _id: { $cond: [{ $eq: ["$normalizedState", ""] }, "UNKNOWN", "$normalizedState"] }, pax: { $sum: "$totalPax" }, bookings: { $sum: 1 } } },
            { $project: { _id: 0, state: "$_id", pax: 1, bookings: 1 } },
            { $sort: { pax: -1, state: 1 } },
          ],
        },
      },
    ]);
    const report = reportGroups?.countries || [];
    const stateReport = reportGroups?.states || [];
    const unknownCountryDocs = await CheckIn.aggregate([
      { $match: match },

      {
        $addFields: {
          normalizedCountry: {
            $trim: {
              input: { $ifNull: ["$guestCountry", ""] },
            },
          },
        },
      },

      {
        $addFields: {
          groupedCountry: {
            $cond: [
              { $eq: ["$normalizedCountry", ""] },
              "UNKNOWN",
              { $toUpper: "$normalizedCountry" },
            ],
          },
        },
      },

      {
        $match: {
          groupedCountry: "UNKNOWN",
        },
      },

      {
        $project: {
          _id: 1,
          guestName: 1,
          guestCountry: 1,
          normalizedCountry: 1,
          checkInDate: 1,
          selectedRooms: 1,
          additionalPaxDetails: 1,
        },
      },
    ]);

    console.log("UNKNOWN COUNTRY DOCS:", unknownCountryDocs);
    const totalPax = report.reduce(
      (sum, item) => sum + Number(item.pax || 0),
      0,
    );
    const totalBookings = report.reduce(
      (sum, item) => sum + Number(item.bookings || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      message: "Tourist report fetched successfully",
      filters: {
        fromDate,
        toDate,
        countryField: "guestCountry",
        stateField: "guestState",
      },
      summary: {
        totalNations: report.length,
        totalStates: stateReport.length,
        totalPax,
        totalBookings,
      },
      data: report,
      stateData: stateReport,
    });
  } catch (error) {
    console.error("getTouristReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tourist report",
      error: error.message,
    });
  }
};

export const getFoodPlanReport = async (req, res) => {
  try {
    let { fromDate, toDate, cmp_id } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    fromDate = fromDate || todayStr;
    toDate = toDate || todayStr;

    const match = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id), // ⬅️ company filter
      arrivalDate: {
        $gte: fromDate,
        $lte: toDate,
      },
    };

    const pipeline = [
      { $match: match },

      {
        $unwind: {
          path: "$foodPlan",
          preserveNullAndEmptyArrays: false,
        },
      },

      {
        $lookup: {
          from: "foodplans",
          localField: "foodPlan.foodPlanId",
          foreignField: "_id",
          as: "foodPlanMaster",
        },
      },
      {
        $unwind: {
          path: "$foodPlanMaster",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          foodPlanName: {
            $ifNull: ["$foodPlanMaster.foodPlan", "$foodPlan.foodPlan"],
          },
          foodPlanCode: {
            $ifNull: ["$foodPlanMaster.code", "$foodPlan.foodPlan"],
          },
          itemName: {
            $ifNull: [
              "$foodPlan.itemName",
              {
                $ifNull: [
                  "$foodPlan.foodItemName",
                  {
                    $ifNull: ["$foodPlan.name", "$foodPlan.foodPlan"],
                  },
                ],
              },
            ],
          },
          qty: { $ifNull: ["$foodPlan.qty", 1] },
          rate: { $ifNull: ["$foodPlan.rate", 0] },
          amount: {
            $ifNull: [
              "$foodPlan.amount",
              {
                $multiply: [
                  { $ifNull: ["$foodPlan.qty", 1] },
                  { $ifNull: ["$foodPlan.rate", 0] },
                ],
              },
            ],
          },
          billNo: "$voucherNumber",
          billDate: "$arrivalDate",
          remarks: {
            $cond: [{ $eq: ["$isHotelAgent", true] }, "AGENT", ""],
          },
        },
      },

      {
        $group: {
          _id: {
            foodPlanCode: "$foodPlanCode",
            foodPlanName: "$foodPlanName",
            itemName: "$itemName",
            rate: "$rate",
          },
          totalQty: { $sum: "$qty" },
          totalAmount: { $sum: "$amount" },
          docs: {
            $push: {
              billNo: "$billNo",
              billDate: "$billDate",
              foodPlanName: "$foodPlanName",
              itemName: "$itemName",
              qty: "$qty",
              rate: "$rate",
              amount: "$amount",
              remarks: "$remarks",
            },
          },
        },
      },

      {
        $group: {
          _id: "$_id.foodPlanCode",
          foodPlan: { $first: "$_id.foodPlanCode" },
          foodPlanName: { $first: "$_id.foodPlanName" },
          items: {
            $push: {
              itemName: "$_id.itemName",
              rate: "$_id.rate",
              totalQty: "$totalQty",
              totalAmount: "$totalAmount",
            },
          },
          rows: { $push: "$docs" },
          subTotal: { $sum: "$totalAmount" },
        },
      },

      { $sort: { foodPlanName: 1, foodPlan: 1 } },
    ];

    const data = await CheckIn.aggregate(pipeline);

    const grandTotal = data.reduce((sum, fp) => sum + (fp.subTotal || 0), 0);

    return res.json({
      success: true,
      fromDate,
      toDate,
      grandTotal,
      foodPlans: data,
    });
  } catch (err) {
    console.error("FoodPlan report error", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate food plan report",
      error: err.message,
    });
  }
};

export const getOccupancyCheckoutReport = async (req, res) => {
  try {
    let { fromDate, toDate, cmp_id } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    fromDate = fromDate || "";
    toDate = toDate || "";
    const match = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    const pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "checkouts",
          let: { checkInId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$checkInId", "$$checkInId"],
                },
              },
            },
            {
              $project: {
                _id: 0,
                checkOutDate: 1,
                checkoutTime: 1,
              },
            },
          ],
          as: "checkoutDetails",
        },
      },

      {
        $addFields: {
          rawNewChecoutDate: {
            $ifNull: [
              { $first: "$checkoutDetails.checkOutDate" },
              "$checkOutDate",
            ],
          },

          newCheckoutTime: {
            $ifNull: [
              { $first: "$checkoutDetails.checkoutTime" },
              "$checkOutTime",
            ],
          },
        },
      },

      {
        $addFields: {
          arrivalDateObj: {
            $dateFromString: {
              dateString: "$arrivalDate",
              onError: null,
              onNull: null,
            },
          },

          newChecoutDate: {
            $dateFromString: {
              dateString: "$rawNewChecoutDate",
              onError: null,
              onNull: null,
            },
          },
        },
      },

      {
        $project: {
          checkoutDetails: 0,
          rawNewChecoutDate: 0,
        },
      },
    ];

    if (fromDate && toDate) {
      const startDate = new Date(fromDate);

      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate());

      pipeline.push({
        $match: {
          $or: [
            {
              status: "checkOut",
              newChecoutDate: {
                $gt: startDate,
                // $lt: endDate,
              },
              arrivalDateObj: {
                // $gte: startDate,
                $lte: endDate,
              },
            },

            {
              status: { $nin: ["checkOut", "cancelled"] },
              arrivalDateObj: {
                // $gte: startDate,
                $lte: endDate,
              },
            },
          ],
        },
      });
    }
    const checkins = await CheckIn.aggregate(pipeline);
    console.log("checkins", checkins);

    const allRooms = await roomModal
      .find(
        { cmp_id: new mongoose.Types.ObjectId(cmp_id) },
        { roomName: 1, roomType: 1, status: 1 },
      )
      .lean();

    const rows = [];
    const planMap = {};
    const occupiedRoomNames = new Set();

    let roomRevenue = 0;
    let domestic = 0;
    let foreigners = 0;
    let additionalPaxTotal = 0;

    checkins.forEach((doc) => {
      const country = (doc?.guestCountry || doc?.country || "")
        .trim()
        .toLowerCase();

      const isDomestic = !country || country === "india";

      if (isDomestic) domestic += 1;
      else foreigners += 1;

      const additionalPaxCount = Array.isArray(doc?.additionalPaxDetails)
        ? doc.additionalPaxDetails.length
        : 0;

      additionalPaxTotal += additionalPaxCount;

      const normalizeDate = (value) => {
        const d = new Date(value);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const addOneDay = (value) => {
        const d = new Date(value);
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      };

      const overlaps = (start1, end1, start2, end2) => {
        return start1 < end2 && start2 < end1;
      };

      (doc?.selectedRooms || []).forEach((room) => {
        const bookingStart = normalizeDate(
          doc?.arrivalDateObj || doc?.arrivalDate,
        );
        const bookingEnd = normalizeDate(
          doc?.newChecoutDate || doc?.checkOutDate,
        );

        const filterStart = fromDate ? normalizeDate(fromDate) : null;
        const filterEnd = toDate ? addOneDay(toDate) : null;

        let roomStart = bookingStart;
        let roomEnd = bookingEnd;

        const currentRoomId = room?.roomId?.toString();

        if (
          Array.isArray(doc?.roomSwapHistory) &&
          doc.roomSwapHistory.length > 0
        ) {
          doc.roomSwapHistory.forEach((swap) => {
            const fromRoomId = swap?.fromRoomId?.toString();
            const toRoomId = swap?.toRoomId?.toString();
            const swapDate = swap?.swapDate
              ? normalizeDate(swap.swapDate)
              : null;

            if (!swapDate) return;

            if (currentRoomId === fromRoomId) {
              roomEnd = swapDate;
            }

            if (currentRoomId === toRoomId) {
              roomStart = swapDate;
            }
          });
        }

        if (
          filterStart &&
          filterEnd &&
          !overlaps(roomStart, roomEnd, filterStart, filterEnd)
        ) {
          return;
        }

        const pax = Number(room?.pax || 0);
        const tariff = Number(
          Math.round(room.priceLevelRate) ||
            room?.baseAmount ||
            room?.amountAfterTax ||
            room?.totalAmount ||
            room?.baseAmountWithTax ||
            0,
        );

        roomRevenue += tariff;
        occupiedRoomNames.add(room?.roomName);

        const roomTypeName =
          room?.roomType?.roomTypeName || room?.roomType?.name || "";

        const type = roomTypeName.toLowerCase();
        let single = 0;
        let doubleRoom = 0;
        let triple = 0;
        let other = 0;

        if (type.includes("single")) single += 1;
        else if (type.includes("double")) doubleRoom += 1;
        else if (type.includes("triple")) triple += 1;
        else other += 1;

        let planName = "";
        if (Array.isArray(doc?.foodPlan) && doc.foodPlan.length > 0) {
          const foundPlan = doc.foodPlan.filter(
            (plan) => plan?.roomId?.toString() === room?.roomId?.toString(),
          );

          if (foundPlan.length > 0) {
            foundPlan.forEach((plan) => {
              planName = plan.foodPlan;

              if (!planMap[plan.foodPlan]) {
                planMap[plan.foodPlan] = {
                  plan: plan.foodPlan,
                  rms: 0,
                  pax: 0,
                  addnl: 0,
                  total: 0,
                };
              }

              planMap[plan.foodPlan].rms += 1;
              planMap[plan.foodPlan].pax += pax;
              planMap[plan.foodPlan].addnl += additionalPaxCount;
              planMap[plan.foodPlan].total += pax + additionalPaxCount;
            });
          }
        }

        const extraPersonTariff =
          doc?.additionalPaxDetails?.reduce((acc, item) => {
            return item?.roomId?.toString() === room?.roomId?.toString()
              ? acc + Number(item?.rate || 0)
              : acc;
          }, 0) || 0;

        const additionalPax =
          doc?.additionalPaxDetails?.filter(
            (item) => item?.roomId?.toString() === room?.roomId?.toString(),
          ).length || 0;

        rows.push({
          slNo: rows.length + 1,
          room: room?.roomName || "",
          grcNo: doc?.grcno || "",
          guestName: doc?.guestName || doc?.customerName || "",
          company: doc?.company || "",
          pax,
          additionalPax,
          arrivalDate: doc?.arrivalDate || "",
          arrivalTime: doc?.arrivalTime || "",
          departureDate: doc?.newChecoutDate || doc?.checkOutDate || "",
          departureTime: doc?.newCheckoutTime || doc?.checkOutTime || "",
          plan: planName,
          tariff: tariff - extraPersonTariff,
          extraPersonTariff,
          totalTariffWithPax: tariff,
          discountPercent: 0,
          discountAmount: 0,
        });
      });
    });

    const totalRooms = allRooms.length;

    // status-wise counts from room master
    let occupiedCount = 0;
    let vacantCount = 0;
    let cleaningCount = 0;
    let blockedCount = 0;

    const roomStatus = allRooms
      .map((room) => {
        const statusRaw = String(room.status || "").toLowerCase();
        let status = "Vacant";

        if (occupiedRoomNames.has(room.roomName)) {
          status = "Occupied";
        } else if (statusRaw === "cleaning" || statusRaw === "dirty") {
          status = "Cleaning";
        } else if (
          statusRaw === "blocked" ||
          statusRaw === "block" ||
          statusRaw === "household"
        ) {
          status = "Blocked";
        } else {
          status = "Vacant";
        }

        if (status === "Occupied") occupiedCount += 1;
        else if (status === "Vacant") vacantCount += 1;
        else if (status === "Cleaning") cleaningCount += 1;
        else if (status === "Blocked") blockedCount += 1;

        return {
          roomNo: room.roomName,
          status,
        };
      })
      .sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo)));

    const occupiedRooms = occupiedCount;
    const vacant = vacantCount;

    const occupancyPercentage =
      totalRooms > 0
        ? Number(((occupiedRooms / totalRooms) * 100).toFixed(2))
        : 0;

    const arr =
      occupiedRooms > 0 ? Number((roomRevenue / occupiedRooms).toFixed(2)) : 0;

    const planSummary = Object.values(planMap);

    return res.status(200).json({
      success: true,
      reportDate: toDate,
      printDateTime: new Date(),
      summary: {
        occupancyPercentage,
        houseCount: rows.reduce((sum, item) => sum + Number(item.pax || 0), 0),
        domestic,
        foreigners,
        roomRevenue: Number(roomRevenue.toFixed(2)),
        arr,
        roomsOccupied: occupiedRooms,
        vacant,
        cleaning: cleaningCount,
        blocked: blockedCount,
        totalRooms,
      },
      planSummary,
      rows,
      roomStatus,
    });
  } catch (error) {
    console.error("getOccupancyCheckoutReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate occupancy checkout report",
      error: error.message,
    });
  }
};

export const deleteAdvance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { cmp_id } = req.query;

    if (!id || !cmp_id) {
      return res.status(400).json({
        success: false,
        message: "Advance ID and company ID are required",
      });
    }

    session.startTransaction();

    const deletedAdvance = await TallyData.findOneAndDelete(
      { _id: id, cmp_id },
      { session },
    );

    if (!deletedAdvance) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Advance not found",
      });
    }
    if (deletedAdvance) {
      await deleteReceipt(id, session);
      await deleteSettlements(id, session);
    }

    const advanceAmount = Number(deletedAdvance?.bill_amount || 0);

    if (Number.isNaN(advanceAmount)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid advance amount",
      });
    }

    // 🔹 HANDLE BOOKING
    if (deletedAdvance?.billId) {
      const booking = await Booking.findOne(
        { _id: deletedAdvance.billId, cmp_id },
        null,
        { session },
      );

      if (booking) {
        const current = Number(booking.advanceAmount || 0);
        const updated = current - advanceAmount;
        let totalAdvance = Number(booking.totalAdvance || 0) - advanceAmount;
        let currentBlance = Number(booking.balanceToPay || 0);
        let updatedBalance = currentBlance + advanceAmount;
        await Booking.updateOne(
          { _id: booking._id },
          {
            $set: {
              advanceAmount: String(updated),
              balanceToPay: String(updatedBalance),
              totalAdvance: String(totalAdvance),
            },
          },
          { session },
        );
      }
    }

    // 🔹 HANDLE CHECKIN
    if (deletedAdvance?.billId) {
      const checkIn = await CheckIn.findOne(
        { _id: deletedAdvance.billId, cmp_id },
        null,
        { session },
      );

      if (checkIn) {
        const current = Number(checkIn.advanceAmount || 0);
        const updated = current - advanceAmount;
        let currentBlance = Number(checkIn.balanceToPay || 0);
        let updatedBalance = currentBlance + advanceAmount;
        await CheckIn.updateOne(
          { _id: checkIn._id },
          {
            $set: {
              advanceAmount: String(updated),
              balanceToPay: String(updatedBalance),
            },
          },
          { session },
        );
      }
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Advance deleted successfully",
      data: deletedAdvance,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete advance",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};
export const sendBillEmail = async (req, res) => {
  const {
    toEmail,
    ccEmails,
    message,
    billNo,
    guestName,
    organizationName,
    pdfBase64,
    pdfFileName,
  } = req.body;

  if (!toEmail) {
    return res
      .status(400)
      .json({ success: false, message: "Recipient email is required" });
  }

  if (!pdfBase64) {
    return res
      .status(400)
      .json({ success: false, message: "PDF data is missing" });
  }

  // Convert base64 string → Buffer (most reliable for nodemailer)
  let pdfBuffer;
  try {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid PDF data" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODE_MAILER_EMAIL,
      pass: process.env.NODE_MAILER_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"${organizationName}" <${process.env.NODE_MAILER_EMAIL}>`,
      to: toEmail,
      cc: ccEmails?.length ? ccEmails.join(",") : undefined,
      subject: `Your Stay Bill - ${billNo} | ${guestName}`,
      text: message,
      attachments: [
        {
          filename: pdfFileName || `Bill-${billNo}.pdf`,
          content: pdfBuffer, // Buffer — not raw base64 string
          contentType: "application/pdf",
        },
      ],
    });

    return res
      .status(200)
      .json({ success: true, message: "Email sent successfully" });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reports/sales-report?startDate=2026-04-01&endDate=2026-04-30&cmp_id=xxx
export const viewReport = async (req, res) => {
  try {
    const { startDate, endDate, cmp_id } = req.query;

    if (!startDate || !endDate || !cmp_id) {
      return res
        .status(400)
        .json({ message: "startDate, endDate, cmp_id required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch sales vouchers in date range
    const restaurantSeries = await VoucherSeriesModel.findOne({
      cmp_id,
      voucherType: "sales",
    });

    const restaurantSeriesIds =
      restaurantSeries?.series
        ?.filter((s) => s.under === "restaurant")
        .map((s) => s._id) || [];

    const sales = await salesModel
      .find({
        cmp_id,
        voucherType: "sales",
        date: { $gte: start, $lte: end },
        isCancelled: false,
        series_id: { $nin: restaurantSeriesIds },
      })
      .lean();

    const hotelSalesOnly = sales.filter((sale) => {
      const ref =
        sale.convertedFrom?.[0]?.checkInNumber ||
        sale.convertedFrom?.[0]?.voucherNumber;
      return !!ref;
    });

    // Collect all checkIn IDs from convertedFrom
    const checkInNumbers = hotelSalesOnly
      .map(
        (s) =>
          s.convertedFrom?.[0]?.checkInNumber ||
          s.convertedFrom?.[0]?.voucherNumber,
      )
      .filter(Boolean);

    // Fetch all referenced checkIns in one query
    const checkIns = await CheckIn.find({
      cmp_id,
      voucherNumber: { $in: checkInNumbers },
    }).lean();

    let companyDetails = await Organization.findOne({ _id: cmp_id }).lean();

    // Map checkIns by voucherNumber
    const checkInMap = {};
    checkIns.forEach((ci) => {
      checkInMap[ci.voucherNumber] = ci;
    });

    const reportRows = hotelSalesOnly.map((sale) => {
      const checkInRef =
        sale.convertedFrom?.[0]?.checkInNumber ||
        sale.convertedFrom?.[0]?.voucherNumber;
      const ci = checkInMap[checkInRef] || {};

      // Room and plan data from checkIn
      const room = ci.selectedRooms?.[0] || {};
      const foodPlanEntry = ci.foodPlan?.[0] || {};
      const roomName = room.roomName || sale.items?.[0]?.product_name || "";
      const stayDays = ci.stayDays || room.stayDays || 1;
      const pax = Number(room.pax || 0);
      const extraPerson = pax > 2 ? pax - 2 : 0;
      const plan = foodPlanEntry.foodPlan || "EP";

      console.log(foodPlanEntry);

      // ✅ Food plan — use room-level amounts if available, fallback to rate calc
      const foodPlanAmountWithTax =
        room.foodPlanAmountWithTax ||
        room.foodPlanAmount ||
        (foodPlanEntry.rate || 0) * pax * stayDays;

      const foodPlanAmountWithoutTax =
        room.foodPlanAmountWithOutTax ||
        (foodPlanAmountWithTax > 0 ? foodPlanAmountWithTax / 1.05 : 0);

      const planTotal = foodPlanAmountWithTax;
      const planTaxable = +foodPlanAmountWithoutTax.toFixed(2);
      const planSales = +(planTaxable * stayDays).toFixed(2);
      const planRate = foodPlanEntry.rate || 0;
      const dayPlanSales = +foodPlanAmountWithoutTax.toFixed(2);

      // ✅ Room rent — from checkin room level
      const baseRoomRent = room.priceLevelRate
        ? parseFloat(room.priceLevelRate) * stayDays
        : sale.subTotal || sale.finalAmount;

      // ✅ Discount — from additionalCharges where option === "discount"
      const additionalCharges = sale.additionalCharges || [];
      const discountEntry = additionalCharges.find(
        (ac) => ac.option?.toLowerCase() === "discount" && ac.action === "sub",
      );
      const discountAmount = discountEntry
        ? Math.abs(discountEntry.finalValue || 0)
        : 0;
      const discountPercent =
        baseRoomRent > 0
          ? +((discountAmount / baseRoomRent) * 100).toFixed(2)
          : 0;

      // Room rent after discount
      const roomRent = baseRoomRent - discountAmount;

      // Tax calculations
      const item = sale.items?.[0] || {};
      const isIGST = item.igst > 0 && item.cgst === 0;

      const dayPlanCGST = isIGST ? 0 : +(dayPlanSales * 0.025).toFixed(2);
      const dayPlanSGST = isIGST ? 0 : +(dayPlanSales * 0.025).toFixed(2);
      const dayPlanIGST = isIGST ? +(dayPlanSales * 0.05).toFixed(2) : 0;
      const roomRentTaxable = roomRent / 1.05;
      const roomRentCGST = isIGST ? 0 : roomRentTaxable * 0.025;
      const roomRentSGST = isIGST ? 0 : roomRentTaxable * 0.025;
      const roomRentIGST = isIGST ? roomRentTaxable * 0.05 : 0;

      const planCGST = isIGST ? 0 : planTaxable * 0.025;
      const planSGST = isIGST ? 0 : planTaxable * 0.025;

      const revenue = roomRent + planSales;
      const totalCGST = roomRentCGST + planCGST;
      const totalSGST = roomRentSGST + planSGST;
      const totalIGST = roomRentIGST;
      const grossAmount = revenue;
      const totalTax = isIGST ? totalIGST : totalCGST + totalSGST;

      // netTotal uses totalWithAdditionalCharges (after discount applied)
      const netTotal =
        sale.totalWithAdditionalCharges || sale.finalAmount || ci.totalAmount;
      const difference = grossAmount + totalTax - netTotal;

      // Payment splits
      const payments = sale.paymentSplittingData || [];
      const getAmt = (type) =>
        payments
          .filter((x) => x.type?.toLowerCase() === type)
          .reduce((sum, x) => sum + (x.amount || 0), 0);

      const cashAmt = getAmt("cash");
      const upiAmt = getAmt("upi");
      const bankAmt = getAmt("bank");
      const cardAmt = getAmt("card");
      const creditAmt = getAmt("credit");

      const paymentModes =
        [
          ...new Set(
            payments.map((x) => x.type?.toUpperCase()).filter(Boolean),
          ),
        ].join(", ") || "-";

      const creditEntry = payments.find(
        (x) => x.type?.toLowerCase() === "credit",
      );
      const isCredit = sale.finalOutstandingAmount > 0 || creditAmt > 0;
      const creditDescription = isCredit
        ? creditEntry?.customerName || sale.party?.partyName || ""
        : "";

      return {
        billNo: sale.salesNumber,
        date: sale.date,
        agentName: sale.party?.partyName || "",
        gst: sale.party?.gstNo,
        placeOfSupply: companyDetails.state,
        plan,
        rooms: roomName,
        noRooms: ci.selectedRooms?.length || 1,
        days: stayDays,
        totalAmount: netTotal,
        perDayRevenue:
          stayDays > 0 ? +(netTotal / stayDays).toFixed(2) : netTotal,
        pax,
        extraPerson,
        planRate: +planRate.toFixed(2),
        planTotal: +planTotal.toFixed(2),
        planTaxable,

        dayPlanSales,
        dayPlanCGST,
        dayPlanSGST,

        roomRent: +roomRent.toFixed(2),
        roomRentTaxable: +roomRentTaxable.toFixed(2),
        roomRentTotal: +(roomRentTaxable * stayDays).toFixed(2),
        roomRentCGST: +roomRentCGST.toFixed(2),
        roomRentSGST: +roomRentSGST.toFixed(2),
        planSales: +(planTaxable * stayDays).toFixed(2),
        planSalesCGST: +planCGST.toFixed(2),
        planSalesSGST: +planSGST.toFixed(2),
        revenue: +revenue.toFixed(2),
        revenueCGST: +totalCGST.toFixed(2),
        revenueSGST: +totalSGST.toFixed(2),
        differenceAmt: +difference.toFixed(2),
        grossAmount: +grossAmount.toFixed(2),
        grossCGST: +totalCGST.toFixed(2),
        grossSGST: +totalSGST.toFixed(2),
        totalTax: +totalTax.toFixed(2),

        // ✅ Discount fields
        discountPercent,
        discountAmount: +discountAmount.toFixed(2),

        roundOff: 0,
        netTotal,
        cash: cashAmt,
        upi: upiAmt,
        bank: bankAmt,
        card: cardAmt,
        paymentMode: paymentModes,
        credit: isCredit ? creditAmt || netTotal : 0,
        creditDescription,
        checkInNumber: checkInRef || "",
        guestName: ci.guestName || "",
      };
    });

    res.json({ success: true, count: reportRows.length, data: reportRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getSaleBasedOnVoucher = async (req, res) => {
  try {
    const { cmp_id, voucherNumber } = req.query;

    console.log(voucherNumber, cmp_id);

    if (!voucherNumber || !cmp_id) {
      return res
        .status(400)
        .json({ message: "voucherNumber and cmp_id are required" });
    }

    const sale = await salesModel
      .findOne({ cmp_id, salesNumber: voucherNumber, isPostToRoom: false })
      .lean();

    if (!sale) {
      return res
        .status(404)
        .json({ message: "Sale not found for the given voucher number" });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    console.error("getSaleBasedOnVoucher error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── helpers/partyHelper.js ──
export const buildEmbeddedParty = (party, { gstNo, address } = {}) => ({
  _id: party._id,
  partyName: party.partyName || "",
  partyType: party.partyType || "party",
  accountGroupName: party.accountGroupName || "",
  accountGroup_id: party.accountGroup || null,
  subGroupName: party.subGroupName || "",
  subGroup_id: party.subGroup_id || null,
  mobileNumber: party.mobileNumber || "",
  country: party.country || "",
  state: party.state || "",
  pin: party.pin || "",
  emailID: party.emailID || "",
  gstNo: gstNo || party.gstNo || "",
  billingAddress: address || party.billingAddress || "",
  shippingAddress: party.shippingAddress || "",
  accountGroup: party.accountGroup?.toString() || "",
  party_master_id: party.party_master_id || party._id.toString(),
  newAddress: party.newAddress || {},
});

// export const updateCheckout = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;
//     const { cmp_id } = req.query;

//     if (!id || !cmp_id) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "id and cmp_id are required" });
//     }

//     const sale = await salesModel.findOne({ _id: id, cmp_id }).session(session);

//     if (!sale) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: "Sale not found" });
//     }

//     const { partyId, gstNo, address, payments = [] } = req.body;

//     if (!partyId) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "partyId is required" });
//     }

//     const party = await Party.findOne({ _id: partyId, cmp_id }).session(
//       session,
//     );

//     if (!party) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: "Party not found" });
//     }

//     // ── Helper: map sourceType to settlement sourceType enum ──
//     // cash → "cash", everything else (bank/upi/card) → "bank"
//     const toSourceType = (sourceType) => {
//       return sourceType?.toLowerCase() === "cash" ? "cash" : "bank";
//     };

//     // ── Update sale party ──
//     sale.party = buildEmbeddedParty(party, { gstNo, address });
//     sale.markModified("party");

//     // ── Update payment splits by index ──
//     payments.forEach((payment, index) => {
//       const matchingPayment = sale.paymentSplittingData[index];
//       if (!matchingPayment) return;

//       matchingPayment.ref_id = payment.source || matchingPayment.ref_id;
//       matchingPayment.source = payment.source || matchingPayment.source;
//       matchingPayment.type =
//         payment.sourceType?.toLowerCase() || matchingPayment.type;
//       matchingPayment.sourceType =
//         payment.sourceType?.toLowerCase() || matchingPayment.sourceType;
//       matchingPayment.subsource =
//         payment.subsource || matchingPayment.subsource;
//       matchingPayment.remarks = payment.remarks ?? matchingPayment.remarks;
//       matchingPayment.customer = party._id;
//       matchingPayment.customerName = party.partyName;
//     });

//     sale.markModified("paymentSplittingData");
//     await sale.save({ session });

//     // ── Fetch all receipts linked to this sale ──
//     const receipts = await ReceiptModel.find({
//       cmp_id,
//       "billData.bill_no": sale.salesNumber,
//     }).session(session);

//     if (receipts.length > 0) {
//       await Promise.all(
//         receipts.map(async (receipt, index) => {
//           // 1. Update party
//           receipt.party = buildEmbeddedParty(party, { gstNo, address });
//           receipt.markModified("party");

//           // 2. Match by index
//           const matchedPayment = sale.paymentSplittingData[index] || null;

//           if (matchedPayment) {
//             const isCash = matchedPayment.sourceType?.toLowerCase() === "cash";

//             if (isCash) {
//               receipt.paymentMethod = "Cash";
//               receipt.paymentDetails.cash_id =
//                 matchedPayment.source || receipt.paymentDetails.cash_id;
//               receipt.paymentDetails.cash_ledname =
//                 matchedPayment.subsource || receipt.paymentDetails.cash_ledname;
//               receipt.paymentDetails.cash_name =
//                 matchedPayment.subsource || receipt.paymentDetails.cash_name;
//               receipt.paymentDetails.bank_id = null;
//               receipt.paymentDetails.bank_ledname = "";
//               receipt.paymentDetails.bank_name = "";
//             } else {
//               receipt.paymentMethod =
//                 matchedPayment.sourceType || receipt.paymentMethod;
//               receipt.paymentDetails.bank_id =
//                 matchedPayment.source || receipt.paymentDetails.bank_id;
//               receipt.paymentDetails.bank_ledname =
//                 matchedPayment.subsource || receipt.paymentDetails.bank_ledname;
//               receipt.paymentDetails.bank_name =
//                 matchedPayment.subsource || receipt.paymentDetails.bank_name;
//               receipt.paymentDetails.cash_id = null;
//               receipt.paymentDetails.cash_ledname = "";
//               receipt.paymentDetails.cash_name = "";
//             }

//             receipt.markModified("paymentDetails");
//           }

//           await receipt.save({ session });
//         }),
//       );
//     }

//     // ── Update Checkout ──
//     const checkout = await CheckOut.findOne({
//       cmp_id,
//       voucherNumber: sale.salesNumber,
//     }).session(session);

//     if (!checkout) {
//       await session.abortTransaction();
//       session.endSession();
//       return res
//         .status(404)
//         .json({ message: "Checkout not found for this sale" });
//     }

//     payments.forEach((payment, index) => {
//       const matchingPayment = checkout.checkoutpaymenttypedetails[index];
//       if (!matchingPayment) return;

//       matchingPayment.mode =
//         payment.sourceType?.toLowerCase() || matchingPayment.mode;
//       matchingPayment._id = payment.source || matchingPayment._id;
//       matchingPayment.customerName =
//         party.partyName || matchingPayment.customerName;
//     });

//     checkout.markModified("checkoutpaymenttypedetails");

//     // ── Payment totals for checkout ──
//     const paymentTotals = { cash: 0, bank: 0, upi: 0, credit: 0, card: 0 };

//     sale.paymentSplittingData.forEach((p) => {
//       const type = p.sourceType?.toLowerCase() || p.type?.toLowerCase();
//       const amount = parseFloat(p.amount?.toString() || "0");
//       if (type === "cash") paymentTotals.cash += amount;
//       else if (type === "bank") paymentTotals.bank += amount;
//       else if (type === "upi") paymentTotals.upi += amount;
//       else if (type === "credit") paymentTotals.credit += amount;
//       else if (type === "card") paymentTotals.card += amount;
//     });

//     checkout.paymenttypeDetails = paymentTotals;
//     checkout.markModified("paymenttypeDetails");

//     /// update guest info of checkout accriding to party

//     checkout.guestId = party._id || checkout.guestId;
//     checkout.guestName = party.partyName || checkout.guestName;
//     // checkout.guestCountry=party._id;
//     checkout.guestState =
//       statesData.find((el) => el?.stateCode === party?.state_reference) ||
//       checkout.guestState;
//     checkout.guestPinCode = party.guestPinCode || checkout.guestPinCode;
//     checkout.guestDetailedAddress = address || checkout.guestDetailedAddress;
//     checkout.guestMobileNumber =
//       party.mobileNumber || checkout.guestMobileNumber;
//     checkout.gstNo = gstNo || checkout.gstNo;

//     await checkout.save({ session });

//     // ── Update Settlements ──
//     // Fetch all settlements for receipt voucher numbers

//     const receiptVoucherNumbers = receipts
//       .map((r) => r.receiptNumber)
//       .filter(Boolean);

//     const settlements = await settlementModel
//       .find({
//         cmp_id,
//         voucherNumber: { $in: receiptVoucherNumbers },
//       })
//       .session(session);

//     // console.log("receipts", receipts);
//     // console.log("receiptVoucherNumbers", receiptVoucherNumbers);
//     // console.log("settlements", settlements);

//     if (settlements.length > 0) {
//       await Promise.all(
//         settlements.map(async (settlement, index) => {
//           const matchedPayment = sale.paymentSplittingData[index] || null;

//           // Always update party info
//           settlement.partyId = party._id;
//           settlement.partyName = party.partyName;
//           settlement.partyType = party.partyType || "party"; // from Party document

//           if (matchedPayment) {
//             const rawType = matchedPayment.sourceType?.toLowerCase();

//             settlement.sourceId = matchedPayment.source || settlement.sourceId;
//             settlement.sourceType = toSourceType(rawType); // "cash" | "bank"
//             settlement.payment_mode = rawType || settlement.payment_mode; // "cash" | "bank" | "upi" | "card"
//           }

//           await settlement.save({ session });
//         }),
//       );
//     }

//     // console.log("sale party", sale.party); /* */
//     // console.log("sale paymentSplittingData", sale.paymentSplittingData); /* */
//     // console.log("receipts party", receipts.party);
//     // console.log(
//     //   "receipts party",
//     //   receipts.map((r) => r.party),
//     // );
//     // console.log(
//     //   "receipts paymentDetails",
//     //   receipts.map((r) => r.paymentDetails),
//     // );
//     // console.log(
//     //   "checkout checkoutpaymenttypedetails",
//     //   checkout.checkoutpaymenttypedetails,
//     // );

//     // /log settlements
//     console.log(
//       "settlements after update",
//       settlements.map((s) => ({
//         partyId: s.partyId,
//         partyName: s.partyName,
//         partyType: s.partyType,
//         sourceId: s.sourceId,
//         sourceType: s.sourceType,
//         payment_mode: s.payment_mode,
//       })),
//     );

//     // ── Commit ──
//     await session.commitTransaction();
//     session.endSession();

//     // console.log("receipt",rece);

//     return res.status(200).json({
//       success: true,
//       message: "Sale updated successfully",
//       data: sale,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();

//     console.error("updateCheckout error:", error);
//     return res.status(500).json({
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

export const updateCheckout = async (req, res) => {
  const session = await mongoose.startSession();
  const requestCmpId = req.query?.cmp_id;

  /*
   * Convert all paymentId values to one consistent Map key.
   *
   * A request may contain a string while MongoDB documents contain
   * ObjectId values. Both must resolve to the same payment split.
   */
  const getPaymentIdKey = (paymentId) => {
    if (paymentId === undefined || paymentId === null) {
      return null;
    }

    return paymentId.toString();
  };

  /*
   * Convert a Mongoose document/subdocument into a plain object.
   */
  const toPlainObject = (value) => {
    if (!value) {
      return {};
    }

    if (typeof value.toObject === "function") {
      return value.toObject({
        depopulate: true,
        virtuals: false,
        getters: false,
      });
    }

    return { ...value };
  };

  /*
   * Normalize payment-mode values before comparing transitions.
   */
  const normalizePaymentType = (sourceType) => {
    if (typeof sourceType !== "string") {
      return "";
    }

    return sourceType.trim().toLowerCase();
  };

  /*
   * Existing data may contain the mode in either sourceType or type.
   */
  const getPaymentType = (payment) => {
    return normalizePaymentType(payment?.sourceType || payment?.type);
  };

  const isCreditPayment = (paymentType) => {
    return normalizePaymentType(paymentType) === "credit";
  };

  const isImmediatePayment = (paymentType) => {
    const normalizedType = normalizePaymentType(paymentType);

    return ["cash", "bank", "upi", "card", "cheque"].includes(normalizedType);
  };

  /*
   * Settlement sourceType supports the broad accounting source.
   *
   * UPI, Card and Cheque are bank-side sources, while payment_mode
   * stores the exact payment mode.
   */
  const toSettlementSourceType = (paymentType) => {
    return normalizePaymentType(paymentType) === "cash" ? "cash" : "bank";
  };

  /*
   * Build a strict paymentId Map.
   *
   * This is suitable for:
   *
   * - Sale payments
   * - Request payments
   * - Checkout payment rows
   * - Tally records
   *
   * It must not be used on all Receipt or Settlement history because
   * cancelled and newly created records may share the same paymentId.
   */
  const createStrictPaymentMap = (
    records,
    recordName,
    { paymentIdRequired = false } = {},
  ) => {
    const map = new Map();

    for (const record of records || []) {
      console.log("records", records);
      const paymentIdKey = getPaymentIdKey(record?.paymentId);

      if (!paymentIdKey) {
        if (paymentIdRequired) {
          throw new Error(`${recordName} contains a record without paymentId`);
        }

        continue;
      }
      console.log("paymentIdKey", paymentIdKey);

      if (map.has(paymentIdKey)) {
        throw new Error(
          `Duplicate paymentId "${paymentIdKey}" found in ${recordName}`,
        );
      }

      map.set(paymentIdKey, record);
    }

    return map;
  };

  /*
   * Create a Map containing only active Receipts or Settlements.
   *
   * There must never be more than one active document for the same
   * company and paymentId.
   */
  const createActiveDocumentMap = (records, recordName) => {
    const map = new Map();

    for (const record of records || []) {
      const paymentIdKey = getPaymentIdKey(record?.paymentId);

      if (!paymentIdKey) {
        continue;
      }

      if (record.isCancelled === true) {
        continue;
      }

      if (map.has(paymentIdKey)) {
        throw new Error(
          `Multiple active ${recordName} records found for paymentId ${paymentIdKey}`,
        );
      }

      map.set(paymentIdKey, record);
    }

    return map;
  };

  const abortAndRespond = async (statusCode, message) => {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(statusCode).json({
      message,
    });
  };

  /*
   * Update one existing Sale payment.
   *
   * The payment has already been located through paymentId.
   */
  const updateSalePayment = ({ salePayment, incomingPayment, party }) => {
    const newPaymentType = normalizePaymentType(incomingPayment.sourceType);

    if (!newPaymentType) {
      throw new Error(
        `sourceType is required for paymentId ${getPaymentIdKey(
          incomingPayment.paymentId,
        )}`,
      );
    }

    if (isImmediatePayment(newPaymentType) && !incomingPayment.source) {
      throw new Error(
        `Payment source is required for paymentId ${getPaymentIdKey(
          incomingPayment.paymentId,
        )}`,
      );
    }

    if (isCreditPayment(newPaymentType) && !incomingPayment.source) {
      throw new Error(
        `Credit party is required for paymentId ${getPaymentIdKey(
          incomingPayment.paymentId,
        )}`,
      );
    }

    /*
     * Preserve the existing behavior:
     * do not clear source/ref_id when an empty source is sent.
     */
    if (incomingPayment.source) {
      salePayment.ref_id = incomingPayment.source;

      salePayment.source = incomingPayment.source;
    }

    salePayment.type = newPaymentType;
    salePayment.sourceType = newPaymentType;

    if (Object.prototype.hasOwnProperty.call(incomingPayment, "subsource")) {
      salePayment.subsource = incomingPayment.subsource;
    }

    if (Object.prototype.hasOwnProperty.call(incomingPayment, "remarks")) {
      salePayment.remarks = incomingPayment.remarks;
    }

    if (
      Object.prototype.hasOwnProperty.call(incomingPayment, "amount") &&
      incomingPayment.amount !== undefined &&
      incomingPayment.amount !== null
    ) {
      salePayment.amount = incomingPayment.amount;
    }

    if (isCreditPayment(newPaymentType)) {
      salePayment.customer = incomingPayment.source;
      salePayment.customerName =
        incomingPayment.customerName || party.partyName;
    } else {
      salePayment.customer = party._id;
      salePayment.customerName = party.partyName;
    }
  };

  /*
   * Update an active Receipt during:
   *
   * Immediate -> Immediate
   *
   * This helper never reactivates a cancelled Receipt.
   */
  const updateReceipt = ({ receipt, payment, party, gstNo, address }) => {
    const paymentType = getPaymentType(payment);

    receipt.party = buildEmbeddedParty(party, {
      gstNo,
      address,
    });

    receipt.markModified("party");

    if (!receipt.paymentDetails) {
      receipt.paymentDetails = {};
    }

    if (paymentType === "cash") {
      receipt.paymentMethod = "Cash";

      receipt.paymentDetails.cash_id =
        payment.source || receipt.paymentDetails.cash_id;

      receipt.paymentDetails.cash_ledname =
        payment.subsource || receipt.paymentDetails.cash_ledname;

      receipt.paymentDetails.cash_name =
        payment.subsource || receipt.paymentDetails.cash_name;

      receipt.paymentDetails.bank_id = null;
      receipt.paymentDetails.bank_ledname = "";
      receipt.paymentDetails.bank_name = "";
    } else {
      /*
       * Bank, Card, UPI and Cheque use the bank-side fields.
       */
      receipt.paymentMethod = paymentType || receipt.paymentMethod;

      receipt.paymentDetails.bank_id =
        payment.source || receipt.paymentDetails.bank_id;

      receipt.paymentDetails.bank_ledname =
        payment.subsource || receipt.paymentDetails.bank_ledname;

      receipt.paymentDetails.bank_name =
        payment.subsource || receipt.paymentDetails.bank_name;

      receipt.paymentDetails.cash_id = null;
      receipt.paymentDetails.cash_ledname = "";
      receipt.paymentDetails.cash_name = "";
    }

    receipt.paymentId = payment.paymentId;

    if (
      Object.prototype.hasOwnProperty.call(payment, "amount") &&
      payment.amount !== undefined &&
      payment.amount !== null &&
      Object.prototype.hasOwnProperty.call(receipt, "amount")
    ) {
      receipt.amount = payment.amount;
    }

    receipt.markModified("paymentDetails");
  };

  /*
   * Cancel the active Receipt during:
   *
   * Immediate -> Credit
   */
  const cancelReceipt = ({ receipt, party, gstNo, address }) => {
    receipt.party = buildEmbeddedParty(party, {
      gstNo,
      address,
    });

    receipt.markModified("party");

    receipt.isCancelled = true;
    receipt.cancelledAt = new Date();
    receipt.cancelledBy = req.sUserId;
    receipt.cancelledByName = req.secUserName;

    /*
     * The original controller uses cancelReason.
     *
     * Keep this field unless your actual schema uses
     * cancelledReason instead.
     */
    receipt.cancelReason = "Payment mode changed to Credit";
  };

  /*
   * Update an active Settlement during:
   *
   * Immediate -> Immediate
   */
  const updateSettlement = ({ settlement, payment, party, receipt }) => {
    const paymentType = getPaymentType(payment);

    settlement.paymentId = payment.paymentId;

    settlement.partyId = party._id;
    settlement.partyName = party.partyName;

    settlement.partyType = party.partyType || "party";

    settlement.sourceId = payment.source || settlement.sourceId;

    settlement.sourceType = toSettlementSourceType(paymentType);

    settlement.payment_mode = paymentType || settlement.payment_mode;

    if (receipt?.receiptNumber) {
      settlement.voucherNumber = receipt.receiptNumber;
    }

    if (
      Object.prototype.hasOwnProperty.call(payment, "amount") &&
      payment.amount !== undefined &&
      payment.amount !== null &&
      Object.prototype.hasOwnProperty.call(settlement, "amount")
    ) {
      settlement.amount = payment.amount;
    }
  };

  /*
   * Rebuild a Checkout payment row from the final Sale payment.
   *
   * Existing Checkout-only values are preserved using paymentId.
   * No array index is used.
   */
  const buildCheckoutPaymentRow = ({
    salePayment,
    existingCheckoutPayment,
    party,
  }) => {
    const existingData = toPlainObject(existingCheckoutPayment);

    const paymentType = getPaymentType(salePayment);

    return {
      ...existingData,

      /*
       * Preserve the Checkout subdocument _id through existingData.
       * Never replace it with payment.source.
       */

      paymentId: salePayment.paymentId,

      mode: paymentType || existingData.mode,

      type: paymentType || existingData.type,

      sourceType: paymentType || existingData.sourceType,

      source:
        salePayment.source !== undefined
          ? salePayment.source
          : existingData.source,

      ref_id:
        salePayment.ref_id !== undefined
          ? salePayment.ref_id
          : existingData.ref_id,

      subsource:
        salePayment.subsource !== undefined
          ? salePayment.subsource
          : existingData.subsource,

      remarks:
        salePayment.remarks !== undefined
          ? salePayment.remarks
          : existingData.remarks,

      amount:
        salePayment.amount !== undefined
          ? salePayment.amount
          : existingData.amount,

      customer: party._id,
      customerName: party.partyName,
    };
  };

  const calculatePaymentTotals = (salePayments) => {
    const totals = {
      cash: 0,
      bank: 0,
      upi: 0,
      credit: 0,
      card: 0,
    };

    for (const payment of salePayments || []) {
      const paymentType = getPaymentType(payment);

      const parsedAmount = Number.parseFloat(payment.amount?.toString() || "0");

      const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;

      if (paymentType === "cash") {
        totals.cash += amount;
      } else if (paymentType === "bank" || paymentType === "cheque") {
        /*
         * The current totals object has no separate cheque field.
         */
        totals.bank += amount;
      } else if (paymentType === "upi") {
        totals.upi += amount;
      } else if (paymentType === "credit") {
        totals.credit += amount;
      } else if (paymentType === "card") {
        totals.card += amount;
      }
    }

    return totals;
  };

  const getHotelSeries = async (voucherType) => {
    const voucher = await VoucherSeriesModel.findOne({
      cmp_id: requestCmpId,
      voucherType,
    }).session(session);

    if (!voucher) {
      throw new Error(`${voucherType} voucher series not found`);
    }

    const series = voucher.series.find((item) => item.under === "hotel");

    if (!series) {
      throw new Error(`No hotel ${voucherType} voucher series found`);
    }

    return series;
  };

  const buildReceiptPaymentDetails = (payment) => {
    const paymentType = getPaymentType(payment);

    if (paymentType === "cash") {
      return {
        cash_ledname: payment.subsource || "",
        cash_name: payment.subsource || "",
        cash_id: payment.source || null,
        bank_ledname: "",
        bank_name: "",
        bank_id: null,
        chequeNumber: "",
        chequeDate: null,
      };
    }

    return {
      cash_ledname: "",
      cash_name: "",
      cash_id: null,
      bank_ledname: payment.subsource || "",
      bank_name: payment.subsource || "",
      bank_id: payment.source || null,
      chequeNumber: "",
      chequeDate: null,
    };
  };

  const updateTallyForCheckoutTransition = async ({
    transition,
    tally,
    newPayment,
    receipt,
    party,
  }) => {
    if (!tally) {
      throw new Error(
        `Tally record not found for paymentId ${getPaymentIdKey(
          newPayment?.paymentId,
        )}`,
      );
    }

    const amount = Number(newPayment?.amount || 0);

    const newPaymentType = getPaymentType(newPayment);
    const tallyPartyId =
      isCreditPayment(newPaymentType) && newPayment?.source
        ? newPayment.source
        : party._id;
    const tallyPartyName =
      isCreditPayment(newPaymentType) && newPayment?.customerName
        ? newPayment.customerName
        : party.partyName;

    tally.party_id = tallyPartyId;
    tally.party_name = tallyPartyName;
    tally.mobile_no = party.mobileNumber || tally.mobile_no;

    if (transition === "immediate-to-credit") {
      tally.bill_pending_amt = amount;
      tally.appliedReceipts = [];
    } else if (transition === "credit-to-immediate") {
      tally.bill_pending_amt = 0;
      if (receipt) {
        tally.appliedReceipts = [
          {
            _id: receipt._id,
            receiptNumber: receipt.receiptNumber,
            settledAmount: amount,
            date: receipt.date || new Date(),
          },
        ];
      }
    } else if (transition === "immediate-to-immediate") {
      tally.bill_pending_amt = 0;
      if (receipt) {
        tally.appliedReceipts = [
          {
            _id: receipt._id,
            receiptNumber: receipt.receiptNumber,
            settledAmount: amount,
            date: receipt.date || new Date(),
          },
        ];
      }
    } else if (transition === "credit-to-credit") {
      tally.bill_pending_amt = amount;
      tally.appliedReceipts = [];
    }

    tally.markModified("appliedReceipts");
    return await tally.save({ session });
  };

  const createReceiptAndSettlementForPayment = async ({
    payment,
    tally,
    party,
    sale,
    gstNo,
    address,
  }) => {
    if (!payment?.source) {
      throw new Error(
        `Payment source is required for paymentId ${getPaymentIdKey(
          payment?.paymentId,
        )}`,
      );
    }

    if (!tally) {
      throw new Error(
        `Tally record not found for paymentId ${getPaymentIdKey(
          payment?.paymentId,
        )}`,
      );
    }

    const paymentType = getPaymentType(payment);
    const amount = Number(payment.amount || 0);
    const currentPending = Number(tally.bill_pending_amt || amount);
    const receiptSeries = await getHotelSeries("receipt");
    const receiptNumber = await generateVoucherNumber(
      requestCmpId,
      "receipt",
      receiptSeries._id.toString(),
      session,
    );

    const receipt = new ReceiptModel({
      date: new Date(),
      voucherType: "receipt",
      receiptNumber: receiptNumber.voucherNumber,
      series_id: receiptSeries._id,
      usedSeriesNumber: receiptNumber.usedSeriesNumber,
      serialNumber: receiptNumber.usedSeriesNumber,
      Primary_user_id: req.pUserId || req.owner,
      Secondary_user_id: req.sUserId,
      cmp_id: requestCmpId,
      party: buildEmbeddedParty(party, { gstNo, address }),
      billData: [
        {
          _id: tally._id,
          bill_no: sale.salesNumber,
          billId: sale._id.toString(),
          bill_date: tally.bill_date || new Date(),
          bill_pending_amt: currentPending,
          source: "sales",
          settledAmount: amount,
          remainingAmount: 0,
        },
      ],
      totalBillAmount: currentPending,
      enteredAmount: amount,
      advanceAmount: 0,
      remainingAmount: 0,
      paymentMethod: paymentType === "cash" ? "Cash" : paymentType,
      paymentDetails: buildReceiptPaymentDetails(payment),
      note: "",
      isCancelled: false,
      paymentId: payment.paymentId,
    });

    await receipt.save({ session });

    const [settlement] = await settlementModel.create(
      [
        {
          voucherNumber: receipt.receiptNumber,
          voucherId: receipt._id,
          voucherModel: "Receipt",
          voucherType: "receipt",
          amount,
          payment_mode: paymentType,
          paymentId: payment.paymentId,
          partyId: party._id,
          partyName: party.partyName,
          partyType: party.partyType || "party",
          sourceId: payment.source,
          sourceType: toSettlementSourceType(paymentType),
          cmp_id: requestCmpId,
          Primary_user_id: req.pUserId || req.owner,
          settlement_date: new Date(),
          voucher_date: new Date(),
        },
      ],
      { session },
    );

    tally.bill_pending_amt = 0;
    tally.appliedReceipts = [
      {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        settledAmount: amount,
        date: receipt.date || new Date(),
      },
    ];
    tally.markModified("appliedReceipts");
    await tally.save({ session });

    return { receipt, settlement };
  };

  try {
    session.startTransaction();

    const { id } = req.params;
    const { cmp_id } = req.query;

    if (!id || !cmp_id) {
      return await abortAndRespond(400, "id and cmp_id are required");
    }

    const sale = await salesModel
      .findOne({
        _id: id,
        cmp_id,
      })
      .session(session);

    if (!sale) {
      return await abortAndRespond(404, "Sale not found");
    }

    const { partyId, gstNo, address, payments = [] } = req.body;

    if (!partyId) {
      return await abortAndRespond(400, "partyId is required");
    }

    const party = await Party.findOne({
      _id: partyId,
      cmp_id,
    }).session(session);

    if (!party) {
      return await abortAndRespond(404, "Party not found");
    }

    /*
     * ======================================================
     * 1. Clone old Sale payments before modifying the Sale.
     * ======================================================
     */
    const oldPayments = (sale.paymentSplittingData || []).map((payment) => ({
      ...payment.toObject(),
      paymentId: payment.paymentId,
    }));
    console.log("oldPayments", oldPayments);

    const oldPaymentMap = createStrictPaymentMap(
      oldPayments,
      "old Sale paymentSplittingData",
      {
        paymentIdRequired: true,
      },
    );

    /*`
     * ======================================================
     * 2. Update Sale payments using paymentId.
     * ======================================================
     */
    const salePaymentMap = createStrictPaymentMap(
      sale.paymentSplittingData || [],
      "Sale paymentSplittingData",
      {
        paymentIdRequired: true,
      },
    );

    const incomingPaymentMap = createStrictPaymentMap(
      payments,
      "request payments",
      {
        paymentIdRequired: true,
      },
    );

    for (const [paymentIdKey, incomingPayment] of incomingPaymentMap) {
      const salePayment = salePaymentMap.get(paymentIdKey);

      /*
       * Preserve existing behavior:
       * ignore a request payment that does not belong to this Sale.
       */
      if (!salePayment) {
        continue;
      }

      updateSalePayment({
        salePayment,
        incomingPayment,
        party,
      });
    }

    sale.party = buildEmbeddedParty(party, {
      gstNo,
      address,
    });

    sale.markModified("party");
    sale.markModified("paymentSplittingData");

    await sale.save({ session });

    const finalPaymentMap = createStrictPaymentMap(
      sale.paymentSplittingData || [],
      "updated Sale paymentSplittingData",
      {
        paymentIdRequired: true,
      },
    );

    const paymentIds = sale.paymentSplittingData.map(
      (payment) => payment.paymentId,
    );

    /*
     * ======================================================
     * 3. Load Checkout.
     * ======================================================
     */
    const checkout = await CheckOut.findOne({
      cmp_id,
      voucherNumber: sale.salesNumber,
    }).session(session);

    if (!checkout) {
      return await abortAndRespond(404, "Checkout not found for this sale");
    }

    const checkoutMap = createStrictPaymentMap(
      checkout.checkoutpaymenttypedetails || [],
      "Checkout checkoutpaymenttypedetails",
    );

    /*
     * ======================================================
     * 4. Fetch active Receipts using paymentId.
     *
     * Cancelled Receipt history is intentionally excluded.
     * ======================================================
     */
    const activeReceipts = await ReceiptModel.find({
      cmp_id,

      paymentId: {
        $in: paymentIds,
      },

      isCancelled: {
        $ne: true,
      },
    }).session(session);

    const activeReceiptMap = createActiveDocumentMap(activeReceipts, "Receipt");

    /*
     * ======================================================
     * 5. Fetch active Settlements using paymentId.
     *
     * Cancelled Settlement history is intentionally excluded.
     * ======================================================
     */
    const activeSettlements = await settlementModel
      .find({
        cmp_id,

        paymentId: {
          $in: paymentIds,
        },

        isCancelled: {
          $ne: true,
        },
      })
      .session(session);

    const activeSettlementMap = createActiveDocumentMap(
      activeSettlements,
      "Settlement",
    );

    /*
     * ======================================================
     * 6. Fetch Tally records using paymentId.
     *
     * Replace hotelTallyModel with the actual imported model name.
     * ======================================================
     */
    const tallyRecords = await TallyData.find({
      cmp_id,

      paymentId: {
        $in: paymentIds,
      },
    }).session(session);

    const tallyMap = createStrictPaymentMap(tallyRecords, "Tally records");

    /*
     * Create a brand-new Receipt and Settlement for:
     *
     * Credit -> Immediate
     *
     * Cancelled Receipt/Settlement records are never reused.
     */
    const createFreshReceiptAndSettlement = async ({ payment, tally }) => {
      const paymentIdKey = getPaymentIdKey(payment.paymentId);

      const { receipt: createdReceipt, settlement: createdSettlement } =
        await createReceiptAndSettlementForPayment({
          payment,
          tally,
          party,
          sale,
          gstNo,
          address,
        });

      const refreshedTally = await TallyData.findOne({
        cmp_id,

        paymentId: payment.paymentId,
      }).session(session);

      if (!createdReceipt) {
        throw new Error(
          `Fresh Receipt was not created for paymentId ${paymentIdKey}`,
        );
      }

      if (!createdSettlement) {
        throw new Error(
          `Fresh Settlement was not created for paymentId ${paymentIdKey}`,
        );
      }

      if (getPaymentIdKey(createdReceipt.paymentId) !== paymentIdKey) {
        throw new Error(
          `Created Receipt has an incorrect paymentId for payment ${paymentIdKey}`,
        );
      }

      if (getPaymentIdKey(createdSettlement.paymentId) !== paymentIdKey) {
        throw new Error(
          `Created Settlement has an incorrect paymentId for payment ${paymentIdKey}`,
        );
      }

      return {
        receipt: createdReceipt,
        settlement: createdSettlement,
        tally: refreshedTally,
      };
    };

    /*
     * ======================================================
     * 7. Process all transitions using paymentId.
     * ======================================================
     *
     * Writes are sequential because concurrent operations using one
     * transaction session should not be executed through Promise.all().
     */
    for (const newPayment of sale.paymentSplittingData) {
      const paymentIdKey = getPaymentIdKey(newPayment.paymentId);

      if (!paymentIdKey) {
        throw new Error("Updated Sale payment is missing paymentId");
      }

      const oldPayment = oldPaymentMap.get(paymentIdKey);

      if (!oldPayment) {
        throw new Error(
          `Old Sale payment was not found for paymentId ${paymentIdKey}`,
        );
      }

      let receipt = activeReceiptMap.get(paymentIdKey);

      let settlement = activeSettlementMap.get(paymentIdKey);

      let tally = tallyMap.get(paymentIdKey);

      const oldPaymentType = getPaymentType(oldPayment);

      const newPaymentType = getPaymentType(newPayment);

      if (!oldPaymentType) {
        throw new Error(
          `Old payment mode is missing for paymentId ${paymentIdKey}`,
        );
      }

      if (!newPaymentType) {
        throw new Error(
          `New payment mode is missing for paymentId ${paymentIdKey}`,
        );
      }

      const oldIsCredit = isCreditPayment(oldPaymentType);

      const oldIsImmediate = isImmediatePayment(oldPaymentType);

      const newIsCredit = isCreditPayment(newPaymentType);

      const newIsImmediate = isImmediatePayment(newPaymentType);

      if (!oldIsCredit && !oldIsImmediate) {
        throw new Error(
          `Unsupported old payment mode "${oldPaymentType}" for paymentId ${paymentIdKey}`,
        );
      }

      if (!newIsCredit && !newIsImmediate) {
        throw new Error(
          `Unsupported new payment mode "${newPaymentType}" for paymentId ${paymentIdKey}`,
        );
      }

      /*
       * ------------------------------------------------------
       * CASE 1: Credit -> Credit
       * ------------------------------------------------------
       */
      if (oldIsCredit && newIsCredit) {
        /*
         * Credit must not have an active Receipt or Settlement.
         *
         * Do not silently cancel unexpected records because that would
         * hide historical data corruption.
         */
        if (receipt) {
          throw new Error(
            `Active Receipt unexpectedly exists for Credit paymentId ${paymentIdKey}`,
          );
        }

        if (settlement) {
          throw new Error(
            `Active Settlement unexpectedly exists for Credit paymentId ${paymentIdKey}`,
          );
        }

        /*
         * Existing Tally helper responsibilities:
         *
         * - update party/customer details
         * - update ledger information
         * - keep the outstanding pending
         * - use paymentId to find the correct Tally entry
         */
        tally = await updateTallyForCheckoutTransition({
          transition: "credit-to-credit",

          tally,
          oldPayment,
          newPayment,

          receipt: null,
          settlement: null,

          sale,
          checkout,
          party,
          cmp_id,
          session,

          requestUserId: req.sUserId,

          requestUserName: req.secUserName,
        });

        if (tally) {
          tallyMap.set(paymentIdKey, tally);
        }

        continue;
      }

      /*
       * ------------------------------------------------------
       * CASE 2: Immediate -> Immediate
       * ------------------------------------------------------
       */
      if (oldIsImmediate && newIsImmediate) {
        /*
         * Never recreate documents in this transition.
         */
        if (!receipt) {
          throw new Error(
            `Active Receipt not found for immediate paymentId ${paymentIdKey}`,
          );
        }

        if (!settlement) {
          throw new Error(
            `Active Settlement not found for immediate paymentId ${paymentIdKey}`,
          );
        }

        updateReceipt({
          receipt,
          payment: newPayment,
          party,
          gstNo,
          address,
        });

        await receipt.save({
          session,
        });

        updateSettlement({
          settlement,
          payment: newPayment,
          party,
          receipt,
        });

        await settlement.save({
          session,
        });

        /*
         * Existing Tally helper responsibilities:
         *
         * - find the Tally entry using paymentId
         * - update the exact payment source/mode
         * - update the applied Receipt information
         * - adjust applied amount if the payment amount changed
         * - do not create or cancel Tally entries
         */
        tally = await updateTallyForCheckoutTransition({
          transition: "immediate-to-immediate",

          tally,
          oldPayment,
          newPayment,
          receipt,
          settlement,

          sale,
          checkout,
          party,
          cmp_id,
          session,

          requestUserId: req.sUserId,

          requestUserName: req.secUserName,
        });

        if (tally) {
          tallyMap.set(paymentIdKey, tally);
        }

        continue;
      }

      /*
       * ------------------------------------------------------
       * CASE 3: Immediate -> Credit
       * ------------------------------------------------------
       */
      if (oldIsImmediate && newIsCredit) {
        if (!receipt) {
          throw new Error(
            `Active Receipt not found for immediate paymentId ${paymentIdKey}`,
          );
        }

        if (!settlement) {
          throw new Error(
            `Active Settlement not found for immediate paymentId ${paymentIdKey}`,
          );
        }

        cancelReceipt({
          receipt,
          party,
          gstNo,
          address,
        });

        await receipt.save({
          session,
        });

        await settlementModel.deleteOne({ _id: settlement._id }, { session });

        /*
         * Existing Tally helper responsibilities:
         *
         * - remove the Receipt application using paymentId
         * - restore the outstanding amount
         * - increase bill_pending_amt by the previously applied amount
         * - mark the outstanding as pending
         * - update party/customer details
         */
        tally = await updateTallyForCheckoutTransition({
          transition: "immediate-to-credit",

          tally,
          oldPayment,
          newPayment,
          receipt,
          settlement,

          sale,
          checkout,
          party,
          cmp_id,
          session,

          requestUserId: req.sUserId,

          requestUserName: req.secUserName,
        });

        /*
         * The cancelled documents are no longer active.
         */
        activeReceiptMap.delete(paymentIdKey);

        activeSettlementMap.delete(paymentIdKey);

        if (tally) {
          tallyMap.set(paymentIdKey, tally);
        }

        continue;
      }

      /*
       * ------------------------------------------------------
       * CASE 4: Credit -> Immediate
       * ------------------------------------------------------
       */
      if (oldIsCredit && newIsImmediate) {
        /*
         * A Credit payment must not already have active payment
         * documents.
         *
         * Cancelled historical documents are allowed and are ignored.
         */
        if (receipt) {
          throw new Error(
            `Active Receipt already exists for Credit paymentId ${paymentIdKey}`,
          );
        }

        if (settlement) {
          throw new Error(
            `Active Settlement already exists for Credit paymentId ${paymentIdKey}`,
          );
        }

        /*
         * This helper must:
         *
         * - reduce outstanding
         * - update bill_pending_amt
         * - create a fresh Receipt number
         * - create a new Receipt
         * - create a new Settlement
         * - set Receipt.paymentId
         * - set Settlement.paymentId
         * - update Tally.appliedReceipts
         *
         * Everything receives the current MongoDB session.
         */
        const createdDocuments = await createFreshReceiptAndSettlement({
          payment: newPayment,
          tally,
        });

        receipt = createdDocuments.receipt;

        settlement = createdDocuments.settlement;

        tally = createdDocuments.tally;

        activeReceiptMap.set(paymentIdKey, receipt);

        activeSettlementMap.set(paymentIdKey, settlement);

        if (tally) {
          tallyMap.set(paymentIdKey, tally);
        }

        continue;
      }

      throw new Error(
        `Unable to determine transition for paymentId ${paymentIdKey}`,
      );
    }

    /*
     * ======================================================
     * 8. Completely rebuild Checkout payments from Sale.
     * ======================================================
     *
     * The old Checkout Map is used only to preserve Checkout-specific
     * fields and subdocument IDs.
     */
    checkout.checkoutpaymenttypedetails = sale.paymentSplittingData.map(
      (salePayment) => {
        const paymentIdKey = getPaymentIdKey(salePayment.paymentId);

        const existingCheckoutPayment = checkoutMap.get(paymentIdKey);

        return buildCheckoutPaymentRow({
          salePayment,
          existingCheckoutPayment,
          party,
        });
      },
    );

    checkout.markModified("checkoutpaymenttypedetails");

    checkout.paymenttypeDetails = calculatePaymentTotals(
      sale.paymentSplittingData,
    );

    checkout.markModified("paymenttypeDetails");

    checkout.guestId = party._id || checkout.guestId;

    checkout.guestName = party.partyName || checkout.guestName;

    checkout.guestState =
      statesData.find((state) => state?.stateCode === party?.state_reference) ||
      checkout.guestState;

    checkout.guestPinCode = party.guestPinCode || checkout.guestPinCode;

    checkout.guestDetailedAddress = address || checkout.guestDetailedAddress;

    checkout.guestMobileNumber =
      party.mobileNumber || checkout.guestMobileNumber;

    checkout.gstNo = gstNo || checkout.gstNo;

    await checkout.save({
      session,
    });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      data: sale,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("updateCheckout error:", error);

    const isValidationOrIntegrityError =
      error.message?.includes("paymentId") ||
      error.message?.includes("payment mode") ||
      error.message?.includes("sourceType") ||
      error.message?.includes("Duplicate") ||
      error.message?.includes("Multiple active") ||
      error.message?.includes("Unsupported");

    return res.status(isValidationOrIntegrityError ? 400 : 500).json({
      message: isValidationOrIntegrityError ? error.message : "Server error",

      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
export const getSalesByCheckInNumber = async (req, res) => {
  try {
    const { cmp_id, checkInNumber } = req.query;

    console.log(checkInNumber);

    if (!checkInNumber || !cmp_id) {
      return res
        .status(400)
        .json({ message: "checkInNumber and cmp_id are required" });
    }

    const sales = await salesModel
      .find({
        cmp_id,

        // isCancelled: false,
        "convertedFrom.0.checkInNumber": checkInNumber,
        isPostToRoom: true,
      })
      .lean();

    if (sales.length === 0) {
      return res
        .status(404)
        .json({ message: "No sales found for the given check-in number" });
    }

    res.json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    console.error("getSalesByCheckInNumber error:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateRestaurantSalePayments = async (req, res) => {
  const session = await mongoose.startSession();

  const getPaymentIdKey = (paymentId) => {
    if (paymentId === undefined || paymentId === null) return null;
    return paymentId.toString();
  };

  const toPlainObject = (value) => {
    if (!value) return {};
    if (typeof value.toObject === "function") {
      return value.toObject({
        depopulate: true,
        virtuals: false,
        getters: false,
      });
    }
    return { ...value };
  };

  const normalizePaymentType = (sourceType) =>
    typeof sourceType === "string" ? sourceType.trim().toLowerCase() : "";

  const getPaymentType = (payment) =>
    normalizePaymentType(payment?.sourceType || payment?.type);

  const isCreditPayment = (paymentType) =>
    normalizePaymentType(paymentType) === "credit";

  const isImmediatePayment = (paymentType) =>
    ["cash", "bank", "upi", "card", "cheque"].includes(
      normalizePaymentType(paymentType),
    );

  const toSettlementSourceType = (paymentType) =>
    normalizePaymentType(paymentType) === "cash" ? "cash" : "bank";

  const buildReceiptParty = (party) => {
    const plainParty = toPlainObject(party);
    const accountGroup =
      plainParty.accountGroup_id ||
      plainParty.accountGroup?._id ||
      plainParty.accountGroup ||
      null;

    return {
      _id: plainParty._id,
      partyName: plainParty.partyName || "",
      partyType: plainParty.partyType || "party",
      accountGroupName:
        plainParty.accountGroupName ||
        plainParty.accountGroup?.accountGroup ||
        "",
      accountGroup_id: accountGroup,
      subGroupName: plainParty.subGroupName || "",
      subGroup_id: plainParty.subGroup_id || null,
      mobileNumber: plainParty.mobileNumber || "",
      country: plainParty.country || "",
      state: plainParty.state || "",
      pin: plainParty.pin || "",
      emailID: plainParty.emailID || "",
      gstNo: plainParty.gstNo || "",
      billingAddress: plainParty.billingAddress || "",
      shippingAddress: plainParty.shippingAddress || "",
      accountGroup:
        plainParty.accountGroup?.accountGroup ||
        plainParty.accountGroupName ||
        plainParty.accountGroup?.toString?.() ||
        "",
      party_master_id:
        plainParty.party_master_id || plainParty._id?.toString?.() || "",
      newAddress: plainParty.newAddress || {},
    };
  };

  const buildReceiptPaymentDetails = (payment) => {
    const paymentType = getPaymentType(payment);

    if (paymentType === "cash") {
      return {
        cash_ledname: payment.subsource || "",
        cash_name: payment.subsource || "",
        cash_id: payment.source || null,
        bank_ledname: "",
        bank_name: "",
        bank_id: null,
        chequeNumber: "",
        chequeDate: null,
      };
    }

    return {
      cash_ledname: "",
      cash_name: "",
      cash_id: null,
      bank_ledname: payment.subsource || "",
      bank_name: payment.subsource || "",
      bank_id: payment.source || null,
      chequeNumber: "",
      chequeDate: null,
    };
  };

  const createActiveDocumentMap = (records, recordName) => {
    const map = new Map();

    for (const record of records || []) {
      if (record.isCancelled === true) continue;

      const paymentIdKey = getPaymentIdKey(record?.paymentId);
      if (!paymentIdKey) continue;

      if (map.has(paymentIdKey)) {
        throw new Error(
          `Multiple active ${recordName} records found for paymentId ${paymentIdKey}`,
        );
      }

      map.set(paymentIdKey, record);
    }

    return map;
  };

  const createStrictPaymentMap = (records, recordName) => {
    const map = new Map();

    for (const record of records || []) {
      const paymentIdKey = getPaymentIdKey(record?.paymentId);
      if (!paymentIdKey) {
        throw new Error(`${recordName} contains a record without paymentId`);
      }

      if (map.has(paymentIdKey)) {
        throw new Error(
          `Duplicate paymentId "${paymentIdKey}" found in ${recordName}`,
        );
      }

      map.set(paymentIdKey, record);
    }

    return map;
  };

  const getRestaurantReceiptSeries = async (cmp_id) => {
    const voucher = await VoucherSeriesModel.findOne({
      cmp_id,
      voucherType: "receipt",
    }).session(session);

    if (!voucher) throw new Error("Receipt voucher series not found");

    const series = voucher.series?.find((item) => item.under === "restaurant");
    if (!series) throw new Error("Restaurant receipt series not found");

    return series;
  };

  const validateIncomingPayment = (payment) => {
    const paymentType = getPaymentType(payment);
    const paymentIdKey = getPaymentIdKey(payment?.paymentId);

    if (!paymentType) {
      throw new Error(`sourceType is required for paymentId ${paymentIdKey}`);
    }

    if (isImmediatePayment(paymentType) && !payment.source) {
      throw new Error(
        `Payment source is required for paymentId ${paymentIdKey}`,
      );
    }

    if (isCreditPayment(paymentType) && !payment.source) {
      throw new Error(`Credit party is required for paymentId ${paymentIdKey}`);
    }
  };

  const updateSalePayment = ({ salePayment, incomingPayment, saleParty }) => {
    validateIncomingPayment(incomingPayment);

    const paymentType = getPaymentType(incomingPayment);

    salePayment.ref_id = incomingPayment.source || salePayment.ref_id;
    salePayment.source = incomingPayment.source || salePayment.source;
    salePayment.type = paymentType;
    salePayment.sourceType = paymentType;
    salePayment.subsource =
      incomingPayment.subsource !== undefined
        ? incomingPayment.subsource
        : salePayment.subsource;
    salePayment.remarks =
      incomingPayment.remarks !== undefined
        ? incomingPayment.remarks
        : salePayment.remarks;
    salePayment.transactionNo =
      incomingPayment.transactionNo !== undefined
        ? incomingPayment.transactionNo
        : salePayment.transactionNo;
    salePayment.upiNo =
      incomingPayment.upiNo !== undefined
        ? incomingPayment.upiNo
        : salePayment.upiNo;
    salePayment.underCategory =
      incomingPayment.underCategory || salePayment.underCategory;

    if (
      incomingPayment.amount !== undefined &&
      incomingPayment.amount !== null
    ) {
      salePayment.amount = incomingPayment.amount;
    }

    if (isCreditPayment(paymentType)) {
      salePayment.customer = incomingPayment.source;
      salePayment.customerName =
        incomingPayment.customerName || salePayment.customerName || "";
    } else {
      salePayment.customer = saleParty?._id || salePayment.customer;
      salePayment.customerName =
        saleParty?.partyName || salePayment.customerName || "";
    }
  };

  const updateReceipt = ({ receipt, payment, party }) => {
    const paymentType = getPaymentType(payment);
    const amount = Number(payment.amount || 0);

    receipt.party = buildReceiptParty(party);
    receipt.paymentMethod =
      paymentType === "cash"
        ? "Cash"
        : paymentType === "bank"
          ? "Bank"
          : paymentType;
    receipt.paymentDetails = buildReceiptPaymentDetails(payment);
    receipt.enteredAmount = amount;
    receipt.totalBillAmount = Number(receipt.totalBillAmount || amount);
    receipt.remainingAmount = 0;
    receipt.paymentId = payment.paymentId;

    if (Array.isArray(receipt.billData) && receipt.billData[0]) {
      receipt.billData[0].settledAmount = amount;
      receipt.billData[0].remainingAmount = 0;
    }

    receipt.markModified("party");
    receipt.markModified("paymentDetails");
    receipt.markModified("billData");
  };

  const cancelReceipt = (receipt) => {
    receipt.isCancelled = true;
    receipt.cancelledAt = new Date();
    receipt.cancelledBy = req.sUserId;
    receipt.cancelledByName = req.secUserName;
    receipt.cancelReason = "Payment mode changed to Credit";
  };

  const updateSettlement = ({
    settlement,
    payment,
    party,
    receipt,
    cmp_id,
  }) => {
    const paymentType = getPaymentType(payment);

    settlement.paymentId = payment.paymentId;
    settlement.voucherNumber =
      receipt?.receiptNumber || settlement.voucherNumber;
    settlement.voucherId = receipt?._id || settlement.voucherId;
    settlement.voucherModel = "Receipt";
    settlement.voucherType = "receipt";
    settlement.amount = Number(payment.amount || settlement.amount || 0);
    settlement.payment_mode = paymentType;
    settlement.partyId = party._id;
    settlement.partyName = party.partyName;
    settlement.partyType = party.partyType || "party";
    settlement.sourceId = payment.source;
    settlement.sourceType = toSettlementSourceType(paymentType);
    settlement.cmp_id = cmp_id;
  };

  const updateTallyForRestaurantTransition = async ({
    transition,
    tally,
    payment,
    receipt,
    party,
    sale,
    cmp_id,
  }) => {
    const amount = Number(payment.amount || 0);

    if (!tally) {
      [tally] = await TallyData.create(
        [
          {
            Primary_user_id: req.pUserId || req.owner || sale.Primary_user_id,
            cmp_id,
            party_id: party._id,
            party_name: party.partyName,
            mobile_no: party.mobileNumber,
            bill_date: sale.date || new Date(),
            bill_no: sale.salesNumber,
            billId: sale._id,
            bill_amount: amount,
            bill_pending_amt: 0,
            accountGroup: party.accountGroup || party.accountGroup_id,
            user_id: req.sUserId,
            advanceAmount: 0,
            advanceDate: new Date(),
            classification: "Cr",
            source: "sales",
            paymentId: payment.paymentId,
          },
        ],
        { session },
      );
    }

    tally.paymentId = payment.paymentId;
    tally.party_id = party._id;
    tally.party_name = party.partyName;
    tally.mobile_no = party.mobileNumber || tally.mobile_no;
    tally.accountGroup =
      party.accountGroup || party.accountGroup_id || tally.accountGroup;
    tally.bill_amount = amount;

    if (
      transition === "immediate-to-credit" ||
      transition === "credit-to-credit"
    ) {
      tally.bill_pending_amt = amount;
      tally.appliedReceipts = [];
    } else if (
      transition === "credit-to-immediate" ||
      transition === "immediate-to-immediate"
    ) {
      tally.bill_pending_amt = 0;
      if (receipt) {
        tally.appliedReceipts = [
          {
            _id: receipt._id,
            receiptNumber: receipt.receiptNumber,
            settledAmount: amount,
            date: receipt.date || new Date(),
          },
        ];
      }
    }

    tally.markModified("appliedReceipts");
    return await tally.save({ session });
  };

  const createReceiptAndSettlementForRestaurantPayment = async ({
    payment,
    tally,
    party,
    sale,
    cmp_id,
  }) => {
    const amount = Number(payment.amount || 0);
    const receiptSeries = await getRestaurantReceiptSeries(cmp_id);
    const receiptNumber = await generateVoucherNumber(
      cmp_id,
      "receipt",
      receiptSeries._id.toString(),
      session,
    );

    const currentPending = Number(tally?.bill_pending_amt || amount);
    const receipt = new ReceiptModel({
      date: new Date(),
      voucherType: "receipt",
      receiptNumber: receiptNumber.voucherNumber,
      series_id: receiptSeries._id,
      usedSeriesNumber: receiptNumber.usedSeriesNumber,
      serialNumber: receiptNumber.usedSeriesNumber,
      Primary_user_id: req.pUserId || req.owner || sale.Primary_user_id,
      Secondary_user_id: req.sUserId || sale.Secondary_user_id,
      cmp_id,
      party: buildReceiptParty(party),
      guest: sale.guest || undefined,
      billData: [
        {
          _id: tally._id,
          bill_no: sale.salesNumber,
          billId: sale._id.toString(),
          bill_date: tally.bill_date || sale.date || new Date(),
          bill_pending_amt: currentPending,
          source: "restaurant",
          settledAmount: amount,
          remainingAmount: 0,
        },
      ],
      totalBillAmount: currentPending,
      enteredAmount: amount,
      advanceAmount: 0,
      remainingAmount: 0,
      paymentMethod:
        getPaymentType(payment) === "cash"
          ? "Cash"
          : getPaymentType(payment) === "bank"
            ? "Bank"
            : getPaymentType(payment),
      paymentDetails: buildReceiptPaymentDetails(payment),
      note: "",
      isCancelled: false,
      paymentId: payment.paymentId,
    });

    await receipt.save({ session });

    const [settlement] = await settlementModel.create(
      [
        {
          voucherNumber: receipt.receiptNumber,
          voucherId: receipt._id,
          voucherModel: "Receipt",
          voucherType: "receipt",
          amount,
          payment_mode: getPaymentType(payment),
          paymentId: payment.paymentId,
          partyId: party._id,
          partyName: party.partyName,
          partyType: party.partyType || "party",
          sourceId: payment.source,
          sourceType: toSettlementSourceType(getPaymentType(payment)),
          cmp_id,
          Primary_user_id: req.pUserId || req.owner || sale.Primary_user_id,
          settlement_date: new Date(),
          voucher_date: receipt.date || new Date(),
        },
      ],
      { session },
    );

    return { receipt, settlement };
  };

  try {
    session.startTransaction();

    const { cmp_id } = req.query;
    const { id } = req.params;
    const { payments } = req.body;

    if (!id || !cmp_id) {
      await session.abortTransaction();
      return res.status(400).json({ message: "id and cmp_id are required" });
    }

    if (!Array.isArray(payments)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "payments must be an array" });
    }

    const sale = await salesModel.findOne({ _id: id, cmp_id }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Sale not found" });
    }

    const saleParty =
      (sale.party?._id &&
        (await Party.findOne({ _id: sale.party._id, cmp_id }).session(
          session,
        ))) ||
      sale.party;

    const oldPayments = (sale.paymentSplittingData || []).map((payment) =>
      toPlainObject(payment),
    );
    const oldPaymentMap = createStrictPaymentMap(oldPayments, "Sale payment");
    const incomingPaymentMap = createStrictPaymentMap(
      payments,
      "Request payment",
    );

    if (oldPaymentMap.size !== incomingPaymentMap.size) {
      throw new Error("Request payments do not match the sale payment rows");
    }

    for (const salePayment of sale.paymentSplittingData || []) {
      const paymentIdKey = getPaymentIdKey(salePayment.paymentId);
      const incomingPayment = incomingPaymentMap.get(paymentIdKey);

      if (!incomingPayment) {
        throw new Error(
          `Request payment not found for paymentId ${paymentIdKey}`,
        );
      }

      updateSalePayment({
        salePayment,
        incomingPayment,
        saleParty,
      });
    }

    sale.markModified("paymentSplittingData");
    await sale.save({ session });

    const updatedPayments = (sale.paymentSplittingData || []).map((payment) =>
      toPlainObject(payment),
    );
    const paymentIds = updatedPayments.map((payment) => payment.paymentId);

    const activeReceipts = await ReceiptModel.find({
      cmp_id,
      "billData.bill_no": sale.salesNumber,
      isCancelled: { $ne: true },
    }).session(session);

    const receiptMap = createActiveDocumentMap(activeReceipts, "Receipt");
    const immediateOldPayments = oldPayments.filter((payment) =>
      isImmediatePayment(getPaymentType(payment)),
    );
    const receiptsWithoutPaymentId = activeReceipts.filter(
      (receipt) => !getPaymentIdKey(receipt.paymentId),
    );

    receiptsWithoutPaymentId.forEach((receipt, index) => {
      const payment = immediateOldPayments[index];
      const paymentIdKey = getPaymentIdKey(payment?.paymentId);
      if (paymentIdKey && !receiptMap.has(paymentIdKey)) {
        receiptMap.set(paymentIdKey, receipt);
      }
    });

    const receiptVoucherNumbers = activeReceipts
      .map((receipt) => receipt.receiptNumber)
      .filter(Boolean);

    const settlements = await settlementModel
      .find({
        cmp_id,
        $or: [
          { paymentId: { $in: paymentIds } },
          { voucherNumber: { $in: receiptVoucherNumbers } },
        ],
      })
      .session(session);

    const settlementMap = createActiveDocumentMap(settlements, "Settlement");
    const settlementsByVoucherNumber = new Map(
      settlements
        .filter((settlement) => settlement.voucherNumber)
        .map((settlement) => [settlement.voucherNumber, settlement]),
    );

    for (const [paymentIdKey, receipt] of receiptMap.entries()) {
      if (!settlementMap.has(paymentIdKey)) {
        const settlement = settlementsByVoucherNumber.get(
          receipt.receiptNumber,
        );
        if (settlement) settlementMap.set(paymentIdKey, settlement);
      }
    }

    const tallyRecords = await TallyData.find({
      cmp_id,
      $or: [
        { paymentId: { $in: paymentIds } },
        { billId: sale._id.toString() },
        { billId: sale._id },
        { bill_no: sale.salesNumber },
      ],
      isCancelled: { $ne: true },
    }).session(session);

    const tallyMap = createActiveDocumentMap(tallyRecords, "Tally");
    for (const payment of updatedPayments) {
      const paymentIdKey = getPaymentIdKey(payment.paymentId);
      const oldPayment = oldPaymentMap.get(paymentIdKey);
      const oldPaymentType = getPaymentType(oldPayment);
      const newPaymentType = getPaymentType(payment);
      const oldIsCredit = isCreditPayment(oldPaymentType);
      const newIsCredit = isCreditPayment(newPaymentType);
      const oldIsImmediate = isImmediatePayment(oldPaymentType);
      const newIsImmediate = isImmediatePayment(newPaymentType);

      if (!oldIsCredit && !oldIsImmediate) {
        throw new Error(
          `Unsupported old payment mode "${oldPaymentType}" for paymentId ${paymentIdKey}`,
        );
      }

      if (!newIsCredit && !newIsImmediate) {
        throw new Error(
          `Unsupported new payment mode "${newPaymentType}" for paymentId ${paymentIdKey}`,
        );
      }

      const creditParty =
        newIsCredit || oldIsCredit
          ? await Party.findOne({
              _id: payment.source || oldPayment.source || oldPayment.customer,
              cmp_id,
            }).session(session)
          : null;
      const activeParty = newIsCredit ? creditParty : saleParty;

      if (!activeParty) {
        throw new Error(`Party not found for paymentId ${paymentIdKey}`);
      }

      let receipt = receiptMap.get(paymentIdKey);
      let settlement = settlementMap.get(paymentIdKey);
      let tally = tallyMap.get(paymentIdKey);

      if (oldIsCredit && !tally) {
        tally = tallyRecords.find(
          (record) =>
            record.party_id?.toString?.() ===
              (oldPayment.source || oldPayment.customer)?.toString?.() &&
            Number(record.bill_pending_amt || 0) > 0,
        );
      }

      if (oldIsImmediate && newIsImmediate) {
        if (!receipt) {
          throw new Error(
            `Active Receipt not found for paymentId ${paymentIdKey}`,
          );
        }
        if (!settlement) {
          throw new Error(
            `Active Settlement not found for paymentId ${paymentIdKey}`,
          );
        }

        updateReceipt({ receipt, payment, party: saleParty });
        updateSettlement({
          settlement,
          payment,
          party: saleParty,
          receipt,
          cmp_id,
        });
        await receipt.save({ session });
        await settlement.save({ session });

        if (tally) {
          await updateTallyForRestaurantTransition({
            transition: "immediate-to-immediate",
            tally,
            payment,
            receipt,
            party: saleParty,
            sale,
            cmp_id,
          });
        }
      } else if (oldIsImmediate && newIsCredit) {
        if (!receipt) {
          throw new Error(
            `Active Receipt not found for paymentId ${paymentIdKey}`,
          );
        }
        if (!settlement) {
          throw new Error(
            `Active Settlement not found for paymentId ${paymentIdKey}`,
          );
        }

        receipt.paymentId = payment.paymentId;
        cancelReceipt(receipt);
        await receipt.save({ session });
        await settlementModel.deleteOne({ _id: settlement._id }, { session });

        await updateTallyForRestaurantTransition({
          transition: "immediate-to-credit",
          tally: null,
          payment,
          receipt: null,
          party: creditParty,
          sale,
          cmp_id,
        });
      } else if (oldIsCredit && newIsImmediate) {
        if (receipt) {
          throw new Error(
            `Active Receipt already exists for Credit paymentId ${paymentIdKey}`,
          );
        }
        if (settlement) {
          throw new Error(
            `Active Settlement already exists for Credit paymentId ${paymentIdKey}`,
          );
        }

        tally = await updateTallyForRestaurantTransition({
          transition: "credit-to-immediate",
          tally,
          payment,
          receipt: null,
          party: saleParty,
          sale,
          cmp_id,
        });

        const created = await createReceiptAndSettlementForRestaurantPayment({
          payment,
          tally,
          party: saleParty,
          sale,
          cmp_id,
        });

        await updateTallyForRestaurantTransition({
          transition: "credit-to-immediate",
          tally,
          payment,
          receipt: created.receipt,
          party: saleParty,
          sale,
          cmp_id,
        });
      } else if (oldIsCredit && newIsCredit) {
        await updateTallyForRestaurantTransition({
          transition: "credit-to-credit",
          tally,
          payment,
          receipt: null,
          party: creditParty,
          sale,
          cmp_id,
        });
      }
    }

    const finalSale = await salesModel
      .findOne({
        _id: id,
        cmp_id,
      })
      .session(session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Restaurant sale payments updated successfully",
      data: finalSale,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("updateRestaurantSalePayments error:", error);

    const isValidationOrIntegrityError =
      error.message?.includes("required") ||
      error.message?.includes("not found") ||
      error.message?.includes("Duplicate") ||
      error.message?.includes("Multiple active") ||
      error.message?.includes("Unsupported") ||
      error.message?.includes("do not match") ||
      error.message?.includes("already exists");

    return res.status(isValidationOrIntegrityError ? 400 : 500).json({
      message: isValidationOrIntegrityError ? error.message : "Server error",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
export const getRestaurantSales = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    const { checkInNumbers } = req.query;

    console.log("selectedCheckIns", checkInNumbers, cmp_id);

    if (!Array.isArray(checkInNumbers)) {
      return res.status(400).json({
        success: false,
        message: "selectedCheckIns must be an array",
      });
    }

    const salesData = await Promise.all(
      checkInNumbers.map(async (element) => {
        return await salesModel.find({
          cmp_id,
          isPostToRoom: true,
          "convertedFrom.checkInNumber": {
            $exists: true,
            $in: checkInNumbers,
          },
        });
      }),
    );
    console.log(salesData.length);
    const flattenedData = salesData.flat();

    return res.status(200).json({
      success: true,
      data: flattenedData,
    });
  } catch (error) {
    console.log("getRestaurantSales error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export const getTravelAgentSalesReport = async (req, res) => {
  try {
    const { cmp_id, agentId, from, to } = req.query;

    if (!cmp_id) {
      return res
        .status(400)
        .json({ success: false, message: "cmp_id is required" });
    }

    // Normalize date: handles both "YYYY-MM-DD" and "DD/MM/YYYY"
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      if (dateStr.includes("/")) {
        const [d, m, y] = dateStr.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      return dateStr;
    };

    const fromNorm = normalizeDate(from);
    const toNorm = normalizeDate(to);

    // ── Step 1: Build base match ──────────────────────────────────────────
    const checkoutFilter = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      agentId: { $exists: true, $ne: null },
    };

    if (agentId) {
      checkoutFilter.agentId = new mongoose.Types.ObjectId(agentId);
    }

    if (fromNorm || toNorm) {
      checkoutFilter.checkOutDate = {};
      if (fromNorm) checkoutFilter.checkOutDate.$gte = fromNorm;
      if (toNorm) checkoutFilter.checkOutDate.$lte = toNorm;
    }

    console.log("[TravelAgentReport] filter:", JSON.stringify(checkoutFilter));

    // ── Step 2: First fetch checkouts WITHOUT $lookup ─────────────────────
    // (to confirm data exists before debugging $lookup)
    const rawCount = await CheckOut.countDocuments(checkoutFilter);
    console.log("[TravelAgentReport] raw matching checkouts:", rawCount);

    // ── Step 3: Aggregate with FIXED $lookup using let + $expr ───────────
    const checkouts = await CheckOut.aggregate([
      { $match: checkoutFilter },

      // ✅ FIXED: use let + pipeline + $expr instead of localField/foreignField
      // This works on ALL MongoDB versions
      {
        $lookup: {
          from: "parties",
          let: { agentObjId: "$agentId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$agentObjId"] },
              },
            },
            {
              $project: {
                partyName: 1,
                mobileNumber: 1,
                gstNo: 1,
              },
            },
          ],
          as: "agentDoc",
        },
      },

      {
        $addFields: {
          agentDoc: { $arrayElemAt: ["$agentDoc", 0] },

          // Room names joined
          RoomNo: {
            $reduce: {
              input: "$selectedRooms",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  { $ifNull: ["$$this.roomName", ""] },
                ],
              },
            },
          },

          // Food plan names joined
          Plan: {
            $reduce: {
              input: "$foodPlan",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", "/"] },
                  { $ifNull: ["$$this.foodPlan", ""] },
                ],
              },
            },
          },

          // Tax sums from selectedRooms
          CGST: { $sum: "$selectedRooms.totalCgstAmt" },
          SGST: { $sum: "$selectedRooms.totalSgstAmt" },
        },
      },

      {
        $project: {
          _id: 1,
          BillNo: "$voucherNumber",
          RoomNo: 1,
          GuestName: "$guestName",
          CheckInDate: "$arrivalDate",
          CheckOutDate: "$checkOutDate",
          NoD: "$stayDays",
          Plan: 1,
          RRent: "$roomTotal",
          EBed: { $ifNull: ["$paxTotal", 0] },
          PlAmt: "$foodPlanTotal",
          TOTAL: { $toDouble: "$totalAmount" },
          CGST: 1,
          SGST: 1,
          NetAmt: { $toDouble: "$grandTotal" },

          // Agent fields — now from partyName
          agentId: "$agentDoc._id",
          agentName: "$agentDoc.partyName", // ✅ correct field
          agentMobile: "$agentDoc.mobileNumber",
          agentGst: "$agentDoc.gstNo",
        },
      },

      { $sort: { CheckInDate: 1 } },
    ]);

    console.log("[TravelAgentReport] aggregated rows:", checkouts.length);
    if (checkouts.length > 0) {
      console.log(
        "[TravelAgentReport] sample row:",
        JSON.stringify(checkouts[0]),
      );
    }

    // ── Step 4: Group by agent ────────────────────────────────────────────
    const agentSummaryMap = {};

    checkouts.forEach((row) => {
      // Use agentId as key; fallback to "unknown" if $lookup failed
      const key = row.agentId ? String(row.agentId) : `noagent_${row._id}`;
      const name =
        row.agentName || `Agent (${String(row.agentId || "?").slice(-6)})`;

      if (!agentSummaryMap[key]) {
        agentSummaryMap[key] = {
          agentId: row.agentId,
          agentName: name,
          agentMobile: row.agentMobile || "",
          agentGst: row.agentGst || "",
          totalRRent: 0,
          totalEBed: 0,
          totalPlAmt: 0,
          totalTOTAL: 0,
          totalCGST: 0,
          totalSGST: 0,
          totalNetAmt: 0,
          sales: [],
        };
      }

      const g = agentSummaryMap[key];
      g.totalRRent += Number(row.RRent || 0);
      g.totalEBed += Number(row.EBed || 0);
      g.totalPlAmt += Number(row.PlAmt || 0);
      g.totalTOTAL += Number(row.TOTAL || 0);
      g.totalCGST += Number(row.CGST || 0);
      g.totalSGST += Number(row.SGST || 0);
      g.totalNetAmt += Number(row.NetAmt || 0);

      row.SlNo = g.sales.length + 1;
      g.sales.push(row);
    });

    const agentSummary = Object.values(agentSummaryMap);

    const grandTotal = {
      totalSales: checkouts.length,
      totalRRent: agentSummary.reduce((s, a) => s + a.totalRRent, 0),
      totalEBed: agentSummary.reduce((s, a) => s + a.totalEBed, 0),
      totalPlAmt: agentSummary.reduce((s, a) => s + a.totalPlAmt, 0),
      totalTOTAL: agentSummary.reduce((s, a) => s + a.totalTOTAL, 0),
      totalCGST: agentSummary.reduce((s, a) => s + a.totalCGST, 0),
      totalSGST: agentSummary.reduce((s, a) => s + a.totalSGST, 0),
      totalNetAmt: agentSummary.reduce((s, a) => s + a.totalNetAmt, 0),
    };

    return res.status(200).json({
      success: true,
      grandTotal,
      agentSummary,
      data: checkouts,
    });
  } catch (err) {
    console.error("[getTravelAgentSalesReport] ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Agent dropdown list ──────────────────────────────────────────────────────
export const getAgentList = async (req, res) => {
  try {
    const { cmp_id } = req.query;
    if (!cmp_id) {
      return res
        .status(400)
        .json({ success: false, message: "cmp_id is required" });
    }

    // Get unique agentIds from CheckOut
    const agentIds = await CheckOut.distinct("agentId", {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      agentId: { $exists: true, $ne: null },
    });

    console.log("[getAgentList] distinct agentIds:", agentIds.length);

    // Fetch party details using let + $expr
    const agents = await CheckOut.aggregate([
      {
        $match: {
          cmp_id: new mongoose.Types.ObjectId(cmp_id),
          agentId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$agentId",
          totalSales: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "parties",
          let: { agentObjId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$agentObjId"] },
              },
            },
            {
              $project: { partyName: 1, mobileNumber: 1 },
            },
          ],
          as: "partyDoc",
        },
      },
      {
        $addFields: {
          partyDoc: { $arrayElemAt: ["$partyDoc", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          agentName: "$partyDoc.partyName",
          agentMobile: "$partyDoc.mobileNumber",
          totalSales: 1,
        },
      },
      { $sort: { agentName: 1 } },
    ]);

    return res.status(200).json({ success: true, data: agents });
  } catch (err) {
    console.error("[getAgentList] ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getFOSalesSummary = async (req, res) => {
  try {
    const { cmp_id, fromDate, toDate } = req.query;

    if (!cmp_id || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "cmp_id, fromDate and toDate are required",
      });
    }

    const startDate = new Date(`${fromDate}T00:00:00.000+05:30`);
    const endDate = new Date(`${toDate}T23:59:59.999+05:30`);

    const getSaleCheckInNumbers = (sale) => {
      if (!Array.isArray(sale?.convertedFrom)) return [];

      return [
        ...new Set(
          sale.convertedFrom
            .map((item) => item?.checkInNumber?.toString().trim())
            .filter(Boolean),
        ),
      ];
    };

    const processPayments = (paymentSplittingData = [], totals) => {
      for (const split of paymentSplittingData) {
        const splitAmount = Number(
          split?.amount ?? split?.paidAmount ?? split?.value ?? 0,
        );

        const splitType = String(
          split?.sourceType ||
            split?.type ||
            split?.mode ||
            split?.paymentMode ||
            "",
        )
          .trim()
          .toLowerCase();

        if (splitType === "cash") totals.cash += splitAmount;
        else if (splitType === "bank") totals.bank += splitAmount;
        else if (splitType === "credit") totals.credit += splitAmount;
        else if (splitType === "upi") totals.upi += splitAmount;
        else if (splitType === "card") totals.card += splitAmount;
      }
    };

    const dateRangeSales = await salesModel
      .find({
        cmp_id,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
        isCancelled: false,
      })
      .lean();

    const checkInNumbers = [
      ...new Set(dateRangeSales.flatMap((sale) => getSaleCheckInNumbers(sale))),
    ];

    if (!checkInNumbers.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const allSalesForMatchedCheckIns = await salesModel
      .find({
        cmp_id,
        isCancelled: false,
        "convertedFrom.checkInNumber": { $in: checkInNumbers },
      })
      .lean();

    const salesByCheckIn = new Map();

    for (const sale of allSalesForMatchedCheckIns) {
      const linkedCheckIns = getSaleCheckInNumbers(sale);

      for (const checkInNumber of linkedCheckIns) {
        if (!checkInNumbers.includes(checkInNumber)) continue;

        if (!salesByCheckIn.has(checkInNumber)) {
          salesByCheckIn.set(checkInNumber, new Map());
        }

        salesByCheckIn.get(checkInNumber).set(String(sale._id), sale);
      }
    }

    const checkIns = await CheckIn.find({
      cmp_id,
      voucherNumber: { $in: checkInNumbers },
    }).lean();

    const checkInMap = new Map(
      checkIns.map((item) => [String(item.voucherNumber), item]),
    );

    const checkInIds = checkIns.map((item) => item._id);

    const checkouts = await CheckOut.find({
      $or: [
        { checkInId: { $in: checkInIds } },
        { originalCheckInId: { $in: checkInIds } },
      ],
      checkOutDate: { $gte: fromDate, $lte: toDate },
    }).lean();

    const checkoutMap = new Map();

    for (const checkout of checkouts) {
      if (checkout?.checkInId) {
        checkoutMap.set(String(checkout.checkInId), checkout);
      }

      if (checkout?.originalCheckInId) {
        checkoutMap.set(String(checkout.originalCheckInId), checkout);
      }
    }

    const report = [];

    for (const checkInNumber of checkInNumbers) {
      const checkIn = checkInMap.get(String(checkInNumber));
      if (!checkIn) continue;

      const checkout = checkoutMap.get(String(checkIn._id));
      if (!checkout) continue;

      const salesForCheckIn = Array.from(
        (salesByCheckIn.get(checkInNumber) || new Map()).values(),
      );

      const roomDetails = await getFullRoomDetails(
        checkout.selectedRooms || [],
        checkout,
      );
      console.log(checkout);
      const extraPersonCount = roomDetails?.additionalPaxCount;

      const roomSaleAmount = Number(roomDetails?.taxableAmount || 0);

      const totalTax =
        Number(roomDetails?.roomTaxAmount || 0) +
        Number(roomDetails?.foodPlanTaxAmount || 0);

      const roundedTotalTax = Number(totalTax.toFixed(2));
      const cgst = Number((roundedTotalTax / 2).toFixed(2));
      const sgst = Number((roundedTotalTax / 2).toFixed(2));

      const restaurantSales = salesForCheckIn.filter(
        (sale) => sale?.isPostToRoom === true,
      );

      const rtBillNo = restaurantSales
        .map((sale) => sale?.salesNumber)
        .filter(Boolean)
        .join(", ");

      const restaurantSaleAmount = restaurantSales.reduce((sum, sale) => {
        return sum + Number(sale?.finalAmount || 0);
      }, 0);

      const modSale = Number(
        checkout?.otherChargeAmount || checkout?.otherChargeWithOutTax || 0,
      );

      const advance = Number(checkout?.totalAdvance || 0);

      const billTotal =
        restaurantSaleAmount +
        Number(roomDetails?.taxableAmount || 0) +
        Number(roomDetails?.roomTaxAmount || 0) +
        Number(roomDetails?.specificFoodPlanTotal || 0) +
        Number(roomDetails?.additionalPaxWithTax || 0) -
        advance;

      const totals = {
        cash: 0,
        bank: 0,
        credit: 0,
        upi: 0,
        card: 0,
      };

      for (const sale of salesForCheckIn) {
        if (Array.isArray(sale?.paymentSplittingData)) {
          processPayments(sale.paymentSplittingData, totals);
        }
      }

      if (Array.isArray(checkout?.paymentSplittingData)) {
        processPayments(checkout.paymentSplittingData, totals);
      }

      report.push({
        checkInNumber,
        date: checkout?.checkOutDate,
        billNo: checkout?.voucherNumber,
        grcNo: checkout?.grcno,
        agentName: checkout?.customerName,
        guestName: checkout?.guestName,
        room:
          checkout?.selectedRooms
            ?.map((r) => r?.roomName)
            .filter(Boolean)
            .join(", ") || "",
        totalRoom: checkout?.selectedRooms?.length || 0,
        days: checkout?.stayDays || 0,
        extraPerson: extraPersonCount,
        plan: checkout?.foodPlan?.[0]?.foodPlan || "",
        roomSaleAmount,
        planSaleAmount: Number(roomDetails?.taxableSpecificFoodPlan || 0),
        additionalPaxTaxAmount: Number(
          roomDetails?.additionalPaxTaxAmount || 0,
        ),
        additionalPaxWithOutTax: Number(
          roomDetails?.additionalPaxWithoutTax || 0,
        ),
        cgst,
        sgst,
        totalTax: roundedTotalTax,
        rtBillNo,
        restaurantSale: restaurantSaleAmount,
        modSale,
        advance,
        bank: totals.bank,
        cash: totals.cash,
        credit: totals.credit,
        upi: totals.upi,
        card: totals.card,
        billTotal,
      });
    }

    report.sort((a, b) =>
      String(b.grcNo || "").localeCompare(String(a.grcNo || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    console.error("getFOSalesSummary error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getFlashReportForDate = async (req, res) => {
  try {
    const { cmp_id, reportDate, reportMonth, reportYear } = req.query;

    if (!cmp_id) {
      return res
        .status(400)
        .json({ success: false, message: "cmp_id is required" });
    }

    const hasReportDate =
      reportDate !== undefined && reportDate !== null && reportDate !== "";

    const hasReportMonth =
      reportMonth !== undefined &&
      reportMonth !== null &&
      reportMonth !== "" &&
      !Number.isNaN(Number(reportMonth));

    const hasReportYear =
      reportYear !== undefined &&
      reportYear !== null &&
      reportYear !== "" &&
      !Number.isNaN(Number(reportYear));

    const pad = (n) => String(n).padStart(2, "0");
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const toLocalDateOnly = (value) => {
      if (!value) return null;

      if (value instanceof Date) {
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
      }

      if (typeof value === "string") {
        const base = value.split("T")[0];
        const parts = base.split("-");
        if (parts.length === 3) {
          const [y, m, d] = parts.map(Number);
          if (![y, m, d].some(Number.isNaN)) {
            return new Date(y, m - 1, d);
          }
        }
      }

      const d = new Date(value);
      return Number.isNaN(d.getTime())
        ? null
        : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const formatLocalYMD = (value) => {
      const d = toLocalDateOnly(value);
      if (!d) return null;
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const getTodayLocalYMD = () => formatLocalYMD(new Date());

    const getRoomUniqueKey = (room) =>
      room?.roomId?.toString?.() || room?.roomName || null;

    const org = await Organization.findById(cmp_id).lean();
    const companyName = org?.orgName || org?.name || "Hotel";

    const allRooms = await roomModal
      .find(
        { cmp_id: new mongoose.Types.ObjectId(cmp_id) },
        { roomName: 1, status: 1 },
      )
      .lean();

    const physicalRooms = allRooms.length;
    const totalRooms = allRooms.length;

    const blockedCounts = await findBlockedRooms(
      cmp_id,
      reportDate,
      reportMonth,
      reportYear,
    );

    const buildOccupancyPipeline = (fromDate, toDate, isDay = false) => {
      const pipeline = [
        { $match: { cmp_id: new mongoose.Types.ObjectId(cmp_id) } },
        {
          $lookup: {
            from: "checkouts",
            let: { checkInId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$checkInId", "$$checkInId"],
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  checkOutDate: 1,
                  checkoutTime: 1,
                  grandTotal: 1,
                  otherCharges: 1,
                  otherAmount: 1,
                  foodPlanTotal: 1,
                  selectedRooms: 1,
                  foodPlan: 1,
                },
              },
            ],
            as: "checkoutDetails",
          },
        },
        {
          $addFields: {
            checkoutDoc: { $first: "$checkoutDetails" },
            rawNewCheckoutDate: {
              $ifNull: [
                { $first: "$checkoutDetails.checkOutDate" },
                "$checkOutDate",
              ],
            },
            newCheckoutTime: {
              $ifNull: [
                { $first: "$checkoutDetails.checkoutTime" },
                "$checkOutTime",
              ],
            },
          },
        },
        {
          $addFields: {
            arrivalDateObj: {
              $dateFromString: {
                dateString: "$arrivalDate",
                onError: null,
                onNull: null,
              },
            },
            newCheckoutDateObj: {
              $dateFromString: {
                dateString: "$rawNewCheckoutDate",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $project: {
            checkoutDetails: 0,
            rawNewCheckoutDate: 0,
          },
        },
      ];

      if (fromDate && toDate) {
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        endDate.setDate(endDate.getDate());

        pipeline.push({
          $match: {
            $or: [
              {
                status: "checkOut",
                newCheckoutDateObj: {
                  $gt: startDate,
                },
                arrivalDateObj: {
                  $lte: endDate,
                },
              },
              {
                status: { $nin: ["checkOut", "cancelled"] },
                arrivalDateObj: {
                  $lte: endDate,
                },
              },
            ],
          },
        });
      }

      return pipeline;
    };

    const getDayOccupancySummary = async (date) => {
      const checkins = await CheckIn.aggregate(
        buildOccupancyPipeline(date, date, true),
      );

      const occupiedRoomNames = new Set();
      console.log("checkins", checkins);
      checkins.forEach((doc) => {
        (doc?.selectedRooms || []).forEach((room) => {
          if (room?.isSwapped) return;
          if (room?.roomName) occupiedRoomNames.add(room.roomName);
        });
      });

      let occupiedCount = 0;
      let vacantCount = 0;
      let cleaningCount = 0;
      let blockedCount = 0;

      allRooms.forEach((room) => {
        const statusRaw = String(room.status || "").toLowerCase();
        let status = "Vacant";

        if (occupiedRoomNames.has(room.roomName)) {
          status = "Occupied";
        } else if (statusRaw === "cleaning" || statusRaw === "dirty") {
          status = "Cleaning";
        } else if (
          statusRaw === "blocked" ||
          statusRaw === "block" ||
          statusRaw === "household"
        ) {
          status = "Blocked";
        } else {
          status = "Vacant";
        }

        if (status === "Occupied") occupiedCount += 1;
        else if (status === "Vacant") vacantCount += 1;
        else if (status === "Cleaning") cleaningCount += 1;
        else if (status === "Blocked") blockedCount += 1;
      });

      return {
        checkins,
        occupiedCount,
        vacantCount,
        cleaningCount,
        blockedCount,
        totalRooms: allRooms.length,
        saleableRooms: allRooms.length - blockedCount,
      };
    };

    const getOccupiedRoomNights = (checkins = [], fromDate, toDate) => {
      if (!Array.isArray(checkins)) return 0;

      const reportStart = toLocalDateOnly(fromDate);
      const reportEnd = toLocalDateOnly(toDate);
      if (!reportStart || !reportEnd) return 0;

      const reportEndExclusive = new Date(reportEnd);
      reportEndExclusive.setDate(reportEndExclusive.getDate() + 1);

      let roomNights = 0;

      checkins.forEach((doc) => {
        const arrival = toLocalDateOnly(doc?.arrivalDateObj);
        if (!arrival) return;

        const checkout = doc?.newCheckoutDateObj
          ? toLocalDateOnly(doc.newCheckoutDateObj)
          : reportEndExclusive;

        const departureExclusive =
          checkout && checkout < reportEndExclusive
            ? checkout
            : reportEndExclusive;

        const stayStart = arrival > reportStart ? arrival : reportStart;
        const stayEndExclusive =
          departureExclusive > stayStart ? departureExclusive : stayStart;

        const days = Math.max(
          0,
          Math.round((stayEndExclusive - stayStart) / MS_PER_DAY),
        );

        const roomCount = Array.isArray(doc?.selectedRooms)
          ? doc.selectedRooms.filter((r) => !r?.isSwapped).length
          : 0;

        roomNights += days * roomCount;
      });

      return roomNights;
    };

    const processCheckins = async (checkins, fromDate, toDate, roomMeta) => {
      const { totalRooms, blockedRooms, saleableRooms, periodDays, cmp_id } =
        roomMeta;

      const startDate = toLocalDateOnly(fromDate);
      const endDate = toLocalDateOnly(toDate);
      const endExclusive = new Date(endDate);
      endExclusive.setDate(endExclusive.getDate() + 1);

      const occupiedRoomKeys = new Set();

      let paxDomestic = 0;
      let paxForeign = 0;
      let roomApartment = 0;
      let roomExtraBed = 0;
      let foodPlanTotal = 0;
      let modRevenues = 0;
      let grandTotal = 0;

      const restaurantDetails = await fetchRestaurantDetails(
        cmp_id,
        startDate,
        endDate,
      );
      console.log("restaurantDetails", restaurantDetails);

      const fbRoomService = Number(
        restaurantDetails?.restaurantServiceTotal || 0,
      );
      const fbRestaurant = Number(restaurantDetails?.restaurantTotal || 0);

      checkins.forEach((doc) => {
        const country =
          doc?.guestCountry || doc?.country || doc?.guestDetails?.country || "";

        const domestic = String(country).trim().toLowerCase() === "india";
        const checkoutDoc = doc?.checkoutDoc || {};

        const checkoutDate = toLocalDateOnly(doc?.newCheckoutDateObj);
        const checkoutInRange =
          checkoutDate &&
          checkoutDate >= startDate &&
          checkoutDate < endExclusive;

        (doc?.selectedRooms || []).forEach((room) => {
          if (room?.isSwapped) return;

          const roomKey = getRoomUniqueKey(room);
          if (roomKey) occupiedRoomKeys.add(roomKey);

          const pax = Number(room?.pax || 0);
          if (domestic) paxDomestic += pax;
          else paxForeign += pax;

          const tariff = Number(Math.round(room?.priceLevelRate) || 0);

          roomApartment += tariff;

          const extraBed = (doc?.additionalPaxDetails || []).reduce(
            (acc, item) =>
              item?.roomId?.toString() === room?.roomId?.toString()
                ? acc + Number(item?.rate || 0)
                : acc,
            0,
          );

          roomExtraBed += extraBed;
        });

        foodPlanTotal += (doc?.foodPlan || []).reduce(
          (acc, item) => acc + Number(item?.rate || 0),
          0,
        );

        if (checkoutInRange) {
          modRevenues += Number(
            checkoutDoc?.otherCharges || checkoutDoc?.otherAmount || 0,
          );

          grandTotal += Number(checkoutDoc?.grandTotal || 0);
        }
      });

      const occupiedCount = occupiedRoomKeys.size;
      const totalPax = paxDomestic + paxForeign;

      const occupiedPaid = occupiedCount;
      // const occupiedComp = 0;
      const totalOccupied = occupiedPaid;

      const occPercent = totalRooms > 0 ? (occupiedPaid / totalRooms) * 100 : 0;

      const roomTotal = roomApartment + roomExtraBed;
      const fbTotal = foodPlanTotal + fbRoomService + fbRestaurant;

      const arrTotalRooms = totalRooms > 0 ? roomTotal / totalRooms : 0;
      const arrSaleableRooms =
        saleableRooms > 0 ? roomTotal / saleableRooms : 0;
      const arrOccupiedRooms = occupiedPaid > 0 ? roomTotal / occupiedPaid : 0;

      if (grandTotal === 0) {
        grandTotal = roomTotal + fbTotal + modRevenues;
      }

      return {
        totalRooms,
        blockedRooms,
        saleableRooms,
        periodDays: periodDays || 1,
        occupiedPaid,
        // occupiedComp,
        totalOccupied,
        paxDomestic,
        paxForeign,
        totalPax,
        adults: totalPax,
        children: 0,
        males: totalPax,
        females: 0,
        noShows: 0,
        occPercent: Number(occPercent.toFixed(2)),
        arrTotalRooms: Number(arrTotalRooms.toFixed(2)),
        arrSaleableRooms: Number(arrSaleableRooms.toFixed(2)),
        arrOccupiedRooms: Number(arrOccupiedRooms.toFixed(2)),
        roomApartment: Number(roomApartment.toFixed(2)),
        roomExtraBed: Number(roomExtraBed.toFixed(2)),
        roomTotal: Number(roomTotal.toFixed(2)),
        fbPlanRate: Number(foodPlanTotal.toFixed(2)),
        fbRoomService: Number(fbRoomService.toFixed(2)),
        fbRestaurant: Number(fbRestaurant.toFixed(2)),
        fbTotal: Number(fbTotal.toFixed(2)),
        modRevenues: Number(modRevenues.toFixed(2)),
        otherRevenues: 0,
        grandTotal: Number(grandTotal.toFixed(2)),
      };
    };

    const applyRoomNightOverrides = (
      numbers,
      roomMeta,
      paidOccupiedNights,
      compOccupiedNights = 0,
    ) => {
      const { totalRoomNights, blockedRoomNights, saleableRoomNights } =
        roomMeta;

      numbers.totalRooms = totalRoomNights;
      numbers.blockedRooms = blockedRoomNights;
      numbers.saleableRooms = saleableRoomNights;

      numbers.occupiedPaid = paidOccupiedNights;
      // numbers.occupiedComp = compOccupiedNights;
      numbers.totalOccupied = paidOccupiedNights + compOccupiedNights;

      numbers.occPercent =
        totalRoomNights > 0
          ? Number(((numbers.occupiedPaid / totalRoomNights) * 100).toFixed(2))
          : 0;

      const roomTotal = numbers.roomTotal || 0;

      numbers.arrTotalRooms =
        totalRoomNights > 0
          ? Number((roomTotal / totalRoomNights).toFixed(2))
          : 0;

      numbers.arrSaleableRooms =
        saleableRoomNights > 0
          ? Number((roomTotal / saleableRoomNights).toFixed(2))
          : 0;

      numbers.arrOccupiedRooms =
        paidOccupiedNights > 0
          ? Number((roomTotal / paidOccupiedNights).toFixed(2))
          : 0;

      return numbers;
    };

    let reportData = {};

    if (hasReportDate) {
      const daySummary = await getDayOccupancySummary(reportDate);

      const numbers = await processCheckins(
        daySummary.checkins,
        reportDate,
        reportDate,
        {
          totalRooms: daySummary.totalRooms,
          blockedRooms: daySummary.blockedCount,
          saleableRooms: daySummary.saleableRooms,
          periodDays: 1,
          cmp_id,
        },
      );

      numbers.totalRooms = daySummary.totalRooms;
      numbers.blockedRooms = daySummary.blockedCount;
      numbers.saleableRooms = daySummary.saleableRooms;
      numbers.occupiedPaid = daySummary.occupiedCount;
      // numbers.occupiedComp = 0;
      numbers.totalOccupied = daySummary.occupiedCount;

      numbers.occPercent =
        daySummary.totalRooms > 0
          ? Number(
              (
                (daySummary.occupiedCount / daySummary.totalRooms) *
                100
              ).toFixed(2),
            )
          : 0;

      numbers.arrTotalRooms =
        daySummary.totalRooms > 0
          ? Number((numbers.roomTotal / daySummary.totalRooms).toFixed(2))
          : 0;

      numbers.arrSaleableRooms =
        daySummary.saleableRooms > 0
          ? Number((numbers.roomTotal / daySummary.saleableRooms).toFixed(2))
          : 0;

      numbers.arrOccupiedRooms =
        daySummary.occupiedCount > 0
          ? Number((numbers.roomTotal / daySummary.occupiedCount).toFixed(2))
          : 0;

      const dateObj = toLocalDateOnly(reportDate);

      reportData = {
        companyName,
        fromDate: reportDate,
        toDate: reportDate,
        dayLabel: dateObj?.toLocaleDateString("en-GB"),
        monthLabel: dateObj?.toLocaleString("en-GB", { month: "long" }),
        occupiedComp: blockedCounts?.data?.householdDaily || 0,
        ...numbers,
      };
    } else if (hasReportMonth && hasReportYear) {
      const monthNum = Number(reportMonth);
      const yearNum = Number(reportYear);

      if (monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: "reportMonth must be between 1 and 12",
        });
      }

      const monthStart = `${yearNum}-${pad(monthNum)}-01`;
      const monthLastDay = new Date(yearNum, monthNum, 0).getDate();
      const monthFull = `${yearNum}-${pad(monthNum)}-${pad(monthLastDay)}`;
      const todayStr = getTodayLocalYMD();
      const monthEnd = monthFull;
      // todayStr >= monthStart && todayStr <= monthFull ? todayStr : monthFull;

      console.log("endDate");

      const roomMeta = await getRoomMetricsForPeriod({
        reportType: "month",
        fromDate: monthStart,
        toDate: monthEnd,
        totalPhysicalRooms: physicalRooms,
        blockedCounts,
        cmp_id,
      });

      const checkins = await CheckIn.aggregate(
        buildOccupancyPipeline(monthStart, monthEnd, false),
      );

      const numbers = await processCheckins(checkins, monthStart, monthEnd, {
        totalRooms,
        blockedRooms: roomMeta.blockedRoomNights,
        saleableRooms: roomMeta.saleableRoomNights,
        periodDays: roomMeta.periodDays,
        cmp_id,
      });

      const paidOccupiedNights = getOccupiedRoomNights(
        checkins,
        monthStart,
        monthEnd,
      );

      applyRoomNightOverrides(numbers, roomMeta, paidOccupiedNights, 0);

      const monthLabel = new Date(yearNum, monthNum - 1, 1).toLocaleString(
        "en-GB",
        { month: "long" },
      );

      reportData = {
        companyName,
        fromDate: monthStart,
        toDate: monthEnd,
        dayLabel: monthEnd,
        monthLabel,
        selectedMonth: monthNum,
        selectedYear: yearNum,
        fullMonthDays: monthLastDay,
        occupiedComp: blockedCounts?.data?.householdMonthly || 0,
        ...numbers,
      };
    } else if (hasReportYear) {
      const year = Number(reportYear);

      const yearStart = `${year}-04-01`;
      const fiscalEndStr = `${year + 1}-03-31`;
      const todayStr = getTodayLocalYMD();
      const yearEnd = todayStr > fiscalEndStr ? fiscalEndStr : todayStr;

      const roomMeta = await getRoomMetricsForPeriod({
        reportType: "year",
        fromDate: yearStart,
        toDate: yearEnd,
        totalPhysicalRooms: physicalRooms,
        blockedCounts,
        cmp_id,
      });

      const checkins = await CheckIn.aggregate(
        buildOccupancyPipeline(yearStart, yearEnd, false),
      );

      const numbers = await processCheckins(checkins, yearStart, yearEnd, {
        totalRooms,
        blockedRooms: roomMeta.blockedRoomNights,
        saleableRooms: roomMeta.saleableRoomNights,
        periodDays: roomMeta.periodDays,
        cmp_id,
      });

      const paidOccupiedNights = getOccupiedRoomNights(
        checkins,
        yearStart,
        yearEnd,
      );

      applyRoomNightOverrides(numbers, roomMeta, paidOccupiedNights, 0);

      reportData = {
        companyName,
        fromDate: yearStart,
        toDate: yearEnd,
        dayLabel: `${yearStart} to ${yearEnd}`,
        monthLabel: `FY ${year}-${year + 1}`,
        selectedYear: year,
        occupiedComp: blockedCounts?.data?.householdYearly || 0,
        ...numbers,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide reportDate OR reportMonth+reportYear OR reportYear",
      });
    }

    return res.json({ success: true, data: reportData });
  } catch (err) {
    console.error("Flash report error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error generating flash report",
      error: err.message,
    });
  }
};

export const getCancellationReport = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { startDate, endDate, cancelType = "all", owner } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID (cmp_id) is required",
      });
    }

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Owner ID format",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const start = new Date(`${startDate}T00:00:00.000+05:30`);
    const end = new Date(`${endDate}T23:59:59.999+05:30`);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be later than end date",
      });
    }

    const cmpObjectId = new mongoose.Types.ObjectId(cmp_id);

    const buildBaseQuery = () => ({
      cmp_id: cmpObjectId,
      status: "cancelled",
    });

    const typesToFetch =
      cancelType === "all"
        ? ["booking", "checkin", "checkout", "kot", "sale", "receipt"]
        : [cancelType];

    const results = [];
    const summary = {
      total: 0,
      booking: 0,
      checkin: 0,
      checkout: 0,
      kot: 0,
      sale: 0,
      receipt: 0,
    };

    if (typesToFetch.includes("booking")) {
      const bookingCancels = await Booking.find({
        ...buildBaseQuery(),
        updatedAt: { $gte: start, $lte: end },
      })
        .populate("Secondary_user_id", "name")
        .select(
          "voucherNumber updatedAt Secondary_user_id cancelReason bookingDate status cancelledAt cancelledBy createdAt _id",
        );

      bookingCancels.forEach((b) => {
        results.push({
          cancelType: "booking",
          voucherNumber: b.voucherNumber || "-",
          voucherId: b._id,
          cancelledAt: b.cancelledAt || null,
          cancelledBy: b.cancelledBy || "-",
          cancelledByName: b.Secondary_user_id?.name || "-",
          reason: b.cancelReason || "-",
          referenceNumber: b.voucherNumber || "-",
          bookingDate: b.bookingDate || "-",
          date: b.createdAt || "-",
        });
      });

      summary.booking += bookingCancels.length;
      summary.total += bookingCancels.length;
    }

    if (typesToFetch.includes("checkin")) {
      const checkinCancels = await CheckIn.find({
        ...buildBaseQuery(),
        updatedAt: { $gte: start, $lte: end },
      })
        .populate("Secondary_user_id", "name")
        .select(
          "voucherNumber updatedAt Secondary_user_id cancelReason guestName status cancelledAt cancelledBy createdAt _id",
        );

      checkinCancels.forEach((c) => {
        results.push({
          cancelType: "checkin",
          voucherNumber: c.voucherNumber || "-",
          voucherId: c._id,
          cancelledAt: c.cancelledAt || null,
          cancelledBy: c.cancelledBy || "-",
          cancelledByName: c.Secondary_user_id?.name || "-",
          reason: c.cancelReason || "-",
          referenceNumber: c.voucherNumber || "-",
          guestName: c.guestName || "-",
          date: c.createdAt || "-",
        });
      });

      summary.checkin += checkinCancels.length;
      summary.total += checkinCancels.length;
    }

    if (typesToFetch.includes("checkout")) {
      const checkoutCancels = await CheckOut.find({
        ...buildBaseQuery(),
        updatedAt: { $gte: start, $lte: end },
      })
        .populate("Secondary_user_id", "name")
        .select(
          "voucherNumber updatedAt Secondary_user_id cancelReason guestName status cancelledAt cancelledBy createdAt _id",
        );

      checkoutCancels.forEach((c) => {
        results.push({
          cancelType: "checkout",
          voucherNumber: c.voucherNumber || "-",
          voucherId: c._id,
          cancelledAt: c.cancelledAt || null,
          cancelledBy: c.ScancelledBy || "-",
          cancelledByName: c.Secondary_user_id?.name || "-",
          reason: c.cancelReason || "-",
          referenceNumber: c.voucherNumber || "-",
          guestName: c.guestName || "-",
          date: c.createdAt || "-",
        });
      });

      summary.checkout += checkoutCancels.length;
      summary.total += checkoutCancels.length;
    }

    if (typesToFetch.includes("kot")) {
      const kotCancels = await Kot.find({
        ...buildBaseQuery(),
        cancelledAt: { $gte: start, $lte: end },
      })
        .populate("secondary_user_id", "name")
        .populate("cancelledBy", "name")
        .select(
          "voucherNumber cancelledAt cancelledBy secondary_user_id cancelReason tableNumber createdAt _id",
        );

      kotCancels.forEach((k) => {
        results.push({
          cancelType: "kot",
          voucherNumber: k.voucherNumber || "-",
          voucherId: k._id,
          cancelledAt: k.cancelledAt || null,
          cancelledBy: k.cancelledBy || "-",
          cancelledByName:
            k.secondary_user_id?.name || k.cancelledBy?.name || "-",
          reason: k.cancelReason || "-",
          referenceNumber: k.voucherNumber || "-",
          tableNumber: k.tableNumber || "-",
          date: k.createdAt || "-",
        });
      });

      summary.kot += kotCancels.length;
      summary.total += kotCancels.length;
    }

    if (typesToFetch.includes("receipt")) {
      const receiptCancels = await ReceiptModel.find({
        cmp_id: cmpObjectId,
        isCancelled: true,
        updatedAt: { $gte: start, $lte: end },
      })
        .populate("Secondary_user_id", "name")
        .lean();

      receiptCancels.forEach((r) => {
        results.push({
          cancelType: "receipt",
          voucherNumber: r.receiptNumber || "-",
          voucherId: r._id,
          cancelledAt: r.cancelledAt || null,
          cancelledBy: r.cancelledBy || "-",
          cancelledByName: r.Secondary_user_id?.name || "-",
          reason: r.cancelReason || "-",
          referenceNumber: r.voucherNumber || "-",
          tableNumber: r.tableNumber || "-",
          date: r.createdAt || "-",
        });
      });

      summary.receipt += receiptCancels.length;
      summary.total += receiptCancels.length;
    }

    if (typesToFetch.includes("sale")) {
      const saleCancels = await salesModel
        .find({
          cmp_id: cmpObjectId,
          isCancelled: true,
          updatedAt: { $gte: start, $lte: end },
        })
        .populate("Secondary_user_id", "name")
        .populate("cancelledBy", "name")
        .select(
          "salesNumber updatedAt cancelledAt cancelledBy cancelledByName cancelReason partyName Secondary_user_id date _id",
        );

      saleCancels.forEach((s) => {
        results.push({
          cancelType: "sale",
          voucherNumber: s.salesNumber || "-",
          voucherId: s._id,
          cancelledAt: s.cancelledAt || null,
          cancelledBy: s.cancelledBy || "-",
          cancelledByName:
            s.Secondary_user_id?.name || s.cancelledBy?.name || "-",
          reason: s.cancelReason || "-",
          referenceNumber: s.salesNumber || "-",
          partyName: s.partyName || "-",
          date: s.date || "-",
        });
      });

      summary.sale += saleCancels.length;
      summary.total += saleCancels.length;
    }

    results.sort(
      (a, b) =>
        new Date(a.cancelledAt || 0).getTime() -
        new Date(b.cancelledAt || 0).getTime(),
    );

    return res.json({
      success: true,
      data: results,
      summary,
      companyId: cmp_id,
      owner,
      dateRange: {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      },
      message: `Found ${results.length} cancellation records`,
    });
  } catch (error) {
    console.error("Error fetching cancellation report:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

export const additionalPaxDefaultSetting = async (req, res) => {
  try {
    const { cmp_id, id, selectedModal } = req.params;
    let modal = AdditionalPax;
    if (selectedModal == "FoodPlan") {
      modal = FoodPlan;
    }

    await modal.updateMany({ cmp_id }, { $set: { isDefault: false } });

    const updateAdditionalPax = await modal.findByIdAndUpdate(
      id,
      { $set: { isDefault: true } },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: `${selectedModal == "FoodPlan" ? "Food Plan" : "Additional Pax"} is updated successfully}`,
      data: updateAdditionalPax,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getDefault = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    let defaultPax = await AdditionalPax.findOne({
      cmp_id,
      isDefault: true,
    });

    if (!defaultPax) {
      defaultPax = await AdditionalPax.findOne({ cmp_id });
    }
    if (!defaultPax) {
      return res.status(404).json({
        success: false,
        message: "Default pax not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: defaultPax,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getDefaultPlan = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    let defaultPlan = await FoodPlan.findOne({
      cmp_id,
      isDefault: true,
    });

    if (!defaultPlan) {
      defaultPlan = await FoodPlan.findOne({ cmp_id });
    }
    if (!defaultPlan) {
      return res.status(404).json({
        success: false,
        message: "Default pax not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: defaultPlan,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getSpecificDataForPrint = async (req, res) => {
  try {
    const { cmp_id, id, under } = req.params;

    const queryConfig = {
      checkout: { model: CheckOut, filter: { cmp_id, _id: id } },
      sale: { model: CheckOut, filter: { cmp_id, voucherNumber: id } },
      kot: { model: Kot, filter: { cmp_id, _id: id } },
      booking: { model: Booking, filter: { cmp_id, _id: id } },
      checkin: { model: CheckIn, filter: { cmp_id, _id: id } },
    };

    const populateFields = [
      "customerId",
      "guestId",
      "agentId",
      "isHotelAgent",
      "selectedRooms.selectedPriceLevel",
      "bookingId",
      "checkInId",
    ];

    if (under !== "kot") {
    }

    const currentConfig = queryConfig[under];

    if (!currentConfig) {
      return res.status(400).json({
        success: false,
        message: "Invalid print type",
      });
    }

    let query = currentConfig.model.find(currentConfig.filter);

    if (under !== "kot") {
      populateFields.forEach((field) => {
        query = query.populate(field);
      });
    }
    const data = await query;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: `${under} data not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const loginReport = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    const {
      page = 1,
      limit = 20,
      search = "",
      fromDate,
      toDate,
      status,
      bookingType,
      guestName,
      mobileNumber,
    } = req.query;

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    // Date Filter
    if (fromDate || toDate) {
      filter.arrivalDate = {};

      if (fromDate) {
        filter.arrivalDate.$gte = fromDate;
      }

      if (toDate) {
        filter.arrivalDate.$lte = toDate;
      }
    }

    // Booking Type
    if (bookingType && bookingType !== "all") {
      filter.bookingType = bookingType;
    }

    // Guest Name
    if (guestName) {
      filter.customerName = {
        $regex: guestName,
        $options: "i",
      };
    }

    // Mobile Number
    if (mobileNumber) {
      filter.mobileNumber = {
        $regex: mobileNumber,
      };
    }

    // Search
    if (search.trim()) {
      const searchValue = search.trim();

      filter.$or = [
        {
          voucherNumber: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: searchValue,
            $options: "i",
          },
        },
        {
          mobileNumber: {
            $regex: searchValue,
          },
        },
        {
          "selectedRooms.roomName": {
            $regex: searchValue,
            $options: "i",
          },
        },
      ];
    }

    // -----------------------------
    // Create Summary Filter BEFORE status filter
    // -----------------------------
    const summaryFilter = {
      ...filter,
    };

    if (filter.arrivalDate) {
      summaryFilter.arrivalDate = { ...filter.arrivalDate };
    }

    if (filter.$or) {
      summaryFilter.$or = [...filter.$or];
    }

    // -----------------------------
    // Status Filter (Listing only)
    // -----------------------------
    if (status && status !== "all") {
      filter.$and = filter.$and || [];

      if (status === "checkIn") {
        filter.$and.push({
          $or: [{ status: "" }, { status: "checkIn" }, { status: null }],
        });
      } else if (status === "checkOut") {
        filter.$and.push({
          $or: [
            { status: "checkOut" },
            { status: "CheckOut" },
            { status: "Checkout" },
          ],
        });
      } else if (status === "cancelled") {
        filter.$and.push({
          $or: [{ status: "cancelled" }, { status: "Cancelled" }],
        });
      }
    }

    // console.log("Filter:", filter);
    // console.log("Summary Filter:", summaryFilter);

    const [bookings, totalBookings, groupedStatus] = await Promise.all([
      CheckIn.find(filter)
        .populate("Secondary_user_id", "username name")
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      CheckIn.countDocuments(filter),

      CheckIn.aggregate([
        {
          $match: summaryFilter,
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

    const summary = {
      total: 0,
      checkIn: 0,
      checkOut: 0,
      cancelled: 0,
    };

    groupedStatus.forEach((item) => {
      const count = Number(item.count || 0);

      summary.total += count;

      if (item._id === "" || item._id === "checkIn" || item._id === null) {
        summary.checkIn += count;
      } else if (
        item._id === "checkOut" ||
        item._id === "CheckOut" ||
        item._id === "Checkout"
      ) {
        summary.checkOut += count;
      } else if (item._id === "cancelled" || item._id === "Cancelled") {
        summary.cancelled += count;
      }
    });

    const processedBookings = bookings.map((booking) => ({
      ...booking,
      createdBy:
        booking.Secondary_user_id?.username ||
        booking.Secondary_user_id?.name ||
        "-",
    }));

    const totalPages = Math.ceil(totalBookings / limitNumber);
    console.log({
      page: pageNumber,
      limit: limitNumber,
      returned: bookings.length,
      total: totalBookings,
      totalPages,
      hasMore: pageNumber < totalPages,
    });

    return res.status(200).json({
      success: true,
      data: processedBookings,
      summary,
      pagination: {
        total: totalBookings,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasMore: pageNumber < totalPages,
      },
    });
  } catch (error) {
    console.error("loginReport error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const loginReportExport = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    const {
      type,
      search = "",
      fromDate,
      toDate,
      status,
      bookingType,
      guestName,
      mobileNumber,
    } = req.query;

    console.log("Export Query:", req.query); // Remove after testing

    const filter = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    // Date Filter
    if (fromDate || toDate) {
      filter.arrivalDate = {};

      if (fromDate) filter.arrivalDate.$gte = fromDate;
      if (toDate) filter.arrivalDate.$lte = toDate;
    }

    // Booking Type
    if (bookingType && bookingType !== "all") {
      filter.bookingType = bookingType;
    }

    // Guest Name
    if (guestName) {
      filter.customerName = {
        $regex: guestName,
        $options: "i",
      };
    }

    // Mobile Number
    if (mobileNumber) {
      filter.mobileNumber = {
        $regex: mobileNumber,
      };
    }

    // Search
    if (search.trim()) {
      filter.$or = [
        {
          voucherNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          customerName: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          mobileNumber: {
            $regex: search.trim(),
          },
        },
        {
          "selectedRooms.roomName": {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // Status Filter
    if (status && status !== "all") {
      filter.$and = [];

      if (status === "checkIn") {
        filter.$and.push({
          $or: [{ status: "" }, { status: "checkIn" }, { status: null }],
        });
      } else if (status === "checkOut") {
        filter.$and.push({
          $or: [
            { status: "checkOut" },
            { status: "CheckOut" },
            { status: "Checkout" },
          ],
        });
      } else if (status === "cancelled") {
        filter.$and.push({
          $or: [{ status: "cancelled" }, { status: "Cancelled" }],
        });
      }
    }

    const bookings = await CheckIn.find(filter)
      .populate("Secondary_user_id", "username name")
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .lean();
    const processedBookings = bookings.map((booking) => {
      const roomNameById = (id) => {
        const room = booking.selectedRooms?.find(
          (r) => String(r.roomId) === String(id),
        );

        return room?.roomName || "-";
      };

      return {
        ...booking,

        guestName: booking.guestName || booking.customerName || "-",

        room:
          booking.selectedRooms?.map((room) => room.roomName).join(", ") || "-",

        createdBy:
          booking.Secondary_user_id?.username ||
          booking.Secondary_user_id?.name ||
          "-",

        created: booking.createdAt
          ? new Date(booking.createdAt).toLocaleString("en-IN")
          : "-",

        updated: booking.updatedAt
          ? new Date(booking.updatedAt).toLocaleString("en-IN")
          : "-",

        roomSwapHistory: booking.roomSwapHistory?.length
          ? booking.roomSwapHistory.map((swap) => ({
              from: roomNameById(swap.fromRoomId),
              to: roomNameById(swap.toRoomId),
              reason: swap.reason || "-",
              date: swap.swapDate
                ? new Date(swap.swapDate).toLocaleString("en-IN")
                : "-",
            }))
          : [],

        partialCheckoutHistory: booking.partialCheckoutHistory?.length
          ? booking.partialCheckoutHistory.map((pc) => ({
              saleVoucherNumber: pc.saleVoucherNumber || "-",
              rooms:
                pc.roomsCheckedOut?.map((r) => r.roomName).join(", ") || "-",
              date: pc.date ? new Date(pc.date).toLocaleString("en-IN") : "-",
            }))
          : [],
      };
    });
    switch (type) {
      case "excel":
        try {
          return await exportLoginReportExcel(res, processedBookings);
        } catch (err) {
          console.error("Excel Error:", err);
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

      case "pdf":
        return exportLoginReportPdf(res, processedBookings);

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid export type",
        });
    }
  } catch (error) {
    console.error("loginReportExport:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
