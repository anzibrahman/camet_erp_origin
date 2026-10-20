import mongoose from "mongoose";
import OragnizationModel from "../models/OragnizationModel.js";
import TallyData from "../models/TallyData.js";
import cashModel from "../models/cashModel.js";
import bankModel from "../models/bankModel.js";
import settlementModel from "../models/settlementModel.js";
import { calculateBillPending, getReceiptPaymentMultiplier } from "./helper.js";

//Updates the receiptNumber for a given secondary user
export const updateReceiptNumber = async (orgId, secondaryUser, session) => {
  try {
    let receiptConfig = false;

    const configuration = secondaryUser.configurations.find(
      (config) => config.organization.toString() === orgId
    );

    if (configuration) {
      receiptConfig = true;
    }

    if (receiptConfig === true) {
      const updatedConfiguration = secondaryUser.configurations.map(
        (config) => {
          if (config.organization.toString() === orgId) {
            return {
              ...config,
              receiptNumber: (config.receiptNumber || 0) + 1,
            };
          }
          return config;
        }
      );
      secondaryUser.configurations = updatedConfiguration;
      await secondaryUser.save({ session });
    } else {
      await OragnizationModel.findByIdAndUpdate(
        orgId,
        { $inc: { receiptNumber: 1 } },
        { new: true, session }
      );
    }
  } catch (error) {
    console.error("Error in  update receiptNumber :", error);
    throw error;
  }
};

//Updates the TallyData for a given set of bills
export const updateTallyData = async (
  billData,
  cmp_id,
  session,
  receiptNumber,
  _id,
  from = "other",
) => {
  // Create a lookup map for billNo to remainingAmount and settledAmount from billData
  const billAmountMap = new Map(
    billData.map((bill) => [
      bill.billId,
      {
        remainingAmount: bill.remainingAmount,
        settledAmount: bill.settledAmount,
      },
    ])
  );

  console.log("billamountmap", billAmountMap)
  // Fetch the outstanding bills from TallyData for this company
  const outstandingData = await TallyData.find({
    cmp_id,
    billId: { $in: Array.from(billAmountMap.keys()) },
    ...(from === "receipt" ? { bill_pending_amt: { $gt: 0 } } : {})
  }).session(session);

  if (outstandingData.length === 0) {
    return;
  }
  console.log("outstandingdata", outstandingData)
  // Prepare bulk update operations for TallyData
  const bulkUpdateOperations = outstandingData.map((doc) => {
    const { settledAmount } = billAmountMap.get(doc.billId); // Get the remaining and settled amount



    //Calculate total applied receipts from existing + this one
    const existingAppliedReceiptsTotal = (doc?.appliedReceipts || []).reduce(
      (sum, r) => {
        return sum + (r?.settledAmount || 0);
      },
      0
    );

    // console.log("Calculating total applied payments for billId:", doc.billId);
    //// calculate applied payments total
    const existingAppliedPaymentsTotal = (doc?.appliedPayments || []).reduce(
      (sum, p) => {
        return sum + (p?.settledAmount || 0);
      },
      0
    );

    const totalAppliedReceipts = existingAppliedReceiptsTotal + settledAmount;

    const balance = calculateBillPending(
      doc?.source,
      doc?.bill_amount || 0,
      totalAppliedReceipts,
      existingAppliedPaymentsTotal,
      doc?.adjustmentAmount || 0
    );
    console.log("balance", balance)

    // const balance = (receiptPaymentMultiplier * doc?.bill_amount || 0) - (Number(totalAppliedReceipts)+Number(existingAppliedPaymentsTotal));



    return {
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            bill_pending_amt: balance, // Update remaining amount (pending amount)
            classification: balance < 0 ? "Cr" : "Dr", // ✅ set classification dynamically
          },
          $push: {
            appliedReceipts: {
              _id, // Add the _id of the receipt
              receiptNumber, // Add the receipt number
              settledAmount, // Add the settled amount directly from billData
              date: new Date(), // Optional: Timestamp when this receipt was applied
            },
          },
        },
      },
    };
  });

  // Execute the bulk update in TallyData
  await TallyData.bulkWrite(bulkUpdateOperations, { session });
};

// Helper function to create or update advance amounts
export const createOutstandingWithAdvanceAmount = async (
  date,
  cmp_id,
  voucherNumber,
  billId,
  Primary_user_id,
  party,
  secondaryMobile,
  advanceAmount,
  session,
  sourceName,
  classification
) => {
  try {
    const billData = {
      Primary_user_id,
      bill_no: voucherNumber,
      billId: billId.toString(),
      cmp_id,
      party_id: party?._id,
      bill_date: new Date(date),
      bill_due_date: new Date(date),
      email: party?.emailID,
      mobile_no: party?.mobileNumber,
      party_name: party?.partyName,
      user_id: secondaryMobile || "null",
      source: sourceName,
      classification: classification,
    };

    // Check if advance already exists
    const existingAdvance = await TallyData.findOne({
      cmp_id: cmp_id,
      bill_no: voucherNumber,
      billId: billId.toString(),
      Primary_user_id: Primary_user_id,
      party_id: party?._id,
      source: sourceName,
    }).session(session);

    if (existingAdvance) {
      // Merge by adding amounts
      const updatedBillAmount =
        Number(existingAdvance.bill_amount || 0) + Number(advanceAmount);

      const totalAppliedPayments = (
        existingAdvance?.appliedPayments || []
      ).reduce((sum, payment) => sum + (payment.settledAmount || 0), 0);

      const totalAppliedReceipts = (
        existingAdvance?.appliedReceipts || []
      ).reduce((sum, r) => sum + (r?.settledAmount || 0), 0);


      const updatedPendingAmount = calculateBillPending(
        existingAdvance?.source,
        updatedBillAmount || 0,
        totalAppliedReceipts,
        totalAppliedPayments,
        existingAdvance?.adjustmentAmount || 0
      );



      const tallyUpdate = await TallyData.findByIdAndUpdate(
        existingAdvance._id,
        {
          ...billData,
          bill_amount: updatedBillAmount,
          bill_pending_amt: updatedPendingAmount,
          classification: updatedPendingAmount < 0 ? "Cr" : "Dr",
          updatedAt: new Date(),
        },
        { new: true, session }
      );

      // console.log(`Merged advance for ${sourceName}:`, tallyUpdate);
      return tallyUpdate;
    } else {
      // Create new advance
      const tallyUpdate = await TallyData.findOneAndUpdate(
        {
          cmp_id: cmp_id,
          bill_no: voucherNumber,
          billId: billId.toString(),
          Primary_user_id: Primary_user_id,
          party_id: party?._id,
          source: sourceName,
        },
        {
          ...billData,
          bill_amount: advanceAmount,
          bill_pending_amt: sourceName === "advanceReceipt" ? -advanceAmount : advanceAmount,
        },
        { upsert: true, new: true, session }
      );

      return tallyUpdate;
    }
  } catch (error) {
    console.error(`Error creating/updating advance for ${sourceName}:`, error);
    throw error;
  }
};

// Reverts the TallyData updates made by addOutstanding and addSettlementData functions.
export const revertTallyUpdates = async (
  billData,
  cmp_id,
  session,
  receiptId
) => {
  try {
    if (!billData?.length) {
      console.log("❌ No bill data to revert");
      return;
    }

    // console.log("🔄 Starting revert process for receiptId:", receiptId);
    // console.log("📋 Bill data to revert:", billData.length, "items");

    const billIds = billData.map((bill) => bill.billId.toString());
    // console.log("🔍 Looking for billIds:", billIds);

    // Fetch documents and perform bulk operations
    const docs = await TallyData.find({
      billId: { $in: billIds },
      $or: [
        { cantchange: false },
        { cantchange: { $exists: false } }
      ]
    }).session(session);

    if (!docs.length) {
      console.log("❌ No matching tally data found to revert");
      return;
    }

    // console.log("✅ Found", docs.length, "documents to revert");

    // Prepare bulk operations
    const bulkOps = docs.map((doc, index) => {
      console.log(`\n📄 Processing document ${index + 1}/${docs.length}:`);
      console.log("   - BillId:", doc.billId);
      console.log("   - Current bill_amount:", doc.bill_amount);
      console.log("   - Current bill_pending_amt:", doc.bill_pending_amt);
      console.log("   - Current classification:", doc.classification);
      console.log(
        "   - Applied receipts before filter:",
        doc.appliedReceipts?.length || 0
      );

      // Filter out the receipt being reverted
      const remainingReceipts =
        doc.appliedReceipts?.filter(
          (receipt) => receipt._id.toString() !== receiptId.toString()
        ) || [];

      console.log(
        "   - Applied receipts after filter:",
        remainingReceipts.length
      );
      console.log(
        "   - Remaining receipts:",
        remainingReceipts.map((r) => ({
          id: r._id,
          settled: r.settledAmount,
        }))
      );

      // Calculate total of remaining applied receipts
      const totalAppliedReceipts = remainingReceipts.reduce(
        (sum, receipt) => sum + (receipt.settledAmount || 0),
        0
      );

      const totalAppliedPayments =
        doc.appliedPayments?.reduce(
          (sum, payment) => sum + (payment.settledAmount || 0),
          0
        ) || 0;

      const newPendingAmount = calculateBillPending(
        doc?.source,
        doc?.bill_amount || 0,
        totalAppliedReceipts,
        totalAppliedPayments,
        doc?.adjustmentAmount || 0
      );

      console.log(
        "   - Total remaining applied receipts:",
        totalAppliedReceipts
      );

      // Calculate new pending amount and classification
      // const newPendingAmount = doc.bill_amount - totalAppliedReceipts;
      const newClassification = newPendingAmount < 0 ? "Cr" : "Dr";

      console.log("   - New pending amount:", newPendingAmount);
      console.log("   - New classification:", newClassification);

      return {
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              appliedReceipts: remainingReceipts,
              bill_pending_amt: newPendingAmount, // Ensure non-negative pending amount
              classification: newClassification,
            },
          },
        },
      };
    });

    console.log("\n🔧 Executing bulk operations...");
    console.log("📊 Bulk operations count:", bulkOps.length);

    // Execute bulk operation
    const result = await TallyData.bulkWrite(bulkOps, { session });

    // console.log("✅ Bulk operation result:", {
    //   modifiedCount: result.modifiedCount,
    //   matchedCount: result.matchedCount,
    //   upsertedCount: result.upsertedCount
    // });

    // console.log(`🎉 Successfully reverted ${docs.length} tally updates`);
  } catch (error) {
    console.error("💥 Error in revertTallyUpdates:", {
      message: error.message,
      stack: error.stack,
      receiptId,
      billDataCount: billData?.length || 0,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

//Deletes the advance receipt entry from TallyData if it exists
export const deleteAdvanceReceipt = async (
  receiptNumber,
  billId,
  Primary_user_id,
  session
) => {
  try {
    // First, find the advance receipt entry
    const advanceReceipt = await TallyData.findOne({
      bill_no: receiptNumber,
      billId: billId.toString(),
      Primary_user_id,
      source: "advanceReceipt",
    }).session(session);

    // If not found, throw an error
    if (!advanceReceipt) {
      throw new Error(
        `No advance receipt found for receipt number: ${receiptNumber}`
      );
    }

    // Check if appliedPayments exists and has any entries
    if (
      Array.isArray(advanceReceipt.appliedPayments) &&
      advanceReceipt.appliedPayments.length > 0
    ) {
      throw new Error(
        `Receipt ${receiptNumber} cannot be cancelled because it has applied payments.`
      );
    }

    // Proceed to delete the advance receipt
    const deletedAdvanceReceipt = await TallyData.findOneAndDelete({
      _id: advanceReceipt._id,
    }).session(session);
  } catch (error) {
    console.error("Error in deleteAdvanceReceipt:", error);
    throw error;
  }
};

///// save payment details in payment collection
export const saveSettlementData = async (
  voucherNumber,
  voucherId,
  voucherModel,
  voucherType,
  amount,
  paymentMethod,
  paymentDetails,
  party,
  cmp_id,
  Primary_user_id,
  date,
  session
) => {
  try {
    const settlementData = {
      voucherNumber: voucherNumber,
      voucherId: voucherId,
      voucherModel: voucherModel,
      voucherType: voucherType,
      amount: amount,
      payment_mode: paymentMethod.toLowerCase(),
      partyName: party?.partyName || "",
      partyId: party?._id || null,
      partyType: party?.partyType || null,
      sourceId: paymentDetails?._id || null,
      sourceType: paymentMethod == "Cash" ? "cash" : "bank",
      cmp_id: cmp_id,
      Primary_user_id: Primary_user_id,
      settlement_date: date,
      voucher_date: date,
    };

    await settlementModel.create([settlementData], { session });
  } catch (error) {
    console.error("Error in save settlement data:", error);
    throw error;
  }
};

//// revert save settlement data
export const revertSettlementData = async (
  paymentMethod,
  paymentDetails,
  voucherNumber,
  voucherId,
  session
) => {
  try {
    if (!paymentDetails._id || !paymentMethod) {
      throw new Error("Invalid paymentDetails");
    }
    let model = null;
    switch (paymentMethod) {
      case "Online":
        model = bankModel;
        break;
      case "Cash":
        model = cashModel;
        break;
      case "Cheque":
        model = bankModel;
        break;
      default:
        throw new Error("Invalid paymentMethod");
    }
    ``;
    if (model) {
      const query = {
        _id: new mongoose.Types.ObjectId(paymentDetails._id),
      };

      // First, pull the specified settlements
      const pullUpdate = {
        $pull: {
          settlements: {
            voucherNumber: voucherNumber,
            voucherId: voucherId.toString(),
          },
        },
      };

      const options = {
        new: true,
        session,
      };

      const updatedSource = await model.findOneAndUpdate(
        query,
        pullUpdate,
        options
      );
    }
  } catch (error) {
    console.error("Error in save settlement data:", error);
    throw error;
  }
};

//// create advance receipt if a voucherIsCancelled
export const createAdvanceReceiptsFromAppliedReceipts = async (
  appliedReceipts,
  orgId,
  existingVoucher,
  party,
  session
) => {
  const updatedAppliedReceipts = [];
  let totalProcessedAmount = 0;

  // Process all receipts as advance receipts within the existing transaction
  for (let i = 0;i < appliedReceipts.length;i++) {
    const receipt = appliedReceipts[i];

    const { receiptNumber, settledAmount, date, _id } = receipt;

    // Use the full settled amount as advance amount
    const advanceAmount = settledAmount;

    try {
      // Call the function to create or update advance
      await createOutstandingWithAdvanceAmount(
        date,
        orgId, // cmp_id
        receiptNumber,
        _id.toString(),
        existingVoucher?.Primary_user_id,
        party,
        party?.mobileNumber,
        advanceAmount,
        session,
        "advanceReceipt",
        "Cr"
      );

      totalProcessedAmount += advanceAmount;
      console.log(`Successfully processed receipt ${receiptNumber}`);
    } catch (error) {
      console.error(`Error processing receipt ${receiptNumber}:`, error);
      // Re-throw the error to rollback the entire transaction
      throw error;
    }
  }

  console.log("All receipts processed as advance receipts");
  console.log("Total processed amount:", totalProcessedAmount);

  return {
    remainingAmount: 0, // All receipts processed, no remaining amount
    updatedAppliedReceipts: updatedAppliedReceipts, // Empty array since all are processed
  };
};

//// create advance payments if a voucherIsCancelled
export const createAdvancePaymentsFromAppliedPayments = async (
  appliedPayments,
  orgId,
  existingVoucher,
  party,
  session
) => {
  const updatedAppliedPayments = [];
  let totalProcessedAmount = 0;

  // Process all payments as advance payments within the existing transaction
  for (let i = 0;i < appliedPayments.length;i++) {
    const payment = appliedPayments[i];

    const { paymentNumber, settledAmount, date, _id } = payment;

    // Use the full settled amount as advance amount
    const advanceAmount = settledAmount;

    try {
      // Call the function to create or update advance
      await createOutstandingWithAdvanceAmount(
        date,
        orgId, // cmp_id
        paymentNumber,
        _id.toString(),
        existingVoucher?.Primary_user_id,
        party,
        party?.mobileNumber,
        advanceAmount,
        session,
        "advancePayment",
        "Dr"
      );

      totalProcessedAmount += advanceAmount;
      // console.log(`Successfully processed payment ${paymentNumber}`);
    } catch (error) {
      console.error(`Error processing payment ${paymentNumber}:`, error);
      // Re-throw the error to rollback the entire transaction
      throw error;
    }
  }

  // console.log("All payments processed as advance payments");
  // console.log("Total processed amount:", totalProcessedAmount);

  return {
    remainingAmount: 0, // All payments processed, no remaining amount
    updatedAppliedPayments: updatedAppliedPayments, // Empty array since all are processed
  };
};

/// helper function to update the advance receipt / advance payment on receipt or payment edit or cancel
export const updateAdvanceOnEdit = async (
  voucherType,
  newAmount,
  party,
  cmp_id,
  billId,
  Primary_user_id,
  voucherNumber,
  voucherId,
  date,
  session
) => {


  // Find existing outstanding record
  const matchedOutStanding = await TallyData.findOne({
    party_id: party?._id,
    cmp_id: cmp_id,
    billId: billId.toString(),
    source: voucherType === "receipt" ? "advanceReceipt" : "advancePayment",
  }).session(session);


  if (matchedOutStanding) {
    const sumOfAppliedReceipts = matchedOutStanding.appliedReceipts.reduce(
      (sum, receipt) => {
        return sum + (receipt.settledAmount || 0);
      },
      0
    );
    const sumOfAppliedPayments = matchedOutStanding.appliedPayments.reduce(
      (sum, payment) => {
        return sum + (payment.settledAmount || 0);
      },
      0
    );
    if (
      sumOfAppliedPayments === 0 &&
      sumOfAppliedReceipts === 0 &&
      newAmount === 0
    ) {
      // If no applied receipts or payments, we can directly delete the record if newAmount is 0
      await TallyData.deleteOne({ _id: matchedOutStanding._id }).session(
        session
      );
      return null;
    } else {
      const billPendingAmount = calculateBillPending(
        matchedOutStanding?.source,
        newAmount || 0,
        sumOfAppliedReceipts,
        sumOfAppliedPayments,
        matchedOutStanding?.adjustmentAmount || 0
      );


      // Use session in the update operation and fix the return value check
      const foundOutstanding = await TallyData.findOneAndUpdate(
        { _id: matchedOutStanding._id },
        {
          $set: {
            bill_amount: newAmount,
            bill_pending_amt: billPendingAmount,
            classification: billPendingAmount < 0 ? "Cr" : "Dr",
          },
        },
        {
          upsert: true,
          returnOriginal: false,
          session: session, // Add session to the update operation
        }
      );


      // Fix the error checking - findOneAndUpdate returns the document directly, not an {ok, value} object
      if (!foundOutstanding) {
        throw new Error(
          `Unable to update outstanding record with ID: ${matchedOutStanding._id}`
        );
      }
      return foundOutstanding;
    }
  } else {

    if (newAmount === 0) {
      return null; // No need to create a record if the new amount is 0
    }

    await createOutstandingWithAdvanceAmount(
      date,
      cmp_id,
      voucherNumber,
      voucherId,
      Primary_user_id,
      party,
      null,
      newAmount,
      session,
      voucherType === "receipt" ? "advanceReceipt" : "advancePayment",
      voucherType === "receipt" ? "Cr" : "Dr"
    );
  }
};
