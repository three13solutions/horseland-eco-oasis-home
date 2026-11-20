# Roadmap

- [ ] Move Guest Type Policy activation into per-row status toggles with version-safe saves.
- [ ] Offer No Charge / Guest Type Charge and linked-adult or custom accommodation/meal rates.
- [ ] Verify policy and rate rules; report any authenticated-check limitation.

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
