-- Migration: Import all existing hero images from pages into gallery_images
-- This ensures all hero images are tracked in the media library

-- Insert hero_image URLs that don't already exist in gallery_images
INSERT INTO gallery_images (
  title,
  image_url,
  category,
  caption,
  media_type,
  source_type,
  category_id,
  is_hardcoded,
  sort_order
)
SELECT DISTINCT
  'Hero Image - ' || p.title AS title,
  p.hero_image AS image_url,
  'hotel' AS category,
  'Used on ' || p.slug || ' page hero section' AS caption,
  'image' AS media_type,
  'upload' AS source_type,
  (SELECT id FROM gallery_categories WHERE slug = 'hero-banners' LIMIT 1) AS category_id,
  false AS is_hardcoded,
  999 AS sort_order
FROM pages p
WHERE p.hero_image IS NOT NULL
  AND p.hero_image != ''
  AND NOT EXISTS (
    SELECT 1 FROM gallery_images gi 
    WHERE gi.image_url = p.hero_image
  );

-- Insert hero_gallery images that don't already exist in gallery_images
-- Handle both string URLs and object format {url: "..."}
INSERT INTO gallery_images (
  title,
  image_url,
  category,
  caption,
  media_type,
  source_type,
  category_id,
  is_hardcoded,
  sort_order
)
SELECT DISTINCT
  'Hero Gallery Image - ' || p.title AS title,
  CASE 
    WHEN jsonb_typeof(img) = 'string' THEN img #>> '{}'
    ELSE img ->> 'url'
  END AS image_url,
  'hotel' AS category,
  'Used on ' || p.slug || ' page hero gallery' AS caption,
  'image' AS media_type,
  'upload' AS source_type,
  (SELECT id FROM gallery_categories WHERE slug = 'hero-banners' LIMIT 1) AS category_id,
  false AS is_hardcoded,
  999 AS sort_order
FROM pages p
CROSS JOIN LATERAL jsonb_array_elements(p.hero_gallery) AS img
WHERE p.hero_gallery IS NOT NULL
  AND jsonb_array_length(p.hero_gallery) > 0
  AND CASE 
    WHEN jsonb_typeof(img) = 'string' THEN img #>> '{}'
    ELSE img ->> 'url'
  END IS NOT NULL
  AND CASE 
    WHEN jsonb_typeof(img) = 'string' THEN img #>> '{}'
    ELSE img ->> 'url'
  END != ''
  AND NOT EXISTS (
    SELECT 1 FROM gallery_images gi 
    WHERE gi.image_url = CASE 
      WHEN jsonb_typeof(img) = 'string' THEN img #>> '{}'
      ELSE img ->> 'url'
    END
  );