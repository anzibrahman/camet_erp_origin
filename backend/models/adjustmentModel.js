import mongoose from "mongoose";
const { Schema } = mongoose;
const schema = new Schema({
  Primary_user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cmp_id: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  party_id: { type: Schema.Types.ObjectId, ref: "Party", required: true },
  saleId: { type: Schema.Types.ObjectId, ref: "Sales", required: true },
  creditNoteId: { type: Schema.Types.ObjectId, ref: "CreditNote", required: true },
  saleOutstandingId: { type: Schema.Types.ObjectId, ref: "Tally", required: true },
  creditNoteOutstandingId: { type: Schema.Types.ObjectId, ref: "Tally", required: true },
  allocatedAmount: { type: Number, required: true, validate: v => Number.isFinite(v) && v > 0 },
  status: { type: String, enum: ["active", "reversed"], default: "active", required: true },
  createdBy: { type: Schema.Types.ObjectId },
  reversedAt: Date,
  reversedBy: { type: Schema.Types.ObjectId },
  reversalReason: String,
}, { timestamps: true });
schema.index({ cmp_id: 1, saleId: 1, status: 1 });
schema.index({ cmp_id: 1, creditNoteId: 1, status: 1 });
schema.index({ saleOutstandingId: 1, creditNoteOutstandingId: 1 }, {
  unique: true, partialFilterExpression: { status: "active" },
});
export default mongoose.model("Adjustment", schema);
