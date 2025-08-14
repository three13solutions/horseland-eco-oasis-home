-- First add unique constraint on room_types name
ALTER TABLE public.room_types ADD CONSTRAINT room_types_name_unique UNIQUE (name);

-- Insert room types if they don't exist
INSERT INTO public.room_types (name, description, max_guests, base_price) 
VALUES 
  ('Pool Deck Rooms', 'Rooms located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with air-conditioning, LCD TV, tea/coffee maker, refrigerator and telephone.', 5, 0),
  ('Loftscapes', 'Spacious loft-style rooms with premium amenities and pool views.', 6, 0),
  ('Balcony Bliss', 'First floor rooms with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 6, 0),
  ('Poolside Peeks', 'First and second floor rooms with pool views and premium amenities.', 8, 0),
  ('Plateau Pods', 'Rooms located around the activity area, well furnished with essential amenities.', 2, 0),
  ('Cave Hideouts', 'Basement rooms with unique cave-like ambiance, fully equipped with modern amenities.', 12, 0),
  ('Bamboo Cabins', 'Ground floor cabin-style rooms with natural bamboo aesthetics.', 4, 0),
  ('Courtside Quarters', 'Ground floor rooms near recreational areas with comfortable furnishing.', 4, 0),
  ('Playside Nooks', 'Cozy rooms located near play areas, perfect for families.', 2, 0)
ON CONFLICT (name) DO NOTHING;