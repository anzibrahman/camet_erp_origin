import { creditNoteStockItems } from "./creditNoteStockItems.js";
import productModel from "../models/productModel.js";
import creditNoteModel from "../models/creditNoteModel.js";
import { formatToLocalDate, truncateToNDecimals } from "./helper.js";
import OragnizationModel from "../models/OragnizationModel.js";
import TallyData from "../models/TallyData.js";
import mongoose from "mongoose";

///////////////////////// for stock update ////////////////////////////////
export const handleCreditNoteStockUpdates = async (items, session) => {
  const productUpdates = [];
  const godownUpdates = [];

  for (const item of creditNoteStockItems(items)) {
    const product = await productModel
      .findOne({ _id: item._id })
      .session(session);
    if (!product) {
      throw new Error(`Product not found for item ID: ${item._id}`);
    }

    // Use actualCount if available, otherwise fall back to count
    const itemCount = parseFloat(
      item.totalActualCount !== undefined
        ? item?.totalActualCount
        : item?.totalCount
    );
    const productBalanceStock = parseFloat(product.balance_stock);
    const newBalanceStock = truncateToNDecimals(
      productBalanceStock + (itemCount || 0),
      3
    );

    productUpdates.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { balance_stock: newBalanceStock } },
      },
    });

    if (item.hasGodownOrBatch) {
      for (const godown of item.GodownList) {
        // Use actualCount if available, otherwise fall back to count for each godown
        const godownCount =
          godown.actualCount !== undefined ? godown.actualCount : godown.count;

        if (item?.batchEnabled && !item?.gdnEnabled) {
          console.log("batch only ");
          const godownIndex = product.GodownList.findIndex(
            (g) => g.batch === godown.batch
          );

          if (godownIndex !== -1 && godownCount && godownCount > 0) {
            const currentGodownStock =
              product.GodownList[godownIndex].balance_stock || 0;
            const newGodownStock = truncateToNDecimals(
              currentGodownStock + godownCount,
              3
            );

            godownUpdates.push({
              updateOne: {
                filter: { _id: product._id, "GodownList.batch": godown.batch },
                update: {
                  $set: { "GodownList.$.balance_stock": newGodownStock },
                },
              },
            });
          }
        } else if (item?.batchEnabled && item?.gdnEnabled) {
          console.log("godown_id and batch ");
          const godownIndex = product.GodownList.findIndex(
            (g) =>
              g.batch === godown.batch &&
              g.godown.toString() == godown.godownMongoDbId
          );

          if (godownIndex !== -1 && godownCount && godownCount > 0) {
            const currentGodownStock =
              product.GodownList[godownIndex].balance_stock || 0;
            const newGodownStock = truncateToNDecimals(
              currentGodownStock + godownCount,
              3
            );

            godownUpdates.push({
              updateOne: {
                filter: { _id: product._id },
                update: {
                  $set: { "GodownList.$[elem].balance_stock": newGodownStock },
                },
                arrayFilters: [
                  {
                    "elem.godown": new mongoose.Types.ObjectId(
                      godown.godownMongoDbId
                    ),
                    "elem.batch": godown.batch,
                  },
                ],
              },
            });
          }
        } else if (!item?.batchEnabled && item?.gdnEnabled) {
          console.log("godown_id only ");
          const godownIndex = product.GodownList.findIndex(
            (g) => g.godown.toString() == godown.godownMongoDbId
          );
          if (godownIndex !== -1 && godownCount && godownCount > 0) {
            const currentGodownStock =
              product.GodownList[godownIndex].balance_stock || 0;
            const newGodownStock = truncateToNDecimals(
              currentGodownStock + godownCount,
              3
            );

            godownUpdates.push({
              updateOne: {
                filter: {
                  _id: product._id,
                  "GodownList.godown": new mongoose.Types.ObjectId(
                    godown.godownMongoDbId
                  ),
                },
                update: {
                  $set: { "GodownList.$.balance_stock": newGodownStock },
                },
              },
            });
          }
        }
      }
    } else {
      product.GodownList = product.GodownList.map((godown) => {
        const currentGodownStock = Number(godown.balance_stock) || 0;

        const currentGodown = item?.GodownList[0];

        const godownCount =
          (currentGodown.actualCount !== undefined
            ? currentGodown.actualCount
            : currentGodown.count) || 0;

        const newGodownStock = truncateToNDecimals(
          Number(currentGodownStock) + Number(godownCount),
          3
        );
        return { ...godown, balance_stock: newGodownStock };
      });

      godownUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { GodownList: product.GodownList } },
        },
      });
    }
  }

  await productModel.bulkWrite(productUpdates, { session });
  await productModel.bulkWrite(godownUpdates, { session });
};
// Helper function to create creditNote record
export const createCreditNoteRecord = async (
  req,
  creditNoteNumber,
  updatedItems,
  updateAdditionalCharge,
  session
) => {
  try {
    const {
      selectedGodownId,
      selectedGodownName,
      orgId,
      party,
      despatchDetails,
      note,
      finalAmount: lastAmount,
      selectedDate,
      usedSeriesNumber,
      series_id,
      finalOutstandingAmount,
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      subTotal,
    } = req.body;

    const Primary_user_id = req.owner;
    const Secondary_user_id = req.sUserId;

    const model = creditNoteModel;

    const lastCreditNote = await model.findOne(
      {},
      {},
      { sort: { serialNumber: -1 }, session }
    );
    let newSerialNumber = 1;

    if (lastCreditNote && !isNaN(lastCreditNote.serialNumber)) {
      newSerialNumber = lastCreditNote.serialNumber + 1;
    }
console.log("line 203 creditnote")
    const creditNote = new model({
      selectedGodownId: selectedGodownId ?? "",
      selectedGodownName: selectedGodownName ? selectedGodownName[0] : "",
      serialNumber: newSerialNumber,
      creditNoteNumber: creditNoteNumber,
      usedSeriesNumber,
      series_id,
      cmp_id: orgId,
      partyAccount: party?.partyName,
      party,
      despatchDetails,
      items: updatedItems,
      selectedSaleIds: req.body.selectedSaleIds || [],
      returnSourceSaleIds: req.body.returnSourceSaleIds || [],
      returnAllocations: req.body.returnAllocations || [],
      settlementMode: req.body.selectedSaleIds?.length ? "selected" : "automatic",
      additionalCharges: updateAdditionalCharge,
      note,
      finalAmount: lastAmount,
      finalOutstandingAmount,
      totalAdditionalCharges,
      totalWithAdditionalCharges,
      totalPaymentSplits,
      subTotal,
      Primary_user_id,
      Secondary_user_id,
      creditNoteNumber,
      date: await formatToLocalDate(selectedDate, orgId, session),
      createdAt: new Date(),
    });

    const result = await creditNote.save({ session });

    return result;
  } catch (error) {
    console.error("Error in  createSaleRecord :", error);
    throw error;
  }
};

// update creditNote number

export const updateCreditNoteNumber = async (orgId, secondaryUser, session) => {
  try {
    let creditNoteConfig = false;

    const configuration = secondaryUser.configurations.find(
      (config) => config.organization.toString() === orgId
    );

    if (configuration) {
      creditNoteConfig = true;
    }

    if (creditNoteConfig === true) {
      const updatedConfiguration = secondaryUser.configurations.map(
        (config) => {
          if (config.organization.toString() === orgId) {
            return {
              ...config,
              creditNoteNumber: (config.creditNoteNumber || 0) + 1,
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
        { $inc: { creditNoteNumber: 1 } },
        { new: true, session }
      );
    }
  } catch (error) {
    console.error("Error in  updatedCreditNoteNumber :", error);
    throw error;
  }
};

export const revertCreditNoteStockUpdates = async (items, session) => {
  console.log("reached here");

  try {
    const productUpdates = [];
    const godownUpdates = [];

    for (const item of creditNoteStockItems(items)) {
      const product = await productModel
        .findOne({ _id: item._id })
        .session(session);
      if (!product) {
        throw new Error(`Product not found for item ID: ${item._id}`);
      }

      // Use actualCount if available, otherwise fall back to count
      const itemCount = parseFloat(
        item.totalActualCount !== undefined
          ? item?.totalActualCount
          : item?.totalCount
      );
      const productBalanceStock = parseFloat(product.balance_stock);
      const newBalanceStock = truncateToNDecimals(
        productBalanceStock - itemCount, // Revert stock by adding back
        3
      );

      // Prepare product update operation
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { balance_stock: newBalanceStock } },
        },
      });

      // Revert godown and batch updates
      if (item.hasGodownOrBatch) {
        for (const godown of item.GodownList) {
          // Use actualCount if available, otherwise fall back to count for each godown
          const godownCount =
            godown.actualCount !== undefined
              ? godown.actualCount
              : godown.count;
          if (item?.batchEnabled && !item?.gdnEnabled) {
            // Case: Batch only or Godown with Batch
            const godownIndex = product.GodownList.findIndex(
              (g) => g.batch === godown.batch
            );

            if (godownIndex !== -1) {
              if (godownCount && godownCount > 0) {
                const currentGodownStock =
                  product.GodownList[godownIndex].balance_stock || 0;
                const newGodownStock = truncateToNDecimals(
                  currentGodownStock - godownCount, // Revert stock by adding back
                  3
                );

                // Prepare godown update operation
                godownUpdates.push({
                  updateOne: {
                    filter: {
                      _id: product._id,
                      "GodownList.batch": godown.batch,
                    },
                    update: {
                      $set: { "GodownList.$.balance_stock": newGodownStock },
                    },
                  },
                });
              }
            }
          } else if (item?.batchEnabled && item?.gdnEnabled) {
            // Case: Godown with Batch
            const godownIndex = product.GodownList.findIndex(
              (g) =>
                g.batch === godown.batch &&
                g.godown.toString() == godown.godownMongoDbId
            );
            if (godownIndex !== -1) {
              if (godownCount && godownCount > 0) {
                const currentGodownStock =
                  product.GodownList[godownIndex].balance_stock || 0;
                const newGodownStock = truncateToNDecimals(
                  currentGodownStock - godownCount, // Revert stock by adding back
                  3
                );

                console.log("newGodownStock", newGodownStock);

                // Prepare godown update operation
                godownUpdates.push({
                  updateOne: {
                    filter: { _id: product._id },
                    update: {
                      $set: {
                        "GodownList.$[elem].balance_stock": newGodownStock,
                      },
                    },
                    arrayFilters: [
                      {
                        "elem.godown": new mongoose.Types.ObjectId(
                          godown.godownMongoDbId
                        ),
                        "elem.batch": godown.batch,
                      },
                    ],
                  },
                });
              }
            }
          } else if (!item?.batchEnabled && item?.gdnEnabled) {
            // Case: Godown only
            const godownIndex = product.GodownList.findIndex(
              (g) => g.godown.toString() == godown.godownMongoDbId
            );

            if (godownIndex !== -1) {
              if (godownCount && godownCount > 0) {
                const currentGodownStock =
                  product.GodownList[godownIndex].balance_stock || 0;
                const newGodownStock = truncateToNDecimals(
                  currentGodownStock - godownCount, // Revert stock by adding back
                  3
                );

                // Prepare godown update operation
                godownUpdates.push({
                  updateOne: {
                    filter: {
                      _id: product._id,
                      "GodownList.godown": new mongoose.Types.ObjectId(
                        godown.godownMongoDbId
                      ),
                    },
                    update: {
                      $set: { "GodownList.$.balance_stock": newGodownStock },
                    },
                  },
                });
              }
            }
          }
        }
      } else {
        // Case: No Godown
        product.GodownList = product.GodownList.map((godown) => {
          const currentGodownStock = Number(godown.balance_stock) || 0;

          const currentGodown = item?.GodownList[0];

          const godownCount =
            (currentGodown.actualCount !== undefined
              ? currentGodown.actualCount
              : currentGodown.count) || 0;

          const newGodownStock = truncateToNDecimals(
            Number(currentGodownStock) - Number(godownCount),
            3
          );
          return { ...godown, balance_stock: newGodownStock };
        });

        // Prepare godown update operation
        godownUpdates.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { GodownList: product.GodownList } },
          },
        });
      }
    }

    // Execute bulk operations to revert stock changes
    await productModel.bulkWrite(productUpdates, { session });
    await productModel.bulkWrite(godownUpdates, { session });
  } catch (error) {
    console.error("Error reverting sale stock updates:", error);
    throw error;
  }
};
