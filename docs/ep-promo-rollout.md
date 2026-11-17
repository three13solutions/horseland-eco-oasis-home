# EP300: staged, unpublished website offer

## Scope

- One room is booked per current checkout. EP300 discounts ₹300 per occupied night **per room**, not per guest.
- It discounts the canonical nightly `room_only` component, across selected meal plans. It does not discount meals, extra-person accommodation, extras or the cancellation-policy adjustment.
- Each night's discount is capped at that night's room-only amount. Invalid/unknown EP bases fail closed; a stay with any legacy/mixed unverified night cannot use this coupon. The underlying no-coupon booking can still use its existing configured fallback.
- One promo code per checkout. No expiry, scarce usage quota, per-user restriction or unrequested dates have been invented.
- Current configured tax-tier selection is preserved on the original nightly tariff; tax uses the discounted subtotal. This preserves the existing tax policy rather than introducing new thresholds. Tax policy changes need separate review.

## Server and payment guarantees

The browser submits only code and quote selection. `calculateBookingQuote` looks up the release gate and offer server-side, validates canonical nightly EP evidence, and generates a discounted quote with the code, revision, nightly discount breakdown and original variant. The fingerprint includes promotion revision/amount. Payment preparation recomputes and compares the amount and fingerprint.

The existing checkout request/capability, immutable payment intent, hold/order ownership and unique finalization paths are retained. The promotion is recorded atomically as part of the accepted `quoteSnapshot` in the payment intent and finalized booking, not an independently incremented counter. Repeated or resumed payment never recalculates the accepted amount. A coupon cannot be changed within an already-reserved checkout. No payment-provider call is made by the offer-list/preview actions.

Draft code removes the old `HLTEST1` ₹1 new-order bypass. Existing retained payment intents keep their stored amount; no live endpoint is modified by this branch. Invoice rendering uses the actual saved promo, rather than labelling every adjustment HLTEST1.

## Rollout separation

Migration creates a default-OFF `website_promo_rollout` gate, inaccessible for writes by normal/admin browser clients. EP300 configuration is seeded, but this does not affect live prices or offers. The admin interface explicitly shows the release as OFF. Its enable/disable controls affect configuration only, not the release gate.

1. Review/ install staged schema on the intended preview database; preserve the OFF gate on a shared production database.
2. Mount `WebsitePromotionSettings` in the admin pricing navigation. Public offer selection appears only when the server confirms both inventory checkout and promo release enabled.
3. Verify server/frontend together on an isolated preview with a verified EP rate, new checkout, stale-price retry, close/reopen, retained order and payment confirmation. Do not use a live payment merely for QA.
4. Deploy reviewed Edge code and coordinate release activation with the approved frontend publication. Syncing GitHub/Lovable code does not deploy Edge Functions or enable the gate automatically.
5. Read back current gate/configuration and test a non-charging quote before reporting active.

No live deployment or gate activation was performed in this task.

## Verification

- `node --experimental-strip-types --test tests/ep-promo.test.mjs tests/booking-quote.test.mjs`
- `PGLITE_MODULE_PATH=<installed pglite module> node scripts/tests/ep-promo-db.mjs`
- App TypeScript and Vite build.
- Existing PaymentModal/invoice explicit-any ESLint errors predate this work; new admin component lint passes. Full test suite retains 39 pre-existing failures in legacy payment/publication tests.
