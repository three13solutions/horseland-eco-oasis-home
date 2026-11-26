# Architecture

- Room Rate Management and the live Rate Calendar share the same room-type-keyed weekly/bulk editor so edits never affect sibling types in the same category; atomic admin-checked saves split existing EP anchors by date, preserving stay tiers, guest links, unit overrides and protected pricing periods rather than creating a second pricing engine.

- Guest-type status is versioned within each age band; staging edits never activate the pricing release, because live engine activation requires its separate rollout checks.
- Accommodation charge editors retain keyed guest-type modes alongside legacy numeric columns; database triggers resolve linked adult amounts on every write so existing authoritative pricing readers remain compatible.
- Named guest types and bounded adult segments remain staged until guest collection and canonical quote inputs support those segments; configuration alone must never claim custom live pricing.
- Use the shared keyed guest-count contract across selection, navigation and server quotes; numeric counts are compatibility projections so custom guest quantities cannot disappear.
- Read configured and draft guest types for admin charge editors, and resolve expandable links from original pricing records rather than duplicate rate storage.
- Keyed pricing runs through a separately named canonical SQL variant entry point behind its publication gate; unchanged legacy engines preserve existing live rates until coordinated activation.
- Persist guest counts and policy labels from the stored validated quote at booking insertion, never from the current policy, so held and historical prices remain immutable.
- Resolve keyed accommodation rates through the private scoped resolver (unit/type/category overrides, composition, then anchor), retaining source IDs; this prevents custom guests bypassing saved rate scopes while leaving legacy engines unchanged.
- Guest-policy drafts are separate from authoritative versions; server-previewed bundles activate in one revision with draft/revision checks so incomplete edits never change live age coverage.
- Policy deletion uses tombstones for historical versions and soft-deleted drafts; active versions cannot be removed and authoritative booking history remains immutable.

- Live Rate Card uses canonical variant snapshots and the read-only promo action after checking publication, active category and website-visible variants; retain base rates on preview rejection, never create payment orders or infer applied overrides from overlapping dates.
- Live rate breakdowns link to the exact override via `override_id`, or the owning rate-plan room type; policy settings stay protected by their existing admin pages.

- Mount shared scroll navigation at the application root, scoped to admin routes and explicitly marked `data-admin-media-gallery` containers (including Radix viewports), so only admin media galleries and selectors receive accessible arrows without changing saved content.
- Keep media gallery controls in the active dialog's portal so they remain interactive under modal focus management.
- Style the dialog close button per call site via `DialogContent`'s `closeButtonClassName`; leave the shared default untouched so public dialogs keep the neutral cross, and give admin media gallery dialogs the exported `MEDIA_GALLERY_CLOSE_BUTTON_CLASS` plus header right padding so the cross never sits over the title.- Record admin activity with a generic database trigger on every public table writing to the append-only `admin_audit_log`, so new modules are covered without app code and logs can't be edited or deleted.
- Admin Templates (Invoices, Receipts, WhatsApp, SMS) share one `TemplateModule` page driven by a per-module config, backed by `message_templates` + `template_module_settings`; Emails keeps its own page on `email_templates`/`email_settings` because the booking email function reads them.
- Guest automations and admin template tests share the server-only Google Mail connector sender using the connected profile address; database-owned events and hourly reminders retain bounded retries, with deterministic Message-ID/Sent lookup reducing duplicate sends (Gmail has no atomic idempotency guarantee).
- Manual template tests use a separate admin-verified endpoint accepting the current draft and one recipient with shared sample values; they never create bookings or automation events, so preview testing cannot affect guest notifications.
- Third-party tags/pixels/verification snippets live in `website_integrations` and are managed in Admin → Integrations (Pixels/Tags tab) and injected at runtime by the root `WebsiteIntegrationsLoader` (public routes only, deduped by code and tracking ID), so admins manage them without code edits.
