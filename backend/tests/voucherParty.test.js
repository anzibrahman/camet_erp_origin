import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Party from "../models/partyModel.js";
import Sales from "../models/salesModel.js";
import { resolveVoucherParty } from "../helpers/voucherPartyHelper.js";
const id = () => new mongoose.Types.ObjectId();
test("quick-created party gets the required sales snapshot account-group ID", async () => {
  const group = id(), original = { _id: id(), partyName: "Customer", accountGroup: group, billingAddress: "Custom address" };
  const resolved = await resolveVoucherParty(original, id(), id());
  assert.equal(resolved.accountGroup_id, group);
  assert.equal(resolved.billingAddress, "Custom address");
  assert.equal(original.accountGroup_id, undefined);
  const document = new Sales({ party: resolved, partyAccount: resolved.partyName, cmp_id: id(), Primary_user_id: id(), series_id: id(), usedSeriesNumber: 1, salesNumber: "SALE-1", date: new Date(), finalAmount: 100 });
  assert.equal(document.validateSync(), undefined);
});
test("populated group references retain the group ID and name", async () => {
  const group = id();
  const resolved = await resolveVoucherParty({ accountGroup: { _id: group, accountGroup: "Sundry Debtors" } }, id(), id());
  assert.equal(resolved.accountGroup_id, group);
  assert.equal(resolved.accountGroupName, "Sundry Debtors");
});
test("party-list snapshot remains unchanged without database lookup", async t => {
  t.mock.method(Party, "findOne", () => { throw new Error("Unexpected lookup"); });
  const original = { _id: id(), accountGroup_id: id(), accountGroupName: "Sundry Debtors" };
  assert.deepEqual(await resolveVoucherParty(original, id(), id()), original);
});
test("old drafts resolve missing group from the owning company's party master", async t => {
  const company = id(), owner = id(), party = id(), group = id(), session = {};
  let criteria, usedSession;
  t.mock.method(Party, "findOne", filter => {
    criteria = filter;
    return { session(value) { usedSession = value; return this; }, async lean() { return { accountGroup: group }; } };
  });
  const resolved = await resolveVoucherParty({ _id: party }, company, owner, session);
  assert.equal(resolved.accountGroup_id, group);
  assert.deepEqual(criteria, { _id: party, cmp_id: company, Primary_user_id: owner });
  assert.equal(usedSession, session);
});
test("missing group does not silently assign an unrelated account group", async t => {
  t.mock.method(Party, "findOne", () => ({ session() { return this; }, async lean() { return null; } }));
  await assert.rejects(resolveVoucherParty({ _id: id() }, id(), id()), /Set its account group/);
});
