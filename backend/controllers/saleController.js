import { reverseVoucherAdjustments } from "../helpers/adjustmentHelper.js";
import { voucherEditError } from "../helpers/voucherLifecycleHelper.js";
import mongoose from "mongoose";
import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import {
  createSaleRecord,
  handleSaleStockUpdates,
  updateTallyData,
  revertSaleStockUpdates,
  savePaymentSplittingDataInSources,
  updateOutstandingBalance,
  changeConversionStatusOfOrder,
  // reverseConversionStatusOfOrder,
} from "../helpers/salesHelper.js";
import secondaryUserModel from "../models/secondaryUserModel.js";
import salesModel from "../models/salesModel.js";
import vanSaleModel from "../models/vanSaleModel.js";
import TallyData from "../models/TallyData.js";
import { formatToLocalDate } from "../helpers/helper.js";
import {
  attachLatestSeriesDetails,
  generateVoucherNumber,
} from "../helpers/voucherHelper.js";
import settlementModel from "../models/settlementModel.js";
import { createAdvanceReceiptsFromAppliedReceipts } from "../helpers/receiptHelper.js";
import { CheckOut } from "../models/bookingModal.js";
import {sendMail} from "../helpers/hotelHelper.js";
import primaryUserModel from "../models/primaryUserModel.js";
import kotModal from "../models/kotModal.js";
/**
 * @desc To createSale
 * @route POST /api/sUsers/createSale
 * @access Public
 */

export const createSale = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  if (req.body.voucherType === "performaInvoice") return res.status(400).json({ message: "Use the proforma invoice endpoint" });
  const session = await mongoose.startSession();

  session.startTransaction();
  try {
    const {
      orgId,
      items,
      additionalChargesFromRedux,
      series_id,
      party,
      finalAmount: lastAmount,
      finalOutstandingAmount,
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      subTotal,
      paymentSplittingData,
      selectedDate,
      voucherType,
      convertedFrom = [],
    } = req.body;

    const Secondary_user_id = req.sUserId;

    /// generate voucher number(sales number)
    const { voucherNumber: salesNumber, usedSeriesNumber } =
      await generateVoucherNumber(orgId, voucherType, series_id, session);
    if (salesNumber) {
      req.body.salesNumber = salesNumber;
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

    const configuration = secondaryUser.configurations.find(
      (config) => config.organization.toString() === orgId,
    );

    // const updatedItems = processSaleItems(items);
    await handleSaleStockUpdates(items, session); // Include session

    // const updateAdditionalCharge = additionalChargesFromRedux.map((charge) => {
    //   const { value, taxPercentage } = charge;
    //   const taxAmt = parseFloat(
    //     ((parseFloat(value) * parseFloat(taxPercentage || 0)) / 100).toFixed(2)
    //   );
    //   return { ...charge, taxAmt };
    // });

    const result = await createSaleRecord(
      req,
      salesNumber,
      items,
      additionalChargesFromRedux,
      session, // Pass session
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      subTotal,
    );

    /// add conversion status in sale order if the sale is converted from order
    if (convertedFrom.length > 0)
      await changeConversionStatusOfOrder(convertedFrom, session);
    const Primary_user_id = req.owner;

    /// check if sale has  payment splitting data
    let hasPaymentSplittingData = false;
    if (
      paymentSplittingData.length > 0 &&
      paymentSplittingData.some((item) => item?.ref_id !== null)
    ) {
      hasPaymentSplittingData = true;
    }

    console.log("hasPaymentSplittingData", hasPaymentSplittingData);

    /// if payment splitting data is present it will do settlement in the next function else we do it in updateTallyData

    if (finalOutstandingAmount > 0) {
      await updateTallyData(
        orgId,
        salesNumber,
        result._id,
        Primary_user_id,
        party,
        lastAmount,
        secondaryMobile,
        session,
        finalOutstandingAmount,
        selectedDate,
        voucherType,
        "Dr",
        undefined,
        undefined,
        hasPaymentSplittingData,
      );
    }

    ////save payment splitting data in bank or cash model also

    if (hasPaymentSplittingData) {
      await savePaymentSplittingDataInSources(
        paymentSplittingData,
        salesNumber,
        result._id,
        orgId,
        req.owner,
        secondaryMobile,
        "sale",
        result?.date,
        result?.party,
        session,
        selectedDate,
        voucherType,
        "Dr",
      );
    }

    // throw new Error("Payment splitting data is missing");
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      data: result,
      message: "Sale created successfully",
    });
  } catch (error) {
    console.error("Error in createSale:", error);
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "An error occurred while creating the sale.",
      error: error.message,
    });
  } finally {
    session.endSession(); // Ensure session is ended
  }
};

/**
 * @desc To editSale
 * @route POST /api/sUsers/editSale
 * @access Public
 */

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

export const editSale = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const saleId = req.params.id;
  const {
    orgId,
    party,
    items,
    despatchDetails,
    priceLevelFromRedux,
    additionalChargesFromRedux,
    note,
    finalAmount: lastAmount,
    finalOutstandingAmount,
    totalAdditionalCharges,
    totalWithAdditionalCharges,
    totalPaymentSplits,
    subTotal,
    selectedDate,
    paymentSplittingData = {},
    voucherType,
  } = req.body;

  let { salesNumber, series_id, usedSeriesNumber } = req.body;

  const isVanSale = req.query.vanSale === "true";
  const model = isVanSale ? vanSaleModel : salesModel;

  let retries = 0;

  while (retries < MAX_RETRIES) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingSale = await model.findById(saleId).session(session);
      if (!existingSale) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Sale not found" });
      }

      const editError = !isVanSale ? await voucherEditError(existingSale, session) : null;
      if (editError) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: editError });
      }

      const secondaryUser = await secondaryUserModel
        .findById(req.sUserId)
        .session(session);
      const secondaryMobile = secondaryUser?.mobile;

      if (existingSale?.series_id?.toString() !== series_id?.toString()) {
        const { voucherNumber, usedSeriesNumber: newUsedSeriesNumber } =
          await generateVoucherNumber(
            orgId,
            existingSale.voucherType,
            series_id,
            session,
          );

        salesNumber = voucherNumber; // Always update when series changes
        usedSeriesNumber = newUsedSeriesNumber; // Always update when series changes
      } else {
        salesNumber = existingSale.salesNumber;
        usedSeriesNumber = existingSale.usedSeriesNumber;
      }

      /// revert stock updates
      await revertSaleStockUpdates(existingSale.items, session);
      /// create stock updates with new data
      await handleSaleStockUpdates(items, session);
      console.log("line 260 salescontroller");
      /// update sale details
      const updateData = {
        _id: existingSale._id,
        serialNumber: existingSale.serialNumber,
        cmp_id: orgId,
        partyAccount: party?.partyName,
        party,
        despatchDetails,
        items,
        selectedPriceLevel: priceLevelFromRedux,
        additionalCharges: additionalChargesFromRedux,
        note,
        finalAmount: lastAmount,
        Primary_user_id: req.owner,
        Secondary_user_id: req.sUserId,
        salesNumber,
        series_id,
        usedSeriesNumber,
        date: await formatToLocalDate(selectedDate, orgId, session),
        createdAt: existingSale.createdAt,
        paymentSplittingData,
        finalOutstandingAmount,
        totalAdditionalCharges,
        totalWithAdditionalCharges,
        totalPaymentSplits,
        subTotal,
      };

      const result = await model.findByIdAndUpdate(saleId, updateData, {
        new: true,
        session,
      });

      /// delete  all the settlements
      await settlementModel.deleteMany({ voucherId: saleId }, { session });
      ///// create new settlements according to the updated payment splitting data
      if (
        paymentSplittingData.length > 0 &&
        paymentSplittingData.some((item) => item?.ref_id !== "")
      ) {
        await savePaymentSplittingDataInSources(
          paymentSplittingData,
          salesNumber,
          result._id,
          orgId,
          req.owner,
          secondaryMobile,
          "sale",
          result?.date,
          result?.party,
          session,
          selectedDate,
          voucherType,
          "Dr",
          "edit",
        );
      }

      //// update the outstanding of the sale against specific party

      const valueToUpdateInOutstanding = finalOutstandingAmount;

      if (
        valueToUpdateInOutstanding !==
        (existingSale.finalOutstandingAmount || existingSale.finalAmount)
        /// in old sales we dont have finalOutstandingAmount so we added || finalAmount
      ) {
        const outstandingResult = await updateOutstandingBalance({
          existingVoucher: existingSale,
          valueToUpdateInOutstanding,
          orgId,
          voucherNumber: salesNumber,
          party,
          session,
          createdBy: req.owner,
          transactionType: "sale",
          secondaryMobile,
          selectedDate,
          classification: "Dr",
        });
      }

      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "Sale edited successfully",
        data: updateData,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("Error editing sale:", error);

      if (error.code === 112 && retries < MAX_RETRIES - 1) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        console.log(`Retrying transaction (attempt ${retries})...`);
      } else {
        return res.status(500).json({
          success: false,
          message: "An error occurred while editing the sale.",
          error: error.message,
        });
      }
    } finally {
      session.endSession();
    }
  }

  return res.status(500).json({
    success: false,
    message: "Failed to edit sale after multiple attempts.",
  });
};

/**
 * @desc To cancel sale
 * @route POST /api/sUsers/cancelSale
 * @access Public
 */

export const cancelSale = async (req, res) => {
  const saleId = req.params.id; // ID of the sale to cancel
  const vanSaleQuery = req.query.vanSale;
  const cancelReason = req.body.cancelReason;
  const session = await mongoose.startSession(); // Start the session

  try {
    session.startTransaction(); // Begin a transaction

    // Find the sale to cancel
    const sale = await (vanSaleQuery === "true" ? vanSaleModel : salesModel)
      .findById(saleId)
      .session(session);

    if (!sale) {
      await session.abortTransaction(); // Rollback transaction if sale not found
      session.endSession(); // End the session
      return res
        .status(404)
        .json({ success: false, message: "Sale not found" });
    }

    if (vanSaleQuery !== "true" && sale.isCancelled) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: true, message: "Voucher is already cancelled", data: sale });
    }

    // Revert stock updates
    !sale.checkOutId && (await revertSaleStockUpdates(sale.items, session)); // Ensure stock updates use session

    /// delete  all the settlements
    await settlementModel.deleteMany({ voucherId: saleId }, { session });

    ////// update the outstanding as isCancelled as true and make advance receipts form applied Receipts
    const outstandingRecord = await TallyData.findOne({
      billId: sale._id.toString(),
      bill_no: sale.salesNumber,
      cmp_id: sale.cmp_id,
      Primary_user_id: sale.Primary_user_id,
    }).session(session);
    if (outstandingRecord) {
        await reverseVoucherAdjustments(outstandingRecord, req.sUserId || req.owner, req.body.cancelReason, session);
      //// update pending amount and
      const outstandingResult = await updateOutstandingBalance({
        existingVoucher: sale,
        valueToUpdateInOutstanding: 0,
        orgId: sale.cmp_id,
        voucherNumber: sale?.salesNumber,
        party: sale?.party,
        session,
        createdBy: req.owner,
        transactionType: "sale",
        secondaryMobile: null,
        selectedDate: sale?.date,
        classification: "Dr",
      });

      outstandingRecord.isCancelled = true;
      await outstandingRecord.save({ session });
    }

    if (sale.checkOutId) {
      const checkout = await CheckOut.findById(sale.checkOutId).session(
        session,
      );

      if (checkout && !checkout.isCancelled) {
        checkout.isCancelled = true;
        checkout.status = "cancelled";
        checkout.cancelledAt = new Date();
        checkout.cancelledBy = req.sUserId;
        checkout.cancelledByName = req.suser?.name || "";
        checkout.cancelReason = cancelReason;
        await checkout.save({ session });
      }
    }
    // Update sale status
    sale.isCancelled = true;
    sale.cancelledAt = new Date();
    sale.cancelledBy = req.sUserId;
    sale.cancelledByName = req.secUserName || "";
    sale.cancelReason = cancelReason;

    await (
      vanSaleQuery === "true" ? vanSaleModel : salesModel
    ).findByIdAndUpdate(saleId, sale, { session }); // Use the session in the update\

    ///

    /// if sale is created from order conversion then revert it

    // if (sale?.convertedFrom?.length > 0) {
    //   await reverseConversionStatusOfOrder(sale?.convertedFrom, session);
    // }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession(); // End the session

    try {
    let primaryUserData = await primaryUserModel.findById(req.owner);

    if (!primaryUserData || !primaryUserData?.email) {
      return res.status(200).json({
        success: true,
        message: "Sale cancelled successfully but email not sent",
        data: sale,
      });
    }
const kotIds = (sale.convertedFrom || []).map(item => item.id);
const kotObjectIds = kotIds.map(id => new mongoose.Types.ObjectId(id));
let kots = await kotModal.find({
  _id: { $in: kotObjectIds }   // or kotIds if they are already ObjectId
});
let kotHtml = kots.length > 0 ? kots.map((kot) => `<li> ${kot?.voucherNumber} - Service Type : ${kot?.type}</li>`).join("") : "None";
const cancelledBy = req?.secUserName || primaryUserData?.userName || "System";
const customer = sale.guest?.partyName ||  sale.party?.partyName || "";
const paymentSplitHtml = (sale?.paymentSplittingData || [])
  .map((payment, index) => `
    <tr>
      <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
      <td style="padding:8px; border:1px solid #ddd;">${payment?.type || "-"}</td>
      <td style="padding:8px; border:1px solid #ddd;">₹ ${payment?.amount || 0}</td>
      <td style="padding:8px; border:1px solid #ddd;">${payment?.subsource || "-"}</td>
      <td style="padding:8px; border:1px solid #ddd;">${payment?.underCategory || "-"}</td>
    </tr>
  `)
  .join("");

await sendMail({
  to: primaryUserData?.email,
  cc: [],
  subject: `Sale Cancelled Alert - ${sale?.salesNumber}`,
  fromName: "Cancel Sale",
  text: `Sale ${sale?.salesNumber} has been cancelled by ${cancelledBy}. Please check the payment split details below.`,
  html: `
    <div style="font-family: Arial, sans-serif; color:#111827;">
      <h2 style="color:#b91c1c;">Sale Cancelled Alert</h2>

      <p>Sale <strong>${sale?.salesNumber}</strong> has been cancelled.</p>
      <p><strong>Customer :</strong> ${cancelledBy}</p>
      <p><strong>Cancelled By:</strong> ${cancelledBy}</p>
      ${kots?.length > 0 ? `<p><strong>Service Type Details </strong>${kotHtml}</p>` : ""}
      
      <p><strong>Reason:</strong> ${cancelReason || "Reason not given"}</p>
      <p><strong>Total:</strong> ₹ ${sale?.finalAmount || 0}</p>

      <h3 style="margin-top:24px; color:#1f2937;">Payment Split Details</h3>
      ${
        sale?.paymentSplittingData?.length
          ? `
            <table style="border-collapse:collapse; width:100%; margin-top:12px; font-size:14px;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px; border:1px solid #ddd; text-align:left;">#</th>
                  <th style="padding:8px; border:1px solid #ddd; text-align:left;">Type</th>
                  <th style="padding:8px; border:1px solid #ddd; text-align:left;">Amount</th>
                  <th style="padding:8px; border:1px solid #ddd; text-align:left;">Sub Source</th>
                  <th style="padding:8px; border:1px solid #ddd; text-align:left;">Category</th>
                </tr>
              </thead>
              <tbody>
                ${paymentSplitHtml}
              </tbody>
            </table>
          `
          : `<p>No payment split details available.</p>`
      }
    </div>
  `,
  data: sale,
});

    } catch (notificationError) {
      console.error("Sale cancelled; notification failed:", notificationError);
    }
    res.status(200).json({
      success: true,
      message: "Sale canceled and stock reverted successfully",
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    session.endSession(); // End the session
    console.error("Error in canceling sale:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while canceling the sale.",
      error: error.message,
    });
  }
};

// @desc toget the details of transaction or sale
// route get/api/sUsers/getSalesDetails

export const getSalesDetails = async (req, res) => {
  const saleId = req.params.id;
  const vanSaleQuery = req.query.vanSale;

  const isVanSale = vanSaleQuery === "true";
  const model = isVanSale ? vanSaleModel : salesModel;

  try {
    // First, get the sale details with populated references
    let saleDetails = await model
      .findById(saleId)
      .populate({
        path: "party._id",
        select: "partyName state", // get only the name or other fields as needed
      })
      .populate({
        path: "items.GodownList.warrantyCard",
        select:
          "warrantyYears warrantyMonths displayInput termsAndConditions customerCareInfo customerCareNo imageUrl", // populate item details
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

    await attachLatestSeriesDetails(saleDetails, "salesNumber");

    if (!saleDetails) {
      return res.status(404).json({ error: "Sale not found" });
    }

    // Update the party name if it exists and restore original ID structure
    if (saleDetails.party?._id?.partyName) {
      // Update the party name with the latest value
      saleDetails.partyAccount = saleDetails.party._id.partyName;
      saleDetails.party.partyName = saleDetails.party._id.partyName;
      saleDetails.party.state = saleDetails.party._id.state;

      // Restore ID to original format
      const partyId = saleDetails.party._id._id;
      saleDetails.party._id = partyId;
    }

    // Update product names in items array
    if (saleDetails.items && saleDetails.items.length > 0) {
      saleDetails.items.forEach((item) => {
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
    const outstandingOfSale = await TallyData.findOne({
      billId: saleDetails._id.toString(),
      bill_no: saleDetails.salesNumber,
      cmp_id: saleDetails.cmp_id,
      Primary_user_id: saleDetails.Primary_user_id,
    });

    const isEditable =
      !outstandingOfSale || (
        !outstandingOfSale.appliedReceipts?.length &&
        !outstandingOfSale.appliedPayments?.length &&
        !(outstandingOfSale.adjustmentAmount > 0)
      );
    saleDetails.isEditable = isEditable;

    res
      .status(200)
      .json({ message: "Sales details fetched", data: saleDetails });
  } catch (error) {
    console.error("Error fetching sale details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
