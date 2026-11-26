# Roadmap

- [ ] Allow owner-verified unpaid saved checkout clearing, atomically release inventory, and retain late payments for admin review; test and deploy.
- [ ] Enable automatic late-payment notifications by registering the Razorpay webhook (blocked: Razorpay Dashboard configuration by account owner).

- [x] Filter Room Rate Management room types by publication status (All / Published / Unpublished) across weekly rows and bulk selection, saving only visible types; 16 tests passed. Connected signed-in verification remains blocked by the external administrator session noted below.

- [x] List and select Room Rate Management prices by room type; 13 tests and isolated desktop/mobile weekly/bulk save/read-back checks passed without changing connected rates. Connected signed-in verification remains blocked by the external administrator session noted below.

- [x] Add Room Rate Management below Live Rate Card with seven-day category editing and independent EP/adult/child updates.
- [x] Add category/date/day-rule bulk updates with preview and atomic, stale-safe saving through canonical rate plans; Rate Calendar shares the new live editor and its old drafts remain separate.
- [x] Verify isolated weekly/bulk save and read-back on desktop/mobile, EP meal additions, atomic stale rejection, linked guest rates, history and preserved stay tiers. No connected live rates, bookings or payment orders changed.
- [ ] Verify signed-in Room Rate Management saves against connected website quotes (blocked: user-managed Supabase cannot supply an administrator test session).

- [x] Connect guest-type accommodation and meal pricing editors to configured policy types, and show expandable linked-pricing records.
- [x] Carry dynamic guest types through guest selection, canonical rate variants, checkout snapshots and payment validation without changing existing rates.
- [x] Verify dynamic pricing, age coverage, capacity, stale quotes and retained checkout: 78 focused checks passed; isolated linked-price expansion/edit/save/read-back and desktop/mobile checks passed; real website quotes match existing rates; four affected quote services deployed. No bookings or payment orders created.
- [ ] Publish and verify the matching public website before coordinating keyed-pricing activation (blocked: public rollout has not been requested; connected administrator/payment checks lack an external managed test session). Existing live rates and policy revision remain unchanged.

- [x] Explain custom activation prerequisites and make active-policy edits reuse their existing pending draft rather than create duplicates: 22 tests and isolated same-ID save/read-back passed. Toddler activation still requires custom guest collection and canonical pricing support; live policies remain unchanged.
- [x] Add confirmed deletion of draft/deactivated policies, protect active policies and historical booking records.
- [x] Reject duplicate guest-type names across distinct types, including case and spacing variations; 40 tests passed and isolated duplicate-name/cancel/delete UI checks passed. Connected signed-in checks remain unavailable as noted below; existing security warnings unchanged.
- [x] Clarify completed-year age boundaries and verify 0–3, 4–9, 10+ cover all ages without gaps.
- [x] Add administrator-only policy drafts without changing active age policies.
- [x] Preview and atomically activate an edited policy with compatible drafts, rejecting gaps, overlaps, ambiguity, and stale changes.
- [x] Verify draft persistence and coordinated activation: 32 tests passed, including 14 isolated PostgreSQL tests; isolated desktop/mobile draft save/read-back, cancellation and activation passed; deployed access grants verified and live revision unchanged. Unsupported custom guest segments remain draft-only while current pricing is live.

- [x] Diagnose Guest Type Policy save failures, match live validation in the edit form, and preserve authoritative error messages.
- [x] Verify live-mode rejection and valid save/read-back without changing connected live policies: 18 tests and isolated desktop/mobile UI checks passed; connected signed-in verification remains blocked as noted below.

- [x] Move Guest Type Policy activation into per-row status toggles with version-safe saves.
- [x] Prevent deactivation without a compatible alternate policy and switch replacements atomically.
- [x] Allow typed guest-type names and optional maximum ages, including segmented adult age groups.
- [x] Offer No Charge / Guest Type Charge and linked-adult or custom accommodation/meal rate configuration; custom guest checkout pricing remains staged pending its matching guest-selection/quote release.
- [x] Verify policy and rate rules: 30 tests passed, including 7 isolated PostgreSQL tests; desktop/mobile isolated policy save/read-back passed; latest preview build passed.
- [ ] Verify signed-in policy/rate editing against the connected service (blocked: external unmanaged authentication does not provide a test admin session).

- [x] Replace live-rate coupon section with an auto-applying Promo Codes dropdown beside Room Status, defaulting to No Promo Codes; focused tests and isolated desktop/mobile selection checks passed.

- [x] Default Live Rate Card to published rooms in active categories, add All/Published/Unpublished filter, and replace publication badges with a light-red row accent; 20 tests and isolated desktop/mobile filter checks passed.

- [x] Prevent live-rate coupon previews for unpublished rooms and unavailable meal plans; verify rejected previews retain the table with 17 passing tests and isolated browser checks.

- [x] Simplify Live Rate Card summary, expose applied override policies and coupon previews, and explain stay-night calculations.
- [x] Identify unpublished room types and inactive categories in the live rates table.
- [x] Verify 13 pricing tests and isolated desktop/mobile rate-card controls; preview build passes.
- [ ] Verify signed-in rate-card flow (blocked: external unmanaged authentication; isolated component checks passed).

- [x] Connect Google Workspace, deploy both email senders, pass 13 tests, and verify a sample booking email arrived in the connected inbox.
- [x] Explain Google Workspace booking email sending as an alternative to Resend.
- [x] Add a recipient field and Send Test Email control for every email category using current draft and sample data.
- [x] Deploy template test sending, verify unauthenticated rejection and pass all 11 email tests.
- [ ] Verify signed-in template test button (blocked: external admin session unavailable); shared sender inbox delivery verified.

- [x] Add ten guest email categories, editing, previews and automatic trigger controls.
- [x] Connect Resend event notifications and scheduled stay reminders with duplicate protection.
- [x] Verify email rules, protected access, deployed worker and active hourly schedule (8 tests pass).
- [ ] Verify signed-in email editing/preview and a real booking-triggered guest email (blocked: external admin session unavailable and no new booking event).

- [x] Limit shared up/down navigation to admin media galleries and image selectors.
- [x] Remove added arrows from public pages and unrelated admin content.
- [x] Verify desktop/mobile arrows and library selection in an isolated check using real components and media.
- [ ] Verify signed-in admin flow (blocked: external admin session unavailable).
- [x] Red, properly aligned close button on admin media gallery dialogs (no overlap with title or header buttons).

- [x] V2 static content layer (src/v2/data)
- [x] Port all public pages/components to src/v2
- [x] Wire /v2 routes in App.tsx
- [x] Fix typecheck/build errors
- [x] Verify V2 pages render with no CMS calls

- [x] Live Rate Card: filters below the cards, date/nights descriptor above the table.
- [x] Live Rate Card: remove the Refresh button (rates already update automatically).
