# Architecture

- Guest-type status is versioned within each age band; staging edits never activate the pricing release, because live engine activation requires its separate rollout checks.
- Accommodation charge editors retain keyed guest-type modes alongside legacy numeric columns; database triggers resolve linked adult amounts on every write so existing authoritative pricing readers remain compatible.

- Live Rate Card uses canonical variant snapshots and the read-only promo action after checking publication, active category and website-visible variants; retain base rates on preview rejection, never create payment orders or infer applied overrides from overlapping dates.
- Live rate breakdowns link to the exact override via `override_id`, or the owning rate-plan room type; policy settings stay protected by their existing admin pages.

- Mount shared scroll navigation at the application root, scoped to admin routes and explicitly marked `data-admin-media-gallery` containers (including Radix viewports), so only admin media galleries and selectors receive accessible arrows without changing saved content.
- Keep media gallery controls in the active dialog's portal so they remain interactive under modal focus management.
- Style the dialog close button per call site via `DialogContent`'s `closeButtonClassName`; leave the shared default untouched so public dialogs keep the neutral cross, and give admin media gallery dialogs the exported `MEDIA_GALLERY_CLOSE_BUTTON_CLASS` plus header right padding so the cross never sits over the title.- Record admin activity with a generic database trigger on every public table writing to the append-only `admin_audit_log`, so new modules are covered without app code and logs can't be edited or deleted.
- Admin Templates (Invoices, Receipts, WhatsApp, SMS) share one `TemplateModule` page driven by a per-module config, backed by `message_templates` + `template_module_settings`; Emails keeps its own page on `email_templates`/`email_settings` because the booking email function reads them.
- Guest automations and admin template tests share the server-only Google Mail connector sender using the connected profile address; database-owned events and hourly reminders retain bounded retries, with deterministic Message-ID/Sent lookup reducing duplicate sends (Gmail has no atomic idempotency guarantee).
- Manual template tests use a separate admin-verified endpoint accepting the current draft and one recipient with shared sample values; they never create bookings or automation events, so preview testing cannot affect guest notifications.
- Third-party tags/pixels/verification snippets live in `website_integrations` and are managed in Admin → Integrations (Pixels/Tags tab) and injected at runtime by the root `WebsiteIntegrationsLoader` (public routes only, deduped by code and tracking ID), so admins manage them without code edits.
