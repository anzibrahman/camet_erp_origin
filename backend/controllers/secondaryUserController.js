import SecondaryUser from "../models/secondaryUserModel.js";
import generateSecToken from "../utils/generateSecondaryToken.js";
import TallyData from "../models/TallyData.js";
import TransactionModel from "../models/TransactionModel.js";
import BankDetails from "../models/bankModel.js";
import generateNumericOTP from "../utils/generateOtp.js";
import nodemailer from "nodemailer";
import PartyModel from "../models/partyModel.js";
import productModel from "../models/productModel.js";
import invoiceModel from "../models/invoiceModel.js";
import HsnModel from "../models/hsnModel.js";
import AccountGroup from "../models/accountGroup.js";
import SubGroup from "../models/subGroup.js";
import OragnizationModel from "../models/OragnizationModel.js";
import Organization from "../models/OragnizationModel.js";
import { getFinancialYearDates } from "../helpers/helper.js";
import { Brand } from "../models/subDetails.js";
import { Category } from "../models/subDetails.js";
import { Subcategory } from "../models/subDetails.js";
import { Godown } from "../models/subDetails.js";
import { PriceLevel } from "../models/subDetails.js";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import salesModel from "../models/salesModel.js";
import vanSaleModel from "../models/vanSaleModel.js";
import purchaseModel from "../models/purchaseModel.js";
import {
  // deleteItemsInSaleEdit,
  // deleteGodownsOrBatchesInSaleEdit,
  // addingAnItemInSale,
  // addingNewBatchesOrGodownsInSale,
  // updateAdditionalChargeInSale,
  // extractCentralNumber,
  updateSaleableStock,
  calculateUpdatedItemValues,
  deleteItemsInSaleOrderEdit,
  addingAnItemInSaleOrderEdit,
  checkForNumberExistence,
  getNewSerialNumber,
  revertBalanceStockOfSalesOrder,
  revertStockUpdatesSales,
} from "../helpers/secondaryHelper.js";

import {
  processStockTransfer,
  handleStockTransfer,
  revertStockTransfer,
  increaseStockTransferNumber,
} from "../helpers/stockTranferHelper.js";

import {
  handleSaleStockUpdates,
  createSaleRecord,
  processSaleItems,
  updateSalesNumber,
  updateTallyData,
  revertSaleStockUpdates,
} from "../helpers/salesHelper.js";
import stockTransferModel from "../models/stockTransferModel.js";
import creditNoteModel from "../models/creditNoteModel.js";
import payment from "../../frontend/slices/payment.js";
import bankModel from "../models/bankModel.js";
import cashModel from "../models/cashModel.js";
import receiptModel from "../models/receiptModel.js";
import paymentModel from "../models/paymentModel.js";
import PrimaryUser from "../models/primaryUserModel.js";
import { getSubscriptionStatus } from "../utils/subscription.js";
import partyModel from "../models/partyModel.js";

// @desc Login secondary user
// route POST/api/sUsers/login

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let secUser;
    // Check if the provided email looks like an email address
    if (email.includes("@")) {
      // If it's an email address, find the user by email
      secUser = await SecondaryUser.findOne({ email: email });
    } else {
      // If it's not an email address, assume it's a mobile number and find the user by mobile number
      secUser = await SecondaryUser.findOne({ mobile: email });
    }

    if (!secUser) {
      return res.status(404).json({ message: "Invalid User" });
    }
    const Blocked = secUser.get("isBlocked");
    if (Blocked == true) {
      return res.status(401).json({ message: "User is blocked" });
    }

    if (secUser.isApproved === false) {
      return res.status(401).json({ message: "User approval is pending" });
    }

    if (secUser.isBlocked) {
      return res.status(401).json({ message: "User is blocked" });
    }
    const primaryUser = await PrimaryUser.findById(secUser.primaryUser);
    if (!primaryUser) {
      return res.status(401).json({ message: "Primary account not found" });
    }
    const subscriptionStatus = getSubscriptionStatus(primaryUser);
    if (subscriptionStatus.isExpired) {
      return res.status(403).json({
        code: "SUBSCRIPTION_EXPIRED",
        message: "The primary user's subscription has expired. Please renew to continue.",
        subscription: subscriptionStatus,
      });
    }
    // console.log("secUser", secUser);
    const isPasswordMatch = await bcrypt.compare(password, secUser.password);

    // console.log("isPasswordMatch", isPasswordMatch);

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const { name, _id, mobile } = secUser._doc;

    const token = generateSecToken(res, secUser._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      data: { email, name, _id, mobile, role: secUser.role || "user", userType: secUser.userType || secUser.role || "user",
        permissions: secUser.permissions || {},
        primaryUser: secUser.primaryUser || null,
        organization: secUser.organization || [], subscription: subscriptionStatus },
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Failed to login!" });
  }
};

// @desc get secuser user data for sidebar
// route GET/api/sUsers/getSecUserData

export const getSecUserData = async (req, res) => {
  const userId = req.sUserId;
  try {
    // Populate organization fully
    const userData = await SecondaryUser.findById(userId)
      .populate({
        path: "organization", // Assuming this is an array, otherwise remove [.0]
      })
      .lean(); // Use .lean() for easier manipulation

    if (!userData) {
      return res
        .status(404)
        .json({ message: "secondaryUSerData not found", data: { userData } });
    }

    // If 'organization' is an array 
    if (Array.isArray(userData.organization)) {
      userData.organization = userData.organization.map(
        (org, idx) =>
          idx === 0
            ? org // keep full data for first since it is selected as default company selected when user logged in ,so full details must be stored in local storage
            : { _id: org._id, name: org.name } // keep only _id and name for the rest
      );
    } 

    return res
      .status(200)
      .json({ message: "secondaryUSerData fetched", data: { userData } });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "internal server error" });
  }
};

// @desc confirm collection and alter db
// route GET/api/sUsers/confirmCollection

export const confirmCollection = async (req, res) => {
  const {
    collectionDetails,
    PaymentMethod,
    paymentDetails,
    agentName,
    agentId,
  } = req.body;
  const paymentMethod = PaymentMethod;

  const {
    party_id,
    party_name,
    totalBillAmount,
    cmp_id,
    billData,
    enteredAmount,
  } = collectionDetails;

  // console.log("collectionDetails.billData", collectionDetails.billData);

  try {
    // Create a lookup map for billNo to remainingAmount
    const billAmountMap = new Map(
      billData.map((bill) => [bill.billNo, bill.remainingAmount])
    );

    const outstandingData = await TallyData.find({
      cmp_id: collectionDetails.cmp_id,
      bill_no: { $in: Array.from(billAmountMap.keys()) },
    });

    if (outstandingData.length > 0) {
      const bulkUpdateOperations = outstandingData.map((doc) => ({
        updateOne: {
          filter: {
            _id: doc._id,
          },
          update: {
            $set: {
              bill_pending_amt: billAmountMap.get(doc.bill_no), // Use the map to get the remainingAmount
            },
          },
        },
      }));

      await TallyData.bulkWrite(bulkUpdateOperations);

      const transaction = new TransactionModel({
        party_id,
        party_name,
        totalBillAmount,
        cmp_id,
        billData,
        paymentMethod,
        enteredAmount,
        paymentDetails,
        agentName,
        agentId,
      });

      const savedTransaction = await transaction.save();

      res.status(200).json({
        message: "Your Collection is confirmed",
        id: savedTransaction._id,
      });
    } else {
      console.log("No matching documents found for the given criteria");
    }
  } catch (error) {
    console.error("Error updating documents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc logout
// route GET/api/sUsers/logout

export const logout = async (req, res) => {
  try {
    // Clear the JWT cookie
    res.cookie("jwt_secondary", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    // Send a response indicating successful logout
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    // Handle errors
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc get transactions
// route GET/api/sUsers/transactions

// export const transactions = async (req, res) => {
//   const userId = req.sUserId;
//   const cmp_id = req.params.cmp_id;
//   const { todayOnly } = req.query;

//   try {
//     const dateFilter = todayOnly === 'true' ? {
//       createdAt: {
//         $gte: startOfDay(new Date()),
//         $lte: endOfDay(new Date())
//       }
//     } : {};

//     const matchCriteria = {
//       ...dateFilter,
//       cmp_id: cmp_id,
//       $or: [
//         { agentId: userId },
//         { Secondary_user_id: userId }
//       ]
//     };

//     const transactionPromises = [
//       aggregateTransactions(TransactionModel, { ...matchCriteria, agentId: userId }, 'Receipt'),
//       aggregateTransactions(invoiceModel, matchCriteria, 'Sale Order'),
//       aggregateTransactions(salesModel, matchCriteria, 'Tax Invoice'),
//       aggregateTransactions(vanSaleModel, matchCriteria, 'Van Sale'),
//       aggregateTransactions(purchaseModel, matchCriteria, 'Purchase'),
//       aggregateTransactions(stockTransferModel, matchCriteria, 'Credit'),
//       aggregateTransactions(creditNoteModel, matchCriteria, 'Credit Note'),
//     ];

//     const results = await Promise.all(transactionPromises);

//     const combined = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

//     if (combined.length > 0) {
//       return res.status(200).json({
//         message: `Transactions fetched${todayOnly === 'true' ? ' for today' : ''}`,
//         data: { combined },
//       });
//     } else {
//       return res.status(404).json({ message: "Transactions not found" });
//     }
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       status: false,
//       message: "Internal server error",
//     });
//   }
// };

// @desc for cancelling transactions
// route GET/api/sUsers/cancelTransaction

export const cancelTransaction = async (req, res) => {
  try {
    const transactionId = new mongoose.Types.ObjectId(req.params.id);

    const transactions = await TransactionModel.aggregate([
      { $match: { _id: transactionId } },
      { $unwind: "$billData" },
      {
        $project: {
          _id: 0,
          billNo: "$billData.billNo",
          currentAmount: {
            $sum: ["$billData.settledAmount", "$billData.remainingAmount"],
          },
        },
      },
    ]);

    for (const { billNo, currentAmount } of transactions) {
      await TallyData.updateOne(
        { bill_no: billNo },
        { $set: { bill_pending_amt: currentAmount } }
      );
    }

    await TransactionModel.updateOne(
      { _id: transactionId },
      { $set: { isCancelled: true } }
    );

    res
      .status(200)
      .json({ success: true, message: "Transaction canceled successfully" });
  } catch (error) {
    console.error("Error canceling transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc fetch banks for payment page
// route GET/api/sUsers/fetchBanks/:cmp_id

export const fetchBanks = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const bankData = await partyModel.aggregate([
      { $match: { cmp_id: new mongoose.Types.ObjectId(cmp_id), partyType: "bank"} },
      {
        $project: {
          bank_name: 1,
          partyName: 1,
          ifsc: 1,
          upi_id: 1,
          ac_no: 1,
          branch: 1,
          _id: 1,
        },
      },
    ]);

    if (bankData.length > 0) {
      return res
        .status(200)
        .json({ message: "bankData fetched", data: bankData });
    } else {
      return res.status(404).json({ message: "Bank data not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// @desc send otp for forgot password
// route GET/api/sUsers/fetchBanks/:cmp_id

export const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const validEmail = await SecondaryUser.findOne({ email: email });
    if (!validEmail) {
      return res.status(400).json({ message: "Enter the registered email " });
    }

    const otp = generateNumericOTP(6);

    // Save OTP in the database
    const saveOtp = await SecondaryUser.updateOne({ email }, { $set: { otp } });

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "solutions@camet.in",
        pass: "gerjssfiitsgidaq",
      },
    });

    // Email message for password reset
    const mailOptions = {
      from: "solutions@camet.in",
      to: email,
      subject: "Password Reset OTP - Camet IT Solutions",
      text: `Dear User,\n\nYou have requested to reset your password for Camet IT Solutions account.\n\nYour OTP for password reset is: ${otp}\n\nIf you didn't request this, please ignore this email.\n\nThank you,\nCamet IT Solutions`,
    };

    // Send the email
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.status(500).json({ error: "Error sending email" });
      } else {
        return res
          .status(200)
          .json({ message: "OTP sent successfully", data: otp });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

// @desc check otp
//  route POST/api/sUsers/submitOtp

export const submitOtp = async (req, res) => {
  const { Otp, otpEmailSec } = req.body;

  try {
    // Retrieve user data based on the provided email
    const user = await SecondaryUser.findOne({ email: otpEmailSec });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user has an OTP and if it matches the submitted OTP
    if (user.otp !== parseInt(Otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // // Check if the OTP has expired
    // if (user.otpExpiration && user.otpExpiration < Date.now()) {
    //   return res.status(400).json({ message: 'OTP has expired' });
    // }

    // If all checks pass, you can consider the OTP valid
    return res.status(200).json({ message: "OTP is valid" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// @desc reset password
// route POST/api/sUsers/resetPassword

export const resetPassword = async (req, res) => {
  const { password, otpEmailSec } = req.body;

  try {
    // Retrieve user data based on the provided email
    const user = await SecondaryUser.findOne({ email: otpEmailSec });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's password
    user.password = password;

    // Save the updated user data
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// @desc to get the details of transaction or receipt
// route GET/api/sUsers/getTransactionDetails

export const getTransactionDetails = async (req, res) => {
  const receiptId = req.params.id;

  try {
    const receiptDetails = await TransactionModel.findById(receiptId);

    if (receiptDetails) {
      res
        .status(200)
        .json({ message: "reception details fetched", data: receiptDetails });
    } else {
      res.status(404).json({ error: "Receipt not found" });
    }
  } catch (error) {
    console.error("Error fetching receipt details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc get invoiceList
// route get/api/pUsers/invoiceList;

export const invoiceList = async (req, res) => {
  const userId = req.sUserId;
  const cmp_id = req.params.cmp_id;

  try {
    const invoiceList = await invoiceModel.find({
      Secondary_user_id: userId,
      cmp_id: cmp_id,
    });

    if (invoiceList) {
      res
        .status(200)
        .json({ message: "invoiceList fetched", invoiceList: invoiceList });
    } else {
      res.status(404).json({ message: "No parties found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc get organization detail foe edit
// route GET/api/pUsers/getOrganizations

export const getSingleOrganization = async (req, res) => {
  const OrgId = new mongoose.Types.ObjectId(req.params.id);

  try {
    const organization = await Organization.findById(OrgId).populate({
      path: "configurations.bank",
    });

    if (organization) {
      return res.status(200).json({
        organizationData: organization,
        message: "Organization fetched",
      });
    } else {
      return res.status(404).json({ message: "No organization found " });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc fetch hsn of the companies
// route get/api/pUsers/fetchHsn

export const fetchHsn = async (req, res) => {
  const cmp_id = req.params.cmp_id;

  try {
    const hsn = await HsnModel.find({
      cpm_id: cmp_id,
    });

    if (hsn) {
      return res.status(200).json({ message: "hsn fetched", data: hsn });
    } else {
      return res.status(404).json({ message: "hsn data not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// @desc adding new brands /categories /subcategories
// route POst/api/pUsers/addDataToOrg
export const addDataToOrg = async (req, res) => {
  try {
    const orgId = req.params.cmp_id;

    const org = await OragnizationModel.findById(orgId);

    if (org) {
      const fieldToUpdate = Object.keys(req.body)[0];
      const newData = req.body[fieldToUpdate];
      if (org[fieldToUpdate].includes(newData)) {
        return res.status(400).json({
          success: false,
          message: `${newData} already exists in ${fieldToUpdate}`,
        });
      }
      org[fieldToUpdate].push(newData);
      await org.save();
      return res.status(200).json({
        success: true,
        message: "Data added successfully",
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc edit brands /categories /subcategories
// route POst/api/pUsers/editDataInOrg
export const editDataInOrg = async (req, res) => {
  try {
    const orgId = req.params.cmp_id;
    const fieldToUpdate = Object.keys(req.body)[0];
    const newData = req.body[fieldToUpdate];
    const index = parseInt(req.body.index);

    const org = await OragnizationModel.findById(orgId);
    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    org[fieldToUpdate][index] = newData;
    await org.save();

    return res
      .status(200)
      .json({ success: true, message: "Data updated successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc delete brands /categories /subcategories
// route POst/api/pUsers/deleteDataInOrg
export const deleteDataInOrg = async (req, res) => {
  try {
    const orgId = req.params.cmp_id;

    const fieldToDelete = Object.keys(req.body)[0];
    const indexToDelete = req.body[fieldToDelete];

    const org = await OragnizationModel.findById(orgId);

    if (!org) {
      return res
        .status(404)
        .json({ success: false, message: "Organization not found" });
    }

    const neededField = org[fieldToDelete];

    neededField.splice(indexToDelete, 1);
    await org.save(); // Save the organization after deletion
    return res
      .status(200)
      .json({ success: true, message: "Data deleted successfully" });

    // return res.status(200).json({ success: true, message: "Data deleted successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc   saveOrderNumber
// route post/api/pUsers/saveOrderNumber/cmp_id

export const saveOrderNumber = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const company = await OragnizationModel.findById(cmp_id);
    company.OrderNumberDetails = req.body;

    const save = await company.save();
    return res.status(200).json({
      success: true,
      message: "Order number saved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// @desc toget the details of transaction or receipt
// route get/api/sUsers/getTransactionDetails

export const fetchFilters = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const getFilters = async (model, field) => {
      const filters = await model.find({ cmp_id: cmp_id });
      return filters.map((item) => ({
        _id: item._id,
        name: item[field],
      }));
    };

    const brands = await getFilters(Brand, "brand");
    const categories = await getFilters(Category, "category");
    const subcategories = await getFilters(Subcategory, "subcategory");
    const priceLevels = await getFilters(PriceLevel, "pricelevel");

    const secondaryUser = await SecondaryUser.findById(req.sUserId);
    const configuredPriceLevels = secondaryUser.configurations.find(
      (config) => config?.organization?.toString() === cmp_id
    )?.selectedPriceLevels;

    //// if configuredPriceLevels is empty, then return all price levels
    let filteredPriceLevels = priceLevels || [];
    if (configuredPriceLevels && configuredPriceLevels?.length > 0) {
      filteredPriceLevels = priceLevels?.filter((priceLevel) =>
        configuredPriceLevels?.includes(
          new mongoose.Types.ObjectId(priceLevel?._id)
        )
      );
    }

    // Sort price levels alphabetically (case-insensitive)
    const sortedPriceLevels = [...filteredPriceLevels]?.sort((a, b) =>
      a?.name?.toLowerCase()?.localeCompare(b?.name?.toLowerCase())
    );

    const data = {
      brands,
      categories,
      subcategories,
      priceLevels: sortedPriceLevels,
    };

    if (Object.entries(data).length > 0) {
      return res.status(200).json({ message: "Filters fetched", data });
    } else {
      return res.status(404).json({ message: "Filters not found" });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// @desc update AdditionalCharge
// route get/api/sUsers/addconfigurations

export const addconfigurations = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const org = await OragnizationModel.findById(cmp_id);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const {
      selectedBank,
      termsList,
      enableBillToShipTo,
      despatchDetails,
      taxInclusive,
    } = req.body;

    // Check if selectedBank is provided
    let bankId = null; // Default to null if not provided
    if (selectedBank) {
      // Validate selectedBank as an ObjectId if needed
      if (mongoose.Types.ObjectId.isValid(selectedBank)) {
        bankId = selectedBank;
      }
    }

    const newConfigurations = {
      bank: bankId, // Use the validated bankId or null
      terms: termsList,
      enableBillToShipTo,
      despatchDetails,
      taxInclusive,
    };

    org.configurations = [newConfigurations];

    await org.save();
    return res.status(200).json({
      success: true,
      message: "Terms and conditions added successfully",
      data: org,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
      error: error.message, // Include error message for debugging
    });
  }
};

// @desc   saveSalesNumber
// route post/api/sUsers/saveSalesNumber/cmp_id

export const saveSalesNumber = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const company = await OragnizationModel.findById(cmp_id);
    company.salesNumberDetails = req.body;

    const save = await company.save();
    return res.status(200).json({
      success: true,
      message: "Order number saved successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

// @desc  fetchAdditionalDetails
// route get/api/sUsers/fetchAdditionalDetails

export const fetchAdditionalDetails = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const Primary_user_id = req.owner;
  const secondary_user_id = req.sUserId;

  try {
    const secUser = await SecondaryUser.findById(secondary_user_id);

    let selectedPriceLevels;

    const configuration = secUser.configurations.find(
      (item) => item.organization.toString() === cmp_id
    );

    if (configuration) {
      selectedPriceLevels = configuration.selectedPriceLevels;
    }

    let priceLevelsResult = [];

    if (!selectedPriceLevels || selectedPriceLevels.length === 0) {
      priceLevelsResult = await productModel.aggregate([
        {
          $match: {
            Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
            cmp_id: cmp_id,
          },
        },
        { $unwind: "$Priceleveles" },
        {
          $match: {
            "Priceleveles.pricelevel": { $ne: null },
            "Priceleveles.pricelevel": { $ne: "" },
          },
        },
        {
          $group: {
            _id: null,
            pricelevels: { $addToSet: "$Priceleveles.pricelevel" },
          },
        },
        { $project: { _id: 0, pricelevels: 1 } },
      ]);
    }

    const brandResults = await productModel.aggregate([
      {
        $match: {
          Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
          cmp_id: cmp_id,
        },
      },
      { $group: { _id: null, brands: { $addToSet: "$brand" } } },
      { $project: { _id: 0, brands: 1 } },
    ]);

    const categoryResults = await productModel.aggregate([
      {
        $match: {
          Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
          cmp_id: cmp_id,
        },
      },
      { $group: { _id: null, categories: { $addToSet: "$category" } } },
      { $project: { _id: 0, categories: 1 } },
    ]);

    const subCategoryResults = await productModel.aggregate([
      {
        $match: {
          Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
          cmp_id: cmp_id,
        },
      },
      { $group: { _id: null, subcategories: { $addToSet: "$sub_category" } } },
      { $project: { _id: 0, subcategories: 1 } },
    ]);

    // Determine which price levels to use
    let priceLevels = [];
    if (selectedPriceLevels && selectedPriceLevels.length > 0) {
      priceLevels = [...selectedPriceLevels];
    } else if (priceLevelsResult.length > 0) {
      priceLevels = [...priceLevelsResult[0].pricelevels];
    }

    // Sort price levels alphabetically (case-insensitive)
    const sortedPriceLevels = priceLevels.sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // Send the aggregated results back to the client
    res.json({
      message: "additional details fetched",
      priceLevels: sortedPriceLevels,
      brands: brandResults[0]?.brands || [],
      categories: categoryResults[0]?.categories || [],
      subcategories: subCategoryResults[0]?.subcategories || [],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc  fetchConfigurationNumber
// route get/api/sUsers/fetchConfigurationNumber

export const fetchConfigurationNumber = async (req, res) => {
  const { cmp_id, title } = req.params;

  const secUserId = req.sUserId;

  try {
    const [secUser, company] = await Promise.all([
      SecondaryUser.findById(secUserId),
      OragnizationModel.findById(cmp_id),
    ]);

    if (!secUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const configuration = secUser.configurations.find(
      (item) => item.organization.toString() === cmp_id
    );

    // console.log("configuration", configuration);

    const getConfigDetails = () => {
      if (!configuration) return null;

      const configs = {
        sales: configuration.salesConfiguration,
        saleOrder: configuration.salesOrderConfiguration,
        purchase: configuration.purchaseConfiguration,
        receipt: configuration.receiptConfiguration,
        payment: configuration.paymentConfiguration,
        vanSale: configuration.vanSaleConfiguration,
        stockTransfer: configuration.stockTransferConfiguration,
        creditNote: configuration.creditNoteConfiguration,
        debitNote: configuration.debitNoteConfiguration,
      };

      return configs[title] || null;
    };

    const getConfigNumber = () => {
      if (configuration) {
        const numbers = {
          sales: configuration.salesNumber,
          saleOrder: configuration.orderNumber,
          purchase: configuration.purchaseNumber,
          vanSale: configuration.vanSalesNumber,
          stockTransfer: configuration.stockTransferNumber,
          receipt: configuration.receiptNumber,
          payment: configuration.paymentNumber,
          creditNote: configuration.creditNoteNumber,
          debitNote: configuration.debitNoteNumber,
        };
        return numbers[title] || null;
      } else {
        const companyNumbers = {
          sales: company.salesNumber,
          saleOrder: company.orderNumber,
          purchase: company.purchaseNumber,
          vanSale: company.vanSalesNumber,
          stockTransfer: company.stockTransferNumber,
          receipt: company.receiptNumber,
          payment: company.paymentNumber,
          creditNote: company.creditNoteNumber,
          debitNote: company.debitNoteNumber,
        };

        return companyNumbers[title] || null;
      }

      // console.log("companyNumbers", companyNumbers);
    };

    let configDetails = getConfigDetails();
    let configurationNumber = getConfigNumber();

    // If configDetails is empty or all values except startingNumber are empty, use company defaults
    if (
      !configDetails ||
      Object.entries(configDetails)
        .filter(([key]) => key !== "startingNumber")
        .every(([_, value]) => value === "")
    ) {
      configDetails = "";
      configurationNumber = getConfigNumber(); // Ensure we're using the company default
    }

    if (configDetails) {
      res.json({
        message: "Configuration details fetched",
        configDetails,
        configurationNumber,
      });
    } else {
      res.json({ message: "default", configurationNumber });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const findSecondaryUserGodowns = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const secondary_user_id = req.sUserId;
  const primaryUser = req.owner;

  try {
    const godownsResult = await productModel.aggregate([
      {
        $match: {
          Primary_user_id: new mongoose.Types.ObjectId(primaryUser),
          cmp_id: cmp_id,
        },
      },
      { $unwind: "$GodownList" },
      {
        $match: {
          "GodownList.godown_id": { $ne: null },
          "GodownList.godown_id": { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$GodownList.godown_id",
          godown: { $addToSet: "$GodownList.godown" }, // Collect unique cmp_id values for each godown
        },
      },
      { $match: { _id: { $ne: null } } },
    ]);
    const secondaryUserGodown = await SecondaryUser.findOne(
      {
        _id: secondary_user_id, // User ID
        "configurations.organization": cmp_id, // Organization ID
      },
      { "configurations.$": 1 } // Projection to get only the matched organization's configuration
    ).exec();
    const secondaryUserGodownsId =
      secondaryUserGodown.configurations[0].selectedGodowns;
    if (secondaryUserGodownsId && secondaryUserGodownsId.length > 0) {
      const result = godownsResult.filter((item) =>
        secondaryUserGodownsId.includes(item._id)
      );
      if (result) {
        res.json({
          message: "additional details fetched",
          godowndata: result,
        });
      }
    } else {
      if (godownsResult) {
        res.json({
          message: "additional details fetched",
          godowndata: godownsResult,
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const findPrimaryUserGodownsSelf = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const sUser = req.sUserId;
  const pUserid = await SecondaryUser.find(
    { _id: sUser },
    { primaryUser: 1, _id: 0 }
  );
  const pUser = pUserid[0].primaryUser;

  try {
    const godowns = await Organization.find({ _id: cmp_id, owner: pUser });
    const Allgodowns = godowns[0].locations;

    const secondaryUserGodown = await SecondaryUser.findOne(
      { _id: sUser, "configurations.organization": cmp_id },
      { "configurations.$": 1 }
    ).exec();

    const secondaryUserGodownsId =
      secondaryUserGodown.configurations[0].selectedGodowns;

    const result = Allgodowns.filter((item) =>
      secondaryUserGodownsId.includes(item._id)
    );
    if (!result && result.length > 0) {
      if (result) {
        res.json({
          message: "additional details fetched",
          godowndata: result,
        });
      }
    } else {
      if (Allgodowns) {
        res.json({
          message: "additional details fetched",
          godowndata: Allgodowns,
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const godownwiseProducts = async (req, res) => {
  try {
    const cmp_id = req.params.cmp_id;
    const godown_id = req.params.godown_id;

    const products = await productModel.aggregate([
      // Match products based on cmp_id, puser_id, and godown_id
      {
        $match: {
          cmp_id: cmp_id,
          Primary_user_id: new mongoose.Types.ObjectId(req.owner),
          "GodownList.godown_id": godown_id,
        },
      },
      // Unwind the GodownList array to denormalize the data
      { $unwind: "$GodownList" },
      // Match again to filter based on godown_id
      {
        $match: {
          "GodownList.godown_id": godown_id,
        },
      },
      // Project to include necessary fields and add balance_stock
      {
        $project: {
          _id: 1,
          product_name: 1,
          cmp_id: 1,
          balance_stock: "$GodownList.balance_stock",
          hsn_code: 1,
          igst: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.error("Error fetching godownwise products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const godownwiseProductsSelf = async (req, res) => {
  try {
    const cmp_id = req.params.cmp_id;
    const godown = req.params.godown_name;
    const products = await productModel.aggregate([
      // Match products based on cmp_id, puser_id, and godown_id
      {
        $match: {
          cmp_id: cmp_id,
          Primary_user_id: new mongoose.Types.ObjectId(req.owner),
          "GodownList.godown": godown,
        },
      },
      // Unwind the GodownList array to denormalize the data
      { $unwind: "$GodownList" },
      // Match again to filter based on godown_id
      {
        $match: {
          "GodownList.godown": godown,
        },
      },
      // Project to include necessary fields and add balance_stock
      {
        $project: {
          _id: 1,
          product_name: 1,
          cmp_id: 1,
          balance_stock: "$GodownList.balance_stock",
          hsn_code: 1,
          igst: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.error("Error fetching godownwise products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const findGodownsNames = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const selectedUser = req.sUserId;

  try {
    // Populate selectedVanSaleGodowns field from the matched configuration
    const secUser = await SecondaryUser.findById(selectedUser).populate({
      path: "configurations.selectedVanSaleGodowns",
      select: "godown", // Only fetch the godown name
    });

    if (!secUser) {
      return res
        .status(404)
        .json({ message: "Secondary user not found", data: null });
    }

    const configuration = secUser.configurations.find(
      (item) => item.organization == cmp_id
    );

    if (
      !configuration ||
      !configuration.selectedVanSaleGodowns ||
      configuration.selectedVanSaleGodowns.length === 0
    ) {
      return res.status(200).json({ message: "No godowns found", data: [] });
    }

    const firstGodown = configuration.selectedVanSaleGodowns[0];

    const data = {
      godownId: firstGodown._id,
      godownName: firstGodown.godown,
    };

    res.status(200).json({ message: "Godown details fetched", data });
  } catch (error) {
    console.error("Error in findGodownsNames:", error);
    res.status(500).json({ message: "Internal server error", data: null });
  }
};

// @desc get brands, categories, subcategories, godowns, priceLevels
// route get/api/sUsers/getAllSubDetails

export const getAllSubDetails = async (req, res) => {
  try {
    const cmp_id = req.params.orgId;
    const Primary_user_id = req.owner;
    if (!cmp_id || !Primary_user_id) {
      console.log(
        "cmp_id and Primary_user_id are required in getAllSubDetails "
      );
      return;
    }

    const [brands, categories, subcategories, godowns, priceLevels] =
      await Promise.all([
        Brand.find({ cmp_id, Primary_user_id }).select("_id brand under"),
        Category.find({ cmp_id, Primary_user_id }).select("_id category under"),
        Subcategory.find({ cmp_id, Primary_user_id }).select("_id subcategory under category_id"),
        Godown.find({ cmp_id, Primary_user_id }).select(
          "_id godown defaultGodown"
        ),
        PriceLevel.find({ cmp_id, Primary_user_id }).select("_id pricelevel"),
      ]);

    const result = {
      brands: brands.map((b) => ({ _id: b._id, name: b.brand })),
      categories: categories.map((c) => ({ _id: c._id, name: c.category ,under:c.under })),
      subcategories: subcategories.map((s) => ({
        _id: s._id,
        name: s.subcategory,
        under: s.under,
        category_id: s.category_id,
      })),
      godowns: godowns.map((g) => ({
        _id: g._id,
        name: g.godown,
        defaultGodown: g.defaultGodown,
      })),
      priceLevels: priceLevels.map((p) => ({ _id: p._id, name: p.pricelevel })),
    };

    res.status(200).json({
      message: "All subdetails retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAllSubDetails:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the subdetails" });
  }
};


//function used ot fetch data for hotel and restrurent
export const getAllSubDetailsBasedUnder = async (req, res) => {
  try {
    console.log(req.params)
    console.log(req.query)
    const cmp_id = req.params.orgId;
    const under =req.query.under
    const Primary_user_id = req.owner;
    if (!cmp_id || !Primary_user_id) {
      console.log(
        "cmp_id and Primary_user_id are required in getAllSubDetails "
      );
      return;
    }

    const [brands, categories, subcategories, godowns, priceLevels] =
      await Promise.all([
        Brand.find({ cmp_id, Primary_user_id }).select("_id brand"),
        Category.find({ cmp_id, Primary_user_id,under:under }).select("_id category"),
        Subcategory.find({ cmp_id, Primary_user_id ,under:under }).select("_id subcategory category_id"),
        Godown.find({ cmp_id, Primary_user_id,under:under }).select(
          "_id godown defaultGodown"
        ),
        PriceLevel.find({ cmp_id, Primary_user_id }).select("_id pricelevel"),
      ]);

    const result = {
      brands: brands.map((b) => ({ _id: b._id, name: b.brand })),
      categories: categories.map((c) => ({ _id: c._id, name: c.category })),
      subcategories: subcategories.map((s) => ({
        _id: s._id,
        name: s.subcategory,
         category:s.category_id,
      })),
      godowns: godowns.map((g) => ({
        _id: g._id,
        name: g.godown,
        defaultGodown: g.defaultGodown,
      })),
      priceLevels: priceLevels.map((p) => ({ _id: p._id, name: p.pricelevel })),
    };

    res.status(200).json({
      message: "All subdetails retrieved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getAllSubDetails:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the subdetails" });
  }
};
// @desc to fetch godowns
// route get/api/sUsers/fetchGodowns

export const fetchGodowns = async (req, res) => {
  const Primary_user_id = req.owner;
  const cmp_id = req.params.cmp_id;

  try {
    const godownsResult = await productModel.aggregate([
      {
        $match: {
          Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
          cmp_id: cmp_id,
        },
      },
      { $unwind: "$GodownList" },
      {
        $match: {
          "GodownList.godown_id": { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$GodownList.godown_id",
          godown: { $addToSet: "$GodownList.godown" }, // Collect unique cmp_id values for each godown
        },
      },
      { $match: { _id: { $ne: null } } },
    ]);

    const result = godownsResult.map((item) => ({
      id: item._id || "",
      godown: item.godown[0] || "",
    }));

    res.status(200).json({
      message: "Godowns  fetched",
      data: {
        godowns: result,
      },
    });
  } catch (error) {
    console.error("Error fetching godowns and pricelevel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc to create stock transfer
// route post/api/sUsers/createStockTransfer;

export const createStockTransfer = async (req, res) => {
  try {
    const {
      selectedDate,
      orgId,
      selectedGodown,
      selectedGodownId,
      items,
      lastAmount,
      stockTransferNumber,
    } = req.body;

    const transferData = {
      stockTransferNumber,
      selectedDate,
      orgId,
      selectedGodown,
      selectedGodownId,
      items,
      lastAmount,
      req,
    };

    const id = req.sUserId;
    const secondaryUser = await SecondaryUser.findById(id);

    if (!secondaryUser) {
      return res.status(404).json({
        error: "Secondary user not found",
      });
    }

    const NumberExistence = await checkForNumberExistence(
      stockTransferModel,
      "stockTransferNumber",
      stockTransferNumber,
      orgId
    );

    if (NumberExistence) {
      return res.status(400).json({
        message: "Stock Transfer with the same number already exists",
      });
    }

    const addSerialNumber = await getNewSerialNumber(
      stockTransferModel,
      "serialNumber"
    );
    if (addSerialNumber) {
      transferData.serialNumber = addSerialNumber;
    }

    const updatedProducts = await processStockTransfer(transferData);
    const createNewStockTransfer = await handleStockTransfer(transferData);
    const increaseSTNumber = await increaseStockTransferNumber(
      secondaryUser,
      orgId
    );

    res.status(200).json({
      message: "Stock transfer completed successfully",
      data: createNewStockTransfer,
    });
  } catch (error) {
    console.error("Error in stock transfer:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

// @desc to edit stock transfer
// route post/api/sUsers/editStockTransfer;

// export const editStockTransfer = async (req, res) => {
//   try {
//     const transferId = req.params.id;
//     const {
//       // ID of the stock transfer to be edited
//       selectedDate,
//       orgId,
//       selectedGodown,
//       selectedGodownId,
//       items,
//       lastAmount,
//     } = req.body;

//     // Find the existing stock transfer document by ID
//     const existingTransfer = await stockTransferModel.findById(transferId);
//     if (!existingTransfer) {
//       return res.status(404).json({
//         error: "Stock transfer not found",
//       });
//     }

//     // Revert the stock levels affected by the existing transfer
//     await revertStockTransfer(existingTransfer);
//     // Process the stock transfer with the new data
//     const transferData = {
//       selectedDate,
//       orgId,
//       selectedGodown,
//       selectedGodownId,
//       items,
//       lastAmount,
//       req,
//     };

//     const updatedProducts = await processStockTransfer(transferData);

//     // Update the existing stock transfer document with new data
//     existingTransfer.selectedDate = selectedDate;
//     existingTransfer.orgId = orgId;
//     existingTransfer.selectedGodown = selectedGodown;
//     existingTransfer.selectedGodownId = selectedGodownId;
//     existingTransfer.items = items;
//     existingTransfer.lastAmount = lastAmount;
//     existingTransfer.updatedAt = new Date();

//     await stockTransferModel.findByIdAndUpdate(
//       existingTransfer._id,
//       existingTransfer
//     );

//     res.status(200).json({
//       message: "Stock transfer updated successfully",
//       data: existingTransfer,
//       updatedProducts,
//     });
//   } catch (error) {
//     console.error("Error in editing stock transfer:", error);
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: error.message,
//     });
//   }
// };

// @desc to cancel stock tranfer
// route post/api/sUsers/cancelstockTransfer;

export const cancelStockTransfer = async (req, res) => {
  const transferId = req.params.id;

  try {
    // Find the existing stock transfer document by ID
    const existingTransfer = await stockTransferModel.findById(transferId);
    if (!existingTransfer) {
      return res.status(404).json({
        error: "Stock transfer not found",
      });
    }

    const result = await revertStockTransfer(existingTransfer);
    existingTransfer.isCancelled = true;
    const updateTransfer = await stockTransferModel.findByIdAndUpdate(
      existingTransfer._id,
      existingTransfer,
      { new: true }
    );

    res.status(200).json({
      message: "Stock transfer cancelled successfully",
      data: existingTransfer,
      updatedProducts: result,
    });
  } catch (error) {
    console.error("Error in canceling stock transfer:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

/**
 * @desc   To get bank and cash details
 * @route  Get /api/sUsers/getBankAndCashSources/:cmp_id
 * @access Public
 */

export const getBankAndCashSources = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const source = req.params.source || null;
  console.log("sorceeeee",source)
  
  try {
    let banks = [];
    let cashs = [];

    // Common query conditions
    const baseQuery = {
      cmp_id,
      Primary_user_id: req.owner,
      partyName: { $nin: [null, "null", ""] },
    };

    const selectFields = {
      partyName: 1,
      under: 1
    };

    if (source === 'bank') {
      // Fetch only banks
      banks = await partyModel.find({
        ...baseQuery,
        partyType: 'bank',
      }).select(selectFields);
    } else if (source === 'cash') {
      // Fetch only cash
      cashs = await partyModel.find({
        ...baseQuery,
        partyType: 'cash',
      }).select(selectFields);
    } else {
      // Fetch both if no specific source is provided
      [banks, cashs] = await Promise.all([
        // Get Bank accounts
        partyModel.find({
          ...baseQuery,
          partyType: 'bank',
        }).select(selectFields),

        // Get Cash accounts
        partyModel.find({
          ...baseQuery,
          partyType: 'cash',
        }).select(selectFields)
      ]);
    }

    // Transform data to match expected format
    const transformedBanks = banks.map(bank => ({
      _id: bank._id,
      bank_ledname: bank.partyName,
      under: bank.under
    }));

    const transformedCashs = cashs.map(cash => ({
      _id: cash._id,
      cash_ledname: cash.partyName,
      under: cash.under
    }));

    // Return fetched data with a consistent structure
    res.status(200).json({
      message: source ? `${source.charAt(0).toUpperCase() + source.slice(1)} accounts fetched` : "Bank and Cash fetched",
      data: { 
        banks: transformedBanks, 
        cashs: transformedCashs 
      },
    });
  } catch (error) {
    console.log("Error in getting bank and cash sources:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

/**
 * @desc   To get dashboard summary
 * @route  Get /api/sUsers/getDashboardSummary/:cmp_id
 * @access Public
 */

export const getDashboardSummary = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const { startDate, endDate } = getFinancialYearDates();

  try {
    // Get total sales
    const salesTotal = await salesModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $toDouble: "$finalAmount" },
          },
        },
      },
    ]);

    // Get total purchases
    const purchaseTotal = await purchaseModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $toDouble: "$finalAmount" },
          },
        },
      },
    ]);

    // Get total sale orders
    const saleOrderTotal = await invoiceModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $toDouble: "$finalAmount" },
          },
        },
      },
    ]);

    // Get total receipts
    const receiptTotal = await receiptModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$enteredAmount",
          },
        },
      },
    ]);

    // Get total payments
    const paymentTotal = await paymentModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$enteredAmount",
          },
        },
      },
    ]);

    // Get total cash transactions
    const cashTotal = await cashModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          "settlements.created_at": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      { $unwind: "$settlements" },
      {
        $match: {
          "settlements.created_at": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$settlements.amount",
          },
        },
      },
    ]);

    // Get total bank transactions
    const bankTotal = await bankModel.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          "settlements.created_at": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      { $unwind: "$settlements" },
      {
        $match: {
          "settlements.created_at": {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$settlements.amount",
          },
        },
      },
    ]);

    // Outstanding payables
    const outstandingPayables = await TallyData.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          classification: "Cr",
          bill_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$bill_pending_amt",
          },
        },
      },
    ]);

    // Outstanding receivables
    const outstandingReceivables = await TallyData.aggregate([
      {
        $match: {
          cmp_id: cmp_id,
          classification: "Dr",
          bill_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$bill_pending_amt",
          },
        },
      },
    ]);

    // Prepare response with safe handling of empty results
    const summary = {
      sales: salesTotal[0]?.total || 0,
      purchases: purchaseTotal[0]?.total || 0,
      saleOrders: saleOrderTotal[0]?.total || 0,
      receipts: receiptTotal[0]?.total || 0,
      payments: paymentTotal[0]?.total || 0,
      cashOrBank: (cashTotal[0]?.total || 0) + (bankTotal[0]?.total || 0),
      outstandingPayables: outstandingPayables[0]?.total || 0,
      outstandingReceivables: outstandingReceivables[0]?.total || 0,
    };

    res.status(200).json({
      success: true,
      data: summary,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard summary",
      error: error.message,
    });
  }
};

/**
 * @desc   To get account groups
 * @route  Get /api/sUsers/getAccountGroups/:cmp_id
 * @access Public
 */

export const getAccountGroups = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const Primary_user_id = req.owner;
  console.log(cmp_id, Primary_user_id);

  try {
    const accountGroups = await AccountGroup.find({
      cmp_id: cmp_id,
      Primary_user_id: Primary_user_id,
    });
    if (accountGroups) {
      res.status(200).json({
        message: "Account Groups fetched",
        data: accountGroups,
      });
    } else {
      res.status(200).json({
        message: "Account Groups not found",
        data: [],
      });
    }
  } catch (error) {
    console.log("Error in getting account groups:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

/**
 * @desc   Add party opening balance
 * @route  POST /api/sUsers/addPartyOpening/:cmp_id
 * @access Public
 *
 */
// Function for adding new party bills
export const addPartyOpening = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const {
      party: {
        party_master_id: party_id = "",
        accountGroup = "",
        accountGroup_id = "",
        subGroup = "",
        subGroup_id = "",
        partyName = "",
        mobile_no = "",
        email = "",
      } = {},
      bills = [],
    } = req.body;

    if (!Array.isArray(bills) || bills.length === 0) {
      return res.status(400).json({
        message: "No bills provided for addition.",
      });
    }

    // Check for duplicate bill numbers within the request itself
    const billNumbers = bills.map((bill) => bill.billNo);
    const uniqueBillNumbers = new Set(billNumbers);
    if (billNumbers.length !== uniqueBillNumbers.size) {
      return res.status(400).json({
        message: "Duplicate bill numbers detected in the request.",
      });
    }

    // Check if any bill numbers already exist for this party
    const existingBills = await TallyData.find({
      cmp_id: cmp_id,
      party_id: party_id,
      bill_no: { $in: billNumbers },
    }).select("bill_no");

    if (existingBills.length > 0) {
      // Extract the actual bill numbers from the existingBills results
      const conflictingBillNumbers = existingBills.map((bill) => bill.bill_no);

      return res.status(400).json({
        message: "Some bill numbers already exist for this party.",
        conflictingBills: conflictingBillNumbers,
      });
    }
    // Prepare new bills for insertion
    const newBills = bills.map((element) => ({
      cmp_id: cmp_id,
      Primary_user_id: req.owner,
      party_id: party_id,
      billId: new mongoose.Types.ObjectId(),
      bill_no: element?.billNo || "",
      bill_amount: element?.amount || 0,
      bill_pending_amt: element?.amount || 0,
      bill_date: element?.date || new Date(),
      bill_due_date: element?.dueDate || new Date(),
      accountGroup: accountGroup,
      accountGroup_id: accountGroup_id,
      group_name: subGroup,
      group_name_id: subGroup_id,
      partyName: partyName,
      mobile_no: mobile_no,
      email: email,
      classification: element?.classification,
      party_name: partyName,
      user_id: "null",
      source: "opening",
    }));

    // Insert all new bills
    await TallyData.insertMany(newBills);

    res.status(201).json({
      message: "Party opening balance added successfully",
      data: newBills,
    });
  } catch (error) {
    console.error("Error in addPartyOpening:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Function for editing existing party bills
export const editPartyOpening = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  try {
    const {
      party: {
        party_master_id: party_id = "",
        accountGroup = "",
        accountGroup_id = "",
        subGroup = "",
        subGroup_id = "",
        partyName = "",
        mobile_no = "",
        email = "",
      } = {},
      bills = [],
    } = req.body;

    if (!Array.isArray(bills)) {
      return res.status(400).json({
        message: "Invalid bills data structure.",
      });
    }

    // If empty bills array is provided, delete all outstandings
    if (bills.length === 0) {
      await TallyData.deleteMany({
        party_id: party_id,
        cmp_id: cmp_id,
        source: "opening",
      });
      return res.status(200).json({
        message: "All opening balances for this party have been removed.",
      });
    }

    // Check for duplicate bill numbers within the request itself
    const billNumbers = bills.map((bill) => bill.billNo);
    const uniqueBillNumbers = new Set(billNumbers);
    if (billNumbers.length !== uniqueBillNumbers.size) {
      return res.status(400).json({
        message: "Duplicate bill numbers detected in the request.",
      });
    }

    // Get existing records to preserve billIds
    const existingRecords = await TallyData.find({
      cmp_id: cmp_id,
      party_id: party_id,
      source: "opening",
    });

    // Create a map of existing billIds by bill_no
    const existingBillIdMap = {};
    existingRecords.forEach((record) => {
      existingBillIdMap[record.bill_no] = record.billId;
    });

    // Prepare bulk operations
    const bulkOps = [];
    const newBills = [];

    // Process each bill
    bills.forEach((element) => {
      const billData = {
        cmp_id: cmp_id,
        Primary_user_id: req.owner,
        party_id: party_id,
        bill_no: element?.billNo || "",
        bill_amount: element?.amount || 0,
        bill_pending_amt: element?.amount || 0,
        bill_date: element?.date || new Date(),
        bill_due_date: element?.dueDate || new Date(),
        accountGroup: accountGroup,
        accountGroup_id: accountGroup_id,
        group_name: subGroup,
        group_name_id: subGroup_id,
        partyName: partyName,
        mobile_no: mobile_no,
        email: email,
        classification: element?.classification,
        party_name: partyName,
        user_id: "null",
        source: "opening",
      };

      // Preserve billId if it exists for this bill_no
      if (existingBillIdMap[element.billNo]) {
        billData.billId = existingBillIdMap[element.billNo];

        // Create update operation
        bulkOps.push({
          updateOne: {
            filter: {
              cmp_id: cmp_id,
              party_id: party_id,
              source: "opening",
              bill_no: element.billNo,
            },
            update: billData,
          },
        });
      } else {
        // For new bills within edit operation, create a new billId
        billData.billId = new mongoose.Types.ObjectId();
        newBills.push(billData);
      }
    });

    // Identify records to delete (bills removed from the request)
    const requestBillNos = bills.map((bill) => bill.billNo);
    const recordsToDelete = existingRecords.filter(
      (record) => !requestBillNos.includes(record.bill_no)
    );

    if (recordsToDelete.length > 0) {
      const deleteIds = recordsToDelete.map((record) => record._id);
      bulkOps.push({
        deleteMany: {
          filter: { _id: { $in: deleteIds } },
        },
      });
    }

    // Insert new bills if any
    if (newBills.length > 0) {
      await TallyData.insertMany(newBills);
    }

    // Execute bulk operations if any
    if (bulkOps.length > 0) {
      await TallyData.bulkWrite(bulkOps);
    }

    res.status(200).json({
      message: "Party opening balance updated successfully",
      data: [
        ...newBills,
        ...existingRecords.filter((r) => requestBillNos.includes(r.bill_no)),
      ],
    });
  } catch (error) {
    console.error("Error in editPartyOpening:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const getPartyOpening = async (req, res) => {
  const cmp_id = req?.params?.cmp_id;
  const partyId = req?.params?.partyId;

  try {
    const openingOutstandings = await TallyData.find({
      cmp_id: cmp_id,
      party_id: partyId,
      Primary_user_id: req?.owner,
      source: "opening",
    })
      .select("bill_no bill_date bill_due_date bill_amount classification")
      .lean();

    // ✅ Corrected .map() function
    const formattedOutstandings = openingOutstandings.map(
      ({ bill_no, bill_date, bill_due_date, bill_amount, classification }) => ({
        date: bill_date,
        billNo: bill_no,
        dueDate: bill_due_date,
        amount: bill_amount,
        classification: classification,
      })
    );

    res.status(200).json({
      message:
        formattedOutstandings.length > 0
          ? "Opening outstandings fetched"
          : "Opening outstandings not found",
      data: formattedOutstandings,
    });
  } catch (error) {
    console.error("Error in getPartyOpening:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc   Get dashboard counts for products and customers
// @route  GET /api/sUsers/getDashboardCounts/:cmp_id
export const fetchDashboardCounts = async (req, res) => {
  try {
    const { cmp_id } = req.params;

    if (!cmp_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const [productCount, customerCount] = await Promise.all([
      productModel.countDocuments({ cmp_id: cmp_id }),
      partyModel.countDocuments({ cmp_id: cmp_id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        productCount: productCount || 0,
        customerCount: customerCount || 0,
        cmp_id,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard counts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
