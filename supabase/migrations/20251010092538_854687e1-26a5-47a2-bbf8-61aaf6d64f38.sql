-- Populate pages table with existing site pages

INSERT INTO public.pages (slug, title, content, meta_title, meta_description, is_published, template_type, sort_order) VALUES
  ('home', 'Home', 'Welcome to Matheran - Experience tranquility in the heart of nature', 'Matheran Resort | Eco-Friendly Hill Station Resort', 'Discover the perfect hill station getaway at our eco-friendly Matheran resort. Enjoy nature walks, stunning views, and premium accommodations.', true, 'custom', 1),
  
  ('about', 'About Us', 'Learn more about our resort, our values, and our commitment to sustainable tourism in Matheran.', 'About Us | Matheran Resort', 'Learn about our eco-friendly resort in Matheran, our commitment to sustainable tourism, and our passion for providing unforgettable experiences.', true, 'with-sidebar', 2),
  
  ('stay', 'Stay', 'Explore our range of comfortable rooms and accommodations designed for your perfect hill station retreat.', 'Rooms & Accommodations | Matheran Resort', 'Browse our selection of comfortable rooms and suites at Matheran Resort. From cozy single rooms to spacious family suites, find your perfect stay.', true, 'full-width', 3),
  
  ('experiences', 'Experiences', 'Discover unique experiences and activities that make your stay at Matheran unforgettable.', 'Experiences at Matheran | Activities & Adventures', 'Create unforgettable memories with our curated experiences including nature walks, sunset viewpoints, heritage tours, and adventure activities.', true, 'full-width', 4),
  
  ('activities', 'Activities', 'From trekking to heritage walks, explore all the exciting activities available at and around our resort.', 'Activities in Matheran | Things to Do', 'Discover exciting activities in Matheran including trekking, horse riding, viewpoint tours, and more. Plan your perfect adventure with us.', true, 'full-width', 5),
  
  ('dining', 'Dining', 'Savor delicious cuisine at our restaurant featuring local and international flavors.', 'Dining at Matheran Resort | Restaurant & Menu', 'Experience exceptional dining at our Matheran restaurant. Enjoy fresh, local ingredients and a menu that celebrates regional and international cuisine.', true, 'full-width', 6),
  
  ('spa', 'Spa & Wellness', 'Rejuvenate your mind and body with our spa services and wellness treatments.', 'Spa & Wellness | Matheran Resort', 'Relax and rejuvenate at our spa with a range of wellness treatments, massages, and therapies designed to refresh your body and mind.', true, 'with-sidebar', 7),
  
  ('packages', 'Packages', 'Explore our specially curated packages for couples, families, and adventure seekers.', 'Holiday Packages | Matheran Resort Deals', 'Discover our exclusive holiday packages for Matheran. From romantic getaways to family adventures, find the perfect package for your stay.', true, 'full-width', 8),
  
  ('journal', 'Journal', 'Read our latest stories, travel tips, and insights about Matheran and sustainable tourism.', 'Travel Journal | Matheran Blog & Stories', 'Explore our travel journal featuring stories from Matheran, eco-tourism tips, guest experiences, and insider guides to the hill station.', true, 'full-width', 9),
  
  ('faq', 'FAQ', 'Find answers to commonly asked questions about booking, facilities, and your stay at Matheran.', 'FAQ | Matheran Resort Questions & Answers', 'Get answers to frequently asked questions about our Matheran resort including booking, check-in, facilities, activities, and travel information.', true, 'centered', 10),
  
  ('contact', 'Contact Us', 'Get in touch with us for bookings, inquiries, or any assistance you need.', 'Contact Us | Matheran Resort', 'Contact Matheran Resort for bookings, inquiries, or assistance. Reach us by phone, email, or visit us at our location in Matheran.', true, 'centered', 11),
  
  ('policies', 'Policies', 'Review our booking policies, cancellation terms, and resort guidelines.', 'Policies | Booking & Cancellation Terms', 'Read our resort policies including booking terms, cancellation policy, check-in/check-out times, and guest guidelines.', true, 'full-width', 12)

ON CONFLICT (slug) DO NOTHING;