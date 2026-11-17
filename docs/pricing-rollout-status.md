# Pricing rollout status — 17 November 2026

## Verified live change

`create-manual-booking` Edge Function was updated from version17 to version18. This was an exact hosted-source patch, not the full draft branch. Authentication/JWT requirements and entrypoint were unchanged. Only two conditions changed:

1. Preserve canonical totals for `pricing_mode=mixed_verified_and_legacy`, rather than applying the old database-base-price fallback.
2. Reject separately selected buffet meals already included in a mixed-stay plan.

Nineteen tests of the exact patched bundle passed. Hosted source was read back and matched the submitted files byte-for-byte; version18 is ACTIVE and `verify_jwt=true`. No booking was created as a test. The guest website checkout Edge Function was not deployed, and the promotional release was not enabled.

## Not yet completed at this checkpoint

Database migrations/activation, final GitHub main sync, Lovable preview verification and frontend publication have not yet been verified. No claim of completed rates or live shared-meal pricing follows from the Edge compatibility patch.

The broader draft includes promo checkout implementation, but that is separate from this narrow live compatibility patch. Do not deploy the full branch's Edge code accidentally when reproducing the patch.

## Activation paused for latest instruction

Before any database write, the user expanded preservation to other categories and dates outside the approved EP schedule. The prepared release was not submitted. Preservation policy and tests must be revised before activation. The old AP-protection waiver is superseded; do not deploy the earlier activation fragment unchanged.

## First atomic activation attempt

The expanded preservation release reached its in-transaction live-data assertions but failed on the original Standard festive EP quote for 3 adults, 1 child and 1 infant (24–25 December, non-refundable, original7107.1875). The transaction aborted. Readback confirmed that no staged meal schema, day-rule table, preservation table or approved EP anchors exist, and public plan supplements remain RO0/BB150/HB550/FB1000. No partial database activation occurred. The exact-data discrepancy is being corrected before retry; the manual Edge compatibility patch remains live.

## Successful database activation and readback

Migration `20261117123958_coordinated_policy_backed_ep_meal_weekend_release` applied successfully after preserving legacy fractional-paise policy representation. The in-transaction assertions verified64 festive EP quotes and41 outside-scope cases before commit.

Readback confirmed:
- Shared workspace mode `live`,15 catalogue meals and4 canonical plans; actual server response passes the client parser.
- Supplements per person/night: EP0, CP270, MAP920 (breakfast+dinner), AP1510 (including high tea).
-16 approved EP anchors for17 Nov–23 Dec2026 and2 Jan–31 Mar2027. Fri/Sat/Sun sample quotes verified2000/3500/2000 Basement,2500/4500/2500 Standard,3500/6000/3500 Deluxe,5500/8000/5500 Superior.
- Saturday-only weekday rule from17 Nov2026, with protected policies retaining prior room-specific day semantics.
-4 festive EP-only preservation policies;19 full-pricing preservation policies for other categories/dates, including categories that remain unavailable.
- Booking/payment row counts and server-side content hashes exactly match the preflight; existing booking/payment snapshots were unchanged.

Migration `20261117124222_ep_promotion_disabled_release` then installed EP300 configuration at₹300/night. Readback confirms release gate `false`; this is not a live redeemable offer yet. Guest checkout Edge remains unchanged.

The original components are retained under `scripts/pricing-migrations` for isolated tests. Only the two actual applied release versions live in `supabase/migrations`, preventing component reapplication by a future migration push.

Checks:70 meal SQL,146 combined representative,210 actual-data pricing assertions,18 promo SQL,19 exact hosted manual-bundle tests pass. Full Node suite248 pass/39 unchanged baseline failures. TypeScript/build pass. Browser interaction QA remains unavailable in this executor.

## Promo completion after explicit activation authorization

The user authorized coupon creation/redemption and live backend operation. `create-razorpay-order-v3` version19 was deployed and all9 submitted source files read back exactly. Existing JWT setting remainsfalse; checkout capabilities, provider secrets and six existing distribution dependencies retain their prior logic. A retained-only normalization keeps previously bound HLTEST1 ₹1 retry requests valid without creating any new test discount.

The EP300 release gate was then enabled. Live non-charging verification:
- Offers list returns EP300.
- Old published UI's promo-only request is rejected400, never `valid:true` or ₹1.
- New canonical two-night CP quote gets₹600 off its room-only component;₹1,080 meals remain unchanged. Verified subtotal₹5,980, tax₹299, total₹6,279.
- No payment/session/prepare action was invoked for verification. Booking/payment hashes remain unchanged.

The new preview can use EP300 now, and publishing its frontend requires no later promo switch. The new public API is technically reachable before frontend publication, explicitly accepted during activation; the old published UI cannot use its missing full-quote contract. No publication action was performed.

61 focused tests and10 tests against the exact deployment bundle pass. Visual/interactive browser verification remains blocked by the available runtime, and no real transaction has been tested.

Further live checks confirmed five guests still receive₹600 for two nights (not per-person); protected festive/out-of-schedule pricing rejects EP300; HLTEST1 cannot create a new discount. Full suite after retained-request guard update:291 tests,252 pass,39 unchanged baseline failures. Browser worker independently reported unavailable runtime; no visual/interactive pass is claimed.
