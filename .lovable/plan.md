# Update About Us Page Banner

## What we'll do
Set the About Us page banner to the **Matheran cliff panorama** image already in the media library:
`Matheran (34)_11zon.jpg` (3872×2592) — wide green valley shot, ideal behind the page title.

## Steps
1. Update the `pages` table record with slug `about`:
   - Set `hero_image` to the media library URL of `Matheran (34)_11zon.jpg` (from `gallery_images` id `345fbf08-d0e6-4f38-ab03-6b0619ddb7b0`).
   - Leave `hero_gallery`, title, subtitle, and all other page content untouched.
2. Verify in the preview that the About page hero shows the new banner with the title/subtitle overlay readable.

## Notes
- No code changes needed — the About page already renders `hero_image` as the banner background.
- No other pages, images, or CMS content are affected.
- The previous entrance-with-horses banner remains in the media library if you ever want to switch back.
