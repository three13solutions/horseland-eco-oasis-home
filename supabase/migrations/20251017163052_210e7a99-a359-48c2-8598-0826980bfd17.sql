-- Remove the restrictive check constraint on category
ALTER TABLE public.gallery_images 
DROP CONSTRAINT IF EXISTS gallery_images_category_check;

-- Add a more flexible constraint or remove it entirely since we have category_id foreign key
-- Let's keep it flexible to match category slugs
ALTER TABLE public.gallery_images 
ADD CONSTRAINT gallery_images_category_check 
CHECK (
  category = ANY (ARRAY[
    'stay'::text, 
    'dining'::text, 
    'spa'::text, 
    'activities'::text, 
    'events'::text, 
    'hotel'::text, 
    'guests'::text, 
    'gallery'::text,
    'blog'::text,
    'rooms'::text,
    'packages'::text,
    'hero-banners'::text,
    'seo'::text
  ])
);