# Camet ERP local project gap review

Reviewed 2026-09-21. Scope: local repository architecture, startup configuration,
API route protection, selected KOT/hotel flows, offline support, tests and operational
documentation. This is a static review, not an exhaustive audit of every screen or
a live penetration test. No API mutation was executed and no application code was
changed during this review. External deployment controls and database configuration
were not available for verification. Environment secret values were not read.

## Confirmed high-priority defects

1. **Failed KOT saves clear the order and display success.**
   `frontend/src/pages/Restuarant/Pages/RestaurantDashboard.jsx:1247` clears items,
   customer/room state and displays a success toast inside `finally`, including
   when the POST fails. The catch at line 1246 also assumes `error.response` exists,
   which is not true for a network failure. Move success-only cleanup after a
   confirmed save; retain the draft on error; handle network errors safely.

2. **Sensitive routes are exposed without authentication middleware.**
   `backend/routes/kotRoutes.js:8` exposes KOT cancellation. This router is mounted
   publicly in `backend/server.js`. `cancelKot` writes using the supplied record ID
   before any user verification (`backend/controllers/restaurantController.js:807`).
   Other confirmed examples are `/transferKotBills/:cmp_id` and `/deleteAdvance/:id`
   in `backend/routes/secondaryUserRouters.js:450`. Their controllers perform writes
   without authenticating the caller internally. Add authentication, relevant
   permissions, and company membership checks before these operations. Public login
   routes are expected; business mutation routes require separate review.

3. **Company isolation is incomplete in the reviewed paths.**
   `backend/middlewares/authCompany.js` checks whether a company is blocked, not
   whether the current user can access it. KOT cancellation updates by ID only;
   bill transfer also updates a KOT by ID only, although it receives a company ID
   (`backend/controllers/restaurantController.js:4565`). Validate membership and
   scope all record lookups/updates to that authorized company. Authentication alone
   is insufficient for a multi-company system.

4. **Database connection secrets can reach logs.**
   `backend/config/db.js:5` and `:9` print the complete MongoDB URI. Remove these
   statements and use redacted operational logging. Actual logged values were not
   inspected. Review existing log access/retention if credentials were included.

## Other confirmed defects and incomplete implementation

5. **Permission middleware is disconnected and uses the wrong request field.**
   `backend/middlewares/checkPermission.js:8` reads `req.userId`, while secondary
   authentication sets `req.sUserId` (`authSecUsers.js:23`). No uses of this middleware
   were found outside its own definition. Correct the identity contract and apply
   authorization consistently; do not rely on hidden frontend buttons.

6. **Production frontend serving points outside this project with the root start command.**
   Root `package.json` starts `backend/server.js` from the project directory.
   `backend/server.js:45` resolves that working directory, then moves up one level
   before looking for `frontend/dist`. The repository's frontend is inside the
   project. Resolve the static directory relative to the server module or configure
   it explicitly. A custom external deployment working directory could mask this.

7. **Cancellation mixes committed state and email delivery failures.**
   `backend/controllers/restaurantController.js:801` commits cancellation before
   emailing. Its no-owner-email branch sends a response without returning, then
   continues toward sending mail and another response. A notification failure can
   therefore produce an error after cancellation already succeeded. Return exactly
   once and isolate notification status/retries from the business mutation.

8. **Admin notifications are placeholders.**
   `frontend/src/components/admin/AdminHeader.jsx:19` contains a static notification
   list, including a successful backup message. Replace these with actual events or
   clearly label them as demonstration data. This message is not evidence that
   backups run.

## Missing for genuine no-internet operation

The PWA setup in `frontend/vite.config.js` precaches application assets. This does
not make server-dependent ERP transactions work offline. `frontend/src/main.jsx`
creates an ordinary in-memory QueryClient; KOT saving directly calls the API.

No implementation was found for:

- Durable offline master data and draft/order storage (IndexedDB or equivalent).
- A durable pending-write queue with clear pending/synced/failed states.
- Reconnection replay, duplicate prevention and idempotency keys for retries.
- Conflict handling between devices, concurrent quantity changes and table state.
- Offline numbering and reconciliation with server-issued voucher numbers.
- A defined offline authentication/expiry policy and protected device data.
- Offline status indicators and consistent unavailable-action behavior.
- Automated network-loss/recovery and browser-restart scenarios.

The hotel's `bookingType: "offline"` is a booking classification; it does not
implement offline networking. A local/LAN server deployment is a different design
from browser-only offline mode: it needs a documented local backend/database and
operational setup. The current API development URL uses localhost, but the actual
database hosting location was not verified.

## Engineering/operations gaps not found in this repository

- Business regression tests for KOT, booking, billing, payments and authorization.
  The discovered executable tests cover the added touch-keyboard editing helper;
  a file named `testingController.js` is not an automated test suite.
- Automated CI configuration and a reproducible test command for business logic.
- Project-specific setup/deployment instructions and an environment-variable example.
  Root README is empty; frontend README is the Vite template. The keyboard feature
  has its own documentation, but that does not cover operating the ERP.
- Backup scheduling and a tested restore procedure. These could exist externally;
  their absence from the repository does not prove the database is unbacked-up.
- Central API error handling and a health/readiness endpoint in the server entry.
- An explicit credentialed CORS origin allowlist: `backend/server.js:23` reflects
  request origins with `credentials: true`. Restrict it to intended deployments and
  review cookie/CSRF protections together; no exploit was attempted.

## Suggested order of work

1. Fix unauthenticated mutations and company isolation; stop secret logging.
2. Preserve KOT drafts on save failure and separate email errors from cancellation.
3. Wire and test permissions; correct startup/deployment paths.
4. Add regression tests, operational documentation and restore verification.
5. Choose the offline model (local/LAN server or browser offline writes) before
   implementing persistence, synchronization, numbering and conflicts.

Business features cannot be declared missing solely from route names. Bookings,
check-in/out, night audit, KOT, payments, accounting vouchers and reports already
have implementations. Their correctness/completeness needs authenticated scenario
testing against an agreed requirements checklist.
