# EP-first pricing workspace (draft implementation)

Route: `/admin/pricing/workspace`, inside the existing protected admin layout.

Implemented:
- Calendar selection, inclusive bulk date range and Sunday–Friday/Saturday filters.
- EP-only input, additive meal previews, explicit manual overrides with reason.
- Review dialog, cancel/close resets acknowledgment, draft save, date-level rate card and coverage check.
- Session-only promo draft create/edit/delete and guarded price preview.
- Rate draft JSON export; no seeded prices, no backend writes and no guest-facing changes.
- Existing pricing settings remain accessible during migration. A new draft entry is added; the old live system is not replaced.

Important limits:
- This is functional UI and calculation preparation, NOT production rate management. Reloading or leaving the page loses session drafts; export rates first. Promo drafts are memory-only.
- Meal totals are explicit draft inputs for two adults. This UI does not read effective-date meal policies or change configured supplements.
- No true live rate-card replacement, server authorization/persistence, promo redemption or authoritative booking quote integration is implemented here.
- Do not merge as a complete production pricing release. A separately tested migration and quote integration must follow.

Before production activation:
1. Confirm the EP schedule and applicable period with the hotel. Proposed ₹300 reduction is not approval. Do not infer EP from AP.
2. Obtain separate 24 December 2026–1 January 2027 rates, and confirm Saturday-only weekend mapping.
3. Confirm meal inclusion, MAP major-meal choice, extra adult/child/infant rules and minimum-price policy.
4. Add a versioned, authorized atomic persistence endpoint and audit evidence; avoid writing browser-derived prices into authoritative quotes.
5. Test multi-night/date transitions, category applicability, overrides/reset, live plan ordering, promo eligibility/redemption concurrency, taxes, payment totals and existing-booking immutability in an isolated database.
6. Visually verify desktop/mobile and interrupted/repeated workflows in a functioning browser before release.

Validation on this branch:
- Production Vite build passes (pre-existing large-chunk warning).
- TypeScript app check passes.
- Targeted ESLint for all newly added implementation files passes.
- New focused tests: 68 pass (30 workspace + 7 draft-store contract + 11 stay-subtotal + 20 meal-choice model/source guards).
- Complete existing + new suite: 193 pass, 39 fail; baseline main: 125 pass, the same 39 fail. Existing failures are around retired checkout/publication paths, not introduced by this branch.
- Full repository ESLint fails with 483 errors and 59 warnings; same counts on baseline main.
- Browser QA attempted using local Chromium, blocked by environment socket permission / runtime unavailability. No screenshot or interactive pass is claimed.

## Further isolated groundwork

See `ep-persistence-groundwork.md` and `ep-quote-groundwork.md`. These add independently tested contracts/calculation modules only. They are not wired to this workspace, existing Edge Functions, live booking/payment paths, or a database. Real durable persistence and backend activation remain blocked pending isolated database/security/integration testing and confirmed rate/policy inputs.

## Meal choice workspace

See `meal-choice-draft.md` for the new read-only Meal Management catalogue links, configurable AND/OR groups, independent actual-choice per-person pricing and confirmed shared **session-draft** price edits. These do not save live prices or automatically feed the separate rate calendar.
