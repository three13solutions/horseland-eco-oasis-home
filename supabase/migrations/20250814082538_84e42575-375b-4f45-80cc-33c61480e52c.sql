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

-- Insert all room units
WITH room_type_mapping AS (
  SELECT id, name FROM public.room_types
)
INSERT INTO public.room_units (
  unit_number, 
  unit_name, 
  floor_number, 
  room_type_id, 
  bed_configuration, 
  max_occupancy, 
  notes,
  status
) VALUES 
-- Pool Deck Rooms
('101 A/B', 'Eclipse Bay', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 5, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('102', 'Black Caviar Cove', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 5, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('103', 'Frankel Waters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('104', 'Ruffian Springs', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('105', 'Citation Lagoon', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('106', 'Kelso Tide', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
('109', 'Arkle Reef', 0, (SELECT id FROM room_type_mapping WHERE name = 'Pool Deck Rooms'), '[{"type": "Double Bed", "count": 2}, {"type": "Roll on Bed", "count": 1}]'::jsonb, 5, 'Located facing the swimming pool with a veranda for a relaxing sit-out. Well furnished with 2 double beds, equipped with air-conditioning, LCD TV, tea/coffee maker, Refrigerator and telephone.', 'available'),
-- Loftscapes
('107', 'Valegro Loftscape', 0, (SELECT id FROM room_type_mapping WHERE name = 'Loftscapes'), '[{"type": "Double Bed", "count": 3}]'::jsonb, 6, 'Spacious loft-style room with premium amenities and pool views.', 'available'),
('108', 'Totilas Loftscape', 0, (SELECT id FROM room_type_mapping WHERE name = 'Loftscapes'), '[{"type": "Double Bed", "count": 3}]'::jsonb, 6, 'Spacious loft-style room with premium amenities and pool views.', 'available'),
-- Balcony Bliss  
('201', 'Shergar Vista', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('202', 'Secretariat Horizon', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('203', 'Desert Orchid Lookout', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('204', 'Northern Dancer Terrace', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('205', 'Barbaro Overlook', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('206', 'Whirlaway Skyview', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('207', 'Brigadier Gerard Balcony', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('208', 'Mill Reef Horizon', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Single Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('209', 'Galileo Vista', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('212', 'Alleged Overlook', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('213', 'Enable Skyview', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 4, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('214', 'Sunday Silence Balcony', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 2}, {"type": "Mattress", "count": 1}]'::jsonb, 5, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('215 A/B', 'Dancing Brave Horizon', 1, (SELECT id FROM room_type_mapping WHERE name = 'Balcony Bliss'), '[{"type": "Double Bed", "count": 2}, {"type": "Roll on Bed", "count": 1}, {"type": "Mattress", "count": 1}]'::jsonb, 6, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
-- Continue with remaining room units in next insert...