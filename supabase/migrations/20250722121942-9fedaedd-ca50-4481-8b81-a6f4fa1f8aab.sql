
-- Create navigation_items table
CREATE TABLE public.navigation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  parent_id UUID REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create footer_sections table
CREATE TABLE public.footer_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for navigation_items
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage navigation items" 
  ON public.navigation_items 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active navigation items" 
  ON public.navigation_items 
  FOR SELECT 
  USING (is_active = true);

-- Add RLS policies for footer_sections
ALTER TABLE public.footer_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can manage footer sections" 
  ON public.footer_sections 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active footer sections" 
  ON public.footer_sections 
  FOR SELECT 
  USING (is_active = true);

-- Add triggers for updated_at
CREATE TRIGGER update_navigation_items_updated_at 
  BEFORE UPDATE ON public.navigation_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_footer_sections_updated_at 
  BEFORE UPDATE ON public.footer_sections 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default navigation items
INSERT INTO public.navigation_items (title, href, sort_order) VALUES
  ('About', '/about', 1),
  ('Stay', '/stay', 2),
  ('Experiences', '/experiences', 3),
  ('Packages', '/packages', 4),
  ('Journal', '/journal', 5),
  ('Contact', '/contact', 6);

-- Insert default footer sections
INSERT INTO public.footer_sections (section_key, title, content, sort_order) VALUES
  ('brand', 'Brand Information', '{
    "description": "A luxury eco-retreat nestled in Matheran''s pristine hills, offering sustainable hospitality and unforgettable mountain experiences.",
    "emergencyPhone": "+91 98765 43210"
  }', 1),
  ('contact', 'Contact Information', '{
    "email": "info@horselandhotel.com",
    "phone": "+91 98765 43210",
    "address": "Matheran Hill Station, Maharashtra, India"
  }', 2),
  ('social', 'Social Media', '{
    "facebook": "#",
    "instagram": "#",
    "twitter": "#",
    "youtube": "#"
  }', 3),
  ('policies', 'Policies', '{
    "links": [
      {"title": "Privacy Policy", "href": "#privacy"},
      {"title": "Refund Policy", "href": "#refund"},
      {"title": "Terms & Conditions", "href": "#terms"},
      {"title": "Cancellation Policy", "href": "#cancellation"}
    ]
  }', 4),
  ('newsletter', 'Newsletter', '{
    "title": "Stay Connected",
    "description": "Subscribe for updates and special offers"
  }', 5);

-- Update site_settings with additional settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
  ('site_title', '"Horseland Hotel & Mountain Spa"'),
  ('site_logo', '"/lovable-uploads/24f5ee9b-ce5a-4b86-a2d8-7ca42e0a78cf.png"'),
  ('copyright_text', '"© 2024 Horseland Hotel & Mountain Spa. All rights reserved."'),
  ('tagline', '"Crafted with care for sustainable luxury"')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();
