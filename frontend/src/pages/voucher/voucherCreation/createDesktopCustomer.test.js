/* eslint-env node */
import test from "node:test";
import assert from "node:assert/strict";
import { createDesktopCustomer } from "./createDesktopCustomer.js";

test("quick customer creation uses the company's Sundry Debtors ID and trimmed name", async () => {
  const calls = [];
  const api = {
    get: async (url, options) => {
      calls.push({ url, options });
      return { data: { data: [{ _id: "creditors", accountGroup: "Sundry Creditors" }, { _id: "debtors", accountGroup: "Sundry Debtors" }] } };
    },
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      return { data: { result: { _id: "new-customer", partyName: body.partyName, accountGroup: body.accountGroup } } };
    },
  };
  const customer = await createDesktopCustomer(api, "company", "  New Customer  ");
  assert.equal(calls[0].url, "/api/sUsers/getAccountGroups/company");
  assert.equal(calls[1].url, "/api/sUsers/addParty");
  assert.deepEqual(calls[1].body, { cpm_id: "company", partyName: "New Customer", accountGroup: "debtors", openingBalanceAmount: 0, isHotelAgent: false });
  assert.equal(calls[1].options.withCredentials, true);
  assert.equal(customer._id, "new-customer");
  assert.equal(customer.accountGroup_id, "debtors");
  assert.equal(customer.accountGroupName, "Sundry Debtors");
  assert.equal(customer.partyType, "party");
  assert.equal(customer.totalOutstanding, 0);
});

test("missing Sundry Debtors never sends a create request", async () => {
  let posts = 0;
  const api = { get: async () => ({ data: { data: [] } }), post: async () => { posts++; } };
  await assert.rejects(createDesktopCustomer(api, "company", "Customer"), /Sundry Debtors is not configured/);
  assert.equal(posts, 0);
});

test("blank customer names do not call the API", async () => {
  await assert.rejects(createDesktopCustomer({}, "company", "  "), /Enter a customer name/);
});

test("failed creates propagate without selecting a fabricated customer", async () => {
  const api = {
    get: async () => ({ data: { data: [{ _id: "debtors", accountGroup: "Sundry Debtors" }] } }),
    post: async () => { throw new Error("Unable to save customer"); },
  };
  await assert.rejects(createDesktopCustomer(api, "company", "Customer"), /Unable to save customer/);
});
