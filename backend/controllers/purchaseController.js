import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import mongoose from "mongoose";
import { formatToLocalDate } from "../helpers/helper.js";
import {
  createPurchaseRecord,
  handlePurchaseStockUpdates,
  updatePurchaseNumber,
  revertPurchaseStockUpdates,
  removeNewBatchCreatedByThisPurchase,
} from "../helpers/purchaseHelper.js";
import {
  processSaleItems as processPurchaseItems,
  revertSettlementData,
  saveSettlementData,
  updateOutstandingBalance,
  updateTallyData,
} from "../helpers/salesHelper.js";
import { checkForNumberExistence } from "../helpers/secondaryHelper.js";
import purchaseModel from "../models/purchaseModel.js";
import secondaryUserModel from "../models/secondaryUserModel.js";
import TallyData from "../models/TallyData.js";
import {
  attachLatestSeriesDetails,
  generateVoucherNumber,
} from "../helpers/voucherHelper.js";
import settlementModel from "../models/settlementModel.js";
import { createAdvancePaymentsFromAppliedPayments } from "../helpers/receiptHelper.js";

// @desc create purchase
// route GET/api/sUsers/createPurchase
export const createPurchase = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  session.startTransaction();
  const purchase_id = new mongoose.Types.ObjectId();

  try {
    const {
      orgId,
      party,
      items,
      additionalChargesFromRedux,
      finalAmount: lastAmount,
      selectedDate,
      voucherType,
      series_id,
    } = req.body;

    const Secondary_user_id = req.sUserId;

    /// generate voucher number(purchase number)
    const { voucherNumber: purchaseNumber, usedSeriesNumber } =
      await generateVoucherNumber(orgId, voucherType, series_id, session);
    if (purchaseNumber) {
      req.body.purchaseNumber = purchaseNumber;
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

    await handlePurchaseStockUpdates(
      items,
      session,
      purchaseNumber,
      purchase_id
    );
    // const updatedItems = await processPurchaseItems(items);
    const updatedPurchaseNumber = await updatePurchaseNumber(
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

    const result = await createPurchaseRecord(
      req,
      purchaseNumber,
      items,
      additionalChargesFromRedux,
      session,
      purchase_id
    );

    await updateTallyData(
      orgId,
      purchaseNumber,
      result._id,
      req.owner,
      party,
      lastAmount,
      secondaryMobile,
      session, // Pass session if needed
      lastAmount,
      selectedDate,
      "purchase",
      "Cr",
      "Purchase",
      true /// negative value for tally (purchase is credit entry)
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: result,
      message: "Purchase created successfully",
    });
  } catch (error) {
    console.error(error);
    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: "An error occurred while creating the purchase.",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

// @desc edit purchase
// route GET/api/sUsers/editPurchase

export const editPurchase = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const purchaseId = req.params.id; // Assuming saleId is passed in the URL parameters
    const {
      orgId,
      party,
      items,
      despatchDetails,
      additionalChargesFromRedux,
      finalAmount: lastAmount,
      selectedDate,
      note,
    } = req.body;

    let { purchaseNumber, series_id, usedSeriesNumber } = req.body;

    // Fetch existing Purchase
    const existingPurchase = await purchaseModel
      .findById(purchaseId)
      .session(session);
    if (!existingPurchase) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });
    }

    if (existingPurchase?.series_id?.toString() !== series_id?.toString()) {
      const { voucherNumber, usedSeriesNumber: newUsedSeriesNumber } =
        await generateVoucherNumber(
          orgId,
          existingPurchase.voucherType,
          series_id,
          session
        );

      purchaseNumber = voucherNumber; // Always update when series changes
      usedSeriesNumber = newUsedSeriesNumber; // Always update when series changes
    } else {
      purchaseNumber = existingPurchase?.purchaseNumber;
      usedSeriesNumber = existingPurchase?.usedSeriesNumber;
    }

    // Revert existing stock updates
    await removeNewBatchCreatedByThisPurchase(existingPurchase, session);
    await revertPurchaseStockUpdates(existingPurchase.items, session);

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: purchaseId }, { session });

    await handlePurchaseStockUpdates(
      items,
      session,
      existingPurchase?.purchaseNumber,
      existingPurchase?._id
    );
console.log("line 203 purchasecontroler")
    // Update existing sale record
    const updateData = {
      selectedGodownId: "",
      selectedGodownName: "",
      serialNumber: existingPurchase.serialNumber, // Keep existing serial number
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
      purchaseNumber: purchaseNumber,
      series_id,
      usedSeriesNumber,
      date: await formatToLocalDate(selectedDate, orgId, session),
      createdAt: existingPurchase.createdAt,
    };

    await purchaseModel.findByIdAndUpdate(purchaseId, updateData, {
      new: true,
      session,
    });

    //// edit outstanding
    const secondaryUser = await secondaryUserModel
      .findById(req.sUserId)
      .session(session);
    const secondaryMobile = secondaryUser?.mobile;

    if (party?.partyType === "party") {
      const outstandingResult = await updateOutstandingBalance({
        existingVoucher: existingPurchase,
        valueToUpdateInOutstanding: lastAmount,
        orgId,
        voucherNumber: purchaseNumber,
        party,
        session,
        createdBy: req.owner,
        transactionType: "purchase",
        secondaryMobile,
        selectedDate,
        classification: "Cr",
      });
    } else {

      await saveSettlementData(
        party,
        orgId,
        null,/// payment mode,
        "purchase", /// voucher type
        "Purchase", /// voucher Model
        purchaseNumber,
        series_id,
        lastAmount,
        existingPurchase.createdAt,
        req,
        session
      );
    }

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      success: true,
      message: "purchase edited successfully",
      data: existingPurchase,
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

// @desc cancel purchase
// route GET/api/sUsers/cancelpurchase

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const cancelPurchase = async (req, res) => {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const purchaseId = req.params.id;
      const existingPurchase = await purchaseModel
        .findById(purchaseId)
        .session(session);

      if (!existingPurchase) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Purchase not found" });
      }

      // Revert existing stock updates
      await removeNewBatchCreatedByThisPurchase(existingPurchase, session);
      await revertPurchaseStockUpdates(existingPurchase.items, session);

      /// delete  all the settlements
      await settlementModel.deleteMany({ voucherId: purchaseId }, { session });

      ////// update the outstanding as isCancelled as true and make advance receipts form applied Receipts
      const outstandingRecord = await TallyData.findOne({
        billId: existingPurchase?._id.toString(),
        bill_no: existingPurchase?.purchaseNumber,
        cmp_id: existingPurchase?.cmp_id,
        Primary_user_id: existingPurchase?.Primary_user_id,
      }).session(session);
      if (outstandingRecord) {
        const outstandingResult = await updateOutstandingBalance({
          existingVoucher: existingPurchase,
          valueToUpdateInOutstanding: 0,
          orgId: existingPurchase.cmp_id,
          voucherNumber: existingPurchase?.purchaseNumber,
          party: existingPurchase?.party,
          session,
          createdBy: req.owner,
          transactionType: "purchase",
          secondaryMobile: null,
          selectedDate: existingPurchase?.date,
          classification: "Cr",
        });
        outstandingRecord.isCancelled = true;
        await outstandingRecord.save({ session });
      }

      existingPurchase.isCancelled = true;
      const cancelledPurchase = await existingPurchase.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "Purchase canceled successfully",
        data: cancelledPurchase,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (
        error.errorLabels &&
        error.errorLabels.includes("TransientTransactionError")
      ) {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          console.log(
            `Retrying transaction attempt ${retryCount + 1} of ${MAX_RETRIES}`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
      }

      console.error("Error canceling purchase:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while canceling the purchase.",
        error: error.message,
      });
    }
  }

  return res.status(500).json({
    success: false,
    message: "Failed to cancel purchase after multiple retries",
  });
};

// @desc toget the details of transaction or purchase
// route get/api/sUsers/getPurchaseDetails

export const getPurchaseDetails = async (req, res) => {
  const purchaseId = req.params.id;

  try {
    // First, get the sale details with populated references
    let purchaseDetails = await purchaseModel
      .findById(purchaseId)
      .populate({
        path: "party._id",
        select: "partyName", // get only the name or other fields as needed
      })
      .populate({
        path: "items._id",
        select: "product_name", // populate item details
      })
      .populate({
        path: "items.GodownList.godownMongoDbId",
        select: "godown", // populate godown name
      })
      .lean();

    await attachLatestSeriesDetails(purchaseDetails, "purchaseNumber");

    if (!purchaseDetails) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Update the party name if it exists and restore original ID structure
    if (purchaseDetails.party?._id?.partyName) {
      // Update the party name with the latest value
      purchaseDetails.partyAccount = purchaseDetails.party._id.partyName;
      purchaseDetails.party.partyName = purchaseDetails.party._id.partyName;

      // Restore ID to original format
      const partyId = purchaseDetails.party._id._id;
      purchaseDetails.party._id = partyId;
    }

    // Update product names in items array
    if (purchaseDetails.items && purchaseDetails.items.length > 0) {
      purchaseDetails.items.forEach((item) => {
        if (item._id?.product_name) {
          // Update the product name with the latest value
          item.product_name = item._id.product_name;

          // Restore ID to original format
          const itemId = item._id._id;
          item._id = itemId;
        }

        // Update godown names in GodownList array
        if (item.GodownList && item.GodownList.length > 0) {
          item.GodownList.forEach((godown) => {
            if (godown.godownMongoDbId?.godown) {
              // Update the godown name with the latest value
              godown.godown = godown.godownMongoDbId.godown;

              // Restore ID to original format
              const godownId = godown.godownMongoDbId._id;
              godown.godownMongoDbId = godownId;
            }
          });
        }
      });
    }

    // Find the outstanding for this sale
    const outstandingOfPurchase = await TallyData.findOne({
      billId: purchaseDetails._id.toString(),
      bill_no: purchaseDetails.salesNumber,
      cmp_id: purchaseDetails.cmp_id,
      Primary_user_id: purchaseDetails.Primary_user_id,
    });

    const isEditable =
      !outstandingOfPurchase ||
      outstandingOfPurchase?.appliedPayments?.length === 0;
    purchaseDetails.isEditable = isEditable;

    res
      .status(200)
      .json({ message: "Purchase details fetched", data: purchaseDetails });
  } catch (error) {
    console.error("Error fetching purchase details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
