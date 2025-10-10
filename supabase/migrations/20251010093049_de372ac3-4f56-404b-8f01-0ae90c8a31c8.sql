-- Add hero banner fields to pages table

ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS subtitle text,
ADD COLUMN IF NOT EXISTS hero_image text,
ADD COLUMN IF NOT EXISTS hero_gallery jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hero_type text DEFAULT 'single' CHECK (hero_type IN ('none', 'single', 'carousel'));