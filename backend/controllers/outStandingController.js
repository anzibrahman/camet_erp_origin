import mongoose from "mongoose";
import TallyData from "../models/TallyData.js";
import { calculateBillPending } from "../helpers/helper.js";

/**
 * @description
 * Get outstanding summary for a company
 * @route GET /api/outstanding/summary/:cmp_id
 * @param {string} cmp_id - company ID
 * @returns {object} - outstanding summary containing party_id, party_name, accountGroup, group_name, total_bill_amount, total_pending_amount, final_balance, and an array of bills
 */

export const getOutstandingSummary = async (req, res) => {
  try {
    const cmp_id = req.params.cmp_id;

    const summary = await TallyData.aggregate([
      // Match documents by company ID
      { $match: { cmp_id: new mongoose.Types.ObjectId(cmp_id) } },

      // Add computed fields for bill age
      {
        $addFields: {
          current_date: new Date(), // Get current date
          bill_due_date: { $toDate: "$bill_due_date" }, // Ensure date format
        },
      },

      // Compute bill age in days (difference between current date and due date)
      {
        $addFields: {
          age_of_bill: {
            $dateDiff: {
              startDate: "$bill_due_date",
              endDate: "$current_date",
              unit: "day",
            },
          },
        },
      },

      // Group by party_id and accumulate total amounts + bills
      {
        $group: {
          _id: "$party_id",
          party_name: { $first: "$party_name" },
          accountGroup: { $first: "$accountGroup" },
          group_name: { $first: "$group_name" },
          total_bill_amount: { $sum: "$bill_amount" },
          total_pending_amount: { $sum: "$bill_pending_amt" },
          bills: {
            $push: {
              bill_no: "$bill_no",
              bill_date: "$bill_date",
              bill_amount: "$bill_amount",
              bill_due_date: "$bill_due_date",
              bill_pending_amt: "$bill_pending_amt",
              bill_id: "$bill_id",
              age_of_bill: "$age_of_bill", // Age of bill in days
              classification: "$classification",
            },
          },
        },
      },

      // Sort by party_name
      { $sort: { party_name: 1 } },

      // Rename _id field to party_id and round amounts
      {
        $project: {
          party_id: "$_id",
          _id: 0,
          party_name: 1,
          accountGroup: 1,
          group_name: 1,
          total_bill_amount: { $round: ["$total_bill_amount", 2] },
          total_pending_amount: { $round: ["$total_pending_amount", 2] },
          total_final_balance: { $round: ["$total_pending_amount", 2] }, // Final Balance as bill_pending_amt
          bills: 1,
        },
      },
    ]);

    if (!summary.length) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.status(200).json({
      success: true,
      count: summary.length,
      data: summary,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error retrieving outstanding summary",
      error: error.message,
    });
  }
};

/**
 * @description
 * Get total outstanding amount for all parties of a company
 * @route GET /api/outstanding/total/:cmp_id
 * @param {string} cmp_id - company ID
 * @returns {object} - outstanding summary containing party_id, party_name, total_bill_amount, and user_id
 */
export const fetchOutstandingTotal = async (req, res) => {
  const { cmp_id } = req.params;
  const { type } = req.query; // "ledger", "group", "payables", "receivables"
  const Primary_user_id = req?.owner;

  try {
    if (type === "ledger") {
      const matchStage = {
        $match: {
          cmp_id: new mongoose.Types.ObjectId(cmp_id),
          Primary_user_id: new mongoose.Types.ObjectId(Primary_user_id),
        },
      };

      // Updated ledger-wise data logic - sum directly since Cr is negative and Dr is positive
      const ledgerData = await TallyData.aggregate([
        matchStage,
        {
          $group: {
            _id: "$party_id",
            totalBillAmount: { $sum: "$bill_pending_amt" }, // Direct sum since Cr is -ve and Dr is +ve
            party_name: { $first: "$party_name" },
            cmp_id: { $first: "$cmp_id" },
            user_id: { $first: "$user_id" },
            group_name: { $first: "$group_name" },
            group_name_id: { $first: "$group_name_id" },
            accountGroup: { $first: "$accountGroup" },
          },
        },
        {
          $addFields: {
            classification: {
              $cond: {
                if: { $gt: ["$totalBillAmount", 0] },
                then: "Dr",
                else: {
                  $cond: {
                    if: { $lt: ["$totalBillAmount", 0] },
                    then: "Cr",
                    else: "",
                  },
                },
              },
            },
            absoluteAmount: { $abs: "$totalBillAmount" }, // For display purposes if needed
          },
        },

        { $sort: { party_name: 1 } },
      ]);

      let totalOutstandingPayable = 0;
      let totalOutstandingReceivable = 0;

      ledgerData.forEach((item) => {
        if (item.totalBillAmount < 0) {
          // Negative means payable (Cr)
          totalOutstandingPayable += Math.abs(item.totalBillAmount);
        } else if (item.totalBillAmount > 0) {
          // Positive means receivable (Dr)
          totalOutstandingReceivable += item.totalBillAmount;
        }
      });

      const totalOutstandingDrCr = Math.abs(
        totalOutstandingReceivable - totalOutstandingPayable
      );

      return res.status(200).json({
        outstandingData: ledgerData,
        totalOutstandingDrCr,
        totalOutstandingPayable,
        totalOutstandingReceivable,
        message: "Ledger-wise tally data fetched",
      });
    }

    if (type === "payables" || type === "receivables") {
      const matchClassification = type === "payables" ? "Cr" : "Dr";

      const outstandingData = await TallyData.aggregate([
        {
          $match: {
            cmp_id: new mongoose.Types.ObjectId(cmp_id),
            Primary_user_id,
            classification: matchClassification,
          },
        },
        {
          $group: {
            _id: "$party_id",
            totalBillAmount: { $sum: "$bill_pending_amt" },
            party_name: { $first: "$party_name" },
            cmp_id: { $first: "$cmp_id" },
            user_id: { $first: "$user_id" },
            group_name: { $first: "$group_name" },
            group_name_id: { $first: "$group_name_id" },
            accountGroup: { $first: "$accountGroup" },
            classification: { $first: "$classification" },
          },
        },
        { $sort: { party_name: 1 } },
      ]);

      const totalOutstanding = outstandingData.reduce(
        (sum, item) => sum + item.totalBillAmount,
        0
      );

      return res.status(200).json({
        outstandingData,
        totalOutstanding,
        message: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } tally data fetched`,
      });
    }

    if (type === "group") {
      const groupData = await TallyData.aggregate([
        {
          $match: {
            cmp_id,
            Primary_user_id,
            accountGroup_id: { $ne: null }, // Exclude documents with null accountGroup_id
            accountGroup: { $ne: null }, // Exclude documents with null accountGroup
          },
        },
        {
          $group: {
            _id: {
              accountGroup_id: "$accountGroup_id", // Include account group ID
              accountGroup: "$accountGroup", // Include account group name
              subGroup_id: { $ifNull: ["$subGroup_id", null] }, // Handle missing sub-group
              party_id: "$party_id",
            },
            party_name: { $first: "$party_name" },
            subGroup: { $first: "$subGroup" },
            totalDr: {
              $sum: {
                $cond: [
                  { $eq: ["$classification", "Dr"] },
                  "$bill_pending_amt",
                  0,
                ],
              },
            },
            totalCr: {
              $sum: {
                $cond: [
                  { $eq: ["$classification", "Cr"] },
                  "$bill_pending_amt",
                  0,
                ],
              },
            },
            cmp_id: { $first: "$cmp_id" },
            user_id: { $first: "$user_id" },
            classification: { $first: "$classification" },
          },
        },
        {
          $group: {
            _id: {
              accountGroup_id: "$_id.accountGroup_id",
              accountGroup: "$_id.accountGroup",
              subGroup_id: "$_id.subGroup_id",
            },
            subGroup: { $first: "$subGroup" },
            totalDr: { $sum: "$totalDr" },
            totalCr: { $sum: "$totalCr" },
            bills: {
              $push: {
                party_id: "$_id.party_id",
                party_name: "$party_name",
                bill_pending_amt: {
                  $abs: { $sum: { $subtract: ["$totalDr", "$totalCr"] } },
                },
                cmp_id: "$cmp_id",
                user_id: "$user_id",
                classification: {
                  $cond: {
                    if: { $gt: [{ $subtract: ["$totalDr", "$totalCr"] }, 0] },
                    then: "Dr",
                    else: "Cr",
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: {
              accountGroup_id: "$_id.accountGroup_id",
              accountGroup: "$_id.accountGroup",
            },
            totalDr: { $sum: "$totalDr" },
            totalCr: { $sum: "$totalCr" },
            totalAmount: {
              $sum: { $abs: { $subtract: ["$totalDr", "$totalCr"] } },
            },
            subgroups: {
              $push: {
                subGroup_id: "$_id.subGroup_id",
                subGroup: { $ifNull: ["$subGroup", null] }, // Keep null sub-groups separate
                totalAmount: { $abs: { $subtract: ["$totalDr", "$totalCr"] } },
                classification: {
                  $cond: {
                    if: { $gt: [{ $subtract: ["$totalDr", "$totalCr"] }, 0] },
                    then: "Dr",
                    else: "Cr",
                  },
                },
                bills: "$bills",
              },
            },
          },
        },
        { $sort: { "_id.accountGroup": 1 } },
      ]);

      // Separate subgroups and those without a subgroup
      let totalOutstandingPayable = 0;
      let totalOutstandingReceivable = 0;
      let totalOutstandingDrCr = 0;

      const finalGroupData = groupData.map((group) => {
        const subgroupBills = group.subgroups.filter(
          (sg) => sg.subGroup_id !== null
        );
        const directBills = group.subgroups
          .filter((sg) => sg.subGroup_id === null)
          .flatMap((sg) => sg.bills);

        const totalAmount = group.totalAmount;

        if (group.totalDr > group.totalCr) {
          totalOutstandingReceivable += totalAmount;
        } else {
          totalOutstandingPayable += totalAmount;
        }

        return {
          accountGroup_id: group._id.accountGroup_id, // Include account group ID
          accountGroup: group._id.accountGroup, // Include account group name
          totalAmount,
          classification: group.totalDr > group.totalCr ? "Dr" : "Cr",
          subgroups: subgroupBills,
          bills: directBills, // Bills without a sub-group go directly under the account group
        };
      });

      // Ensure totalOutstandingDrCr is the absolute difference
      totalOutstandingDrCr = Math.abs(
        totalOutstandingReceivable - totalOutstandingPayable
      );

      return res.status(200).json({
        outstandingData: finalGroupData,
        totalOutstandingPayable,
        totalOutstandingReceivable,
        totalOutstandingDrCr,
        message: "Group-wise tally data fetched",
      });
    }

    return res.status(400).json({ message: "Invalid type parameter provided" });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error, try again!",
    });
  }
};

/**
 * @desc  get outstanding data from tally
 * @route GET/api/sUsers/fetchOutstandingDetails
 * @access Public
 */

/**
 * GET /api/outstanding/:party_id/:cmp_id
 *        ?voucher=receipt|payment
 *        &voucherId=<billId>
 *
 * • If voucherId is NOT supplied → return open items that match the
 *   voucher-type classification (Dr for receipt, Cr for payment).
 * • If voucherId IS supplied      → always include that specific invoice
 *   (by billId) **even when its classification is different**,
 *   while still filtering the rest by classification.
 */
// export const fetchOutstandingDetails = async (req, res) => {
//   const { party_id: partyId, cmp_id: cmpId } = req.params;
//   const { voucher, voucherId } = req.query;

//   /* -----------------------------------------------------------
//      1. Base query without classification filter initially
//   ----------------------------------------------------------- */
//   const baseMatch = {
//     party_id: new mongoose.Types.ObjectId(partyId),
//     cmp_id: cmpId,
//     isCancelled: false,
//   };

//   /* -----------------------------------------------------------
//      2. Build the Mongo query:
//         • If voucherId is present: fetch all outstandings without classification filter
//         • If no voucherId: apply classification filter for performance
//   ----------------------------------------------------------- */
//   const query = voucherId
//     ? {
//         ...baseMatch,
//         // bill_pending_amt: { $gt: 0 }
//       }
//     : {
//         ...baseMatch,
//         bill_pending_amt: { $gt: 0 },
//         // Apply classification filter only when no specific voucherId
//         ...(voucher === "receipt"
//           ? { classification: "Dr" }
//           : voucher === "payment"
//           ? { classification: "Cr" }
//           : {}),
//       };

//   try {
//     const outstandings = await TallyData.find(query)
//       .sort({ bill_date: 1 })
//       .select(
//         "_id bill_no billId bill_date bill_pending_amt bill_amount source classification adjustmentAmount appliedReceipts appliedPayments"
//       )
//       .lean();

//     if (!outstandings.length) {
//       return res
//         .status(404)
//         .json({ message: "No outstandings were found for user" });
//     }

//     /* -----------------------------------------------------------
//      3. If voucherId is present, update bill_pending_amt calculation
//         for records that have applied receipts/payments
//     ----------------------------------------------------------- */
//     let processedOutstandings = outstandings;

//     if (voucherId) {
//       processedOutstandings = outstandings.map((outstanding) => {
//         let updatedPendingAmount = outstanding.bill_pending_amt;

//         // Find the settled amount for this voucherId and add it back
//         if (voucher === "receipt" && outstanding.appliedReceipts?.length > 0) {
//           const appliedReceipt = outstanding.appliedReceipts.find(
//             (receipt) => receipt._id.toString() === voucherId
//           );
//           if (appliedReceipt) {
//             updatedPendingAmount += appliedReceipt.settledAmount || 0;
//           }
//         } else if (
//           voucher === "payment" &&
//           outstanding.appliedPayments?.length > 0
//         ) {
//           const appliedPayment = outstanding.appliedPayments.find(
//             (payment) => payment._id.toString() === voucherId
//           );
//           if (appliedPayment) {
//             updatedPendingAmount += appliedPayment.settledAmount || 0;
//           }
//         }

//         return {
//           ...outstanding,
//           bill_pending_amt: updatedPendingAmount,
//         };
//       });
//     }

//     /* -----------------------------------------------------------
//      4. Apply classification filter at the end (after processing)
//         Only when voucherId is present
//     ----------------------------------------------------------- */
//     // if (voucherId) {
//     //   const classificationFilter =
//     //     voucher === "receipt" ? "Dr" : voucher === "payment" ? "Cr" : null;

//     //   if (classificationFilter) {
//     //     processedOutstandings = processedOutstandings.filter((outstanding) => {
//     //       // Include if it matches classification OR if it has applied amount for this voucherId
//     //       const hasAppliedAmount =
//     //         voucher === "receipt"
//     //           ? outstanding.appliedReceipts?.some(
//     //               (receipt) => receipt._id.toString() === voucherId
//     //             )
//     //           : outstanding.appliedPayments?.some(
//     //               (payment) => payment._id.toString() === voucherId
//     //             );

//     //       return (
//     //         (outstanding.classification === classificationFilter &&
//     //           outstanding.bill_pending_amt > 0) ||
//     //         hasAppliedAmount
//     //       );
//     //     });
//     //   }
//     // }

//     if (voucherId) {
//       processedOutstandings = outstandings.map((outstanding) => {
//         let updatedPendingAmount = outstanding.bill_pending_amt;

//         // Check if this outstanding has applied receipts/payments
//         if (voucher === "receipt" && outstanding.appliedReceipts?.length > 0) {
//           // Filter out the voucher being processed and sum the remaining
//           const filteredReceipts = outstanding.appliedReceipts.filter(
//             (receipt) => receipt._id.toString() !== voucherId
//           );

//           const totalAppliedReceipts = filteredReceipts.reduce(
//             (sum, receipt) => sum + (receipt.settledAmount || 0),
//             0
//           );

//           updatedPendingAmount = outstanding.bill_amount - totalAppliedReceipts;
//         } else if (
//           voucher === "payment" &&
//           outstanding.appliedPayments?.length > 0
//         ) {
//           // Filter out the voucher being processed and sum the remaining
//           const filteredPayments = outstanding.appliedPayments.filter(
//             (payment) => payment._id.toString() !== voucherId
//           );
//           const totalAppliedPayments = filteredPayments.reduce(
//             (sum, payment) => sum + (payment.settledAmount || 0),
//             0
//           );
//           updatedPendingAmount = outstanding.bill_amount - totalAppliedPayments;
//         }

//         return {
//           ...outstanding,
//           bill_pending_amt: Math.max(0, updatedPendingAmount), // Ensure non-negative
//         };
//       });
//     }

//     const totalOutstandingAmount = processedOutstandings.reduce(
//       (sum, o) => sum + (o.bill_pending_amt > 0 ? o.bill_pending_amt : 0),
//       0
//     );

//     // Remove appliedReceipts and appliedPayments from response for cleaner output and filter out doc with bill_pending_amt <= 0
//     const responseOutstandings = processedOutstandings
//       .filter((o) => o.bill_pending_amt > 0)
//       .map(({ appliedReceipts, appliedPayments, ...rest }) => rest);

//     return res.status(200).json({
//       success: true,
//       message: "Outstandings fetched",
//       totalOutstandingAmount,
//       outstandings: responseOutstandings,
//     });
//   } catch (error) {
//     console.error("❌ Error in fetchOutstandingDetails:", {
//       error: error.message,
//       stack: error.stack,
//       partyId,
//       cmpId,
//       voucher,
//       voucherId,
//       timestamp: new Date().toISOString(),
//     });

//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error, try again!" });
//   }
// };

export const fetchOutstandingDetails = async (req, res) => {
  const { party_id: partyId, cmp_id: cmpId } = req.params;
  const { voucher, voucherId } = req.query;

  /* -----------------------------------------------------------
     1. Base query without classification filter initially
  ----------------------------------------------------------- */
  const baseMatch = {
    party_id: new mongoose.Types.ObjectId(partyId),
    cmp_id: cmpId,
    isCancelled: false,
  };

  /* -----------------------------------------------------------
     2. Build the Mongo query:
        • If voucherId is present: fetch specific sources and all outstandings
        • If no voucherId: apply classification and pending amount filter
  ----------------------------------------------------------- */
  const query = voucherId
    ? {
        ...baseMatch,
        ...(voucher === "receipt" && {
          source: { $in: ["sales", "debitNote", "advancePayment"] },
        }),
        // Fetch all outstandings without pending amount or classification filter
      }
    : {
        ...baseMatch,
        // FIXED: Different pending amount filters based on voucher type
        ...(voucher === "receipt"
          ? {
              bill_pending_amt: { $gt: 0 }, // Dr outstandings (positive)
              classification: "Dr",
            }
          : voucher === "payment"
          ? {
              bill_pending_amt: { $lt: 0 }, // Cr outstandings (negative)
              classification: "Cr",
            }
          : { bill_pending_amt: { $ne: 0 } }), // Any non-zero for other cases
      };

  try {
    const outstandings = await TallyData.find(query)
      .sort({ bill_date: 1 })
      .select(
        "_id bill_no billId bill_date bill_pending_amt bill_amount source classification adjustmentAmount appliedReceipts appliedPayments"
      )
      .lean();

    if (!outstandings.length) {
      return res
        .status(404)
        .json({ message: "No outstandings were found for user" });
    }

    /* -----------------------------------------------------------
     3. If voucherId is present, process outstandings with dynamic classification
    ----------------------------------------------------------- */
    let processedOutstandings = outstandings;

    if (voucherId) {
      processedOutstandings = outstandings
        .map((outstanding) => {
          let updatedPendingAmount = outstanding.bill_pending_amt;
          let hasAppliedAmount = false;

          // Check if this outstanding has applied receipts/payments for this voucherId
          if (
            voucher === "receipt" &&
            outstanding.appliedReceipts?.length > 0
          ) {
            hasAppliedAmount = outstanding.appliedReceipts.some(
              (receipt) => receipt._id.toString() === voucherId
            );

            console.log("Has Applied Receipt for voucherId:", hasAppliedAmount);

            if (hasAppliedAmount) {
              const filteredReceipts = outstanding.appliedReceipts.filter(
                (receipt) => receipt._id.toString() !== voucherId
              );

              const totalAppliedReceipts = filteredReceipts.reduce(
                (sum, receipt) => sum + (receipt.settledAmount || 0),
                0
              );

              const totalAppliedPayments =
                outstanding.appliedPayments?.reduce(
                  (sum, payment) => sum + (payment.settledAmount || 0),
                  0
                ) || 0;

              console.log(
                "Total Applied Receipts (excluding current):",
                totalAppliedReceipts
              );
              console.log(
                "Total Applied Payments (excluding current):",
                totalAppliedPayments
              );
              console.log("Outstanding Bill Amount:", outstanding.bill_amount);
              console.log("Outstanding Source:", outstanding.source);

              updatedPendingAmount = calculateBillPending(
                outstanding.source,
                outstanding.bill_amount,
                totalAppliedReceipts,
                totalAppliedPayments,
                outstanding?.adjustmentAmount || 0
              );

              // updatedPendingAmount = outstanding.bill_amount - totalAppliedReceipts;
            }
          } else if (
            voucher === "payment" &&
            outstanding.appliedPayments?.length > 0
          ) {
            hasAppliedAmount = outstanding.appliedPayments.some(
              (payment) => payment._id.toString() === voucherId
            );

            if (hasAppliedAmount) {
              const filteredPayments = outstanding.appliedPayments.filter(
                (payment) => payment._id.toString() !== voucherId
              );

              const totalAppliedPayments = filteredPayments.reduce(
                (sum, payment) => sum + (payment.settledAmount || 0),
                0
              );

              const totalAppliedReceipts =
                outstanding.appliedReceipts?.reduce(
                  (sum, receipt) => sum + (receipt.settledAmount || 0),
                  0
                ) || 0;

              updatedPendingAmount = calculateBillPending(
                outstanding.source,
                outstanding.bill_amount,
                totalAppliedReceipts,
                totalAppliedPayments,
                outstanding?.adjustmentAmount || 0
              );
            }
          }

          // Determine classification based on pending amount sign
          let newClassification = updatedPendingAmount < 0 ? "Cr" : "Dr";

          // if (hasAppliedAmount) {
          //   if (voucher === "receipt") {
          //     newClassification = updatedPendingAmount < 0 ? "Cr" : "Dr";
          //   } else if (voucher === "payment") {
          //     newClassification = updatedPendingAmount < 0 ? "Dr" : "Cr";
          //   }
          // }

          return {
            ...outstanding,
            bill_pending_amt: updatedPendingAmount,
            classification: newClassification,
            hasAppliedAmount,
          };
        })
        .filter((outstanding) => {
          // Filter based on voucher type and classification
          if (voucher === "receipt") {
            return (
              outstanding.classification === "Dr" ||
              outstanding.hasAppliedAmount
            );
          } else if (voucher === "payment") {
            return (
              outstanding.classification === "Cr" ||
              outstanding.hasAppliedAmount
            );
          }
          return true;
        });
    }

    console.log("Processed Outstandings:", processedOutstandings);

    // FIXED: Calculate total and format response amounts
    const totalOutstandingAmount = processedOutstandings.reduce((sum, o) => {
      // For receipts: sum positive amounts, for payments: sum absolute values of negative amounts
      if (voucher === "receipt") {
        return sum + (o.bill_pending_amt > 0 ? o.bill_pending_amt : 0);
      } else if (voucher === "payment") {
        return (
          sum + (o.bill_pending_amt < 0 ? Math.abs(o.bill_pending_amt) : 0)
        );
      } else {
        return sum + Math.abs(o.bill_pending_amt);
      }
    }, 0);

    // FIXED: Format response - convert negative amounts to positive for display
    const responseOutstandings = processedOutstandings
      .filter((o) => {
        // Filter based on voucher type
        if (voucher === "receipt") {
          return o.bill_pending_amt > 0; // Only positive Dr amounts
        } else if (voucher === "payment") {
          return o.bill_pending_amt < 0; // Only negative Cr amounts
        } else {
          return o.bill_pending_amt !== 0; // Any non-zero
        }
      })
      .map(
        ({ appliedReceipts, appliedPayments, hasAppliedAmount, ...rest }) => ({
          ...rest,
          // FIXED: Always return positive amount for UI display
          bill_pending_amt: Math.abs(rest.bill_pending_amt),
        })
      );

    return res.status(200).json({
      success: true,
      message: "Outstandings fetched",
      totalOutstandingAmount,
      outstandings: responseOutstandings,
    });
  } catch (error) {
    console.error("❌ Error in fetchOutstandingDetails:", {
      error: error.message,
      stack: error.stack,
      partyId,
      cmpId,
      voucher,
      voucherId,
      timestamp: new Date().toISOString(),
    });

    return res
      .status(500)
      .json({ success: false, message: "Internal server error, try again!" });
  }
};
