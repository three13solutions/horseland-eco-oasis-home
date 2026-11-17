# Horseland pricing integration

## Production-capable implementation

- Meal Management and Meal Plans share one revision-checked catalogue/editor. Required AND groups contain equal-priced OR alternatives; unequal alternatives are blocked until guest choice capture is implemented.
- Reviewed shared-price edits disclose affected plans and support explicitly selected atomic alternative-price changes. MAP remains breakfast+dinner; AP includes high tea; all guest ages use the same meal price.
- Editable effective-dated weekday/weekend rules appear in Base Pricing. Historical changes are blocked; bounded rules revert to the prior rule afterwards.
- Date-specific preservation policies retain existing festive EP calculation; mixed stays calculate each night in its original full-stay context.
- Promo Codes has EP300 configuration and server-bound guest offer selection. Its separate release gate defaults OFF; configuration does not activate redemption.

Database migration/activation and frontend publication are separate. Local implementation or GitHub sync alone is not evidence of a live rollout. See the deployment report for verified status. `shared-meal-pricing-db.md` and `ep-promo-rollout.md` describe their respective contracts.

## Deferred calendar prototype

`/admin/pricing/workspace` remains an experimental protected route but is not in the main sidebar. The user deferred the broader rate-calendar release.

It supports session-only calendar selection, inclusive bulk ranges, EP input, additive previews, explicit overrides/reason, review/cancel, rate-card/coverage preview and JSON export. Leaving/reloading loses session drafts. It does not write authoritative rates, replace the live rate card or alter booking quotes. Its former session-only promo demo is replaced with a link to the production-capable Promo Codes page.

See `pricing-followup-backlog.md` for deferred per-guest choices, age-specific pricing and calendar persistence. Do not mistake the prototype for completed production calendar management.

## Validation checkpoint (before final coordinated rollout)

- App TypeScript and production Vite build passed, with existing large-chunk warning.
- Focused new production UI/model ESLint passed.
- Full Node suite: 248 pass / 39 fail. All 39 failure names match the baseline, around retired checkout/publication paths and the existing mail-test issue.
- Shared-meal database tests: 70 passed after independent review hardening.
- EP/festive isolated tests: 67 pass; combined activation tests146 pass and actual-data tests210 pass. The legacy precision issue caught during the first attempt was fixed; the second atomic activation passed all live-data assertions. See rollout status.
- Promo database tests: 18 pass with release gate OFF.
- Meal editor server-render fixture passes. Browser interaction/visual QA is blocked by Chromium socket permissions; no screenshot or interactive pass claimed.

These checks are not a claim that production schema, Edge Functions, GitHub main or Lovable publication has been updated.
