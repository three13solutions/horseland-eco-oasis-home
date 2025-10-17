-- Add missing categories to gallery_categories for comprehensive media organization

INSERT INTO gallery_categories (name, slug, description, sort_order, is_active)
VALUES 
  ('Blog', 'blog', 'Featured images and media for blog posts', 10, true),
  ('Dining', 'dining', 'Restaurant, bar, and meal images', 20, true),
  ('Rooms', 'rooms', 'Room types, unit photos, and accommodation galleries', 30, true),
  ('Packages', 'packages', 'Package featured images and banners', 40, true),
  ('Spa & Wellness', 'spa', 'Spa services and wellness treatment images', 50, true),
  ('Activities', 'activities', 'On-property and local activity media', 60, true),
  ('Branding', 'branding', 'Logos, favicons, and brand assets', 70, true),
  ('SEO', 'seo', 'Open Graph images and SEO assets', 80, true)
ON CONFLICT (slug) DO NOTHING;