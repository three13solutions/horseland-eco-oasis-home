# Backend-only release — 19 November 2026

## Scope and live status

This release installs backend support without publishing the Lovable frontend or spending Lovable credits. **It is not the completed public age/meal rollout.**

- Promotion management, date/day/category/meal restrictions and conservative usage-cap accounting are installed.
- `DIRECT1000` remains active at INR 1,000 per booking; `EP300` remains active at INR 300 per eligible night. Both remain unlimited. No promotion amounts, status, revisions or caps were edited.
- Guest age policy and meal age pricing schema/helpers are installed **inactive**. The six existing pricing functions are untouched. Admin saves are blocked until coordinated activation. The staged frontend reports the inactive status rather than presenting new age pricing as live.
- Dietary variants are configuration-only. No records or prices were seeded; per-guest choice and dietary pricing in checkout remain deferred.
- Existing bookings and saved payment intents were not rewritten. No order, charge, booking or inventory hold was created by verification.

## Migration history

The six previously unapplied repository migrations were reconciled to the versions actually recorded by Supabase:

| Version | Migration |
|---|---|
| 20261119081007 | managed_website_promotions |
| 20261119081023 | promotion_booking_restrictions |
| 20261119081050 | promo_usage_caps |
| 20261119081127 | dynamic_guest_age_policy_dormant |
| 20261119081136 | meal_age_pricing_policy_dormant |
| 20261119081146 | meal_plan_dietary_variants |

All were applied with a five-second lock timeout. Original age/meal engine patches were moved out of automatic migrations into `scripts/activate-guest-age-meal-pricing.sql`.

## Edge deployment

| Function | Deployed version | JWT verification |
|---|---:|---|
| create-razorpay-order-v3 | 22 | unchanged: false; capability checks remain |
| create-manual-booking | 20 | unchanged: true; admin checks remain |
| finalize-booking-v3 | 18 | unchanged: false; capability/signature checks remain |
| admin-promotion-preview | 1 | true; user and admin checks |

The retired `verify-razorpay-payment-v2` endpoint was not re-enabled or replaced. New-quote revision validation only requires the new guest contract when the engine actually returns activated policy metadata. Existing saved-intent resume still uses its retained snapshot.

## Verification

- Full suite: **360 tests; 321 pass, 39 fail, zero skipped**. Failure names exactly match the 39 pre-existing baseline failures; no new failures. These existing failures are not a clean-suite claim.
- TypeScript app check and production build passed. `git diff --check` passed.
- New dormant-release tests verify unchanged six engine definitions, blocked inactive saves, anonymous status, explicit activation acknowledgement, seven-function backup, and reversible restoration.
- Existing age/meal active behavior tests still run after explicit isolated activation. Promotion/usage/dietary integration tests pass.
- Twenty-seven production quote cases were identical before/after, including full JSON/fingerprint hashes. Six yielded real eight-option quotes; 21 were already unavailable both before and after. This is preservation evidence, not full tariff coverage.
- The single existing booking and all five saved payment-intent full-row hashes matched before/after. No historical quote rows existed. No existing promo uses were present to backfill.
- Public offer listing returned both existing codes. Anonymous admin preview/manual booking calls returned 403 as expected. Both real promo quote calls returned 200: DIRECT1000 discounted INR 1,000 and EP300 discounted INR 300.
- Post-deployment database/function logs inspected without observed application errors in the checked window. Security advisors reviewed: intentional private RLS tables have no client policies; boolean release status is deliberately callable. Existing broader GraphQL/security-definer/auth/platform advisories remain separate hardening work.

## Remaining before public age/meal release

1. Verify the published/admin frontend is the matching release and exercise authenticated admin workflows, permissions and mobile layout.
2. Rehearse the activation script against real representative rates in a staging copy, including protected/legacy/festive and mixed stays. Synthetic tests and six live nonempty quotes do not replace this.
3. Coordinate frontend publication with the operator-only activation transaction. It requires `horseland.guest_age_meal_release = 'frontend-ready'`, snapshots original functions, patches both engines and sets the status atomically. Do not merely flip the status row.
4. Test new website/manual quotes, stale clients, saved checkout resumes, cap concurrency and payment completion using a suitable test environment. No live financial test was performed here.
5. Decide/enter the child meal percentage per plan after activation. **50% remains an available setting, not an activated default.**

## Recovery

Backend schema is additive; prefer a forward fix over deleting new tables or usage history. Private pre-deployment function/config/edge-source snapshots were retained by the deployment operator. Before age/meal activation, there is no engine change to roll back. The activation script captures seven original definitions in `guest_pricing_private.pre_activation_functions` and documents transactional rollback. Review for later independent changes and coordinate client behavior before restoring. Never rewrite historical payment/booking snapshots or clear usage reservations simply because an order appears old.
