import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { voucherCancelEndpoint } from "./voucherEndpoints.js";
const router = fs.readFileSync(new URL("../../backend/routes/secondaryUserRouters.js", import.meta.url), "utf8");
const routes = [...router.matchAll(/router\.put\(['"]([^'"]+)['"]/g)].map(match => match[1].toLowerCase());
for (const type of ["sales", "saleOrder", "creditNote", "debitNote", "performaInvoice"]) {
  test(type + " cancellation endpoint exists in the actual backend router", () => {
    assert.ok(routes.includes(("/" + voucherCancelEndpoint(type) + "/:id").toLowerCase()));
  });
}
