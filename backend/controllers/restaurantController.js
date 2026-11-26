import mongoose from "mongoose";
import Item from "../models/restaurantModels.js"; // Adjust path as needed
import hsnModel from "../models/hsnModel.js";
import productModel from "../models/productModel.js";
import { Category, Subcategory } from "../models/subDetails.js"; // Adjust path as needed
import kotModal from "../models/kotModal.js";
import roomModal from "../models/roomModal.js";
import { generateVoucherNumber } from "../helpers/voucherHelper.js";
import salesModel from "../models/salesModel.js";
import TallyData from "../models/TallyData.js";
import ReceiptModel from "../models/receiptModel.js";
import bankModel from "../models/bankModel.js";
import cashModel from "../models/cashModel.js";
import Party from "../models/partyModel.js";
import Organization from "../models/OragnizationModel.js";
import Table from "../models/TableModel.js";
import { Godown } from "../models/subDetails.js";
import { buildReceipt } from "../helpers/restaurantHelper.js";
import partyModel from "../models/partyModel.js";
import { FoodPlan } from "../models/hotelSubMasterModal.js";
import AdditionalCharges from "../models/additionalChargesModel.js";
import { recalculateKotItem, round2 } from "../helpers/restaurantHelper.js";
import Settlement from "../models/settlementModel.js";
import { sendMail } from "../helpers/hotelHelper.js";
// Helper functions (you may need to create these or adjust based on your existing ones)
import {
  buildDatabaseFilterForRoom,
  sendRoomResponse,
  fetchRoomsFromDatabase,
} from "../helpers/restaurantHelper.js";
import { extractRequestParams } from "../helpers/productHelper.js";
import VoucherSeriesModel from "../models/VoucherSeriesModel.js";
import { CheckIn } from "../models/bookingModal.js";
import { response } from "express";
import receiptModel from "../models/receiptModel.js";
import primaryUserModel from "../models/primaryUserModel.js";
import ExcelJS from "exceljs";
// Add Item Controller
export const addItem = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { formData, tableData } = req.body;

    // Validate item code

    session.startTransaction();
    // 🔹 Check if product already exists (by name + company)
    const existingItem = await productModel
      .findOne({
        cmp_id: req.params.cmp_id,
        product_name: {
          $regex: `^${formData.itemName.trim()}$`,
          $options: "i",
        },
      })
      .session(session);

    if (existingItem) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Item already exists with this name",
      });
    }

    // Fetch HSN data
    const correspondingHsn = await hsnModel
      .findOne({ hsn: formData.hsn })
      .session(session);
    if (!correspondingHsn) {
      await session.abortTransaction();
      return res.status(400).json({ message: "HSN data missing" });
    }

    let godown = await Godown.findOne({ cmp_id: req.params.cmp_id }).session(
      session,
    );
    if (!godown) {
      await session.abortTransaction();
      return res.status(400).json({ message: "godown data missing" });
    }

    let godownObject = {
      godown: godown._id,
      balance_stock: 0,
      batch: "Primary Batch",
    };

    // Create Item document with NEW itemCode field
    const newItem = new productModel({
      Primary_user_id: req.pUserId || req.owner,
      Secondary_user_id: req.sUserId,
      cmp_id: req.params.cmp_id,
      itemCode: formData.itemCode, // NEW FIELD
      product_name: formData.itemName,
      product_image: formData.imageUrl?.secure_url || "",
      category: formData.foodCategory,
      sub_category: formData.foodType,
      unit: formData.unit,
      hsn_code: formData.hsn,
      cgst: formData.cgst,
      sgst: formData.sgst,
      igst: formData.igst,
      Priceleveles: tableData,
      GodownList: godownObject,
    });

    await newItem.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Item Added Successfully",
      data: newItem,
    });
  } catch (error) {
    console.log("Error saving item details:", error);
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get Items Controller
export const getItems = async (req, res) => {
  try {
    const params = extractRequestParams(req);
    const filter = await buildDatabaseFilterForRoom(params);

    const { items, totalItems } = await fetchRoomsFromDatabase(filter, params);

    const sendItemResponseData = sendRoomResponse(
      res,
      items,
      totalItems,
      params,
    );
  } catch (error) {
    console.error("Error in getItems:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};
// Assuming you have ProductModel imported correctly
// import ProductModel from '../models/ProductModel'; (adjust path as needed)

export const getAllItems = async (req, res) => {
  try {
    const params = extractRequestParams(req);
    const filter = await buildDatabaseFilterForRoom(params);

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;

    const skip = (page - 1) * limit;

    const products = await productModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalItems = await productModel.countDocuments(filter);
    const hasMore = skip + products.length < totalItems;

    return res.status(200).json({
      success: true,
      items: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        hasMore,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

export const searchItems = async (req, res) => {
  try {
    const cmp_id = req.params.cmp_id || req.query.cmp_id; // ✅ FIX
    const search = (req.query.search || "").trim();

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id required",
      });
    }

    if (!search) {
      return res.status(200).json({
        success: true,
        items: [],
        message: "Please provide a search term",
      });
    }

    const searchRegex = new RegExp(search, "i");

    const searchFilter = {
      cmp_id,
      $or: [
        { product_name: searchRegex },
        { hsn_code: searchRegex },
        { unit: searchRegex },
        { itemCode: searchRegex },
      ],
    };

    console.log("Search filter:", JSON.stringify(searchFilter, null, 2));

    const products = await productModel
      .find(searchFilter)
      .populate({
        path: "Priceleveles.pricelevel",
        select: "pricelevel dineIn takeaway roomService delivery",
      })
      .sort({ product_name: 1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      items: products,
      totalResults: products.length,
    });
  } catch (error) {
    console.error("Error in searchItems:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, please try again!",
    });
  }
};

// Get Single Item Controller (for editing)
export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findOne({
      _id: id,
      cmp_id: req.params.cmp_id,
      primary_user_id: req.pUserId || req.owner,
    })
      .populate("foodCategory", "name")
      .populate("foodType", "name")
      .populate("hsn", "hsn")
      .populate("priceLevel.priceLevel", "name")
      .lean();

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error in getItemById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// Update Item Controller
export const updateItem = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { formData, tableData } = req.body;

    session.startTransaction();

    // Verify HSN exists
    const correspondingHsn = await hsnModel
      .findOne({ hsn: formData.hsn })
      .session(session);
    if (!correspondingHsn) {
      await session.abortTransaction();
      return res.status(400).json({ message: "HSN data missing" });
    }

    // Update item
    const updatedItem = await productModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          itemCode: formData.itemCode,
          product_image: formData.imageUrl?.secure_url,
          product_name: formData.itemName,
          category: formData.foodCategory,
          sub_category: formData.foodType,
          unit: formData.unit,
          hsn_code: formData.hsn,
          cgst: formData.cgst,
          sgst: formData.sgst,
          igst: formData.igst,
          Priceleveles: tableData,
        },
      },
      {
        // new: true,
        session,
        // runValidators: true,
      },
    );

    if (!updatedItem) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.log("Error updating item:", error);
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Delete Item Controller
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params; // or const itemId = req.params.id;

    const deletedItem = await productModel.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("Error in deleteItem:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// controllers/categoryController.js

export const getCategories = async (req, res) => {
  try {
    const { under } = req.query;
    const cpm_id = req.params.cpm_id;
    // Build filter conditionally
    const filter = {};
    if (under) filter.under = under;
    if (cpm_id) filter.cmp_id = cpm_id;

    const categories = await Category.find(filter).select("-__v"); // omit __v if you want

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching categories",
    });
  }
};

// function used to generate kot
export const generateKot = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const cmp_id = req.params.cmp_id;
    const organizationData = await Organization.findOne({ _id: cmp_id }, null, {
      session,
    });

    const voucherData = await VoucherSeriesModel.findOne(
      { voucherType: "memoRandom", cmp_id: cmp_id },
      null,
      { session },
    );

    if (!voucherData) {
      throw new Error("Voucher series not found for memoRandom");
    }

    const kotNumber = await generateVoucherNumber(
      cmp_id,
      "memoRandom",
      voucherData.series[0]._id.toString(),
      session,
    );

    console.log("=== BACKEND RECEIVED KOT REQUEST ===");
    console.log("Customer data:", req.body.customer);
    console.log("Food Plan from request:", req.body.customer?.foodPlan);

    // ✅ SIMPLE FIX - Process food plan
    let foodPlanId = null;
    let foodPlanDetails = {
      planName: null,
      amount: 0,
      isComplimentary: false,
    };

    const foodPlanData = req.body.customer?.foodPlan;

    // Prepare the KOT data
    const kotData = {
      voucherNumber: kotNumber?.voucherNumber,
      primary_user_id: req.pUserId || req.owner,
      Secondary_user_id: req.sUserId,

      cmp_id: cmp_id,
      items: req.body.items,
      type: req.body.type,
      customer: req.body.customer,
      tableNumber: req.body.customer?.tableNumber,
      total: req.body.total,
      // createdAt: new Date(),

      status: organizationData.configurations[0].kotAutoApproval
        ? "completed"
        : req.body.status || "pending",

      paymentMethod: req.body.paymentMethod,
      roomId: req.body.customer?.roomId,
      checkInNumber: req.body.customer?.checkInNumber,

      // ✅ Save food plan
      foodPlanId: foodPlanId,
      foodPlanDetails: foodPlanData,
      isManuallyComplimentary: false,
      kitchenBatches: req.body.kitchenBatches,
    };

    console.log("=== SAVING KOT ===");
    console.log("KOT Data:", {
      voucherNumber: kotData.voucherNumber,
      foodPlanId: kotData.foodPlanId,
      foodPlanDetails: kotData.foodPlanDetails,
    });

    const kot = await kotModal.create([kotData], { session });

    if (kotData.tableNumber && kotData.type === "dine-in") {
      const tableUpdate = await Table.findOneAndUpdate(
        { cmp_id, tableNumber: kotData.tableNumber },
        { $set: { status: "occupied" } },
        { new: true, session },
      );

      if (!tableUpdate) {
        throw new Error(
          `Table ${kotData.tableNumber} not found for company ${cmp_id}`,
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    console.log("=== KOT CREATED SUCCESSFULLY ===");
    console.log("KOT ID:", kot[0]._id);
    console.log("Food Plan Saved:", kot[0].foodPlanDetails);

    res.status(200).json({
      success: true,
      data: kot[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error generating KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating KOT",
      error: error.message,
    });
  }
};

export const editKot = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const cmp_id = req.params.cmp_id;

    // Get the previous KOT
    const previousKot = await kotModal.findOne(
      { _id: req.params.kotId, cmp_id },
      null,
      { session },
    );

    if (!previousKot) {
      throw new Error(
        `KOT ${req.params.kotId} not found for company ${cmp_id}`,
      );
    }

    let customer = req.body.customer;

    // 🗑️ Remove roomId if it’s empty or invalid
    if (!customer.roomId || customer.roomId.trim() === "") {
      delete customer.roomId;
    }

    console.log("req.body?.status", req.body);

    let tag = req.body?.parentTag;

    // Update the KOT
    const updatedKot = await kotModal.findOneAndUpdate(
      { _id: req.params.kotId, cmp_id },
      {
        $set: {
          items: req.body.items,
          type: req.body.type,
          customer: customer,
          tableNumber: req.body.customer?.tableNumber,
          total: req.body.total,
          status: req.body.status || "pending",
          paymentMethod: req.body.paymentMethod,
          roomId: req.body?.roomId,
          checkInNumber: req.body.customer?.checkInNumber,

          ...(!tag && { kitchenBatches: req.body.kitchenBatches }),
        },
        ...(tag && {
          $push: { kitchenBatches: req.body.kitchenBatches },
        }),
      },
      { new: true, session },
    );

    // If previous KOT was dine-in, free up the old table
    if (previousKot.tableNumber && previousKot.type === "dine-in") {
      const tableUpdate = await Table.findOneAndUpdate(
        { cmp_id, tableNumber: previousKot.tableNumber },
        { $set: { status: "available" } },
        { new: true, session },
      );

      if (!tableUpdate) {
        throw new Error(
          `Table ${previousKot.tableNumber} not found for company ${cmp_id}`,
        );
      }
    }

    // If new KOT is dine-in, occupy the new table
    if (updatedKot.tableNumber && updatedKot.type === "dine-in") {
      const tableUpdate = await Table.findOneAndUpdate(
        { cmp_id, tableNumber: updatedKot.tableNumber },
        { $set: { status: "occupied" } },
        { new: true, session },
      );

      if (!tableUpdate) {
        throw new Error(
          `Table ${updatedKot.tableNumber} not found for company ${cmp_id}`,
        );
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      data: updatedKot,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error editing KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while editing KOT",
      error: error.message,
    });
  }
};

// get all kot
export const getKot = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    let { date } = req.query;
    // If no date is passed, use today's date
    if (!date) {
      date = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
    }
    // Get date range for filtering (00:00 to 23:59 of that day)
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(date + "T23:59:59.999Z");

    const kot = await kotModal
      .find({
        cmp_id,
        createdAt: { $gte: start, $lte: end },
        status: { $ne: "cancelled" },
      })
      .populate({
        path: "roomId",
        select: "roomName roomno", // ✅ CRITICAL - Select both fields
      })
      .populate({
        path: "customer",
        select: "name phone address",
      });

    res.status(200).json({
      success: true,
      data: kot,
    });
  } catch (error) {
    console.error("Error fetching KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching KOT",
    });
  }
};

export const getKotDash = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    let { date, fromDate } = req.query;

    if (!date) {
      date = new Date().toISOString().slice(0, 10);
    }

    if (!fromDate) {
      fromDate = new Date().toISOString().slice(0, 10);
    }

    const start = new Date(`${fromDate}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const kot = await kotModal
      .find({
        cmp_id,
        createdAt: { $gte: start, $lte: end },
        status: { $ne: "cancelled" },
      })
      .populate({
        path: "roomId",
        select: "roomName roomno",
      })
      .populate({
        path: "customer",
        select: "name phone address",
      })
      .lean();

    const voucherNumbers = [
      ...new Set(kot.map((kotDoc) => kotDoc.voucherNumber).filter(Boolean)),
    ];

    const sales = voucherNumbers.length
      ? await salesModel
          .find({
            cmp_id,
            "convertedFrom.voucherNumber": { $in: voucherNumbers },
          })
          .select("subTotal salesNumber convertedFrom.voucherNumber")
          .lean()
      : [];

    const salesByVoucherNumber = new Map();
    sales.forEach((sale) => {
      (Array.isArray(sale.convertedFrom) ? sale.convertedFrom : []).forEach(
        (convertedFrom) => {
          const voucherNumber = convertedFrom?.voucherNumber;
          if (voucherNumber && !salesByVoucherNumber.has(voucherNumber)) {
            salesByVoucherNumber.set(voucherNumber, sale);
          }
        },
      );
    });

    const recalculatedKot = kot.map((kotDoc) => {
      const findSpecificSale = salesByVoucherNumber.get(kotDoc.voucherNumber);
      if (kotDoc.paymentCompleted) {
        return {
          ...kotDoc,
          items: kotDoc.items || [], // ← directly from DB, no recalculation
          total: findSpecificSale?.subTotal || 0, // ← directly from DB
          salesNumber: findSpecificSale?.salesNumber,
        };
      }
      const recalculatedItems = (kotDoc?.items || [])
        .map((item) => recalculateKotItem(item))
        .filter(Boolean);

      const kotTotal = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.total || 0),
        0,
      );

      const totalTaxableAmount = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.taxableAmount || 0),
        0,
      );

      const totalCgstAmt = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.totalCgstAmt || 0),
        0,
      );

      const totalSgstAmt = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.totalSgstAmt || 0),
        0,
      );

      const totalIgstAmt = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.totalIgstAmt || 0),
        0,
      );

      const totalCessAmt = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.totalCessAmt || 0),
        0,
      );

      const totalAddlCessAmt = recalculatedItems.reduce(
        (sum, item) => sum + Number(item?.totalAddlCessAmt || 0),
        0,
      );

      return {
        ...kotDoc,
        items: recalculatedItems,
        total: round2(kotTotal),
        taxableAmount: round2(totalTaxableAmount),
        totalCgstAmt: round2(totalCgstAmt),
        totalSgstAmt: round2(totalSgstAmt),
        totalIgstAmt: round2(totalIgstAmt),
        totalCessAmt: round2(totalCessAmt),
        totalAddlCessAmt: round2(totalAddlCessAmt),
        salesNumber: findSpecificSale?.salesNumber,
      };
    });

    res.status(200).json({
      success: true,
      data: recalculatedKot,
    });
  } catch (error) {
    console.error("Error fetching KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching KOT",
    });
  }
};

export const cancelKot = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    console.log("req.sUserId =>", req.sUserId);
    console.log("req.suser =>", req.suser);
    const kot = await kotModal.findByIdAndUpdate(
      id,
      {
        status: "cancelled",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledBy: req.sUserId,
        cancelledByName: req.suser?.name || "",
      },
      { new: true },
    );

    if (!kot) {
      return res.status(404).json({ success: false, message: "KOT not found" });
    }
    if (kot.status === "cancelled") {
      let primaryUserData = await primaryUserModel.findById(req.owner);
      if (!primaryUserData || !primaryUserData?.email) {
        res.status(200).json({
          success: true,
          message: "KOT cancelled successfully but email not sent",
          data: kot,
        });
      }
      console.log("req?.secUserName ", req?.secUserName);
      await sendMail({
        to: primaryUserData?.email,
        cc: [],
        subject: `KOT Cancelled Alert - ${kot.voucherNumber}`,
        fromName: "Cancel Kot",
        text: `KOT ${kot.voucherNumber} has been cancelled by ${req?.secUserName || primaryUserData?.userName || "System"}. Please check the attached cancelled KOT copy.`,
        html: `
    <div style="font-family: Arial, sans-serif;">
      <h2 style="color:#b91c1c;">KOT Cancelled Alert</h2>
      <p>KOT <strong>${kot.voucherNumber}</strong> has been cancelled.</p>
      <p><strong>Cancelled By:</strong> ${req?.secUserName || primaryUserData?.userName || "System"}</p>
      <p><strong>Reason:</strong> ${reason || "Reason not given"}</p>
      <p><strong>Table No:</strong> ${kot?.tableNumber || ""}</p>
      <p><strong>Total:</strong> ₹ ${kot?.total || 0}</p>
      
    </div>
  `,
        data: kot,
      });
    }

    res.status(200).json({
      success: true,
      message: "KOT cancelled successfully",
      data: kot,
    });
  } catch (error) {
    console.error("Error cancelling KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while cancelling KOT",
    });
  }
};

// function used to update kot
export const updateKotStatus = async (req, res) => {
  try {
    const { batchNo, status, ...rest } = req.body;

    let updateQuery;

    if (batchNo) {
      // Step 1: Update the matching batch's status
      await kotModal.updateOne(
        { _id: req.params.kotId },
        { $set: { "kitchenBatches.$[batch].status": status } },
        { arrayFilters: [{ "batch.batchNo": batchNo }] },
      );

      // Step 2: Fetch the updated KOT to check all batch statuses
      const updatedKot = await kotModal.findById(req.params.kotId);

      const allBatchesCompleted =
        updatedKot.kitchenBatches.length > 0 &&
        updatedKot.kitchenBatches.every(
          (batch) => batch.status === "completed",
        );

      // Step 3: If all batches are completed, update KOT status too
      if (allBatchesCompleted) {
        await kotModal.updateOne(
          { _id: req.params.kotId },
          { $set: { status: "completed" } },
        );
      }

      // Step 4: Return the final updated KOT
      const finalKot = await kotModal.findById(req.params.kotId);

      return res.status(200).json({
        success: true,
        data: finalKot,
      });
    } else {
      // No batchNo — update the whole KOT document normally
      updateQuery = { $set: rest };
      const kot = await kotModal.updateOne(
        { _id: req.params.kotId },
        updateQuery,
      );

      return res.status(200).json({
        success: true,
        data: kot,
      });
    }
  } catch (error) {
    console.error("Error updating KOT:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating KOT",
    });
  }
};
// function used to fetch room data based on room booking
export const getRoomDataForRestaurant = async (req, res) => {
  try {
    // Today's date only (strip time)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset time to midnight

    // Get all records for cmp_id
    const allData = await CheckIn.find({
      cmp_id: req.params.cmp_id,
      status: { $nin: ["checkOut", "cancelled"] },
    });

    // Filter only those where today's date falls between arrivalDate & checkOutDate
    // const filtered = allData.filter((doc) => {
    // arrivalDate/checkOutDate are stored as "YYYY-MM-DD" strings
    //   const arrivalDate = new Date(doc.arrivalDate);
    //   arrivalDate.setHours(0, 0, 0, 0);

    //   const checkOutDate = new Date(doc.checkOutDate);
    //   checkOutDate.setHours(0, 0, 0, 0);

    //   return arrivalDate <= today && today <= checkOutDate;
    // });

    res.status(200).json({
      success: true,
      data: allData,
    });
  } catch (error) {
    console.error("Error fetching room data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching room data",
    });
  }
};

// function used to update kot data

// export const updateKotPayment = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     await session.withTransaction(async () => {
//       const kotId = req.params.id;
//       const cmp_id = req.params.cmp_id;
//       let paymentMethod = req.body.paymentMethod;
//       const paymentDetails = req.body?.paymentDetails;
//       const kotData = req.body?.selectedKotData;
//       let paymentCompleted = false;

//       if (paymentDetails?.cashAmount > 0 && paymentDetails?.onlineAmount > 0) {
//         paymentMethod = "mixed";
//       }

//       console.log(paymentMethod, paymentDetails, kotId, cmp_id);

//       // 1) Get the sales voucher
//       const SaleVoucher = await VoucherSeriesModel.findOne({
//         cmp_id: cmp_id,
//         voucherType: "sales",
//       }).session(session);

//       if (!SaleVoucher) {
//         throw new Error("Sale voucher not found");
//       }

//       // 2) Find the specific series
//       const specificVoucherSeries = SaleVoucher.series.find(
//         (series) => series.under === "restaurant"
//       );

//       if (!specificVoucherSeries) {
//         throw new Error("No 'restaurant' voucher series found");
//       }

//       // 3) Generate voucher number (make sure this function uses session internally)
//       const saleNumber = await generateVoucherNumber(
//         cmp_id,
//         "sales",
//         specificVoucherSeries._id.toString(),
//         session
//       );

//       let selectedParty;
//       if (paymentDetails?.paymentMode == "single") {
//         paymentCompleted = true;
//         if (Number(paymentDetails?.cashAmount) > 0) {
//           selectedParty = await Party.findOne({
//             cmp_id: cmp_id,
//             partyName: paymentDetails?.selectedCash?.cash_ledname,
//           }).session(session);
//         }
//         if (Number(paymentDetails?.onlineAmount) > 0) {
//           selectedParty = await Party.findOne({
//             cmp_id: cmp_id,
//             partyName: paymentDetails?.selectedBank?.bank_ledname,
//           }).session(session);
//         }
//       } else {
//         if (
//           Number(paymentDetails?.cashAmount) +
//             Number(paymentDetails?.onlineAmount) >=
//           kotData?.total
//         ) {
//           paymentCompleted = true;
//         }
//       }

//       console.log("Generated Sale Number:", saleNumber);
//       console.log("party", selectedParty);

//       // 4) Example of saving sales
//       const savedVoucherData = await salesModel.create(
//         {
//           date: new Date(),
//           selectedDate: new Date().toLocaleDateString(),
//           voucherType: "sales",
//           serialNumber: saleNumber?.usedSeriesNumber,
//           userLevelSerialNumber: saleNumber?.usedSeriesNumber,
//           salesNumber: saleNumber?.voucherNumber,
//           series_id: specificVoucherSeries._id.toString(),
//           usedSeriesNumber: saleNumber?.currentNumber,
//           Primary_user_id: req.pUserId || req.owner,
//           kotId: kotData?._id,
//           cmp_id: cmp_id,
//           Secondary_user_id: req.sUserId,

//           party: selectedParty,
//           items: kotData?.items,
//           address: kotData?.customer,
//           finalAmount: kotData?.total,
//           paymentSplittingData: {},
//         },
//         { session }
//       );
//       let paidAmount =
//         Number(paymentDetails?.cashAmount || 0) +
//         Number(paymentDetails?.onlineAmount || 0);
//       let pendingAmount =
//         Number(kotData?.total || 0) - Number(paymentDetails?.paidAmount || 0);
// if(pendingAmount > 0){
//       let createOutStanding = await TallyData.create(
//         {
//           Primary_user_id: req.pUserId || req.owner,
//           cmp_id: cmp_id,
//           party_id: selectedParty?._id,
//           party_name: selectedParty?.partyName,
//           mobile_no: selectedParty?.mobileNumber,
//           bill_date: new Date(),
//           bill_no: savedVoucherData?.salesNumber,
//           billId: savedVoucherData._id,
//           bill_amount: Number(kotData?.total || 0),
//           bill_pending_amt: pendingAmount,
//           accountGroup: selectedParty.accountGroup,
//           user_id: req.sUserId,
//           advanceAmount: paidAmount,
//           advanceDate: new Date(),
//           classification: "Cr",
//           source: "sales",
//         },
//         { session }
//       );
//     }
//       if (paymentDetails?.paymentMode == "single") {
//         ///save settlement data
//         await saveSettlementData(
//           selectedParty,
//           cmp_id,
//           "normal sale",
//           "sale",
//           savedVoucherData?.salesNumber,
//           savedVoucherData._id,
//           paidAmount,
//           updateData?.date,
//           selectedParty?.partyName,
//           session
//         );
//       } else {
//         await saveSettlementData(
//           selectedParty,
//           cmp_id,
//           "normal sale",
//           "sale",
//           savedVoucherData?.salesNumber,
//           savedVoucherData._id,
//           Number(paymentDetails?.cashAmount || 0),
//           updateData?.date,
//           selectedParty?.partyName,
//           session
//         );
//         ///save settlement data
//         await saveSettlementData(
//           selectedParty,
//           cmp_id,
//           "normal sale",
//           "sale",
//           savedVoucherData?.salesNumber,
//           savedVoucherData._id,
//           Number(paymentDetails?.onlineAmount || 0),
//           updateData?.date,
//           selectedParty?.partyName,
//           session
//         );
//       }

//       // 5) Update KOT payment status
//       const kot = await kotModal.updateOne(
//         { _id: kotId },
//         { paymentMethod: paymentMethod, paymentCompleted: paymentCompleted },
//         { session }
//       );

//       console.log("KOT updated:", kot);

//       // res.status(200).json({
//       //   success: true,
//       //   data: {
//       //     saleNumber,
//       //     salesRecord: saveSales,
//       //     kotUpdate: kot,
//       //   },
//       // });
//     });
//   } catch (error) {
//     console.error("Error updating KOT:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error while updating KOT",
//     });
//   } finally {
//     await session.endSession();
//   }
// };

// controllers/sUsersController.js

export const directSale = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { cmp_id } = req.params;
      const {
        paymentMethod,
        paymentDetails,
        selectedKotData,
        additionalCharges,
        isDirectSale,
        discountBasedOnGrossAmount,
      } = req.body;

      if (!paymentDetails || !selectedKotData)
        throw new Error("Missing payment details or selected data");

      const cashAmt = Number(paymentDetails?.cashAmount || 0);
      const onlineAmt = Number(paymentDetails?.onlineAmount || 0);

      // Treat both payment modes as 'mixed'
      let resolvedPaymentMethod = paymentMethod;
      if (cashAmt > 0 && onlineAmt > 0) resolvedPaymentMethod = "mixed";

      // Get voucher series for direct sales
      const specificVoucherSeries = await getRestaurantVoucherSeries(
        cmp_id,
        session,
      );

      const saleNumber = await generateVoucherNumber(
        cmp_id,
        "sales",
        specificVoucherSeries._id.toString(),
        session,
      );

      // Cash/Bank or Customer account
      let selectedParty = null;
      let selectedGuest = null;

      const { partyIdFetched, guestIdFetched } = await getSelectedParty(
        cmp_id,
        paymentDetails,
        cashAmt,
        onlineAmt,
        selectedKotData,
        false,
        session,
      );

      selectedParty = partyIdFetched;
      selectedGuest = guestIdFetched;

      // Prepare structured party & payment arrays
      const paymentSplittingArray = await createPaymentSplittingArray(
        paymentDetails,
        cashAmt,
        onlineAmt,
      );
      console.log("paymentSplittingArray", paymentSplittingArray);
      const party = mapPartyData(selectedParty);
      const guest = mapPartyData(selectedGuest);

      console.log("selectedParty", selectedParty);
      console.log("selectedGuest", selectedGuest);

      let additionalChargesArray = additionalCharges;

      // Create a sales voucher entry (no KOT reference)
      const savedVoucherData = await createSalesVoucher(
        cmp_id,
        specificVoucherSeries,
        saleNumber,
        req,
        selectedKotData, // hold items + total
        party,
        guest,
        selectedParty,
        selectedGuest,
        paymentSplittingArray,
        additionalChargesArray,
        discountBasedOnGrossAmount,
        session,
        false,
        false,
        false,
        false,
      );

      // ✅ Convert Mongoose document to plain object and ensure _id is included
      const salesRecordData = savedVoucherData[0].toObject
        ? savedVoucherData[0].toObject()
        : savedVoucherData[0];

      // Return clean JSON response with properly formatted data
      res.status(200).json({
        success: true,
        message: "Direct sale recorded successfully",
        data: {
          salesRecord: salesRecordData, // Return the full object as-is
          _id: salesRecordData._id, // Also include _id at root for easy access
          saleNumber: saleNumber,
        },
      });
    });
  } catch (error) {
    console.error("Error in direct sale:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error during direct sale",
    });
  } finally {
    await session.endSession();
  }
};

// Update your updateKotPayment function in the backend

// Update your updateKotPayment function - ADD DETAILED LOGGING

export const updateKotPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { cmp_id } = req.params;
      let {
        paymentMethod,
        paymentDetails,
        selectedKotData: kotData,
        isPostToRoom,
        additionalCharges = [],
        discountCharge, // ✅ NEW: From frontend dropdown
        discountAmount,
        discountType, // ✅ Extract discount type
        discountValue,
        isComplimentary = false,
        isManuallyComplimentary = false, // ✅ NEW: Discount amount
        discountBasedOnGrossAmount,
        note,
        complementaryWithTax = false,
      } = req.body;

      discountAmount = Number(req?.body?.additionalCharges[0]?.finalValue || 0);

      // console.log("table", kotData);
      console.log("req?.body", req?.body);

      if (!paymentDetails || !kotData) {
        throw new Error("Missing payment details or KOT data");
      }

      if (paymentDetails?.paymentMode === "credit") {
        if (
          !paymentDetails.selectedCreditor ||
          !paymentDetails.selectedCreditor._id
        ) {
          throw new Error("Please select a creditor for credit payment");
        }
      }
      let paymentCompleted = false;

      // Determine payment method
      const cashAmt = Number(paymentDetails?.cashAmount || 0);
      const onlineAmt = Number(paymentDetails?.onlineAmount || 0);

      if (cashAmt > 0 && onlineAmt > 0) {
        paymentMethod = "mixed";
      }

      if (paymentDetails?.paymentMode == "credit") {
        paymentMethod = "credit";
      }

      // ✅ Inject remarks
      if (note) {
        req.body.narration = note;
        req.body.remarks = note;
        req.body.note = note;
      }

      // Voucher series
      const specificVoucherSeries = await getRestaurantVoucherSeries(
        cmp_id,
        session,
      );

      // Voucher number
      const saleNumber = await generateVoucherNumber(
        cmp_id,
        "sales",
        specificVoucherSeries._id.toString(),
        session,
      );
      let creditParty;
      if (paymentMethod == "credit") {
        creditParty = await Party.findOne({
          cmp_id,
          _id: paymentDetails.selectedCreditor._id,
        })
          .populate("accountGroup")
          .session(session);
      }

      // console.log("creditParty", paymentMethod);
      // Selected party
      let selectedParty = null;
      let selectedGuest = null;
      if (paymentMethod == "credit") {
        selectedParty = creditParty;
        selectedGuest = creditParty;
      } else {
        const { partyIdFetched, guestIdFetched } = await getSelectedParty(
          cmp_id,
          paymentDetails,
          cashAmt,
          onlineAmt,
          kotData,
          isPostToRoom,
          session,
        );
        selectedParty = partyIdFetched;
        selectedGuest = guestIdFetched;
      }

      // Payment splitting
      const paymentSplittingArray = await createPaymentSplittingArray(
        paymentDetails,
        cashAmt,
        onlineAmt,
      );

      console.log("paymentSplittingArray", paymentSplittingArray);

      const party = mapPartyData(selectedParty);
      const guest = mapPartyData(selectedGuest);

      // Save voucher
      const savedVoucherData = await createSalesVoucher(
        cmp_id,
        specificVoucherSeries,
        saleNumber,
        req,
        kotData,
        party,
        guest,
        selectedParty,
        selectedGuest,
        paymentSplittingArray,
        req.body.additionalCharges || [],
        discountBasedOnGrossAmount,
        session,
        isComplimentary,
        isManuallyComplimentary,
        isPostToRoom,
        complementaryWithTax,
      );
      // ✅ Calculate with DISCOUNT
      const originalTotal = Number(kotData?.total || 0);
      const discountTotal = Number(discountAmount || 0);
      const netPayable = originalTotal - discountTotal;
      // Outstanding balance
      const paidAmount = isPostToRoom ? originalTotal : cashAmt + onlineAmt;
      const pendingAmount = isPostToRoom
        ? originalTotal
        : netPayable - paidAmount;
      let tallyData;

      if (isPostToRoom && paymentMethod !== "credit") {
        tallyData = await createTallyEntry(
          cmp_id,
          req,
          selectedParty,
          kotData,
          savedVoucherData[0],
          paidAmount,
          pendingAmount,
          session,
        );
      }
      console.log(paymentMethod, "paymentMethod");

      if (
        !isPostToRoom &&
        kotData?.voucherNumber[0]?.checkInNumber &&
        paymentMethod !== "credit"
      ) {
        let totalAmount = paymentSplittingArray.reduce(
          (acc, item) =>
            item.type == "credit" ? acc : acc + Number(item.amount),
          0,
        );
        tallyData = await createTallyEntry(
          cmp_id,
          req,
          selectedParty,
          kotData,
          savedVoucherData[0],
          totalAmount,
          0,
          session,
        );
        console.log("tallyData", paymentSplittingArray);

        if (paymentSplittingArray && paymentSplittingArray?.length > 0) {
          // One receipt per split row
          for (const split of paymentSplittingArray) {
            console.log("splitsplit", split);
            if (split.type == "credit") continue;
            let receipt = await buildReceipt({
              cmp_id,
              selectedParty: party,
              selectedGuest: guest,
              advanceObject: tallyData[0],
              saleData: savedVoucherData[0],
              amount: split.amount,
              paymentDetails: {
                ...(split.type === "cash" && {
                  cash_id: split.source, // ObjectId of Cash ledger
                  cash_ledname: split.subsource, // or however you store the ledger name
                  cash_name: split.subsource, // display name of the cash account
                }),

                // Bank / UPI / Card / Online split
                ...(split.type !== "cash" && {
                  bank_id: split.source, // ObjectId of BankDetails
                  bank_ledname: split.subsource, // bank group/category name
                  bank_name: split.subsource, // specific bank account name
                }),
              },

              paymentMethod:
                split.type == "cash"
                  ? "Cash"
                  : split.type == "bank"
                    ? "Bank"
                    : split.type,
              req,
              session,
            });
            console.log("split", split);

            await Settlement.create({
              voucherNumber: receipt.receiptNumber,
              voucherId: receipt._id,
              voucherModel: "Receipt",
              voucherType: "receipt",
              amount: split.amount,
              payment_mode: split.type,
              partyId: party._id,
              partyName: party.partyName,
              partyType: "party",
              sourceId: split.source,
              sourceType: split.type == "cash" ? "cash" : "bank",
              cmp_id: cmp_id,
              Primary_user_id: req.owner,
              settlement_date: new Date(),
              voucher_date: receipt.date, // date on the receipt/sale
            });
          }
        }
      }

      let findCredit =
        paymentSplittingArray?.length > 0
          ? paymentSplittingArray.filter((item) => item.type === "credit")
          : [];

      if (findCredit.length > 0) {
        for (const item of findCredit) {
          if (!item.source) continue;

          let selected = await Party.findOne({
            cmp_id,
            _id: item.source,
          }).session(session);

          let modifiedParty = await mapPartyData(selected);

          await createTallyEntry(
            cmp_id,
            req,
            selected,
            kotData,
            savedVoucherData[0],
            item.amount,
            item.amount,
            session,
          );
        }
      }

      // Update KOTs
      paymentCompleted = true;
      let selectedTableNumber = [];

      await Promise.all(
        kotData?.voucherNumber.map(async (item) => {
          const kot = await kotModal.findById(item.id).lean();
          if (!kot) return;

          if (
            kot?.tableNumber &&
            !selectedTableNumber.includes(kot.tableNumber)
          ) {
            selectedTableNumber.push(kot.tableNumber);
          }

          console.log(`=== UPDATING KOT ${item.id} ===`);

          const selectedItems = kotData?.items || [];

          const billedItemMap = new Map(
            selectedItems.map((si) => [
              String(si._id),
              Number(si.quantity || 0),
            ]),
          );

          const updatedItems = (kot?.items || []).map((kotItem) => {
            const billedQty = Number(
              billedItemMap.get(String(kotItem._id)) || 0,
            );

            // ✅ use remainingQuantity if exists
            const currentRemainingQty =
              kotItem.remainingQty ?? kotItem.quantity ?? 0;

            // ✅ IMPORTANT: if already 0 → skip completely
            if (currentRemainingQty <= 0) {
              return kotItem; // 🔥 no change at all
            }

            // ✅ calculate only if remaining > 0
            const remainingQty = Math.max(currentRemainingQty - billedQty, 0);

            return {
              ...kotItem,
              remainingQty,
            };
          });

          const hasRemaining = updatedItems.some(
            (i) => Number(i.remainingQty || 0) > 0,
          );

          const updateData = {
            paymentMethod,
            paymentCompleted: !hasRemaining,
            discount: discountAmount,
            discountChargeId: discountCharge?._id,
            note,
            items: updatedItems,
            ...(!hasRemaining && { status: "completed" }),
          };

          if (isComplimentary) {
            updateData.foodPlanDetails = {
              ...(kot?.foodPlanDetails || {}),
              isComplimentary: true,
            };
            updateData.isManuallyComplimentary = isManuallyComplimentary;
          }

          console.log("Update data:", updateData);

          return kotModal.updateOne(
            { _id: item.id },
            { $set: updateData },
            { session },
          );
        }),
      );
      // console.log("Selected Table Numbers:", selectedTableNumber);

      // Check pending
      let updatedTables = [];
      for (const tableNumber of selectedTableNumber) {
        if (!tableNumber) continue; // Skip if tableNumber is null/undefined

        const pendingCount = await kotModal
          .countDocuments({
            cmp_id,
            tableNumber: tableNumber, // ✅ Direct field, not nested
            paymentCompleted: false,
          })
          .session(session);

        // console.log(`Pending KOTs for table ${tableNumber}:`, pendingCount);

        // ✅ If no pending KOTs, mark table as available
        if (pendingCount === 0) {
          const updateTableStatus = await Table.findOneAndUpdate(
            { cmp_id, tableNumber },
            {
              status: "available",
              currentOrders: 0, // ✅ Reset order count
              updatedAt: new Date(),
            },
            { new: true, session },
          );

          if (updateTableStatus) {
            updatedTables.push(tableNumber);
            console.log(`Table ${tableNumber} status updated to available`);
          }
        }
      }

      // ✅ No manual commit here
      res.status(200).json({
        success: true,
        message: "KOT payment updated successfully",
        data: {
          saleNumber,
          salesRecord: savedVoucherData[0],
          discountApplied: discountAmount || 0,
          isComplimentary: isComplimentary,
          isManuallyComplimentary: isManuallyComplimentary,
          kotData,
          // ✅ RETURN for confirmation
        },
      });
    });
  } catch (error) {
    console.error("Error updating KOT:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error while updating KOT",
    });
  } finally {
    await session.endSession();
  }
};
// NEW: Helper function to create split payment array
async function createSplitPaymentArray(payments, cmp_id, session) {
  const paymentArray = [];

  for (const payment of payments) {
    console.log("Processing payment:", JSON.stringify(payment, null, 2));

    // Find the account (cash or bank) from the database
    const account = await Party.findOne({
      cmp_id,
      _id: payment.accountId,
    })
      .populate("accountGroup")
      .session(session)
      .lean();

    console.log("Found account:", JSON.stringify(account, null, 2));

    if (!account) {
      throw new Error(
        `Payment account ${payment.accountName} (ID: ${payment.accountId}) not found in database`,
      );
    }

    const accountName =
      account.partyName ||
      account.name ||
      account.ledgerName ||
      payment.accountName;

    if (!accountName) {
      console.error("Account object:", account);
      throw new Error(
        `Account has no name field. Available fields: ${Object.keys(account).join(", ")}`,
      );
    }

    // ✅ FIX: Map payment method to the correct type field
    let paymentType;
    const method = payment.method.toLowerCase();

    if (method === "cash") {
      paymentType = "cash";
    } else if (["upi", "online", "card", "bank"].includes(method)) {
      paymentType = "upi";
    } else {
      paymentType = "upi"; // Default to upi for online payments
    }

    // ✅ FIX: Create object matching the schema
    paymentArray.push({
      type: paymentType, // ✅ Required field
      amount: Number(payment.amount),
      ref_id: account._id, // ✅ Required field
      // Optional: Store additional info in a separate field if needed
      _metadata: {
        partyName: accountName,
        accountGroup: account.accountGroup,
        method: payment.method,
      },
    });

    console.log(
      "Added to payment array:",
      paymentArray[paymentArray.length - 1],
    );
  }

  return paymentArray;
}

// NEW: Helper function to process split payment settlements
// async function processSplitPaymentSettlements(
//   payments,
//   cmp_id,
//   savedVoucher,
//   req,
//   session
// ) {
//   console.log('Processing settlements for', payments.length, 'payments');

//   for (const payment of payments) {
//     // Find the account
//     const account = await Party.findOne({
//       cmp_id,
//       _id: payment.accountId,
//     })
//       .populate("accountGroup")
//       .session(session);

//     if (!account) {
//       console.warn(`Account ${payment.accountId} not found for settlement, skipping...`);
//       continue;
//     }

//     const amount = Number(payment.amount);

//     // ✅ Map method to settlement type
//     const settlementType = payment.method === 'cash' ? 'cash' : 'bank';

//     // Create settlement entry using the helper function
//     await saveSettlementData(
//       account,
//       cmp_id,
//       settlementType,
//       "sales",
//       "Sales",
//       savedVoucher.salesNumber,
//       savedVoucher._id,
//       amount,
//       new Date(),
//       req,
//       session
//     );

//     console.log(`Settlement created for ${account.partyName || account.name}: ₹${amount}`);
//   }
// }

async function getRestaurantVoucherSeries(cmp_id, session) {
  const SaleVoucher = await VoucherSeriesModel.findOne({
    cmp_id,
    voucherType: "sales",
  }).session(session);
  if (!SaleVoucher) throw new Error("Sale voucher not found");

  const specificVoucherSeries = SaleVoucher.series.find(
    (series) => series.under === "restaurant",
  );
  if (!specificVoucherSeries)
    throw new Error("No 'restaurant' voucher series found");

  return specificVoucherSeries;
}

async function getSelectedParty(
  cmp_id,
  paymentDetails,
  cashAmt,
  onlineAmt,
  kotData,
  isPostToRoom,
  session,
) {
  let partyId, guestId;

  if (isPostToRoom || kotData?.voucherNumber?.[0]?.checkInNumber) {
    const checkInData = await CheckIn.findOne({
      voucherNumber: kotData?.voucherNumber[0]?.checkInNumber,
      cmp_id,
    }).session(session);

    if (!checkInData)
      throw new Error(
        `CheckIn not found: ${kotData?.voucherNumber[0]?.checkInNumber}`,
      );

    partyId = checkInData.customerId.toString();
    guestId = checkInData.guestId.toString();
  } else if (paymentDetails?.paymentMode === "single") {
    if (cashAmt > 0) {
      partyId = guestId = paymentDetails?.selectedCash;
    } else if (onlineAmt > 0) {
      partyId = guestId = paymentDetails?.selectedBank;
    } else {
      throw new Error("Single payment mode: no valid cashAmt or onlineAmt");
    }
  } else {
    partyId =
      paymentDetails?.splitRow?.find((it) => it.type === "credit")?.source ??
      paymentDetails?.splitRow?.[0]?.source;

    if (!partyId)
      throw new Error(
        "Split payment mode: could not resolve partyId from splitRow",
      );
    guestId = partyId;
  }

  const selectedParty = await Party.findOne({ _id: partyId, cmp_id })
    .populate("accountGroup")
    .session(session);

  const selectedGuest =
    partyId === guestId
      ? selectedParty
      : await Party.findOne({ _id: guestId, cmp_id })
          .populate("accountGroup")
          .session(session);

  if (!selectedParty) throw new Error(`Party not found: ${partyId}`);
  if (!selectedGuest) throw new Error(`Guest not found: ${guestId}`);

  return { partyIdFetched: selectedParty, guestIdFetched: selectedGuest };
}

async function createPaymentSplittingArray(paymentDetails, cashAmt, onlineAmt) {
  const arr = [];
  if (paymentDetails?.paymentMode === "credit" && cashAmt > 0) {
    arr.push({
      type: "credit",
      amount: cashAmt,
      source: paymentDetails?.selectedCreditor?._id,
      subsource: paymentDetails?.selectedCreditor?.partyName,
      ref_id: paymentDetails?.selectedCreditor?._id,
      reference_name: paymentDetails?.selectedCreditor?.partyName,
      credit_reference_type: paymentDetails?.selectedCreditor?.partyName,
      creditor_gst: paymentDetails?.selectedCreditor?.gstNo,
    });
  }
  if (paymentDetails?.paymentMode !== "credit" && cashAmt > 0) {
    let referral = await partyModel.findOne({
      _id: paymentDetails?.selectedCash,
    });

    arr.push({
      type: "cash",
      amount: cashAmt,
      source: paymentDetails?.selectedCash,
      subsource: referral?.partyName,
      ref_id: paymentDetails?.selectedCash,
      reference_name: referral?.partyName,
    });
  }
  if (onlineAmt > 0) {
    let referral = await partyModel.findOne({
      _id: paymentDetails?.selectedBank,
    });
    arr.push({
      type: referral.under || "bank",
      amount: onlineAmt,
      source: paymentDetails?.selectedBank,
      subsource: referral?.partyName,
      ref_id: paymentDetails?.selectedBank,
      reference_name: referral?.partyName,
    });
  }

  if (paymentDetails?.paymentMode === "split") {
    arr.push(...paymentDetails?.splitRow);
  }
  return arr;
}

// async function createSplitPaymentArray(payments, cmp_id, session) {
//   const paymentArray = [];

//   for (const payment of payments) {
//     // Find the account (cash or bank) from the database
//     const account = await Party.findOne({
//       cmp_id,
//       _id: payment.accountId,
//     })
//       .populate('accountGroup')
//       .session(session);

//     if (account) {
//       paymentArray.push({
//         party: {
//           _id: account._id,
//           partyName: account.partyName || account.name || payment.accountName,
//           accountGroup: account.accountGroup,
//         },
//         amount: Number(payment.amount),
//         paymentType: payment.method === "cash" ? "cash" : "bank",
//       });
//     } else {
//       console.error(`Account not found for payment:`, payment);
//       throw new Error(`Payment account ${payment.accountName} not found`);
//     }
//   }

//   return paymentArray;
// }

// // NEW: Helper function to process split payment settlements
// async function processSplitPaymentSettlements(
//   payments,
//   cmp_id,
//   savedVoucher,
//   req,
//   session
// ) {
//   for (const payment of payments) {
//     // Find the account
//     const account = await Party.findOne({
//       cmp_id,
//       _id: payment.accountId,
//     })
//       .populate("accountGroup")
//       .session(session);

//     if (!account) continue;

//     const amount = Number(payment.amount);

//     // Create settlement entry for each payment
//     const settlementData = {
//       cmp_id,
//       party: account._id,
//       amount: amount,
//       voucherId: savedVoucher._id,
//       voucherType: "sales",
//       paymentMethod: payment.method,
//       transactionDate: new Date(),
//       createdBy: req.user?._id,
//       description: `Split payment - ${payment.accountName}`,
//     };

//     // Save settlement
//     await Settlement.create([settlementData], { session });

//     // Update party balance if needed
//     if (account.accountGroup?.name === "Cash-in-Hand" ||
//         account.accountGroup?.name === "Bank Accounts") {
//       await Party.updateOne(
//         { _id: account._id },
//         { $inc: { currentBalance: amount } },
//         { session }
//       );
//     }
//   }
// }

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
  kotData,
  party,
  guest,
  selectedParty,
  selectedGuest,
  paymentSplittingArray,
  additionalChargesArray = null,
  discountBasedOnGrossAmount,
  session,
  complementaryWithTax = false,
) {
  // console.log("additionalChargesArray", additionalChargesArray);
  // ✅ FIXED: Use SUBTOTAL (BEFORE discount)
  const originalTotal = Number(kotData?.subtotal || kotData?.total || 0); // 1000 ✅
  const additionalCharges =
    additionalChargesArray?.length > 0 ? additionalChargesArray : [];
  const isComplimentary = req.body.isComplimentary || false;
  const isPostToRoom = req.body.isPostToRoom || false;
  const saleDate = req.body?.selectedSaleDate || new Date();

  console.log("kotData", paymentSplittingArray);
  // ✅ Calculate totals

  let items = kotData?.items || [];

  if (isComplimentary && !complementaryWithTax) {
    items = items.map((item) => {
      const taxAmount =
        Number(item.totalIgstAmt || 0) ||
        Number(item.igstAmount || 0) ||
        Number(item.taxAmount || 0);

      return {
        ...item,
        igstAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        totalIgstAmt: 0,
        taxAmount: 0,
        total: Number(item.total || 0) - taxAmount,
        individualTotal: Number(item.individualTotal || 0) - taxAmount,
      };
    });
  }

  const totalAdditionalCharges = additionalCharges?.reduce((sum, charge) => {
    console.log("charge", charge);
    return (
      sum + Number(charge.finalValue || charge.amount || charge.value || 0)
    );
  }, 0);

  const discountTotal = additionalCharges
    .filter((charge) => charge.action === "sub")
    .reduce((sum, charge) => sum + Number(charge.finalValue || 0), 0);

  const finalAmount = discountBasedOnGrossAmount
    ? originalTotal - discountTotal
    : originalTotal;

  console.log("🔥 FINAL CALCULATIONS:", {
    originalTotal, // 1000
    discountTotal, // 200
    finalAmount, // 800
    additionalCharges,
  });
  console.log("req.sUserId", req.sUserId);
  return await salesModel.create(
    [
      {
        date: saleDate || new Date(),
        selectedDate: new Date().toLocaleDateString(),
        voucherType: "sales",
        serialNumber: saleNumber.usedSeriesNumber,
        userLevelSerialNumber: saleNumber.usedSeriesNumber,
        salesNumber: saleNumber.voucherNumber,
        series_id: specificVoucherSeries._id.toString(),
        usedSeriesNumber: saleNumber.usedSeriesNumber,
        Primary_user_id: req.pUserId || req.owner,
        cmp_id,
        Secondary_user_id: req.sUserId,
        party,
        guest,
        partyAccount: selectedParty.accountGroup?.accountGroup,
        items: items,
        despatchDetails: {}, // ✅ Added missing
        address: kotData?.customer,

        subTotal: originalTotal,
        additionalCharges: additionalCharges,
        totalAdditionalCharges: totalAdditionalCharges,
        totalWithAdditionalCharges: finalAmount,
        finalAmount: finalAmount,
        isComplimentary: isComplimentary, // ✅ SAVE FLAG

        narration: req.body.narration || "",
        remarks: req.body.remarks || "",
        note: req.body.note || req.body.remarks || "",

        paymentSplittingData: paymentSplittingArray,
        convertedFrom: kotData?.voucherNumber,
        isPostToRoom: isPostToRoom,
      },
    ],
    { session },
  );
}

async function createTallyEntry(
  cmp_id,
  req,
  selectedParty,
  kotData,
  savedVoucher,
  paidAmount,
  pendingAmount,
  session,
) {
  const tallyEntry = await TallyData.create(
    [
      {
        Primary_user_id: req.pUserId || req.owner,
        cmp_id,
        party_id: selectedParty?._id,
        party_name: selectedParty?.partyName,
        mobile_no: selectedParty?.mobileNumber,
        bill_date: new Date(),
        bill_no: savedVoucher?.salesNumber,
        billId: savedVoucher?._id,
        bill_amount: paidAmount || 0,
        bill_pending_amt: pendingAmount,
        accountGroup: selectedParty?.accountGroup,
        user_id: req.sUserId,
        advanceAmount: 0,
        advanceDate: new Date(),
        classification: "Cr",
        source: "sales",
      },
    ],
    { session },
  );

  return tallyEntry[0]; // since .create with array returns an array
}

async function saveSettlement(
  paymentDetails,
  selectedParty,
  cmp_id,
  savedVoucher,
  paidAmount,
  cashAmt,
  onlineAmt,
  req,
  session,
) {
  if (paymentDetails?.paymentMode === "single") {
    await saveSettlementData(
      selectedParty,
      cmp_id,
      "cash",
      "sales",
      "Sales",
      savedVoucher?.salesNumber,
      savedVoucher?._id,
      paidAmount,
      new Date(),
      // selectedParty?.partyName,
      req,
      session,
    );
  } else {
    console.log("paymentDetails", paymentDetails);
    paymentDetails.splitRow.forEach(async (split) => {
      let selectedParty = await partyModel.findById(split.source);
      await saveSettlementData(
        selectedParty,
        cmp_id,
        split.type,
        "sales",
        "Sales",
        savedVoucher?.salesNumber,
        savedVoucher?._id,
        split.amount,
        new Date(),
        // selectedParty?.partyName,
        req,
        session,
      );
    });
  }
}

// function used to fetch bank and cash online details
export const getPaymentType = async (req, res) => {
  console.log("cmp_id", req.params.cmp_id);
  try {
    const bankDetails = await Party.find({
      cmp_id: req.params.cmp_id,
      partyType: "bank",
    });
    const cashDetails = await Party.find({
      cmp_id: req.params.cmp_id,
      partyType: "cash",
    });
    const paymentBelongsTo = { bankDetails, cashDetails };
    res.status(200).json({
      success: true,
      data: paymentBelongsTo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching bank and cash details",
    });
  }
};

// function used to fetch sale data for print
export const getSalePrintData = async (req, res) => {
  try {
    const { cmp_id, kotId } = req.params;
    let updatedData = {};
    let salesData = await salesModel
      .findOne({
        _id: kotId, // kotId parameter is actually the saleId for direct sales
        cmp_id: cmp_id,
      })
      .lean();

    // If not found, try to find by convertedFrom (for KOT-based sales)
    if (!salesData) {
      salesData = await salesModel
        .findOne({
          cmp_id: cmp_id,
          "convertedFrom.id": kotId, // Here kotId is the actual KOT ID
        })
        .lean();
    }
    let findKotData = await kotModal
      .findOne({
        voucherNumber: salesData?.convertedFrom[0]?.voucherNumber,
        cmp_id: cmp_id,
      })
      .populate({
        path: "roomId",
        select: "roomName", // ✅ CRITICAL - Select both fields
      })
      .lean();
    if (findKotData) {
      console.log("findKotData", findKotData);
      let roomDetails = {
        foodPlanDetails: findKotData?.foodPlanDetails,
        roomno: findKotData?.roomId?.roomName,
      };
      updatedData = { ...salesData, roomDetails };
    } else {
      updatedData = salesData;
    }
    console.log("updatedData", updatedData);
    res.status(200).json({
      success: true,
      data: updatedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching sales details",
      error: error.message,
    });
  }
};
// controllers/tableController.js

export const saveTableNumber = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { tableNumber, status, description } = req.body;
    let alreadyExists = await Table.findOne({ tableNumber, cmp_id });

    if (alreadyExists) {
      return res.status(400).json({ message: "Table number already exists" });
    }

    if (!tableNumber) {
      return res.status(400).json({ message: "Table number is required" });
    }

    const newTable = new Table({
      cmp_id,
      tableNumber,
      description,
      status: status || "available",
    });

    await newTable.save();

    res.status(201).json({
      message: "Table number saved successfully",
      table: newTable,
    });
  } catch (error) {
    console.error("Error saving table number:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTables = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    if (!cmp_id) {
      return res
        .status(400)
        .json({ success: false, message: "Company ID is required" });
    }

    // Fetch tables filtered by company ID from database
    const tables = await Table.find({ cmp_id: cmp_id });
    res.status(200).json({
      success: true,
      tables, // array of table documents with fields like _id, tableNumber etc.
    });
  } catch (error) {
    console.error("Error fetching tables:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error getting tables" });
  }
};

export const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, description } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Table ID is required" });
    }

    if (!tableNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Table number is required" });
    }

    // Check if table exists
    const existingTable = await Table.findById(id);
    if (!existingTable) {
      return res
        .status(404)
        .json({ success: false, message: "Table not found" });
    }

    // Check if the new table number already exists for this company (excluding current table)
    const duplicateTable = await Table.findOne({
      companyId: existingTable.companyId,
      tableNumber: tableNumber.trim(),
      _id: { $ne: id },
    });

    if (duplicateTable) {
      return res.status(409).json({
        success: false,
        message: "Table number already exists",
      });
    }

    // Update table
    const updatedTable = await Table.findByIdAndUpdate(
      id,
      {
        tableNumber: tableNumber.trim(),
        description: description.trim(),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Table updated successfully",
      table: updatedTable,
    });
  } catch (error) {
    console.error("Error updating table:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID format",
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Server error updating table" });
  }
};

// DELETE - Delete a table
export const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Table ID is required" });
    }

    // Check if table exists
    const existingTable = await Table.findById(id);
    if (!existingTable) {
      return res
        .status(404)
        .json({ success: false, message: "Table not found" });
    }

    // Optional: Check if table is currently in use (has active orders, reservations, etc.)
    // const hasActiveOrders = await Order.findOne({ tableId: id, status: 'active' });
    // if (hasActiveOrders) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Cannot delete table with active orders"
    //   });
    // }

    // Delete table
    await Table.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting table:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid table ID format",
      });
    }

    res
      .status(500)
      .json({ success: false, message: "Server error deleting table" });
  }
};
export const updateTableStatus = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { tableNumber, status } = req.body;

    const updatedTable = await Table.findOneAndUpdate(
      { cmp_id, tableNumber },
      { status },
      { new: true },
    );

    res.status(200).json({ success: true, data: updatedTable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getKotDataByTable = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { tableNumber, status } = req.query;

    const filter = { cmp_id };
    if (tableNumber) {
      filter.tableNumber = tableNumber;
    }
    if (status) {
      filter.status = status;
    }

    const kots = await kotModal.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: kots });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateConfigurationForKotApproval = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const data = req.body;

    // update object
    const updateData = {
      $set: {
        [`configurations.0.kotAutoApproval`]: data?.checked,
      },
    };

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

export const getSummaryDashboard = async (req, res) => {
  try {
    const {
      cmp_id,
      date,
      businessType,
      dateRange,
      owner,
      groupBy,
      includeOutlets,
    } = req.query;
    console.log("Summary dashboard query:", req.query);

    if (!owner) {
      return res.status(400).json({
        success: false,
        error: "Owner ID is required",
      });
    }

    // Validate ObjectId format for owner
    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Owner ID format",
      });
    }

    // Parse the selected date or use today
    const selectedDate = date ? new Date(date) : new Date();
    console.log("selectedDate", selectedDate);

    // Validate date
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format",
      });
    }

    // Handle different date ranges for daily/selected period
    let startDate, endDate;

    if (dateRange === "month") {
      startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        0,
      );
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get start and end of current month for monthly comparison
    const startOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1,
    );
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0,
    );
    endOfMonth.setHours(23, 59, 59, 999);

    console.log("Date Range:", startDate, "to", endDate);

    // Step 1: Find all organizations owned by this owner
    const organizations = await Organization.find({
      owner: new mongoose.Types.ObjectId(owner),
      isBlocked: false,
      isApproved: true,
    }).select("_id name companyName");

    console.log(
      `Found ${organizations.length} organizations for owner ${owner}`,
    );

    if (organizations.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No organizations found for this owner",
      });
    }

    // Extract organization IDs
    const organizationIds = organizations.map((org) => org._id);

    // If cmp_id is provided, filter to that specific organization
    const targetOrgIds =
      cmp_id && mongoose.Types.ObjectId.isValid(cmp_id)
        ? [new mongoose.Types.ObjectId(cmp_id)]
        : organizationIds;

    // Base match conditions for all organizations owned by this owner
    const baseMatch = {
      cmp_id: { $in: targetOrgIds },
      $or: [
        { isCancelled: { $exists: false } },
        { isCancelled: false },
        { isCancelled: null },
      ],
    };

    // Enhanced function to categorize sales by direct business type
    const categorizeSales = (sales) => {
      const result = {
        hotel: {
          totalSales: 0,
          cashReceipt: 0,
          bankReceipt: 0,
          upiAmount: 0,
          chequeAmount: 0,
          creditAmount: 0,
          totalTax: 0,
          totalDiscount: 0,
          expense: 0,
          itemCount: 0,
          transactionCount: 0,
          netSales: 0,
        },
        restaurant: {
          totalSales: 0,
          cashReceipt: 0,
          bankReceipt: 0,
          upiAmount: 0,
          chequeAmount: 0,
          creditAmount: 0,
          totalTax: 0,
          totalDiscount: 0,
          expense: 0,
          itemCount: 0,
          transactionCount: 0,
          netSales: 0,
        },
      };

      console.log("Processing sales:", sales.length);

      sales.forEach((sale) => {
        // Calculate payment splits with detailed breakdown
        let cashAmount = 0,
          bankAmount = 0,
          creditAmount = 0,
          upiAmount = 0,
          chequeAmount = 0;

        if (
          sale.paymentSplittingData &&
          Array.isArray(sale.paymentSplittingData)
        ) {
          sale.paymentSplittingData.forEach((payment) => {
            const amount = Number(payment.amount) || 0;
            const paymentType = payment.type?.toLowerCase() || "";

            switch (paymentType) {
              case "cash":
                cashAmount += amount;
                break;
              case "upi":
                upiAmount += amount;
                bankAmount += amount;
                break;
              case "cheque":
              case "check":
                chequeAmount += amount;
                bankAmount += amount;
                break;
              case "card":
              case "debit":
              case "credit_card":
                bankAmount += amount;
                break;
              case "credit":
                creditAmount += amount;
                break;
              case "bank":
              case "online":
              case "netbanking":
                bankAmount += amount;
                break;
              default:
                cashAmount += amount;
                break;
            }
          });
        } else {
          cashAmount = Number(sale.finalAmount) || 0;
        }

        // Calculate taxes and other details
        let totalTax = 0;
        let totalDiscount = 0;
        let itemCount = 0;

        if (sale.items && Array.isArray(sale.items)) {
          itemCount = sale.items.length;

          sale.items.forEach((item) => {
            totalTax += Number(item.totalIgstAmt || 0);

            if (item.GodownList && Array.isArray(item.GodownList)) {
              item.GodownList.forEach((godown) => {
                totalDiscount += Number(godown.discountAmount || 0);
              });
            }
          });
        }

        const finalAmount = Number(sale.finalAmount) || 0;
        const netSales = finalAmount - totalTax;
        const expense = finalAmount * 0.05;

        const saleData = {
          totalSales: finalAmount,
          netSales: netSales,
          cashReceipt: cashAmount,
          bankReceipt: bankAmount,
          upiAmount: upiAmount,
          chequeAmount: chequeAmount,
          creditAmount: creditAmount,
          totalTax: totalTax,
          totalDiscount: totalDiscount,
          expense: expense,
          itemCount: itemCount,
          transactionId: sale._id,
        };

        // Business type determination logic
        let targetCategory = null;

        if (sale.businessType) {
          const businessTypeValue = sale.businessType.toLowerCase();
          if (
            businessTypeValue === "hotel" ||
            businessTypeValue === "accommodation"
          ) {
            targetCategory = result.hotel;
          } else if (
            businessTypeValue === "restaurant" ||
            businessTypeValue === "food"
          ) {
            targetCategory = result.restaurant;
          }
        }

        if (!targetCategory && sale.party?.businessType) {
          const partyBusinessType = sale.party.businessType.toLowerCase();
          if (
            partyBusinessType === "hotel" ||
            partyBusinessType === "accommodation"
          ) {
            targetCategory = result.hotel;
          } else if (
            partyBusinessType === "restaurant" ||
            partyBusinessType === "food"
          ) {
            targetCategory = result.restaurant;
          }
        }

        if (!targetCategory && (sale.department || sale.category)) {
          const dept = (sale.department || sale.category || "").toLowerCase();
          if (
            dept === "hotel" ||
            dept === "accommodation" ||
            dept === "rooms"
          ) {
            targetCategory = result.hotel;
          } else if (
            dept === "restaurant" ||
            dept === "food" ||
            dept === "dining"
          ) {
            targetCategory = result.restaurant;
          }
        }

        if (!targetCategory && sale.party?.accountGroupName) {
          const accountGroup = sale.party.accountGroupName.toLowerCase();
          if (
            accountGroup.includes("hotel") ||
            accountGroup.includes("accommodation")
          ) {
            targetCategory = result.hotel;
          } else if (
            accountGroup.includes("restaurant") ||
            accountGroup.includes("food")
          ) {
            targetCategory = result.restaurant;
          }
        }

        if (!targetCategory && sale.party?.partyName) {
          const partyName = sale.party.partyName.toLowerCase();
          if (
            partyName.includes("hotel") ||
            partyName.includes("accommodation") ||
            partyName.includes("room")
          ) {
            targetCategory = result.hotel;
          } else if (
            partyName.includes("restaurant") ||
            partyName.includes("food") ||
            partyName.includes("dining")
          ) {
            targetCategory = result.restaurant;
          }
        }

        if (!targetCategory) {
          targetCategory =
            finalAmount > 3000 ? result.hotel : result.restaurant;
        }

        // Add to the appropriate category
        Object.keys(saleData).forEach((key) => {
          if (key !== "transactionId" && typeof saleData[key] === "number") {
            targetCategory[key] = (targetCategory[key] || 0) + saleData[key];
          }
        });
        targetCategory.transactionCount =
          (targetCategory.transactionCount || 0) + 1;
      });

      return result;
    };

    // Build aggregation pipeline with enhanced lookups
    const buildAggregationPipeline = (dateMatchCondition) => [
      {
        $match: {
          ...baseMatch,
          ...dateMatchCondition,
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "cmp_id",
          foreignField: "_id",
          as: "organization",
        },
      },
      {
        $unwind: {
          path: "$organization",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "parties",
          localField: "party",
          foreignField: "_id",
          as: "party",
        },
      },
      {
        $unwind: {
          path: "$party",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          finalAmount: 1,
          paymentSplittingData: 1,
          partyAccount: 1,
          businessType: 1,
          department: 1,
          category: 1,
          party: {
            partyName: 1,
            accountGroupName: 1,
            businessType: 1,
          },
          organization: {
            _id: 1,
            name: 1,
            companyName: 1,
          },
          items: 1,
          date: 1,
          createdAt: 1,
          cmp_id: 1,
        },
      },
    ];

    // Execute queries for daily and monthly data
    const [dailySales, monthlySales] = await Promise.all([
      salesModel.aggregate(
        buildAggregationPipeline({ date: { $gte: startDate, $lte: endDate } }),
      ),
      salesModel.aggregate(
        buildAggregationPipeline({
          date: { $gte: startOfMonth, $lte: endOfMonth },
        }),
      ),
    ]);

    console.log(
      `Found ${dailySales.length} daily sales and ${monthlySales.length} monthly sales`,
    );

    // Process daily and monthly data
    const dailyData = categorizeSales(dailySales);
    dailyData.hotel.balance =
      dailyData.hotel.totalSales - dailyData.hotel.expense;
    dailyData.restaurant.balance =
      dailyData.restaurant.totalSales - dailyData.restaurant.expense;

    const monthlyData = categorizeSales(monthlySales);
    monthlyData.hotel.balance =
      monthlyData.hotel.totalSales - monthlyData.hotel.expense;
    monthlyData.restaurant.balance =
      monthlyData.restaurant.totalSales - monthlyData.restaurant.expense;

    // Calculate combined data
    const calculateCombined = (data) => {
      const totalSales = data.hotel.totalSales + data.restaurant.totalSales;
      const totalTransactions =
        data.hotel.transactionCount + data.restaurant.transactionCount;

      return {
        totalSales: totalSales,
        netSales: data.hotel.netSales + data.restaurant.netSales,
        cashReceipt: data.hotel.cashReceipt + data.restaurant.cashReceipt,
        bankReceipt: data.hotel.bankReceipt + data.restaurant.bankReceipt,
        upiAmount: data.hotel.upiAmount + data.restaurant.upiAmount,
        chequeAmount: data.hotel.chequeAmount + data.restaurant.chequeAmount,
        creditAmount: data.hotel.creditAmount + data.restaurant.creditAmount,
        totalTax: data.hotel.totalTax + data.restaurant.totalTax,
        totalDiscount: data.hotel.totalDiscount + data.restaurant.totalDiscount,
        expense: data.hotel.expense + data.restaurant.expense,
        balance: totalSales - (data.hotel.expense + data.restaurant.expense),
        transactionCount: totalTransactions,
        averageTicketSize:
          totalTransactions > 0 ? totalSales / totalTransactions : 0,
        itemCount: data.hotel.itemCount + data.restaurant.itemCount,
      };
    };

    const dailyCombined = calculateCombined(dailyData);
    const monthlyCombined = calculateCombined(monthlyData);

    // Calculate analytics
    const calculateAnalytics = (combined) => ({
      paymentMethodBreakdown: {
        cashPercentage:
          combined.totalSales > 0
            ? (combined.cashReceipt / combined.totalSales) * 100
            : 0,
        bankPercentage:
          combined.totalSales > 0
            ? (combined.bankReceipt / combined.totalSales) * 100
            : 0,
        creditPercentage:
          combined.totalSales > 0
            ? (combined.creditAmount / combined.totalSales) * 100
            : 0,
        upiPercentage:
          combined.totalSales > 0
            ? (combined.upiAmount / combined.totalSales) * 100
            : 0,
      },
      businessMix: {
        hotelPercentage:
          combined.totalSales > 0
            ? (dailyData.hotel.totalSales / combined.totalSales) * 100
            : 0,
        restaurantPercentage:
          combined.totalSales > 0
            ? (dailyData.restaurant.totalSales / combined.totalSales) * 100
            : 0,
      },
    });

    // Prepare base dashboard data
    const dashboardData = {
      daily: {
        hotel: dailyData.hotel,
        restaurant: dailyData.restaurant,
        combined: dailyCombined,
      },
      monthly: {
        hotel: monthlyData.hotel,
        restaurant: monthlyData.restaurant,
        combined: monthlyCombined,
      },
      analytics: calculateAnalytics(dailyCombined),
      metadata: {
        selectedDate: selectedDate.toISOString().split("T")[0],
        dateRange: dateRange || "day",
        totalDailySales: dailySales.length,
        totalMonthlySales: monthlySales.length,
        dateRanges: {
          daily: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          monthly: {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString(),
          },
        },
        queryParams: {
          cmp_id: cmp_id || "all_owner_organizations",
          owner,
          businessType: businessType || null,
          dateRange: dateRange || "day",
        },
        organizationCount: organizations.length,
      },
    };

    // If outlet data is requested, add outlet-wise breakdown
    if (includeOutlets === "true" || groupBy === "outlet") {
      console.log("Including outlet-wise data...");

      // Build outlet aggregation pipeline - FIXED VERSION
      const outletAggregationPipeline = [
        {
          $match: {
            ...baseMatch,
            date: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "organizations",
            localField: "cmp_id",
            foreignField: "_id",
            as: "organization",
          },
        },
        {
          $unwind: {
            path: "$organization",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "parties",
            localField: "party",
            foreignField: "_id",
            as: "party",
          },
        },
        {
          $unwind: {
            path: "$party",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            outletName: {
              $cond: {
                if: { $ne: ["$party.partyName", null] },
                then: "$party.partyName",
                else: {
                  $cond: {
                    if: { $ne: ["$organization.name", null] },
                    then: "$organization.name",
                    else: "$organization.companyName",
                  },
                },
              },
            },
            organizationName: {
              $cond: {
                if: { $ne: ["$organization.name", null] },
                then: "$organization.name",
                else: "$organization.companyName",
              },
            },
          },
        },
        {
          $group: {
            _id: {
              organizationId: "$organization._id",
              organizationName: "$organizationName",
              outletName: "$outletName",
            },
            sales: {
              $sum: { $ifNull: ["$finalAmount", 0] },
            },
            orders: { $sum: 1 },

            // Calculate payment totals directly in group stage
            cashTotal: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$paymentSplittingData", []] },
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: [{ $toLower: "$$this.type" }, "cash"] },
                      {
                        $add: [
                          "$$value",
                          { $toDouble: { $ifNull: ["$$this.amount", 0] } },
                        ],
                      },
                      "$$value",
                    ],
                  },
                },
              },
            },

            bankTotal: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$paymentSplittingData", []] },
                  initialValue: 0,
                  in: {
                    $cond: [
                      {
                        $in: [
                          { $toLower: "$$this.type" },
                          ["upi", "cheque", "card", "debit", "bank", "online"],
                        ],
                      },
                      {
                        $add: [
                          "$$value",
                          { $toDouble: { $ifNull: ["$$this.amount", 0] } },
                        ],
                      },
                      "$$value",
                    ],
                  },
                },
              },
            },

            upiTotal: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$paymentSplittingData", []] },
                  initialValue: 0,
                  in: {
                    $cond: [
                      { $eq: [{ $toLower: "$$this.type" }, "upi"] },
                      {
                        $add: [
                          "$$value",
                          { $toDouble: { $ifNull: ["$$this.amount", 0] } },
                        ],
                      },
                      "$$value",
                    ],
                  },
                },
              },
            },

            taxTotal: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$items", []] },
                  initialValue: 0,
                  in: {
                    $add: [
                      "$$value",
                      { $toDouble: { $ifNull: ["$$this.totalIgstAmt", 0] } },
                    ],
                  },
                },
              },
            },

            discountTotal: {
              $sum: {
                $reduce: {
                  input: { $ifNull: ["$items", []] },
                  initialValue: 0,
                  in: {
                    $reduce: {
                      input: { $ifNull: ["$$this.GodownList", []] },
                      initialValue: "$$value",
                      in: {
                        $add: [
                          "$$value",
                          {
                            $toDouble: {
                              $ifNull: ["$$this.discountAmount", 0],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // FIXED: Use only inclusion in $project
        {
          $project: {
            id: "$_id.organizationId",
            outletName: "$_id.outletName",
            organizationName: "$_id.organizationName",
            organizationId: "$_id.organizationId",
            orders: "$orders",
            sales: "$sales",
            netSales: { $subtract: ["$sales", "$taxTotal"] },
            tax: "$taxTotal",
            discount: "$discountTotal",
            cashReceipt: "$cashTotal",
            bankReceipt: "$bankTotal",
            upiAmount: "$upiTotal",
            chequeAmount: { $literal: 0 }, // Use $literal instead of 0
            creditAmount: { $literal: 0 },
            modified: { $literal: 0 },
            rePrinted: { $literal: 0 },
            waivedOff: { $literal: 0 },
            roundOff: { $literal: 0 },
            charges: { $literal: 0 },
          },
        },
        {
          $sort: { organizationName: 1, sales: -1 },
        },
      ];

      const outletData = await salesModel.aggregate(outletAggregationPipeline);

      // If no outlet data, create placeholders
      let finalOutletData = outletData;
      if (outletData.length === 0) {
        finalOutletData = organizations.map((org) => ({
          id: org._id,
          outletName: org.name || org.companyName || "Unknown Outlet",
          organizationName: org.name || org.companyName,
          organizationId: org._id,
          orders: 0,
          sales: 0,
          netSales: 0,
          tax: 0,
          discount: 0,
          cashReceipt: 0,
          bankReceipt: 0,
          upiAmount: 0,
          chequeAmount: 0,
          creditAmount: 0,
          modified: 0,
          rePrinted: 0,
          waivedOff: 0,
          roundOff: 0,
          charges: 0,
        }));
      }

      // Calculate outlet summary
      const outletSummary = finalOutletData.reduce(
        (acc, outlet) => {
          acc.totalOutlets = finalOutletData.length;
          acc.totalOrganizations = new Set(
            finalOutletData.map((o) => o.organizationId.toString()),
          ).size;
          acc.totalSales += outlet.sales || 0;
          acc.totalOrders += outlet.orders || 0;
          acc.totalNetSales += outlet.netSales || 0;
          acc.totalTax += outlet.tax || 0;
          acc.totalDiscount += outlet.discount || 0;
          return acc;
        },
        {
          totalOutlets: 0,
          totalOrganizations: 0,
          totalSales: 0,
          totalOrders: 0,
          totalNetSales: 0,
          totalTax: 0,
          totalDiscount: 0,
        },
      );

      // Add outlet data to response
      dashboardData.outlets = {
        data: finalOutletData,
        summary: outletSummary,
        organizations: organizations.map((org) => ({
          id: org._id,
          name: org.name || org.companyName,
        })),
      };
    }

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Summary Dashboard API Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard data",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

export const getComplementaryCashOrBank = async (req, res) => {
  const cmp_id = new mongoose.Types.ObjectId(req.params.cmp_id);
  try {
    // Get all Bank/Cash accounts for the company
    const accounts = await partyModel
      .find({
        cmp_id: cmp_id,
        partyType: { $in: ["cash", "bank"] },
      })
      .select("_id partyName openingBalanceAmount isTaggedWithComplementary")
      .sort({ partyName: 1 });

    return res.status(200).json({
      message: "Accounts found successfully",
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("getComplementaryCashOrBank error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

export const addComplementaryCashOrBank = async (req, res) => {
  const cmp_id = new mongoose.Types.ObjectId(req.params.cmp_id);
  const partyId = new mongoose.Types.ObjectId(req.body.cashOrBank);
  const session = await mongoose.startSession();
  try {
    await partyModel.updateMany(
      { cmp_id },
      { $set: { isTaggedWithComplementary: false } },
      { session },
    );

    const updated = await partyModel.findOneAndUpdate(
      { _id: partyId, cmp_id },
      { $set: { isTaggedWithComplementary: true } },
      { new: true, session },
    );

    return res.status(200).json({
      message: "Updated successfully",
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("getComplementaryCashOrBank error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

export const getRestaurantCategoryWiseSalesReport = async (req, res) => {
  try {
    const { cmp_id, startDate, endDate } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const voucherSeriesDocs = await VoucherSeriesModel.find({
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      voucherType: "sales",
    }).lean();

    if (!voucherSeriesDocs.length) {
      return res.status(200).json({
        success: true,
        data: [],
        itemSummary: [],
        message: "No voucher series found for this company",
      });
    }

    const restaurantSeries = voucherSeriesDocs.flatMap((doc) =>
      (doc.series || []).filter(
        (series) =>
          String(series?.under || "")
            .trim()
            .toLowerCase() === "restaurant",
      ),
    );

    if (!restaurantSeries.length) {
      return res.status(200).json({
        success: true,
        data: [],
        itemSummary: [],
        message: "No restaurant voucher series found",
      });
    }

    const restaurantSeriesIds = restaurantSeries.map(
      (series) => new mongoose.Types.ObjectId(series._id),
    );

    const salesFilter = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      series_id: { $in: restaurantSeriesIds },
      isCancelled: false,
      date: {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    };

    const restaurantSales = await salesModel.find(salesFilter).lean();

    if (!restaurantSales.length) {
      return res.status(200).json({
        success: true,
        data: [],
        itemSummary: [],
        message: "No restaurant sales found for selected date range",
      });
    }

    const categoryIds = [
      ...new Set(
        restaurantSales.flatMap((sale) =>
          (sale.items || [])
            .map((item) => item.category)
            .filter(Boolean)
            .map((id) => id.toString()),
        ),
      ),
    ];

    const subcategoryIds = [
      ...new Set(
        restaurantSales.flatMap((sale) =>
          (sale.items || [])
            .map((item) => item.sub_category)
            .filter(Boolean)
            .map((id) => id.toString()),
        ),
      ),
    ];

    const categories = categoryIds.length
      ? await Category.find({
          _id: {
            $in: categoryIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        }).lean()
      : [];

    const subcategories = subcategoryIds.length
      ? await Subcategory.find({
          _id: {
            $in: subcategoryIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        }).lean()
      : [];

    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat._id.toString()] =
        cat.category || cat.categoryName || cat.name || "Uncategorized";
    });

    const subcategoryMap = {};
    subcategories.forEach((sub) => {
      subcategoryMap[sub._id.toString()] =
        sub.subcategory || sub.subcategoryName || sub.name || "Uncategorized";
    });

    const grouped = {};
    const itemSummaryMap = {};

    restaurantSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const categoryId = item.category
          ? item.category.toString()
          : "uncategorized";
        const subcategoryId = item.sub_category
          ? item.sub_category.toString()
          : "uncategorized";

        const categoryName = categoryMap[categoryId] || "Uncategorized";
        const subcategoryName =
          subcategoryMap[subcategoryId] || "Uncategorized";

        const qty = Number(
          item.totalCount ?? item.totalActualCount ?? item.qty ?? 0,
        );
        const amount = Number(item.total || 0);
        const productName =
          item.product_name || item.itemName || "Unnamed Item";
        const unit = item.unit || "Nos";

        if (!grouped[categoryName]) {
          grouped[categoryName] = {
            categoryName,
            totalQty: 0,
            totalAmount: 0,
            subcategories: {},
          };
        }

        if (!grouped[categoryName].subcategories[subcategoryName]) {
          grouped[categoryName].subcategories[subcategoryName] = {
            subcategoryName,
            totalQty: 0,
            totalAmount: 0,
            items: [],
          };
        }

        grouped[categoryName].subcategories[subcategoryName].items.push({
          sale_id: sale._id,
          salesNumber: sale.salesNumber,
          date: sale.date,
          product_id: item._id || null,
          product_name: productName,
          unit,
          qty,
          amount,
          category_id: item.category || null,
          subcategory_id: item.sub_category || null,
        });

        grouped[categoryName].totalQty += qty;
        grouped[categoryName].totalAmount += amount;
        grouped[categoryName].subcategories[subcategoryName].totalQty += qty;
        grouped[categoryName].subcategories[subcategoryName].totalAmount +=
          amount;

        if (!itemSummaryMap[productName]) {
          itemSummaryMap[productName] = {
            product_name: productName,
            unit,
            totalQty: 0,
            totalAmount: 0,
          };
        }

        itemSummaryMap[productName].totalQty += qty;
        itemSummaryMap[productName].totalAmount += amount;
      });
    });

    const result = Object.values(grouped).map((cat) => ({
      categoryName: cat.categoryName,
      totalQty: cat.totalQty,
      totalAmount: cat.totalAmount,
      subcategories: Object.values(cat.subcategories).map((sub) => ({
        subcategoryName: sub.subcategoryName,
        totalQty: sub.totalQty,
        totalAmount: sub.totalAmount,
        items: sub.items.sort((a, b) => new Date(a.date) - new Date(b.date)),
      })),
    }));

    const itemSummary = Object.values(itemSummaryMap).sort(
      (a, b) => b.totalQty - a.totalQty,
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant category wise sales report fetched successfully",
      data: result,
      itemSummary,
    });
  } catch (error) {
    console.error("getRestaurantCategoryWiseSalesReport ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant category wise sales report",
      error: error.message,
    });
  }
};

export const getRestaurantDateWiseItemReport = async (req, res) => {
  try {
    const { cmp_id, startDate, endDate } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const voucherSeriesDocs = await VoucherSeriesModel.find({
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      voucherType: "sales",
    }).lean();

    const restaurantSeries = voucherSeriesDocs.flatMap((doc) =>
      (doc.series || []).filter(
        (series) => String(series.under || "").toLowerCase() === "restaurant",
      ),
    );

    if (!restaurantSeries.length) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No restaurant voucher series found",
      });
    }

    const restaurantSeriesIds = restaurantSeries.map(
      (series) => new mongoose.Types.ObjectId(series._id),
    );

    const sales = await salesModel
      .find({
        cmp_id: new mongoose.Types.ObjectId(cmp_id),
        series_id: { $in: restaurantSeriesIds },
        isCancelled: false,
        date: {
          $gte: new Date(`${startDate}T00:00:00.000Z`),
          $lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      })
      .sort({ date: 1, salesNumber: 1 })
      .lean();

    if (!sales.length) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No restaurant sales found for selected date range",
      });
    }

    // 1) take voucher numbers from convertedFrom
    const kotVoucherNumbers = [
      ...new Set(
        sales.flatMap((sale) =>
          (sale.convertedFrom || [])
            .map((cf) => cf?.voucherNumber)
            .filter(Boolean),
        ),
      ),
    ];

    // 2) fetch KOT docs and populate room
    const kotDocs = await kotModal
      .find({
        voucherNumber: { $in: kotVoucherNumbers },
        cmp_id: new mongoose.Types.ObjectId(cmp_id),
      })
      .populate({
        path: "roomId",
        select: "roomName roomNo roomNumber",
      })
      .lean();

    // 3) map by voucherNumber
    const kotMap = {};
    kotDocs.forEach((kot) => {
      kotMap[kot.voucherNumber] = kot;
    });

    const groupedByDate = {};

    sales.forEach((sale) => {
      const dateKey = new Date(sale.date).toLocaleDateString("en-GB");

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: sale.date,
          displayDate: dateKey,
          items: [],
          totalQty: 0,
          totalAmount: 0,
        };
      }

      const firstConverted = sale.convertedFrom?.[0];
      const linkedKot = firstConverted?.voucherNumber
        ? kotMap[firstConverted.voucherNumber]
        : null;

      (sale.items || []).forEach((item) => {
        const qty = Number(item.totalCount || item.totalActualCount || 0);
        const amount = Number(item.total || 0);

        groupedByDate[dateKey].items.push({
          billNo: sale.salesNumber || "",
          kotNo:
            linkedKot?.voucherNumber || firstConverted?.voucherNumber || "",
          kotType: linkedKot?.type || "",
          roomNo:
            linkedKot?.roomId?.roomName ||
            linkedKot?.roomId?.roomNo ||
            linkedKot?.roomId?.roomNumber ||
            "",
          product_name: item.product_name || "",
          unit: item.unit || "Nos",
          qty,
          amount,
        });

        groupedByDate[dateKey].totalQty += qty;
        groupedByDate[dateKey].totalAmount += amount;
      });
    });

    const result = Object.values(groupedByDate);

    return res.status(200).json({
      success: true,
      message: "Restaurant date wise item report fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getRestaurantDateWiseItemReport ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant date wise item report",
      error: error.message,
    });
  }
};

export const getKotRegister = async (req, res, next) => {
  try {
    const { from, to, type, status, search, cmp_id } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    const match = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
    };

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) match.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    } else {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      match.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (type) match.type = type;
    if (status) match.status = status.toLowerCase();

    const pipeline = [
      { $match: match },

      {
        $lookup: {
          from: roomModal.collection.name,
          localField: "roomId",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
      {
        $unwind: {
          path: "$roomDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      { $unwind: "$kitchenBatches" },
      { $unwind: "$kitchenBatches.items" },

      {
        $project: {
          _id: 0,
          kotId: "$_id",
          date: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          kotNo: "$voucherNumber",
          batchNo: "$kitchenBatches.batchNo",
          itemId: "$kitchenBatches.items._id",
          itemName: "$kitchenBatches.items.product_name",
          qty: {
            $ifNull: [
              "$kitchenBatches.items.quantity",
              "$kitchenBatches.items.qty",
              0,
            ],
          },

          // take exact DB value, no hardcoding
          kotType: "$type",

          roomNo: {
            $ifNull: [
              "$roomDetails.roomName",
              "$roomDetails.roomNo",
              "$roomDetails.roomNumber",
              "$roomDetails.room_name",
              "",
            ],
          },

          foodPlan: {
            $cond: [
              {
                $and: [
                  { $isArray: "$foodPlanDetails" },
                  { $gt: [{ $size: "$foodPlanDetails" }, 0] },
                ],
              },
              {
                $reduce: {
                  input: {
                    $map: {
                      input: "$foodPlanDetails",
                      as: "fp",
                      in: {
                        $ifNull: [
                          "$$fp.planType",
                          "$$fp.foodPlanName",
                          "$$fp.name",
                          "",
                        ],
                      },
                    },
                  },
                  initialValue: "",
                  in: {
                    $cond: [
                      { $eq: ["$$value", ""] },
                      "$$this",
                      { $concat: ["$$value", ", ", "$$this"] },
                    ],
                  },
                },
              },
              "DIRECT",
            ],
          },

          status: { $toUpper: "$status" },
          remarks: { $ifNull: ["$note", "$cancelReason", ""] },
          printedAt: "$kitchenBatches.printedAt",
          checkInNumber: { $ifNull: ["$checkInNumber", ""] },
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { kotNo: { $regex: search, $options: "i" } },
                  { itemName: { $regex: search, $options: "i" } },
                  { roomNo: { $regex: search, $options: "i" } },
                  { foodPlan: { $regex: search, $options: "i" } },
                  { kotType: { $regex: search, $options: "i" } },
                  { remarks: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $sort: { printedAt: 1, kotNo: 1, batchNo: 1 } },
    ];

    const rows = await kotModal.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "KOT register fetched successfully",
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesRegister = async (req, res) => {
  try {
    const { cmp_id, from, to, status, search, includeCancelled } = req.query;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "cmp_id is required",
      });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}`;

    const fromStr = from || todayStr;
    const toStr = to || fromStr;

    const start = new Date(`${fromStr}T00:00:00.000Z`);
    const end = new Date(`${toStr}T23:59:59.999Z`);

    const voucherSeriesDocs = await VoucherSeriesModel.find({
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      voucherType: "sales",
    }).lean();

    if (!voucherSeriesDocs.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const restaurantSeries = voucherSeriesDocs.flatMap((doc) =>
      (doc.series || []).filter(
        (series) =>
          String(series?.under || "")
            .trim()
            .toLowerCase() === "restaurant",
      ),
    );

    if (!restaurantSeries.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const restaurantSeriesIds = restaurantSeries.map((series) => series._id);

    const filter = {
      cmp_id: new mongoose.Types.ObjectId(cmp_id),
      series_id: { $in: restaurantSeriesIds },
      date: {
        $gte: start,
        $lte: end,
      },
    };

    if (!includeCancelled || includeCancelled === "false") {
      filter.isCancelled = { $ne: true };
    }

    const sales = await salesModel
      .find(filter)
      .select(
        `
        _id
        date
        selectedDate
        salesNumber
        series_id
        party.partyName
        items
        paymentSplittingData
        isComplimentary
        isPostToRoom
        isCancelled
        note
        checkInId
        despatchDetails
        subTotal
        totalWithAdditionalCharges
        finalAmount
        additionalCharges
        discountAmount
        convertedFrom
      `,
      )
      .sort({ date: -1, salesNumber: -1 })
      .lean();

    // ---------- payment type helpers unchanged ----------
    const derivePaymentType = (sale) => {
      if (sale.isComplimentary) return "COMPLEMENTORY";

      const splits = Array.isArray(sale.paymentSplittingData)
        ? sale.paymentSplittingData
        : [];
      const nonZero = splits.filter((s) => Number(s?.amount || 0) > 0);

      // NEW: if nothing paid here but posted to room → CREDIT
      if (!nonZero.length && sale.isPostToRoom) {
        return "CREDIT";
      }

      // If still no payment info and not post to room
      if (!nonZero.length) return "-";

      const hasCash = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "cash",
      );
      const hasUpi = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "upi",
      );
      const hasCard = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "card",
      );
      const hasBank = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "bank",
      );
      const hasCheque = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "cheque",
      );
      const hasCredit = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "credit",
      );
      const hasSponsor = nonZero.some(
        (s) => String(s?.type || "").toLowerCase() === "sponsor",
      );

      if (
        hasCredit &&
        !hasCash &&
        !hasUpi &&
        !hasCard &&
        !hasBank &&
        !hasCheque
      ) {
        return "CREDIT";
      }

      if (
        hasSponsor &&
        !hasCash &&
        !hasUpi &&
        !hasCard &&
        !hasBank &&
        !hasCheque &&
        !hasCredit
      ) {
        return "SPONSOR";
      }

      if (hasCash && hasUpi && nonZero.length === 2) return "CASH/UPI";
      if (hasCash && !hasUpi && !hasCard && !hasBank && !hasCheque)
        return "CASH";
      if (!hasCash && hasUpi && !hasCard && !hasBank && !hasCheque)
        return "UPI";
      if (hasCard && !hasCash && !hasUpi && !hasBank && !hasCheque)
        return "CARD";
      if (hasBank && !hasCash && !hasUpi && !hasCard && !hasCheque)
        return "BANK";
      if (hasCheque && !hasCash && !hasUpi && !hasCard && !hasBank)
        return "CHEQUE";

      return "CASH/UPI";
    };

    const formatDate = (d) => {
      if (!d) return "-";
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return "-";
      const dd = String(dt.getDate()).padStart(2, "0");
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const yyyy = dt.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    const getDiscountAmount = (sale) => {
      const additionalCharges = sale?.additionalCharges || [];

      const fromAdditionalCharges = additionalCharges.reduce((sum, charge) => {
        const option = String(
          charge?.option || charge?.label || charge?.name || "",
        )
          .trim()
          .toLowerCase();

        const action = String(charge?.action || "")
          .trim()
          .toLowerCase();

        const isDiscount =
          option === "discount" ||
          option === "disc" ||
          option === "discount amount";

        const isSub =
          action === "sub" ||
          action === "minus" ||
          action === "less" ||
          action === "-";

        if (isDiscount && isSub) {
          return sum + Number(charge?.finalValue ?? charge?.value ?? 0);
        }

        return sum;
      }, 0);

      return Number(
        fromAdditionalCharges ||
          sale?.discountAmount ||
          sale?.despatchDetails?.discountAmount ||
          sale?.despatchDetails?.totalAdditionalCharges ||
          0,
      );
    };

    // ---------- KOT lookup unchanged ----------
    const convertedVoucherNumbers = sales
      .flatMap((sale) => sale.convertedFrom || [])
      .map((cf) => String(cf?.voucherNumber || "").trim())
      .filter(Boolean);

    const uniqueConvertedVoucherNumbers = [...new Set(convertedVoucherNumbers)];

    const kotDocs = uniqueConvertedVoucherNumbers.length
      ? await kotModal
          .find({
            cmp_id: new mongoose.Types.ObjectId(cmp_id),
            voucherNumber: { $in: uniqueConvertedVoucherNumbers },
          })
          .select(
            "voucherNumber type roomId checkInNumber tableNumber foodPlanDetails",
          )
          .populate("roomId", "roomName roomNo roomNumber room_name name")
          .lean()
      : [];

    const kotMap = new Map(
      kotDocs.map((kot) => [String(kot.voucherNumber).trim(), kot]),
    );

    // ---------- NEW: checkout -> agent (sponsor) map ----------
    const checkInIds = sales
      .map((s) => s.checkInId)
      .filter((id) => !!id)
      .map((id) => new mongoose.Types.ObjectId(id));

    let sponsorMap = new Map();

    if (checkInIds.length) {
      const checkouts = await CheckOut.find({
        cmp_id: new mongoose.Types.ObjectId(cmp_id),
        checkInId: { $in: checkInIds },
      })
        .select("checkInId agentId")
        .populate("agentId", "partyName")
        .lean();

      sponsorMap = new Map(
        checkouts.map((co) => [
          String(co.checkInId),
          co.agentId?.partyName || "",
        ]),
      );
    }

    // ---------- build rows ----------
    let rows = sales.map((sale) => {
      const items = sale.items || [];

      const itemDetails = items.map((item) => {
        const qty =
          Number(
            item?.totalCount ?? item?.totalActualCount ?? item?.qty ?? 0,
          ) || 0;

        const gdn = item?.GodownList?.[0] || {};
        const rawRate =
          gdn?.basePrice ??
          gdn?.selectedPriceRate ??
          item?.Priceleveles?.[0]?.pricerate ??
          item?.item_mrp ??
          Number(item?.total || 0) / (qty || 1);

        const tax =
          Number(item?.totalCgstAmt || 0) +
          Number(item?.totalSgstAmt || 0) +
          Number(item?.totalIgstAmt || 0) +
          Number(item?.totalCessAmt || 0) +
          Number(item?.totalAddlCessAmt || 0);

        return {
          name: item?.product_name || item?.itemName || "",
          qty,
          rate: Number(rawRate || 0),
          amount: Number(item?.total || 0),
          taxAmount: tax,
        };
      });

      const qty = itemDetails.reduce((sum, it) => sum + Number(it.qty || 0), 0);

      const amount = Number(
        sale?.subTotal ??
          sale?.despatchDetails?.subTotal ??
          itemDetails.reduce((sum, it) => sum + Number(it.amount || 0), 0),
      );

      const taxAmount = itemDetails.reduce(
        (sum, it) => sum + Number(it.taxAmount || 0),
        0,
      );

      const discAmount = getDiscountAmount(sale);

      const billAmount = Number(
        sale?.totalWithAdditionalCharges ??
          sale?.finalAmount ??
          amount + taxAmount - discAmount,
      );

      const paymentType = derivePaymentType(sale);

      const converted = (sale.convertedFrom || [])[0];
      const voucherNumber = converted?.voucherNumber
        ? String(converted.voucherNumber).trim()
        : "";
      const kot = voucherNumber ? kotMap.get(voucherNumber) : null;

      let billType = "-";
      let roomNo = "-";
      let foodPlan = "Direct";

      if (kot) {
        const t = String(kot.type || "").toLowerCase();
        if (t === "room service" || t === "room") billType = "ROOM SERVICE";
        else if (t === "dine-in" || t === "dining") billType = "DINE-IN";
        else if (t === "takeaway") billType = "TAKEAWAY";
        else billType = kot.type || "-";

        const room =
          kot.roomId ||
          kot.room ||
          kot.roomNo ||
          kot.roomNumber ||
          kot.room_name ||
          {};
        roomNo =
          room.roomName ||
          room.roomNo ||
          room.roomNumber ||
          room.room_name ||
          room.name ||
          "-";

        const fp =
          kot.foodPlanDetails?.[0]?.planType ||
          kot.foodPlanDetails?.[0]?.plan ||
          kot.foodPlanDetails?.[0]?.name ||
          kot.foodPlanDetails?.[0]?.foodPlanName;
        foodPlan = fp || "Direct";
      }

      // NEW: sponsor from checkout agentId
      let sponsorName = "";
      if (sale.checkInId) {
        sponsorName = sponsorMap.get(String(sale.checkInId)) || "";
      }

      const customer =
        sale?.party?.partyName || sale?.party?.name || "CASH CUSTOMER";

      return {
        date: formatDate(sale.date),
        billNo: sale.salesNumber,
        customer,
        billType,
        roomNo,
        foodPlan,
        paymentType,
        isCancelled: sale.isCancelled ? "CANCELLED" : "",
        sponsorName,
        remarks: sale.note || "",
        saleId: sale._id,

        qty,
        amount,
        taxAmount,
        discAmount,
        billAmount,

        itemDetails,
      };
    });

    if (status) {
      const s = status.trim().toUpperCase();
      rows = rows.filter((r) => (r.paymentType || "").toUpperCase() === s);
    }

    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => {
        return (
          (r.billNo || "").toLowerCase().includes(q) ||
          (r.customer || "").toLowerCase().includes(q) ||
          (r.itemDetails || []).some((it) =>
            (it.name || "").toLowerCase().includes(q),
          )
        );
      });
    }

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("getSalesRegister error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales register",
      error: err.message,
    });
  }
};

export const getRestaurantBillsDetails = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    let { checkInNumbers } = req.query;

    // 🔹 Normalize checkInNumbers (handle string or array)
    if (!checkInNumbers) {
      return res.status(400).json({
        success: false,
        message: "checkInNumbers is required",
      });
    }

    if (!Array.isArray(checkInNumbers)) {
      checkInNumbers = [checkInNumbers];
    }

    // 🔹 DB Query (optimized)
    const generatedKots = await kotModal
      .find({
        cmp_id,
        checkInNumber: { $in: checkInNumbers },
      })
      .lean();
    const kotNumbers = generatedKots.map((kot) => kot.voucherNumber);

    const sales = await salesModel
      .find({
        cmp_id,
        "convertedFrom.voucherNumber": { $in: kotNumbers },
      })
      .lean();

    // Create a lookup map: voucherNumber -> sale
    const salesMap = new Map();

    sales.forEach((sale) => {
      sale.convertedFrom.forEach((item) => {
        salesMap.set(item.voucherNumber, sale.salesNumber);
      });
    });

    console.log("salesMap", salesMap);

    // Add salesNumber to each KOT
    const updatedGeneratedKots = generatedKots.map((kot) => ({
      ...kot,
      salesNumber: salesMap.get(kot.voucherNumber) || null, // or saleNumber field if that's what you store
    }));

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      count: updatedGeneratedKots.length,
      data: updatedGeneratedKots,
    });
  } catch (error) {
    console.error("Error in getRestaurantBillsDetails:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getAllChecking = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    const checkInData = await CheckIn.find({
      cmp_id,
      status: { $nin: ["checkOut", "cancelled"] },
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Check-in data fetched successfully",
      count: checkInData.length,
      data: checkInData,
    });
  } catch (error) {
    console.error("Error in getAllChecking:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch check-in data",
      error: error.message,
    });
  }
};

export const transferKotBills = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { groupedSelected, targetRoom } = req.body;

    if (!Array.isArray(groupedSelected) || !groupedSelected.length) {
      return res.status(400).json({
        success: false,
        message: "No bills selected for transfer",
      });
    }

    if (!targetRoom?.roomId || !targetRoom?.checkInNo) {
      return res.status(400).json({
        success: false,
        message: "Target room details are missing",
      });
    }

    const allBills = groupedSelected.flatMap((group) => group.bills || []);
    const party = await partyModel.findOne({ _id: targetRoom.party });

    await Promise.all(
      allBills.map(async (bill) => {
        await kotModal.updateOne(
          { _id: bill.id },
          {
            $set: {
              checkInNumber: targetRoom.checkInNo,
              roomId: targetRoom.roomId,
              "customer.name": targetRoom.guestName || "",
            },
          },
        );

        await salesModel.updateOne(
          {
            cmp_id,
            "convertedFrom.voucherNumber": bill.billNo,
          },
          {
            $set: {
              "convertedFrom.$[].checkInNumber": targetRoom.checkInNo,
              party: party,
              partyAccount: party.accountGroupName,
            },
          },
        );
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Bills transferred successfully",
    });
  } catch (error) {
    console.error("Error in transferKotBills:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to transfer bills",
      error: error.message,
    });
  }
};

// function used to delete advance for hotel rooms


export const exportItemsToExcel = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { under } = req.query;

    const filter = {
      cmp_id,
    };

    if (req.owner) {
      filter.Primary_user_id = req.owner;
    }

    if (under) {
      const categories = await Category.find({
        cmp_id,
        ...(req.owner && { Primary_user_id: req.owner }),
        under,
      })
        .select("_id")
        .lean();

      filter.category = {
        $in: categories.map((category) => category._id),
      };
    }

   const items = await productModel
  .find(filter)
  .populate({
    path: "Priceleveles.pricelevel",
    model: "PriceLevel",
    select: "pricelevel dineIn takeaway roomService delivery",
  })
  .populate({
    path: "category",
    model: "Category",
    select: "category",
  })
  .populate({
    path: "sub_category",
    model: "Subcategory",
    select: "subcategory",
  })
  .sort({ product_name: 1 })
  .lean();


    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No items were found matching the criteria",
      });
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Items Price Levels");

    worksheet.columns = [
      {
        header: "Item ID",
        key: "itemId",
        width: 28,
      },
      {
        header: "Product Name",
        key: "productName",
        width: 30,
      },
      {
        header: "Category",
        key: "category",
        width: 15,
      },
         {
        header: "Sub Category",
        key: "subCategory",
        width: 15,
      },
         {
        header: "HSN Code",
        key: "hsnCode",
        width: 15,
      },
      {
        header: "Price Rate",
        key: "priceRate",
        width: 12,
      },
      {
        header: "Dine In",
        key: "dineIn",
        width: 12,
      },
      {
        header: "Take Away",
        key: "takeAway",
        width: 12,
      },
      {
        header: "Room Service",
        key: "roomService",
        width: 15,
      },
      {
        header: "Delivery",
        key: "delivery",
        width: 12,
      },
    ];

    items.forEach((item) => {
      let priceRate = 0;
      let dineIn = 0;
      let takeAway =0;
      let roomService = 0;
      let delivery = 0;


      item.Priceleveles?.forEach((pl) => {
        const level = pl?.pricelevel || {};
        if(item.product_name == "WHITE GRAPE SEEDLESS 100GM"){
          console.log("placed",pl)
          console.log("placedThen",level)
        }
        if (
          !level.dineIn &&
          !level.takeaway &&
          !level.roomService &&
          !level.delivery
        ) {
          console.log("levelRound",level)
          priceRate = pl?.pricerate ?? "";
        }

        if (level.dineIn === "enabled") {
          dineIn = pl?.pricerate ?? "";
        }

        if (level.takeaway === "enabled") {
          takeAway = pl?.pricerate ?? "";
        }

        if (level.roomService === "enabled") {
          roomService = pl?.pricerate ?? "";
        }

        if (level.delivery === "enabled") {
          delivery = pl?.pricerate ?? "";
        }
      });

      worksheet.addRow({
        itemId: item?._id?.toString() || "",
        productName: item?.product_name || "",
        hsnCode: item?.hsn_code || "",
        category: item?.category?.category || "",
        subCategory : item?.sub_category?.subcategory || "",
        priceRate,
        dineIn,
        takeAway,
        roomService,
        delivery,
      });
    });

    // Header styling
    const headerRow = worksheet.getRow(1);

    headerRow.font = {
      bold: true,
    };

    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Make price columns numeric
    worksheet.getColumn("priceRate").numFmt = "0.00";
    worksheet.getColumn("dineIn").numFmt = "0.00";
    worksheet.getColumn("takeAway").numFmt = "0.00";
    worksheet.getColumn("roomService").numFmt = "0.00";
    worksheet.getColumn("delivery").numFmt = "0.00";

    const timestamp = new Date()
      .toISOString()
      .split("T")[0];

    const fileName = `Items_Price_Levels_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Export items Excel error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to export items",
      });
    }
  }
}


export const savePrinter = async (req, res) => {
  try {
    const { printer, printerType, remove } = req.body;
    const removingPrinter = remove === true;
    const { cmp_id } = req.params;

    // Validate company id
    if (!cmp_id || cmp_id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Company id not found",
      });
    }

    // Validate printer
    if (!removingPrinter && (typeof printer !== "string" || !printer.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please select printer",
      });
    }

    // Validate printer type
    if (!printerType) {
      return res.status(400).json({
        success: false,
        message: "Please select printer type",
      });
    }

    let updatedOrganization;

    if (printerType === "kot") {
      updatedOrganization = await Organization.findByIdAndUpdate(
        cmp_id,
        {
          $set: {
            "configurations.0.kotPrinter": removingPrinter ? "" : printer.trim(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid printer type",
      });
    }

    // Company not found
    if (!updatedOrganization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: removingPrinter ? "Printer removed successfully" : "Printer saved successfully",
      data: updatedOrganization,
    });
  } catch (error) {
    console.error("savePrinter error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save printer",
      error: error.message,
    });
  }
};
