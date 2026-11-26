import { voucherEditError } from "../helpers/voucherLifecycleHelper.js";
import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import { formatToLocalDate, truncateToNDecimals } from "../helpers/helper.js";
import {
  createDebitNoteRecord,
  handleDebitNoteStockUpdates,
  revertDebitNoteStockUpdates,
  updateDebitNoteNumber,
  // updateTallyData,
} from "../helpers/debitNoteHelper.js";
import {
  processSaleItems as processDebitNoteItems,
  revertSettlementData,
  saveSettlementData,
  updateOutstandingBalance,
  updateTallyData,
} from "../helpers/salesHelper.js";

import { checkForNumberExistence } from "../helpers/secondaryHelper.js";
import debitNoteModel from "../models/debitNoteModel.js";
import secondaryUserModel from "../models/secondaryUserModel.js";
import mongoose from "mongoose";
import TallyData from "../models/TallyData.js";
import {
  attachLatestSeriesDetails,
  generateVoucherNumber,
} from "../helpers/voucherHelper.js";
import settlementModel from "../models/settlementModel.js";
import { createAdvanceReceiptsFromAppliedReceipts } from "../helpers/receiptHelper.js";

// @desc create credit note
// route GET/api/sUsers/createDebitNote
export const createDebitNote = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      party,
      orgId,
      items,
      additionalChargesFromRedux,
      note,
      finalAmount: lastAmount,

      selectedDate,
      voucherType,
      series_id,
    } = req.body;
    // debitNoteNumber,

    const Secondary_user_id = req.sUserId;

    /// generate voucher number(debitNote number)
    const { voucherNumber: debitNoteNumber, usedSeriesNumber } =
      await generateVoucherNumber(orgId, voucherType, series_id, session);
    if (debitNoteNumber) {
      req.body.debitNoteNumber = debitNoteNumber;
    }
    if (usedSeriesNumber) {
      req.body.usedSeriesNumber = usedSeriesNumber;
    }

    const secondaryUser = await secondaryUserModel
      .findById(Secondary_user_id)
      .session(session);
    const secondaryMobile = secondaryUser?.mobile;

    if (!secondaryUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Secondary user not found" });
    }

    await handleDebitNoteStockUpdates(items, session);
    // const updatedItems = await processDebitNoteItems(items);
    const updateDebitNoteVoucherNumber = await updateDebitNoteNumber(
      orgId,
      secondaryUser,
      session
    );

    // const updateAdditionalCharge = additionalChargesFromRedux.map((charge) => {
    //   const { value, taxPercentage } = charge;
    //   const taxAmt = parseFloat(
    //     ((parseFloat(value) * parseFloat(taxPercentage || 0)) / 100).toFixed(2)
    //   );
    //   return { ...charge, taxAmt };
    // });

    const result = await createDebitNoteRecord(
      req,
      debitNoteNumber,
      items,
      additionalChargesFromRedux,
      session // Pass session
    );

    await updateTallyData(
      orgId,
      debitNoteNumber,
      result._id,
      req.owner,
      party,
      lastAmount,
      secondaryMobile,
      session,
      lastAmount, ///valueToUpdateInTally is also last amount
      selectedDate,
      voucherType,
      "Dr",
      "DebitNote"
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: result,
      message: "Debit Note created successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the Debit",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// @desc cancel credit note
// route GET/api/sUsers/cancelDebitNote

export const cancelDebitNote = async (req, res) => {
  console.log("Cancel debit note request received");

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const debitNoteId = req.params.id; // Assuming saleId is passed in the URL parameters
    const existingDebitNote = await debitNoteModel
      .findById(debitNoteId)
      .session(session);
    if (!existingDebitNote) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });
    }

    if (existingDebitNote.isCancelled) {
      await session.abortTransaction();
      return res.status(200).json({ success: true, message: "Voucher is already cancelled", data: existingDebitNote });
    }

    // Revert existing stock updates
    await revertDebitNoteStockUpdates(existingDebitNote.items, session);

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: debitNoteId }, { session });

    ////// update the outstanding as isCancelled as true and make advance receipts form applied Receipts
    const outstandingRecord = await TallyData.findOne({
      billId: existingDebitNote._id.toString(),
      bill_no: existingDebitNote.debitNoteNumber,
      cmp_id: existingDebitNote.cmp_id,
      Primary_user_id: existingDebitNote.Primary_user_id,
    }).session(session);

    console.log("outstandingRecord", outstandingRecord);

    if (outstandingRecord) {
      const outstandingResult = await updateOutstandingBalance({
        existingVoucher: existingDebitNote,
        valueToUpdateInOutstanding: 0,
        orgId: existingDebitNote.cmp_id,
        voucherNumber: existingDebitNote?.debitNoteNumber,
        party: existingDebitNote?.party,
        session,
        createdBy: req.owner,
        transactionType: "debitNote",
        secondaryMobile: null,
        selectedDate: existingDebitNote?.date,
        classification: "Dr",
      });
      outstandingRecord.isCancelled = true;
      await outstandingRecord.save({ session });
    }

    // flagging is cancelled true
    existingDebitNote.isCancelled = true;
    const cancelledDebitNote = await existingDebitNote.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "purchase canceled successfully",
      data: cancelledDebitNote,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while editing the sale.",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// @desc edit debit note
// route GET/api/sUsers/editDebitNote

export const editDebitNote = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const debitNoteId = req.params.id;
    const {
      selectedGodownId,
      selectedGodownName,
      orgId,
      party,
      items,
      despatchDetails,
      additionalChargesFromRedux,
      finalAmount: lastAmount,
      finalOutstandingAmount,
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      selectedDate,
      subTotal,
      note,
    } = req.body;

    let { debitNoteNumber, series_id, usedSeriesNumber } = req.body;

    const existingDebitNote = await debitNoteModel
      .findById(debitNoteId)
      .session(session);
    if (!existingDebitNote) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Debit Note not found" });
    }

    const editError = await voucherEditError(existingDebitNote, session);
    if (editError) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ success: false, message: editError });
    }

    if (existingDebitNote?.series_id?.toString() !== series_id?.toString()) {
      const { voucherNumber, usedSeriesNumber: newUsedSeriesNumber } =
        await generateVoucherNumber(
          orgId,
          existingDebitNote.voucherType,
          series_id,
          session
        );

      debitNoteNumber = voucherNumber; // Always update when series changes
      usedSeriesNumber = newUsedSeriesNumber; // Always update when series changes
    } else {
      debitNoteNumber = existingDebitNote.debitNoteNumber;
      usedSeriesNumber = existingDebitNote.usedSeriesNumber;
    }

    await revertDebitNoteStockUpdates(existingDebitNote.items, session);

    await handleDebitNoteStockUpdates(items, session);
console.log("line 273 debitnote")
    const updateData = {
      selectedGodownId: selectedGodownId ?? "",
      selectedGodownName: selectedGodownName ? selectedGodownName[0] : "",
      serialNumber: existingDebitNote.serialNumber,
      cmp_id: orgId,
      partyAccount: party?.partyName,
      party,
      despatchDetails,
      items,
      additionalCharges: additionalChargesFromRedux,
      note,
      finalAmount: lastAmount,
      Primary_user_id: req.owner,
      Secondary_user_id: req.secondaryUserId,
      debitNoteNumber: debitNoteNumber,
      series_id,
      usedSeriesNumber,
      date: await formatToLocalDate(selectedDate, orgId, session),
      createdAt: existingDebitNote.createdAt,
      finalOutstandingAmount,
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      subTotal,
    };

    await debitNoteModel.findByIdAndUpdate(debitNoteId, updateData, {
      new: true,
      session,
    });

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: debitNoteId }, { session });
    /// recreate the settlement data

    const secondaryUser = await secondaryUserModel
      .findById(req.sUserId)
      .session(session);
    const secondaryMobile = secondaryUser?.mobile;

    console.log("lastAmount", lastAmount);

    if (party?.partyType === "party") {
      const outstandingResult = await updateOutstandingBalance({
        existingVoucher: existingDebitNote,
        valueToUpdateInOutstanding: lastAmount,
        orgId,
        voucherNumber: debitNoteNumber,
        party,
        session,
        createdBy: req.owner,
        transactionType: "debitNote",
        secondaryMobile,
        selectedDate,
        classification: "Dr",
      });
    } else {


      await saveSettlementData(
        party,
        orgId,
        null,/// payment mode,
        "debitNote", /// voucher type
        "DebitNote", /// voucher Model
        debitNoteNumber,
        series_id,
        lastAmount,
        existingDebitNote.createdAt,
        req,
        session
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Debit Note edited successfully",
      data: existingDebitNote,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while editing the Debit Note.",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// @desc to  get details of debit note
// route get/api/sUsers/getCreditNoteDetails
export const getDebitNoteDetails = async (req, res) => {
  try {
    const id = req.params.id;

    const details = await debitNoteModel
      .findById(id)
      .populate({
        path: "party._id",
        select: "partyName",
      })
      .populate({
        path: "items._id",
        select: "product_name balance_stock",
      })
      .populate({
        path: "items.GodownList.godownMongoDbId",
        select: "godown",
      })
      .lean();

    if (!details) {
      return res.status(404).json({ error: "Debit Note Details not found" });
    }

    await attachLatestSeriesDetails(details, "debitNoteNumber");

    // Update party name and restore _id
    if (details.party?._id?.partyName) {
      details.partyAccount = details.party._id.partyName;
      details.party.partyName = details.party._id.partyName;
      const partyId = details.party._id._id;
      details.party._id = partyId;
    }

    // Update item and godown details
    if (details.items && details.items.length > 0) {
      details.items.forEach((item) => {
        if (item._id?.product_name) {
          item.product_name = item._id.product_name;
          item.balance_stock = item._id.balance_stock;
          item._id = item._id._id;
        }

        if (item.GodownList && item.GodownList.length > 0) {
          item.GodownList.forEach((godown) => {
            if (godown.godownMongoDbId?.godown) {
              godown.godown = godown.godownMongoDbId.godown;
              godown.godownMongoDbId = godown.godownMongoDbId._id;
            }
          });
        }
      });
    }

    // Check if the debit note is editable
    const outstandingOfDebitNote = await TallyData.findOne({
      billId: details._id.toString(),
      bill_no: details.debitNoteNumber,
      cmp_id: details.cmp_id,
      Primary_user_id: details.Primary_user_id,
    });

    const isEditable =
      !outstandingOfDebitNote ||
      outstandingOfDebitNote?.appliedReceipts?.length === 0;

    details.isEditable = isEditable;

    res
      .status(200)
      .json({ message: "Debit Note Details fetched", data: details });
  } catch (error) {
    console.error("Error in getting Debit Note:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
``;
