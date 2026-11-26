import mongoose from "mongoose";
import Party from "../models/partyModel.js";

// Quick-created parties use accountGroup; voucher snapshots use accountGroup_id.
export async function resolveVoucherParty(party, orgId, ownerId, session = null) {
  if (!party || typeof party !== "object") throw new Error("Select a party before saving the voucher");
  const existingId = party.accountGroup_id?._id || party.accountGroup_id;
  if (mongoose.isValidObjectId(existingId)) return { ...party, accountGroup_id: existingId };
  let groupId = party.accountGroup?._id || party.accountGroup;
  if (!mongoose.isValidObjectId(groupId) && mongoose.isValidObjectId(party._id)) {
    const master = await Party.findOne({ _id: party._id, cmp_id: orgId, Primary_user_id: ownerId }).session(session).lean();
    groupId = master?.accountGroup?._id || master?.accountGroup;
  }
  if (!mongoose.isValidObjectId(groupId)) {
    throw new Error("The selected party has no valid account group. Set its account group in Party settings and select it again.");
  }
  return {
    ...party,
    accountGroup_id: groupId,
    ...(party.accountGroup?.accountGroup ? { accountGroupName: party.accountGroup.accountGroup } : {}),
  };
}

// Run before controllers capture request fields or start stock/accounting writes.
export async function prepareVoucherParty(req, res) {
  try {
    req.body.party = await resolveVoucherParty(req.body.party, req.body.orgId || req.body.cmp_id, req.owner);
    return true;
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
    return false;
  }
}
