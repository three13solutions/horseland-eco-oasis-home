-- Create junction table for many-to-many relationship between images and categories
CREATE TABLE IF NOT EXISTS public.image_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.gallery_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(image_id, category_id)
);

-- Enable RLS on the new junction table
ALTER TABLE public.image_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_categories
CREATE POLICY "Admin users can manage image categories"
  ON public.image_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view image category associations"
  ON public.image_categories
  FOR SELECT
  USING (true);

-- Create index for better query performance
CREATE INDEX idx_image_categories_image_id ON public.image_categories(image_id);
CREATE INDEX idx_image_categories_category_id ON public.image_categories(category_id);

-- Migrate existing data from gallery_images.category_id to junction table
INSERT INTO public.image_categories (image_id, category_id)
SELECT id, category_id 
FROM public.gallery_images 
WHERE category_id IS NOT NULL
ON CONFLICT (image_id, category_id) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE public.image_categories IS 'Junction table allowing images to belong to multiple categories without file duplication';