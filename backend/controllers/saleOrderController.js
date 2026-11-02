import { voucherEditError } from "../helpers/voucherLifecycleHelper.js";
import { prepareVoucherParty } from "../helpers/voucherPartyHelper.js";
import { checkForNumberExistence } from "../helpers/secondaryHelper.js";
import {
  calculateAdditionalCharges,
  fetchLastInvoice,
  revertStockChanges,
  updateItemStockAndCalculatePrice,
  updateSecondaryUserConfiguration,
} from "../helpers/saleOrderHelper.js";
import invoiceModel from "../models/invoiceModel.js";
import secondaryUserModel from "../models/secondaryUserModel.js";
import mongoose from "mongoose";
import { formatToLocalDate } from "../helpers/helper.js";
import partyModel from "../models/partyModel.js";
import {
  attachLatestSeriesDetails,
  generateVoucherNumber,
} from "../helpers/voucherHelper.js";

/**
 * @desc  create sale order
 * @route POST/api/sUsers/createInvoice
 * @access Public
 */

export const createInvoice = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const Secondary_user_id = req.sUserId;
  const owner = req.owner.toString();
  const maxRetries = 5;
  let attempts = 0;

  const session = await mongoose.startSession(); // Start session outside the retry loop

  try {
    while (attempts < maxRetries) {
      session.startTransaction(); // Start transaction inside the loop

      try {
        const {
          orgId,
          party,
          items,
          priceLevelFromRedux,
          additionalChargesFromRedux,
          finalAmount: lastAmount,
          despatchDetails,
          selectedDate,
          voucherType,
          series_id,
          note
        } = req.body;
console.log("line 48 saleorder")
        formatToLocalDate(selectedDate, orgId);

        /// generate voucher number(invoice number)
        const { voucherNumber: orderNumber, usedSeriesNumber } =
          await generateVoucherNumber(orgId, voucherType, series_id, session);
        if (orderNumber) {
          req.body.orderNumber = orderNumber;
        }
        if (usedSeriesNumber) {
          req.body.usedSeriesNumber = usedSeriesNumber;
        }

        const newSerialNumber = await fetchLastInvoice(invoiceModel, session);
        const updatedItems = await Promise.all(
          items.map((item) =>
            updateItemStockAndCalculatePrice(item, priceLevelFromRedux, session)
          )
        );

        // const updateAdditionalCharge =
        //   additionalChargesFromRedux.length > 0
        //     ? calculateAdditionalCharges(additionalChargesFromRedux)
        //     : [];
console.log("line saleorder")
        const invoice = new invoiceModel({
          serialNumber: newSerialNumber,
          cmp_id: orgId,
          partyAccount: party?.partyName,
          party,
          items: updatedItems,
          priceLevel: priceLevelFromRedux,
          additionalCharges: additionalChargesFromRedux,
          note,
          finalAmount: lastAmount,
          Primary_user_id: owner,
          Secondary_user_id,
          orderNumber,
          series_id,
          usedSeriesNumber,
          despatchDetails,
          date: await formatToLocalDate(selectedDate, orgId, session),
        });

        const result = await invoice.save({ session });
        const secondaryUser = await secondaryUserModel
          .findById(Secondary_user_id)
          .session(session);

        if (!secondaryUser) {
          await session.abortTransaction();
          return res.status(404).json({ message: "Secondary user not found" });
        }

        await updateSecondaryUserConfiguration(secondaryUser, orgId, session);

        await session.commitTransaction();
        return res
          .status(200)
          .json({ message: "Sale order created successfully", data: result });
      } catch (error) {
        await session.abortTransaction();
        if (error.code === 112) {
          // Write conflict error code
          attempts++;
          console.warn(`Retrying transaction, attempt ${attempts}...`);
          await delay(500); // Adding a small delay before retry
          continue; // Retry the transaction
        }
        throw error;
      }
    }

    throw new Error("Transaction failed after multiple attempts");
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  } finally {
    await session.endSession();
  }
};

/**
 * @desc  edit sale order
 * @route POST/api/sUsers/editInvoice
 * @access Public
 */
export const editInvoice = async (req, res) => {
  if (!await prepareVoucherParty(req, res)) return;
  const session = await mongoose.startSession();
  let retries = 3; // Retry up to 3 times

  while (retries > 0) {
    try {
      session.startTransaction();

      const Secondary_user_id = req.sUserId;
      const Primary_user_id = req.owner;
      const invoiceId = req.params.id;

      const {
        orgId,
        party,
        items,
        priceLevelFromRedux,
        additionalChargesFromRedux,
        finalAmount: lastAmount,
        despatchDetails,
        selectedDate,
        note
      } = req.body;

      let { orderNumber, series_id, usedSeriesNumber } = req.body;

      // Fetch the existing invoice
      const existingInvoice = await invoiceModel
        .findById(invoiceId)
        .session(session);
      if (!existingInvoice) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      const editError = await voucherEditError(existingInvoice, session, true);
      if (editError) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ success: false, message: editError });
      }

      if (existingInvoice?.series_id?.toString() !== series_id?.toString()) {
        const { voucherNumber, usedSeriesNumber: newUsedSeriesNumber } =
          await generateVoucherNumber(
            orgId,
            existingInvoice.voucherType,
            series_id,
            session
          );

        orderNumber = voucherNumber; // Always update when series changes
        usedSeriesNumber = newUsedSeriesNumber; // Always update when series changes
      }

      else {
        orderNumber = existingInvoice.orderNumber;
        usedSeriesNumber = existingInvoice.usedSeriesNumber;
      }

      // Revert stock changes based on the original invoice
      await revertStockChanges(existingInvoice, session);

      // Calculate the updated item values (price, discount, etc.)
      const updatedItems = await Promise.all(
        items.map((item) =>
          updateItemStockAndCalculatePrice(item, priceLevelFromRedux, session)
        )
      );

      const updateAdditionalCharge =
        additionalChargesFromRedux.length > 0
          ? calculateAdditionalCharges(additionalChargesFromRedux)
          : [];

      // Update the invoice with new data
console.log("204 saleorder")
      const formattedDate = await formatToLocalDate(
        selectedDate,
        orgId,
        session
      );

      const updatedInvoice = await invoiceModel.findByIdAndUpdate(
        invoiceId,
        {
          $set: {
            cmp_id: orgId,
            party,
            items: updatedItems,
            priceLevel: priceLevelFromRedux,
            additionalCharges: updateAdditionalCharge, // Use calculated charges
            note,
            finalAmount: lastAmount,
            Primary_user_id,
            Secondary_user_id,
            orderNumber,
            series_id,
            usedSeriesNumber,
            despatchDetails,
            date: formattedDate,
            createdAt: existingInvoice.createdAt,
          },
        },
        { new: true, session, timestamps: false }
      );

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        message: "Invoice updated successfully",
        data: updatedInvoice,
      });
    } catch (error) {
      console.log(error);

      // Handle write conflict or transient transaction errors
      if (
        error.codeName === "WriteConflict" ||
        error.errorLabels.has("TransientTransactionError")
      ) {
        retries -= 1;
        console.log(`Retrying transaction, remaining retries: ${retries}`);
        await session.abortTransaction(); // Ensure we abort the session before retrying
        if (retries === 0) {
          console.error("Transaction failed after multiple retries");
          return res.status(500).json({
            success: false,
            message: "Transaction failed after multiple retries.",
            error: error.message,
          });
        }
      } else {
        await session.abortTransaction();
        session.endSession();
        console.error(error);
        return res.status(500).json({
          success: false,
          message: "Internal server error, try again!",
          error: error.message,
        });
      }
    }
  }
};

/**
 * @desc  cancel sale order
 * @route POST/api/sUsers/cancelSalesOrder
 * @access Public
 */

export const cancelSalesOrder = async (req, res) => {
  const invoiceId = req.params.id;
  const secondary_user_id = req.sUserId;
  const owner = req.owner.toString();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the invoice by ID within the session
    const invoice = await invoiceModel.findById(invoiceId).session(session);
    if (!invoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    // Check if the invoice is already cancelled
    if (invoice?.isCancelled) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Invoice is already cancelled",
      });
    }

    if (invoice.isConverted) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ success: false, message: "Converted sale orders cannot be cancelled" });
    }

    // Revert stock changes based on the original invoice
    await revertStockChanges(invoice, session);

    // Mark the invoice as cancelled
    invoice.isCancelled = true;

    // Update the invoice in the database
    const result = await invoiceModel.findByIdAndUpdate(invoiceId, invoice, {
      new: true,
      session,
    });

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Invoice cancelled successfully",
      data: result,
    });
  } catch (error) {
    // Abort the transaction if any error occurs
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
      error: error.message,
    });
  }
};

/**
 * @desc get invoice details
 * @route GET/api/sUsers/getInvoiceDetails/:id
 * @access Public
 */

export const getInvoiceDetails = async (req, res) => {
  const invoiceId = req.params.id;

  try {
    // Fetch invoice with necessary population
    let invoiceDetails = await invoiceModel
      .findById(invoiceId)
      .populate({
        path: "party._id",
        select: "partyName", // Populate party name
      })
      .populate({
        path: "items._id",
        select: "product_name balance_stock", // Populate product name
      })
      .populate({
        path: "items.GodownList.godownMongoDbId",
        select: "godown", // Populate godown name
      })
      .lean();

    if (!invoiceDetails) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    await attachLatestSeriesDetails(invoiceDetails, "orderNumber");

    // Update party name and fix _id
    if (invoiceDetails.party?._id?.partyName) {
      invoiceDetails.partyAccount = invoiceDetails.party._id.partyName;
      invoiceDetails.party.partyName = invoiceDetails.party._id.partyName;
      invoiceDetails.party._id = invoiceDetails.party._id._id; // Restore original ID
    }

    // Update item and godown details
    if (invoiceDetails.items && invoiceDetails.items.length > 0) {
      invoiceDetails.items.forEach((item) => {
        console.log("itemfgd", item._id);

        if (item._id?.product_name) {
          console.log("here");
          item.product_name = item._id.product_name;
          item.balance_stock = item._id.balance_stock;
          item._id = item._id._id;
        }

        console.log(item?.product_name);
        console.log(item?.balance_stock);

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

    res.status(200).json({
      message: "Invoice details fetched",
      data: invoiceDetails,
    });
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * @desc finding party List with total amount of sale orders
 * @route POST/api/sUsers/cancelSalesOrder
 * @access Public
 */

export const PartyListWithOrderPending = async (req, res) => {
  const { cmp_id } = req.params;
  const { owner: Primary_user_id, sUserId: secUserId } = req;

  try {
    // Fetch parties and orders concurrently
    const [partyList, orders] = await Promise.all([
      partyModel
        .find({ cmp_id, Primary_user_id })
        .select(
          "_id partyName billingAddress shippingAddress mobileNumber gstNo emailID pin country state accountGroup"
        ),
      invoiceModel
        .find({
          cmp_id,
          Primary_user_id,
          isCancelled: false,
          $or: [
            { isConverted: false },
            { isConverted: { $exists: false } },
            { isConverted: null },
          ],
        })
        .select("party._id finalAmount"),
    ]);

    if (partyList.length === 0) {
      return res.status(404).json({ message: "No parties found" });
    }

    // Create a map of party totals from orders
    const partyTotals = orders.reduce((acc, order) => {
      const partyId = order.party._id.toString();
      const amount = parseFloat(order.finalAmount) || 0;
      acc[partyId] = (acc[partyId] || 0) + amount;
      return acc;
    }, {});

    // Attach order totals to party data and filter for totals > 0
    const partiesWithTotals = partyList
      .map((party) => {
        const partyId = party._id.toString();
        return {
          ...party.toObject(),
          totalOutstanding: Number((partyTotals[partyId] || 0).toFixed(2)),
        };
      })
      .filter((party) => party.totalOutstanding > 0);

    // Sort parties by total order amount in descending order
    partiesWithTotals.sort(
      (a, b) => parseFloat(b.totalOutstanding) - parseFloat(a.totalOutstanding)
    );

    res.status(200).json({
      success: true,
      partyList: partiesWithTotals,
      message: "Parties fetched successfully with order totals",
    });
  } catch (error) {
    console.error("Error in PartyList:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
