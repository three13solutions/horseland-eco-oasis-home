# Meal Management links and independent guest choices — draft only

The existing draft pricing route now contains **Meal Plans & Choices**. It reads `meals` (ID, title, type, variant, price, active flag and updated timestamp) from Meal Management. No backend writes or RPC calls were added. The production Meal Plans page, canonical quote engine, all anchors, existing bookings and payment paths remain unchanged.

## Working session functionality

- Configure required AND groups for CP, MAP and AP; link explicit catalogue IDs as OR alternatives in each group. Starter group labels contain no guessed meal mappings.
- Exactly one choice in each required group for each person, independently. A single-option group also needs an explicit selection. Unequal alternative prices charge the actual selected record, never cheapest/highest/first.
- Live-read catalogue prices are copied into a captured session snapshot. Both plan-editor and shared-catalogue price buttons edit one shared session price map.
- Price review lists every linked draft plan, including incomplete plans. Fully valid plans show old/new possible one-person ranges, not a price to charge. Confirming changes recalculates actual chosen prices in all affected draft plans. Incomplete impact remains explicitly unquantified.
- Price confirmation resets when amount changes, on close/cancel and on reopening. No-op/invalid amounts cannot be applied. Reset has its own confirmation. Exports retain configurations, snapshot catalogue, draft edits and per-person choices in JSON.
- Invalidated choices are removed when links change. Switching plans explicitly clears selections with a notice. Adding people never clones somebody else's choices.
- Meal Management links cannot duplicate one meal across required groups and cannot select inactive meals. Missing/invalid prices and links fail closed.
- EP contains no meals. The preview adds an optional explicit EP room amount to the selected plan's meal total; no room price is inferred. Existing calendar's manually entered additions remain separate and clearly labelled.

## Explicit limits

One-night adult meal preview only: one catalogue unit per adult per selected meal. Catalogue price units must be verified before production use. Non-EP child/infant totals are blocked until an explicit policy is implemented; EP meal totals remain zero. No room occupancy/extras, taxes, discounts, effective-date schedules, cancellation rules, inventory, promo redemption or final payable quote are calculated. Choices may vary per person, not yet per occupied date. This does not guarantee plan-price ordering when OR selections differ.

No real shared price is saved to Meal Management. Session changes are lost on refresh/exit unless exported. Other production plan usage and standalone meal-extra usage are not scanned; the impact dialog warns about these limitations. Source `updated_at` is provenance, not a durable price version or guarantee of consistent future-night pricing.

## Safe integration still required

A shared authorized versioned meal-price endpoint must serve both live editing entry points, with audited atomic updates and stale-edit protection. Plan components need explicit relational IDs, effective-date and guest policy versions. Canonical server quotes must persist each person's selected components, prices and revisions, and use the same resolver for all stay nights. Approval and effective-date rules must be tested in isolated DB staging.

Critically, current non-EP anchors subtract a source supplement to derive accommodation. Do not synchronize changed supplements into these anchors blindly. Preserve/freeze the original source-basis version or migrate to confirmed EP anchors first. Confirmed booking/payment snapshots stay fixed; new or amended quotes must use the appropriate version and preserve fingerprint, payment/idempotency and rupee/paise invariants.

## Validation

Pure model tests cover required groups, independent unequal choices, EP, unsupported guest policy, inactive/missing/duplicate links, unknown/incomplete choices, money overflow, immutable snapshots and shared-price impact. Source-level safety guards verify read-only scope and acknowledgment conditions; these are not browser interaction tests. Build/typecheck/targeted lint and full suite results are reported with the PR. Browser interaction/visual QA remains blocked by this executor's Chromium socket restrictions; no visual pass is claimed.

Final checks for this addition: 16 meal-model tests and 4 source-safety tests pass; full suite 193 pass / 39 fail, exact same failure names as baseline. Production build, app TypeScript, targeted new-code ESLint and diff checks pass. Server-rendered fixture component smoke test passes (not browser interaction). Chromium attempt again fails with socket Operation not permitted.
