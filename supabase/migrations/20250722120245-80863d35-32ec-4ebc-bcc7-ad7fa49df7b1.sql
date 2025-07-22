-- Create admin CMS database schema for Horseland Hotel

-- Admin users table (extends auth.users)
CREATE TABLE public.admin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'content_editor' CHECK (role IN ('admin', 'content_editor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room types management
CREATE TABLE public.room_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hero_image TEXT,
  gallery JSONB DEFAULT '[]',
  max_guests INTEGER NOT NULL DEFAULT 2,
  features JSONB DEFAULT '[]',
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  seasonal_pricing JSONB DEFAULT '{}',
  availability_calendar JSONB DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Packages management
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  banner_image TEXT,
  package_type TEXT NOT NULL CHECK (package_type IN ('family', 'couple', 'corporate', 'relaxation', 'membership', 'adventure')),
  weekday_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekend_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  inclusions JSONB DEFAULT '[]',
  cta_text TEXT DEFAULT 'Book Now',
  faqs JSONB DEFAULT '[]',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activities management
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT,
  description TEXT,
  distance TEXT,
  tags JSONB DEFAULT '[]',
  booking_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Spa services management
CREATE TABLE public.spa_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image TEXT,
  description TEXT,
  duration INTEGER, -- in minutes
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  tags JSONB DEFAULT '[]',
  booking_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily menu management
CREATE TABLE public.daily_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_date DATE NOT NULL,
  starters JSONB DEFAULT '[]',
  mains JSONB DEFAULT '[]',
  desserts JSONB DEFAULT '[]',
  specials JSONB DEFAULT '[]',
  chef_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_date)
);

-- Bookings management
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  room_type_id UUID REFERENCES public.room_types(id),
  package_id UUID REFERENCES public.packages(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog posts management
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  featured_image TEXT,
  category TEXT NOT NULL CHECK (category IN ('travel_tips', 'guest_stories', 'spa_wellness', 'discover_matheran')),
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  publish_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gallery management
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  tags JSONB DEFAULT '[]',
  category TEXT NOT NULL CHECK (category IN ('stay', 'dining', 'spa', 'activities', 'events')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guest reviews management
CREATE TABLE public.guest_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT,
  stay_date DATE,
  review_content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contact messages
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site settings
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admin users can view all admin profiles" ON public.admin_profiles FOR SELECT USING (true);
CREATE POLICY "Admin users can manage all content" ON public.room_types FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage all packages" ON public.packages FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage all activities" ON public.activities FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage all spa services" ON public.spa_services FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage daily menus" ON public.daily_menus FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage bookings" ON public.bookings FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage blog posts" ON public.blog_posts FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage gallery" ON public.gallery_images FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage reviews" ON public.guest_reviews FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can view contact messages" ON public.contact_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin users can manage settings" ON public.site_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()));

-- Public read policies for published content
CREATE POLICY "Anyone can view published room types" ON public.room_types FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active activities" ON public.activities FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active spa services" ON public.spa_services FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active daily menus" ON public.daily_menus FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can view gallery images" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Anyone can view published reviews" ON public.guest_reviews FOR SELECT USING (is_published = true);
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_spa_services_updated_at BEFORE UPDATE ON public.spa_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_menus_updated_at BEFORE UPDATE ON public.daily_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gallery_images_updated_at BEFORE UPDATE ON public.gallery_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_reviews_updated_at BEFORE UPDATE ON public.guest_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
('emergency_contact', '{"phone": "+91-98765-43210", "email": "emergency@horselandhotel.com"}'),
('newsletter_email', '{"email": "newsletter@horselandhotel.com"}'),
('social_links', '{"facebook": "", "instagram": "", "twitter": "", "youtube": ""}'),
('whatsapp_number', '{"number": "+91-98765-43210"}'),
('policy_texts', '{"terms": "", "privacy": "", "refund": ""}');