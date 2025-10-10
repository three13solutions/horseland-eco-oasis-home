-- Update existing pages with their current hero banners
-- Home page - carousel with 4 images from media management
UPDATE public.pages
SET 
  hero_type = 'carousel',
  hero_gallery = jsonb_build_array(
    '/lovable-uploads/9699e81e-78aa-4ce4-b652-cf46c4bd7075.png',
    '/lovable-uploads/d4df921c-30f4-4f92-92f2-c84dbcd5b591.png',
    '/lovable-uploads/b7049d8c-bd59-4733-b040-30b3f79f881c.png',
    '/lovable-uploads/6df7505d-8906-4590-b67e-a18c9f9da7f5.png'
  ),
  subtitle = 'A mindful retreat in Matheran''s no-car eco zone'
WHERE slug = 'home';

-- About page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Where time slows down and nature whispers its ancient secrets. Welcome to Horseland Hotel.'
WHERE slug = 'about';

-- Activities page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1544568100-847a948585b9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Discover Matheran''s natural wonders through guided activities'
WHERE slug = 'activities';

-- Stay page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Comfortable rooms nestled in nature''s embrace'
WHERE slug = 'stay';

-- Experiences page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Curated adventures and mindful moments in Matheran'
WHERE slug = 'experiences';

-- Dining page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Farm-to-table cuisine celebrating local flavors'
WHERE slug = 'dining';

-- Spa page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Holistic wellness therapies inspired by nature'
WHERE slug = 'spa';

-- Packages page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Thoughtfully crafted stays for every traveler'
WHERE slug = 'packages';

-- Journal page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'Stories, tips, and inspiration from the hills'
WHERE slug = 'journal';

-- FAQ page - can keep as 'none' since it doesn't need a hero
UPDATE public.pages
SET 
  hero_type = 'none'
WHERE slug = 'faq';

-- Contact page - single hero image
UPDATE public.pages
SET 
  hero_type = 'single',
  hero_image = 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80',
  subtitle = 'We''re here to help plan your perfect mountain escape'
WHERE slug = 'contact';

-- Policies page - can keep as 'none'
UPDATE public.pages
SET 
  hero_type = 'none'
WHERE slug = 'policies';