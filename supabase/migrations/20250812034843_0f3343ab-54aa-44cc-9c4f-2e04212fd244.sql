-- Insert the hardcoded room categories into room_types table
INSERT INTO public.room_types (
  name, 
  hero_image, 
  description, 
  max_guests, 
  base_price, 
  features, 
  gallery,
  is_published
) VALUES 
(
  'Cave Hideouts',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
  'Naturally cool rooms tucked below ground. Perfect for couples and families seeking privacy with basement-style comfort.',
  3,
  2500,
  '["Basement/cave style", "Windowless/private", "Air-conditioned", "1 double", "double + sofa-cum-bed"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Bamboo Heights Cabins',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80',
  'Cozy cabins with elevated views. Featuring balcony access and ideal for families with interconnected room options.',
  4,
  3500,
  '["Cabin/cottage style", "Air-conditioned", "Interconnected", "2 doubles", "Balcony"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Pool Deck Rooms',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
  'Steps from a refreshing dip. Perfect for families wanting easy pool access with modern amenities.',
  3,
  3000,
  '["Air-conditioned", "Near pool", "Pool view", "1 double", "double + sofa-cum-bed"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Balcony Bliss',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  'Open-air balconies for fresh forest breezes. Premium accommodation with elevated mountain views.',
  3,
  4500,
  '["Air-conditioned", "Balcony", "Highest point", "Premium location", "1 double"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Loftscapes Rooms',
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
  'Smart loft layouts with extra sleeping space. Perfect for groups with unique architecture and balcony access.',
  5,
  3800,
  '["Loft layout", "Interconnected", "Air-conditioned", "2 doubles", "loft bed", "Balcony"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Poolside Peeks',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  'Cheerful rooms close to pool fun. Budget-friendly option with pool views and modern comfort.',
  4,
  2800,
  '["Air-conditioned", "Near pool", "Pool view", "2 doubles"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Plateau Pods',
  'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=800&q=80',
  'Calm, elevated pods with privacy. Budget eco-friendly option with natural ventilation at the highest point.',
  2,
  2200,
  '["Non-AC", "Windowless/private", "Highest point", "Eco-friendly", "1 double"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Courtside Quarters',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  'Stay by the action near sports courts. Perfect for active families and groups who enjoy recreational activities.',
  4,
  2600,
  '["Air-conditioned", "Near sports courts", "Active zone", "2 doubles"]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Playside Nooks',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80',
  'Family-friendly spaces near the playground. Convenient location for families with children and interconnected rooms.',
  4,
  2700,
  '["Air-conditioned", "Interconnected", "Near playground", "Near entrance", "double + sofa-cum-bed"]'::jsonb,
  '[]'::jsonb,
  true
);