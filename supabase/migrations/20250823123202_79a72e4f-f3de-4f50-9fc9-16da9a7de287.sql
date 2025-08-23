
-- 1) Ensure categories exist (insert-if-not-exists)
INSERT INTO gallery_categories (id, name, slug, description, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero Banners', 'hero-banners', 'Hero banner images used across site', true, 10, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_categories WHERE slug = 'hero-banners');

INSERT INTO gallery_categories (id, name, slug, description, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Branding', 'branding', 'Brand identity assets (logos etc.)', true, 20, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_categories WHERE slug = 'branding');

INSERT INTO gallery_categories (id, name, slug, description, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Assets', 'site-assets', 'Generic site assets used across the website', true, 30, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_categories WHERE slug = 'site-assets');

INSERT INTO gallery_categories (id, name, slug, description, is_active, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Experiences', 'experiences', 'Images for experiences sections', true, 40, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_categories WHERE slug = 'experiences');

-- 2) Backfill media records (insert-if-not-exists)
-- Helper note: category_id is resolved by slug; hardcoded_key ensures stable references later.

-- Hero V5 slides (local /lovable-uploads)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V5 Slide 1', '/lovable-uploads/9699e81e-78aa-4ce4-b652-cf46c4bd7075.png', 'image', 'hardcoded', 'hero.v5.slide1', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 1, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide1');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V5 Slide 2', '/lovable-uploads/d4df921c-30f4-4f92-92f2-c84dbcd5b591.png', 'image', 'hardcoded', 'hero.v5.slide2', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 2, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide2');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V5 Slide 3', '/lovable-uploads/b7049d8c-bd59-4733-b040-30b3f79f881c.png', 'image', 'hardcoded', 'hero.v5.slide3', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 3, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide3');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V5 Slide 4', '/lovable-uploads/6df7505d-8906-4590-b67e-a18c9f9da7f5.png', 'image', 'hardcoded', 'hero.v5.slide4', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 4, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide4');

-- Hero V4 slides (Unsplash)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V4 Slide 1', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80', 'image', 'external', 'hero.v4.slide1', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 1, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v4.slide1');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V4 Slide 2', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80', 'image', 'external', 'hero.v4.slide2', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 2, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v4.slide2');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Hero V4 Slide 3', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80', 'image', 'external', 'hero.v4.slide3', true, 'site', (SELECT id FROM gallery_categories WHERE slug='hero-banners' LIMIT 1), 3, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v4.slide3');

-- Booking modal background (Unsplash)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Booking Modal Background', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a', 'image', 'external', 'booking.modal.background', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'booking.modal.background');

-- Experiences teaser cards (Unsplash)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Experiences Card 1', 'https://images.unsplash.com/photo-1439886183900-e79ec0057170?w=400&h=300&fit=crop', 'image', 'external', 'experiences.card1', true, 'site', (SELECT id FROM gallery_categories WHERE slug='experiences' LIMIT 1), 1, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'experiences.card1');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Experiences Card 2', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop', 'image', 'external', 'experiences.card2', true, 'site', (SELECT id FROM gallery_categories WHERE slug='experiences' LIMIT 1), 2, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'experiences.card2');

INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, sort_order, created_at, updated_at)
SELECT gen_random_uuid(), 'Experiences Card 3', 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=400&h=300&fit=crop', 'image', 'external', 'experiences.card3', true, 'site', (SELECT id FROM gallery_categories WHERE slug='experiences' LIMIT 1), 3, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'experiences.card3');

-- Branding: primary logo (local /lovable-uploads)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Primary Logo', '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png', 'image', 'hardcoded', 'branding.logo.primary', true, 'site', (SELECT id FROM gallery_categories WHERE slug='branding' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'branding.logo.primary');

-- Generic site assets: include all present in /public/lovable-uploads (register with keys)
-- We add a record for each known file if a matching hardcoded_key isn't present.

-- 11ec8802...
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset 11ec8802', '/lovable-uploads/11ec8802-2ca9-4b77-bfc6-a8c0e23527e4.png', 'image', 'hardcoded', 'asset.11ec8802', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.11ec8802');

-- 1c90ed68...
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset 1c90ed68', '/lovable-uploads/1c90ed68-942a-4c4c-8ec9-b6962d7d5248.png', 'image', 'hardcoded', 'asset.1c90ed68', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.1c90ed68');

-- c5804249...
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset c5804249', '/lovable-uploads/c5804249-2e50-49d1-b8da-6c999d32f326.png', 'image', 'hardcoded', 'asset.c5804249', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.c5804249');

-- d4df921c... (also used as hero.v5.slide2, but we register a generic key only if the hero key wasn’t created)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset d4df921c', '/lovable-uploads/d4df921c-30f4-4f92-92f2-c84dbcd5b591.png', 'image', 'hardcoded', 'asset.d4df921c', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide2')
  AND NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.d4df921c');

-- 9699e81e... (skip if hero.v5.slide1 exists)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset 9699e81e', '/lovable-uploads/9699e81e-78aa-4ce4-b652-cf46c4bd7075.png', 'image', 'hardcoded', 'asset.9699e81e', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide1')
  AND NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.9699e81e');

-- b7049d8c... (skip if hero.v5.slide3 exists)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset b7049d8c', '/lovable-uploads/b7049d8c-bd59-4733-b040-30b3f79f881c.png', 'image', 'hardcoded', 'asset.b7049d8c', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide3')
  AND NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.b7049d8c');

-- 6df7505d... (skip if hero.v5.slide4 exists)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset 6df7505d', '/lovable-uploads/6df7505d-8906-4590-b67e-a18c9f9da7f5.png', 'image', 'hardcoded', 'asset.6df7505d', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'hero.v5.slide4')
  AND NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.6df7505d');

-- 24f5ee9b... (skip if branding.logo.primary exists)
INSERT INTO gallery_images (id, title, image_url, media_type, source_type, hardcoded_key, is_hardcoded, category, category_id, created_at, updated_at)
SELECT gen_random_uuid(), 'Site Asset 24f5ee9b (Logo)', '/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png', 'image', 'hardcoded', 'asset.24f5ee9b', true, 'site', (SELECT id FROM gallery_categories WHERE slug='site-assets' LIMIT 1), now(), now()
WHERE NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'branding.logo.primary')
  AND NOT EXISTS (SELECT 1 FROM gallery_images WHERE hardcoded_key = 'asset.24f5ee9b');

-- 1c90ed68 and 11ec8802, c5804249 were already covered above; others covered by hero inserts.

