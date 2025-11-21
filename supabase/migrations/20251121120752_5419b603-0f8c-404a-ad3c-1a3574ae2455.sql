-- Create FAQ Categories table
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'HelpCircle',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQ Items table
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faq_categories
CREATE POLICY "Anyone can view active FAQ categories"
  ON public.faq_categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin users can manage FAQ categories"
  ON public.faq_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for faq_items
CREATE POLICY "Anyone can view active FAQ items"
  ON public.faq_items
  FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.faq_categories
      WHERE faq_categories.id = faq_items.category_id
      AND faq_categories.is_active = true
    )
  );

CREATE POLICY "Admin users can manage FAQ items"
  ON public.faq_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_faq_categories_sort_order ON public.faq_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_categories_is_active ON public.faq_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_category_id ON public.faq_items(category_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_sort_order ON public.faq_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_is_active ON public.faq_items(is_active);

-- Insert default FAQ data
INSERT INTO public.faq_categories (title, icon, sort_order) VALUES
  ('Booking & Reservations', 'BookOpen', 1),
  ('Stay & Accommodation', 'Hotel', 2),
  ('Activities & Experiences', 'TreePine', 3),
  ('Policies & Guidelines', 'Shield', 4);

-- Get category IDs for inserting FAQ items
DO $$
DECLARE
  booking_cat_id UUID;
  stay_cat_id UUID;
  experiences_cat_id UUID;
  policies_cat_id UUID;
BEGIN
  SELECT id INTO booking_cat_id FROM public.faq_categories WHERE title = 'Booking & Reservations' LIMIT 1;
  SELECT id INTO stay_cat_id FROM public.faq_categories WHERE title = 'Stay & Accommodation' LIMIT 1;
  SELECT id INTO experiences_cat_id FROM public.faq_categories WHERE title = 'Activities & Experiences' LIMIT 1;
  SELECT id INTO policies_cat_id FROM public.faq_categories WHERE title = 'Policies & Guidelines' LIMIT 1;

  -- Insert FAQ items for Booking & Reservations
  INSERT INTO public.faq_items (category_id, question, answer, sort_order) VALUES
    (booking_cat_id, 'How far in advance should I book my stay?', 'We recommend booking at least 2-3 weeks in advance, especially during peak seasons (October-February and during monsoons). Weekend bookings tend to fill up faster, so early booking ensures better room availability and rates.', 1),
    (booking_cat_id, 'What is your cancellation policy?', 'Cancellation policies vary by rate plan and are displayed during the booking process. Different meal plans and room rates may have different cancellation terms, ranging from flexible to non-refundable options. Please review the specific cancellation policy for your selected rate before confirming your booking.', 2),
    (booking_cat_id, 'Do you accept group bookings?', 'Yes, we welcome group bookings for 8 or more guests. Group rates and special arrangements are available for corporate retreats, family gatherings, and celebrations. Please contact our reservations team for customized group packages.', 3),
    (booking_cat_id, 'Can I modify my booking dates?', 'Date modifications are subject to availability and may incur rate differences. We recommend contacting us at least 48 hours before your arrival to discuss changes. Modifications during peak season may be limited.', 4);

  -- Insert FAQ items for Stay & Accommodation
  INSERT INTO public.faq_items (category_id, question, answer, sort_order) VALUES
    (stay_cat_id, 'What time is check-in and check-out?', 'Check-in is from 2:00 PM and check-out is until 11:00 AM. Early check-in and late check-out are available on request, subject to room availability and may incur additional charges.', 1),
    (stay_cat_id, 'What amenities are included in the rooms?', 'All rooms include comfortable bedding, mountain or garden views, complimentary WiFi, tea/coffee making facilities, and daily housekeeping. Premium rooms also include mini-bar, room service, and enhanced bathroom amenities.', 2),
    (stay_cat_id, 'Is WiFi available throughout the property?', 'Yes, complimentary WiFi is available in all rooms and common areas. However, as we''re in a hill station, connectivity may occasionally be slower than urban areas. We encourage guests to embrace the digital detox opportunity!', 3),
    (stay_cat_id, 'Do you provide transportation from the nearest railway station?', 'Yes, we offer pick-up services from Neral railway station (the gateway to Matheran) at additional charges. Advance booking is required. Our team can also arrange toy train tickets and guide you on the best travel route to reach us.', 4);

  -- Insert FAQ items for Activities & Experiences
  INSERT INTO public.faq_items (category_id, question, answer, sort_order) VALUES
    (experiences_cat_id, 'Are activities suitable for children?', 'Most of our activities are family-friendly and suitable for children above 5 years. Horse riding, nature walks, and bonfire evenings are particularly popular with kids. Some adventure activities like rock climbing have age restrictions for safety.', 1),
    (experiences_cat_id, 'Do I need to book spa treatments in advance?', 'Yes, we highly recommend booking spa treatments at the time of reservation or immediately upon arrival. Our spa operates by appointment only to ensure personalized attention and availability of preferred treatment times.', 2),
    (experiences_cat_id, 'What should I wear for outdoor activities?', 'We recommend comfortable walking shoes, layered clothing, and carrying a light jacket even during warmer months. For specific activities like rock climbing or extended treks, our team will provide detailed packing suggestions upon booking.', 3),
    (experiences_cat_id, 'Are pets allowed on the property?', 'We love pets! Well-behaved pets are welcome with prior notification and a nominal pet fee. Pet-friendly rooms are limited, so please mention your furry companion while booking. Pet owners are responsible for their pet''s behavior and cleanliness.', 4);

  -- Insert FAQ items for Policies & Guidelines
  INSERT INTO public.faq_items (category_id, question, answer, sort_order) VALUES
    (policies_cat_id, 'What is your policy on smoking and alcohol?', 'Smoking is prohibited in all indoor areas and rooms. Designated outdoor smoking areas are available. Alcohol consumption is not permitted in rooms. We maintain a peaceful environment and request guests to be mindful of noise levels.', 1),
    (policies_cat_id, 'Do you accommodate special dietary requirements?', 'Absolutely! We cater to vegetarian, Jain, and other dietary preferences. Please inform us of any food allergies or special requirements during booking or upon arrival. Our chefs are experienced in preparing customized meals.', 2),
    (policies_cat_id, 'What safety measures do you have in place?', 'Our property maintains 24/7 security, CCTV surveillance in common areas, first aid facilities, and trained staff for emergency situations. All activities are conducted with proper safety equipment and experienced guides. A doctor on call is available for medical emergencies.', 3),
    (policies_cat_id, 'Is Matheran really vehicle-free?', 'Yes, Matheran is Asia''s only automobile-free hill station. No private vehicles are allowed beyond Dasturi Naka. Transportation within Matheran is by foot, horseback, or hand-pulled rickshaws. This creates the unique peaceful atmosphere that makes Matheran special.', 4);
END $$;