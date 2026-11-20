# Meal catalogue guest pricing: review and release boundary

## Additive admin change

- `20261120221800_meal_catalog_guest_pricing.sql` is additive and does not update catalogue prices, meal plans, EP anchors, booking/payment records or quote functions. It creates private, revisioned guest-price storage; no existing items are backfilled.
- `get_meal_guest_prices()` returns JSON `{revision, guest_policy_revision, prices}`, where `prices` is keyed by exact Services → Meals UUID and then guest key, with INR numeric values. Adult uses the existing reviewed shared-price workflow and is never written by the new RPC. Enabled paid non-adult guest types receive explicit numeric prices. A blank is not free; numeric zero is explicit. A globally free band always displays zero as derived policy, rather than a writable price. This distinction also prevents a changed age band from silently allowing paid settings.
- `save_meal_guest_prices(p_meal_id, p_prices, p_expected_revision, p_expected_guest_policy_revision)` accepts a complete map of editable keys, with omitted editable keys clearing their prices. Administrative edits are date-effective from the current Asia/Kolkata date and stored as append-only revisions. Both optimistic revisions are required. Authentication alone is insufficient: existing application admin authorization is checked; private tables are inaccessible to client roles. Existing staged-vs-live adult prices remain distinct.
- Meal-plan preview rolls up exact selected UUIDs, not titles or diet names. Add the groups (AND) and count one amount within each group (OR). The group is only deterministic when all named active choices have the same amount for that guest type. Missing, inactive, duplicate or ambiguous options must be resolved before that guest type can be quoted from catalogue rates. Choosing a priced default is a possible future feature, not implemented. Each guest's dietary selection is out of scope.

## Local validation

Install the pinned test dependency only in a local test checkout (not app runtime dependencies):

```sh
npm install --no-save --ignore-scripts --no-package-lock @electric-sql/pglite@0.3.10
node scripts/test-meal-catalogue-db.mjs
```

The local harness runs an in-memory PostgreSQL fixture: initial empty state, anon/non-admin denial, admin RPC grant, private-table denial, stale revision failures, guest key validation and paise precision, explicit zero vs unset, adult prices untouched, append-only revisions, dated lookup, AND/OR arithmetic and inactive choice refusal.

The optional regression harness accepts a **trusted read-only** keyed-engine definition from a representative Supabase staging baseline:

```sh
node scripts/test-meal-catalogue-db.mjs --quote-fixture /absolute/path/to/keyed-engine-baseline.sql
```

Obtain the baseline as a single function definition from the trusted database's `pg_get_functiondef('public.calculate_keyed_rate_variants_engine(uuid,date,date,uuid,integer,integer,integer,text,jsonb)'::regprocedure)`, without writing remotely or copying auth tokens. The harness replaces unrelated room, policy and availability data with fixtures and exercises the existing keyed-engine pricing loop itself. It checks gate-off deep equality/fingerprints, draft-vs-released revision isolation, per-guest maths, unchanged EP source price and accommodation, cancellation adjustment, free infant, one nightly record per verified / known-preserved EP night, adult unchanged on opaque legacy, conservative family behavior on opaque and mixed nights, and differing OR choices. Fixture tests do **not** establish full Supabase staging, browser checkout, manual bookings or production readiness.

## Engine integration candidate; do not enable in production

`scripts/stage-meal-catalogue-quote-engine.sql` is **not** a migration to deploy automatically. It is an isolated-staging candidate with two independent gates: the existing keyed-guest release and a new private catalogue gate pinned to an effective date, a reviewed catalogue revision, the reviewed guest-policy revision and exact reviewed plan-group membership. The server never consumes a newer draft prices revision while quoting, and a subsequent group/rule change that makes the pinned snapshot inapplicable requires re-review. The private gate is OFF by default. The script aborts if the expected keyed-engine source points drift. It changes only the **target meal** charge where the source room and meal split is known. It does not replace historical adult supplement versions or change the AP-to-EP source deduction where explicitly preserved. Full-preservation pricing remains historically pinned. For a family on opaque legacy dates not covered by full preservation, the candidate keeps RO while declining paid plans rather than assigning guessed meal splits. This UX and policy choice need sign-off before release.

The gate is not publicly writable and has not been enabled. This work does not migrate live quote, checkout or manual booking onto catalogue rates. In particular, today's Edge routing can accept old fresh numeric-only requests and fall back to the legacy v2 engine; before using the catalogue release flag, guard fresh public/manual requests so they re-quote with the current keyed contract. Preserve snapshot-based resume/finalize for existing payment intents. Do not treat an old-client bypass as success just because a new-preview quote is correct.

Staging acceptance must check ordinary approved EP rates, preserved festive dates, December 23–25 mixed known split, and the March 31–April 2 transition / April 1 opaque packages. Compare actual website and manual quotes and payment-order preparation with no production bookings/payments. Verify Adult, Child and Under-4 meal charges, availability and fallback messaging, cancellation/discount interactions, effective dates, exact group IDs, date-local correctness, mixed-night totals, stale quotes and old-client rejection. Rate rollout and any Lovable publish must be separately coordinated; existing rates, saved intents and policies must remain unchanged until then.
