# MongoDB API cost audit — static investigation

Date: 2026-10-10. Scope: application source under `backend` and `frontend/src`; generated `frontend/dist` and dependency trees were excluded. No application code, indexes, or API contracts were changed.

## Method and limits

`backend/server.js:31-36` mounts six API prefixes. The seven route files contain 353 active `router.get/post/put/patch/delete` declarations (comments excluded). This is a source audit, not Atlas telemetry: request volume, document size, index usage, docs examined, and bytes transferred cannot be proven without Atlas Query Insights/profiler and `explain("executionStats")`. Severity below is evidence-based potential, not measured cost.

## Route inventory and ownership

| Prefix | Route file | Active routes | Controller modules reached |
|---|---|---:|---|
| `/api/sUsers` | `backend/routes/secondaryUserRouters.js` | 250+ | accounting, product, party, stock, hotel, restaurant, reports, settings |
| `/api/pUsers` | `backend/routes/primaryUserRoutes.js` | 12 | `primaryUserController` |
| `/api/admin` | `backend/routes/adminRoute.js` | 19 | `adminController`, `testingController` |
| `/api/tally` | `backend/routes/tallyRoute.js` | 30 | `tallyController` |
| `/api/kot` | `backend/routes/kotRoutes.js` | 1 | `restaurantController.cancelKot` |
| `/api/qz` | `backend/routes/qzRoutes.js` | 2 | `qzController` |

The source-of-record, line-numbered complete route map is the active declarations in: `backend/routes/adminRoute.js:32-67`, `backend/routes/kotRoutes.js:7`, `backend/routes/primaryUserRoutes.js:17-28`, `backend/routes/qzRoutes.js:9-10`, `backend/routes/secondaryUserRouters.js:106-481`, and `backend/routes/tallyRoute.js:32-65`. Some frontend URLs are dynamically constructed, so absence of a textual match is reported as “frontend caller not found”, not “unused”.

## Highest data-transfer risk

| Priority | Endpoint / frontend caller | Exact implementation and collections | Static evidence / likely call behaviour |
|---|---|---|---|
| P0 | `GET /api/sUsers/stockregisterSummary/:cmp_id` — `frontend/src/pages/voucherReports/stockRegister/StockRegisterDetails.jsx:60` | Route `secondaryUserRouters.js:126`; `getstockDetails`, `backend/controllers/stockController.js:9`. Collections: products, purchases, creditnotes, sales, vansales, debitnotes. | Lines 43-52 issue six whole-collection queries in parallel; five voucher queries have neither projection, limit, skip nor pagination. Each performs populate. The server then iterates all documents/items/godowns twice (lines 59-127, 149+). UI paging cannot reduce database transfer because paging occurs after all reads. This is the clearest Atlas egress and read-cost P0. |
| P0 | `GET /api/sUsers/getRestaurantSales/:cmp_id?checkInNumbers[]=…` — frontend caller not found in source | Route `secondaryUserRouters.js:466`; `getRestaurantSales`, `backend/controllers/hotelController.js:9706`. Collection: sales. | N+1 and duplicate-query bug: lines 9721-9731 execute the identical `salesModel.find` once per `checkInNumbers` element, each time using the entire array as `$in`. For N inputs it returns the same matching sales N times; response data is also duplicated N times. No projection/pagination. |
| P0 | `GET /api/sUsers/getKotDataDash/:cmp_id` — KOT dashboard `frontend/src/pages/Restuarant/Pages/KotPage.jsx:205-217` | Route `secondaryUserRouters.js:391`; `getKotDash`, `backend/controllers/restaurantController.js:683`. Collections: kots, sales, rooms/customers via populate. | `kotModal.find` is unbounded and returns full KOT docs with `items`, `kitchenBatches`, food-plan data (lines 699-713; schema `kotModal.js:56,115,168`). It adds an unbounded sales query (719-727). The dashboard has a 5s stale time, so normal React Query remount/focus defaults can refetch; no explicit interval was found. Existing `{cmp_id, createdAt}` index at `kotModal.js:187` helps date filtering, but not payload size. |
| P1 | `GET /api/sUsers/getKotData/:cmp_id` — `ParentKotPage.jsx:24`, `OrderCard.jsx:117` | Route `secondaryUserRouters.js:390`; `getKot`, `restaurantController.js:643`. Collection: kots plus populate lookups. | Full KOT docs, no `.select`, `.lean`, limit or pagination (655-668); default date bounds one day. The KOT schema contains arbitrary `items: []` and kitchen-batch arrays. |
| P1 | `GET /api/sUsers/getBookings/:cmp_id` — hotel booking/check-in/check-out list `frontend/src/pages/Hotel/List/BookingList.jsx:750-815` | Route `secondaryUserRouters.js:379`; `getBookings`, `hotelController.js:1428`; helper `hotelHelper.js:148-177`. Collections: bookings/checkins/checkouts, parties/rooms/price levels via populate. | Pagination exists only when client supplies a positive `limit`; helper uses `limit(0)` otherwise (163-176), which means no limit. Seven unprojected populates at 165-171 can transfer full referenced documents including `selectedRooms` arrays. Search is unanchored case-insensitive regex over four fields (`hotelHelper.js:110-127`). |
| P1 | `GET /api/sUsers/getProducts/:cmp_id` — stock register, barcode scan, voucher entry and sales pages; e.g. `StockRegister.jsx:75-76`, `BarcodeScan.jsx:74-75`, `VoucherAddCount.jsx:191-192` | Route `secondaryUserRouters.js:124`; `getProducts`, `productController.js:742`; helper `productHelper.js:300-324`. Collection: products plus Godown/PriceLevel populates. | Count + result query every request. If caller supplies `limit=0` it becomes unbounded (308-310). It returns full product documents, including price-level and godown/batch arrays, and populates full related docs without a select (315-322). Search is unanchored `/…/i` at 188-192. Product schema has no compound indexes declared for `{cmp_id, Primary_user_id, product_name}`. |
| P1 | `GET /api/sUsers/getAllProductsForExcel/:cmp_id` / `getItemsForExcel` — frontend caller not found for first; exports are on-demand | Routes `secondaryUserRouters.js:125,473`; `getAllProductsForExcel` `productController.js:818`; `exportItemsToExcel` restaurant controller. | Export is intentionally bulk, but no pagination and search is unanchored case-insensitive regex across three product fields (829-833). Keep it user-triggered, cap dates/rows, stream, and project only export fields. |
| P1 | `GET /api/sUsers/register` (KOT register) — page route `/sUsers/register`; direct caller not found by endpoint text | Route `secondaryUserRouters.js:446`; `getKotRegister`, `restaurantController.js:3865`. Collections: kots + rooms lookup. | No limit/pagination. `$match` is early, then lookup and two unwinds can expand one KOT into many output rows (3897-3916); computed-field regex search occurs only after expansion (3998-4013), then full sort (4015). |
| P1 | `GET /api/sUsers/sales-register` — `frontend/src/pages/secUsers/Reports/SaleRegisterPage.jsx:129-147` | Route `secondaryUserRouters.js:447`; `getSalesRegister`, `restaurantController.js:4030`. | Report endpoint returns `data.data` directly to page; source has no pagination in visible query path. Must test real date ranges and use explain. |

## Highest database-performance risk

1. **P0 stock register** — six large reads, full-document hydrate/populate and CPU-heavy nested loops. See above.
2. **P0 restaurant sales by check-in** — exactly N repeated sales reads and N duplicate result sets (`hotelController.js:9721-9734`). Query shape is `{cmp_id,isPostToRoom,"convertedFrom.checkInNumber":{$exists:true,$in:[…]}}`; no declared matching compound sales index. Recommend validating `{cmp_id:1,isPostToRoom:1,"convertedFrom.checkInNumber":1}` against explain and multikey constraints.
3. **P1 dashboard summary** — `GET /api/sUsers/getDashboardSummary/:cmp_id`, route `secondaryUserRouters.js:316`, controller `secondaryUserController.js:1750`. It executes separate fiscal-year aggregates over sales, purchases, invoices, receipts, payments, cash, bank, and TallyData (1756 onward). Existing voucher-model indexes `{cmp_id:1,date:-1}` help the main five, but cash/bank embedded-settlement paths need explain. The current frontend call is commented out in `DashboardSummary.jsx`, so no active source caller was found.
4. **P1 outstanding summary/list** — `GET /api/sUsers/getOutstandingSummary/:cmp_id` and `/fetchOutstandingTotal/:cmp_id`, routes 312 and 114; `outStandingController.js:13,112`. TallyData aggregates group and sort full company data. Existing Tally indexes include company/party/account-group/bill fields (`TallyData.js:120-141`), but no shown compound index covers every filter combination such as `{cmp_id,Primary_user_id,classification}`.
5. **P1 KOT report** — full document expansion + lookup/unwind + computed regex/sort, as above.

## Confirmed N+1 patterns

| Endpoint/operation | Evidence | Query multiplier |
|---|---|---|
| `GET /getRestaurantSales/:cmp_id` | `hotelController.js:9721-9731` | N identical sales queries; duplicate results N times. |
| Sale/order edit/create helper path | `backend/helpers/secondaryHelper.js:9-12,310-313,560-563,595-598,706-707,744-745` | one product lookup per deleted/added item; request writes may issue O(items) reads/writes. Used by sale controller paths such as `/createSales`, `/editsales`, `/editvanSale`. |
| Stock transfer create/edit | `backend/helpers/stockTranferHelper.js:24-25,155-156` | one `findById` per item. Routes `secondaryUserRouters.js:169-171`. |
| Sale-order creation/edit | `backend/helpers/saleOrderHelper.js:91-92` | one product lookup per invoice item. Routes `secondaryUserRouters.js:127,143`. |
| Checkout allocation | `backend/helpers/checkoutHelper.js:202-208,415` | one party lookup per payment source/allocation. Triggered by checkout routes, not a read-list API. |

These are genuine per-item database operations. They are write-path load rather than Atlas download risk, except where returned data is included in responses.

## Regex, populate, aggregation and document-size findings

- `GET /searchItems` uses unescaped, unanchored, case-insensitive `RegExp(search)` over four fields, permits one-character searches, has no debounce requirement server-side, and returns up to 100 full product docs with a PriceLevel populate (`restaurantController.js:195-237`). The UI has a debounce in `ItemList.jsx:51`; direct callers should be checked before relying on that protection.
- Party list is comparatively better: pagination defaults to 20 and lookups occur after skip/limit (`partyController.js:198-358`). But search is unanchored regex on `partyName`/`mobileNumber` (`246-247`); verify compound/filter indexes. Its outstanding query is batched, so it is not N+1.
- Booking list (`hotelHelper.js:162-177`) has seven full-document populates. The route uses paginated list semantics, but no hard server maximum was found.
- Product documents embed `Priceleveles` and `GodownList` (schema `productModel.js:81-104`); voucher documents embed `items`, each with godown/price-level structures; KOT documents embed `items`, `kitchenBatches.items`, and food plan details (`kotModal.js:56-175`). Full-document list reads should receive field projections based on their displayed columns.
- Full scans in active read code: `adminController.js:127-129` loads all primary users, organizations and secondary users; `adminController.js:463-465`, `486`, and `510+` are further unpaginated admin listings/populates. These are usually low-frequency but high-transfer as the tenant count grows.
- 40+ aggregation sites were found. The highest-concern static ones are the KOT register (`restaurantController.js:3896-4018`), hotel sales (`hotelController.js:4544+` with `$lookup`), summary/dashboard aggregates (`secondaryUserController.js:1756+`, `summaryController.js:191+`), and Tally outstanding aggregates (`outStandingController.js:17+`). `$match` is early in the KOT and hotel-sales pipelines, which is good; actual index use remains unknown until explain is run.

## Frontend call-frequency audit

- Confirmed polling: `TodaysTransaction.jsx:27-35` calls `GET /transactions/:cmp_id?todayOnly=true` every 5 minutes for admin users; normal users do not poll. Controller: `commonController.transactions` at `commonController.js:28`, collecting across voucher models. Severity: **P1 performance / P2 transfer** pending payload measurement.
- Confirmed polling: `DashboardCards.jsx:35-44` calls `GET /fetchDashboardCounts/:cmp_id` every 15 minutes. Controller `secondaryUserController.fetchDashboardCounts` at `2316`; count-only response makes transfer low, but operation frequency is medium.
- Search debounces were found in stock register (300 ms at `StockRegisterDetails.jsx:366`), product/restaurant UI (`RestaurantDashboard.jsx:882`, `ItemList.jsx:51`). No `refetchInterval` besides the two above; no source `setInterval` was found that calls an API. No evidence of an infinite API loop was found.

## Index review

Existing useful declarations include `{cmp_id:1,date:-1}` across sale/purchase/invoice/receipt/payment models, sales `{cmp_id:1,"convertedFrom.voucherNumber":1}`, KOT `{cmp_id:1,createdAt:1}`, and extensive TallyData indexes (`backend/models/salesModel.js:399-421`, `kotModal.js:187`, `TallyData.js:120-141`).

High-risk gaps or mismatches to validate (do not add until explain confirms):

| Query shape | Existing evidence | Candidate to test |
|---|---|---|
| Product list/search `{cmp_id,Primary_user_id,product_name regex}` plus sort product_name | no schema-level product compound index found | `{cmp_id:1,Primary_user_id:1,product_name:1}`; regex only benefits if prefix/anchored and collation matches |
| Restaurant sales by check-in `{cmp_id,isPostToRoom,"convertedFrom.checkInNumber"}` | sales index only covers converted voucher number | `{cmp_id:1,isPostToRoom:1,"convertedFrom.checkInNumber":1}` |
| KOT `{cmp_id,createdAt,status}` | `{cmp_id,createdAt}` exists | test whether `{cmp_id:1,status:1,createdAt:-1}` wins for status/date reports; `$ne` has limited selectivity |
| Booking search/filter/sort | booking indexes exist, but helper filters include regex and `createdAt` sort | profile actual modal-specific filters before selecting a compound index |

## Prioritized next actions

- **P0:** Capture `explain("executionStats")` and response byte size for stock register; redesign it around server-side aggregation/cursor pagination and projections before any index change.
- **P0:** Correct `getRestaurantSales` to perform one query for all check-in numbers, deduplicate results, and project the fields consumed. Add regression coverage for input length >1.
- **P1:** Apply capped limits + projection to KOT, booking, product and report endpoints; reject accidental unbounded `limit=0` for interactive endpoints.
- **P1:** Profile KOT register and hotel/Tally reports using worst-case date ranges. Add pagination or export-only asynchronous/streaming behavior.
- **P2:** Replace user-entered unanchored regex with normalized prefix search or Atlas Search, require 2–3 characters, escape values, and keep UI debounce.
- **P2:** Batch product/party reads in write helpers (`secondaryHelper`, stock transfer, sale order, checkout) with `$in` + maps/bulk operations.
- **P3:** Paginate admin lists and select list columns. Review broad 100 MB Express body limits in `backend/server.js:23-26` separately from MongoDB read cost.

## Top 5 APIs to investigate first

1. `GET /api/sUsers/stockregisterSummary/:cmp_id` — Stock Register details — P0 — capture execution stats and payload size for a typical and a one-year range.
2. `GET /api/sUsers/getRestaurantSales/:cmp_id` — caller not found — P0 — reproduce with 2+ check-ins to confirm duplicated query/results, then replace with one `$in` query.
3. `GET /api/sUsers/getKotDataDash/:cmp_id` — KOT Dashboard — P0/P1 — measure daily/range payload and remount/refetch count; define list projection and a max date range.
4. `GET /api/sUsers/getBookings/:cmp_id` — Booking/Check-in/Check-out List — P1 — inspect request limits from every UI caller and profile populated response bytes.
5. `GET /api/sUsers/register` — KOT Register — P1 — run explain with high-item KOTs and a broad date range; establish pagination/export boundaries.
