import mongoose, { Schema } from "mongoose";

const SeriesSchema = new mongoose.Schema({
  seriesName: { type: String, required: true },
  prefix: { type: String, default: "", trim: true },
  suffix: { type: String, default: "", trim: true },
  currentNumber: { type: Number, default: 1, min: 1 },
  widthOfNumericalPart: { type: Number, required: true, min: 1 },
  isDefault: { type: Boolean, default: false },
  currentlySelected: { type: Boolean, default: false },
  lastUsedNumber: { type: Number, default: 1, min: 1 },
  under: { type: String, trim: true },
});

const VoucherSeriesSchema = new mongoose.Schema(
  {
    Primary_user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cmp_id: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    voucherType: {
      type: String,
      required: true,
      enum: [
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
        "deliveryNote",
        "memoRandom",
      ],
    },
    series: [SeriesSchema],
  },
  { timestamps: true }
);

// ✅ Prevent duplicate voucherType per company
VoucherSeriesSchema.index({ cmp_id: 1, voucherType: 1 }, { unique: true });

// ✅ Fix OverwriteModelError
export default mongoose.models.VoucherSeries ||
  mongoose.model("VoucherSeries", VoucherSeriesSchema);
