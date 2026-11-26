import { checkSeriesNumberExists } from "../helpers/voucherHelper.js";
import VoucherSeries from "../models/VoucherSeriesModel.js";
import SecondaryUserModel from "../models/secondaryUserModel.js";

// Separate validation function for checking duplicate voucher series
const checkForDuplicateSeries = (
  existingSeries,
  newSeries,
  excludeSeriesId = null
) => {
  return existingSeries.some((s) => {
    // Skip the current series being edited (for edit operations)
    if (excludeSeriesId && s._id.toString() === excludeSeriesId) {
      return false;
    }

    // Check 1: Same name
    const sameName =
      s.seriesName.trim().toLowerCase() ===
      newSeries.seriesName.trim().toLowerCase();

    // Check 2: Same name + suffix + prefix + width
    const sameNameAndAll =
      sameName &&
      (s.suffix?.trim().toLowerCase() || "") ===
        (newSeries.suffix?.trim().toLowerCase() || "") &&
      (s.prefix?.trim().toLowerCase() || "") ===
        (newSeries.prefix?.trim().toLowerCase() || "") &&
      s.widthOfNumericalPart === newSeries.widthOfNumericalPart;

    // Check 3: Same suffix + prefix + width (regardless of name)
    const samePrefixSuffixWidth =
      (s.suffix?.trim().toLowerCase() || "") ===
        (newSeries.suffix?.trim().toLowerCase() || "") &&
      (s.prefix?.trim().toLowerCase() || "") ===
        (newSeries.prefix?.trim().toLowerCase() || "") &&
      s.widthOfNumericalPart === newSeries.widthOfNumericalPart;

    console.log(sameName, sameNameAndAll, samePrefixSuffixWidth);

    return sameName || sameNameAndAll || samePrefixSuffixWidth;
  });
};

/// @desc for giving voucher series
export const getSeriesByVoucher = async (req, res) => {
  try {
    const { voucherType,restrict } = req.query;
    const cmp_id = req.params.cmp_id;

    const isRestricted=restrict==="true"?true:false

    if (!voucherType || !cmp_id) {
      return res
        .status(400)
        .json({ message: "voucherType and cmp_id are required" });
    }

    const secondaryUser = await SecondaryUserModel.findById(req.sUserId);

    if (!secondaryUser) {
      return res.status(404).json({ message: "Secondary user not found" });
    }

    const configuration = secondaryUser.configurations.find(
      (item) => item?.organization?.toString() == cmp_id?.toString()
    );

    let seriesDoc = await VoucherSeries.findOne({
      voucherType: voucherType === "sale" ? "sales" : voucherType,
      cmp_id,
    }).lean();

    // Existing companies receive their independent proforma sequence on first use.
    if (!seriesDoc && voucherType === "performaInvoice" && configuration) {
      seriesDoc = await VoucherSeries.findOneAndUpdate(
        { cmp_id, voucherType },
        { $setOnInsert: { cmp_id, voucherType, Primary_user_id: req.owner, series: [{ seriesName: "Default Series", prefix: "PI-", currentNumber: 1, lastUsedNumber: 1, widthOfNumericalPart: 4, isDefault: true }] } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
    }
    if (!seriesDoc) {
      return res
        .status(404)
        .json({ message: "No series found for this voucher type" });
    }

    let series = seriesDoc.series;

    // Exclude the specified series if excludeSeriesId is provided
    if (
      configuration &&
      isRestricted &&
      configuration?.selectedVoucherSeries &&
      configuration?.selectedVoucherSeries.length > 0
    ) {
    

      const selectedSeriesIds =
        configuration?.selectedVoucherSeries?.filter(
          (item) => item?.voucherType == voucherType
        )[0]?.selectedSeriesIds || [];

      if (selectedSeriesIds?.length > 0) {
        series = series?.filter((series) =>
          selectedSeriesIds.includes(series._id)
        );
      }
    }

    return res.status(200).json({ series });
  } catch (error) {
    console.error("Error fetching series:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Controller to create a new voucher series for a given voucher type
export const createVoucherSeries = async (req, res) => {
  const { voucherType, newSeries } = req.body;
  const cmp_id = req.params.cmp_id;
  const ownerId = req.owner;

  newSeries.lastUsedNumber = newSeries.currentNumber;

  // Step 1: Basic validation
  if (
    !cmp_id ||
    !voucherType ||
    !newSeries?.seriesName ||
    !newSeries?.widthOfNumericalPart
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: cmp_id, voucherType, seriesName, or widthOfNumericalPart",
    });
  }

  // Validate voucher type
  const voucherTypes = [
    "sales",
    "saleOrder",
    "performaInvoice",
    "vanSale",
    "purchase",
    "creditNote",
    "debitNote",
    "stockTransfer",
    "receipt",
    "payment",
    "deliveryNote"
  ];

  if (!voucherTypes.includes(voucherType)) {
    console.log("Invalid voucher type:", voucherType);
  }

  try {
    // Step 2: Check if a voucherType already exists for this company
    const doc = await VoucherSeries.findOne({ cmp_id, voucherType });

    if (doc) {
      // Step 3: Check for duplicate seriesName OR same prefix + suffix
      const isDuplicate = checkForDuplicateSeries(doc.series, newSeries);

      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message:
            "A series with the same name or same prefix & suffix already exists",
        });
      }

      // Step 4: Check if currentNumber is already used in vouchers
      const currentNumber = newSeries.currentNumber || 1;

      // Step 5: Push the new series into the existing series array
      doc.series.push({
        ...newSeries,
        currentNumber: newSeries.currentNumber || 1, // Default current number to 1 if not provided
        isDefault: false, // Not default unless explicitly set elsewhere
      });

      await doc.save();

      return res.status(200).json({
        success: true,
        message: "Series added successfully",
      });
    }

    // Step 5: No series document for this voucherType yet — create a new one
    const newDoc = new VoucherSeries({
      cmp_id,
      Primary_user_id: ownerId,
      voucherType,
      series: [
        {
          ...newSeries,
          currentNumber: newSeries.currentNumber || 1,
          isDefault: true, // First created series is set as default
        },
      ],
    });

    await newDoc.save();

    return res.status(201).json({
      success: true,
      message: "Series created successfully",
    });
  } catch (error) {
    console.error("Error creating voucher series:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating series",
    });
  }
};

// DELETE /api/sUsers/deleteVoucherSeries/:cmp_id
export const deleteVoucherSeriesById = async (req, res) => {
  const { cmp_id } = req.params;
  const { voucherType, seriesId } = req.body;

  if (!cmp_id || !voucherType || !seriesId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: cmp_id, voucherType, seriesId",
    });
  }

  try {
    const updatedDoc = await VoucherSeries.findOneAndUpdate(
      { cmp_id, voucherType },
      {
        $pull: {
          series: { _id: seriesId },
        },
      },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Voucher series not found or already deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Voucher series deleted successfully",
      data: updatedDoc,
    });
  } catch (error) {
    console.error("Error deleting voucher series:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// PUT /api/sUsers/editVoucherSeries/:cmp_id
export const editVoucherSeriesById = async (req, res) => {
  const { cmp_id } = req.params;
  const { seriesId, updatedSeries } = req.body;

 if (!cmp_id || !seriesId || !updatedSeries) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: cmp_id, seriesId, or updatedSeries",
    });
  }

  // 2. Validation: Prevent crash if seriesName is missing inside updatedSeries
  if (!updatedSeries.seriesName) {
    return res.status(400).json({
      success: false,
      message: "Series name is required",
    });
  }

  try {
    // First, find the document to check for duplicates
    const doc = await VoucherSeries.findOne({
      cmp_id,
      "series._id": seriesId,
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Series not found or company mismatch",
      });
    }

    // Check for duplicates using the separate function
    const isDuplicate = checkForDuplicateSeries(
      doc.series,
      updatedSeries,
      seriesId
    );

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message:
          "A series with the same name or same prefix & suffix already exists",
      });
    }

    const isNumberExists = await checkSeriesNumberExists(
      cmp_id,
      seriesId,
      updatedSeries.currentNumber,
      doc.voucherType
    );

    if (isNumberExists) {
      return res.status(409).json({
        success: false,
        message: `Series number ${updatedSeries.currentNumber} is already used in existing vouchers. Please choose a different starting number.`,
      });
    }

    // Proceed with the update if no duplicates found
    const updatedDoc = await VoucherSeries.findOneAndUpdate(
      {
        cmp_id,
        "series._id": seriesId,
      },
      {
        $set: {
          "series.$.seriesName": updatedSeries.seriesName,
          "series.$.prefix": updatedSeries.prefix || "",
          "series.$.suffix": updatedSeries.suffix || "",
          "series.$.currentNumber": updatedSeries.currentNumber || 1,
          "series.$.widthOfNumericalPart":
            updatedSeries.widthOfNumericalPart || 1,
          "series.$.under":updatedSeries.under
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Series updated successfully",
      series: updatedDoc.series,
    });
  } catch (err) {
    console.error("Edit series error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating series",
    });
  }
};

/// to make the series as currently selected so that it will be selected automatically in the next voucher creation
export const makeTheSeriesAsCurrentlySelected = async (req, res) => {
  const { cmp_id } = req.params;
  const { seriesId, voucherType } = req.body;

  try {
    // Fetch the current document
    const doc = await VoucherSeries.findOne({ cmp_id, voucherType });
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Voucher series not found",
      });
    }

    // Update each series: set the matching one to true, others to false
    doc.series = doc.series.map((s) => ({
      ...s.toObject(),
      currentlySelected: s._id.toString() === seriesId,
    }));

    // Save the updated document
    const updatedDoc = await doc.save();

    return res.status(200).json({
      success: true,
      message: "Series updated successfully",
      series: updatedDoc.series,
    });
  } catch (err) {
    console.error("Edit series error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating series",
    });
  }
};
