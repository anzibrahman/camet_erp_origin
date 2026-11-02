> Update after the remaining-quantity fix: the cumulative-return defect described below is now covered by passing regression tests. The full suite now has 230 passing tests. Sold quantity remains visible, remaining availability is calculated from active saved credit notes, and the product review supports tick/untick within that balance. The previous production build dependency failure and live-UI testing limitations are not resolved by this change. The rest of this report records the earlier QA run.

# Sales and Credit Note QA — 2 November 2026

## Result

**Not all checks pass. One additional business-rule regression test fails, and the production build fails.**

- Existing automated suite: **220 passed, 0 failed**.
- Focused return/payment/stock subset rerun: **130 passed, 0 failed** (included within the existing suite, not extra unique tests).
- New cumulative-return checks: **2 passed, 1 failed**.
- No application source changes were made during this QA request. The additional test is in `tmp/credit-note-qa-cumulative.test.mjs`.

## Confirmed failure: cumulative returns exceed original quantity

1. An original sale contains 10 units of Product A.
2. A previously saved, active credit note returns 6 units.
3. A new return requests another 6 units against the same original sale/product.
4. Expected: reject the request because only 4 units remain returnable.
5. Actual: `validateTransactionProducts` accepts the request; the test fails with **Missing expected rejection**.

The validator compares the current request with the original sold quantity. It does not subtract quantities in prior active credit notes. The party-sales API also returns original sale items without remaining-return quantities. This can allow 12 units to be returned against 10 sold across separate saves. These checks use mocked database boundaries and execute the real validation function; this was not a write to a live customer account.

Evidence: `tmp/credit-note-qa-cumulative.log`.

## Production build failure

`npm run build` fails because Vite/Rollup cannot resolve `qz-tray`, imported by `frontend/src/pages/Restuarant/Pages/RestaurantDashboard.jsx`.

This prevents a successful production build in the current workspace. It is a separate build/dependency issue from the cumulative-return defect. Evidence: `tmp/credit-note-qa-build.log`.

## What passed in automation

- Sale and return totals are calculated independently.
- Zero, partial, and full payments preserve the correct new-sale balance.
- Split cash/bank receipts link to the new sale, update outstanding, and create settlement records without duplicate direct sale settlements.
- Credit notes adjust selected original sales independently of new-sale receipts.
- Unpaid, partly paid, and fully paid original invoices; excess remaining credit.
- Removed source invoices are excluded; older credit notes stay untouched.
- Sale, credit-note, receipt, reference-link and adjustment failure rollback paths.
- Retry request IDs prevent duplicate committed vouchers.
- Unauthorized accounts, wrong customer/company/product and cancelled source checks.
- Return quantities, zero/negative/over-limit inputs, source reductions and merging.
- Tax, discount, alternate-quantity and stock calculation helper cases.

These are function/controller/model-boundary tests. They do not establish that every UI or real database case succeeds.

## Status of the earlier 50 manual cases

The following numbers refer to the checklist previously provided in this chat.

| Cases | Evidence available | Status |
|---|---|---|
| 1–9, 12–13 | Customer scoping, draft merging, reductions, source exclusion and quantity validation tests | Automated logic passes; actual modal actions unverified |
| 10–11, 14 | Cancel behavior, layout and responsive button spacing | Live UI not tested |
| 15–21 | Separate totals, zero/partial/full receipt, excessive-payment and account-validation tests | Automated logic passes; live UI/database not tested |
| 22–23 | Recalculation code reviewed; calculation helper tests exist | Exact edit-after-payment and charge UI sequences not tested |
| 24 | Separate payment screen now uses combined save; submission helper tests pass | Exact browser navigation/save not tested |
| 25–34 | Return-only/sale-only, original-source adjustments, paid-source and surplus-credit tests | Automated logic passes; live database not tested |
| 35–43 | Real posting helpers exercised against mocked model boundaries; amount/stock helpers pass | Automated logic passes; saved report/UI verification not tested |
| 44 | Refresh and reopen persistence | Live UI/database not tested |
| 45 | Same-request retry/controller protection tests | Automated retry checks pass; actual double-click not tested |
| 46 | Failure/pending-state helper tests | Actual network-disconnection UI sequence not tested |
| 47 | Unchanged-request replay and rollback tests | Automated logic passes; response-loss browser sequence not tested |
| 48 | Series restrictions and rollback tests; configuration path reviewed | Exact missing-receipt-series browser case not tested |
| 49 | Cancelled-source validation and transaction rollback tests | Automated logic passes; concurrent browser cancellation not tested |
| 50 | Empty-input and saved-return checks | Automated logic passes; post-save browser click not tested |
| Additional cumulative-return case | Real backend validator with prior-credit-note fixtures | **FAIL** |

## Live-test limitations

- Browser automation failed to initialize: `failed to write kernel assets: The system cannot find the path specified. (os error 3)`.
- A frontend listener was detected on port 5173.
- The expected development API on port 7000 was not listening.
- No actual customers, sales, receipts, credit notes or stock balances were changed during this test run.

## Re-run commands

```powershell
node --test backend/tests/*.test.js frontend/utils/*.test.js frontend/src/pages/voucher/voucherCreation/*.test.js frontend/src/components/common/touchKeyboard/*.test.js
node --test tmp/credit-note-qa-cumulative.test.mjs
```

The cumulative-return test intentionally remains failing to document the current defect.
