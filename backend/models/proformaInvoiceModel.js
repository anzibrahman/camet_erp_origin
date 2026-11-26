import mongoose from "mongoose";
import Sales from "./salesModel.js";
// Reuse the sales schema, keeping preliminary documents out of the sales ledger.
export default mongoose.model("ProformaInvoice", Sales.schema.clone());
