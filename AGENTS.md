# Architecture

- Mount shared scroll navigation at the application root, scoped to admin routes and explicitly marked `data-admin-media-gallery` containers (including Radix viewports), so only admin media galleries and selectors receive accessible arrows without changing saved content.
- Keep media gallery controls in the active dialog's portal so they remain interactive under modal focus management.
- Style the dialog close button per call site via `DialogContent`'s `closeButtonClassName`; leave the shared default untouched so public dialogs keep the neutral cross, and give admin media gallery dialogs the exported `MEDIA_GALLERY_CLOSE_BUTTON_CLASS` plus header right padding so the cross never sits over the title.