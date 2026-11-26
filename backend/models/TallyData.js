import mongoose from "mongoose";

const tallySchema = new mongoose.Schema(
  {
    Primary_user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cmp_id: { type: mongoose.Types.ObjectId, ref: "Company", required: true },
    accountGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountGroup",
      required: true,
    },
    subGroup: { type: mongoose.Schema.Types.ObjectId, ref: "SubGroup" },
    party_name: { type: String, required: true },
    alias: { type: String },
    party_id: { type: mongoose.Types.ObjectId, ref: "Party", required: true },
    mobile_no: {
      type: Number,
      set: (v) => {
        if (v === "" || v === "null" || v === null) return null;
        const num = Number(v);
        return isNaN(num) ? null : num;
      },
    },
    email: { type: String },
    bill_date: { type: Date, required: true },
    bill_no: { type: String, required: true },
    billId: { type: String }, ///// id of the bill or voucher // not assigning object id because outstanding form tally does not have an object id
    bill_amount: { type: Number, required: true },
    bill_due_date: { type: Date },
    bill_pending_amt: { type: Number, required: true },
    user_id: { type: String },
    source: { type: String },
    from: { type: String },
    classification: { type: String },
    paymenttypeDetails: {
      cash: { type: String, default: "0" },
      bank: { type: String, default: "0" },
      upi: { type: String, default: "0" },
      credit: { type: String, default: "0" },
      card: { type: String, default: "0" },
    },
    // Cached total of active Adjustment allocations; updated in the same transaction.
    adjustmentAmount: { type: Number, default: 0, min: 0 },
    appliedReceipts: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "Receipt" },
        receiptNumber: { type: String },
        settledAmount: { type: Number },
        date: { type: Date },
      },
    ],

    appliedPayments: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
        paymentNumber: { type: String },
        settledAmount: { type: Number },
        date: { type: Date },
      },
    ],
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    createdBy: { type: String, default: "" }, ///if an outstanding is createdBy any vouchers are tagged here
    isCancelled: { type: Boolean, default: false },
    cantChange: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// ============= CRITICAL TALLY INDEXES FOR YOUR PARTYLIST QUERY =============

// **MOST IMPORTANT** - For your outstanding amount aggregation
tallySchema.index(
  {
    cmp_id: 1,
    Primary_user_id: 1,
    party_id: 1,
    isCancelled: 1,
    classification: 1,
  },
  {
    name: "tally_outstanding_main_idx",
    background: true,
  },
);

// **SECONDARY** - For receipt/payment voucher filtering
tallySchema.index(
  {
    cmp_id: 1,
    Primary_user_id: 1,
    isCancelled: 1,
    source: 1,
  },
  {
    name: "tally_source_filter_idx",
    background: true,
  },
);

// **AGGREGATION OPTIMIZATION** - For your $group operations
tallySchema.index(
  {
    party_id: 1,
    bill_pending_amt: 1,
    bill_date: -1,
  },
  {
    name: "tally_aggregation_idx",
    background: true,
  },
);

// Keep your existing indexes but add these optimizations
tallySchema.index({ Primary_user_id: 1, cmp_id: 1 });
tallySchema.index({ cmp_id: 1, party_id: 1 });
tallySchema.index({ cmp_id: 1, accountGroup: 1 });
tallySchema.index({ cmp_id: 1, billId: 1 }, { sparse: true });
tallySchema.index({ cmp_id: 1, bill_no: 1 });
tallySchema.index({ cmp_id: 1, subGroup: 1 }, { sparse: true });
tallySchema.index({ cmp_id: 1, bill_date: -1 });
tallySchema.index({ cmp_id: 1, bill_due_date: 1 });
tallySchema.index({ cmp_id: 1, bill_pending_amt: 1 });
tallySchema.index({ cmp_id: 1, isCancelled: 1 });

// **COMPOUND INDEX FOR COMPLEX QUERIES**
tallySchema.index({
  Primary_user_id: 1,
  cmp_id: 1,
  accountGroup: 1,
  isCancelled: 1,
  bill_date: -1,
});

// **PARTY OUTSTANDING SUMMARY** - Optimized for your aggregation
tallySchema.index({
  cmp_id: 1,
  party_id: 1,
  isCancelled: 1,
  bill_pending_amt: 1,
  bill_date: -1,
});

// Create a Mongoose model based on the schema
export default mongoose.model("Tally", tallySchema);
