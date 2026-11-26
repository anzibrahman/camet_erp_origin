import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import {
  checkForNumberExistence,
  getNewSerialNumber,
} from "../helpers/secondaryHelper.js";
import TallyData from "../models/TallyData.js";
import mongoose from "mongoose";
import secondaryUserModel from "../models/secondaryUserModel.js";
import {
  createOutstandingWithAdvanceAmount,
  saveSettlementData,
  revertSettlementData,
  updateAdvanceOnEdit,
} from "../helpers/receiptHelper.js";

import {
  deleteAdvancePayment,
  updatePaymentNumber,
  updateTallyData,
  revertTallyUpdates,
} from "../helpers/paymentHelper.js";
import paymentModel from "../models/paymentModel.js";
import { formatToLocalDate } from "../helpers/helper.js";
import { generateVoucherNumber } from "../helpers/voucherHelper.js";
import settlementModel from "../models/settlementModel.js";

/**
 * @desc  create payment
 * @route POST/api/sUsers/createPayment
 * @access Public
 */

export const createPayment = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const {
    date,
    paymentNumber,
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

  const Primary_user_id = req.owner.toString();
  const Secondary_user_id = req.sUserId;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    /// generate voucher number(payment number)
    const { voucherNumber: paymentNumber, usedSeriesNumber } =
      await generateVoucherNumber(cmp_id, voucherType, series_id, session);
    if (paymentNumber) {
      req.body.paymentNumber = paymentNumber;
    }
    if (usedSeriesNumber) {
      req.body.usedSeriesNumber = usedSeriesNumber;
    }

    const serialNumber = await getNewSerialNumber(
      paymentModel,
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

    ////for updating voucher number of payment
    const updatedpaymentNumber = await updatePaymentNumber(
      cmp_id,
      secondaryUser,
      session
    );
console.log(
"line91 paymentcontroller")
    // Create the new payment
    const newPayment = new paymentModel({
      createdAt: new Date(),
      date: await formatToLocalDate(date, cmp_id, session),
      paymentNumber,
      series_id,
      voucherType,
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

    // Save the payment in the transaction session
    const savedPayment = await newPayment.save({ session, new: true });

    // /// save settlement data in cash or bank collection
    await saveSettlementData(
      paymentNumber,
      savedPayment._id.toString(),
      "Payment",
      "payment",
      enteredAmount || 0,
      paymentMethod,
      paymentDetails,
      party,
      cmp_id,
      Primary_user_id,
      date,
      session
    );

    // // Use the helper function to update TallyData
    await updateTallyData(
      billData,
      session,
      paymentNumber,
      savedPayment._id.toString()
    );

    if (advanceAmount > 0 && savedPayment) {
      const outstandingWithAdvanceAmount =
        await createOutstandingWithAdvanceAmount(
          date,
          cmp_id,
          savedPayment.paymentNumber,
          savedPayment._id.toString(),
          Primary_user_id,
          party,
          secondaryUser.mobileNumber,
          advanceAmount,
          session,
          "advancePayment",
          "Dr"
        );
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Payment created successfully",
      data: savedPayment,
    });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc  cancel payment
 * @route PUT/api/sUsers/cancelPayment
 * @access Public
 */

export const cancelPayment = async (req, res) => {
  const { paymentId, cmp_id } = req.params; // Assuming the payment ID is passed as a URL parameter
  const Primary_user_id = req.owner.toString();
  // const cmp_id = req.body.cmp_id; // Or from req.body if available

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the payment to be canceled
    const payment = await paymentModel.findById(paymentId).session(session);

    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.isCancelled) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Payment is already cancelled" });
    }

    // Revert tally updates
    await revertTallyUpdates(
      payment.billData,
      cmp_id,
      session,
      paymentId.toString()
    );

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: paymentId }, { session });

    await updateAdvanceOnEdit(
      "payment",
      0,
      payment.party,
      payment.cmp_id,
      paymentId.toString(),
      Primary_user_id,
      payment.receiptNumber,
      payment?._id?.toString(),
      payment.date,
      session
    );

    // // Delete advance payment, if any
    // if (payment.advanceAmount > 0) {
    //   await deleteAdvancePayment(
    //     payment.paymentNumber,
    //     payment._id.toString(),
    //     Primary_user_id,
    //     session
    //   );
    // }

    // Mark the payment as cancelled
    payment.isCancelled = true;
    await payment.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "payment cancelled successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error cancelling payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const editPayment = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const paymentId = req.params.paymentId;
  const Primary_user_id = req.owner.toString();
  const Secondary_user_id = req.sUserId;

  const {
    date,
    paymentNumber,
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
    outstandings,
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payment = await paymentModel.findById(paymentId).session(session);

    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    if (payment.isCancelled) {
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
      payment.billData,
      cmp_id,
      session,
      paymentId.toString()
    );

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: paymentId }, { session });

    // update advance payment / advance payment on edit of receipt or payment
    await updateAdvanceOnEdit(
      "payment",
      advanceAmount,
      payment.party,
      cmp_id,
      paymentId.toString(),
      Primary_user_id,
      payment?.paymentNumber,
      payment?.id?.toString(),
      date,
      session
    );

    // Use the helper function to update TallyData
    await updateTallyData(
      billData,
      session,
      paymentNumber,
      payment._id.toString()
    );

    ///update the existing payment
    payment.date = date;
    payment.paymentNumber = paymentNumber;
    payment.cmp_id = cmp_id;
    payment.party = party;
    payment.billData = billData;
    payment.totalBillAmount = totalBillAmount;
    payment.enteredAmount = enteredAmount;
    payment.advanceAmount = advanceAmount;
    payment.remainingAmount = remainingAmount;
    payment.paymentMethod = paymentMethod;
    payment.paymentDetails = paymentDetails;
    payment.note = note;
    payment.outstandings = outstandings;

    const savedPayment = await payment.save({ session, new: true });

    /// save settlement data in cash or bank collection
    await saveSettlementData(
      paymentNumber,
      savedPayment._id.toString(),
      "Payment",
      "payment",
      enteredAmount || 0,
      paymentMethod,
      paymentDetails,
      party,
      cmp_id,
      Primary_user_id,
      date,
      session
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Receipt updated successfully",
      data: payment,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error editing payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc  get payment details
 * @route GET/api/sUsers/getPaymentDetails
 * @access Public
 */

export const getPaymentDetails = async (req, res) => {
  const paymentId = req.params.id;
  try {
    const paymentDoc = await paymentModel.findById(paymentId);

    if (!paymentDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const payment = paymentDoc.toObject(); // Convert to plain object

    // Check if any advance receipt is present with this receipt
    const advancePayment = await TallyData.findOne({
      billId: paymentDoc._id.toString(),
      source: "advancePayment",
    });

    // Determine if cancellation is allowed
    let isEditable = true;
    if (advancePayment?.appliedReceipts?.length > 0) {
      isEditable = false;
    }

    payment.isEditable = isEditable;

    return res.status(200).json({
      payment: payment,
      message: "Payment details fetched",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};
