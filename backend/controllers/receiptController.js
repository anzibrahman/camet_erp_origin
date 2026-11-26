import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import {
  checkForNumberExistence,
  getNewSerialNumber,
} from "../helpers/secondaryHelper.js";
import TallyData from "../models/TallyData.js";
import ReceiptModel from "../models/receiptModel.js";
import mongoose from "mongoose";
import secondaryUserModel from "../models/secondaryUserModel.js";
import {
  createOutstandingWithAdvanceAmount,
  updateReceiptNumber,
  updateTallyData,
  revertTallyUpdates,
  deleteAdvanceReceipt,
  saveSettlementData,
  updateAdvanceOnEdit,
} from "../helpers/receiptHelper.js";
import { formatToLocalDate } from "../helpers/helper.js";
import { generateVoucherNumber } from "../helpers/voucherHelper.js";
import settlementModel from "../models/settlementModel.js";

import salesModel from "../models/salesModel.js";       // adjust path
import VoucherSeriesModel from "../models/VoucherSeriesModel.js";
import { sendMail } from "../helpers/hotelHelper.js";
import primaryUserModel from "../models/primaryUserModel.js";
export const createReceipt = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const {
    date,
    receiptNumber,
    cmp_id,
    party,
    billData,
    totalBillAmount,
    enteredAmount,
    advanceAmount,
    remainingAmount,
    paymentMethod,
    paymentDetails,
    note,
    series_id,
    voucherType,
  } = req.body;
  console.log("create receipttttttttttttttttt")

  const Primary_user_id = req.owner.toString();
  const Secondary_user_id = req.sUserId;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    /// generate voucher number(sales number)
    const { voucherNumber: receiptNumber, usedSeriesNumber } =
      await generateVoucherNumber(cmp_id, voucherType, series_id, session);
    if (receiptNumber) {
      req.body.receiptNumber = receiptNumber;
    }
    if (usedSeriesNumber) {
      req.body.usedSeriesNumber = usedSeriesNumber;
    }

    const serialNumber = await getNewSerialNumber(
      ReceiptModel,
      "serialNumber",
      session
    );

    const secondaryUser = await secondaryUserModel
      .findById(Secondary_user_id)
      .session(session);

    if (!secondaryUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Secondary user not found" });
    }

    ////for updating voucher number of receipt
    const updatedReceiptNumber = await updateReceiptNumber(
      cmp_id,
      secondaryUser,
      session
    );
    console.log("line receiptcontroller")
    // Create the new receipt
    const newReceipt = new ReceiptModel({
      createdAt: new Date(),
      date: await formatToLocalDate(date, cmp_id, session),

      receiptNumber,
      series_id,
      usedSeriesNumber: usedSeriesNumber || null,
      serialNumber,
      cmp_id,
      party,
      billData,
      totalBillAmount,
      enteredAmount,
      advanceAmount,
      remainingAmount,
      paymentMethod,
      paymentDetails,
      note,
      Primary_user_id,
      Secondary_user_id,
    });

    // Save the receipt in the transaction session
    const savedReceipt = await newReceipt.save({ session });

    /// save settlement data in cash or bank collection
    await saveSettlementData(
      receiptNumber,
      savedReceipt._id.toString(),
      "Receipt",
      "receipt",
      enteredAmount || 0,
      paymentMethod,
      paymentDetails,
      party,
      cmp_id,
      Primary_user_id,
      date,
      session
    );

    // Use the helper function to update TallyData
    await updateTallyData(
      billData,
      cmp_id,
      session,
      receiptNumber,
      savedReceipt._id.toString(),
      "receipt"
    );

    if (advanceAmount > 0 && savedReceipt) {
      await createOutstandingWithAdvanceAmount(
        date,
        cmp_id,
        savedReceipt.receiptNumber,
        savedReceipt._id.toString(),
        Primary_user_id,
        party,
        secondaryUser.mobileNumber,
        advanceAmount,
        session,
        "advanceReceipt",
        "Cr"
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Receipt created successfully",
      data: savedReceipt,
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating receipt:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc  cancel receipt
 * @route PUT/api/sUsers/cancelReceipt
 * @access Public
 */

export const cancelReceipt = async (req, res) => {
  const { receiptId } = req.params; // Assuming the receipt ID is passed as a URL parameter
  const Primary_user_id = req.owner.toString();
  // const cmp_id = req.body.cmp_id; // Or from req.body if available

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the receipt to be canceled
    const receipt = await ReceiptModel.findById(receiptId).session(session);

    if (!receipt) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    if (receipt.isCancelled) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Receipt is already cancelled" });
    }

    // Revert tally updates
    await revertTallyUpdates(
      receipt.billData,
      receipt.cmp_id,
      session,
      receiptId.toString()
    );

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: receiptId }, { session });

    await updateAdvanceOnEdit(
      "receipt",
      0,
      receipt.party,
      receipt.cmp_id,
      receiptId.toString(),
      Primary_user_id,
      receipt.receiptNumber,
      receipt?._id?.toString(),
      receipt.date,
      session
    );

    // // Delete advance receipt, if any
    // if (receipt.advanceAmount > 0) {
    //   await deleteAdvanceReceipt(
    //     receipt.receiptNumber,
    //     receipt._id?.toString(),
    //     Primary_user_id,
    //     session
    //   );
    // }

    // Mark the receipt as cancelled
    receipt.isCancelled = true;
    receipt.cancelReason = req?.body?.cancelReason;
    receipt.cancelledAt = new Date();
    receipt.cancelledBy = req.sUserId;
    receipt.cancelledByName = req.suser?.name || "";

    await receipt.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    let primaryUserData = await primaryUserModel.findById(req.owner);
    
        if (!primaryUserData || !primaryUserData?.email) {
          res.status(200).json({
            success: true,
            message: "Receipt cancelled successfully but email not sent",
            data: sale,
          });
        }
    
        await sendMail({
          to: primaryUserData?.email,
          cc: [],
          subject: `Receipt Cancelled Alert - ${receipt?.receiptNumber}`,
          fromName: "Cancel Receipt",
          text: `Receipt ${receipt?.receiptNumber} has been cancelled by ${req?.secUserName || primaryUserData?.userName || "System"}. Please check the attached cancelled KOT copy.`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2 style="color:#b91c1c;">Receipt Cancelled Alert</h2>
              <p>Receipt <strong>${receipt?.receiptNumber}</strong> has been cancelled.</p>
              <p><strong>Cancelled By:</strong> ${req?.secUserName || primaryUserData?.userName || "System"}</p>
              <p><strong>Reason:</strong> ${req?.body?.cancelReason || "Reason not given"}</p>
    
              <p><strong>Total:</strong> ₹ ${receipt?.enteredAmount || 0}</p>
              
            </div>
          `,
          data: receipt,
        });

    res.status(200).json({
      success: true,
      message: "Receipt cancelled successfully",
    });
  } catch (error) {
     if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("Error cancelling receipt:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc  Edit receipt
 * @route PUT/api/sUsers/editReceipt/:receiptId
 * @access Public
 */

export const editReceipt = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const receiptId = req.params.receiptId;
  const Primary_user_id = req.owner.toString();
  const Secondary_user_id = req.sUserId;

  const {
    date,
    receiptNumber,
    cmp_id,
    party,
    billData,
    totalBillAmount,
    enteredAmount,
    advanceAmount,
    remainingAmount,
    paymentMethod,
    paymentDetails,
    note,
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const receipt = await ReceiptModel.findById(receiptId).session(session);

    if (!receipt) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    if (receipt.isCancelled) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Receipt is already cancelled" });
    }

    const secondaryUser = await secondaryUserModel
      .findById(Secondary_user_id)
      .session(session);

    if (!secondaryUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Secondary user not found" });
    }

    // Revert tally updates
    await revertTallyUpdates(
      receipt.billData,
      cmp_id,
      session,
      receiptId.toString()
    );

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: receiptId }, { session });

    // Use the helper function to update TallyData
    await updateTallyData(billData, cmp_id, session, receiptNumber, receiptId);

    // update advance receipt / advance payment on edit of receipt or payment
    await updateAdvanceOnEdit(
      "receipt",
      advanceAmount,
      receipt.party,
      cmp_id,
      receiptId.toString(),
      Primary_user_id,
      receipt.receiptNumber,
      receipt?._id?.toString(),
      date,
      session
    );

    ///update the existing receipt
    receipt.date = date;
    receipt.receiptNumber = receiptNumber;
    receipt.cmp_id = cmp_id;
    receipt.party = party;
    receipt.billData = billData;
    receipt.totalBillAmount = totalBillAmount;
    receipt.enteredAmount = enteredAmount;
    receipt.advanceAmount = advanceAmount;
    receipt.remainingAmount = remainingAmount;
    receipt.paymentMethod = paymentMethod;
    receipt.paymentDetails = paymentDetails;
    receipt.note = note;

    const savedReceipt = await receipt.save({ session, new: true });

    /// save settlement data in cash or bank collection
    await saveSettlementData(
      receiptNumber,
      savedReceipt._id.toString(),
      "Receipt",
      "receipt",
      enteredAmount || 0,
      paymentMethod,
      paymentDetails,
      party,
      cmp_id,
      Primary_user_id,
      date,
      session
    );

    // if (advanceAmount > 0 && savedReceipt) {
    //   await createOutstandingWithAdvanceAmount(
    //     date,
    //     cmp_id,
    //     savedReceipt.receiptNumber,
    //     savedReceipt._id.toString(),
    //     Primary_user_id,
    //     party,
    //     secondaryUser.mobileNumber,
    //     advanceAmount,
    //     session,
    //     "advanceReceipt",
    //     "Cr"
    //   );
    // }

    // console.log(receipt);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Receipt updated successfully",
      data: receipt,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error editing receipt:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc  get receipt details
 * @route GET/api/sUsers/getReceiptDetails
 * @access Public
 */

export const getReceiptDetails = async (req, res) => {
  const receiptId = req.params.id;

  try {
    /* -----------------------------------------------------------
       1.  Load the receipt and populate ONLY appliedReceipts
           from each referenced TallyData (outstanding) document.
       ----------------------------------------------------------- */

    /* -----------------------------------------------------------
   WHY WE POPULATE appliedReceipts FROM OUTSTANDING DOCUMENTS:
   
   When a receipt is created, it stores settlement amounts in billData.
   However, sales invoices can be edited AFTER receipt creation, which
   updates the outstanding document but NOT the original receipt.
   
   This creates a data inconsistency:
   - Receipt.billData.settledAmount = original amount when receipt was created
   - Outstanding.appliedReceipts.settledAmount = current/actual applied amount
   
   Since outstanding documents are the "source of truth" for current
   account balances and are updated when invoices are modified, we
   prioritize the appliedReceipts data over the receipt's stored amounts.
   
   This ensures users always see the accurate, up-to-date settlement
   amounts rather than stale data from the receipt creation time.
   ----------------------------------------------------------- */

    // const receiptDoc = await ReceiptModel.findById(receiptId);
    // const receiptDoc = await ReceiptModel.aggregate([
    //   {
    //     $match: { _id: new mongoose.Types.ObjectId(receiptId) }
    //   },

    //   // Unwind billData array
    //   { $unwind: "$billData" },

    //   // Lookup in BOOKING collection
    //   {
    //     $lookup: {
    //       from: "bookings",
    //       localField: "billData.billId",
    //       foreignField: "_id",
    //       as: "bookingDoc"
    //     }
    //   },

    //   // Lookup in CHECKIN collection
    //   {
    //     $lookup: {
    //       from: "checkins",
    //       localField: "billData.billId",
    //       foreignField: "_id",
    //       as: "checkinDoc"
    //     }
    //   },

    //   // Pick whichever exists
    //   {
    //     $addFields: {
    //       billSource: {
    //         $cond: [
    //           { $gt: [{ $size: "$bookingDoc" }, 0] },
    //           { $arrayElemAt: ["$bookingDoc", 0] },
    //           { $arrayElemAt: ["$checkinDoc", 0] }
    //         ]
    //       }
    //     }
    //   },

    //   // Extract ONLY room names
    //   {
    //     $addFields: {
    //       roomNames: {
    //         $map: {
    //           input: "$billSource.selectedRooms",
    //           as: "room",
    //           in: "$$room.roomName"
    //         }
    //       }
    //     }
    //   },

    //   // Attach roomNames back into billData
    //   {
    //     $addFields: {
    //       "billData.roomNames": "$roomNames"
    //     }
    //   },

    //   // Cleanup
    //   {
    //     $project: {
    //       bookingDoc: 0,
    //       checkinDoc: 0,
    //       billSource: 0,
    //       roomNames: 0
    //     }
    //   },

    //   // Re-group billData array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       doc: { $first: "$$ROOT" },
    //       billData: { $push: "$billData" }
    //     }
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$doc", { billData: "$billData" }]
    //       }
    //     }
    //   }
    // ])
    console.log("reciptid", receiptId)
    // const receiptDocs = await ReceiptModel.aggregate([
    //   {
    //     $match: { _id: new mongoose.Types.ObjectId(receiptId) }
    //   },

    //   { $unwind: "$billData" },

    //   // ✅ convert billId string → ObjectId
    //   {
    //     $addFields: {
    //       billObjectId: { $toObjectId: "$billData.billId" }
    //     }
    //   },

    //   // Lookup BOOKING
    //   {
    //     $lookup: {
    //       from: "bookings",
    //       localField: "billObjectId",
    //       foreignField: "_id",
    //       as: "bookingDoc"
    //     }
    //   },

    //   // Lookup CHECKIN
    //   {
    //     $lookup: {
    //       from: "checkins",
    //       localField: "billObjectId",
    //       foreignField: "_id",
    //       as: "checkinDoc"
    //     }
    //   },

    //   // Pick whichever exists
    //   {
    //     $addFields: {
    //       billSource: {
    //         $cond: [
    //           { $gt: [{ $size: "$bookingDoc" }, 0] },
    //           { $arrayElemAt: ["$bookingDoc", 0] },
    //           { $arrayElemAt: ["$checkinDoc", 0] }
    //         ]
    //       }
    //     }
    //   },

    //   // Extract room names
    //   {
    //     $addFields: {
    //       "billData.roomNames": {
    //         $map: {
    //           input: "$billSource.selectedRooms",
    //           as: "room",
    //           in: "$$room.roomName"
    //         }
    //       }
    //     }
    //   },

    //   // Cleanup
    //   {
    //     $project: {
    //       bookingDoc: 0,
    //       checkinDoc: 0,
    //       billSource: 0,
    //       billObjectId: 0
    //     }
    //   },

    //   // Rebuild billData array
    //   {
    //     $group: {
    //       _id: "$_id",
    //       doc: { $first: "$$ROOT" },
    //       billData: { $push: "$billData" }
    //     }
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: ["$doc", { billData: "$billData" }]
    //       }
    //     }
    //   }
    // ])

    // ✅ Convert array → single object
    const receiptDocs = await ReceiptModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(receiptId) }
      },

      { $unwind: "$billData" },

      // convert billId → ObjectId
      {
        $addFields: {
          billObjectId: { $toObjectId: "$billData.billId" }
        }
      },

      // BOOKING
      {
        $lookup: {
          from: "bookings",
          localField: "billObjectId",
          foreignField: "_id",
          as: "bookingDoc"
        }
      },

      // CHECKIN
      {
        $lookup: {
          from: "checkins",
          localField: "billObjectId",
          foreignField: "_id",
          as: "checkinDoc"
        }
      },

      // SALES
      {
        $lookup: {
          from: "sales",
          localField: "billObjectId",
          foreignField: "_id",
          as: "saleDoc"
        }
      },

      // Decide bill source type
      {
        $addFields: {
          billType: {
            $cond: [
              { $gt: [{ $size: "$bookingDoc" }, 0] },
              "booking",
              {
                $cond: [
                  { $gt: [{ $size: "$checkinDoc" }, 0] },
                  "checkin",
                  {
                    $cond: [
                      { $gt: [{ $size: "$saleDoc" }, 0] },
                      "sale",
                      null
                    ]
                  }
                ]
              }
            ]
          },
          billSource: {
            $cond: [
              { $gt: [{ $size: "$bookingDoc" }, 0] },
              { $arrayElemAt: ["$bookingDoc", 0] },
              {
                $cond: [
                  { $gt: [{ $size: "$checkinDoc" }, 0] },
                  { $arrayElemAt: ["$checkinDoc", 0] },
                  { $arrayElemAt: ["$saleDoc", 0] }
                ]
              }
            ]
          }
        }
      },

      // Extract roomNames / productNames
      {
        $addFields: {
          "billData.roomNames": {
            $cond: [
              { $in: ["$billType", ["booking", "checkin"]] },
              {
                $map: {
                  input: "$billSource.selectedRooms",
                  as: "room",
                  in: "$$room.roomName"
                }
              },
              []
            ]
          },

          "billData.productNames": {
            $cond: [
              { $eq: ["$billType", "sale"] },
              {
                $map: {
                  input: "$billSource.items",
                  as: "item",
                  in: "$$item.product_name"
                }
              },
              []
            ]
          }
        }
      },

      // cleanup
      {
        $project: {
          bookingDoc: 0,
          checkinDoc: 0,
          saleDoc: 0,
          billSource: 0,
          billObjectId: 0,
          billType: 0
        }
      },

      // rebuild billData array
      {
        $group: {
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          billData: { $push: "$billData" }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { billData: "$billData" }]
          }
        }
      }
    ])




    const receiptDoc = receiptDocs[0] || null


    // .populate({
    //   path: "billData._id", // ↳ nested reference
    //   select: "appliedReceipts bill_pending_amt", // ↳ pull only what we actually need
    // })
    // .lean(); // ↳ returns plain JS objects, no Mongoose overhead

    if (!receiptDoc)
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });

    /* -----------------------------------------------------------
       2.  Flatten billData so that `_id` is the original ObjectId
           and add appliedReceiptAmount (number) for each bill.
       ----------------------------------------------------------- */
    // receiptDoc.billData = receiptDoc.billData.map((bill) => {
    //   // `populated` holds the TallyData stub; original bill props are at top level.
    //   const { _id: populated, ...billFields } = bill;

    //   // Find the matching appliedReceipts entry for THIS receipt.
    //   const receiptMatch = populated?.appliedReceipts?.find(
    //     (entry) => entry._id.toString() === receiptDoc._id.toString()
    //   );

    //   return {
    //     _id: populated?._id ?? billFields._id, // original ObjectId (not the whole object)
    //     ...billFields, // bill_no, bill_date, etc.
    //     appliedReceiptAmount: receiptMatch ? receiptMatch?.settledAmount : 0,
    //     currentOutstandingAmount:
    //       populated?.bill_pending_amt ?? billFields.bill_pending_amt, // latest outstanding balance
    //     bill_pending_amt:
    //       (receiptMatch?.settledAmount || 0) +
    //       (Math.max(populated?.bill_pending_amt, 0) || 0),
    //   };
    // });

    return res.status(200).json({
      success: true,
      message: "Receipt details fetched",
      receipt: receiptDoc,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};




/**
 * GET /api/receipts/:cmp_id
 * Query params:
 *   - under       : "restaurant" | "hotel" | "all"  (default: "all")
 *   - startDate   : YYYY-MM-DD  (default: today)
 *   - endDate     : YYYY-MM-DD  (default: today)
 *   - owner       : ObjectId (required)
 *   - billNo      : optional – fetch single receipt by salesNumber
 */
export const getReceiptsByVoucherSeries = async (req, res) => {
  try {
    const { cmp_id } = req.params;
    const { under = "all", startDate, endDate } = req.query;

    // ── Validation ────────────────────────────────────────────────
    if (!cmp_id) {
      return res.status(400).json({ success: false, message: "Company ID (cmp_id) is required" });
    }
    if (!["hotel", "restaurant", "all"].includes(under)) {
      return res.status(400).json({
        success: false,
        message: "under must be 'hotel', 'restaurant', or 'all'",
      });
    }

    // ── Date range (default today) ────────────────────────────────
    const today       = new Date();
    const parsedStart = startDate ? new Date(startDate) : new Date(today);
    const parsedEnd   = endDate   ? new Date(endDate)   : new Date(today);
    parsedStart.setHours(0, 0, 0, 0);
    parsedEnd.setHours(23, 59, 59, 999);

    // ── Step 1: Resolve series_ids by under ───────────────────────
    // Voucher series has: prefix "RH/" under:"hotel"  |  prefix "RR/" under:"restaurant"
    // Receipt has series_id pointing to that series doc
    let seriesIdFilter = null;
    if (under !== "all") {
      const matchingSeries = await voucherSeriesModel
        .find(
          { cmp_id: new mongoose.Types.ObjectId(cmp_id), under },
          { _id: 1 }
        )
        .lean();

      if (!matchingSeries.length) {
        return res.json({
          success: true,
          data: {
            receipts: [],
            summary: buildEmptySummary(),
            under,
            dateRange: {
              startDate: parsedStart.toISOString().split("T")[0],
              endDate:   parsedEnd.toISOString().split("T")[0],
            },
            totalRecords: 0,
            message: `No voucher series found for '${under}'`,
          },
        });
      }
      seriesIdFilter = matchingSeries.map((s) => s._id);
    }

    // ── Step 2: Build match query on Receipt collection ───────────
// ✅ REPLACE WITH THIS — filter directly on billData[0].source
const matchQuery = {
  cmp_id:      new mongoose.Types.ObjectId(cmp_id),
  voucherType: "receipt",
  date:        { $gte: parsedStart, $lte: parsedEnd },
  $or: [
    { isCancelled: { $exists: false } },
    { isCancelled: false },
    { isCancelled: null },
  ],
};

// ✅ Filter by billData source directly — no series lookup needed
if (under !== "all") {
  matchQuery["billData.0.source"] = new RegExp(`^${under}$`, "i"); // case-insensitive
}

    // ── Step 3: Aggregation ───────────────────────────────────────
    const rawReceipts = await ReceiptModel.aggregate([
      { $match: matchQuery },

      // Join voucherseries to get prefix, seriesName, under
      {
        $lookup: {
          from: "voucherseries",
          let: { sid: "$series_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$sid"] } } },
            { $project: { _id: 1, seriesName: 1, prefix: 1, suffix: 1, under: 1 } },
          ],
          as: "voucherSeries",
        },
      },
      { $unwind: { path: "$voucherSeries", preserveNullAndEmptyArrays: true } },

      { $sort: { createdAt: -1 } },
    ]);

    // ── Step 4: Transform ─────────────────────────────────────────
    const receipts = rawReceipts.map((r) => {
 const billDataRaw = Array.isArray(r.billData) ? r.billData : [];
      // billType comes from the joined voucherSeries.under ("hotel" | "restaurant")
    // ✅ CHANGE THIS LINE in your .map() transform
const billType = (r.voucherSeries?.under || billDataRaw[0]?.source || "").toLowerCase().trim();
const seriesPrefix = r.voucherSeries?.prefix     || "";
const seriesName   = r.voucherSeries?.seriesName || "";

      // ── billData: deduplicate by bill_no ──────────────────────
      // billData is array of: { bill_no, bill_date, source, settledAmount, remainingAmount, bill_pending_amt }
     
      const seenBillNos = new Set();
      const uniqueBillData = billDataRaw.filter((b) => {
        if (!b.bill_no || seenBillNos.has(b.bill_no)) return false;
        seenBillNos.add(b.bill_no);
        return true;
      });


// Detect receipt source from billData[0]
const firstBill = uniqueBillData[0] || {};
const receiptSource = (() => {
  const billNo = (firstBill.billNo || "").toLowerCase();
  const src    = (firstBill.source || "").toLowerCase();
  if (billNo.includes("chk") || billNo.includes("checkout"))  return "checkout";
  if (billNo.includes("bkg") || billNo.includes("booking"))   return "booking";
  if (billNo.includes("adv") || billNo.includes("advance"))   return "advance";
  if (billNo.includes("kot"))                                  return "restaurant";
  if (src === "hotel")                                         return "checkout";
  if (src === "restaurant")                                    return "restaurant";
  return "direct";
})();
      // ── Payment ───────────────────────────────────────────────
      const enteredAmount  = Number(r.enteredAmount  || 0);
      const paymentMethod  = (r.paymentMethod || "").toLowerCase().trim();
      const paymentDetails = r.paymentDetails || {};

      let cash = 0, upi = 0, card = 0, credit = 0, bank = 0;
      const paymentModes = [];

      if (["cash"].includes(paymentMethod)) {
        cash = enteredAmount; paymentModes.push("CASH");
      } else if (["online", "upi", "gpay", "phonepe", "paytm"].includes(paymentMethod)) {
        upi = enteredAmount; paymentModes.push("UPI");
      } else if (["card", "debit card", "credit card"].includes(paymentMethod)) {
        card = enteredAmount; paymentModes.push("CARD");
      } else if (["bank", "bank transfer", "neft", "rtgs"].includes(paymentMethod)) {
        bank = enteredAmount; paymentModes.push("BANK");
      } else if (["credit", "credit note"].includes(paymentMethod)) {
        credit = enteredAmount; paymentModes.push("CREDIT");
      } else {
        // Fallback: if bank ledger name looks non-cash → UPI, else Cash
        const ledger = (paymentDetails.bank_ledname || paymentDetails.bank_name || "").toLowerCase();
        if (ledger && !["cash", "cash-in-hand"].includes(ledger)) {
          upi = enteredAmount; paymentModes.push("UPI");
        } else {
          cash = enteredAmount; paymentModes.push("CASH");
        }
      }

      const partyName = r.party?.partyName || r.partyName || "—";

      return {
        // Identity
        billNo:       r.receiptNumber || r.serialNumber?.toString() || "",
        billType, 
        receiptSource,         // "hotel" | "restaurant"  ← from voucherSeries.under
        seriesPrefix,      // "RH/" | "RR/"
        seriesName,        // "Receipt under hotel" | "Receipt under restaurant"
        date:         r.date,
        createdAt:    r.createdAt,

        // Party
        partyName,
        bankLedger: paymentDetails.bank_ledname || paymentDetails.bank_name || "",

        // billData — linked bills this receipt settles
        billDataList: uniqueBillData.map((b) => ({
          billNo:          b.bill_no              || "",
          billDate:        b.bill_date            || null,
        source: (b.source || "").toLowerCase().trim(),
          settledAmount:   Number(b.settledAmount   || 0),
          remainingAmount: Number(b.remainingAmount || 0),
          pendingAmount:   Number(b.bill_pending_amt || 0),
        })),

        // First linked bill — quick table display
        checkOutBillNo:   uniqueBillData[0]?.bill_no   || "",
        checkOutBillDate: uniqueBillData[0]?.bill_date || null,

        // Amounts
        totalBillAmount: Number(r.totalBillAmount || 0),
        finalAmount:     enteredAmount,
        advanceAmount:   Number(r.advanceAmount   || 0),
        remainingAmount: Number(r.remainingAmount || 0),

        // Payments
        cash, upi, card, credit, bank,
        paymentModes,
        paymentMethod: r.paymentMethod || "",

        // Receipts don't carry tax
        cgst: 0, sgst: 0, igst: 0, discount: 0, roundOff: 0,
        items: [], itemCount: 0,
      };
    });

    // ── Summary ───────────────────────────────────────────────────
    const summary = receipts.reduce((acc, r) => {
      acc.totalCount++;
      acc.totalFinalAmount += r.finalAmount;
      acc.totalCash        += r.cash;
      acc.totalBank        += r.bank;
      acc.totalCredit      += r.credit;
      acc.totalUpi         += r.upi;
      acc.totalCard        += r.card;
      if (r.billType === "hotel")      { acc.hotelCount++;      acc.hotelTotal      += r.finalAmount; }
      if (r.billType === "restaurant") { acc.restaurantCount++; acc.restaurantTotal += r.finalAmount; }
      return acc;
    }, buildEmptySummary());

    return res.json({
      success: true,
      data: {
        receipts,
        summary,
        under,
        dateRange: {
          startDate: parsedStart.toISOString().split("T")[0],
          endDate:   parsedEnd.toISOString().split("T")[0],
        },
        totalRecords: receipts.length,
        message: `Found ${receipts.length} receipt(s)`,
      },
    });

  } catch (error) {
    console.error("Error fetching receipts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
};

function buildEmptySummary() {
  return {
    totalCount: 0, totalFinalAmount: 0,
    totalCash: 0, totalBank: 0, totalCredit: 0, totalUpi: 0, totalCard: 0,
    hotelCount: 0, hotelTotal: 0,
    restaurantCount: 0, restaurantTotal: 0,
  };
}

// Backend: Find hotel sales that have NO receipt linked
// export const getUnreconciledSales = async (req, res) => {
//   const {  startDate, endDate } = req.query;
//     const { cmp_id } = req.params;
//   const parsedStart = new Date(startDate); parsedStart.setHours(0,0,0,0);
//   const parsedEnd   = new Date(endDate);   parsedEnd.setHours(23,59,59,999);
//   console.log("cmp_id =>", cmp_id);
//   console.log("date range =>", parsedStart, "to", parsedEnd);
//   // Get all sales bill numbers


//    const totalDocsInCollection = await salesModel.countDocuments({});
//   console.log("Total docs in salesModel collection:", totalDocsInCollection);

//   // ── DEBUG LOG 3: Count only by cmp_id ─────────────────────────────
//   const byCmpId = await salesModel.countDocuments({
//     cmp_id: new mongoose.Types.ObjectId(cmp_id)
//   });
//   console.log("Docs matching cmp_id:", byCmpId);

//   // ── DEBUG LOG 4: See one sample document ──────────────────────────
//   const sample = await salesModel.findOne({
//     cmp_id: new mongoose.Types.ObjectId(cmp_id)
//   }).lean();
//   console.log("Sample doc keys:", sample ? Object.keys(sample) : "NO DOC FOUND");
//   console.log("Sample voucherType:", sample?.voucherType);
//   console.log("Sample date field:", sample?.date, "| createdAt:", sample?.createdAt);
//   console.log("Sample salesNumber:", sample?.salesNumber);

//   const sales = await salesModel.find({
//     cmp_id: new mongoose.Types.ObjectId(cmp_id),
//     voucherType: "sales",
//     date: { $gte: parsedStart, $lte: parsedEnd },
//     $or: [{ isCancelled: { $exists: false } }, { isCancelled: false }],
//   }, { salesNumber: 1, finalAmount: 1, partyAccount: 1 }).lean();

//   // Get all bill numbers that appear in any receipt's billData
//   const receipts = await ReceiptModel.find({
//     cmp_id: new mongoose.Types.ObjectId(cmp_id),
//     date: { $gte: parsedStart, $lte: parsedEnd },
//   }, { billData: 1 }).lean();

//   const settledBillNos = new Set(
//     receipts.flatMap(r => (r.billData || []).map(b => b.bill_no))
//   );

//   // Sales with NO receipt
//   const unreconciled = sales.filter(s => !settledBillNos.has(s.salesNumber));
//   const creditSales  = unreconciled.filter(s => s.partyAccount === "Sundry Debtors");
//   const cashPending  = unreconciled.filter(s => s.partyAccount !== "Sundry Debtors");

//   return res.json({
//     success: true,
//     data: {
//       totalSales:        sales.length,
//       totalWithReceipt:  sales.length - unreconciled.length,
//       totalUnreconciled: unreconciled.length,
//       creditSalesCount:  creditSales.length,
//       creditSalesTotal:  creditSales.reduce((s, r) => s + (r.finalAmount || 0), 0),
//       cashPendingCount:  cashPending.length,
//       cashPendingTotal:  cashPending.reduce((s, r) => s + (r.finalAmount || 0), 0),
//       unreconciledList:  unreconciled,
//     }
//   });
// };


/* ─────────────────────────────────────────────────────────────────────────────
   HOW hotelSource IS DETERMINED IN THE TRANSFORM:

   In the return object inside salesData.map(), add this field:

   hotelSource: (() => {
     // If this bill came from a booking (has a booking voucherNumber like BKG/xxx)
     if (sale.checkOut?.voucherNumber?.startsWith("BKG")) return "booking";
     // If it came from a checkin (CHK/xxx)
     if (sale.checkOut?.voucherNumber?.startsWith("CHK")) return "checkin";
     // OR use a dedicated field if your checkout/sale doc has one:
     // if (sale.bookingId)  return "booking";
     // if (sale.checkInId)  return "checkin";
     return "";
   })(),

   Adjust the prefix check ("BKG", "CHK") to match your actual
   voucherNumber format in the checkouts collection.
──────────────────────────────────────────────────────────────────────────── */