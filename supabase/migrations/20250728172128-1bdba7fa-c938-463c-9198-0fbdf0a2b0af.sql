-- Create gallery_categories table for better organization
CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default categories if they don't exist
INSERT INTO public.gallery_categories (name, slug, description, sort_order) 
SELECT 'Hotel Moments', 'hotel', 'Official hotel photos and moments', 1
WHERE NOT EXISTS (SELECT 1 FROM public.gallery_categories WHERE slug = 'hotel');

INSERT INTO public.gallery_categories (name, slug, description, sort_order) 
SELECT 'Guest Stories', 'guests', 'Photos shared by our guests', 2
WHERE NOT EXISTS (SELECT 1 FROM public.gallery_categories WHERE slug = 'guests');

-- Update gallery_images table to include more fields for admin management
ALTER TABLE public.gallery_images 
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_handle TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS is_hardcoded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hardcoded_key TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add category relationship (different column name to avoid conflict)
ALTER TABLE public.gallery_images 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.gallery_categories(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gallery_images_category_id ON public.gallery_images(category_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort_order ON public.gallery_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_hardcoded_key ON public.gallery_images(hardcoded_key);

-- RLS policies for gallery_categories
ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gallery categories" 
ON public.gallery_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin users can manage gallery categories" 
ON public.gallery_categories 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_gallery_categories_updated_at ON public.gallery_categories;
CREATE TRIGGER update_gallery_categories_updated_at
  BEFORE UPDATE ON public.gallery_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();