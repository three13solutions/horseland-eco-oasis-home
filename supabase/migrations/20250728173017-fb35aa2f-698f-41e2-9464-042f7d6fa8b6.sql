-- Insert hardcoded images for hotel category
DO $$
DECLARE
  hotel_category_id UUID;
  guest_category_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO hotel_category_id FROM public.gallery_categories WHERE slug = 'hotel';
  SELECT id INTO guest_category_id FROM public.gallery_categories WHERE slug = 'guests';
  
  -- Insert hotel images
  INSERT INTO public.gallery_images (
    title, 
    image_url, 
    category,
    category_id, 
    location, 
    caption, 
    is_hardcoded, 
    hardcoded_key, 
    sort_order,
    is_featured
  ) VALUES
  ('Swimming Pool Paradise', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop', 'hotel', hotel_category_id, 'Main Pool Area', 'Swimming Pool Paradise', true, 'hotel_pool_main', 1, false),
  ('Deluxe Mountain Suite', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Premium Wing', 'Deluxe Mountain Suite', true, 'hotel_suite_deluxe', 2, false),
  ('Grand Buffet Dining', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Main Restaurant', 'Grand Buffet Dining', true, 'hotel_dining_buffet', 3, false),
  ('Executive Bedroom', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Heritage Block', 'Executive Bedroom', true, 'hotel_bedroom_executive', 4, false),
  ('Spa & Wellness Center', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Wellness Wing', 'Spa & Wellness Center', true, 'hotel_spa_wellness', 5, false),
  ('Horse Riding Arena', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Adventure Zone', 'Horse Riding Arena', true, 'hotel_horse_arena', 6, false),
  ('Reception & Lobby', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Main Building', 'Reception & Lobby', true, 'hotel_lobby_reception', 7, false),
  ('Valley View Lounge', 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Central Lobby', 'Valley View Lounge', true, 'hotel_lounge_valley', 8, false),
  ('Mountain Sunset', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop', 'hotel', hotel_category_id, 'Panorama Point', 'Mountain Sunset', true, 'hotel_sunset_mountain', 9, false);

  -- Insert guest images
  INSERT INTO public.gallery_images (
    title, 
    image_url, 
    category,
    category_id, 
    caption, 
    guest_name, 
    guest_handle, 
    likes_count, 
    is_hardcoded, 
    hardcoded_key, 
    sort_order,
    is_featured
  ) VALUES
  ('Perfect honeymoon', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop', 'guests', guest_category_id, 'Perfect honeymoon at Horseland! 💕', 'Priya Travels', '@priya_travels', 234, true, 'guest_honeymoon', 1, false),
  ('Family time', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Family time by the pool 👨‍👩‍👧‍👦', 'Sharma Family', '@sharma_family', 189, true, 'guest_family_pool', 2, false),
  ('Breakfast buffet', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Couple enjoying breakfast buffet ✨', 'Wellness Seeker', '@wellness_seeker', 156, true, 'guest_breakfast', 3, false),
  ('Horse ride', 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Morning horse ride adventure 🐎', 'Mountain Lover', '@mountain_lover', 298, true, 'guest_horse_ride', 4, false),
  ('Spa retreat', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Friends at the spa retreat 🧘‍♀️', 'Adventure Duo', '@adventure_duo', 167, true, 'guest_spa_friends', 5, false),
  ('Pool selfie', 'https://images.unsplash.com/photo-1524230572899-a752b3835840?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Swimming pool selfie time! 🏊‍♀️', 'Zen Traveler', '@zen_traveler', 203, true, 'guest_pool_selfie', 6, false),
  ('Group dining', 'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Group dining experience 🍽️', 'Equestrian Life', '@equestrian_life', 178, true, 'guest_dining_group', 7, false),
  ('Room sunset', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Sunset view from our room 🌅', 'Nature Healer', '@nature_healer', 245, true, 'guest_room_sunset', 8, false),
  ('Vacation memories', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop', 'guests', guest_category_id, 'Best vacation memories made! 📸', 'Early Bird Explorer', '@early_bird_explorer', 267, true, 'guest_memories', 9, false);

END $$;