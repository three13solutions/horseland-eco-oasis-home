# Guest age policy and promotion management: review branch

This change is repository-only. No production migrations, edge deployment, or website publication were performed. The owner subsequently authorized syncing the completed source to main. The owner authorized GitHub implementation after the archived planning input was drafted.

## Implemented scope

- Pricing → Guest Age & Pricing Policy: versioned age bands, contiguous-boundary validation, separate accommodation/meal behavior, review/save, revision conflict protection. Initial policy is ages 0–3 free for accommodation and automatic meals, 4–9 existing child accommodation/full meals, 10+ existing adult accommodation/full meals.
- Shared selectors and category/manual booking retain actual party counts. Category booking no longer converts mattresses or children to adults; extra mattress choices are explicit, unpriced requests. Extra services remain independently priced.
- Authoritative pricing policy metadata is attached to new quote snapshots. Existing booking/payment rows are not rewritten. Policy changes must be re-reviewed rather than silently interpreting an old selection under new age boundaries.
- Promo Codes: per-code create/edit, fixed/percentage accommodation discount, per-booking/per-night basis, booking and occupied-stay validity, weekday/weekend/both, explicit mixed-night choice, public/private, enable/disable, search, review and revision checks. Existing EP300 and DIRECT1000 amounts, status and unrestricted default conditions are preserved.
- Day eligibility uses the existing effective-dated, room-aware weekend calendar. Once-per-booking offers cannot select eligible-nights-only behavior. Restricted offers require an explicit whole-stay or eligible-night setting rather than an invented default.
- Public offers communicate restrictions; the list itself is not stay-filtered. Applying an offer validates the specific booking on the server.

## Extended promo scope, subsequently requested

The review branch now includes optional room-category and meal-plan eligibility, total/per-email usage caps, minimum stay, excluded occupied dates, and an admin monetary preview of an unsaved draft using the same server quote/tax engine. Fields remain unrestricted/unlimited on existing codes unless deliberately edited. Enabling requires a successful current preview and a terms review in the admin UI.

Usage is reserved atomically in the payment-intent/inventory transaction, before provider order creation, under a promotion row lock. Historical payment-intent promo snapshots are captured into a private usage ledger. Retried intents do not consume another use. Captured bookings mark usage redeemed. Confirmed cancellation does not restore it. An uncertain or still-payable order retains its reservation: there is deliberately no blind timeout release. A quote or admin preview consumes nothing.

Per-guest usage means normalized contact email, not verified human identity. Different email addresses can bypass a per-person interpretation; the UI discloses this. Missing historical email prevents enabling that cap until reconciled. True multi-session concurrency and payment reconciliation must be tested in staging; PGlite queues a single connection and is not production concurrency proof.

Individual meal/DOB choices and broader occupancy redesign remain outside these promo changes. The subsequently requested meal administration is described in docs/meal-age-variants-rollout.md. The child meal rate has NOT been changed to 50%.

## Deployment prerequisites

1. Review all new migrations against a staging copy of the current database. The age migration guards canonical function text and aborts if its expected pricing implementation has changed; do not remove those guards to force a rollout.
2. Run complete pricing regression cases with real staging rates for normal, Saturday, protected/festive and mixed/fallback dates. Verify actual vs chargeable counts, tax/promo ordering and unchanged historic booking snapshots.
3. Deploy the reviewed admin-promotion-preview edge function, checkout code and frontend together with the approved migration sequence. Do not publish this frontend alone: it requires the new policy RPCs. Do not assume a GitHub branch appears in the Lovable production preview.
4. Test authenticated admin authorization, invalid/overlapping bands, revision races, offer expiry and boundaries in Asia/Kolkata, private offers and mixed stays.
5. Complete desktop/mobile interactive tests for each entry point, payment interruption/retry, confirmation, and retained-order snapshots. No real booking or payment is needed for quote-only tests.

## Validation limitations

The baseline repository suite has 39 existing failures (297 tests: 258 passing). These primarily concern older checkout/publication paths. The existing npm lockfile omits two declared Lovable Vite packages, so npm ci fails before compilation; local verification installed dependencies with --package-lock=false, leaving that unrelated lockfile unchanged. Build chunk-size warnings are also pre-existing. SQL isolated tests are not a substitute for real staging quote integration or browser validation.

## Verified in this review branch

- Application TypeScript: `npx tsc -p tsconfig.app.json --noEmit` passed.
- Production Vite build passed, with existing large-chunk warning.
- Isolated PostgreSQL age migration test executed against six captured function definitions (code only, no guest data). It checked policy permissions, validation, immutable revisions and canonical synthetic quotes across meal plans/day scopes. Full real Supabase/legacy pricing execution remains unverified.
- Run isolated database tests by installing `@electric-sql/pglite@0.3.14` in a temporary directory and setting `AGE_POLICY_PGLITE_MODULE` to its `dist/index.js`. Without that environment variable, the isolated DB test is explicitly skipped.
- Policy versions take effect on new quotes when saved; scheduled future-effective policy dates are not implemented.
- Final full test run with both isolated PostgreSQL modules enabled: **317 tests, 278 passed, 39 failed, 0 skipped**. The failing test names match the baseline; new tests pass.
- The promo isolated PostgreSQL migration test passed authorization, existing-code preservation, revision, invalid-setting, calendar, audit and privilege checks. Set `PROMO_PGLITE_MODULE` to the same temporary PGlite module to include it.
- Full ESLint is not green: **482 errors and 59 warnings**, identical totals on the unchanged baseline checkout. This branch does not claim repository-wide lint cleanliness.

## Promo extension validation checkpoint

The full suite with isolated SQL enabled now has **347 tests: 308 passed, 39 baseline failures, no skips**. Application TypeScript and production build passed. The SQL wrapper chain for all three promotion migrations was executed in isolated PostgreSQL, including cap edits and omission/clearing behavior. Separate actual trigger tests verify reservations, rollback on cap rejection, retry idempotency, historical usage, normalized email, policy changes and still-payable-state retention. Admin preview accepts an explicit simulated booking date, so future scheduled offers can be reviewed without bypassing production date windows.
