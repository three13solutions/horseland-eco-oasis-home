-- Create translations table for dynamic content management
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(language_code, section, key)
);

-- Create translation sections table
CREATE TABLE public.translation_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for translations
CREATE POLICY "Admin users can manage translations" 
ON public.translations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

CREATE POLICY "Anyone can view translations" 
ON public.translations 
FOR SELECT 
USING (true);

-- Create policies for translation sections
CREATE POLICY "Admin users can manage translation sections" 
ON public.translation_sections 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_profiles 
  WHERE admin_profiles.user_id = auth.uid()
));

CREATE POLICY "Anyone can view translation sections" 
ON public.translation_sections 
FOR SELECT 
USING (is_active = true);

-- Create triggers for updated_at
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_translation_sections_updated_at
BEFORE UPDATE ON public.translation_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default translation sections
INSERT INTO public.translation_sections (section_key, section_name, description, sort_order) VALUES
('navigation', 'Navigation Menu', 'Navigation links and menu items', 1),
('hero', 'Hero Section', 'Main banner and hero content', 2),
('welcome', 'Welcome Section', 'Welcome message and features', 3),
('matheran', 'Matheran Features', 'Information about Matheran', 4),
('stay', 'Stay & Accommodations', 'Room types and stay information', 5),
('packages', 'Packages & Experiences', 'Travel packages and experiences', 6),
('footer', 'Footer Content', 'Footer links and information', 7),
('common', 'Common Elements', 'Buttons, labels, and common text', 8);