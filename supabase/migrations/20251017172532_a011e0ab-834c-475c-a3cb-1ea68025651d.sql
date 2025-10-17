-- Add media key columns to spa_services table
ALTER TABLE public.spa_services
ADD COLUMN IF NOT EXISTS image_key TEXT,
ADD COLUMN IF NOT EXISTS media_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key columns to activities table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS image_key TEXT,
ADD COLUMN IF NOT EXISTS media_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key columns to meals table
ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS featured_media_key TEXT,
ADD COLUMN IF NOT EXISTS media_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key columns to packages table
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS featured_image_key TEXT,
ADD COLUMN IF NOT EXISTS banner_image_key TEXT,
ADD COLUMN IF NOT EXISTS gallery_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key columns to room_types table
ALTER TABLE public.room_types
ADD COLUMN IF NOT EXISTS hero_image_key TEXT,
ADD COLUMN IF NOT EXISTS gallery_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key columns to pages table
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS hero_image_key TEXT,
ADD COLUMN IF NOT EXISTS og_image_key TEXT,
ADD COLUMN IF NOT EXISTS hero_gallery_keys JSONB DEFAULT '[]'::jsonb;

-- Add media key column to blog_posts table
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS featured_image_key TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.spa_services.image_key IS 'References hardcoded_key in gallery_images table for featured image';
COMMENT ON COLUMN public.spa_services.media_keys IS 'Array of hardcoded_keys referencing gallery_images for additional media';

COMMENT ON COLUMN public.activities.image_key IS 'References hardcoded_key in gallery_images table for featured image';
COMMENT ON COLUMN public.activities.media_keys IS 'Array of hardcoded_keys referencing gallery_images for additional media';

COMMENT ON COLUMN public.meals.featured_media_key IS 'References hardcoded_key in gallery_images table for featured media';
COMMENT ON COLUMN public.meals.media_keys IS 'Array of hardcoded_keys referencing gallery_images for additional media';

COMMENT ON COLUMN public.packages.featured_image_key IS 'References hardcoded_key in gallery_images table for featured image';
COMMENT ON COLUMN public.packages.banner_image_key IS 'References hardcoded_key in gallery_images table for banner image';
COMMENT ON COLUMN public.packages.gallery_keys IS 'Array of hardcoded_keys referencing gallery_images for gallery';

COMMENT ON COLUMN public.room_types.hero_image_key IS 'References hardcoded_key in gallery_images table for hero image';
COMMENT ON COLUMN public.room_types.gallery_keys IS 'Array of hardcoded_keys referencing gallery_images for gallery';

COMMENT ON COLUMN public.pages.hero_image_key IS 'References hardcoded_key in gallery_images table for hero image';
COMMENT ON COLUMN public.pages.og_image_key IS 'References hardcoded_key in gallery_images table for OG image';
COMMENT ON COLUMN public.pages.hero_gallery_keys IS 'Array of hardcoded_keys referencing gallery_images for hero gallery';

COMMENT ON COLUMN public.blog_posts.featured_image_key IS 'References hardcoded_key in gallery_images table for featured image';