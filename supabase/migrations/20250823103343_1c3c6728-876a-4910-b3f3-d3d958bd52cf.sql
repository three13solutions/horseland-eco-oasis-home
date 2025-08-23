
-- 1) Extend gallery_images to support images and videos and track source

ALTER TABLE public.gallery_images
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image', -- 'image' | 'video'
  ADD COLUMN IF NOT EXISTS video_url text NULL,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'upload'; -- 'upload' | 'external' | 'mirrored' | 'hardcoded'

-- 2) Ensure usage keys are unique when provided (prevents duplicates for the same place in UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'gallery_images_hardcoded_key_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX gallery_images_hardcoded_key_unique_idx
      ON public.gallery_images (hardcoded_key)
      WHERE hardcoded_key IS NOT NULL;
  END IF;
END $$;

-- 3) Helpful indexes for filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'gallery_images_category_idx'
  ) THEN
    CREATE INDEX gallery_images_category_idx
      ON public.gallery_images (category);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'gallery_images_category_id_idx'
  ) THEN
    CREATE INDEX gallery_images_category_id_idx
      ON public.gallery_images (category_id);
  END IF;
END $$;
