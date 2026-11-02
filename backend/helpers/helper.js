import partyModel from "../models/partyModel.js";
import OragnizationModel from "../models/OragnizationModel.js";
import { countries } from "../../frontend/constants/countries.js";
import AccountGroup from "../models/accountGroup.js";

/// truncate to n decimals
export const truncateToNDecimals = (num, n) => {
  const parts = num.toString().split(".");
  if (parts.length === 1) return num; // No decimal part
  parts[1] = parts[1].substring(0, n); // Truncate the decimal part
  return parseFloat(parts.join("."));
};

///// formatting  date to local date
export const formatToLocalDate = async (date, cmp_id, session) => {
  console.log("companyid in the formattolocatedatedd",cmp_id)
console.log("doneeeeeeeeeeeeee")
  try {
    // Fetch the organization details using the company ID and session
    const company = await OragnizationModel.findById(cmp_id).session(session);
    if (!company) {
      throw new Error("Company not found");
    }

    // Get the country associated with the company
    const countryName = company.country;

    // Find the timezone for the given country
    const countryData = countries.find(
      (country) => country.countryName === countryName
    );
    if (!countryData) {
      throw new Error("Country not found in the list");
    }

    const timezone = countryData.timeZone;

    // Convert to the local date based on the timezone
    const localDate = new Date(date).toLocaleString("en-US", {
      timeZone: timezone,
    });

    // Convert back to a Date object
    const dateObj = new Date(localDate);

    // Set the time to 00:00:00.000 in local timezone
    dateObj.setHours(0, 0, 0, 0);

    // Convert to UTC by creating a new Date with the same date and resetting timezone
    const utcDate = new Date(
      Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
    );

    return utcDate; // This is now in UTC with time set to 00:00:00.000
  } catch (error) {
    console.error("Error formatting date:", error.message);
    throw error;
  }
};

///formatting amount with commaeit
export const formatAmount = (amount) => {
  return amount?.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

/////helper for transactions
export const aggregateTransactions = (
  model,
  matchCriteria,
  type,
  voucherNumber,
  returnFullDetails
) => {

const modelName = model.modelName; // Extracts "Sales", "Receipt", etc.

let partyName = (modelName === "Sales" || modelName === "Receipt")
    ? "$guest.partyName"
    : "$party.partyName";

  const baseProjection = {
    voucherNumber: `$${voucherNumber}`,
    voucherType: 1,
    series_id: 1,
    usedSeriesNumber: 1,
    cmp_id: 1,
    party_name: { $ifNull: [partyName, "$party.partyName"] },
    accountGroup: "$party.accountGroup",
    type: type,
    enteredAmount:
      type === "Receipt" || type === "Payment"
        ? "$enteredAmount"
        : "$finalAmount",
    date: 1,
    createdAt: 1,
    isCancelled: 1,
    paymentMethod: 1,
    secondaryUserName: "$secondaryUser.name",
    secondaryUser_id: "$secondaryUser._id",
    balanceAmount: {
      $convert: {
        input: {
          $cond: {
            if: { $isArray: "$paymentSplittingData.balanceAmount" },
            then: {
              $cond: {
                if: {
                  $gt: [{ $size: "$paymentSplittingData.balanceAmount" }, 0],
                },
                then: {
                  $arrayElemAt: ["$paymentSplittingData.balanceAmount", 0],
                },
                else: {
                  $cond: {
                    if: {
                      $or: [
                        { $eq: [type, "Receipt"] },
                        { $eq: [type, "Payment"] },
                      ],
                    },
                    then: "$enteredAmount",
                    else: "$finalAmount",
                  },
                },
              },
            },
            else: {
              $ifNull: [
                "$paymentSplittingData.balanceAmount",
                type === "Receipt" || type === "Payment"
                  ? "$enteredAmount"
                  : "$finalAmount",
              ],
            },
          },
        },
        to: "string",
        onError: "0", // Default value if conversion fails
      },
    },
    cashTotal: {
      $convert: {
        input: {
          $cond: {
            if: { $isArray: "$paymentSplittingData.cashTotal" },
            then: {
              $cond: {
                if: { $gt: [{ $size: "$paymentSplittingData.cashTotal" }, 0] },
                then: { $arrayElemAt: ["$paymentSplittingData.cashTotal", 0] },
                else: "0",
              },
            },
            else: {
              $cond: {
                if: { $ifNull: ["$paymentSplittingData.cashTotal", false] },
                then: "$paymentSplittingData.cashTotal",
                else: {
                  $cond: {
                    if: { $eq: ["$party.accountGroup", "Cash-in-Hand"] },
                    then: {
                      $cond: {
                        if: {
                          $or: [
                            { $eq: [type, "Receipt"] },
                            { $eq: [type, "Payment"] },
                          ],
                        },
                        then: "$enteredAmount",
                        else: "$finalAmount",
                      },
                    },
                    else: "0",
                  },
                },
              },
            },
          },
        },
        to: "string",
        onError: "0", // Default value if conversion fails
      },
    },
  };

  // Add additional fields if returnFullDetails is true
  if (returnFullDetails) {
    baseProjection.items = 1;
    baseProjection.party = 1;
    baseProjection.additionalCharges = 1;
    baseProjection.isConverted = 1;
    baseProjection.despatchDetails = 1;
  }

  return model.aggregate([
    { $match: matchCriteria },
    {
      $addFields: {
        Secondary_user_idObj: { $toObjectId: "$Secondary_user_id" },
      },
    },
    {
      $lookup: {
        from: "secondaryusers",
        localField: "Secondary_user_idObj",
        foreignField: "_id",
        as: "secondaryUser",
        pipeline: [{ $project: { name: 1, _id: 1 } }],
      },
    },
    { $unwind: { path: "$secondaryUser", preserveNullAndEmptyArrays: true } },
    {
      $project: baseProjection,
    },
  ]);
};

// Function to aggregate opening balance with proper string-to-number conversion
export const aggregateOpeningBalance = async (
  model,
  matchCriteria,
  transactionType
) => {
  try {
    const amountField =
      transactionType === "Receipt" || transactionType === "Payment"
        ? "enteredAmount"
        : "finalAmount";

    const result = await model.aggregate([
      { $match: matchCriteria },
      {
        $addFields: {
          numericAmount: {
            $toDouble: { $ifNull: [`$${amountField}`, 0] },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$numericAmount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error(
      `Error calculating opening balance for ${transactionType}:`,
      error
    );
    return 0;
  }
};

/// corresponding party creation while creating cash and bank

export const addCorrespondingParty = async (
  ledname,
  Primary_user_id,
  cmp_id,
  accountGroup,
  masterId,
  session
) => {
  const accountGroupDetails = await AccountGroup.findOne({
    accountGroup: accountGroup,
    cmp_id: cmp_id,
  });
  try {
    if (!accountGroupDetails) {
      throw new Error("Account group not found");
    }
    const newParty = new partyModel({
      partyName: ledname,
      accountGroup: accountGroupDetails?._id,
      cmp_id: cmp_id,
      Primary_user_id: Primary_user_id,
      party_master_id: masterId, // Set this directly during creation
    });

    await newParty.save({ session }); // Save within the session
  } catch (error) {
    console.error("Error adding corresponding party:", error);
    throw error; // Propagate the error
  }
};

/// edit corresponding party

export const editCorrespondingParty = async (
  ledname,
  Primary_user_id,
  cmp_id,
  accountGroup,
  masterId,
  session
) => {
  try {
    // Find the existing party to update
    const existingParty = await partyModel.findOne({
      party_master_id: masterId,
      cmp_id: cmp_id,
      Primary_user_id: Primary_user_id,
    });

    if (!existingParty) {
      return;
    }

    // Update the existing party details
    existingParty.partyName = ledname;
    // existingParty.accountGroup = accountGroup;

    // Save the updated party within the session
    await existingParty.save({ session });

    return existingParty;
  } catch (error) {
    console.error("Error editing corresponding party:", error);
    throw error; // Propagate the error
  }
};

//// get email service

export const getEmailService = (email) => {
  const domain = email.split("@")[1].toLowerCase();
  if (domain.includes("gmail")) return "gmail";
  if (domain.includes("hotmail")) return "hotmail";
  if (domain.includes("yahoo")) return "yahoo";
  if (domain.includes("outlook")) return "outlook";
  return "smtp"; // Default to SMTP if no known domain
};

/// for getting financial year
export const getFinancialYearDates = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  let startYear = currentYear;
  let endYear = currentYear;

  // If current month is January to March, financial year started in previous year
  if (today.getMonth() < 3) {
    startYear = currentYear - 1;
  } else {
    endYear = currentYear + 1;
  }

  // Create ISO date strings for start and end of financial year
  const startDateStr = `${startYear}-04-01T00:00:00.000+00:00`;
  const endDateStr = `${endYear}-03-31T23:59:59.999+00:00`;

  return {
    startDate: new Date(startDateStr),
    endDate: new Date(endDateStr),
  };
};

/// get voucher multiplier for purchase and sales credit and debit notes
export const getVoucherMultiplier = (transactionType) => {
  const positiveTypes = ["sale", "debitNote"];
  const negativeTypes = ["purchase", "creditNote"];

  if (positiveTypes.includes(transactionType)) {
    return 1; // Dr nature - increases receivables
  } else if (negativeTypes.includes(transactionType)) {
    return -1; // Cr nature - increases payables
  } else {
    throw new Error(`Unknown transaction type: ${transactionType}`);
  }
};

/// get voucher multiplier for receipt and payment
export const getReceiptPaymentMultiplier = (source) => {
  const positiveSources = ["sales", "debitNote", "advancePayment"];
  const negativeSources = ["purchase", "creditNote", "advanceReceipt"];

  if (positiveSources.includes(source)) {
    return 1; // Cr nature - decreases receivables
  } else if (negativeSources.includes(source)) {
    return -1; // Dr nature - decreases payables
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
};

export const calculateBillPending = (voucherType, billAmount, receipts, payments, adjustments = 0) => {
  // Ensure all values are numbers (default 0 if invalid)
  const amount = Number(billAmount) || 0;
  const rec = Number(receipts) || 0;
  const pay = Number(payments) || 0;

  console.log(
    `calculateBillPending: voucherType=${voucherType}, billAmount=${amount}, receipts=${rec}, payments=${pay}`
  );

  if (voucherType === "sales" || voucherType === "debitNote" || voucherType === "advancePayment") {
    // Dr vouchers: receipts reduce pending, payments increase pending
    return amount - rec + pay - (Number(adjustments) || 0);
  } else if (voucherType === "purchase" || voucherType === "creditNote" || voucherType === "advanceReceipt") {
    // Cr vouchers: payments reduce pending, receipts increase pending
    return -(amount - pay + rec - (Number(adjustments) || 0));
  }

  return 0; // default case
};
