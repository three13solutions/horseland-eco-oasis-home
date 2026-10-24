# Architecture

- Mount shared scroll navigation at the application root, scoped to admin routes and explicitly marked `data-admin-media-gallery` containers (including Radix viewports), so only admin media galleries and selectors receive accessible arrows without changing saved content.
- Keep media gallery controls in the active dialog's portal so they remain interactive under modal focus management.