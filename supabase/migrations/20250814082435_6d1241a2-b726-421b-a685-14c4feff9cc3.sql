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

-- Poolside Peeks
('210', 'Nashwan Nook', 1, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 2}, {"type": "Mattress", "count": 1}]'::jsonb, 5, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('211', 'Affirmed Alcove', 1, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 2}, {"type": "Mattress", "count": 1}]'::jsonb, 5, 'Located on the first floor with swimming pool view, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('303 A/B', 'Lammtarra Lookout', 2, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 4}]'::jsonb, 8, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('304 A/B', 'Sunline Suite', 2, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 4}]'::jsonb, 8, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('305', 'Silvano Spot', 2, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('306', 'Fiorente Frame', 2, (SELECT id FROM room_type_mapping WHERE name = 'Poolside Peeks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),

-- Plateau Pods
('216', 'Bucephalus Nook', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('217', 'Man o'' Peace Hideaway', 1, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G.View', 'Copenhagen Corner', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('302', 'Snowman Snug', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('307', 'Trigger Retreat', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('308', 'Misty Nest', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('309', 'Buoyant Boy Alcove', 2, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('200', 'Smoky Sanctuary', 1, (SELECT id FROM room_type_mapping WHERE name = 'Plateau Pods'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),

-- Cave Hideouts (Basement = -1)
('110', 'Comanche''s Den', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('111 A/B', 'Bucephalus Barracks', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 3}, {"type": "Mattress", "count": 2}]'::jsonb, 8, 'Located in basement, well furnished with beds, TV, telephone and air conditioner.', 'available'),
('112', 'Marengo''s Rest', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('113', 'Traveller''s Shelter', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('114', 'Chetak''s Stronghold', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 3}]'::jsonb, 6, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('115', 'Reckless Quarters', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('116', 'Kasztanka Haven', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('117', 'Warrior''s Retreat', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located in basement, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('C-Hall', 'The Battle Herd Hall', -1, (SELECT id FROM room_type_mapping WHERE name = 'Cave Hideouts'), '[{"type": "Double Bed", "count": 4}]'::jsonb, 12, 'Large hall located in basement, well furnished with multiple beds, TV, telephone and air conditioner.', 'available'),

-- Bamboo Cabins
('F1', 'Hidalgo''s Haven', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F2', 'Red Rum Retreat', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F3', 'Man o'' War Lodge', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located around the activity area, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('F4', 'Phar Lap Pavilion', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),
('F5', 'Zenyatta Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),
('F6', 'Seabiscuit Suite', 0, (SELECT id FROM room_type_mapping WHERE name = 'Bamboo Cabins'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Tent accommodation with double beds.', 'available'),

-- Courtside Quarters
('G1', 'Northern Light Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}, {"type": "Sofa Cum Bed", "count": 1}]'::jsonb, 3, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G2', 'Beau Regard Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G3', 'Sir Barton Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G4', 'Bayardo Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 2}]'::jsonb, 4, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G5', 'Ormonde Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G6', 'Moifaa Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('G7', 'Glencoe Quarters', 0, (SELECT id FROM room_type_mapping WHERE name = 'Courtside Quarters'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near recreational areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),

-- Playside Nooks
('007', 'Comanche Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('008', 'Ruffian Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available'),
('009', 'Hidalgo Nook', 0, (SELECT id FROM room_type_mapping WHERE name = 'Playside Nooks'), '[{"type": "Double Bed", "count": 1}]'::jsonb, 2, 'Located near play areas, well furnished with double bed, TV, telephone and air conditioner.', 'available');