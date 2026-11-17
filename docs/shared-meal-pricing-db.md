# Shared meal pricing — inert review staging

**This migration is staging only.** It never updates the public meal catalogue, plan supplements, supplement versions, rate anchors, quote functions or booking records. It installs no triggers or guards on existing public tables. Existing published clients retain their current behavior.

## Private data
The migration copies the current catalogue and canonical four plans into `meal_pricing_private.staged_meals` / `staged_plans`, along with an immutable original source snapshot for later conflict-aware activation. It seeds unique active meal variants as OR alternatives per included meal; FB adds high tea. Missing/ambiguous active catalogue matches or unequal alternatives abort initialization rather than picking arbitrary records. Derived supplements change only in private staged plans.

The staged prices are a snapshot, not a bidirectional live link to production. Changes made by old published admin clients after snapshot creation are not overwritten or silently merged. Activation must compare the original source snapshot against current production and present conflicts for review.

## API contract
- `get_meal_pricing_workspace()` returns `mode: "staged"`, `revision`, all staged `meals`, canonical staged `plans` with `groups`.
- `save_shared_meal_prices(p_prices jsonb [{meal_id,price}],p_expected_revision bigint,p_reason text)` atomically saves explicitly approved draft prices and recalculates all linked draft plans.
- `save_shared_meal_price(p_meal_id,p_price,p_expected_revision,p_reason)` is a single-item wrapper.
- `save_meal_plan_groups(p_plan_id,p_groups [{id,label,meal_ids}],p_expected_revision,p_reason)` saves draft composition and derived draft supplement.
- `set_meal_plan_active(p_plan_id,p_is_active,p_expected_revision,p_reason)` changes draft availability; activating validates all linked components and recalculates the draft price.
- Every RPC requires authenticated `is_admin_new()` administrator membership, including reads. Private helpers and tables have no client grants. Audit stores actor, reason and before/after staged state.
- A singleton row lock and revision enforce compare-and-swap for all staged writes. Stale saves fail. Failed validation rolls back the complete staged transaction.
- Per-person price is one equal-priced OR alternative per AND group summed. Unequal alternatives remain blocked until checkout accepts per-guest choices. No cheapest-price default or silent propagation between variants.

## No activation included
No publish/activation function is installed. Publication requires a separate reviewed migration/workflow with production drift detection, backup, EP anchor/rate transition, effective dates, weekend behavior and booking integration. User approval to publish must precede activation. Merely syncing code to GitHub/Lovable or installing this inert staging schema does not activate prices.

Current production uses 23 active FB anchors. Replacing live supplements from FB1000 to1510 before the coordinated EP transition would alter derived accommodation. This staging design avoids that effect entirely.

Confirmed booking/payment snapshots and existing supplement histories stay untouched. The draft audit preserves composition provenance, but actual guest-selected component snapshots and checkout choices remain a later integration step.

## Verification
Pinned disposable test dependency: `npm install --prefix /tmp/meal-db-tools --no-save @electric-sql/pglite@0.3.14`
Run: `PGLITE_MODULE_PATH=/tmp/meal-db-tools/node_modules/@electric-sql/pglite/dist/index.js node scripts/tests/shared-meal-pricing.mjs`.

31 PGlite SQL assertions cover initial staged totals/three-choice groups, atomic rollback, batch synchronization, stale revisions, invalid/negative/duplicate changes, RO semantics, missing components, administrator/anonymous access, private table denial, staged availability and audit. They compare public catalogue/plans/version rows before and after schema install and staged saves, compare a fixture quote function/answer, and verify old direct admin price/plan writes remain usable without mutating staged data.

The fixture uses minimal existing tables/auth/version trigger, not a full clone of hosted RLS/audit/booking infrastructure. Hosted read-only schema preflight and independent review remain necessary before installation. No production writes have been performed by the migration author.

## Separately authorized live capability (latest user instruction)
`20261117115741_activate_shared_meal_pricing.sql` installs, but does **not call**, an owner-only activation routine. The earlier migration remains inert; this second migration initially leaves mode `staged` as well.

After coordinated EP/rate/festive/weekend changes in the same deployment transaction, the owner may invoke `select meal_pricing_private.activate_live();`. It locks the workspace and public source tables, rejects source drift since original snapshots, updates public shared prices/components/supplements, appends applicable supplement versions using the existing public trigger, and changes mode to `live`. It must not run separately from the rate transition.

In live mode:
- Existing shared RPCs also synchronize public prices and canonical plan supplements, without changing guest quote API signatures.
- Old published Meal Management writes remain usable when the resulting linked OR groups have equal prices. A single variant change that would make alternatives unequal **fails and rolls back**, explicitly asking for alternatives to be updated together. No silent propagation to variants.
- Old plan name/status/order updates synchronize into the shared workspace. Direct manual plan supplement/composition changes are rejected; use shared pricing instead. This is an intentional old-admin limitation. Existing UI can still read current supplements.
- Statement locks serialize old/new writers. Staged price saves copy the complete approved batch, then derive supplements and audit; recursion checks prevent double synchronization.
- The actual `postgres` deployment/definer role was read-only verified on the linked database. Authentication checks still require role-based administrator access for client writes.

53 current fixture assertions cover staged invariance plus activation drift failure, live API synchronization, legacy batch synchronization, unequal single-variant rollback, live metadata/status edits and manual supplement bypass protection. They do not replace a combined integration test with the actual hosted quote/anchor/festive functions. These migrations remain unexecuted by their author.
