-- Add category_type to gallery_categories to distinguish gallery vs content categories
ALTER TABLE public.gallery_categories 
ADD COLUMN IF NOT EXISTS category_type text DEFAULT 'content';

-- Update existing categories with appropriate types
UPDATE public.gallery_categories 
SET category_type = 'gallery' 
WHERE slug IN ('hotel', 'guests');

UPDATE public.gallery_categories 
SET category_type = 'seo' 
WHERE slug IN ('seo', 'branding');

UPDATE public.gallery_categories 
SET category_type = 'content' 
WHERE category_type IS NULL OR category_type NOT IN ('gallery', 'seo');

COMMENT ON COLUMN public.gallery_categories.category_type IS 'Type of category: gallery (displayed in public galleries), content (used in content like blogs/rooms), or seo (metadata/assets)';
