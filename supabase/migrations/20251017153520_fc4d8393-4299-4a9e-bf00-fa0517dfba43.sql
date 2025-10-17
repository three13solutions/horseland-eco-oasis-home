-- Add Hero Banner category to gallery_categories
INSERT INTO gallery_categories (name, slug, description, sort_order, is_active)
VALUES (
  'Hero Banners',
  'hero-banners',
  'Images and media used in hero sections across the website',
  0,
  true
)
ON CONFLICT (slug) DO NOTHING;