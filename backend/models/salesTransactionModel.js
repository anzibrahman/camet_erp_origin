import mongoose from "mongoose";

// A committed request is replayed instead of creating another pair of vouchers.
const schema = new mongoose.Schema({
  cmp_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  Primary_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  Secondary_user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  requestKey: { type: String, required: true },
  payloadHash: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
schema.index({ cmp_id: 1, Primary_user_id: 1, Secondary_user_id: 1, requestKey: 1 }, { unique: true });
export default mongoose.models.SalesTransaction || mongoose.model("SalesTransaction", schema);
