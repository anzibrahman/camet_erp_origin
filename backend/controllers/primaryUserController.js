import PrimaryUser from "../models/primaryUserModel.js";
import Organization from "../models/OragnizationModel.js";
import SecondaryUser from "../models/secondaryUserModel.js";
import generatePrimaryUserToken from "../utils/generatePrimaryToken.js";
import TallyData from "../models/TallyData.js";
import TransactionModel from "../models/TransactionModel.js";
import BankDetails from "../models/bankModel.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import primaryUserModel from "../models/primaryUserModel.js";
import generateNumericOTP from "../utils/generateOtp.js";
import OragnizationModel from "../models/OragnizationModel.js";
import PartyModel from "../models/partyModel.js";
import HsnModel from "../models/hsnModel.js";
import productModel from "../models/productModel.js";
import invoiceModel from "../models/invoiceModel.js";
import bankModel from "../models/bankModel.js";
import salesModel from "../models/salesModel.js";
import AdditionalChargesModel from "../models/additionalChargesModel.js";
import { truncateToNDecimals } from "../helpers/helper.js";
import purchaseModel from "../models/purchaseModel.js";
import { Brand } from "../models/subDetails.js";
import { Category } from "../models/subDetails.js";
import { Subcategory } from "../models/subDetails.js";
import { Godown } from "../models/subDetails.js";
import { PriceLevel } from "../models/subDetails.js";
import vanSaleModel from "../models/vanSaleModel.js";
import stockTransferModel from "../models/stockTransferModel.js";
import creditNoteModel from "../models/creditNoteModel.js";
import debitNoteModel from "../models/debitNoteModel.js";
import paymentModel from "../models/paymentModel.js";
import ReceiptModel from "../models/receiptModel.js";
import partyModel from "../models/partyModel.js";
import subGroup from "../models/subGroup.js";
import {
  calculateSubscriptionExpiry,
  getSubscriptionStatus,
  normalizeSubscription,
} from "../utils/subscription.js";

const allowedPermissionKeys = new Set([
  "hotelManagement",
  "restaurantManagement",
  "voucher",
  "reports",
  "hotelDashboard",
  "bookingList",
  "checkinList",
  "checkoutList",
  "editTariffRate",
  "swapRoom",
  "roomShift",
  "guestLedger",
  "restaurantDashboard",
  "kotPage",
  "restaurantPayment",
  "restaurantDailySales",
  "categoryWiseSales",
  "itemWiseSales",
  "kotRegister",
  "restaurantReceiptReport",
  "saleRegister",
  "hotelReports",
  "restaurantReports",
  "voucherReports",
  "dailySalesReport",
  "foDailyStatement",
  "flashReport",
  "paxReport",
  "foodPlanReport",
  "occupancyReport",
  "roomSummaryReport",
  "receiptReport",
  "travelAgentReport",
  "foBillSummary",
  "cancellationReport",
]);

const sanitizePermissions = (permissions = {}) =>
  Object.keys(permissions).reduce((acc, key) => {
    if (allowedPermissionKeys.has(key)) {
      acc[key] = permissions[key] === true;
    }
    return acc;
  }, {});

// @desc Register Primary user
// route POST/api/pUsers/register

export const registerPrimaryUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { userName, mobile, email, password, subscription } = req.body;

    // Start a transaction
    session.startTransaction();

    // Check if email or mobile already exists
    const userExists = await PrimaryUser.findOne({ email }).session(session);
    const mobileExists = await PrimaryUser.findOne({ mobile }).session(session);

    if (userExists) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    if (mobileExists) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Mobile number already exists" });
    }

    // Create Primary User
    const normalizedSubscription = normalizeSubscription(subscription);
    const subscriptionStart = new Date();
    const primaryUser = new PrimaryUser({
      userName,
      mobile,
      email,
      password,
      subscription: normalizedSubscription,
      subscriptionExpiry: calculateSubscriptionExpiry(subscriptionStart, normalizedSubscription),
    });

    const primaryUserResult = await primaryUser.save({ session });

    if (!primaryUserResult) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Primary user registration failed" });
    }

    // Create Secondary User with role "admin"
    const secondaryUser = new SecondaryUser({
      name: userName,
      email,
      mobile,
      password: password, // Reuse the hashed password
      role: "admin",
      primaryUser: primaryUserResult._id, // Link to the primary user
      organization: [], // Leave organization empty
    });

    const secondaryUserResult = await secondaryUser.save({ session });

    if (!secondaryUserResult) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "Secondary user creation failed" });
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Successful response
    return res.status(200).json({
      success: true,
      message: "User registration is successful",
    });
  } catch (error) {
    console.error(error);
    // Rollback in case of any error
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc Login Primary user
// route POST/api/pUsers/login

export const login = async (req, res) => {
  //email === email or mobile
  const { email, password } = req.body;

  try {
    let primaryUser;
    // Check if the provided email looks like an email address
    if (email.includes("@")) {
      // If it's an email address, find the user by email
      primaryUser = await PrimaryUser.findOne({ email: email });
    } else {
      // If it's not an email address, assume it's a mobile number and find the user by mobile number
      primaryUser = await PrimaryUser.findOne({ mobile: email });
    }

    if (!primaryUser) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    if (primaryUser.isApproved === false) {
      return res.status(401).json({ message: "User approval is pending" });
    }

    if (primaryUser.isBlocked) {
      return res.status(401).json({ message: "User is blocked" });
    }

    const subscriptionStatus = getSubscriptionStatus(primaryUser);
    if (subscriptionStatus.isExpired) {
      return res.status(403).json({
        code: "SUBSCRIPTION_EXPIRED",
        message: "Your subscription has expired. Please renew to continue.",
        subscription: subscriptionStatus,
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      primaryUser.password
    );

    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    let haveOut;

    const haveOutstanding = await TallyData.find({
      Primary_user_id: primaryUser._id,
    });

    haveOutstanding.length > 0 ? (haveOut = true) : (haveOut = false);

    const { userName, _id, sms } = primaryUser._doc;
    const token = generatePrimaryUserToken(res, primaryUser._id);

    return res.status(200).json({
      message: "Login successful",
      token,
      data: { email, userName, _id, haveOut, sms, subscription: subscriptionStatus },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ status: false, message: "Failed to login!" });
  }
};

// @desc adding secondary users
// route GET/api/pUsers/addSecUsers
export const addSecUsers = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;
    const pUserId = req.owner;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const userExists = await SecondaryUser.findOne({ email: normalizedEmail }).collation({ locale: "en", strength: 2 });

    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const user = new SecondaryUser({
      name,
      mobile,
      email: normalizedEmail,
      password,
      primaryUser: pUserId,
    });

    const result = await user.save();

    if (result) {
      return res.status(200).json({
        success: true,
        message: "Secondary user registration is successful",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Secondary user registration failed",
      });
    }
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ success: false, message: "This email is already registered." });
    }
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc get secondary users list
// route GET/api/pUsers/fetchSecondaryUsers

export const fetchSecondaryUsers = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.owner);
  try {
    const secondaryUsers = await SecondaryUser.find({ primaryUser: userId })
      .populate("organization")
      .exec();
    if (secondaryUsers) {
      return res.status(200).json({
        secondaryUsers: secondaryUsers,
        message: "secondaryUsers fetched",
      });
    } else {
      return res
        .status(404)
        .json({ message: "No secondaryUsers were found for user" });
    }
  } catch (error) {
    console.log(error);

    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc send otp for forgot password
// route GET/api/sUsers/fetchBanks/:cmp_id

export const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const validEmail = await primaryUserModel.findOne({ email: email });
    if (!validEmail) {
      return res.status(400).json({ message: "Enter the registered email " });
    }

    const otp = generateNumericOTP(6);

    // Save OTP in the database
    const saveOtp = await primaryUserModel.updateOne(
      { email },
      { $set: { otp } }
    );

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
        console.log(error);

        return res.status(500).json({ error: "Error sending email" });
      } else {
        // console.log("Email Sent:" + info.response);

        return res
          .status(200)
          .json({ message: "OTP sent successfully", data: otp });
      }
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Internal server error" });
  }
};

// @desc check otp
//  route POST/api/pUsers/submitOtp

export const submitOtp = async (req, res) => {
  const { Otp, otpEmail } = req.body;

  try {
    // Retrieve user data based on the provided email
    const user = await primaryUserModel.findOne({ email: otpEmail });

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
// route POST/api/pUsers/resetPassword

export const resetPassword = async (req, res) => {
  const { password, otpEmail } = req.body;

  try {
    // Retrieve user data based on the provided email
    const user = await primaryUserModel.findOne({ email: otpEmail });

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

// @desc Get secuser details by ID
// @route GET /api/pUsers/getSecUserDetails/:id
export const getSecUserDetails = async (req, res) => {
  try {
    const secId = req.params.id;

    const secUserDetails = await SecondaryUser.findById(secId).populate({
      path: "organization",
      select: "_id name",
    });

    if (!secUserDetails) {
      return res
        .status(404)
        .json({ success: false, message: "User details not found" });
    }

    return res.status(200).json({ success: true, data: secUserDetails });
  } catch (error) {
    console.error(`Error fetching bank details: ${error.message}`);

    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};

// @desc   edit editSecUSer details
// route get/api/pUsers/editSecUSer/id

export const editSecUSer = async (req, res) => {
  const secUserId = req.params.id;
  const { name, mobile, email, organization, password } = req.body;

  try {
    if (password !== "") {
      // If password is not empty, hash and update it
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      req.body.password = hashedPassword;
    } else {
      // If password is empty, remove it from req.body to prevent updating
      delete req.body.password;
    }

    const updateParty = await SecondaryUser.findOneAndUpdate(
      { _id: secUserId },
      req.body,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updateParty,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// @desc toget the godown list
// route get/api/pUsers/fetchGodowns

export const fetchGodownsAndPriceLevels = async (req, res) => {
  const Primary_user_id = req.owner;
  const cmp_id = req.params.cmp_id;

  try {
    const cmp_idObj = new mongoose.Types.ObjectId(cmp_id);
    const primaryUserIdObj = new mongoose.Types.ObjectId(Primary_user_id);
    // Fetch unique price levels from products
    const [priceLevelsResult, godownsResult, subGroupsResult] =
      await Promise.all([
        PriceLevel.find({
          cmp_id: cmp_idObj,
          Primary_user_id: primaryUserIdObj,
        }),
        Godown.find({ cmp_id: cmp_idObj, Primary_user_id: primaryUserIdObj }),
        subGroup.find({ cmp_id: cmp_idObj, Primary_user_id: primaryUserIdObj }),
      ]);

    console.log(priceLevelsResult, "priceLevelsResult");

    res.status(200).json({
      message: "Godowns, Unique Price Levels, and Sub Groups fetched",
      data: {
        godowns: godownsResult,
        priceLevels: priceLevelsResult,
        subGroups: subGroupsResult,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching godowns, price levels, and sub groups:",
      error
    );
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc  adding configurations for secondary
// route post/api/pUsers/addSecondaryConfigurations

export const addSecondaryConfigurations = async (req, res) => {
  const cmp_id = req.params.cmp_id;
  const Primary_user_id = req.owner;
  const secondary_user_id = req.params.userId;

  try {
    const {
      selectedPriceLevels,
      salesConfiguration,
      salesOrderConfiguration,
      receiptConfiguration,
      paymentConfiguration,
      vanSaleConfiguration,
      stockTransferConfiguration,
      creditNoteConfiguration,
      debitNoteConfiguration,
      purchaseConfiguration,
      selectedVanSaleGodowns,
      selectedVanSaleSubGroups,
      vanSale,
    } = req.body;
    let { selectedGodowns } = req.body;

    if (selectedGodowns.every((godown) => godown === null)) {
      selectedGodowns = [];
    }

    const NeworderNumber = salesOrderConfiguration.currentNumber || 0;
    const NewsalesNumber = salesConfiguration.currentNumber || 0;
    const NewreceiptNumber = receiptConfiguration.currentNumber || 0;
    const NewvanSalesNumber = vanSaleConfiguration.currentNumber || 0;
    const NewpurchaseNumber = purchaseConfiguration.currentNumber || 0;
    const NewstockTransferNumber =
      stockTransferConfiguration.currentNumber || 0;
    const NewcreditNoteNumber = creditNoteConfiguration.currentNumber || 0;
    const NewdebitNoteNumber = debitNoteConfiguration.currentNumber || 0;
    const NewPaymentNumber = paymentConfiguration.currentNumber || 0;

    const dataToAdd = {
      organization: cmp_id,
      selectedGodowns,
      selectedPriceLevels,
      salesConfiguration,
      salesOrderConfiguration,
      receiptConfiguration,
      paymentConfiguration,
      purchaseConfiguration,
      stockTransferConfiguration,
      creditNoteConfiguration,
      debitNoteConfiguration,
      vanSaleConfiguration,
      selectedVanSaleGodowns,
      selectedVanSaleSubGroups,
      vanSale,
    };

    const secUser = await SecondaryUser.findById(secondary_user_id);

    if (!secUser) {
      return res.status(404).json({ error: "Secondary user not found" });
    }

    const newCmpId = new mongoose.Types.ObjectId(cmp_id);

    const existingConfigIndex = secUser.configurations.findIndex((config) => {
      return config.organization.equals(newCmpId);
    });

    let existingConfig;

    if (existingConfigIndex == -1) {
      const company = await OragnizationModel.findById(newCmpId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      existingConfig = {
        orderNumber: company.orderNumber,
        salesNumber: company.salesNumber,
        purchaseNumber: company.purchaseNumber,
        receiptNumber: company.receiptNumber,
        paymentNumber: company.paymentNumber,
        vanSalesNumber: company.vanSalesNumber,
        stockTransferNumber: company.stockTransferNumber,
        creditNoteNumber: company.creditNoteNumber,
        debitNoteNumber: company.debitNoteNumber,
      };
    } else {
      const existingConfiguration = secUser.configurations[existingConfigIndex];

      existingConfig = {
        orderNumber: existingConfiguration.orderNumber,
        salesNumber: existingConfiguration.salesNumber,
        purchaseNumber: existingConfiguration.purchaseNumber,
        receiptNumber: existingConfiguration.receiptNumber,
        paymentNumber: existingConfiguration.paymentNumber,
        vanSalesNumber: existingConfiguration.vanSalesNumber,
        stockTransferNumber: existingConfiguration.stockTransferNumber,
        creditNoteNumber: existingConfiguration.creditNoteNumber,
        debitNoteNumber: existingConfiguration.debitNoteNumber,
      };
    }

    const changes = {
      orderNumber: existingConfig.orderNumber !== NeworderNumber,
      salesNumber: existingConfig.salesNumber !== NewsalesNumber,
      purchaseNumber: existingConfig.purchaseNumber !== NewpurchaseNumber,
      receiptNumber: existingConfig.receiptNumber !== NewreceiptNumber,
      paymentNumber: existingConfig.paymentNumber !== NewPaymentNumber,
      vanSalesNumber: existingConfig.vanSalesNumber !== NewvanSalesNumber,
      stockTransferNumber:
        existingConfig.stockTransferNumber !== NewstockTransferNumber,
      creditNoteNumber: existingConfig.creditNoteNumber !== NewcreditNoteNumber,
      debitNoteNumber: existingConfig.debitNoteNumber !== NewdebitNoteNumber,
    };

    const checkForNumberExistence = async (
      model,
      fieldName,
      newValue,
      cmp_id
    ) => {
      const centralNumber = parseInt(newValue, 10);
      const regex = new RegExp(
        `^(${centralNumber}|.*-(0*${centralNumber})-.*)$`
      );
      const docs = await model.find({
        [fieldName]: { $regex: regex },
        cmp_id: cmp_id,
      });

      return docs.length > 0;
    };

    if (changes.salesNumber) {
      const salesExists = await checkForNumberExistence(
        salesModel,
        "salesNumber",
        NewsalesNumber,
        cmp_id
      );

      if (salesExists) {
        return res.status(400).json({
          message: `Sales is added with this number ${NewsalesNumber}`,
        });
      }
    }

    if (changes.orderNumber) {
      const orderExists = await checkForNumberExistence(
        invoiceModel,
        "orderNumber",
        NeworderNumber,
        cmp_id
      );

      if (orderExists) {
        return res.status(400).json({
          message: `Order is added with this number ${NeworderNumber}`,
        });
      }
    }

    if (changes.purchaseNumber) {
      const purchaseExists = await checkForNumberExistence(
        purchaseModel,
        "purchaseNumber",
        NewpurchaseNumber,
        cmp_id
      );
      if (purchaseExists) {
        return res.status(400).json({
          message: `Purchase is added with this number ${NewpurchaseNumber}`,
        });
      }
    }

    if (changes.receiptNumber) {
      const receiptExists = await checkForNumberExistence(
        ReceiptModel,
        "receiptNumber",
        NewreceiptNumber
      );
      if (receiptExists) {
        return res.status(400).json({
          message: `Receipt is added with this number ${NewreceiptNumber}`,
        });
      }
    }

    if (changes.paymentNumber) {
      const paymentExists = await checkForNumberExistence(
        paymentModel,
        "paymentNumber",
        NewPaymentNumber,
        cmp_id
      );
      if (paymentExists) {
        return res.status(400).json({
          message: `Payment is added with this number ${NewPaymentNumber}`,
        });
      }
    }

    if (changes.vanSalesNumber) {
      const vanSalesExists = await checkForNumberExistence(
        vanSaleModel,
        "salesNumber",
        NewvanSalesNumber,
        cmp_id
      );
      if (vanSalesExists) {
        return res.status(400).json({
          message: `Van Sales is added with this number ${NewvanSalesNumber}`,
        });
      }
    }
    if (changes.stockTransferNumber) {
      const stockTransferExists = await checkForNumberExistence(
        stockTransferModel,
        "stockTransferNumber",
        NewstockTransferNumber,
        cmp_id
      );
      if (stockTransferExists) {
        return res.status(400).json({
          message: `Stock Transfer is added with this number ${NewstockTransferNumber}`,
        });
      }
    }

    if (changes.creditNoteNumber) {
      const creditNoteExists = await checkForNumberExistence(
        creditNoteModel,
        "creditNoteNumber",
        NewcreditNoteNumber,
        cmp_id
      );
      if (creditNoteExists) {
        return res.status(400).json({
          message: `Credit Note is added with this number ${NewcreditNoteNumber}`,
        });
      }
    }

    if (changes.debitNoteNumber) {
      const debitNoteExists = await checkForNumberExistence(
        debitNoteModel,
        "debitNoteNumber",
        NewdebitNoteNumber,
        cmp_id
      );
      if (debitNoteExists) {
        return res.status(400).json({
          message: `Debit Note is added with this number ${NewdebitNoteNumber}`,
        });
      }
    }

    if (existingConfigIndex !== -1) {
      // Configuration already exists
      const existingConfig = secUser.configurations[existingConfigIndex];

      // Preserve existing counts while updating other fields
      secUser.configurations[existingConfigIndex] = {
        ...existingConfig.toObject(),
        ...dataToAdd,
        orderNumber: NeworderNumber,
        salesNumber: NewsalesNumber,
        purchaseNumber: NewpurchaseNumber,
        receiptNumber: NewreceiptNumber,
        paymentNumber: NewPaymentNumber,
        vanSalesNumber: NewvanSalesNumber,
        stockTransferNumber: NewstockTransferNumber,
        creditNoteNumber: NewcreditNoteNumber,
        debitNoteNumber: NewdebitNoteNumber,
      };
    } else {
      // Configuration does not exist, create new
      const newConfiguration = {
        ...dataToAdd,
        orderNumber: NeworderNumber,
        salesNumber: NewsalesNumber,
        purchaseNumber: NewpurchaseNumber,
        receiptNumber: NewreceiptNumber,
        paymentNumber: NewPaymentNumber,
        vanSalesNumber: NewvanSalesNumber,
        stockTransferNumber: NewstockTransferNumber,
        creditNoteNumber: NewcreditNoteNumber,
        debitNoteNumber: NewdebitNoteNumber,
      };
      secUser.configurations.push(newConfiguration);
    }

    // console.log("secUser.configurations", secUser.configurations);

    const result = await secUser.save();

    if (result) {
      return res
        .status(200)
        .json({ success: true, message: "User configuration is successful" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "User configuration failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc get ** all ** current numbers of sales sale orders etc
// route get/api/pUsers/fetchConfigurationCurrentNumber

export const fetchConfigurationCurrentNumber = async (req, res) => {
  const cmp_id = req.params.orgId;
  const secondary_user_id = req.params._id;

  if (!cmp_id || !secondary_user_id) {
    console.log(
      "cmp_id and secondary_user_id are required in fetchConfigurationCurrentNumber "
    );
    return res
      .status(400)
      .json({ message: "cmp_id and secondary_user_id are required" });
  }

  try {
    const secUser = await SecondaryUser.findById(secondary_user_id);
    const company = await OragnizationModel.findById(cmp_id);
    if (!secUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let configuration = secUser.configurations.find(
      (item) => item.organization.toString() === cmp_id
    );

    if (!configuration) {
      configuration = company;
    }

    // console.log("configuration", configuration);

    const {
      orderNumber,
      salesNumber,
      purchaseNumber,
      receiptNumber,
      paymentNumber,
      vanSalesNumber,
      stockTransferNumber,
      creditNoteNumber,
      debitNoteNumber,
    } = configuration;

    // console.log("creditNoteNumber", creditNoteNumber);

    return res.status(200).json({
      message: "Configuration numbers retrieved successfully",
      salesOrderNumber: orderNumber,
      salesNumber,
      purchaseNumber,
      receiptNumber,
      paymentNumber,
      vanSaleNumber: vanSalesNumber,
      stockTransferNumber,
      creditNoteNumber,
      debitNoteNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// @desc  allocating companies for users
// route put/api/sUsers/allocateCompany

export const allocateCompany = async (req, res) => {
  try {
    const { userId, selectedCompanies } = req.body;

    const secUser = await SecondaryUser.findById(userId);

    if (!secUser) {
      return res.status(404).json({ message: "User not found" });
    }

    secUser.organization = [...selectedCompanies];
    const result = await secUser.save();

    const updatedUser = await SecondaryUser.findById(userId).populate({
      path: "organization",
      select: "_id name",
    });

    if (result) {
      return res.status(200).json({
        success: true,
        message: "User configuration is successful",
        data: updatedUser,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "User configuration failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};





export const updateTransactionAccess = async (req, res) => {
  try {
    const { userId, companyId, access } = req.body;

    if (!userId || !companyId || !access) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const secUser = await SecondaryUser.findById(userId);

    if (!secUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ensure organization array contains this company
    const orgIdStr = companyId.toString();
    const alreadyAllocated = secUser.organization.some(
      (org) => org.toString() === orgIdStr
    );
    if (!alreadyAllocated) {
      secUser.organization.push(companyId);
    }

    // find configuration for this organization
    let config = secUser.configurations.find(
      (c) => c.organization?.toString() === orgIdStr
    );

    if (!config) {
      // create new configuration for this org
      config = {
        organization: companyId,
        ownTransactions: !!access.own,
        allTransactions: !!access.all,
      };
      secUser.configurations.push(config);
    } else {
      // update existing flags
      config.ownTransactions = !!access.own;
      config.allTransactions = !!access.all;
    }

    const result = await secUser.save();

    const updatedUser = await SecondaryUser.findById(userId)
      .populate({
        path: "organization",
        select: "_id name",
      })
      .lean();

    if (result) {
      return res.status(200).json({
        success: true,
        message: "Transaction access updated successfully",
        data: updatedUser,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to update transaction access",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// @desc  allocating PriceLevels
// route put/api/sUsers/allocatePriceLevel

export const allocateSubDetails = async (req, res) => {
  try {
    const { subDetail, voucherType } = req.query;
    const { userId, selectedItems, selectedCompany } = req.body;
    const cmp_id = req.params.cmp_id;

    const allowedSubDetails = [
      "selectedPriceLevels",
      "selectedGodowns",
      "selectedVanSaleGodowns",
      "selectedVoucherSeries",
      "selectedSubGroups",
    ]; // example
    if (!allowedSubDetails.includes(subDetail)) {
      return res.status(400).json({ message: "Invalid subDetail" });
    }

    const secUser = await SecondaryUser.findById(userId);
    if (!secUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const configuration = secUser.configurations.find((item) =>
      item.organization.equals(cmp_id)
    );

    //// for voucher series the structure is different
if (subDetail === "selectedVoucherSeries" && voucherType) {
  if (!configuration) {
    const newConfiguration = {
      organization: selectedCompany,
      selectedVoucherSeries: [
        {
          voucherType,
          selectedSeriesIds: selectedItems,
        },
      ],
    };
    secUser.configurations.push(newConfiguration);
  } else {
    if (!configuration.selectedVoucherSeries) {
      configuration.selectedVoucherSeries = [];
    }

    const existingSeries = configuration.selectedVoucherSeries.find(
      (item) => item.voucherType === voucherType
    );

    if (existingSeries) {
      existingSeries.selectedSeriesIds = selectedItems;
    } else {
      configuration.selectedVoucherSeries.push({
        voucherType,
        selectedSeriesIds: selectedItems,
      });
    }
  }

  const result = await secUser.save();
  return res.status(result ? 200 : 400).json({
    success: !!result,
    message: result
      ? "User configuration is successful"
      : "User configuration failed",
  });
}


    if (!configuration) {
      /// create one

      const newConfiguration = {
        organization: selectedCompany,
        [subDetail]: selectedItems,
      };
      secUser.configurations.push(newConfiguration);
    } else {
      const existingConfiguration = secUser.configurations.find((item) =>
        item.organization.equals(cmp_id)
      );
      existingConfiguration[subDetail] = selectedItems;
    }

    const result = await secUser.save();

    return res.status(result ? 200 : 400).json({
      success: !!result,
      message: result
        ? "User configuration is successful"
        : "User configuration failed",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// @desc get user permissions by id
// route GET /api/sUsers/getUserPermissions/:id
export const getUserPermissions = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await SecondaryUser.findOne({
      _id: userId,
      primaryUser: req.owner,
    }).select("name email mobile role permissions organization primaryUser");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("getUserPermissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};


// @desc update user permissions
// route PATCH /api/sUsers/updateUserPermissions/:id
export const updateUserPermissions = async(req,res)=>{

    const admin = await SecondaryUser.findById(req.sUserId );

    if(admin?.role!=="admin"){
        return res.status(403).json({
            message:"Only admin can update permissions"
        });
    }

    const user = await SecondaryUser.findById(req.params.id);

    if(!user){
        return res.status(404).json({
            message:"User not found"
        });
    }

    user.permissions = req.body.permissions;

    await user.save();

    res.json({
        success:true,
        message:"Permissions updated"
    });

}
