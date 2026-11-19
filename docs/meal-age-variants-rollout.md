> Historical implementation checkpoint. For the current deployed backend and deliberately pending activation, see [19 November backend release](backend-release-2026-11-19.md).

# Meal age rates and dietary variants: review branch

Repository-only implementation. No migration, live rate edit, deployment or website publication was performed. This is a separate checkpoint after promotion management.

## Age pricing

Meal Plan Management has a per-plan age-rate editor. Adult rates stay linked to the existing shared meal catalogue and effective adult plan supplements. Children and the youngest band may use the full adult rate, a percentage of that rate, a fixed INR amount per person per occupied night, or zero. The global Guest Age & Pricing Policy free-meal rule overrides these settings, so under-four guests remain free. EP/RO stays zero.

Defaults preserve the previous branch's effective rates. **50% is an available setting, not an activated default.** Percentage rates follow changes to the current effective adult supplement; fixed rates do not. Derived unit prices round to paise before multiplying guests. New quote snapshots retain policy revisions and per-band components; confirmed bookings and payments are never rewritten.

Canonical normal and verified preserved-EP nights support the custom rates. Opaque legacy inclusive packages do not provide a trustworthy adult meal-price split. Unsupported custom-rate meal plans are omitted for those guest groups, rather than inventing a deduction; unaffected plans remain available. Verify real protected/legacy rates in staging before enabling custom rules.

## Dietary variants

Each canonical plan can store Veg, Non-Veg and Jain configuration records, each with a description, explicit adult reference rate, existing gallery image, configuration status and revision. No sample records or tariffs are seeded. Media must resolve to existing image-gallery records; arbitrary image URLs are not accepted by the save RPC.

These are **admin configuration only**, not guest-selectable offers and not inputs to current booking prices. The owner explicitly deferred per-guest choice capture. No operative per-guest/whole-booking allocation control, automatic cheapest choice, or silent preferred dietary variant is introduced. Future booking capture and allocation must be implemented and reviewed before activating dietary-specific pricing.

## Deployment/review gates

- Apply the guest-age foundation before meal migration 00500, then dietary configuration 00600 in a staging copy.
- Test default-price equivalence, percentage/fixed/free rates, rounding, shared adult-price changes, Saturday/protected/mixed nights and opaque legacy exclusions with actual rates.
- Verify admin permissions, revision conflicts, audit history, media selection/cancellation and mobile layout.
- Complete live-like website/manual quote and saved-payment regression without rewriting historical bookings.
- Isolated PostgreSQL tests use synthetic dependencies; they do not prove a complete production database upgrade or real browser/payment flow.

## Verification checkpoint

- Final full repository suite with all isolated PostgreSQL tests enabled: **357 tests, 318 passed, 39 pre-existing failures, zero skipped**. Failing test names exactly match baseline.
- App TypeScript and production build passed; diff check clean.
- Repository lint remains at baseline: 482 errors and 59 warnings; new meal components/helpers are lint-clean.
- Meal SQL integration verified identical default totals (including fractional-cent reference data and cancellation adjustments), percentage/fixed/free pricing, current adult-price propagation, free-band precedence, normal/Saturday/preserved/mixed dates, legacy-plan exclusions, permissions and stale dependent revisions.
- Dietary SQL tests verified admin authorization, media validation, revision conflicts, all three dietary types, audit logs and no changes to current plans/bookings.
- No production database migration, edge deployment, website publish, real booking or payment was performed. Interactive browser and full real Supabase staging validation remain pending.
