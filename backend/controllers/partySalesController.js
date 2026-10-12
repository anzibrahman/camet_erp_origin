import mongoose from "mongoose";
import Sales from "../models/salesModel.js";
import Organization from "../models/OragnizationModel.js";
import SecondaryUser from "../models/secondaryUserModel.js";

export async function getPartySales(req, res) {
  try {
    const { cmp_id, partyId } = req.params;
    if (!mongoose.isValidObjectId(cmp_id) || !mongoose.isValidObjectId(partyId)) return res.status(400).json({ message: "Invalid company or party" });
    const [company, user] = await Promise.all([
      Organization.findOne({ _id: cmp_id, owner: req.owner, isBlocked: false }).lean(),
      SecondaryUser.findById(req.sUserId).lean(),
    ]);
    const assigned = user?.organization?.some(id => String(id?._id || id) === cmp_id) ||
      user?.configurations?.some(config => String(config.organization?._id || config.organization) === cmp_id);
    if (!company || !assigned) return res.status(403).json({ message: "Company access denied" });
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = 30;
    const filter = { cmp_id, Primary_user_id: req.owner, "party._id": partyId, isCancelled: { $ne: true } };
    const [data, total] = await Promise.all([
      Sales.find(filter).select("salesNumber date finalAmount party items selectedPriceLevel").sort({ date: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Sales.countDocuments(filter),
    ]);
    return res.json({ data, page, total, hasMore: page * limit < total });
  } catch (error) { return res.status(500).json({ message: "Unable to load this party's sales" }); }
}
