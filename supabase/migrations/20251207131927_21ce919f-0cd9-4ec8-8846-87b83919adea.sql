-- Create room_categories table for top-level room classification
CREATE TABLE public.room_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to room_types table
ALTER TABLE public.room_types 
ADD COLUMN category_id UUID REFERENCES public.room_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin users can manage room categories" 
ON public.room_categories 
FOR ALL 
USING (EXISTS (SELECT 1 FROM admin_profiles WHERE admin_profiles.user_id = auth.uid()));

CREATE POLICY "Anyone can view active room categories" 
ON public.room_categories 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_room_categories_updated_at
BEFORE UPDATE ON public.room_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.room_categories (name, slug, display_order) VALUES
('Superior', 'superior', 1),
('Deluxe', 'deluxe', 2),
('Standard', 'standard', 3),
('Standard (Basement)', 'standard-basement', 4);