# Roadmap

- [x] Add a recipient field and Send Test Email control for every email category using current draft and sample data.
- [ ] Deploy and validate protected test sending (real inbox delivery requires configured Resend sender and an admin session).

- [x] Add ten guest email categories, editing, previews and automatic trigger controls.
- [x] Connect Resend event notifications and scheduled stay reminders with duplicate protection.
- [x] Verify email rules, protected access, deployed worker and active hourly schedule (8 tests pass).
- [ ] Verify signed-in email editing/preview and real guest delivery (blocked: external admin session unavailable; Resend sending domain remains unverified).

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
